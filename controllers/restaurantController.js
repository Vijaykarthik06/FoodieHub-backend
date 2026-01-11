const asyncHandler = require('express-async-handler');
const Restaurant = require('../models/Restaurant');
const Product = require('../models/Product');

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
const getRestaurants = asyncHandler(async (req, res) => {
  const {
    cuisine,
    city,
    minRating,
    featured,
    page = 1,
    limit = 10,
    sortBy = 'name',
    sortOrder = 'asc',
    search
  } = req.query;

  // Build query object
  let query = { isActive: true };

  if (cuisine && cuisine !== 'all') {
    query.cuisine = cuisine;
  }

  if (city) {
    query['address.city'] = new RegExp(city, 'i');
  }

  if (minRating) {
    query.rating = { $gte: Number(minRating) };
  }

  if (featured === 'true') {
    query.isFeatured = true;
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
  const restaurants = await Restaurant.find(query)
    .populate('owner', 'name email')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  // Get total count for pagination
  const total = await Restaurant.countDocuments(query);

  res.json({
    restaurants,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    total
  });
});

// @desc    Get single restaurant
// @route   GET /api/restaurants/:id
// @access  Public
const getRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id)
    .populate('owner', 'name email phone');

  if (restaurant) {
    res.json(restaurant);
  } else {
    res.status(404);
    throw new Error('Restaurant not found');
  }
});

// @desc    Create a restaurant
// @route   POST /api/restaurants
// @access  Private/Restaurant Owner or Admin
const createRestaurant = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    cuisine,
    address,
    contact,
    hours,
    deliveryInfo,
    images
  } = req.body;

  const restaurant = await Restaurant.create({
    name,
    description,
    cuisine,
    address,
    contact,
    hours,
    deliveryInfo,
    images,
    owner: req.user._id
  });

  res.status(201).json(restaurant);
});

// @desc    Update a restaurant
// @route   PUT /api/restaurants/:id
// @access  Private/Restaurant Owner or Admin
const updateRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  // Check if user owns the restaurant or is admin
  if (restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this restaurant');
  }

  const updatedRestaurant = await Restaurant.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json(updatedRestaurant);
});

// @desc    Delete a restaurant
// @route   DELETE /api/restaurants/:id
// @access  Private/Restaurant Owner or Admin
const deleteRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  // Check if user owns the restaurant or is admin
  if (restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this restaurant');
  }

  await Restaurant.findByIdAndDelete(req.params.id);

  res.json({ message: 'Restaurant removed' });
});

// @desc    Get restaurant menu
// @route   GET /api/restaurants/:id/menu
// @access  Public
const getRestaurantMenu = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }

  const menu = await Product.find({
    restaurant: req.params.id,
    isAvailable: true
  }).sort({ category: 1, name: 1 });

  // Group by category
  const menuByCategory = menu.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {});

  res.json({
    restaurant: {
      _id: restaurant._id,
      name: restaurant.name,
      cuisine: restaurant.cuisine
    },
    menu: menuByCategory
  });
});

// @desc    Get restaurants by cuisine
// @route   GET /api/restaurants/cuisine/:cuisine
// @access  Public
const getRestaurantsByCuisine = asyncHandler(async (req, res) => {
  const restaurants = await Restaurant.find({
    cuisine: req.params.cuisine,
    isActive: true
  });

  res.json(restaurants);
});

// @desc    Get restaurants by city
// @route   GET /api/restaurants/city/:city
// @access  Public
const getRestaurantsByCity = asyncHandler(async (req, res) => {
  const restaurants = await Restaurant.find({
    'address.city': new RegExp(req.params.city, 'i'),
    isActive: true
  });

  res.json(restaurants);
});

// @desc    Search restaurants
// @route   GET /api/restaurants/search
// @access  Public
const searchRestaurants = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q) {
    res.status(400);
    throw new Error('Please provide a search query');
  }

  const restaurants = await Restaurant.find({
    $text: { $search: q },
    isActive: true
  });

  res.json(restaurants);
});

module.exports = {
  getRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantMenu,
  getRestaurantsByCuisine,
  getRestaurantsByCity,
  searchRestaurants,
};