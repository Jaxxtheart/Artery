# Artery Capital - Application Scoring System

A comprehensive application evaluation system combining Y Combinator, Silicon Valley, and Harambeans principles to score startup applications and generate valuations.

## Features

### Scoring Framework

The system evaluates applications across 7 key dimensions:

#### Y Combinator Principles (53%)
1. **Founder Quality (20%)** - Team credentials, experience, commitment
2. **Traction (18%)** - Revenue, users, growth metrics
3. **Product-Market Fit (15%)** - Problem-solution alignment, market validation

#### Silicon Valley Criteria (27%)
4. **Market Opportunity (15%)** - TAM, scalability, market dynamics
5. **Innovation (12%)** - Disruption potential, differentiation

#### Harambeans Principles (20%)
6. **African Impact (10%)** - Local relevance, scale of impact
7. **Sustainability (10%)** - Long-term viability, business model

### Valuation Engine

Generates three valuation outputs:
- **Current Valuation** - Based on stage, score, industry, and market factors
- **3-Year Projection** - Conservative growth scenario
- **5-Year Projection** - Full potential scenario

Valuation factors:
- Stage-based ranges (Idea: $50k-$200k → Scaling: $1M-$5M)
- Industry multipliers (Fintech: 1.8x, SaaS: 1.7x, HealthTech: 1.6x)
- Score performance (0.5x - 1.5x multiplier)
- African market growth (15-28% annual growth)
- Market stability factors

## Installation

```bash
cd backend
npm install
```

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Default port: `3001`

## API Endpoints

### Submit Application
```http
POST /api/applications/submit
Content-Type: multipart/form-data

{
  founderName, email, phone, linkedin,
  companyName, country, industry, stage,
  problem, solution, impact,
  revenue, users, growth, team,
  fundingAmount, useOfFunds, runway,
  pitchDeck (file)
}
```

**Response:**
```json
{
  "success": true,
  "applicationId": 1,
  "scoring": {
    "overallScore": 76.5,
    "rating": "Strong",
    "categoryScores": {
      "founderQuality": 75,
      "traction": 65,
      "productMarketFit": 80,
      "marketOpportunity": 85,
      "innovation": 70,
      "africanImpact": 90,
      "sustainability": 60
    },
    "valuation": {
      "current": {
        "amount": 450000,
        "currency": "USD"
      },
      "projected3Year": {
        "amount": 2800000,
        "currency": "USD"
      },
      "projected5Year": {
        "amount": 6500000,
        "currency": "USD"
      }
    },
    "recommendation": "Invest - Schedule interview and deeper evaluation",
    "strengths": [...],
    "concerns": [...],
    "nextSteps": [...]
  }
}
```

### Get Application
```http
GET /api/applications/:id
```

### List Applications
```http
GET /api/applications?minScore=70&status=under_review&sortBy=score
```

### Update Decision
```http
POST /api/applications/:id/decision
Content-Type: application/json

{
  "decision": "approved",
  "notes": "Strong team, clear market opportunity"
}
```

### Get Statistics
```http
GET /api/stats
```

### Health Check
```http
GET /api/health
```

## Scoring Criteria Details

### Founder Quality (0-100 points)
- LinkedIn presence (30 pts)
- Professional email (20 pts)
- Team size (30 pts)
- Contact completeness (20 pts)

### Traction (0-100 points)
- Revenue metrics (40 pts)
- User/customer base (30 pts)
- Growth rate (30 pts)

### Product-Market Fit (0-100 points)
- Problem clarity (35 pts)
- Solution quality (35 pts)
- Impact articulation (30 pts)

### Market Opportunity (0-100 points)
- Industry potential (40 pts)
- Stage appropriateness (30 pts)
- Geographic market (30 pts)

### Innovation (0-100 points)
- Innovation signals (50 pts baseline + bonuses)
- Technology keywords (AI, blockchain, etc.)
- Differentiation factors

### African Impact (0-100 points)
- African market focus (40 pts)
- Impact scale (35 pts)
- Local founder advantage (25 pts)

### Sustainability (0-100 points)
- Revenue model (40 pts)
- Runway planning (30 pts)
- Funding appropriateness (30 pts)

## Output Ratings

| Score Range | Rating | Recommendation |
|-------------|--------|----------------|
| 85-100 | Exceptional | Strong Invest - Fast-track for due diligence |
| 75-84 | Strong | Invest - Schedule interview |
| 65-74 | Good | Consider - Request additional info |
| 50-64 | Moderate | Hold - Monitor for improvements |
| 0-49 | Needs Development | Pass - Not aligned with thesis |

## Configuration

Environment variables:
```bash
PORT=3001
NODE_ENV=development
```

## Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Email notifications for applicants
- [ ] Admin dashboard for reviewing applications
- [ ] Batch processing and analytics
- [ ] Integration with CRM systems
- [ ] Automated reference checking
- [ ] Market research data integration
- [ ] ML-based scoring improvements

## Architecture

```
backend/
├── server.js              # Express app and API routes
├── services/
│   └── scoringEngine.js   # Core scoring algorithm
├── uploads/
│   └── pitch-decks/       # Uploaded files
└── package.json
```

## Testing

Example test application:
```bash
curl -X POST http://localhost:3001/api/applications/submit \
  -F "founderName=Jane Doe" \
  -F "email=jane@example.com" \
  -F "companyName=Test Startup" \
  -F "problem=Sample problem statement..." \
  -F "solution=Sample solution..."
```

## License

MIT
