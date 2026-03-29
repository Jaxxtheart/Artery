/**
 * GET  /api/holdings/cost-basis          — fetch all stored cost bases
 * POST /api/holdings/cost-basis          — upsert one { currency, total_spent, notes? }
 * DELETE /api/holdings/cost-basis        — remove one { currency }
 *
 * Auth required for POST/DELETE: Authorization: Bearer <ADMIN_PASSWORD>
 */

const { supabase } = require('../../lib/supabase');

module.exports = async function handler(req, res) {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  // GET — public, no auth needed
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('holdings_cost_basis')
      .select('*')
      .order('currency');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, costBases: data });
  }

  // Auth required for mutations
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { currency, total_spent, notes } = req.body;
    if (!currency || total_spent == null) {
      return res.status(400).json({ error: 'currency and total_spent are required' });
    }
    const { data, error } = await supabase
      .from('holdings_cost_basis')
      .upsert({ currency: currency.toUpperCase(), total_spent: parseFloat(total_spent), notes: notes || null, updated_at: new Date().toISOString() }, { onConflict: 'currency' })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, record: data });
  }

  if (req.method === 'DELETE') {
    const { currency } = req.body;
    if (!currency) return res.status(400).json({ error: 'currency is required' });
    const { error } = await supabase
      .from('holdings_cost_basis')
      .delete()
      .eq('currency', currency.toUpperCase());
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
