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

    // 2. Count open bot positions (ETH + BTC only; max 2 slots)
    let openPositionCount = 0;
    if (supabase) {
      const { data } = await supabase.from('positions').select('id').eq('status', 'OPEN');
      openPositionCount = (data || []).length;
    }

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
      openPositions: openPositionCount,
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
      const slotsAvailable = Math.max(0, 2 - openPositionCount); // max 2 positions: one ETH, one BTC

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
        .sort((a, b) => b.confidence - a.confidence)
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
        if (openPositionCount + tradesExecuted.length >= 2) {
          log('Max 2 open positions reached — no more buys this cycle');
          break;
        }

        try {
          const positionSize = calculatePositionSize(cashRemaining, signal.confidence, openPositionCount + tradesExecuted.length);

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
        daily_pnl: 0,
        open_positions: openPositionCount + tradesExecuted.length,
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
          closedPositions: 0,
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
      cashBefore: cashBalance,
      cashAfter: cashRemaining,
      openPositions: openPositionCount + tradesExecuted.length,
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
