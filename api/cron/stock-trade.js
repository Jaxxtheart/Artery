/**
 * GET /api/cron/stock-trade
 * Automated US stock trading via Alpaca — triggered hourly by Vercel Cron.
 * PAPER TRADING by default (ALPACA_PAPER != 'false').
 *
 * Flow:
 *   1. Reconcile: positions closed at Alpaca by bracket legs (stop/TP filled
 *      server-side) get recorded in stock_trade_history and marked CLOSED
 *   2. If the market is open: generate signals, execute BUYs >= 80% confidence
 *      as bracket orders (entry + stop-loss + take-profit in one atomic order)
 *   3. Confidence-weighted cash split across eligible signals, same as crypto
 *
 * Exits are enforced server-side by Alpaca's bracket legs — the cron only
 * reconciles the results, so a missed run never breaks the stop loss.
 */

const { createAlpacaClient, isAlpacaConfigured } = require('../../lib/alpaca/client');
const { getAllStockSignals } = require('../../lib/trading/stock-strategies');
const { supabase } = require('../../lib/supabase');
const { calculateStopLevels, MIN_CONFIDENCE } = require('../../lib/trading/risk-manager');

const MAX_STOCK_POSITIONS = 4;
const CASH_RESERVE = 0.05;
const COOLDOWN_HOURS = 4;
const MIN_ORDER_USD = 10;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    if (!isAlpacaConfigured()) {
      return res.status(200).json({
        success: true,
        skipped: 'Alpaca not configured — set ALPACA_API_KEY and ALPACA_API_SECRET'
      });
    }

    const alpaca = createAlpacaClient();
    log(`Starting stock trading cycle (${alpaca.paper ? 'PAPER' : 'LIVE'})...`);

    const [account, clock] = await Promise.all([alpaca.getAccount(), alpaca.getClock()]);
    const equity = parseFloat(account.equity);
    const cash = parseFloat(account.cash);
    log(`Account: $${equity.toFixed(2)} equity, $${cash.toFixed(2)} cash — market ${clock.is_open ? 'OPEN' : 'CLOSED'}`);

    // ── 1. Reconcile positions closed by bracket legs at Alpaca ─────────────
    let openDbPositions = [];
    let closedThisCycle = 0;

    if (supabase) {
      const { data } = await supabase.from('stock_positions').select('*').eq('status', 'OPEN');
      openDbPositions = data || [];
    }

    if (openDbPositions.length > 0) {
      const alpacaPositions = await alpaca.getPositions();
      const heldSymbols = new Set(alpacaPositions.map(p => p.symbol));

      for (const position of openDbPositions) {
        if (heldSymbols.has(position.symbol)) {
          const live = alpacaPositions.find(p => p.symbol === position.symbol);
          log(`Holding ${position.symbol}: ${(parseFloat(live.unrealized_plpc) * 100).toFixed(2)}% — stop $${position.stop_loss?.toFixed(2)}, target $${position.take_profit?.toFixed(2)}`);
          continue;
        }

        // Position gone at Alpaca → a bracket leg (stop or TP) filled
        try {
          const closedOrders = await alpaca.listClosedOrders(position.symbol, 20);
          const exitOrder = (closedOrders || []).find(o =>
            o.side === 'sell' && o.status === 'filled' &&
            new Date(o.filled_at) > new Date(position.entry_time)
          );

          const exitPrice = exitOrder ? parseFloat(exitOrder.filled_avg_price) : position.entry_price;
          const exitTime = exitOrder?.filled_at || new Date().toISOString();
          const pnlUsd = (exitPrice - position.entry_price) * position.qty;
          const pnlPct = ((exitPrice - position.entry_price) / position.entry_price) * 100;
          const reason = exitPrice >= position.entry_price ? 'Take profit (bracket leg filled)' : 'Stop loss (bracket leg filled)';
          const durationHours = (new Date(exitTime) - new Date(position.entry_time)) / 3600000;

          log(`Reconciling ${position.symbol}: closed at Alpaca — ${reason} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);

          if (supabase) {
            await supabase.from('stock_positions').update({
              status: 'CLOSED',
              exit_price: exitPrice,
              exit_time: exitTime,
              pnl_usd: pnlUsd,
              pnl_pct: pnlPct
            }).eq('id', position.id);

            await supabase.from('stock_trade_history').insert({
              symbol: position.symbol,
              side: 'SELL',
              entry_price: position.entry_price,
              exit_price: exitPrice,
              qty: position.qty,
              pnl_usd: pnlUsd,
              pnl_pct: pnlPct,
              strategy: position.strategy,
              reason,
              duration_hours: durationHours,
              entry_time: position.entry_time,
              exit_time: exitTime,
              paper: alpaca.paper
            });
          }
          closedThisCycle++;
        } catch (err) {
          log(`Error reconciling ${position.symbol}: ${err.message}`);
        }
      }
    }

    const remainingPositions = openDbPositions.length - closedThisCycle;

    // ── 2. New entries — market hours only ───────────────────────────────────
    const tradesExecuted = [];
    let signals = [];

    if (!clock.is_open) {
      log(`Market closed — next open ${clock.next_open}. Reconciliation only this cycle.`);
    } else {
      // Cooldown: skip symbols closed in the last few hours
      const cooldownSymbols = new Set();
      if (supabase) {
        const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 3600000).toISOString();
        const { data: recentlyClosed } = await supabase
          .from('stock_trade_history').select('symbol').gte('exit_time', cutoff);
        (recentlyClosed || []).forEach(t => cooldownSymbols.add(t.symbol));
      }

      log('Generating stock signals...');
      signals = await getAllStockSignals(alpaca);
      log(`Generated ${signals.length} signals, ${signals.filter(s => s.signal === 'BUY').length} buys`);

      if (supabase) {
        const inserts = signals.filter(s => s.signal !== 'HOLD' && s.confidence > 0.5);
        if (inserts.length > 0) {
          await supabase.from('stock_signals').insert(
            inserts.map(s => ({
              symbol: s.symbol,
              signal: s.signal,
              confidence: s.confidence,
              strategy: s.strategy,
              price: s.price,
              reason: s.reason,
              executed: false
            }))
          );
        }
      }

      const openSymbols = new Set(openDbPositions.filter(p => p.status === 'OPEN').map(p => p.symbol));
      const slotsAvailable = Math.min(3, MAX_STOCK_POSITIONS - remainingPositions);

      const buySignals = signals
        .filter(s =>
          s.signal === 'BUY' &&
          s.confidence >= MIN_CONFIDENCE &&
          !cooldownSymbols.has(s.symbol) &&
          !openSymbols.has(s.symbol)
        )
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, Math.max(0, slotsAvailable));

      log(`Eligible buy signals (${buySignals.length}): ${buySignals.map(s => `${s.symbol}(${(s.confidence * 100).toFixed(0)}%)`).join(', ') || 'none'}`);

      // Confidence-weighted cash split, same model as the crypto bot
      let cashRemaining = cash;
      const deployableCash = cashRemaining * (1 - CASH_RESERVE);
      const totalWeight = buySignals.reduce((sum, s) => sum + s.confidence, 0);

      for (const signal of buySignals) {
        try {
          const allocated = totalWeight > 0
            ? (signal.confidence / totalWeight) * deployableCash
            : deployableCash / buySignals.length;

          const positionSize = Math.min(allocated, cashRemaining * 0.99);
          if (positionSize < MIN_ORDER_USD) {
            log(`Skipping ${signal.symbol}: allocated $${positionSize.toFixed(2)} below minimum`);
            continue;
          }

          const currentPrice = await alpaca.getProductPrice(signal.symbol);
          const qty = Math.floor(positionSize / currentPrice); // brackets need whole shares
          if (qty < 1) {
            log(`Skipping ${signal.symbol}: $${positionSize.toFixed(2)} buys < 1 share at $${currentPrice.toFixed(2)}`);
            continue;
          }

          const { stopLoss, takeProfit } = calculateStopLevels(currentPrice, 'BUY');

          log(`Executing bracket BUY ${signal.symbol}: ${qty} shares @ ~$${currentPrice.toFixed(2)} (stop $${stopLoss.toFixed(2)}, target $${takeProfit.toFixed(2)}, confidence ${(signal.confidence * 100).toFixed(0)}%)`);
          const order = await alpaca.placeBracketBuy(signal.symbol, qty, stopLoss, takeProfit);

          if (supabase) {
            await supabase.from('stock_positions').insert({
              symbol: signal.symbol,
              side: 'BUY',
              qty,
              entry_price: currentPrice,
              strategy: signal.strategy,
              stop_loss: stopLoss,
              take_profit: takeProfit,
              status: 'OPEN',
              alpaca_order_id: order.id,
              paper: alpaca.paper
            });

            await supabase.from('stock_signals').update({ executed: true })
              .eq('symbol', signal.symbol).eq('signal', 'BUY').eq('executed', false);
          }

          cashRemaining -= qty * currentPrice;
          tradesExecuted.push({ symbol: signal.symbol, qty, price: currentPrice, confidence: signal.confidence, orderId: order.id });
          log(`Cash remaining: $${cashRemaining.toFixed(2)}`);
        } catch (err) {
          log(`Error executing stock trade for ${signal.symbol}: ${err.message}`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      paper: alpaca.paper,
      marketOpen: clock.is_open,
      equity,
      cash,
      signalsAnalyzed: signals.length,
      tradesExecuted: tradesExecuted.length,
      tradesDetail: tradesExecuted,
      positionsReconciled: closedThisCycle,
      openPositions: remainingPositions + tradesExecuted.length,
      log: executionLog
    });
  } catch (error) {
    console.error('Stock trade error:', error);
    return res.status(500).json({ success: false, error: error.message, log: executionLog });
  }
};
