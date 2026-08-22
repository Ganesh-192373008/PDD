const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  password: {
    type: String,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String, default: '' },
    state: { type: String, default: '' },
    district: { type: String, default: '' }
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'mr', 'hi', 'ta'], // English, Marathi, Hindi, Tamil
    default: 'en',
  },
  crops: [{
    type: String
  }],
  farmingExperience: {
    type: Number,
    default: 0
  },
  landArea: {
    type: Number,
    default: 0
  },
  profileImage: {
    type: String,
    default: ''
  },
  notificationPreferences: {
    weather: { type: Boolean, default: true },
    market: { type: Boolean, default: true },
    schemes: { type: Boolean, default: true },
    schedule: { type: Boolean, default: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('User', UserSchema);
