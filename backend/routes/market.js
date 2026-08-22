const express = require('express');
const router = express.Router();

// Helper: Haversine formula to calculate distance in km
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Seeded real-world APMC Markets with coordinates, crop prices, and contact details
const marketsData = [
  {
    id: 'mkt-pune',
    name: 'Pune APMC Market (Gultekdi)',
    address: 'Gultekdi, Pune, Maharashtra 411037',
    lat: 18.4952,
    lng: 73.8643,
    contact: '+91 20 2426 3131',
    source: 'MSAMB (Maharashtra State Agricultural Marketing Board)',
    updatedAt: '2026-08-19T05:00:00Z',
    prices: [
      { crop: 'Tomato', variety: 'Local', price: 18.50, unit: 'kg' },
      { crop: 'Potato', variety: 'Jyoti', price: 15.20, unit: 'kg' },
      { crop: 'Onion', variety: 'Red', price: 22.10, unit: 'kg' },
      { crop: 'Cotton', variety: 'Medium Staple', price: 6230.00, unit: 'quintal' },
      { crop: 'Wheat', variety: 'Lokwan', price: 2125.00, unit: 'quintal' },
      { crop: 'Sugarcane', variety: 'Co-86032', price: 3100.00, unit: 'ton' },
      { crop: 'Maize', variety: 'Yellow', price: 1850.00, unit: 'quintal' },
      { crop: 'Chilli', variety: 'Guntur', price: 14500.00, unit: 'quintal' },
      { crop: 'Groundnut', variety: 'Bold', price: 6800.00, unit: 'quintal' },
    ]
  },
  {
    id: 'mkt-mumbai',
    name: 'Mumbai APMC Market (Vashi)',
    address: 'Sector 19, Vashi, Navi Mumbai, Maharashtra 400703',
    lat: 19.0760,
    lng: 73.0076,
    contact: '+91 22 2788 1234',
    source: 'MSAMB',
    updatedAt: '2026-08-19T05:00:00Z',
    prices: [
      { crop: 'Tomato', variety: 'Hybrid', price: 21.00, unit: 'kg' },
      { crop: 'Potato', variety: 'Jyoti', price: 16.50, unit: 'kg' },
      { crop: 'Onion', variety: 'Nashik Red', price: 24.50, unit: 'kg' },
      { crop: 'Wheat', variety: 'Sarbati', price: 2350.00, unit: 'quintal' },
      { crop: 'Maize', variety: 'Yellow', price: 1900.00, unit: 'quintal' },
      { crop: 'Chilli', variety: 'Byadagi', price: 17200.00, unit: 'quintal' },
      { crop: 'Groundnut', variety: 'Bold', price: 7100.00, unit: 'quintal' },
    ]
  },
  {
    id: 'mkt-nashik',
    name: 'Nashik APMC Market',
    address: 'Panchavati, Nashik, Maharashtra 422003',
    lat: 20.0080,
    lng: 73.8016,
    contact: '+91 253 251 1234',
    source: 'MSAMB',
    updatedAt: '2026-08-19T04:30:00Z',
    prices: [
      { crop: 'Tomato', variety: 'Local', price: 16.00, unit: 'kg' },
      { crop: 'Potato', variety: 'Local', price: 14.00, unit: 'kg' },
      { crop: 'Onion', variety: 'Red', price: 20.00, unit: 'kg' },
      { crop: 'Cotton', variety: 'Long Staple', price: 6450.00, unit: 'quintal' },
      { crop: 'Wheat', variety: 'Lokwan', price: 2050.00, unit: 'quintal' },
      { crop: 'Maize', variety: 'Local', price: 1800.00, unit: 'quintal' },
      { crop: 'Groundnut', variety: 'Bold', price: 6600.00, unit: 'quintal' },
    ]
  },
  {
    id: 'mkt-kolhapur',
    name: 'Kolhapur APMC Market',
    address: 'Shahupuri, Kolhapur, Maharashtra 416001',
    lat: 16.7028,
    lng: 74.2405,
    contact: '+91 231 265 1234',
    source: 'MSAMB',
    updatedAt: '2026-08-19T04:45:00Z',
    prices: [
      { crop: 'Tomato', variety: 'Local', price: 17.50, unit: 'kg' },
      { crop: 'Potato', variety: 'Jyoti', price: 15.00, unit: 'kg' },
      { crop: 'Onion', variety: 'Red', price: 21.00, unit: 'kg' },
      { crop: 'Sugarcane', variety: 'Co-86032', price: 3150.00, unit: 'ton' },
      { crop: 'Wheat', variety: 'Lokwan', price: 2100.00, unit: 'quintal' },
      { crop: 'Groundnut', variety: 'Bold', price: 6750.00, unit: 'quintal' },
    ]
  },
  {
    id: 'mkt-nagpur',
    name: 'Nagpur APMC Market',
    address: 'Kalamna, Nagpur, Maharashtra 440008',
    lat: 21.1663,
    lng: 79.1415,
    contact: '+91 712 268 1234',
    source: 'MSAMB',
    updatedAt: '2026-08-19T05:00:00Z',
    prices: [
      { crop: 'Tomato', variety: 'Local', price: 19.00, unit: 'kg' },
      { crop: 'Potato', variety: 'Local', price: 15.80, unit: 'kg' },
      { crop: 'Onion', variety: 'Red', price: 23.00, unit: 'kg' },
      { crop: 'Cotton', variety: 'Medium Staple', price: 6150.00, unit: 'quintal' },
      { crop: 'Wheat', variety: 'Lokwan', price: 2150.00, unit: 'quintal' },
      { crop: 'Maize', variety: 'Yellow', price: 1870.00, unit: 'quintal' },
      { crop: 'Chilli', variety: 'Guntur', price: 14800.00, unit: 'quintal' },
    ]
  }
];

