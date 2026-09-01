const dns = require('dns');
// Ensure IPv4 resolution takes priority on Windows / mobile hotspot networks
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agroassist';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('\n======================================================');
    console.error('⚠️  MongoDB Connection Error:');
    console.error(error.message);
    console.error('======================================================\n');
    return null;
  }
};

module.exports = connectDB;
