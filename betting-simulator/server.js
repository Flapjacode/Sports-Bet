// server.js - Backend Proxy Server for Betting Simulator
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.ODDS_API_KEY || '1837d40f7121f88248d0ab4c07d33357';
const API_HOST = 'https://api.the-odds-api.com';

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Betting API Proxy Server Running',
    version: '1.0.0',
    endpoints: {
      sports: '/api/sports',
      odds: '/api/odds/:sport',
      usage: '/api/usage',
      health: '/health'
    }
  });
});

// Health check endpoint (for deployment platforms)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get all sports
app.get('/api/sports', async (req, res) => {
  try {
    const showAll = req.query.all === 'true';
    const url = `${API_HOST}/v4/sports/?apiKey=${API_KEY}${showAll ? '&all=true' : ''}`;
    
    console.log(`📊 Fetching sports... (all: ${showAll})`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Successfully fetched ${data.length} sports`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching sports:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch sports',
      message: error.message 
    });
  }
});

// Get odds for a specific sport
app.get('/api/odds/:sport', async (req, res) => {
  try {
    const { sport } = req.params;
    const regions = req.query.regions || 'us';
    const markets = req.query.markets || 'h2h';
    
    const url = `${API_HOST}/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=${regions}&markets=${markets}`;
    
    console.log(`🎲 Fetching odds for: ${sport}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Log API usage from headers
    const remaining = response.headers.get('x-requests-remaining');
    const used = response.headers.get('x-requests-used');
    console.log(`✅ Fetched ${data.length} games | API Usage - Used: ${used}, Remaining: ${remaining}`);
    
    res.json(data);
  } catch (error) {
    console.error('❌ Error fetching odds:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch odds',
      message: error.message 
    });
  }
});

// Check API usage/quota
app.get('/api/usage', async (req, res) => {
  try {
    const url = `${API_HOST}/v4/sports/?apiKey=${API_KEY}`;
    const response = await fetch(url);
    
    const remaining = response.headers.get('x-requests-remaining');
    const used = response.headers.get('x-requests-used');
    
    console.log(`📈 API Usage Check - Used: ${used}, Remaining: ${remaining}`);
    
    res.json({
      requestsUsed: used || 'N/A',
      requestsRemaining: remaining || 'N/A',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error checking usage:', error.message);
    res.status(500).json({ 
      error: 'Failed to check usage',
      message: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 BETTING API PROXY SERVER                  ║
╠════════════════════════════════════════════════╣
║   Status: ✅ Running                           ║
║   Port: ${PORT}                                    ║
║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
║   Frontend: ${process.env.FRONTEND_URL || 'Any Origin'}               ║
╠════════════════════════════════════════════════╣
║   📊 GET /api/sports                           ║
║   🎲 GET /api/odds/:sport                      ║
║   📈 GET /api/usage                            ║
║   ❤️  GET /health                              ║
╠════════════════════════════════════════════════╣
║   Test: http://localhost:${PORT}/health          ║
╚════════════════════════════════════════════════╝
  `);
});