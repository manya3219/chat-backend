const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check if MongoDB Atlas IP whitelist includes your IP');
    console.log('2. Verify username/password in connection string');
    console.log('3. Check if cluster is active in MongoDB Atlas');
    console.log('4. Try using local MongoDB: mongodb://localhost:27017/chatapp\n');
    process.exit(1);
  }
};

module.exports = connectDB;
