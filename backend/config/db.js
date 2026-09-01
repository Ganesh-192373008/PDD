const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agroassist';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('\n======================================================');
    console.error('⚠️  MongoDB Connection Error:');
    console.error(error.message);
    if (error.message.includes('whitelist') || error.message.includes('Could not connect to any servers')) {
      console.error('\n👉 ACTION REQUIRED IN MONGODB ATLAS:');
      console.error('1. Go to https://cloud.mongodb.com/');
      console.error('2. Navigate to "Security" -> "Network Access"');
      console.error('3. Click "Add IP Address" and select "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0)');
      console.error('4. Click Confirm and wait 1 minute.');
      console.error('======================================================\n');
    }
    return null;
  }
};

module.exports = connectDB;
