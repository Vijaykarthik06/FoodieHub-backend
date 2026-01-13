const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// ✅ JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';

// ✅ Simple in-memory user store for testing (remove when using MongoDB)
let users = [
  {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    password: '$2a$10$YourHashedPasswordHere', // password: "password123"
    isAdmin: false
  }
];

// Helper to hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// ✅ Generate Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// ✅ Test Route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// ✅ Register Route
router.post('/register', async (req, res) => {
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

    // Check if user exists
    const existingUser = users.find(user => user.email === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      isAdmin: false
    };

    users.push(newUser);

    // Generate token
    const token = generateToken(newUser.id);

    console.log('✅ User registered:', email);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
      token
    });

  } catch (error) {
    console.error('❌ Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// ✅ Login Route
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = users.find(user => user.email === email.toLowerCase());
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user.id);

    console.log('✅ Login success:', email);

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      },
      token
    });

  } catch (error) {
    console.error('❌ Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// ✅ Get Current User
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = users.find(user => user.id === decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('❌ Token Verification Error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

// ✅ Create test user endpoint
router.post('/create-test-user', async (req, res) => {
  try {
    const hashedPassword = await hashPassword('password123');
    
    const testUser = {
      id: 'test123',
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      isAdmin: false
    };
    
    users.push(testUser);
    
    const token = generateToken(testUser.id);
    
    const { password, ...userWithoutPassword } = testUser;
    
    res.json({
      success: true,
      message: 'Test user created',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Test user creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ List all users (for testing only)
router.get('/users', (req, res) => {
  const usersWithoutPasswords = users.map(user => {
    const { password, ...rest } = user;
    return rest;
  });
  res.json({ success: true, users: usersWithoutPasswords });
});

module.exports = router;