const Order = require('../models/Order');
const asyncHandler = require('express-async-handler');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  try {
    console.log('🔵 ========== ORDER CREATION STARTED ==========');
    
    // 🟢 TEMPORARY: Handle cases where user is not authenticated
    let userId, userEmail;
    if (req.user) {
      userId = req.user._id;
      userEmail = req.user.email;
      console.log('🟡 Using authenticated user:', userEmail);
    } else {
      // Create a temporary user for testing
      const mongoose = require('mongoose');
      userId = new mongoose.Types.ObjectId(); // Generate valid ObjectId
      userEmail = req.body.contactInfo?.email || 'test@example.com';
      console.log('🟡 Using temporary test user:', userEmail);
    }

    const {
      restaurantId,
      restaurantName,
      restaurantImage,
      items,
      deliveryAddress,
      contactInfo,
      paymentMethod,
      deliveryType,
      tip,
      specialInstructions,
      subtotal,
      deliveryFee,
      tax,
      total
    } = req.body;

    console.log('🔵 Request Body:', JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order items provided'
      });
    }

    if (!restaurantId || !restaurantName) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant information is required'
      });
    }

    if (deliveryType === 'delivery' && !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required for delivery orders'
      });
    }

    // Calculate totals
    const calculatedSubtotal = subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const calculatedDeliveryFee = deliveryFee || (deliveryType === 'delivery' ? 2.99 : 0);
    const calculatedTax = tax || (calculatedSubtotal * 0.08);
    const calculatedTip = parseFloat(tip) || 0;
    const calculatedTotal = total || (calculatedSubtotal + calculatedDeliveryFee + calculatedTax + calculatedTip);

    console.log('🟡 Calculated totals:', {
      subtotal: calculatedSubtotal,
      deliveryFee: calculatedDeliveryFee,
      tax: calculatedTax,
      tip: calculatedTip,
      total: calculatedTotal
    });

    // Create order object
    const orderData = {
      userId: userId,
      userEmail: userEmail,
      restaurantId: restaurantId,
      restaurantName: restaurantName,
      restaurantImage: restaurantImage || '',
      items: items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || '',
        specialInstructions: item.specialInstructions || '',
        itemTotal: item.price * item.quantity
      })),
      subtotal: calculatedSubtotal,
      deliveryFee: calculatedDeliveryFee,
      tax: calculatedTax,
      tip: calculatedTip,
      totalAmount: calculatedTotal,
      deliveryType: deliveryType,
      deliveryAddress: deliveryType === 'delivery' ? {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        zipCode: deliveryAddress.zipCode,
        instructions: deliveryAddress.instructions || ''
      } : undefined,
      contactInfo: {
        firstName: contactInfo.firstName,
        lastName: contactInfo.lastName,
        email: contactInfo.email,
        phone: contactInfo.phone
      },
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'completed',
      specialInstructions: specialInstructions || '',
      status: 'confirmed'
    };

    console.log('💾 Saving order to database...');

    // Create and save order
    const order = new Order(orderData);
    const createdOrder = await order.save();

    console.log('✅ Order saved successfully to MongoDB!');
    console.log('🟢 Order ID:', createdOrder._id);
    console.log('🟢 Order Number:', createdOrder.orderNumber);
    console.log('🔵 ========== ORDER CREATION COMPLETED ==========');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: createdOrder
    });

  } catch (error) {
    console.error('🔴 ========== ORDER CREATION FAILED ==========');
    console.error('🔴 Error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message
    });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('restaurantId', 'name cuisine image deliveryTime address');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order or is admin
    if (order.userId._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order'
    });
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = { userId: req.user._id };
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('restaurantId', 'name cuisine image')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      orders
    });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status, restaurant } = req.query;
    
    let query = {};
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by restaurant if provided
    if (restaurant) {
      query.restaurantId = restaurant;
    }

    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .populate('restaurantId', 'name cuisine')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      orders
    });

  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update status and set deliveredAt if status is delivered
    const updateData = { status };
    if (status === 'delivered' && !order.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('userId', 'name email')
    .populate('restaurantId', 'name cuisine');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status'
    });
  }
});

// @desc    Update payment status
// @route   PUT /api/orders/:id/payment
// @access  Private/Admin
const updatePaymentStatus = asyncHandler(async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment status is required'
      });
    }

    const validPaymentStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating payment status'
    });
  }
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Only allow cancellation if order is not already preparing or beyond
    const nonCancellableStatuses = ['preparing', 'ready', 'out_for_delivery', 'delivered'];
    if (nonCancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling order'
    });
  }
});

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder
};