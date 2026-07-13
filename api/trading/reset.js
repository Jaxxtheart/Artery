/**
 * POST /api/trading/reset
 * Full trading reset — wipes all bot trading history so the bot starts from scratch.
 * Used after withdrawing funds / re-funding the account with new capital.
 *
 * What it does:
 *   1. Cancels any exchange stop-limit orders attached to open positions
 *   2. Deletes all rows from: positions, trade_history, signals,
 *      portfolio_snapshots, signal_executions
 *   3. Returns the current live Coinbase portfolio value — set INITIAL_CAPITAL
 *      in Vercel to this (or your new deposit amount) to re-baseline P&L
 *
 * Auth: Bearer CRON_SECRET (same as the trading cron)
 *
 * Usage:
 *   curl -X POST https://<your-app>.vercel.app/api/trading/reset \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

const { supabase } = require('../../lib/supabase');
const { createCoinbaseClient } = require('../../lib/coinbase/client');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed — use POST' });
  }

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const log = [];

  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    // 1. Cancel exchange stop orders on open positions before wiping them
    let coinbase = null;
    try {
      coinbase = createCoinbaseClient();
    } catch {
      log.push('Coinbase not configured — skipping stop-order cancellation');
    }

    if (coinbase) {
      const { data: openPositions } = await supabase
        .from('positions').select('symbol, stop_order_id').eq('status', 'OPEN');

      for (const pos of openPositions || []) {
        if (pos.stop_order_id) {
          try {
            await coinbase.cancelOrder(pos.stop_order_id);
            log.push(`Cancelled exchange stop order for ${pos.symbol}`);
          } catch (err) {
            log.push(`Could not cancel stop order for ${pos.symbol}: ${err.message}`);
          }
        }
      }
    }

    // 2. Wipe all trading data
    const tables = [
      'positions',
      'trade_history',
      'signals',
      'portfolio_snapshots',
      'strategy_performance',
      'holdings_cost_basis',
      'signal_executions'
    ];
    const wiped = {};

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .not('id', 'is', null); // match all rows (Supabase requires a filter on delete)

      if (error) {
        // signal_executions may not exist in older schemas — non-fatal
        log.push(`Skipped ${table}: ${error.message}`);
        wiped[table] = 0;
      } else {
        wiped[table] = count ?? 0;
        log.push(`Wiped ${table}: ${count ?? 0} rows`);
      }
    }

    // 3. Report live portfolio value as the suggested new baseline
    let currentPortfolioValue = null;
    if (coinbase) {
      try {
        const portfolio = await coinbase.getPortfolio();
        currentPortfolioValue = portfolio.reduce((sum, acc) => sum + acc.value_usd, 0);
      } catch (err) {
        log.push(`Could not fetch live portfolio value: ${err.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      wiped,
      currentPortfolioValue,
      nextStep: currentPortfolioValue !== null
        ? `Set INITIAL_CAPITAL=${currentPortfolioValue.toFixed(2)} in Vercel env vars (or your new deposit amount), then redeploy.`
        : 'Set INITIAL_CAPITAL in Vercel env vars to your new deposit amount, then redeploy.',
      log
    });
  } catch (error) {
    console.error('Trading reset error:', error);
    return res.status(500).json({ success: false, error: error.message, log });
  }
};
