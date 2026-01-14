// simple-test.js
const mongoose = require('mongoose');

// Test with direct connection string
const connectionString = 'mongodb+srv://vijaykarthik2512_db_user:CYEcMmos6Bf7rZgi@foodiehub.pkan7is.mongodb.net/foodiehub?retryWrites=true&w=majority';

console.log('Testing connection to MongoDB Atlas...');

mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('✅ SUCCESS: Connected to MongoDB Atlas!');
  console.log(`Database: ${mongoose.connection.name}`);
  process.exit(0);
})
.catch(err => {
  console.log('❌ ERROR:', err.message);
  console.log('\nPossible issues:');
  console.log('1. Password might be wrong');
  console.log('2. Cluster might be paused');
  console.log('3. Network issue');
  process.exit(1);
});