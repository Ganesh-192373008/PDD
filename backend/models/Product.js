const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Seeds', 'Fertilizers', 'Organic Products', 'Farming Tools', 'Irrigation Products', 'Crop Protection Products', 'Agricultural Equipment'],
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  availability: {
    type: Boolean,
    default: true,
  },
  store: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  details: {
    type: Map,
    of: String,
    default: {},
  },
  contact: {
    type: String,
    default: '',
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Product', ProductSchema);
