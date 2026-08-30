const mongoose = require('mongoose');

const WaterScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  crop: {
    type: String,
    required: true,
  },
  fieldSize: {
    type: Number,
    required: true, // in acres
  },
  soilType: {
    type: String,
    required: true,
  },
  plantingDate: {
    type: Date,
    required: true,
  },
  irrigationMethod: {
    type: String,
    required: true,
  },
  irrigationType: {
    type: String,
  },
  remindersEnabled: {
    type: Boolean,
    default: true,
  },
  nextWatering: {
    type: Date,
  },
  wateringTime: {
    type: String,
    default: '07:00 AM'
  },
  irrigationTime: {
    type: String,
    default: '07:00 AM'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('WaterSchedule', WaterScheduleSchema);
