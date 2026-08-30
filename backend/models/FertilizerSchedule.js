const mongoose = require('mongoose');

const FertilizerScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  crop: {
    type: String,
    required: true,
  },
  growthStage: {
    type: String,
    required: true,
  },
  soilInfo: {
    type: String,
    required: true,
  },
  plantingDate: {
    type: Date,
    required: true,
  },
  fieldSize: {
    type: Number,
    required: true, // in acres
  },
  remindersEnabled: {
    type: Boolean,
    default: true,
  },
  nextApplication: {
    type: Date,
  },
  fertilizerType: {
    type: String,
  },
  applicationTime: {
    type: String,
    default: '08:00'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('FertilizerSchedule', FertilizerScheduleSchema);
