const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedUser = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agroassist';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding.');

    // Delete existing user if any
    await User.deleteMany({ email: 'ganeshgiddathimmannagari@example.com' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123!', salt);

    // Create user
    await User.create({
      name: 'Ganesh Gidda',
      email: 'ganeshgiddathimmannagari@example.com',
      password: hashedPassword,
      phone: '1234567890'
    });

    console.log('Seeded test user successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedUser();
