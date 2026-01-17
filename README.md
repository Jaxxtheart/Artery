# Artery Capital

A modern, comprehensive investment platform for African startups with AI-powered application scoring and valuation.

## Features

- **Home Page**: Showcases Artery Capital's mission, services, and investment focus
- **Application Portal**: Complete 5-step application form for startup funding
- **AI-Powered Scoring**: Instant evaluation using Y Combinator, Silicon Valley, and Harambeans criteria
- **Valuation Engine**: Automated current and projected (3-5 year) startup valuations
- **Responsive Design**: Mobile-friendly and works across all devices
- **Modern UI**: Built with React and styled with custom CSS
- **Real-time Feedback**: Applicants receive instant scoring and next steps

## Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + Custom CSS

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **File Uploads**: Multer
- **Scoring Engine**: Custom JavaScript algorithm

## Application Scoring System

The platform features a sophisticated scoring system that evaluates startup applications across 7 key dimensions:

### Evaluation Framework

**Y Combinator Principles (53%)**
- Founder Quality (20%) - Team credentials and commitment
- Traction (18%) - Revenue, users, growth metrics
- Product-Market Fit (15%) - Problem-solution alignment

**Silicon Valley Criteria (27%)**
- Market Opportunity (15%) - TAM, scalability, market dynamics
- Innovation (12%) - Disruption potential and differentiation

**Harambeans Principles (20%)**
- African Impact (10%) - Local relevance and scale
- Sustainability (10%) - Business model and long-term viability

### Output

Each application receives:
- **Overall Score**: 0-100 with rating (Exceptional/Strong/Good/Moderate/Needs Development)
- **Category Breakdown**: Individual scores for all 7 dimensions
- **Current Valuation**: Stage and score-based valuation in USD
- **3-Year Projection**: Conservative growth scenario
- **5-Year Projection**: Full potential scenario
- **Strengths & Concerns**: AI-generated analysis
- **Next Steps**: Customized action items

For detailed methodology, see [SCORING_SYSTEM.md](SCORING_SYSTEM.md)

## Getting Started

For detailed setup instructions, see [SETUP.md](SETUP.md)

### Prerequisites

- Node.js 16+ installed
- npm package manager

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/Jaxxtheart/Artery.git
cd Artery
```

2. **Install frontend dependencies:**
```bash
npm install
```

3. **Install backend dependencies:**
```bash
cd backend
npm install
cd ..
```

4. **Configure environment variables:**
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

5. **Start the backend (Terminal 1):**
```bash
cd backend
npm start
```

6. **Start the frontend (Terminal 2):**
```bash
npm run dev
```

7. **Access the application:**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

### Test the Scoring System

```bash
cd backend
node test-scoring.js
```

This runs test cases showing how the scoring system evaluates different startup profiles.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build locally

## Project Structure

```
Artery/
├── src/                           # Frontend React application
│   ├── pages/
│   │   ├── Home.jsx              # Landing page
│   │   └── Application.jsx        # Multi-step application form with scoring display
│   ├── App.jsx                   # Router configuration
│   ├── index.css                 # Global styles
│   └── main.jsx                  # React entry point
├── backend/                       # Backend API server
│   ├── services/
│   │   └── scoringEngine.js      # AI scoring algorithm (700+ lines)
│   ├── uploads/                  # File upload storage
│   │   └── pitch-decks/
│   ├── server.js                 # Express API server
│   ├── test-scoring.js           # Test script for scoring engine
│   ├── package.json              # Backend dependencies
│   └── README.md                 # Backend documentation
├── public/
│   └── logo.svg                  # Artery Capital logo
├── index.html                    # HTML entry point
├── package.json                  # Frontend dependencies
├── vite.config.js               # Vite configuration
├── .env.example                 # Frontend environment template
├── README.md                     # This file
├── SETUP.md                      # Detailed setup instructions
└── SCORING_SYSTEM.md             # Complete scoring methodology (300+ lines)
```

## Deployment

### Deploy to Vercel (Recommended)

The application is optimized for Vercel with both frontend and serverless API functions.

**Quick Deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Jaxxtheart/Artery)

**Manual Deployment:**

1. **Connect Repository**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Framework: Vite (auto-detected)

2. **Configure**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables: Leave `VITE_API_URL` empty (uses relative URLs)

3. **Deploy**:
   - Click "Deploy"
   - App will be live at `https://your-app.vercel.app`

**Vercel CLI:**

```bash
# Install CLI
npm install -g vercel

# Deploy to production
vercel --prod
```

**Features on Vercel**:
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Serverless API functions
- ✅ Continuous deployment from Git
- ✅ Preview deployments for PRs

For detailed deployment guide, see [DEPLOYMENT.md](DEPLOYMENT.md)

### Local Production Build

```bash
# Build frontend
npm run build

# Preview production build
npm run preview

# Test with backend (separate terminal)
cd backend && npm start
```

## Customization

### Updating Colors

Colors are defined as CSS variables in `src/index.css`:

```css
:root {
  --primary-color: #4F46E5;
  --secondary-color: #7C3AED;
  --text-color: #1F2937;
  --bg-color: #F9FAFB;
  --white: #FFFFFF;
}
```

### Modifying Content

- **Home Page**: Edit `src/pages/Home.jsx`
- **Application Form**: Edit `src/pages/Application.jsx`
- **Navigation**: Edit `src/App.jsx`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Copyright © 2026 Artery Capital. All rights reserved.
