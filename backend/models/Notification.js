const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Null indicates global announcement for all users
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Government Schemes', 'Government Announcements', 'Seed Distribution', 'Market Price Changes', 'Weather Alerts', 'Water Schedule', 'Fertilizer Schedule', 'AI/System Notifications'],
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
