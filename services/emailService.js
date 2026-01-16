// services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Format currency
const formatCurrency = (amount) => {
  return `₹${parseFloat(amount).toFixed(2)}`;
};

// Format order items for email
const formatOrderItems = (items) => {
  return items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.price)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join('');
};

// Send order confirmation to customer
const sendOrderConfirmationEmail = async (order, customerEmail) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email credentials not configured. Skipping email sending.');
      return false;
    }

    const transporter = createTransporter();
    
    // Calculate estimated delivery time
    const estimatedTime = new Date(order.estimatedDelivery || Date.now() + 45 * 60 * 1000);
    
    const mailOptions = {
      from: `"FoodieHub" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `✅ Order Confirmed - ${order.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { padding: 30px; background: #f9f9f9; }
                .order-details { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #dee2e6; }
                td { padding: 10px; border-bottom: 1px solid #dee2e6; }
                .total-row { font-weight: bold; font-size: 18px; color: #28a745; }
                .highlight { color: #007bff; font-weight: bold; }
                .status-badge { background: #28a745; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; display: inline-block; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="margin: 0; font-size: 28px;">🎉 Order Confirmed!</h1>
                <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Thank you for your order</p>
            </div>
            
            <div class="content">
                <div class="order-details">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <h2 style="margin: 0; color: #333;">Order Details</h2>
                            <p style="margin: 5px 0; color: #666;">
                                <strong>Order Number:</strong> <span class="highlight">${order.orderNumber}</span>
                            </p>
                        </div>
                        <span class="status-badge">${order.status || 'Confirmed'}</span>
                    </div>
                    
                    <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;">
                            <strong>📦 Estimated Delivery:</strong> 
                            <span class="highlight">${estimatedTime.toLocaleDateString()} at ${estimatedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </p>
                    </div>
                    
                    <h3>👤 Customer Information</h3>
                    <p>
                        <strong>Name:</strong> ${order.contactInfo?.firstName || ''} ${order.contactInfo?.lastName || ''}<br>
                        <strong>Email:</strong> ${order.contactInfo?.email || customerEmail}<br>
                        <strong>Phone:</strong> ${order.contactInfo?.phone || 'Not provided'}
                    </p>
                    
                    <h3>📍 Delivery Address</h3>
                    <p>
                        ${order.deliveryAddress?.street || ''}<br>
                        ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} ${order.deliveryAddress?.zipCode || ''}<br>
                        ${order.deliveryAddress?.instructions ? `<strong>Instructions:</strong> ${order.deliveryAddress.instructions}` : ''}
                    </p>
                    
                    <h3>🍽️ Order Items</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Price</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${formatOrderItems(order.items || [])}
                        </tbody>
                    </table>
                    
                    <div style="border-top: 2px solid #dee2e6; margin-top: 20px; padding-top: 15px;">
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                            <span>Subtotal:</span>
                            <span>${formatCurrency(order.subtotal || 0)}</span>
                        </div>
                        ${order.deliveryFee > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                            <span>Delivery Fee:</span>
                            <span>${formatCurrency(order.deliveryFee || 0)}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                            <span>Tax:</span>
                            <span>${formatCurrency(order.tax || 0)}</span>
                        </div>
                        ${order.tip > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                            <span>Tip:</span>
                            <span>${formatCurrency(order.tip || 0)}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; margin: 15px 0 5px; font-size: 18px; font-weight: bold; color: #28a745;">
                            <span>Total Amount:</span>
                            <span>${formatCurrency(order.total || 0)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #666;">
                            <span>Payment Method:</span>
                            <span>${(order.paymentMethod || 'credit_card').replace('_', ' ').toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0;">
                        <strong>📱 Need Help?</strong><br>
                        If you have any questions about your order, contact us at 
                        <a href="mailto:support@foodiehub.com" style="color: #007bff;">support@foodiehub.com</a> 
                        or call <a href="tel:+911234567890" style="color: #007bff;">+91 1234567890</a>
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p style="margin: 0;">© ${new Date().getFullYear()} FoodieHub. All rights reserved.</p>
                <p style="margin: 5px 0;">This is an automated email, please do not reply.</p>
                <p style="margin: 0;">
                    <a href="http://localhost:3000/orders" style="color: #007bff; text-decoration: none;">View Your Orders</a> | 
                    <a href="http://localhost:3000/" style="color: #007bff; text-decoration: none;">Visit FoodieHub</a>
                </p>
            </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Customer confirmation email sent:', info.messageId);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending customer email:', error.message);
    return false;
  }
};

// Send admin notification to vijaykarthik2512@gmail.com
const sendAdminNotification = async (order) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email credentials not configured. Skipping admin notification.');
      return false;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"FoodieHub Orders" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_ADMIN || 'vijaykarthik2512@gmail.com',
      cc: process.env.EMAIL_USER, // Also send to admin email
      subject: `📦 NEW ORDER #${order.orderNumber} - ${order.restaurantName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
                .urgent { background: #fff3cd; padding: 20px; border-left: 5px solid #ffc107; margin: 20px 0; border-radius: 5px; }
                .order-info { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 3px 15px rgba(0,0,0,0.1); }
                .section { margin: 25px 0; padding-bottom: 20px; border-bottom: 1px solid #eee; }
                .customer-highlight { background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; }
                .item-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
                .total-row { font-weight: bold; font-size: 18px; color: #28a745; padding-top: 15px; border-top: 2px solid #28a745; }
                .restaurant-info { background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0; display: flex; align-items: center; }
                .restaurant-info img { width: 80px; height: 80px; border-radius: 8px; margin-right: 15px; object-fit: cover; }
                .timestamp { color: #666; font-size: 14px; text-align: center; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="margin: 0; font-size: 26px;">🚨 NEW ORDER RECEIVED</h1>
                <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Action Required: Prepare order for ${order.restaurantName}</p>
            </div>
            
            <div class="urgent">
                <h3 style="margin: 0 0 10px; color: #856404;">⏰ URGENT - NEEDS PREPARATION</h3>
                <p style="margin: 5px 0;">
                    <strong>Order Time:</strong> ${new Date(order.orderDate || Date.now()).toLocaleString()}<br>
                    <strong>Est. Delivery:</strong> ${new Date(order.estimatedDelivery || Date.now() + 45 * 60 * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}<br>
                    <strong>Order Type:</strong> ${order.deliveryType?.toUpperCase() || 'DELIVERY'}
                </p>
            </div>
            
            <div class="order-info">
                <div class="section">
                    <h2 style="color: #2196f3; margin-bottom: 15px;">📋 ORDER SUMMARY</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <strong>Order Number:</strong><br>
                            <span style="font-size: 20px; color: #2196f3;">${order.orderNumber}</span>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <strong>Restaurant:</strong><br>
                            <span style="font-size: 18px;">${order.restaurantName}</span>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <strong>Order Total:</strong><br>
                            <span style="font-size: 22px; color: #28a745; font-weight: bold;">${formatCurrency(order.total || 0)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <h2 style="color: #2196f3; margin-bottom: 15px;">👤 CUSTOMER INFORMATION</h2>
                    <div class="customer-highlight">
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
                            <div>
                                <p style="margin: 5px 0;">
                                    <strong>Name:</strong> ${order.contactInfo?.firstName || ''} ${order.contactInfo?.lastName || ''}
                                </p>
                                <p style="margin: 5px 0;">
                                    <strong>Email:</strong> ${order.contactInfo?.email || order.userEmail || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p style="margin: 5px 0;">
                                    <strong>Phone:</strong> ${order.contactInfo?.phone || 'Not provided'}
                                </p>
                                <p style="margin: 5px 0;">
                                    <strong>Order Status:</strong> 
                                    <span style="background: ${order.status === 'confirmed' ? '#28a745' : '#ffc107'}; color: white; padding: 3px 10px; border-radius: 15px; font-size: 12px;">
                                        ${(order.status || 'confirmed').toUpperCase()}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <h2 style="color: #2196f3; margin-bottom: 15px;">📍 DELIVERY ADDRESS</h2>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                        <p style="margin: 5px 0; font-size: 16px;">
                            ${order.deliveryAddress?.street || ''}<br>
                            ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} ${order.deliveryAddress?.zipCode || ''}
                        </p>
                        ${order.deliveryAddress?.instructions ? `
                        <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px;">
                            <strong>📝 Delivery Instructions:</strong><br>
                            ${order.deliveryAddress.instructions}
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                ${order.restaurantImage ? `
                <div class="section">
                    <h2 style="color: #2196f3; margin-bottom: 15px;">🏪 RESTAURANT</h2>
                    <div class="restaurant-info">
                        <img src="${order.restaurantImage}" alt="${order.restaurantName}" onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1170&auto=format&fit=crop'">
                        <div>
                            <h3 style="margin: 0 0 5px;">${order.restaurantName}</h3>
                            <p style="margin: 0; color: #666;">Order ID: ${order._id || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <div class="section">
                    <h2 style="color: #2196f3; margin-bottom: 15px;">🍽️ ORDER ITEMS</h2>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                        ${order.items?.map(item => `
                        <div class="item-row">
                            <div>
                                <strong>${item.quantity}x ${item.name}</strong>
                                ${item.specialInstructions ? `<br><small style="color: #666;"><em>Note: ${item.specialInstructions}</em></small>` : ''}
                            </div>
                            <div style="text-align: right;">
                                <div>${formatCurrency(item.price * item.quantity)}</div>
                                <small style="color: #666;">${formatCurrency(item.price)} each</small>
                            </div>
                        </div>
                        `).join('')}
                        
                        <div class="item-row" style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #dee2e6;">
                            <div><strong>Subtotal:</strong></div>
                            <div>${formatCurrency(order.subtotal || 0)}</div>
                        </div>
                        ${order.deliveryFee > 0 ? `
                        <div class="item-row">
                            <div><strong>Delivery Fee:</strong></div>
                            <div>${formatCurrency(order.deliveryFee || 0)}</div>
                        </div>
                        ` : ''}
                        <div class="item-row">
                            <div><strong>Tax:</strong></div>
                            <div>${formatCurrency(order.tax || 0)}</div>
                        </div>
                        ${order.tip > 0 ? `
                        <div class="item-row">
                            <div><strong>Tip:</strong></div>
                            <div>${formatCurrency(order.tip || 0)}</div>
                        </div>
                        ` : ''}
                        <div class="item-row total-row">
                            <div><strong>TOTAL AMOUNT:</strong></div>
                            <div>${formatCurrency(order.total || 0)}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                        <p style="margin: 0;">
                            <strong>💳 Payment Information:</strong><br>
                            Method: ${(order.paymentMethod || 'credit_card').replace('_', ' ').toUpperCase()}<br>
                            Status: PAID
                        </p>
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0 0 10px; color: #333;">⏰ TIME IS CRITICAL</h3>
                    <p style="margin: 0; color: #666;">
                        Please prepare this order immediately for timely delivery.<br>
                        <strong>Order ID:</strong> ${order._id || 'N/A'} | 
                        <strong>Created:</strong> ${new Date(order.createdAt || Date.now()).toLocaleTimeString()}
                    </p>
                </div>
            </div>
            
            <div class="timestamp">
                <p style="margin: 0; color: #666; font-size: 12px;">
                    Automated notification sent at ${new Date().toLocaleString()}<br>
                    FoodieHub Order Management System
                </p>
            </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification email sent to vijaykarthik2512@gmail.com:', info.messageId);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending admin email:', error.message);
    return false;
  }
};

// Test email function
const testEmailService = async () => {
  try {
    console.log('📧 Testing email service...');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ Email credentials not configured in .env file');
      return false;
    }
    
    const testOrder = {
      orderNumber: 'TEST12345',
      restaurantName: 'Test Restaurant',
      contactInfo: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '1234567890'
      },
      deliveryAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        instructions: 'Leave at door'
      },
      items: [
        { name: 'Test Pizza', price: 12.99, quantity: 2, specialInstructions: 'Extra cheese' },
        { name: 'Test Burger', price: 8.99, quantity: 1 }
      ],
      subtotal: 34.97,
      deliveryFee: 2.99,
      tax: 2.80,
      tip: 5.00,
      total: 45.76,
      paymentMethod: 'credit_card',
      deliveryType: 'delivery',
      status: 'confirmed'
    };
    
    console.log('📧 Sending test customer email...');
    const customerResult = await sendOrderConfirmationEmail(testOrder, 'test@example.com');
    
    console.log('📧 Sending test admin email...');
    const adminResult = await sendAdminNotification(testOrder);
    
    return customerResult && adminResult;
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    return false;
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendAdminNotification,
  testEmailService
};