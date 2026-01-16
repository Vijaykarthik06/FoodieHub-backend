// Save as simple-server.js
require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
    
    const Order = mongoose.model('Order', new mongoose.Schema({
      orderNumber: String,
      userEmail: String,
      total: Number
    }));
    
    const testOrder = new Order({
      orderNumber: 'TEST123',
      userEmail: 'test@example.com',
      total: 100
    });
    
    const saved = await testOrder.save();
    console.log('✅ Order saved:', saved._id);
    
    // Check MongoDB Atlas website to verify
    console.log('📊 Check https://cloud.mongodb.com for data');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();