const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  documentName: {
    type: String,
    required: [true, 'Document name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      // Identity Documents
      'Aadhaar Card',
      'PAN Card',
      'Voter ID',
      'Driving License',
      // Agriculture & Farming
      'Land Documents',
      'Soil Test Report',
      'Crop Insurance',
      'Farmer Registration',
      'Crop Certificate',
      'Agriculture Certificate',
      // Government & Family
      'Ration Card',
      'Income Certificate',
      'Government Scheme Document',
      'Government Certificate',
      // Other
      'Agricultural Invoice / Bill',
      'Receipt',
      'Other Document'
    ],
    default: 'Other Document'
  },
  groupCategory: {
    type: String,
    enum: ['Identity', 'Farming', 'Government', 'Bills', 'Other'],
    default: 'Other'
  },
  fileType: {
    type: String,
    required: true
  },
  fileExtension: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  storageKey: {
    type: String,
    required: true
  },
  maskedNumber: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Helper to deduce group category from specific category
documentSchema.pre('save', function() {
  const cat = this.category;
  if (['Aadhaar Card', 'PAN Card', 'Voter ID', 'Driving License'].includes(cat)) {
    this.groupCategory = 'Identity';
  } else if (['Land Documents', 'Soil Test Report', 'Crop Insurance', 'Farmer Registration', 'Crop Certificate', 'Agriculture Certificate'].includes(cat)) {
    this.groupCategory = 'Farming';
  } else if (['Ration Card', 'Income Certificate', 'Government Scheme Document', 'Government Certificate'].includes(cat)) {
    this.groupCategory = 'Government';
  } else if (['Agricultural Invoice / Bill', 'Receipt'].includes(cat)) {
    this.groupCategory = 'Bills';
  } else {
    this.groupCategory = 'Other';
  }
});

module.exports = mongoose.model('Document', documentSchema);
