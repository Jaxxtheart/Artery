/**
 * GET /api/trading/onchain-signals
 * Returns:
 *   - active on-chain signals with strategy confirmations
 *   - backtesting accuracy stats from closed signal_executions
 */

const { supabase } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(200).json({
      success: true,
      signals: [],
      backtesting: [],
      message: 'Supabase not configured — on-chain signal engine not connected'
    });
  }

  try {
    const now = new Date().toISOString();

    // ── Active on-chain signals (not expired) ─────────────────────────────────
    const { data: signals, error: sigErr } = await supabase
      .from('onchain_signals')
      .select(`
        id,
        signal_type,
        asset,
        confidence_score,
        direction,
        signal_data,
        signal_date,
        expires_at,
        signal_strategy_confirmations (
          id,
          strategy_name,
          strategy_condition_met,
          strategy_confidence,
          signal_boosted_confidence,
          boost_amount,
          confirmation_data
        )
      `)
      .gte('expires_at', now)
      .order('signal_date', { ascending: false })
      .limit(40);

    if (sigErr) {
      console.error('onchain_signals fetch error:', sigErr.message);
    }

    // ── Backtesting stats: closed signal_executions (last 90 days) ────────────
    const cutoff90d = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: closedExecs, error: execErr } = await supabase
      .from('signal_executions')
      .select(`
        id,
        asset,
        side,
        status,
        pnl,
        pnl_pct,
        entry_price,
        exit_price,
        execution_strategy,
        entry_time,
        exit_time,
        signal_id
      `)
      .eq('status', 'CLOSED')
      .gte('entry_time', cutoff90d)
      .order('exit_time', { ascending: false });

    if (execErr) {
      console.error('signal_executions fetch error:', execErr.message);
    }

    // ── Build backtesting accuracy table ─────────────────────────────────────
    // Group closed executions by strategy and by signal_type if we can join them
    const stratStats = {};
    for (const ex of (closedExecs || [])) {
      const key = ex.execution_strategy || 'unknown';
      if (!stratStats[key]) {
        stratStats[key] = { trades: 0, wins: 0, losses: 0, totalPnl: 0, winPnls: [], lossPnls: [] };
      }
      const s = stratStats[key];
      s.trades++;
      if (ex.pnl_pct !== null && ex.pnl_pct !== undefined) {
        s.totalPnl += ex.pnl_pct;
        if (ex.pnl_pct > 0) { s.wins++; s.winPnls.push(ex.pnl_pct); }
        else { s.losses++; s.lossPnls.push(Math.abs(ex.pnl_pct)); }
      }
    }

    const backtesting = Object.entries(stratStats).map(([strategy, s]) => ({
      strategy,
      trades: s.trades,
      wins: s.wins,
      losses: s.losses,
      winRate: s.trades > 0 ? Math.round((s.wins / s.trades) * 100) : 0,
      avgWin: s.winPnls.length > 0 ? parseFloat((s.winPnls.reduce((a, b) => a + b, 0) / s.winPnls.length).toFixed(2)) : 0,
      avgLoss: s.lossPnls.length > 0 ? parseFloat((s.lossPnls.reduce((a, b) => a + b, 0) / s.lossPnls.length).toFixed(2)) : 0,
      totalPnlPct: parseFloat(s.totalPnl.toFixed(2)),
    })).sort((a, b) => b.winRate - a.winRate);

    // ── Signal type accuracy from confirmations ───────────────────────────────
    // Count how many times each signal_type resulted in a strategy execution and won
    const signalTypeStats = {};
    for (const sig of (signals || [])) {
      const type = sig.signal_type;
      if (!signalTypeStats[type]) {
        signalTypeStats[type] = { total: 0, executed: 0, boosted: 0 };
      }
      signalTypeStats[type].total++;
      const confs = sig.signal_strategy_confirmations || [];
      if (confs.some(c => c.strategy_condition_met)) signalTypeStats[type].executed++;
      if (confs.some(c => (c.signal_boosted_confidence || 0) >= 0.80)) signalTypeStats[type].boosted++;
    }

    return res.status(200).json({
      success: true,
      signals: signals || [],
      backtesting,
      signalTypeStats,
      totalActive: (signals || []).length,
      totalClosed: (closedExecs || []).length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('onchain-signals handler error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
