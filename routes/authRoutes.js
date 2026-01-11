const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// ------------------------
// Token Generator
// ------------------------
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// ------------------------
// Register
// ------------------------
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || name.length < 2)
      return res.status(400).json({ message: 'Name too short' });

    if (!email)
      return res.status(400).json({ message: 'Email required' });

    if (!password || password.length < 6)
      return res.status(400).json({ message: 'Password too short' });

    // Check existing user
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: 'User already exists' });

    // Create user
    const user = await User.create({ name, email, password });

    // Token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('❌ Register Error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ------------------------
// Login
// ------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      },
      token
    });

  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ------------------------
// Get Logged-in User
// ------------------------
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
      return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user)
      return res.status(404).json({ message: 'User not found' });

    res.json({ success: true, user });

  } catch (error) {
    console.error('❌ Auth Error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
