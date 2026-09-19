/**
 * Artery Capital - Application Scoring Engine
 *
 * Combines three evaluation frameworks:
 * 1. Y Combinator Principles: Team quality, traction, product-market fit, growth
 * 2. Silicon Valley Criteria: Scalability, disruption potential, market size, innovation
 * 3. Harambeans Principles: African context, impact, sustainability, local relevance
 *
 * Outputs: Overall score, category breakdowns, current valuation, 3-5 year projected valuation
 *
 * Design note (v2): the original version leaned heavily on cheap-to-fake proxies —
 * raw text length, keyword stuffing, and "has a LinkedIn URL" — which a founder could
 * game without improving the underlying business. This version keeps the same category
 * weights (so it's a drop-in replacement) but reworks each category's internals to:
 *   - reward genuine specificity (numbers, named comparisons) instead of length alone
 *   - penalize buzzword/keyword stuffing instead of rewarding it
 *   - weight structured fields (country, stage, team size) over freeform prose where
 *     a structured field is a harder-to-fake signal
 *   - cross-check claims for plausibility (e.g. team size vs. claimed stage) instead
 *     of taking every self-reported number at face value
 *   - fix currency/percentage parsing, which previously mis-parsed shorthand like
 *     "$1.2M" or "50k" (see parseAmount/parsePercent)
 * None of this replaces human due diligence — it's still a self-reported form — but it
 * raises the cost of gaming the score and reduces false signal from formatting alone.
 */

class ScoringEngine {
  constructor() {
    // Scoring weights (total = 100)
    this.weights = {
      // Y Combinator Focus
      founderQuality: 20,      // Team is everything
      traction: 18,            // Metrics and growth
      productMarketFit: 15,    // Problem-solution alignment

      // Silicon Valley Focus
      marketOpportunity: 15,   // TAM, scalability
      innovation: 12,          // Disruption potential

      // Harambeans Focus
      africanImpact: 10,       // Local relevance and impact
      sustainability: 10       // Long-term viability
    };

    // Industry multipliers for valuation
    this.industryMultipliers = {
      'fintech': 1.8,
      'healthtech': 1.6,
      'edtech': 1.4,
      'agritech': 1.5,
      'cleantech': 1.6,
      'e-commerce': 1.3,
      'saas': 1.7,
      'logistics': 1.4,
      'other': 1.0
    };

    // Stage-based valuation ranges (in USD)
    this.stageValuations = {
      'idea': { min: 50000, max: 200000, multiplier: 1.0 },
      'prototype': { min: 150000, max: 500000, multiplier: 1.5 },
      'mvp': { min: 300000, max: 800000, multiplier: 2.0 },
      'revenue': { min: 500000, max: 2000000, multiplier: 3.0 },
      'scaling': { min: 1000000, max: 5000000, multiplier: 4.0 }
    };

    // Expected team-size range per stage, used as a plausibility check rather than
    // a hard rule — a mismatch is a signal worth a human looking twice, not a reject.
    this.expectedTeamRangeByStage = {
      'idea': [1, 3],
      'prototype': [1, 5],
      'mvp': [2, 8],
      'revenue': [3, 15],
      'scaling': [5, 50]
    };

    // African market growth factors (conservative estimates)
    this.africanMarkets = {
      'nigeria': { growth: 1.25, stability: 0.85 },
      'kenya': { growth: 1.22, stability: 0.90 },
      'south africa': { growth: 1.15, stability: 0.92 },
      'ghana': { growth: 1.20, stability: 0.88 },
      'rwanda': { growth: 1.28, stability: 0.95 },
      'egypt': { growth: 1.18, stability: 0.82 },
      'other': { growth: 1.15, stability: 0.80 }
    };
  }

