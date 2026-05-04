/**
 * GET /api/cron/daily-trade
 * Automated trading execution - triggered by Vercel Cron every hour (0 * * * *)
 * Daily report email is only sent at 22:00 UTC
 * Also manually triggerable with proper authorization
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');
const { getAllSignals, STRATEGY_SYMBOLS } = require('../../lib/trading/strategies');
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

    // 2. Manage bot-opened positions (stop-loss / take-profit)
    // Only positions tracked in Supabase (opened by the bot) are auto-managed.
    // Legacy Coinbase holdings never appear here — they are always manual.
    let openPositions = [];
    let closedThisCycle = 0;
    if (supabase) {
      const { data } = await supabase.from('positions').select('*').eq('status', 'OPEN');
      openPositions = data || [];
    }

    for (const position of openPositions) {
      try {
        const currentPrice = await coinbase.getProductPrice(position.symbol);
        const pnlUsd = (currentPrice - position.entry_price) * position.size;
        const pnlPct = ((currentPrice - position.entry_price) / position.entry_price) * 100;
        const closeCheck = shouldClosePosition(position, currentPrice);

        if (closeCheck.close) {
          log(`Closing bot position ${position.symbol}: ${closeCheck.reason} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);

          // Sell uses base_size (crypto units)
          const productDetails = await coinbase.getProductDetails(position.symbol).catch(() => ({}));
          const baseIncrement  = productDetails.base_increment || '0.00000001';
          const decimals = (baseIncrement.toString().split('.')[1] || '').length;
          const sellSize = parseFloat((position.size * 0.999).toFixed(decimals));

          await coinbase.placeOrder(position.symbol, 'SELL', sellSize);

          const durationHours = (Date.now() - new Date(position.entry_time).getTime()) / 3600000;
          const now = new Date().toISOString();

          if (supabase) {
            await supabase.from('positions').update({
              status: 'CLOSED',
              exit_price: currentPrice,
              exit_time: now,
              pnl_usd: pnlUsd,
              pnl_pct: pnlPct
            }).eq('id', position.id);

            await supabase.from('trade_history').insert({
              symbol: position.symbol,
              side: 'SELL',
              entry_price: position.entry_price,
              exit_price: currentPrice,
              size: position.size,
              pnl_usd: pnlUsd,
              pnl_pct: pnlPct,
              strategy: position.strategy,
              reason: closeCheck.reason,
              duration_hours: durationHours,
              entry_time: position.entry_time,
              exit_time: now
            });
          }
          closedThisCycle++;
        } else {
          log(`Holding ${position.symbol}: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}% — stop $${position.stop_loss?.toFixed(4)}, target $${position.take_profit?.toFixed(4)}`);
        }
      } catch (err) {
        log(`Error managing position ${position.symbol}: ${err.message}`);
      }
    }

    const remainingPositions = openPositions.length - closedThisCycle;

    // 3a. Build strategy-specific cooldown sets
    // Mean reversion bounces quickly — 1h cooldown; trend strategies need more time — 4h
    const COOLDOWN_MS_DEFAULT   = 4 * 3600000;
    const COOLDOWN_MS_REVERSION = 1 * 3600000;
    const cooldownSymbols   = new Set(); // momentum / breakout: 4h
    const cooldownSymbolsMR = new Set(); // mean reversion: 1h
    if (supabase) {
      const cutoff4h = new Date(Date.now() - COOLDOWN_MS_DEFAULT).toISOString();
      const { data: recentlyClosed } = await supabase
        .from('trade_history')
        .select('symbol, strategy, exit_time')
        .gte('exit_time', cutoff4h);
      const now = Date.now();
      (recentlyClosed || []).forEach(t => {
        const age = now - new Date(t.exit_time).getTime();
        if (t.strategy === 'MEAN_REVERSION') {
          if (age < COOLDOWN_MS_REVERSION) cooldownSymbolsMR.add(t.symbol);
        } else {
          cooldownSymbols.add(t.symbol);
        }
      });
      const allCooling = [...new Set([...cooldownSymbols, ...cooldownSymbolsMR])];
      if (allCooling.length > 0) {
        log(`Cooldown: ${[...cooldownSymbols].join(', ') || 'none'} (4h trend), ${[...cooldownSymbolsMR].join(', ') || 'none'} (1h reversion)`);
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

    // 4. Generate trading signals — strategy coins only (no held legacy coins)
    log('Generating trading signals...');
    const signals = await getAllSignals(coinbase);   // no heldSymbols → MONITORED_SYMBOLS only

    if (supabase) {
      const inserts = signals.filter(s => s.signal !== 'HOLD' && s.confidence > 0.5);
      if (inserts.length > 0) {
        await supabase.from('signals').insert(
          inserts.map(s => ({ ...s, executed: false }))
        );
      }
    }

    log(`Generated ${signals.length} signals, ${signals.filter(s => s.signal === 'BUY').length} buys`);

    // 5. Execute top buy signals — strategy coins only, funded from cash on hand
    const tradesExecuted = [];
    let cashRemaining = cashBalance;

    if (riskCheck.allowed) {
      const slotsAvailable = Math.min(3, 4 - remainingPositions); // max 3 new trades, cap at open position limit

      const buySignals = signals
        .filter(s => {
          if (s.signal !== 'BUY') return false;
          if (s.confidence < MIN_CONFIDENCE) return false;
          if (!STRATEGY_SYMBOLS.has(s.symbol)) return false;
          const inCooldown = s.strategy === 'MEAN_REVERSION'
            ? cooldownSymbolsMR.has(s.symbol)
            : cooldownSymbols.has(s.symbol);
          return !inCooldown;
        })
        .sort((a, b) => b.confidence - a.confidence) // highest confidence first
        .slice(0, slotsAvailable);

      log(`Eligible buy signals (${buySignals.length}): ${buySignals.map(s => `${s.symbol}(${(s.confidence*100).toFixed(0)}%)`).join(', ') || 'none'}`);

      // ── Confidence-weighted cash split ─────────────────────────────────────
      // Each signal gets a share of cash proportional to its confidence score.
      // A 5% reserve is kept back to cover fees and rounding.
      const CASH_RESERVE = 0.05;
      const deployableCash = cashRemaining * (1 - CASH_RESERVE);
      const totalWeight = buySignals.reduce((sum, s) => sum + s.confidence, 0);

      const allocations = buySignals.map(s => ({
        ...s,
        allocated: totalWeight > 0
          ? (s.confidence / totalWeight) * deployableCash
          : deployableCash / buySignals.length
      }));

      if (allocations.length > 0) {
        log(`Cash split across ${allocations.length} signal(s) from $${deployableCash.toFixed(2)} deployable:`);
        allocations.forEach(a => log(`  ${a.symbol}: $${a.allocated.toFixed(2)} (${(a.confidence*100).toFixed(0)}% confidence)`));
      }

      for (const signal of allocations) {
        if (remainingPositions + tradesExecuted.length >= 4) {
          log('Max 4 open positions reached — no more buys this cycle');
          break;
        }

        try {
          const positionSize = calculatePositionSize(cashRemaining, signal.confidence, remainingPositions + tradesExecuted.length);

          if (positionSize < 10) {
            log(`Skipping ${signal.symbol}: allocated $${positionSize.toFixed(2)} below $10 minimum`);
            continue;
          }
          if (cashRemaining < positionSize) {
            positionSize = cashRemaining * 0.99;
            if (positionSize < 10) {
              log(`Skipping ${signal.symbol}: only $${cashRemaining.toFixed(2)} cash left`);
              continue;
            }
            log(`Trimming ${signal.symbol} to remaining cash: $${positionSize.toFixed(2)}`);
          }

          log(`Executing BUY ${signal.symbol}: $${positionSize.toFixed(2)} (confidence: ${(signal.confidence*100).toFixed(0)}%)`);
          const order = await coinbase.placeOrder(signal.symbol, 'BUY', positionSize);
          const orderId = order.success_response?.order_id || order.order_id;
          const orderSuccess = !!(order.success || orderId);

          if (!orderSuccess) {
            const errResp = order.error_response || {};
            const reason = errResp.preview_failure_reason || errResp.new_order_failure_reason || errResp.message || errResp.error || JSON.stringify(order);
            log(`BUY order FAILED for ${signal.symbol}: ${reason}`);
            continue;
          }

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

          cashRemaining -= positionSize;
          tradesExecuted.push({ ...signal, size: positionSize, orderId });
          log(`Cash remaining: $${cashRemaining.toFixed(2)}`);
        } catch (err) {
          log(`Error executing trade for ${signal.symbol}: ${err.message}`);
        }
      }
    }

    // 6. Save portfolio snapshot
    if (supabase) {
      const today = new Date().toISOString().split('T')[0];
      const initialCapital = parseFloat(process.env.INITIAL_CAPITAL || '1377');
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
          closedPositions: closedThisCycle,
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
      tradesDetail: tradesExecuted.map(t => ({ symbol: t.symbol, size: t.size, confidence: t.confidence })),
      positionsClosed: closedThisCycle,
      cashBefore: cashBalance,
      cashAfter: cashRemaining,
      openPositions: remainingPositions + tradesExecuted.length,
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
