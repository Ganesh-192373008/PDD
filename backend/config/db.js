const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const cloudUri = process.env.MONGO_URI;

  // 1. Try Cloud Atlas Connection first (timeout in 4.5 seconds if port 27017 is blocked)
  if (cloudUri) {
    try {
      console.log('Connecting to MongoDB Atlas Cloud...');
      const conn = await mongoose.connect(cloudUri, {
        serverSelectionTimeoutMS: 4500,
      });
      console.log(`✅ MongoDB Cloud Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.warn(`⚠️ Cloud MongoDB connection timed out (Port 27017 may be blocked by your network/firewall).`);
      console.log('🔄 Switching automatically to Local Embedded MongoDB Engine...');
    }
  }

  // 2. Automatic Local MongoDB Server Fallback
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'agroassist'
      }
    });
    const localUri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(localUri);
    console.log(`✅ AgroAssist Local MongoDB Engine Active: ${conn.connection.host}:${conn.connection.port}`);
    return conn;
  } catch (localErr) {
    console.error('❌ Failed to start local database:', localErr.message);
    return null;
  }
};

module.exports = connectDB;
