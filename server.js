/**
 * Local Development Server
 * Runs API endpoints locally for development
 *
 * Usage: npm run server (in a separate terminal from npm run dev)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load environment variables from .env.local if it exists
try {
  const dotenv = require('dotenv');
  const envPath = path.join(__dirname, '.env.local');
  dotenv.config({ path: envPath });
  console.log('✅ Loaded environment variables from .env.local');
} catch (error) {
  console.log('⚠️  No .env.local file found. Using system environment variables.');
}

// Import API handlers - Applications
const submitHandler = require('./api/applications/submit.js');
const listHandler = require('./api/applications/list.js');
const getHandler = require('./api/applications/get.js');

// Import API handlers - Trading
const portfolioHandler = require('./api/coinbase/portfolio.js');
const pricesHandler = require('./api/coinbase/prices.js');
const ordersHandler = require('./api/coinbase/orders.js');
const costBasisHandler = require('./api/coinbase/cost-basis.js');
const holdingsCostBasisHandler = require('./api/holdings/cost-basis.js');
const signalsHandler = require('./api/trading/signals.js');
const statusHandler = require('./api/trading/status.js');
const executeHandler = require('./api/trading/execute.js');
const positionsHandler = require('./api/trading/positions.js');
const testConnectionHandler = require('./api/trading/test-connection.js');
const testOrderHandler = require('./api/trading/test-order.js');
const dailyTradeHandler = require('./api/cron/daily-trade.js');
const emailReportHandler = require('./api/email/daily-report.js');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Artery Capital API is running',
    timestamp: new Date().toISOString(),
    environment: {
      supabase: !!process.env.SUPABASE_URL,
      resend: !!process.env.RESEND_API_KEY,
      admin: !!process.env.ADMIN_PASSWORD,
      coinbase: !!process.env.COINBASE_API_KEY,
      cron: !!process.env.CRON_SECRET
    }
  });
});

// Application submission endpoint
app.post('/api/applications/submit', async (req, res) => {
  try {
    await submitHandler(req, res);
  } catch (error) {
    console.error('Submit handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// List applications endpoint (admin)
app.get('/api/applications/list', async (req, res) => {
  try {
    await listHandler(req, res);
  } catch (error) {
    console.error('List handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get single application endpoint (admin)
app.get('/api/applications/get', async (req, res) => {
  try {
    await getHandler(req, res);
  } catch (error) {
    console.error('Get handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// ============================================================
// Trading API Routes
// ============================================================

function wrapHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`Handler error [${req.path}]:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

// Coinbase routes
app.get('/api/coinbase/portfolio', wrapHandler(portfolioHandler));
app.get('/api/coinbase/prices', wrapHandler(pricesHandler));
app.all('/api/coinbase/orders', wrapHandler(ordersHandler));
app.get('/api/coinbase/cost-basis', wrapHandler(costBasisHandler));
app.all('/api/holdings/cost-basis', wrapHandler(holdingsCostBasisHandler));

// Trading routes
app.get('/api/trading/signals', wrapHandler(signalsHandler));
app.get('/api/trading/status', wrapHandler(statusHandler));
app.post('/api/trading/execute', wrapHandler(executeHandler));
app.all('/api/trading/positions', wrapHandler(positionsHandler));
app.get('/api/trading/test-connection', wrapHandler(testConnectionHandler));
app.post('/api/trading/test-order', wrapHandler(testOrderHandler));

// Cron route
app.all('/api/cron/daily-trade', wrapHandler(dailyTradeHandler));

// Email route
app.post('/api/email/daily-report', wrapHandler(emailReportHandler));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Artery Capital - Development Server                ║
╚════════════════════════════════════════════════════════════╝

🚀 Server running on: http://localhost:${PORT}

📡 Application Endpoints:
   GET  /api/health                   - Health check
   POST /api/applications/submit      - Submit application
   GET  /api/applications/list        - List applications (admin)
   GET  /api/applications/get?id=...  - Get application (admin)

📈 Trading Endpoints:
   GET  /api/trading/status           - Portfolio & positions
   GET  /api/trading/signals          - Generate trading signals
   POST /api/trading/execute          - Execute a trade (auth required)
   GET  /api/trading/positions        - List open positions
   DELETE /api/trading/positions      - Close a position (auth required)
   GET  /api/coinbase/portfolio       - Live Coinbase portfolio
   GET  /api/coinbase/prices          - Asset prices
   GET  /api/cron/daily-trade         - Run trading cycle (auth required)
   POST /api/email/daily-report       - Send email report (auth required)

🔧 Environment:
   Supabase:  ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}
   Coinbase:  ${process.env.COINBASE_API_KEY ? '✅ Configured' : '❌ Not configured'}
   Resend:    ${process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Not configured'}
   Admin:     ${process.env.ADMIN_PASSWORD ? '✅ Configured' : '❌ Not configured'}
   Cron:      ${process.env.CRON_SECRET ? '✅ Configured' : '❌ Not configured'}

ℹ️  Frontend: Run "npm run dev" in another terminal
   Dashboard: http://localhost:5173/trading

⚠️  Note: Set VITE_API_URL=http://localhost:${PORT} in .env.local
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
