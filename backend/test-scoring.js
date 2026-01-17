/**
 * Test script for the scoring engine
 * Run with: node test-scoring.js
 */

const ScoringEngine = require('./services/scoringEngine');

const scoringEngine = new ScoringEngine();

// Test Case 1: High-performing fintech startup
console.log('\n' + '='.repeat(80));
console.log('TEST CASE 1: High-Performing Nigerian Fintech Startup');
console.log('='.repeat(80));

const testApp1 = {
  founderName: 'Jane Doe',
  email: 'jane@fluttertech.com',
  phone: '+234 812 345 6789',
  linkedin: 'linkedin.com/in/janedoe',

  companyName: 'FlutterTech',
  country: 'Nigeria',
  industry: 'Fintech',
  stage: 'Revenue',

  problem: 'Small businesses in Nigeria struggle to access affordable digital payment solutions. Traditional banks charge exorbitant fees (3-5% per transaction), making it impossible for small merchants to accept digital payments profitably. This excludes millions of informal sector businesses from the digital economy.',
  solution: 'We built a mobile-first payment platform that reduces transaction fees to 0.8% while providing instant settlement. Our proprietary technology uses USSD for offline transactions, making it accessible even in areas with poor internet connectivity. We integrate directly with Nigerian banks and mobile money providers.',
  impact: 'Our platform has the potential to bring 5 million small businesses into the digital payment ecosystem, creating transparency, reducing cash-related crime, and enabling financial inclusion for underserved communities across Nigeria. Each merchant saves an average of $200/month in transaction fees.',

  revenue: '$85,000 monthly recurring revenue',
  users: '15,000 active merchants, 250,000 transactions per month',
  growth: '25% month-over-month growth',
  team: '8-15',

  fundingAmount: '$15,000 (Standard)',
  useOfFunds: 'We will use the $15,000 to expand our merchant acquisition team (2 new sales reps at $3k), enhance our mobile app with offline-first features ($5k development), and launch a pilot program in Lagos suburbs targeting 500 new merchants ($7k for marketing and onboarding incentives).',
  runway: '8 months',
  pitchDeck: 'fluttertech-deck.pdf'
};

const result1 = scoringEngine.scoreApplication(testApp1);

console.log('\n📊 OVERALL SCORE:', result1.overallScore, '/100');
console.log('⭐ RATING:', result1.rating);
console.log('💡 RECOMMENDATION:', result1.recommendation);

console.log('\n📈 CATEGORY SCORES:');
Object.entries(result1.categoryScores).forEach(([category, score]) => {
  const weight = result1.weights[category];
  console.log(`  - ${category}: ${score}/100 (${weight}% weight)`);
});

console.log('\n💰 VALUATION:');
console.log(`  Current: $${result1.valuation.current.amount.toLocaleString()}`);
console.log(`  3-Year:  $${result1.valuation.projected3Year.amount.toLocaleString()}`);
console.log(`  5-Year:  $${result1.valuation.projected5Year.amount.toLocaleString()}`);

console.log('\n✅ STRENGTHS:');
result1.strengths.forEach(s => console.log(`  - ${s}`));

console.log('\n⚠️  CONCERNS:');
result1.concerns.forEach(c => console.log(`  - ${c}`));

console.log('\n📋 NEXT STEPS:');
result1.nextSteps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));

// Test Case 2: Early-stage EdTech startup
console.log('\n\n' + '='.repeat(80));
console.log('TEST CASE 2: Early-Stage Kenyan EdTech Startup');
console.log('='.repeat(80));

const testApp2 = {
  founderName: 'John Smith',
  email: 'john@gmail.com',
  phone: '+254 712 345 678',
  linkedin: '',

  companyName: 'EduLearn Africa',
  country: 'Kenya',
  industry: 'EdTech',
  stage: 'MVP',

  problem: 'Students in rural Kenya lack access to quality educational content and struggle with exam preparation.',
  solution: 'We provide an offline-first mobile app with video lessons and practice questions aligned to the Kenyan curriculum.',
  impact: 'We can help thousands of students in underserved communities improve their exam scores and access better opportunities.',

  revenue: 'Pre-revenue',
  users: '500 students',
  growth: '15% monthly user growth',
  team: '2-3',

  fundingAmount: '$15,000 (Standard)',
  useOfFunds: 'Product development, content creation, and initial marketing to schools in rural areas.',
  runway: '6 months',
  pitchDeck: null
};

const result2 = scoringEngine.scoreApplication(testApp2);

console.log('\n📊 OVERALL SCORE:', result2.overallScore, '/100');
console.log('⭐ RATING:', result2.rating);
console.log('💡 RECOMMENDATION:', result2.recommendation);

console.log('\n📈 CATEGORY SCORES:');
Object.entries(result2.categoryScores).forEach(([category, score]) => {
  const weight = result2.weights[category];
  console.log(`  - ${category}: ${score}/100 (${weight}% weight)`);
});

console.log('\n💰 VALUATION:');
console.log(`  Current: $${result2.valuation.current.amount.toLocaleString()}`);
console.log(`  3-Year:  $${result2.valuation.projected3Year.amount.toLocaleString()}`);
console.log(`  5-Year:  $${result2.valuation.projected5Year.amount.toLocaleString()}`);

console.log('\n✅ STRENGTHS:');
result2.strengths.forEach(s => console.log(`  - ${s}`));

console.log('\n⚠️  CONCERNS:');
result2.concerns.forEach(c => console.log(`  - ${c}`));

console.log('\n📋 NEXT STEPS:');
result2.nextSteps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));

// Summary comparison
console.log('\n\n' + '='.repeat(80));
console.log('COMPARISON SUMMARY');
console.log('='.repeat(80));

console.log('\n| Metric | FlutterTech (Fintech) | EduLearn (EdTech) |');
console.log('|--------|----------------------|-------------------|');
console.log(`| Overall Score | ${result1.overallScore}/100 | ${result2.overallScore}/100 |`);
console.log(`| Rating | ${result1.rating} | ${result2.rating} |`);
console.log(`| Current Valuation | $${(result1.valuation.current.amount / 1000).toFixed(0)}K | $${(result2.valuation.current.amount / 1000).toFixed(0)}K |`);
console.log(`| 5-Year Projection | $${(result1.valuation.projected5Year.amount / 1000000).toFixed(1)}M | $${(result2.valuation.projected5Year.amount / 1000000).toFixed(1)}M |`);

console.log('\n✅ Test completed successfully!\n');
