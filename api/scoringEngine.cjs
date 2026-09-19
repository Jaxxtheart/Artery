/**
 * Artery Capital - Application Scoring Engine
 *
 * Combines three evaluation frameworks:
 * 1. Y Combinator Principles: Team quality, traction, product-market fit, growth
 * 2. Silicon Valley Criteria: Scalability, disruption potential, market size, innovation
 * 3. Harambeans Principles: African context, impact, sustainability, local relevance
 *
 * Outputs: Overall score, category breakdowns, current valuation, 3-5 year projected valuation
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
      nextSteps: this.getNextSteps(totalScore, application)
    };
  }

  /**
   * Y Combinator: Founder Quality Assessment
   * Evaluates team credibility, experience, and commitment
   */
  scoreFounderQuality(app) {
    let score = 0;

    // LinkedIn presence (strong signal of professionalism) - 30 points
    if (app.linkedin && app.linkedin.includes('linkedin.com')) {
      score += 30;
    } else if (app.linkedin && app.linkedin.length > 0) {
      score += 15; // Some link provided
    }

    // Email quality (professional domain vs free email) - 20 points
    if (app.email) {
      const emailDomain = app.email.split('@')[1];
      if (emailDomain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(emailDomain.toLowerCase())) {
        score += 20; // Custom domain = more professional
      } else {
        score += 10; // Free email is okay for early stage
      }
    }

    // Team size (shows traction in hiring) - 30 points
    const teamSize = parseInt(app.team) || 0;
    if (teamSize >= 10) {
      score += 30;
    } else if (teamSize >= 5) {
      score += 25;
    } else if (teamSize >= 3) {
      score += 20;
    } else if (teamSize >= 2) {
      score += 15;
    } else {
      score += 5; // Solo founder
    }

    // Contact completeness - 20 points
    const hasPhone = app.phone && app.phone.length > 5;
    const hasName = app.founderName && app.founderName.length > 2;
    if (hasPhone && hasName) score += 20;
    else if (hasPhone || hasName) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Y Combinator: Traction Assessment
   * Growth is the best signal - actual metrics matter most
   */
  scoreTraction(app) {
    let score = 0;

    // Revenue (strongest signal) - 40 points
    const revenue = app.revenue ? app.revenue.toLowerCase() : '';
    if (revenue.includes('$') || revenue.includes('usd') || revenue.includes('r ')) {
      // Extract numbers
      const numbers = revenue.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const amount = parseInt(numbers.join(''));
        if (amount >= 100000) score += 40;
        else if (amount >= 50000) score += 35;
        else if (amount >= 10000) score += 30;
        else if (amount >= 1000) score += 20;
        else score += 10;
      }
    } else if (revenue.includes('pre-revenue') || revenue.includes('no revenue') || revenue === '0') {
      score += 5; // At least they're honest
    }

    // Users/Customers - 30 points
    const users = app.users ? app.users.toLowerCase() : '';
    if (users.includes('k') || users.includes('000')) {
      const numbers = users.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const userCount = parseInt(numbers[0]);
        if (users.includes('k')) {
          const actualUsers = userCount * 1000;
          if (actualUsers >= 100000) score += 30;
          else if (actualUsers >= 50000) score += 25;
          else if (actualUsers >= 10000) score += 20;
          else score += 15;
        } else if (userCount >= 10000) {
          score += 20;
        }
      }
    } else {
      const numbers = users.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const userCount = parseInt(numbers[0]);
        if (userCount >= 1000) score += 15;
        else if (userCount >= 100) score += 10;
        else score += 5;
      }
    }

    // Growth rate (YC loves 10% weekly growth) - 30 points
    const growth = app.growth ? app.growth.toLowerCase() : '';
    if (growth.includes('%')) {
      const numbers = growth.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const rate = parseInt(numbers[0]);
        if (growth.includes('week')) {
          if (rate >= 10) score += 30; // 10%+ weekly = exceptional
          else if (rate >= 5) score += 25;
          else score += 20;
        } else if (growth.includes('month')) {
          if (rate >= 20) score += 30; // 20%+ monthly = great
          else if (rate >= 10) score += 25;
          else score += 15;
        } else if (growth.includes('year')) {
          if (rate >= 100) score += 20; // 100%+ YoY = good
          else if (rate >= 50) score += 15;
          else score += 10;
        }
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Y Combinator: Product-Market Fit
   * Do people want what you're building?
   */
  scoreProductMarketFit(app) {
    let score = 0;

    // Problem clarity and depth - 35 points
    const problemLength = app.problem ? app.problem.length : 0;
    const problemQuality = this.assessTextQuality(app.problem);
    if (problemLength >= 200 && problemQuality.specific) {
      score += 35;
    } else if (problemLength >= 100) {
      score += 25;
    } else if (problemLength >= 50) {
      score += 15;
    }

    // Solution clarity and differentiation - 35 points
    const solutionLength = app.solution ? app.solution.length : 0;
    const solutionQuality = this.assessTextQuality(app.solution);
    if (solutionLength >= 200 && solutionQuality.specific) {
      score += 35;
    } else if (solutionLength >= 100) {
      score += 25;
    } else if (solutionLength >= 50) {
      score += 15;
    }

    // Impact articulation - 30 points
    const impactLength = app.impact ? app.impact.length : 0;
    const impactQuality = this.assessTextQuality(app.impact);
    if (impactLength >= 200 && impactQuality.specific) {
      score += 30;
    } else if (impactLength >= 100) {
      score += 20;
    } else if (impactLength >= 50) {
      score += 10;
    }

    return Math.min(score, 100);
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

    // Geographic market - 30 points
    const country = app.country ? app.country.toLowerCase() : 'other';
    const marketData = this.africanMarkets[country] || this.africanMarkets['other'];
    score += marketData.growth * 24; // Scale to 30 points max

    return Math.min(score, 100);
  }

  /**
   * Silicon Valley: Innovation & Disruption
   * Is this a 10x improvement or incremental?
   */
  scoreInnovation(app) {
    let score = 50; // Baseline assumption of some innovation

    // Keywords that signal innovation
    const innovationKeywords = [
      'ai', 'artificial intelligence', 'machine learning', 'blockchain',
      'disrupting', 'revolutionary', 'first', 'unique', 'patent',
      'proprietary', 'breakthrough', 'novel', 'innovative'
    ];

    const text = `${app.problem} ${app.solution} ${app.impact}`.toLowerCase();

    const keywordMatches = innovationKeywords.filter(kw => text.includes(kw)).length;
    score += keywordMatches * 10; // Up to 50 bonus points for innovation signals

    // Deduct for overly generic language
    const genericKeywords = ['we provide', 'we offer', 'platform for', 'service that'];
    const genericMatches = genericKeywords.filter(kw => text.includes(kw)).length;
    score -= genericMatches * 5;

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Harambeans: African Impact
   * Does this solve real African problems at scale?
   */
  scoreAfricanImpact(app) {
    let score = 0;

    // African-specific problem indicators - 40 points
    const africanKeywords = [
      'africa', 'african', 'kenya', 'nigeria', 'ghana', 'rwanda',
      'south africa', 'lagos', 'nairobi', 'accra', 'kigali',
      'sme', 'informal sector', 'financial inclusion', 'unbanked',
      'rural', 'farmers', 'healthcare access', 'education gap'
    ];

    const text = `${app.problem} ${app.solution} ${app.impact} ${app.country}`.toLowerCase();
    const africanMatches = africanKeywords.filter(kw => text.includes(kw)).length;
    score += Math.min(africanMatches * 8, 40);

    // Impact scale - 35 points
    const impactKeywords = [
      'million', 'thousands', 'communities', 'scale', 'mass',
      'underserved', 'marginalized', 'employment', 'jobs'
    ];
    const impactMatches = impactKeywords.filter(kw => text.includes(kw)).length;
    score += Math.min(impactMatches * 7, 35);

    // Local founder advantage - 25 points
    const country = app.country ? app.country.toLowerCase() : '';
    if (africanKeywords.some(kw => country.includes(kw))) {
      score += 25; // Building in Africa = better context
    } else {
      score += 10; // Benefit of doubt
    }

    return Math.min(score, 100);
  }

  /**
   * Harambeans: Sustainability
   * Can this business survive and thrive long-term?
   */
  scoreSustainability(app) {
    let score = 0;

    // Revenue model clarity - 40 points
    const useOfFunds = app.useOfFunds ? app.useOfFunds.toLowerCase() : '';
    const hasRevenue = app.revenue && !app.revenue.toLowerCase().includes('pre-revenue');

    if (hasRevenue) {
      score += 25; // Already making money = sustainable
    }

    if (useOfFunds.length >= 100) {
      score += 15; // Clear plan for funds
    } else if (useOfFunds.length >= 50) {
      score += 10;
    }

    // Runway planning - 30 points
    const runway = app.runway ? app.runway.toLowerCase() : '';
    if (runway.includes('month')) {
      const numbers = runway.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        const months = parseInt(numbers[0]);
        if (months >= 18) score += 30;
        else if (months >= 12) score += 25;
        else if (months >= 6) score += 20;
        else score += 10;
      }
    }

    // Funding amount appropriateness - 30 points
    const fundingAmount = app.fundingAmount ? app.fundingAmount.toLowerCase() : '';
    const numbers = fundingAmount.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      const amount = parseInt(numbers.join(''));
      // $15k is the target - score based on how close they are
      if (amount >= 10000 && amount <= 25000) {
        score += 30; // Right range
      } else if (amount >= 5000 && amount <= 50000) {
        score += 20; // Reasonable
      } else {
        score += 10; // Too high/low but we'll work with it
      }
    }

    return Math.min(score, 100);
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
   * Helper: Assess text quality
   */
  assessTextQuality(text) {
    if (!text) return { specific: false, detailed: false };

    const wordCount = text.split(/\s+/).length;
    const hasNumbers = /\d+/.test(text);
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
