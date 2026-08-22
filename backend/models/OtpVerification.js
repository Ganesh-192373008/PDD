const mongoose = require('mongoose');

const OtpVerificationSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index to automatically remove the document when it expires
  }
});

module.exports = mongoose.model('OtpVerification', OtpVerificationSchema);
