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
    const signals = await getAllSignals(coinbase);

    // Optionally persist signals to DB
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
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Signals error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
