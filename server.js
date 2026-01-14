// server.js - UPDATED WITH MONGODB INTEGRATION
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

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
      serverSelectionTimeoutMS: 10000,
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
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== REQUEST LOGGER ==========
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// ========== USER MODEL (MongoDB) ==========
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
      'GET /api/auth/me'
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

// ========== START SERVER ==========
const startServer = async () => {
  const PORT = process.env.PORT || 10000;
  
  // Try to connect to MongoDB
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log('\n🚀 ======= FoodieHub Backend =======');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`🗄️  Database: ${isMongoDBConnected ? 'MongoDB Atlas ✅' : 'Mock Mode ⚠️'}`);
    console.log(`✅ CORS: Enabled for ALL origins`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Test: http://localhost:${PORT}/api/test`);
    console.log(`🔗 DB Test: http://localhost:${PORT}/api/auth/db-test`);
    console.log(`🔗 Login: POST http://localhost:${PORT}/api/auth/login`);
    console.log(`🔗 Register: POST http://localhost:${PORT}/api/auth/register`);
    
    if (!isMongoDBConnected) {
      console.log('\n⚠️  IMPORTANT: Running in MOCK MODE');
      console.log('📝 To enable MongoDB:');
      console.log('1. Add MONGODB_URI to .env file');
      console.log('2. Add JWT_SECRET to .env file');
      console.log('3. Restart server');
    } else {
      console.log('\n✅ READY: Data will save to MongoDB Atlas!');
    }
    
    console.log('====================================\n');
  });
};

startServer();