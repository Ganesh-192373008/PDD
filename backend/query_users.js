require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({}, 'name email');
  console.log('Users in DB:', users);
  mongoose.disconnect();
}
run();
