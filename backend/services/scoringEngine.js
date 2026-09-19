/**
 * Artery Capital - Application Scoring Engine (local dev re-export)
 *
 * This used to be a byte-for-byte duplicate of api/scoringEngine.cjs, maintained by
 * hand in two places. That's a drift risk with no upside — the production (Vercel)
 * and local-dev servers should score applications identically, and copy-pasted files
 * are exactly how they'd quietly stop doing that. Re-exporting the canonical
 * implementation instead means there is exactly one scoring engine to reason about,
 * test, and improve.
 */
module.exports = require('../../api/scoringEngine.cjs');
