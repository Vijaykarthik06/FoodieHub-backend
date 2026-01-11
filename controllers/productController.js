const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Restaurant = require('../models/Restaurant');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const {
    category,
    restaurant,
    vegetarian,
    vegan,
    glutenFree,
    minPrice,
    maxPrice,
    page = 1,
    limit = 10,
    sortBy = 'name',
    sortOrder = 'asc',
    search
  } = req.query;

  // Build query object
  let query = { isAvailable: true };

  if (category && category !== 'all') {
    query.category = category;
  }

  if (restaurant) {
    query.restaurant = restaurant;
  }

  if (vegetarian === 'true') {
    query.isVegetarian = true;
  }

  if (vegan === 'true') {
    query.isVegan = true;
  }

  if (glutenFree === 'true') {
    query.isGlutenFree = true;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (search) {
    query.$text = { $search: search };
  }

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Pagination
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const products = await Product.find(query)
    .populate('restaurant', 'name cuisine rating')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  // Get total count for pagination
  const total = await Product.countDocuments(query);

  res.json({
    products,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    total
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('restaurant', 'name cuisine rating deliveryInfo');

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Restaurant Owner or Admin
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    image,
    category,
    ingredients,
    nutritionalInfo,
    isVegetarian,
    isVegan,
    isGlutenFree,
    spiceLevel,
    preparationTime
  } = req.body;

  // Check if user owns the restaurant
  const restaurant = await Restaurant.findById(req.body.restaurant);
  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  if (restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to add products to this restaurant');
  }

  const product = await Product.create({
    name,
    description,
    price,
    image,
    category,
    ingredients,
    nutritionalInfo,
    isVegetarian: isVegetarian || false,
    isVegan: isVegan || false,
    isGlutenFree: isGlutenFree || false,
    spiceLevel: spiceLevel || 0,
    preparationTime: preparationTime || 15,
    restaurant: req.body.restaurant
  });

  res.status(201).json(product);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Restaurant Owner or Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if user owns the restaurant or is admin
  const restaurant = await Restaurant.findById(product.restaurant);
  if (restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this product');
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json(updatedProduct);
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Restaurant Owner or Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if user owns the restaurant or is admin
  const restaurant = await Restaurant.findById(product.restaurant);
  if (restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this product');
  }

  await Product.findByIdAndDelete(req.params.id);

  res.json({ message: 'Product removed' });
});

// @desc    Get products by restaurant
// @route   GET /api/products/restaurant/:restaurantId
// @access  Public
const getProductsByRestaurant = asyncHandler(async (req, res) => {
  const products = await Product.find({
    restaurant: req.params.restaurantId,
    isAvailable: true
  }).populate('restaurant', 'name cuisine rating');

  res.json(products);
});

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
const getProductsByCategory = asyncHandler(async (req, res) => {
  const products = await Product.find({
    category: req.params.category,
    isAvailable: true
  }).populate('restaurant', 'name cuisine rating');

  res.json(products);
});

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q) {
    res.status(400);
    throw new Error('Please provide a search query');
  }

  const products = await Product.find({
    $text: { $search: q },
    isAvailable: true
  }).populate('restaurant', 'name cuisine rating');

  res.json(products);
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByRestaurant,
  getProductsByCategory,
  searchProducts,
};