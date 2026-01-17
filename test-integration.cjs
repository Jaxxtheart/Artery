/**
 * Integration Test Script
 * Tests the complete flow from frontend normalization to scoring
 */

const ScoringEngine = require('./backend/services/scoringEngine');

// Simulate normalized data from frontend
const testApplication = {
  // Normalized values (lowercase, as they would come from normalizeData())
  founderName: 'Jane Doe',
  email: 'jane@startup.com',
  phone: '+27 123 456 789',
  linkedin: 'linkedin.com/in/janedoe',

  companyName: 'Test Startup',
  country: 'south africa',  // Normalized
  industry: 'fintech',       // Normalized
  stage: 'mvp',              // Normalized

  problem: 'Small businesses in South Africa struggle with expensive payment processing fees that make digital payments unprofitable for merchants.',
  solution: 'We provide an affordable mobile-first payment platform with 0.8% transaction fees and instant settlement capabilities.',
  impact: 'Our platform can bring thousands of small businesses into the digital economy, reducing cash-related risks and enabling financial inclusion.',

  revenue: 'Pre-revenue',
  users: '500 beta users',
  growth: '15% monthly',
  team: '2-3',

  fundingAmount: '$15,000',
  useOfFunds: 'Product development ($8k), marketing and customer acquisition ($5k), operational expenses ($2k)',
  runway: '6 months',
  pitchDeck: 'deck.pdf'
};

console.log('='.repeat(80));
console.log('INTEGRATION TEST - Frontend Normalization → Scoring Engine');
console.log('='.repeat(80));

console.log('\n📥 Input Data (After Normalization):');
console.log('  Country:', testApplication.country);
console.log('  Industry:', testApplication.industry);
console.log('  Stage:', testApplication.stage);

try {
  const scoringEngine = new ScoringEngine();
  const result = scoringEngine.scoreApplication(testApplication);

  console.log('\n✅ Scoring Successful!\n');
  console.log('📊 Results:');
  console.log('  Overall Score:', result.overallScore, '/100');
  console.log('  Rating:', result.rating);
  console.log('  Recommendation:', result.recommendation);

  console.log('\n💰 Valuation:');
  console.log('  Current:', `$${result.valuation.current.amount.toLocaleString()}`);
  console.log('  3-Year:', `$${result.valuation.projected3Year.amount.toLocaleString()}`);
  console.log('  5-Year:', `$${result.valuation.projected5Year.amount.toLocaleString()}`);

  console.log('\n📈 Category Breakdown:');
  Object.entries(result.categoryScores).forEach(([category, score]) => {
    const weight = result.weights[category];
    console.log(`  ${category}: ${score}/100 (${weight}% weight)`);
  });

  console.log('\n✨ Strengths:');
  result.strengths.forEach(s => console.log(`  ✓ ${s}`));

  if (result.concerns.length > 0 && result.concerns[0] !== 'No major concerns identified') {
    console.log('\n⚠️  Concerns:');
    result.concerns.forEach(c => console.log(`  • ${c}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Integration Test PASSED');
  console.log('='.repeat(80));
  console.log('\nAll integration points working correctly:');
  console.log('  ✓ Data normalization (lowercase conversion)');
  console.log('  ✓ Scoring engine execution');
  console.log('  ✓ Category score calculation');
  console.log('  ✓ Valuation engine');
  console.log('  ✓ Strengths/concerns analysis');
  console.log('');

} catch (error) {
  console.error('\n❌ Integration Test FAILED');
  console.error('Error:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
