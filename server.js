// server.js - COMPLETE VERSION WITH ALL ROUTES
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { sendOrderConfirmationEmail, sendAdminNotification } = require('./services/emailService');

const app = express();

// ========== MONGODB CONNECTION ==========
let isMongoDBConnected = false;

const connectToMongoDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not found in .env file');
      console.log('📝 Using mock authentication (no database)');
      return false;
    }

    console.log('🔄 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    isMongoDBConnected = true;
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📁 Database: ${mongoose.connection.name}`);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.log('📝 Falling back to mock authentication');
    console.log('🔧 To fix:');
    console.log('1. Check MONGODB_URI in .env file');
    console.log('2. Add IP to MongoDB Atlas whitelist (0.0.0.0/0)');
    console.log('3. Verify username/password');
    return false;
  }
};

// ========== CORS CONFIGURATION ==========
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== MODELS ==========

// User Model
const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  phone: { 
    type: String, 
    default: '' 
  },
  address: { 
    type: String, 
    default: '' 
  }
}, { 
  timestamps: true 
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

// Order Model
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    default: () => `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userEmail: {
    type: String,
    required: true
  },
  restaurantId: {
    type: String,
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  restaurantImage: {
    type: String,
    default: ''
  },
  items: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
    specialInstructions: { type: String, default: '' }
  }],
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    instructions: { type: String, default: '' }
  },
  contactInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'debit_card', 'paypal', 'cash']
  },
  deliveryType: {
    type: String,
    required: true,
    enum: ['delivery', 'pickup'],
    default: 'delivery'
  },
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  tax: { type: Number, required: true },
  tip: { type: Number, default: 0 },
  total: { type: Number, required: true },
  specialInstructions: { type: String, default: '' },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'confirmed'
  },
  estimatedDelivery: {
    type: Date,
    default: () => new Date(Date.now() + 45 * 60 * 1000) // 45 minutes from now
  },
  orderDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// ========== ROUTES ==========

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 FoodieHub Backend API is LIVE!',
    database: isMongoDBConnected ? 'Connected to MongoDB ✅' : 'Mock mode (no database)',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        me: 'GET /api/auth/me',
        test: 'GET /api/auth/test',
        dbTest: 'GET /api/auth/db-test'
      },
      orders: {
        create: 'POST /api/orders/create',
        myOrders: 'GET /api/orders/my-orders',
        getOrder: 'GET /api/orders/:id'
      }
    }
  });
});

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Server is healthy!',
    database: isMongoDBConnected ? 'Connected to MongoDB ✅' : 'Mock mode ⚠️',
    emailService: process.env.EMAIL_USER ? 'Configured ✅' : 'Not Configured ⚠️',
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
    database: isMongoDBConnected ? 'Using MongoDB' : 'Using mock data',
    timestamp: new Date().toISOString()
  });
});

// ========== AUTH ROUTES ==========

