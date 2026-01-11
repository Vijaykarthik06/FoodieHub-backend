const express = require('express');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get user's orders
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('restaurant', 'name cuisine image address deliveryTime rating')
      .populate('items.menuItem', 'name description image category')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// Get order by ID
router.get('/:orderId', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('restaurant', 'name cuisine image address contact deliveryTime')
      .populate('items.menuItem', 'name description image category')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order'
    });
  }
});

// Create new order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      restaurantId,
      items,
      deliveryAddress,
      contactInfo,
      deliveryType,
      paymentMethod,
      tip = 0,
      specialInstructions
    } = req.body;

    // Validate restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Calculate order details
    const subtotal = items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    const deliveryFee = deliveryType === 'delivery' ? restaurant.deliveryFee : 0;
    const tax = subtotal * 0.08; // 8% tax
    const serviceFee = subtotal * 0.05; // 5% service fee
    const totalAmount = subtotal + deliveryFee + tax + serviceFee + parseFloat(tip);

    // Create order
    const order = new Order({
      user: req.user._id,
      restaurant: restaurantId,
      items: items.map(item => ({
        menuItem: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        specialInstructions: item.specialInstructions,
        customizations: item.customizations || []
      })),
      deliveryAddress,
      contactInfo: {
        name: contactInfo.name || req.user.name,
        phone: contactInfo.phone || req.user.phone,
        email: contactInfo.email || req.user.email
      },
      deliveryType,
      paymentMethod,
      subtotal,
      deliveryFee,
      tax,
      serviceFee,
      tip: parseFloat(tip),
      totalAmount,
      estimatedDelivery: new Date(Date.now() + restaurant.deliveryTime.max * 60000)
    });

    await order.save();

    // Populate order for response
    await order.populate('restaurant', 'name cuisine image address');
    await order.populate('items.menuItem', 'name description image');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        restaurant: order.restaurant,
        deliveryAddress: order.deliveryAddress,
        contactInfo: order.contactInfo,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        tax: order.tax,
        serviceFee: order.serviceFee,
        tip: order.tip,
        totalAmount: order.totalAmount,
        estimatedDelivery: order.estimatedDelivery,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
});

// Cancel order
router.put('/:orderId/cancel', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order can be cancelled
    const nonCancellableStatuses = ['delivered', 'cancelled', 'out_for_delivery', 'ready'];
    if (nonCancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = req.body.reason || 'Cancelled by user';
    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order'
    });
  }
});

// Update order status (Admin/Restaurant)
router.put('/:orderId/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is admin or restaurant owner
    const isRestaurantOwner = order.restaurant.owner?.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isRestaurantOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
});

// Rate order
router.post('/:orderId/rate', authMiddleware, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate delivered orders'
      });
    }

    order.rated = true;
    order.rating = rating;
    order.review = review;
    await order.save();

    res.json({
      success: true,
      message: 'Order rated successfully',
      order
    });
  } catch (error) {
    console.error('Rate order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rating order'
    });
  }
});

// Get all orders (Admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .populate('restaurant', 'name cuisine')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

module.exports = router;