# Artery Capital - Setup Guide

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Git

### Installation

#### 1. Clone the repository
```bash
git clone <repository-url>
cd Artery
```

#### 2. Install Frontend Dependencies
```bash
npm install
```

#### 3. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

#### 4. Configure Environment Variables

**Frontend (.env):**
```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:3001
```

**Backend (backend/.env):**
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
PORT=3001
NODE_ENV=development
```

### Running the Application

#### Option 1: Run Both Services Together

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

#### Option 2: Development Mode

**Backend with auto-reload:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

## Testing the Scoring System

### Quick Test with Test Script

```bash
cd backend
node test-scoring.js
```

This runs two test cases:
1. High-performing Nigerian fintech startup (should score ~84/100)
2. Early-stage Kenyan edtech startup (should score ~58/100)

### Manual API Testing

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/applications/submit \
  -F "founderName=Jane Doe" \
  -F "email=jane@startup.com" \
  -F "phone=+27 123 456 789" \
  -F "linkedin=linkedin.com/in/janedoe" \
  -F "companyName=Tech Startup" \
  -F "country=South Africa" \
  -F "industry=Fintech" \
  -F "stage=MVP" \
  -F "problem=Small businesses struggle with expensive payment processing" \
  -F "solution=We provide affordable mobile payment solutions" \
  -F "impact=We can help millions of small businesses save money" \
  -F "revenue=Pre-revenue" \
  -F "users=1000 beta users" \
  -F "growth=10% monthly" \
  -F "team=2-3" \
  -F "fundingAmount=\$15,000" \
  -F "useOfFunds=Product development and initial marketing campaigns" \
  -F "runway=6 months"
```

**Using the Frontend:**
1. Navigate to http://localhost:5173
2. Click "Apply Now"
3. Fill out the 5-step application form
4. Submit and view your scoring results

## Project Structure

```
Artery/
├── src/                          # Frontend React application
│   ├── main.jsx                 # Entry point
│   ├── App.jsx                  # Router
│   ├── index.css                # Global styles
│   └── pages/
│       ├── Home.jsx             # Landing page
│       └── Application.jsx       # Multi-step application form
├── backend/                      # Backend API
│   ├── server.js                # Express server
│   ├── services/
│   │   └── scoringEngine.js     # Scoring algorithm
│   ├── uploads/                 # File uploads (created on first upload)
│   │   └── pitch-decks/
│   ├── package.json
│   ├── test-scoring.js          # Test script
│   └── README.md                # Backend documentation
├── public/
│   └── logo.svg                 # Logo asset
├── index.html                   # HTML entry point
├── package.json                 # Frontend dependencies
├── vite.config.js              # Vite configuration
├── README.md                    # Main documentation
├── SETUP.md                     # This file
└── SCORING_SYSTEM.md            # Scoring methodology documentation
```

## API Endpoints

### Application Submission
```http
POST /api/applications/submit
Content-Type: multipart/form-data

Returns: Scoring results with valuation
```

### Get Application by ID
```http
GET /api/applications/:id

Returns: Full application with scoring
```

### List Applications (Admin)
```http
GET /api/applications?minScore=70&status=under_review&sortBy=score

Returns: Filtered list of applications
```

### Update Decision (Admin)
```http
POST /api/applications/:id/decision
Content-Type: application/json

Body: { "decision": "approved", "notes": "..." }
```

### Statistics
```http
GET /api/stats

Returns: Application statistics and analytics
```

### Health Check
```http
GET /api/health

Returns: Server status
```

## Scoring System Overview

The application scoring system combines three frameworks:

### 1. Y Combinator Principles (53%)
- **Founder Quality** (20%): Team credentials and commitment
- **Traction** (18%): Revenue, users, growth metrics
- **Product-Market Fit** (15%): Problem-solution alignment

### 2. Silicon Valley Criteria (27%)
- **Market Opportunity** (15%): TAM, scalability
- **Innovation** (12%): Disruption potential

### 3. Harambeans Principles (20%)
- **African Impact** (10%): Local relevance
- **Sustainability** (10%): Long-term viability

### Output
- Overall score (0-100)
- Category breakdown
- Current valuation
- 3-year projected valuation
- 5-year projected valuation
- Strengths and concerns
- Next steps

See `SCORING_SYSTEM.md` for detailed methodology.

## Troubleshooting

### Backend won't start
```bash
# Check if port 3001 is already in use
lsof -i :3001

# Kill the process if needed
kill -9 <PID>

# Or use a different port
PORT=3002 npm start
```

### Frontend can't connect to backend
1. Verify backend is running: `curl http://localhost:3001/api/health`
2. Check `.env` file has correct `VITE_API_URL`
3. Check browser console for CORS errors
4. Restart frontend dev server: `npm run dev`

### File uploads failing
1. Check upload directory exists: `mkdir -p backend/uploads/pitch-decks`
2. Verify file size is under 10MB
3. Ensure file type is PDF or Office document

### Scoring seems incorrect
1. Review input data quality
2. Run test script: `node backend/test-scoring.js`
3. Check `SCORING_SYSTEM.md` for methodology
4. Enable debug logging in `scoringEngine.js`

## Development Tips

### Hot Reload
Both frontend and backend support hot reload in development mode.

### Debugging Backend
Add logging to `backend/services/scoringEngine.js`:
```javascript
console.log('Scoring application:', applicationData);
```

### Testing Different Scenarios
Modify `backend/test-scoring.js` to add new test cases.

### Customizing Scoring Weights
Edit weights in `backend/services/scoringEngine.js`:
```javascript
this.weights = {
  founderQuality: 20,  // Adjust as needed
  traction: 18,
  // ...
};
```

## Production Deployment

### Environment Variables
Set these in production:
```
# Backend
PORT=3001
NODE_ENV=production

# Frontend
VITE_API_URL=https://api.yourdomain.com
```

### Build Frontend
```bash
npm run build
# Outputs to /dist
```

### Serve Backend
```bash
cd backend
npm start
```

### Database Integration (Future)
Replace in-memory storage in `backend/server.js`:
```javascript
// Replace this:
const applications = [];

// With database connection:
const Application = require('./models/Application');
```

### Security Checklist
- [ ] Enable HTTPS
- [ ] Set up CORS properly
- [ ] Add rate limiting
- [ ] Implement authentication for admin endpoints
- [ ] Secure file upload validation
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure environment variables properly
- [ ] Set up database backups

## Support

For issues or questions:
1. Check this setup guide
2. Review `SCORING_SYSTEM.md` for methodology questions
3. Check `backend/README.md` for API documentation
4. Open an issue on GitHub

## License

MIT
