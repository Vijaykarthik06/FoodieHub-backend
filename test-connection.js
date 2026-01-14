// test-connection.js
require('dotenv').config();
const mongoose = require('mongoose');

console.log('1. Connection string exists:', !!process.env.MONGODB_URI);
console.log('2. Has /foodiehub? :', process.env.MONGODB_URI ? process.env.MONGODB_URI.includes('/foodiehub?') : 'No MONGODB_URI');
console.log('3. Connection test...');

mongoose.connect(process.env.MONGODB_URI, {serverSelectionTimeoutMS: 5000})
  .then(async () => {
    console.log('✅ Connected to MongoDB!');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('4. Collections:', collections.map(c => c.name));
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ Connection failed:', err.message);
    process.exit(1);
  });