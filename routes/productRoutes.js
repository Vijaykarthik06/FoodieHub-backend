const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Products endpoint' });
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ isAvailable: true })
      .populate('restaurantId', 'name cuisine');
    
    res.json({
      success: true,
      count: products.length,
      products
    });
    
  } catch (error) {
    console.error('❌ Get products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching products' 
    });
  }
});

// Get products by restaurant
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const products = await Product.find({ 
      restaurantId: req.params.restaurantId,
      isAvailable: true 
    });
    
    res.json({
      success: true,
      count: products.length,
      products
    });
    
  } catch (error) {
    console.error('❌ Get products by restaurant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching products' 
    });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const products = await Product.find({ 
      category: req.params.category,
      isAvailable: true 
    });
    
    res.json({
      success: true,
      count: products.length,
      products
    });
    
  } catch (error) {
    console.error('❌ Get products by category error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching products' 
    });
  }
});

// Search products
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query is required' 
      });
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ],
      isAvailable: true
    });

    res.json({
      success: true,
      count: products.length,
      products
    });
    
  } catch (error) {
    console.error('❌ Search products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while searching products' 
    });
  }
});

module.exports = router;