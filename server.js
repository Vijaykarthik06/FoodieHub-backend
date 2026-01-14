// server.js - MINIMAL WORKING VERSION
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// ✅ CRITICAL: CORS configuration that actually works
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// ✅ Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 FoodieHub Backend API is LIVE!',
    timestamp: new Date().toISOString(),
    cors: 'Enabled for all origins',
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        me: 'GET /api/auth/me'
      }
    }
  });
});

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Server is healthy!',
    status: 'running',
    cors: 'enabled',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Test endpoint working!',
    cors: 'CORS is properly configured',
    timestamp: new Date().toISOString()
  });
});

// ✅ SIMPLE AUTH ROUTES - NO DATABASE NEEDED
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body);
    
    const { email, password } = req.body;
    
    // Simple validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Mock successful login
    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: 'user_123',
        name: 'Test User',
        email: email,
        isAdmin: false
      },
      token: 'mock_jwt_token_' + Date.now()
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    console.log('📝 Registration attempt:', req.body);
    
    const { name, email, password } = req.body;
    
    // Simple validation
    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters'
      });
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address'
      });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Mock successful registration
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: {
        id: 'user_' + Date.now(),
        name: name,
        email: email,
        isAdmin: false
      },
      token: 'mock_jwt_token_' + Date.now()
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    // Mock user data
    res.json({
      success: true,
      user: {
        id: 'user_123',
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: false
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ✅ Auth test endpoint
app.get('/api/auth/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// ✅ 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test',
      'GET /api/auth/test',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/me'
    ]
  });
});

// ✅ Error handler
app.use((error, req, res, next) => {
  console.error('🚨 Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log('\n🚀 ======= FoodieHub Backend =======');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`✅ CORS: Enabled for ALL origins`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Test: http://localhost:${PORT}/api/test`);
  console.log(`🔗 Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`🔗 Register: POST http://localhost:${PORT}/api/auth/register`);
  console.log('====================================\n');
});