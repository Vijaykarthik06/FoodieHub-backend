const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check - ALWAYS WORKS
app.get('/api/health', (req, res) => {
  console.log('✅ Health check received');
  res.json({ 
    message: 'Server is running perfectly!',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Simple login - ALWAYS WORKS
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt:', req.body);
  
  // Always return success for testing
  res.json({
    message: 'Login successful!',
    user: {
      id: 1,
      name: 'Test User',
      email: req.body.email,
      isAdmin: false
    },
    token: 'demo-token-' + Date.now()
  });
});

// Simple register - ALWAYS WORKS
app.post('/api/auth/register', (req, res) => {
  console.log('📝 Register attempt:', req.body);
  
  res.json({
    message: 'User registered successfully!',
    user: {
      id: 2,
      name: req.body.name,
      email: req.body.email,
      isAdmin: false
    },
    token: 'demo-token-' + Date.now()
  });
});

// Simple orders - ALWAYS WORKS
app.post('/api/orders', (req, res) => {
  console.log('📦 Order received:', req.body);
  
  const order = {
    _id: 'order_' + Date.now(),
    orderNumber: '#' + Math.floor(100000 + Math.random() * 900000),
    ...req.body,
    createdAt: new Date(),
    estimatedDelivery: new Date(Date.now() + 30 * 60000),
    orderStatus: 'confirmed'
  };
  
  res.json({
    success: true,
    message: 'Order created successfully!',
    order: order
  });
});

// Get user orders
app.get('/api/orders/my-orders', (req, res) => {
  console.log('📋 My orders request');
  
  res.json({
    success: true,
    orders: [
      {
        _id: 'demo_order_1',
        orderNumber: '#123456',
        restaurantName: 'Italian Bistro',
        total: 25.99,
        orderStatus: 'delivered',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  });
});

const PORT = 3002;

app.listen(PORT, () => {
  console.log('🚀 SIMPLE SERVER STARTED SUCCESSFULLY!');
  console.log(`📍 Running on: http://localhost:${PORT}`);
  console.log(`🔗 Test here: http://localhost:${PORT}/api/health`);
  console.log('✅ This server will definitely work!');
  console.log('====================================');
});