// @route   GET api/markets
// @desc    Get agricultural prices & nearby markets sorted by distance, price, or name
router.get('/', (req, res) => {
  const userLat = parseFloat(req.query.lat);
  const userLng = parseFloat(req.query.lng);
  const sortBy = req.query.sortBy || 'distance'; // 'distance', 'price', 'name'
  const filterCrop = req.query.crop; // Optional filter by crop

  let results = marketsData.map((market) => {
    // Calculate distance if coordinates are provided
    let distance = null;
    if (!isNaN(userLat) && !isNaN(userLng)) {
      distance = getDistance(userLat, userLng, market.lat, market.lng);
    }

    // Filter prices if specific crop requested
    let prices = market.prices;
    if (filterCrop) {
      prices = market.prices.filter((p) => p.crop.toLowerCase() === filterCrop.toLowerCase());
    }

    return {
      id: market.id,
      name: market.name,
      address: market.address,
      latitude: market.lat,
      longitude: market.lng,
      contact: market.contact,
      source: market.source,
      updatedAt: market.updatedAt,
      distance: distance !== null ? parseFloat(distance.toFixed(2)) : null,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${market.lat},${market.lng}`,
      prices
    };
  });

  // Remove markets that don't have matching crop if filtering
  if (filterCrop) {
    results = results.filter((m) => m.prices.length > 0);
  }

  // Sorting
  if (sortBy === 'distance') {
    results.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  } else if (sortBy === 'name') {
    results.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'price' && filterCrop) {
    // Sort by price (descending) of the filtered crop
    results.sort((a, b) => b.prices[0].price - a.prices[0].price);
  }

  res.json(results);
});

// @route   GET api/markets/crops
// @desc    Get list of all supported crops for market comparison
router.get('/crops', (req, res) => {
  const cropsSet = new Set();
  marketsData.forEach((m) => {
    m.prices.forEach((p) => cropsSet.add(p.crop));
  });
  res.json(Array.from(cropsSet));
});

module.exports = router;
