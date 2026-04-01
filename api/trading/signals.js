/**
 * GET /api/trading/signals
 * Generate and return current trading signals for all monitored assets
 */

const { createCoinbaseClient } = require('../../lib/coinbase/client');
const { getAllSignals } = require('../../lib/trading/strategies');
const { supabase } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const coinbase = createCoinbaseClient();

    // Fetch live portfolio so we can generate signals for all held coins
    let heldSymbols = [];
    try {
      const portfolio = await coinbase.getPortfolio();
      heldSymbols = portfolio
        .filter(a => a.type === 'crypto' && a.balance > 0)
        .map(a => a.currency);
    } catch {
      // Non-fatal — fall back to monitored list only
    }

    // Find symbols that were recently sold (4h cooldown) — suppress their signals
    const cooldownSymbols = new Set();
    if (supabase) {
      const cutoff = new Date(Date.now() - 4 * 3600000).toISOString();
      const { data: recentSells } = await supabase
        .from('trade_history')
        .select('symbol')
        .eq('side', 'SELL')
        .gte('exit_time', cutoff);
      (recentSells || []).forEach(t => cooldownSymbols.add(t.symbol));
    }

    const allSignals = await getAllSignals(coinbase, heldSymbols);

    // Filter out signals for recently-sold symbols
    const signals = allSignals.filter(s => !cooldownSymbols.has(s.symbol));

    // Persist actionable signals to DB
    if (supabase) {
      const actionableSignals = signals.filter(s => s.signal !== 'HOLD');
      if (actionableSignals.length > 0) {
        await supabase.from('signals').insert(
          actionableSignals.map(s => ({
            symbol: s.symbol,
            signal: s.signal,
            confidence: s.confidence,
            strategy: s.strategy,
            price: s.price,
            reason: s.reason,
            executed: false
          }))
        ).then(({ error }) => {
          if (error) console.error('Failed to save signals:', error.message);
        });
      }
    }

    return res.status(200).json({
      success: true,
      signals,
      count: signals.length,
      actionable: signals.filter(s => s.signal !== 'HOLD').length,
      suppressedSymbols: [...cooldownSymbols],
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Signals error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
