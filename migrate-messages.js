// Migration script to update old messages with new fields
require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('./models/Message');

const migrateMessages = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔄 Updating messages...');
    
    // Update all messages that don't have readBy field
    const result1 = await Message.updateMany(
      { readBy: { $exists: false } },
      { $set: { readBy: [] } }
    );
    console.log(`✅ Added readBy field to ${result1.modifiedCount} messages`);

    // Update all messages that don't have isDeleted field
    const result2 = await Message.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } }
    );
    console.log(`✅ Added isDeleted field to ${result2.modifiedCount} messages`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Restart the backend server');
    console.log('2. All old messages will work properly');
    console.log('3. Blue ticks will work for new messages\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateMessages();