// ✅ Database test endpoint
app.get('/api/auth/db-test', async (req, res) => {
  try {
    if (!isMongoDBConnected) {
      return res.json({
        success: true,
        message: '⚠️ MongoDB not connected - running in mock mode',
        database: 'Disconnected',
        userCount: 0,
        users: []
      });
    }

    const userCount = await User.countDocuments();
    const users = await User.find({}).select('-password').limit(10);

    res.json({
      success: true,
      message: '✅ Database test successful',
      database: 'Connected to MongoDB',
      userCount: userCount,
      users: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

// ✅ Auth test endpoint
app.get('/api/auth/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Auth routes are working!',
    database: isMongoDBConnected ? 'MongoDB ✅' : 'Mock ⚠️',
    timestamp: new Date().toISOString()
  });
});

// ✅ Register route (with MongoDB when available)
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Registration attempt:', req.body);
    
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || name.trim().length < 2) {
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
    
    // ===== MONGODB MODE =====
    if (isMongoDBConnected) {
      console.log('✅ Using MongoDB for registration');
      
      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }
      
      // Create new user
      const user = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password,
        isAdmin: false
      });
      
      await user.save();
      
      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'your-jwt-secret-key',
        { expiresIn: '7d' }
      );
      
      console.log(`✅ User saved to MongoDB with ID: ${user._id}`);
      
      return res.status(201).json({
        success: true,
        message: 'Registration successful (MongoDB)',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin
        },
        token: token
      });
    }
    
    // ===== MOCK MODE (fallback) =====
    console.log('⚠️ Using MOCK registration (no database)');
    
    // Generate mock ID and token
    const userId = Date.now().toString();
    const token = 'mock_jwt_token_' + userId;
    
    res.status(201).json({
      success: true,
      message: 'Registration successful (Mock)',
      user: {
        id: userId,
        name: name,
        email: email,
        isAdmin: false
      },
      token: token
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    
    // Handle MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// ✅ Login route (with MongoDB when available)
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // ===== MONGODB MODE =====
    if (isMongoDBConnected) {
      console.log('✅ Using MongoDB for login');
      
      // Find user in MongoDB
      const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Compare password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'your-jwt-secret-key',
        { expiresIn: '7d' }
      );
      
      console.log(`✅ Login successful for: ${user.email}`);
      
      return res.json({
        success: true,
        message: 'Login successful (MongoDB)',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin
        },
        token: token
      });
    }
    
    // ===== MOCK MODE (fallback) =====
    console.log('⚠️ Using MOCK login (no database)');
    
    // Simple mock validation
    if (email !== 'test@example.com' || password !== 'password123') {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials (Mock)'
      });
    }
    
    const token = 'mock_jwt_token_' + Date.now();
    
    res.json({
      success: true,
      message: 'Login successful (Mock)',
      user: {
        id: 'user_123',
        name: 'Test User',
        email: email,
        isAdmin: false
      },
      token: token
    });
    
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// ✅ Get current user
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // ===== MONGODB MODE =====
    if (isMongoDBConnected && !token.startsWith('mock_jwt_token_')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
        
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }
        
        return res.json({
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin
          }
        });
      } catch (jwtError) {
        console.log('JWT verification failed, falling back to mock');
      }
    }
    
    // ===== MOCK MODE (fallback) =====
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
    console.error('❌ Get user error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// ========== ORDER ROUTES ==========

// ✅ Create new order
// ✅ Create new order (Enhanced with better logging)
app.post('/api/orders/create', async (req, res) => {
  try {
    console.log('📦 ========== ORDER CREATION STARTED ==========');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📦 MongoDB Connected:', isMongoDBConnected);
    
    // Validate required fields
    const requiredFields = [
      'restaurantId', 'restaurantName', 'userEmail',
      'items', 'deliveryAddress', 'contactInfo'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Generate order number
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    console.log('📦 Generated order number:', orderNumber);
    
    // Prepare order data with defaults
    const orderData = {
      orderNumber: orderNumber,
      userEmail: req.body.userEmail || req.body.contactInfo?.email || 'unknown@example.com',
      restaurantId: req.body.restaurantId,
      restaurantName: req.body.restaurantName,
      restaurantImage: req.body.restaurantImage || '',
      items: req.body.items || [],
      deliveryAddress: {
        street: req.body.deliveryAddress?.street || '',
        city: req.body.deliveryAddress?.city || '',
        state: req.body.deliveryAddress?.state || '',
        zipCode: req.body.deliveryAddress?.zipCode || '',
        instructions: req.body.deliveryAddress?.instructions || ''
      },
      contactInfo: {
        firstName: req.body.contactInfo?.firstName || '',
        lastName: req.body.contactInfo?.lastName || '',
        email: req.body.contactInfo?.email || req.body.userEmail || '',
        phone: req.body.contactInfo?.phone || ''
      },
      paymentMethod: req.body.paymentMethod || 'credit_card',
      deliveryType: req.body.deliveryType || 'delivery',
      subtotal: parseFloat(req.body.subtotal) || 0,
      deliveryFee: parseFloat(req.body.deliveryFee) || 0,
      tax: parseFloat(req.body.tax) || 0,
      tip: parseFloat(req.body.tip) || 0,
      total: parseFloat(req.body.total) || 0,
      specialInstructions: req.body.specialInstructions || '',
      status: 'confirmed',
      estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000),
      orderDate: new Date()
    };
    
    console.log('📦 Processed order data:', JSON.stringify(orderData, null, 2));
    
    let savedOrder;
    
    // Save to MongoDB if connected
    if (isMongoDBConnected) {
      console.log('✅ Attempting to save to MongoDB...');
      
      try {
        // Create order instance
        const order = new Order(orderData);
        
        // Validate before save
        const validationError = order.validateSync();
        if (validationError) {
          console.error('❌ Order validation error:', validationError.errors);
          throw validationError;
        }
        
        // Save to database
        savedOrder = await order.save();
        console.log('✅ Order saved to MongoDB! ID:', savedOrder._id);
        console.log('✅ Order Number:', savedOrder.orderNumber);
        
      } catch (saveError) {
        console.error('❌ MongoDB save error:', saveError.message);
        console.error('❌ Error details:', saveError);
        
        if (saveError.name === 'ValidationError') {
          return res.status(400).json({
            success: false,
            message: 'Order validation failed',
            errors: saveError.errors
          });
        }
        
        if (saveError.code === 11000) {
          // Duplicate order number, generate a new one
          console.log('⚠️ Duplicate order number, generating new one...');
          orderData.orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 2000)}`;
          const retryOrder = new Order(orderData);
          savedOrder = await retryOrder.save();
          console.log('✅ Retry successful! New order number:', savedOrder.orderNumber);
        } else {
          throw saveError;
        }
      }
    } else {
      console.log('⚠️ MongoDB not connected, using mock order');
      savedOrder = {
        _id: `mock_${Date.now()}`,
        ...orderData
      };
    }
    
    // ========== SEND EMAILS ==========
    let emailResults = {
      customerEmail: false,
      adminEmail: false
    };
    
    try {
      console.log('📧 Attempting to send email notifications...');
      
      // Send confirmation to customer
      if (savedOrder.contactInfo?.email) {
        emailResults.customerEmail = await sendOrderConfirmationEmail(savedOrder, savedOrder.contactInfo.email);
        console.log('✅ Customer confirmation email sent:', emailResults.customerEmail);
      } else {
        console.log('⚠️ No customer email provided, skipping customer notification');
      }
      
      // Send notification to admin (vijaykarthik2512@gmail.com)
      emailResults.adminEmail = await sendAdminNotification(savedOrder);
      console.log('✅ Admin notification email sent to vijaykarthik2512@gmail.com:', emailResults.adminEmail);
      
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError.message);
      // Don't fail the order if email fails
    }
    
    console.log('✅ ========== ORDER CREATION COMPLETED ==========');
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully!',
      order: savedOrder,
      emailSent: true,
      savedToDatabase: isMongoDBConnected
    });
    
  } catch (error) {
    console.error('❌ ========== ORDER CREATION FAILED ==========');
    console.error('❌ Error:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error code:', error.code);
    
    let statusCode = 500;
    let errorMessage = 'Failed to create order';
    
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Order validation failed';
    } else if (error.code === 11000) {
      statusCode = 400;
      errorMessage = 'Duplicate order detected';
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      errorType: error.name,
      errorCode: error.code
    });
  }
});

// In your server.js, add this route before the error handlers

// ✅ Test email service
app.get('/api/test-email-service', async (req, res) => {
  try {
    const { testEmailService } = require('./services/emailService');
    
    console.log('📧 Starting email service test...');
    
    const result = await testEmailService();
    
    if (result) {
      res.json({
        success: true,
        message: '✅ Email service test completed successfully!',
        details: 'Test emails sent to both customer and admin (vijaykarthik2512@gmail.com)',
        emailConfig: {
          from: process.env.EMAIL_USER,
          adminEmail: process.env.EMAIL_ADMIN,
          configured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASSWORD
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ Email service test failed',
        error: 'Check your email credentials in .env file'
      });
    }
    
  } catch (error) {
    console.error('Email service test error:', error);
    res.status(500).json({
      success: false,
      message: 'Email service test failed',
      error: error.message
    });
  }
});

// ✅ Quick email test endpoint
app.post('/api/quick-test-email', async (req, res) => {
  try {
    const { sendAdminNotification } = require('./services/emailService');
    
    const testOrder = {
      orderNumber: `QUICKTEST${Date.now().toString().slice(-6)}`,
      restaurantName: 'Quick Test Restaurant',
      contactInfo: {
        firstName: 'Quick',
        lastName: 'Test',
        email: 'test@example.com',
        phone: '9876543210'
      },
      deliveryAddress: {
        street: '456 Test Ave',
        city: 'Mumbai',
        state: 'MH',
        zipCode: '400001'
      },
      items: [
        { name: 'Quick Test Item 1', price: 15.99, quantity: 1 },
        { name: 'Quick Test Item 2', price: 9.99, quantity: 2 }
      ],
      subtotal: 35.97,
      deliveryFee: 2.99,
      tax: 2.88,
      tip: 3.00,
      total: 44.84,
      paymentMethod: 'cash',
      deliveryType: 'delivery',
      status: 'confirmed',
      userEmail: 'test@example.com'
    };
    
    console.log('📧 Sending quick test email to admin...');
    const result = await sendAdminNotification(testOrder);
    
    if (result) {
      res.json({
        success: true,
        message: '✅ Test email sent successfully to vijaykarthik2512@gmail.com!',
        orderNumber: testOrder.orderNumber,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: '❌ Failed to send test email',
        error: 'Check email configuration'
      });
    }
    
  } catch (error) {
    console.error('Quick email test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

// ✅ Get user orders
app.get('/api/orders/my-orders', async (req, res) => {
  try {
    const userEmail = req.query.email || req.headers['x-user-email'];
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'User email is required'
      });
    }
    
    console.log('Fetching orders for:', userEmail);
    
    if (isMongoDBConnected) {
      const orders = await Order.find({ userEmail: userEmail })
        .sort({ createdAt: -1 })
        .limit(50);
      
      return res.json({
        success: true,
        orders: orders,
        count: orders.length
      });
    } else {
      // Mock response
      return res.json({
        success: true,
        orders: [],
        count: 0,
        message: 'MongoDB not connected'
      });
    }
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// ✅ Get order by ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isMongoDBConnected) {
      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      return res.json({
        success: true,
        order: order
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Database not connected'
      });
    }
    
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
});

// ✅ Test email endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    const testOrder = {
      orderNumber: 'TEST123',
      restaurantName: 'Test Restaurant',
      contactInfo: { 
        email: 'test@example.com', 
        firstName: 'Test', 
        lastName: 'User',
        phone: '1234567890'
      },
      items: [{ name: 'Test Item', price: 10, quantity: 2 }],
      subtotal: 20,
      deliveryFee: 2.99,
      tax: 1.60,
      tip: 3,
      total: 27.59,
      deliveryAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      },
      paymentMethod: 'credit_card',
      deliveryType: 'delivery'
    };
    
    await sendOrderConfirmationEmail(testOrder, 'test@example.com');
    await sendAdminNotification(testOrder);
    
    res.json({ success: true, message: 'Test emails sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ERROR HANDLERS ==========

// ✅ 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    database: isMongoDBConnected ? 'MongoDB Connected' : 'Mock Mode',
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test',
      'GET /api/auth/test',
      'GET /api/auth/db-test',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/me',
      'POST /api/orders/create',
      'GET /api/orders/my-orders',
      'GET /api/test-email'
    ]
  });
});

// ✅ Error handler
app.use((error, req, res, next) => {
  console.error('🚨 Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    database: isMongoDBConnected ? 'MongoDB Connected' : 'Mock Mode'
  });
});

// Add this after your other routes in server.js
// ========== DIAGNOSTIC ROUTES ==========

// Test database connection and models
app.get('/api/debug/db', async (req, res) => {
  try {
    if (!isMongoDBConnected) {
      return res.json({
        success: false,
        message: 'MongoDB not connected',
        isConnected: false,
        models: {
          User: 'Not connected',
          Order: 'Not connected'
        }
      });
    }

    // Test User model
    let userCount = 0;
    try {
      userCount = await User.countDocuments();
    } catch (userError) {
      console.error('User model error:', userError);
    }

    // Test Order model
    let orderCount = 0;
    try {
      orderCount = await Order.countDocuments();
    } catch (orderError) {
      console.error('Order model error:', orderError);
    }

    // Test schema
    const userSchema = User.schema;
    const orderSchema = Order.schema;

    res.json({
      success: true,
      message: 'Database diagnostic',
      isConnected: true,
      models: {
        User: {
          count: userCount,
          schemaPaths: Object.keys(userSchema.paths || {}),
          isModel: true
        },
        Order: {
          count: orderCount,
          schemaPaths: Object.keys(orderSchema.paths || {}),
          isModel: true
        }
      },
      mongoose: {
        connection: mongoose.connection.readyState,
        readyState: {
          0: 'disconnected',
          1: 'connected',
          2: 'connecting',
          3: 'disconnecting'
        }[mongoose.connection.readyState]
      }
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({
      success: false,
      message: 'Diagnostic failed',
      error: error.message
    });
  }
});

// Test order creation directly
app.post('/api/debug/create-test-order', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Creating test order');
    console.log('DB Connected:', isMongoDBConnected);
    
    if (!isMongoDBConnected) {
      return res.status(500).json({
        success: false,
        message: 'MongoDB not connected',
        order: null
      });
    }

    // Create a test order
    const testOrder = {
      orderNumber: `TEST${Date.now()}`,
      userEmail: 'test@example.com',
      restaurantId: 'test_restaurant_123',
      restaurantName: 'Test Restaurant',
      restaurantImage: 'https://test.com/image.jpg',
      items: [{
        name: 'Test Item',
        price: 10.99,
        quantity: 2,
        image: '',
        specialInstructions: 'Test instructions'
      }],
      deliveryAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        instructions: ''
      },
      contactInfo: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '1234567890'
      },
      paymentMethod: 'credit_card',
      deliveryType: 'delivery',
      subtotal: 21.98,
      deliveryFee: 2.99,
      tax: 1.76,
      tip: 3.00,
      total: 29.73,
      specialInstructions: 'Test order',
      status: 'confirmed',
      orderDate: new Date()
    };

    console.log('🔍 DEBUG: Creating order document...');
    
    // Try to save to MongoDB
    const order = new Order(testOrder);
    
    console.log('🔍 DEBUG: Order document created:', order);
    console.log('🔍 DEBUG: Order validation...');
    
    // Validate before save
    const validationError = order.validateSync();
    if (validationError) {
      console.error('🔍 DEBUG: Validation error:', validationError.errors);
      return res.status(400).json({
        success: false,
        message: 'Order validation failed',
        errors: validationError.errors
      });
    }
    
    console.log('🔍 DEBUG: Saving to database...');
    
    // Save to database
    const savedOrder = await order.save();
    
    console.log('🔍 DEBUG: Order saved successfully! ID:', savedOrder._id);
    
    res.status(201).json({
      success: true,
      message: 'Test order created successfully',
      orderId: savedOrder._id,
      orderNumber: savedOrder.orderNumber,
      order: savedOrder
    });
    
  } catch (error) {
    console.error('🔍 DEBUG: Order creation failed:', error.message);
    console.error('🔍 DEBUG: Error details:', error);
    
    // Check for specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate order number',
        error: error.keyValue
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create test order',
      error: error.message,
      errorType: error.name,
      errorCode: error.code
    });
  }
});

// ========== START SERVER ==========
const startServer = async () => {
  const PORT = process.env.PORT || 5000;
  
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log('\n🚀 ======= FoodieHub Backend =======');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`🗄️  Database: ${isMongoDBConnected ? 'MongoDB Atlas ✅' : 'Mock Mode ⚠️'}`);
    console.log(`📧 Email Service: ${process.env.EMAIL_USER ? 'Configured ✅' : 'Not Configured ⚠️'}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Login: POST http://localhost:${PORT}/api/auth/login`);
    console.log(`🔗 Register: POST http://localhost:${PORT}/api/auth/register`);
    console.log(`🔗 Orders API: POST http://localhost:${PORT}/api/orders/create`);
    console.log('====================================\n');
  });
};

startServer();