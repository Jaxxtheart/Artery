'use strict';
/**
 * Tests for api/scoringEngine.cjs (application underwriting logic)
 *
 * Key behaviours verified:
 *  1. parseAmount handles $/comma/decimal/k/m/b shorthand correctly — the original
 *     digit-concatenation approach silently mis-scored anything not in the exact
 *     "$85,000"-with-3-digit-commas shape (e.g. "$1.2M" parsed as 12).
 *  2. parsePercent is decimal-safe.
 *  3. A buzzword-stuffed, evidence-free application scores below a modest but
 *     specific, evidence-backed one — the whole point of the v2 rework.
 *  4. Implausible claims (oversized team for stage, big traction with no pitch
 *     deck) surface as explicit flags rather than being silently trusted or
 *     silently ignored.
 *  5. backend/services/scoringEngine.js re-exports the same engine as
 *     api/scoringEngine.cjs, so local dev and production can't drift apart.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ScoringEngine = require(path.join('..', 'api', 'scoringEngine.cjs'));

describe('parseAmount', () => {
  const engine = new ScoringEngine();

  test('parses comma-grouped dollar amounts', () => {
    assert.equal(engine.parseAmount('$85,000 monthly recurring revenue'), 85000);
  });

  test('parses decimal + million shorthand', () => {
    assert.equal(engine.parseAmount('$1.2M'), 1200000);
  });

  test('parses k shorthand', () => {
    assert.equal(engine.parseAmount('50k users'), 50000);
  });

  test('parses billion shorthand', () => {
    assert.equal(engine.parseAmount('$2.5B market'), 2500000000);
  });

  test('returns null for empty/non-numeric input', () => {
    assert.equal(engine.parseAmount(''), null);
    assert.equal(engine.parseAmount(null), null);
    assert.equal(engine.parseAmount('pre-revenue'), null);
  });
});

describe('parsePercent', () => {
  const engine = new ScoringEngine();

  test('parses whole-number percentages', () => {
    assert.equal(engine.parsePercent('25% month-over-month growth'), 25);
  });

  test('parses decimal percentages', () => {
    assert.equal(engine.parsePercent('12.5% weekly'), 12.5);
  });

  test('returns null with no percentage present', () => {
    assert.equal(engine.parsePercent('growing steadily'), null);
  });
});

describe('scoreApplication — gaming resistance', () => {
  const engine = new ScoringEngine();

  const gamed = {
    founderName: 'A Founder',
    email: 'founder@totallyreal.com',
    phone: '+27 000 000 0000',
    linkedin: 'linkedin.com',
    companyName: 'DisruptCo',
    country: 'Other',
    industry: 'fintech',
    stage: 'idea',
    problem: 'Revolutionary breakthrough innovative disruptive game-changing unique novel proprietary world-class cutting-edge problem that revolutionary disruptive breakthrough innovative unique novel solutions have never revolutionary solved before in this revolutionary disruptive space, ever, at all, anywhere, in the world, on planet earth, seriously.',
    solution: 'We provide a platform for a service that offers revolutionary AI blockchain machine learning artificial intelligence proprietary breakthrough novel unique disruptive game-changing solution that we provide as a platform for a service that we offer.',
    impact: 'Massive thousands millions communities scale mass underserved marginalized employment jobs impact across Africa Kenya Nigeria Ghana Rwanda unbanked rural farmers informal sector financial inclusion SME impact everywhere at massive scale, believe us.',
    revenue: '$500k MRR',
    users: '200k users',
    growth: '50% weekly',
    team: '15',
    fundingAmount: '$15,000',
    useOfFunds: 'We will use the money for growth and stuff and things and other important business activities related to growing our revolutionary disruptive game-changing business in ways that matter.',
    runway: '18 months',
    pitchDeck: null
  };

  const genuine = {
    founderName: 'Amara Okafor',
    email: 'amara@gmail.com',
    phone: '+234 812 345 6789',
    linkedin: 'linkedin.com/in/amaraokafor',
    companyName: 'FarmLink',
    country: 'Nigeria',
    industry: 'agritech',
    stage: 'mvp',
    problem: 'Smallholder farmers in rural Nigeria lose an estimated 30% of harvest value because they lack direct access to buyers and rely on middlemen who take a 40% cut. We interviewed 60 farmers in Kaduna state and found none had a reliable way to check real-time market prices before selling.',
    solution: 'Our SMS-based platform lets farmers with basic phones check live crop prices from 12 regional markets and connect directly with verified buyers, cutting out the middleman markup. Unlike existing apps that require smartphones, ours works on any phone via USSD, reaching farmers in areas with 2G-only coverage.',
    impact: 'In our 3-month pilot with 180 farmers, average sale price increased by 22%, adding roughly $340 in annual income per farming household. We are targeting 5,000 farmers across Kaduna and Kano states by the end of this year.',
    revenue: '$2,400 monthly recurring revenue',
    users: '180 active farmers',
    growth: '15% month-over-month',
    team: '3',
    fundingAmount: '$15,000',
    useOfFunds: 'We will allocate $6,000 to hire one field agent for farmer onboarding in Kano, $5,000 to add 2 more regional markets to our price database, and $4,000 for 6 months of SMS gateway costs at current usage.',
    runway: '9 months',
    pitchDeck: 'farmlink-deck.pdf'
  };

  test('a modest, evidence-backed application outscores a buzzword-stuffed one', () => {
    const gamedResult = engine.scoreApplication(gamed);
    const genuineResult = engine.scoreApplication(genuine);
    assert.ok(
      genuineResult.overallScore > gamedResult.overallScore,
      `expected genuine (${genuineResult.overallScore}) > gamed (${gamedResult.overallScore})`
    );
  });

  test('buzzword stuffing tanks the innovation score rather than inflating it', () => {
    const gamedResult = engine.scoreApplication(gamed);
    const genuineResult = engine.scoreApplication(genuine);
    assert.ok(genuineResult.categoryScores.innovation > gamedResult.categoryScores.innovation);
  });

  test('flags an implausible team size for the claimed stage', () => {
    const { flags } = engine.scoreApplication(gamed);
    assert.ok(flags.some(f => f.includes('team size')));
  });

  test('flags large traction claims with no supporting pitch deck', () => {
    const { flags } = engine.scoreApplication(gamed);
    assert.ok(flags.some(f => f.includes('pitch deck')));
  });

  test('a genuine, evidence-backed application raises no flags', () => {
    const { flags } = engine.scoreApplication(genuine);
    assert.deepEqual(flags, []);
  });
});

describe('local dev / production parity', () => {
  test('backend/services/scoringEngine.js re-exports the canonical engine', () => {
    const backendEngine = require(path.join('..', 'backend', 'services', 'scoringEngine.js'));
    assert.equal(backendEngine, ScoringEngine);
  });
});
