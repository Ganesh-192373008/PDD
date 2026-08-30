const mongoose = require('mongoose');

const ScanHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  crop: {
    type: String,
    required: true
  },
  disease: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    required: true
  },
  recommendation: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ScanHistory', ScanHistorySchema);
