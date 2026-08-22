const mongoose = require('mongoose');

const SchemeStateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  schemeId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Not Applied', 'Interested', 'Applied', 'Completed'],
    default: 'Not Applied',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Compound index to guarantee uniqueness per user and scheme
SchemeStateSchema.index({ userId: 1, schemeId: 1 }, { unique: true });

module.exports = mongoose.model('SchemeState', SchemeStateSchema);