  /**
   * Main scoring function
   * @param {Object} application - The application data
   * @returns {Object} Scoring results with valuations
   */
  scoreApplication(application) {
    const scores = {
      founderQuality: this.scoreFounderQuality(application),
      traction: this.scoreTraction(application),
      productMarketFit: this.scoreProductMarketFit(application),
      marketOpportunity: this.scoreMarketOpportunity(application),
      innovation: this.scoreInnovation(application),
      africanImpact: this.scoreAfricanImpact(application),
      sustainability: this.scoreSustainability(application)
    };

    // Calculate weighted total score (0-100)
    const totalScore = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * this.weights[key] / 100);
    }, 0);

    // Calculate valuations
    const valuation = this.calculateValuation(application, totalScore);

    return {
      overallScore: Math.round(totalScore * 10) / 10,
      rating: this.getRating(totalScore),
      categoryScores: scores,
      weights: this.weights,
      valuation: valuation,
      recommendation: this.getRecommendation(totalScore),
      strengths: this.identifyStrengths(scores),
      concerns: this.identifyConcerns(scores),
      flags: this.identifyFlags(application, scores),
      nextSteps: this.getNextSteps(totalScore, application)
    };
  }

  /**
   * Y Combinator: Founder Quality Assessment
   * Evaluates team credibility, experience, and commitment.
   *
   * v2 change: LinkedIn/email format signals are weak on their own (a $10 domain and a
   * pasted URL cost a founder nothing), so their weight is reduced. Team size is
   * cross-checked against claimed stage instead of rewarded linearly — a 15-person
   * team at "idea" stage is a red flag, not a bonus.
   */
  scoreFounderQuality(app) {
    let score = 0;

    // LinkedIn — require an actual profile-shaped URL, not just the bare domain.
    // "linkedin.com" alone (e.g. a copy-pasted homepage link) no longer scores the same
    // as a real profile/company URL. Max 20 pts (was 30).
    const linkedin = (app.linkedin || '').toLowerCase();
    if (/linkedin\.com\/(in|company)\/[a-z0-9\-_%]+/i.test(linkedin)) {
      score += 20;
    } else if (linkedin.length > 0) {
      score += 8; // some link provided, but not a recognizable profile format
    }

    // Email — reduced weight. A free-email founder is not meaningfully less serious
    // than one with a custom domain (YC explicitly doesn't penalize this); we still
    // give a small edge to a verified custom domain but no longer treat gmail as a
    // demerit worth double the "free email" founder. Max 10 pts (was 20).
    if (app.email && app.email.includes('@')) {
      const emailDomain = (app.email.split('@')[1] || '').toLowerCase();
      const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
      score += freeProviders.includes(emailDomain) ? 7 : 10;
    }

    // Team size — genuine signal, but scaled down from the original (was up to 30
    // regardless of stage) because raw headcount alone rewards inflating the number.
    // Max 30 pts.
    const teamSize = this.parseTeamSize(app.team);
    if (teamSize >= 10) score += 30;
    else if (teamSize >= 5) score += 25;
    else if (teamSize >= 3) score += 20;
    else if (teamSize >= 2) score += 15;
    else score += 6; // solo founder — not disqualifying, just lower baseline

    // Contact completeness — unchanged, structural signal. Max 20 pts.
    const hasPhone = app.phone && app.phone.length > 5;
    const hasName = app.founderName && app.founderName.length > 2;
    if (hasPhone && hasName) score += 20;
    else if (hasPhone || hasName) score += 8;

    // Plausibility check — does the claimed team size make sense for the claimed
    // stage? Rewards *consistency* (a real, structural signal) rather than raw size,
    // which closes the incentive to simply claim a bigger team. Max 20 pts.
    const stage = (app.stage || '').toLowerCase();
    const expectedRange = this.expectedTeamRangeByStage[stage];
    if (expectedRange) {
      const [min, max] = expectedRange;
      if (teamSize >= min && teamSize <= max) {
        score += 20;
      } else if (teamSize > max) {
        score += 6; // oversized team for an early stage — plausible but worth a look
      } else {
        score += 10; // undersized for a later stage — common and not alarming
      }
    } else {
      score += 10; // unknown stage, neutral credit
    }

    return Math.max(0, Math.min(Math.round(score), 100));
  }

  /**
   * Y Combinator: Traction Assessment
   * Growth is the best signal - actual metrics matter most.
   *
   * v2 change: the original regex (`text.match(/\d+/g).join('')`) mis-parsed any
   * shorthand amount — "$1.2M" parsed as 12, "$85,000" only worked by the accident of
   * always having 3-digit comma groups. Replaced with parseAmount/parsePercent, which
   * correctly handle k/m/thousand/million suffixes and decimals.
   */
  scoreTraction(app) {
    let score = 0;

    // Revenue - strongest signal - 40 points
    const revenueText = (app.revenue || '').toLowerCase();
    if (revenueText.includes('pre-revenue') || revenueText.includes('no revenue') || revenueText.trim() === '0') {
      score += 5; // at least they're honest
    } else {
      const amount = this.parseAmount(revenueText);
      if (amount !== null) {
        if (amount >= 100000) score += 40;
        else if (amount >= 50000) score += 35;
        else if (amount >= 10000) score += 30;
        else if (amount >= 1000) score += 20;
        else score += 10;
      }
    }

    // Users/Customers - 30 points
    const usersAmount = this.parseAmount(app.users);
    if (usersAmount !== null) {
      if (usersAmount >= 100000) score += 30;
      else if (usersAmount >= 50000) score += 25;
      else if (usersAmount >= 10000) score += 20;
      else if (usersAmount >= 1000) score += 15;
      else if (usersAmount >= 100) score += 10;
      else score += 5;
    }

    // Growth rate (YC loves 10% weekly growth) - 30 points
    const growthText = (app.growth || '').toLowerCase();
    const rate = this.parsePercent(growthText);
    if (rate !== null) {
      if (growthText.includes('week')) {
        if (rate >= 10) score += 30;
        else if (rate >= 5) score += 25;
        else score += 18;
      } else if (growthText.includes('month')) {
        if (rate >= 20) score += 30;
        else if (rate >= 10) score += 25;
        else score += 15;
      } else if (growthText.includes('year')) {
        if (rate >= 100) score += 20;
        else if (rate >= 50) score += 15;
        else score += 10;
      } else {
        score += 8; // a % was given but no timeframe — some credit, low confidence
      }
    }

    // Verifiability nudge: a striking traction claim with zero supporting evidence
    // (no pitch deck) is worth flagging for diligence rather than silently trusted.
    // This is a small, capped adjustment — it does not zero out the claim.
    const claimedBigNumbers = (usersAmount !== null && usersAmount >= 10000) ||
      (this.parseAmount(revenueText) !== null && this.parseAmount(revenueText) >= 50000);
    if (claimedBigNumbers && !app.pitchDeck) {
      score -= 8;
    }

    return Math.max(0, Math.min(Math.round(score), 100));
  }

  /**
   * Y Combinator: Product-Market Fit
   * Do people want what you're building?
   *
   * v2 change: previously, hitting a length threshold with any single number/$/% in the
   * text (`assessTextQuality`) was enough for full marks — trivially gameable by padding.
   * Now the specificity gate is required for the top bucket, and generic filler
   * ("we provide", "platform for"...) density is penalized instead of ignored.
   */
  scoreProductMarketFit(app) {
    let score = 0;

    score += this.scoreNarrativeField(app.problem, 35);
    score += this.scoreNarrativeField(app.solution, 35);
    score += this.scoreNarrativeField(app.impact, 30);

    return Math.max(0, Math.min(Math.round(score), 100));
  }

  /**
   * Shared narrative scorer used across problem/solution/impact. Requires genuine
   * specificity (quantified claims, not just length) to reach the top bucket, and
   * penalizes generic filler language and buzzword stuffing.
   */
  scoreNarrativeField(text, maxPoints) {
    if (!text) return 0;
    const length = text.length;
    const quality = this.assessTextQuality(text);
    const fillerPenalty = this.genericFillerPenalty(text);

    let points;
    if (length >= 200 && quality.specific) {
      points = maxPoints;
    } else if (length >= 150 && quality.specific) {
      points = maxPoints * 0.85;
    } else if (length >= 100) {
      points = maxPoints * 0.65;
    } else if (length >= 50) {
      points = maxPoints * 0.4;
    } else {
      points = 0;
    }

    return Math.max(0, points - fillerPenalty);
  }

  /**
   * Silicon Valley: Market Opportunity
   * TAM, scalability, market dynamics
   */
  scoreMarketOpportunity(app) {
    let score = 0;

    // Industry potential - 40 points
    const industry = app.industry ? app.industry.toLowerCase() : 'other';
    const industryScore = {
      'fintech': 40,
      'healthtech': 38,
      'saas': 38,
      'edtech': 35,
      'agritech': 35,
      'cleantech': 35,
      'e-commerce': 30,
      'logistics': 30,
      'other': 20
    };
    score += industryScore[industry] || 20;

    // Stage appropriateness - 30 points
    const stage = app.stage ? app.stage.toLowerCase() : 'idea';
    const stageScore = {
      'scaling': 30,
      'revenue': 25,
      'mvp': 20,
      'prototype': 15,
      'idea': 10
    };
    score += stageScore[stage] || 10;

    // Geographic market - 30 points (structured field, not self-reported prose)
    const country = app.country ? app.country.toLowerCase() : 'other';
    const marketData = this.africanMarkets[country] || this.africanMarkets['other'];
    score += marketData.growth * 24; // Scale to 30 points max

    return Math.max(0, Math.min(Math.round(score), 100));
  }

  /**
   * Silicon Valley: Innovation & Disruption
   * Is this a 10x improvement or incremental?
   *
   * v2 change: previously `+10 per keyword` uncapped meant stuffing "revolutionary,
   * novel, unique, proprietary, breakthrough, innovative" into two sentences alone
   * could add up to 60 points regardless of whether the claim made sense. Now:
   *  - technology-signal keywords give small, capped, diminishing credit
   *  - genuine comparative/differentiation language ("unlike", "compared to") is
   *    rewarded instead, since it indicates the founder actually thought through why
   *    they're different, not just that they used the word "unique"
   *  - hype-word density (buzzwords per word of text) is penalized past a threshold
   */
  scoreInnovation(app) {
    const text = `${app.problem || ''} ${app.solution || ''} ${app.impact || ''}`;
    const lower = text.toLowerCase();
    let score = 50; // baseline

    const techSignals = [
      'ai', 'artificial intelligence', 'machine learning', 'blockchain',
      'patent', 'proprietary', 'algorithm', 'automation'
    ];
    const techMatches = techSignals.filter(kw => lower.includes(kw)).length;
    score += Math.min(techMatches * 5, 20); // capped, diminishing — was up to 50 uncapped

    const differentiationSignals = [
      'unlike', 'compared to', 'instead of', 'unlike existing',
      'competitors', 'alternative to', 'whereas', 'in contrast'
    ];
    const diffMatches = differentiationSignals.filter(kw => lower.includes(kw)).length;
    score += Math.min(diffMatches * 8, 24); // rewards actually-explained differentiation

    // Hype-word stuffing penalty
    const hypeWords = [
      'revolutionary', 'disrupting', 'disruptive', 'game-changing',
      'breakthrough', 'unique', 'novel', 'innovative', 'world-class', 'cutting-edge'
    ];
    const density = this.buzzwordDensity(text, hypeWords);
    if (density > 0.02) {
      score -= Math.min((density - 0.02) * 600, 30);
    }

    // Generic boilerplate penalty
    const genericPhrases = ['we provide', 'we offer', 'platform for', 'service that'];
    const genericMatches = genericPhrases.filter(kw => lower.includes(kw)).length;
    score -= genericMatches * 5;

    return Math.max(0, Math.min(Math.round(score), 100));
  }

  /**
   * Harambeans: African Impact
   * Does this solve real African problems at scale?
   *
   * v2 change: country is a structured dropdown field — much harder to fake than
   * prose — so it now carries more weight than freeform keyword mentions. Keyword
   * stuffing ("Africa... Kenya... unbanked... rural...") is capped much lower, and the
   * "impact scale" bucket now requires the impact statement to actually be specific
   * (numbers/metrics), not just contain a word like "thousands".
   */
  scoreAfricanImpact(app) {
    let score = 0;
    const text = `${app.problem || ''} ${app.solution || ''} ${app.impact || ''}`.toLowerCase();
    const country = (app.country || '').toLowerCase();

    // Verified geography - 35 points (was folded into a 25pt bucket alongside prose)
    const africanCountries = ['nigeria', 'kenya', 'south africa', 'ghana', 'rwanda', 'egypt'];
    if (africanCountries.some(c => country.includes(c))) {
      score += 35;
    } else if (country && country !== 'other') {
      score += 15; // some geographic specificity given, just not in our core markets
    } else {
      score += 5;
    }

    // Local-relevance language - 25 points max (was 40), diminishing returns per
    // distinct concept mentioned rather than a flat count of any repeated keyword
    const localityKeywords = [
      'informal sector', 'financial inclusion', 'unbanked', 'rural',
      'smallholder', 'last-mile', 'healthcare access', 'education gap', 'sme'
    ];
    const localMatches = localityKeywords.filter(kw => text.includes(kw)).length;
    score += Math.min(localMatches * 5, 25);

    // Impact scale - 30 points, gated on the impact statement actually being specific
    // (contains real numbers/metrics), not just containing a scale-sounding word
    const impactQuality = this.assessTextQuality(app.impact);
    if (impactQuality.specific) {
      score += 30;
    } else if (app.impact && app.impact.length >= 50) {
      score += 12;
    }

    return Math.max(0, Math.min(Math.round(score), 100));
  }

  /**
   * Harambeans: Sustainability
   * Can this business survive and thrive long-term?
   *
   * v2 change: use-of-funds is now scored on specificity (an itemized, numbered
   * budget) rather than raw character length, and a pitch deck is treated as a small
   * corroborating-evidence signal.
   */
  scoreSustainability(app) {
    let score = 0;

    // Revenue model clarity - 35 points
    const hasRevenue = app.revenue && !app.revenue.toLowerCase().includes('pre-revenue') && app.revenue.trim() !== '0';
    if (hasRevenue) score += 20;

    const useOfFundsQuality = this.assessTextQuality(app.useOfFunds);
    if (app.useOfFunds && app.useOfFunds.length >= 100 && useOfFundsQuality.specific) {
      score += 15; // an itemized plan (numbers = actual budget line items)
    } else if (app.useOfFunds && app.useOfFunds.length >= 50) {
      score += 7;
    }

    // Runway planning - 30 points
    const runway = (app.runway || '').toLowerCase();
    if (runway.includes('month')) {
      const months = this.parseAmount(runway);
      if (months !== null) {
        if (months >= 18) score += 30;
        else if (months >= 12) score += 25;
        else if (months >= 6) score += 20;
        else score += 10;
      }
    }

    // Funding amount appropriateness - 25 points
    const fundingAmount = this.parseAmount(app.fundingAmount);
    if (fundingAmount !== null) {
      if (fundingAmount >= 10000 && fundingAmount <= 25000) score += 25;
      else if (fundingAmount >= 5000 && fundingAmount <= 50000) score += 17;
      else score += 8;
    }

    // Corroborating evidence - 10 points
    if (app.pitchDeck) score += 10;

    return Math.max(0, Math.min(Math.round(score), 100));
  }

  /**
   * Valuation Calculation Engine
   * Combines stage, score, industry, and market factors
   */
  calculateValuation(app, totalScore) {
    const stage = app.stage ? app.stage.toLowerCase() : 'idea';
    const industry = app.industry ? app.industry.toLowerCase() : 'other';
    const country = app.country ? app.country.toLowerCase() : 'other';

    // Get base valuation range for stage
    const stageData = this.stageValuations[stage] || this.stageValuations['idea'];

    // Score multiplier (0.5 to 1.5 based on score)
    const scoreMultiplier = 0.5 + (totalScore / 100);

    // Industry multiplier
    const industryMultiplier = this.industryMultipliers[industry] || 1.0;

    // Market data
    const marketData = this.africanMarkets[country] || this.africanMarkets['other'];

    // Calculate current valuation
    const baseValuation = (stageData.min + stageData.max) / 2;
    const currentValuation = baseValuation * scoreMultiplier * industryMultiplier * marketData.stability;

    // Calculate 3-5 year projection
    // Assumptions: successful startups grow 5-10x in 3-5 years
    const growthMultiplier = this.calculateGrowthMultiplier(app, totalScore);
    const projectedValuation3yr = currentValuation * growthMultiplier * Math.pow(marketData.growth, 3);
    const projectedValuation5yr = currentValuation * growthMultiplier * 1.5 * Math.pow(marketData.growth, 5);

    return {
      current: {
        amount: Math.round(currentValuation),
        currency: 'USD',
        breakdown: {
          baseValuation: Math.round(baseValuation),
          scoreMultiplier: Math.round(scoreMultiplier * 100) / 100,
          industryMultiplier: industryMultiplier,
          marketStability: Math.round(marketData.stability * 100) / 100
        }
      },
      projected3Year: {
        amount: Math.round(projectedValuation3yr),
        currency: 'USD',
        assumptions: {
          growthMultiplier: Math.round(growthMultiplier * 100) / 100,
          marketGrowth: Math.round(marketData.growth * 100) / 100,
          compoundYears: 3
        }
      },
      projected5Year: {
        amount: Math.round(projectedValuation5yr),
        currency: 'USD',
        assumptions: {
          growthMultiplier: Math.round(growthMultiplier * 1.5 * 100) / 100,
          marketGrowth: Math.round(marketData.growth * 100) / 100,
          compoundYears: 5
        }
      }
    };
  }

  /**
   * Calculate growth multiplier based on traction and market
   */
  calculateGrowthMultiplier(app, score) {
    let multiplier = 5; // Base 5x growth for average startups

    // High score companies grow faster
    if (score >= 80) multiplier = 10;
    else if (score >= 70) multiplier = 8;
    else if (score >= 60) multiplier = 6;

    // Stage affects growth potential
    const stage = app.stage ? app.stage.toLowerCase() : 'idea';
    if (stage === 'scaling') multiplier *= 1.5;
    else if (stage === 'revenue') multiplier *= 1.3;
    else if (stage === 'mvp') multiplier *= 1.1;

    // High-growth industries
    const industry = app.industry ? app.industry.toLowerCase() : 'other';
    if (['fintech', 'saas', 'healthtech'].includes(industry)) {
      multiplier *= 1.2;
    }

    return multiplier;
  }

  /**
   * Helper: parse a numeric amount from freeform text, correctly handling
   * commas, decimals, and k/thousand/m/million/b/billion shorthand.
   * "$1.2M" -> 1200000, "$85,000" -> 85000, "50k users" -> 50000
   */
  parseAmount(text) {
    if (!text) return null;
    const cleaned = String(text).toLowerCase().replace(/,/g, '');
    // \b after the suffix group is essential: without it, "85000 monthly revenue"
    // matches the bare "m" suffix out of "monthly" and reads as $85 billion.
    const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(thousand|million|billion|mm|mil|bn|k|m|b)?\b/);
    if (!match) return null;
    let amount = parseFloat(match[1]);
    if (isNaN(amount)) return null;
    const suffix = match[2];
    if (suffix === 'k' || suffix === 'thousand') amount *= 1000;
    else if (suffix === 'm' || suffix === 'mm' || suffix === 'mil' || suffix === 'million') amount *= 1000000;
    else if (suffix === 'b' || suffix === 'bn' || suffix === 'billion') amount *= 1000000000;
    return amount;
  }

  /**
   * Helper: parse a percentage value from freeform text, decimal-safe.
   * "25% month-over-month" -> 25, "12.5%" -> 12.5
   */
  parsePercent(text) {
    if (!text) return null;
    const match = String(text).toLowerCase().match(/(\d+(?:\.\d+)?)\s*%/);
    if (!match) return null;
    const value = parseFloat(match[1]);
    return isNaN(value) ? null : value;
  }

  /**
   * Helper: parse team size from either a number ("5") or a range ("8-15"),
   * taking the lower bound of a range as the conservative estimate.
   */
  parseTeamSize(teamField) {
    if (!teamField) return 0;
    const match = String(teamField).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Helper: buzzwords found per word of text — a density measure so a short
   * paragraph stuffed with hype words is penalized more than a long, substantive one
   * that happens to use one of the same words once.
   */
  buzzwordDensity(text, keywords) {
    if (!text) return 0;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return 0;
    const lower = text.toLowerCase();
    const matches = keywords.reduce((count, kw) => {
      return count + (lower.split(kw).length - 1);
    }, 0);
    return matches / words.length;
  }

  /**
   * Helper: penalize generic filler phrases relative to text length, so padding a
   * narrative with boilerplate doesn't pass as substance.
   */
  genericFillerPenalty(text) {
    if (!text) return 0;
    const fillerPhrases = ['we provide', 'we offer', 'platform for', 'service that', 'solution for'];
    const lower = text.toLowerCase();
    const matches = fillerPhrases.filter(p => lower.includes(p)).length;
    return matches * 4;
  }

  /**
   * Helper: Assess text quality — requires an actual quantified claim (a number,
   * currency figure, or percentage) alongside enough length to be substantive.
   * A single stray "$" or digit is easy to insert; this is a floor, not a strong
   * quality proof, which is why callers still gate on length/context around it.
   */
  assessTextQuality(text) {
    if (!text) return { specific: false, detailed: false };

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const hasNumbers = /\d/.test(text);
    const hasSpecifics = hasNumbers || text.includes('$') || text.includes('%');

    return {
      specific: hasSpecifics && wordCount >= 30,
      detailed: wordCount >= 50
    };
  }

  /**
   * Convert score to rating
   */
  getRating(score) {
    if (score >= 85) return 'Exceptional';
    if (score >= 75) return 'Strong';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Moderate';
    return 'Needs Development';
  }

  /**
   * Generate recommendation
   */
  getRecommendation(score) {
    if (score >= 80) return 'Strong Invest - Fast-track for due diligence';
    if (score >= 70) return 'Invest - Schedule interview and deeper evaluation';
    if (score >= 60) return 'Consider - Request additional information';
    if (score >= 50) return 'Hold - Monitor for future improvements';
    return 'Pass - Not aligned with current thesis';
  }

  /**
   * Identify key strengths
   */
  identifyStrengths(scores) {
    const strengths = [];
    const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    sortedScores.slice(0, 3).forEach(([category, score]) => {
      if (score >= 70) {
        strengths.push(this.getCategoryDescription(category, score));
      }
    });

    return strengths.length > 0 ? strengths : ['Application shows potential but needs development'];
  }

  /**
   * Identify concerns
   */
  identifyConcerns(scores) {
    const concerns = [];

    Object.entries(scores).forEach(([category, score]) => {
      if (score < 50) {
        concerns.push(this.getCategoryConcern(category, score));
      }
    });

    return concerns.length > 0 ? concerns : ['No major concerns identified'];
  }

  /**
   * Flags that call out application data worth a human double-check — separate from
   * the score itself, since these are about verifiability/consistency rather than
   * quality per se (e.g. a great application with an unverifiable revenue claim
   * shouldn't silently lose points with no explanation of why).
   */
  identifyFlags(app, scores) {
    const flags = [];
    const teamSize = this.parseTeamSize(app.team);
    const stage = (app.stage || '').toLowerCase();
    const expectedRange = this.expectedTeamRangeByStage[stage];

    if (expectedRange && teamSize > expectedRange[1]) {
      flags.push(`Claimed team size (${teamSize}) is unusually large for "${app.stage}" stage — verify in interview`);
    }

    const usersAmount = this.parseAmount(app.users);
    const revenueAmount = this.parseAmount((app.revenue || '').toLowerCase().includes('pre-revenue') ? '' : app.revenue);
    const bigClaim = (usersAmount !== null && usersAmount >= 10000) || (revenueAmount !== null && revenueAmount >= 50000);
    if (bigClaim && !app.pitchDeck) {
      flags.push('Significant traction claimed with no supporting pitch deck — request evidence');
    }

    return flags;
  }

  /**
   * Get category description
   */
  getCategoryDescription(category, score) {
    const descriptions = {
      founderQuality: `Exceptional founder profile with strong credentials (${score}/100)`,
      traction: `Impressive traction metrics demonstrating market validation (${score}/100)`,
      productMarketFit: `Clear problem-solution fit with strong market need (${score}/100)`,
      marketOpportunity: `Large addressable market with strong growth potential (${score}/100)`,
      innovation: `Innovative approach with differentiated solution (${score}/100)`,
      africanImpact: `Significant potential for African market impact (${score}/100)`,
      sustainability: `Strong business model with path to sustainability (${score}/100)`
    };

    return descriptions[category] || `Strong ${category} performance`;
  }

  /**
   * Get category concern
   */
  getCategoryConcern(category, score) {
    const concerns = {
      founderQuality: `Limited founder background information (${score}/100)`,
      traction: `Minimal traction metrics - needs stronger validation (${score}/100)`,
      productMarketFit: `Problem-solution fit needs clearer articulation (${score}/100)`,
      marketOpportunity: `Market opportunity requires better definition (${score}/100)`,
      innovation: `Innovation angle could be stronger or more differentiated (${score}/100)`,
      africanImpact: `African market relevance needs stronger emphasis (${score}/100)`,
      sustainability: `Business sustainability model needs development (${score}/100)`
    };

    return concerns[category] || `${category} needs improvement`;
  }

  /**
   * Next steps recommendation
   */
  getNextSteps(score, app) {
    if (score >= 75) {
      return [
        'Schedule founder interview within 1 week',
        'Conduct deep-dive due diligence on market and traction claims',
        'Request detailed financial projections and cap table',
        'Connect with references and existing customers/users'
      ];
    } else if (score >= 60) {
      return [
        'Request additional information on weak areas',
        'Schedule exploratory call to assess founder commitment',
        'Ask for product demo or prototype walkthrough',
        'Evaluate against current portfolio fit'
      ];
    } else {
      return [
        'Provide feedback on areas needing development',
        'Suggest reapplication after achieving key milestones',
        'Consider for accelerator program rather than direct investment',
        'Monitor progress for future consideration'
      ];
    }
  }
}

module.exports = ScoringEngine;
