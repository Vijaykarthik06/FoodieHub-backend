require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ✅ CRITICAL: Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://foodiehub-backend-fkz3.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// ✅ Handle preflight requests for ALL routes
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vijaykarthik2512_db_user:CYEcMmos6Bf7rZgi@foodiehub.pkan7is.mongodb.net/?appName=Foodiehub';

console.log('🔄 Attempting MongoDB connection...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ MongoDB Connected Successfully");
})
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err.message);
});

// ✅ IMPORTANT: Test route that everyone can access
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    cors: 'CORS is configured',
    allowedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'https://foodiehub-backend-fkz3.onrender.com']
  });
});

// ✅ Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusText = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  }[dbStatus] || 'Unknown';
  
  res.json({ 
    success: true,
    message: 'FoodieHub API Server',
    status: {
      server: 'Running',
      database: dbStatusText,
      databaseCode: dbStatus
    },
    cors: 'Enabled',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ Load routes
try {
  console.log('🔄 Loading routes...');
  
  // Auth routes
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
  
  // Other routes (optional)
  try {
    const orderRoutes = require('./routes/orderRoutes');
    app.use('/api/orders', orderRoutes);
    console.log('✅ Order routes loaded');
  } catch (e) {
    console.log('⚠️ Order routes not available');
  }
  
  try {
    const restaurantRoutes = require('./routes/restaurantRoutes');
    app.use('/api/restaurants', restaurantRoutes);
    console.log('✅ Restaurant routes loaded');
  } catch (e) {
    console.log('⚠️ Restaurant routes not available');
  }
  
  try {
    const productRoutes = require('./routes/productRoutes');
    app.use('/api/products', productRoutes);
    console.log('✅ Product routes loaded');
  } catch (e) {
    console.log('⚠️ Product routes not available');
  }
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
}

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FoodieHub API Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        me: 'GET /api/auth/me'
      }
    },
    cors: 'Enabled for localhost:3000 and localhost:3001'
  });
});

// ✅ 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/me'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n🍔 ======= FoodieHub Backend Server =======');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Render URL: https://foodiehub-75a6.onrender.com`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Test: http://localhost:${PORT}/api/test`);
  console.log(`🎯 CORS Enabled for: localhost:3000, localhost:3001`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('==========================================\n');
});