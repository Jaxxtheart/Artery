/**
 * GET /api/cron/daily-trade
 * Automated trading execution - triggered by Vercel Cron every hour (0 * * * *)
 * Daily report email is only sent at 22:00 UTC
 * Also manually triggerable with proper authorization
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');
const { getAllSignals } = require('../../lib/trading/strategies');
const { supabase } = require('../../lib/supabase');
const {
  calculatePositionSize,
  calculateStopLevels,
  checkRiskLimits,
  shouldClosePosition,
  MIN_CONFIDENCE
} = require('../../lib/trading/risk-manager');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const executionLog = [];
  const log = (msg) => {
    console.log(msg);
    executionLog.push({ time: new Date().toISOString(), message: msg });
  };

  try {
    log('Starting daily trading execution...');

    const coinbase = createCoinbaseClient();

    // 1. Get current portfolio state
    const portfolio = await coinbase.getPortfolio();
    const totalValue = portfolio.reduce((sum, acc) => sum + acc.value_usd, 0);
    const cashBalance = portfolio.filter(a => a.type === 'cash').reduce((s, a) => s + a.value_usd, 0);
    log(`Portfolio: $${totalValue.toFixed(2)} total, $${cashBalance.toFixed(2)} cash`);

    // 2. Check existing open positions for stops/targets
    let openPositions = [];
    let closedToday = 0;
    if (supabase) {
      const { data } = await supabase.from('positions').select('*').eq('status', 'OPEN');
      openPositions = data || [];
    }

    for (const position of openPositions) {
      try {
        const currentPrice = await coinbase.getProductPrice(position.symbol);
        const closeCheck = shouldClosePosition(position, currentPrice);

        if (closeCheck.close) {
          log(`Closing ${position.symbol}: ${closeCheck.reason}`);

          const closeSide = position.side === 'BUY' ? 'SELL' : 'BUY';
          const sizeUSD = position.size * currentPrice;
          await coinbase.placeOrder(position.symbol, closeSide, sizeUSD);

          const pnlUsd = (currentPrice - position.entry_price) * position.size;
          const pnlPct = ((currentPrice - position.entry_price) / position.entry_price) * 100;
          const durationHours = (Date.now() - new Date(position.entry_time).getTime()) / 3600000;

          if (supabase) {
            await supabase.from('positions').update({
              status: 'CLOSED',
              exit_price: currentPrice,
              exit_time: new Date().toISOString(),
              pnl_usd: pnlUsd,
              pnl_pct: pnlPct
            }).eq('id', position.id);

            await supabase.from('trade_history').insert({
              symbol: position.symbol,
              side: position.side,
              entry_price: position.entry_price,
              exit_price: currentPrice,
              size: position.size,
              pnl_usd: pnlUsd,
              pnl_pct: pnlPct,
              strategy: position.strategy,
              reason: closeCheck.reason,
              duration_hours: durationHours,
              entry_time: position.entry_time,
              exit_time: new Date().toISOString()
            });
          }
          closedToday++;
        }
      } catch (err) {
        log(`Error processing position ${position.symbol}: ${err.message}`);
      }
    }

    // Refresh open positions count after closures
    const remainingPositions = openPositions.length - closedToday;

    // 3a. Build cooldown set — skip re-entry on symbols closed in the last 4 hours
    const COOLDOWN_HOURS = 4;
    const cooldownSymbols = new Set();
    if (supabase) {
      const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 3600000).toISOString();
      const { data: recentlyClosed } = await supabase
        .from('trade_history')
        .select('symbol')
        .gte('exit_time', cutoff);
      (recentlyClosed || []).forEach(t => cooldownSymbols.add(t.symbol));
      if (cooldownSymbols.size > 0) {
        log(`Cooldown (${COOLDOWN_HOURS}h): skipping re-entry on ${[...cooldownSymbols].join(', ')}`);
      }
    }

    // 3. Check risk limits
    const riskCheck = checkRiskLimits({
      totalValue,
      startOfDayValue: totalValue,
      openPositions: remainingPositions,
      tradingEnabled: true
    });

    if (!riskCheck.allowed) {
      log(`Risk check failed: ${riskCheck.reason}`);
    }

    // 4. Generate trading signals
    log('Generating trading signals...');
    const signals = await getAllSignals(coinbase);

    if (supabase) {
      const inserts = signals.filter(s => s.signal !== 'HOLD' && s.confidence > 0.5);
      if (inserts.length > 0) {
        await supabase.from('signals').insert(
          inserts.map(s => ({ ...s, executed: false }))
        );
      }
    }

    log(`Generated ${signals.length} signals, ${signals.filter(s => s.signal === 'BUY').length} buys`);

    // 5. Execute top buy signals
    const tradesExecuted = [];
    if (riskCheck.allowed) {
      const buySignals = signals
        .filter(s => s.signal === 'BUY' && s.confidence >= MIN_CONFIDENCE && !cooldownSymbols.has(s.symbol))
        .slice(0, 3);

      for (const signal of buySignals) {
        if (remainingPositions + tradesExecuted.length >= 4) break;

        try {
          const positionSize = calculatePositionSize(totalValue, signal.confidence, remainingPositions + tradesExecuted.length);

          if (positionSize < 10 || cashBalance - (tradesExecuted.reduce((s, t) => s + t.size, 0)) < positionSize) {
            log(`Skipping ${signal.symbol}: insufficient funds or position size too small`);
            continue;
          }

          log(`Executing BUY ${signal.symbol}: $${positionSize.toFixed(2)} (confidence: ${(signal.confidence * 100).toFixed(0)}%)`);
          const order = await coinbase.placeOrder(signal.symbol, 'BUY', positionSize);
          const orderId = order.success_response?.order_id || order.order_id;

          const currentPrice = await coinbase.getProductPrice(signal.symbol);
          const { stopLoss, takeProfit } = calculateStopLevels(currentPrice, 'BUY');

          if (supabase) {
            await supabase.from('positions').insert({
              symbol: signal.symbol,
              side: 'BUY',
              entry_price: currentPrice,
              size: positionSize / currentPrice,
              strategy: signal.strategy,
              stop_loss: stopLoss,
              take_profit: takeProfit,
              status: 'OPEN',
              coinbase_order_id: orderId
            });

            await supabase.from('signals').update({ executed: true })
              .eq('symbol', signal.symbol).eq('signal', 'BUY').eq('executed', false);
          }

          tradesExecuted.push({ ...signal, size: positionSize, orderId });
        } catch (err) {
          log(`Error executing trade for ${signal.symbol}: ${err.message}`);
        }
      }
    }

    // 6. Save portfolio snapshot
    if (supabase) {
      const today = new Date().toISOString().split('T')[0];
      const initialCapital = parseFloat(process.env.INITIAL_CAPITAL || '1441');
      const totalPnL = totalValue - initialCapital;

      await supabase.from('portfolio_snapshots').upsert({
        total_value: totalValue,
        cash_balance: cashBalance,
        crypto_value: totalValue - cashBalance,
        total_pnl: totalPnL,
        daily_pnl: 0, // Would calculate from yesterday's snapshot
        open_positions: remainingPositions + tradesExecuted.length,
        snapshot_date: today
      }, { onConflict: 'snapshot_date' });
    }

    // 7. Send daily report email (once per day at 22:00 UTC)
    const currentHour = new Date().getUTCHours();
    if (currentHour === 22) {
      try {
        const { sendDailyTradingReport } = require('../../lib/trading-email-templates');
        await sendDailyTradingReport({
          portfolio: { totalValue, cashBalance },
          signals,
          executedTrades: tradesExecuted,
          closedPositions: closedToday,
          log: executionLog
        });
        log('Daily report email sent');
      } catch (emailErr) {
        log(`Email error: ${emailErr.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      signalsAnalyzed: signals.length,
      tradesExecuted: tradesExecuted.length,
      positionsClosed: closedToday,
      portfolioValue: totalValue,
      log: executionLog
    });

  } catch (error) {
    console.error('Daily trade error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      log: executionLog
    });
  }
};
