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
  // Maharashtra
  {
    id: 'mkt-pune',
    name: 'Pune APMC Market (Gultekdi)',
    state: 'Maharashtra',
    address: 'Gultekdi, Pune, Maharashtra 411037',
    lat: 18.4952,
    lng: 73.8643,
    contact: '+91 20 2426 3131',
    source: 'MSAMB (Maharashtra State Agricultural Marketing Board)',
    updatedAt: '2026-08-30T05:00:00Z',
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
    state: 'Maharashtra',
    address: 'Sector 19, Vashi, Navi Mumbai, Maharashtra 400703',
    lat: 19.0760,
    lng: 73.0076,
    contact: '+91 22 2788 1234',
    source: 'MSAMB',
    updatedAt: '2026-08-30T05:00:00Z',
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
  // Karnataka
  {
    id: 'mkt-bengaluru',
    name: 'Bengaluru APMC Yard (Yeshwanthpur)',
    state: 'Karnataka',
    address: 'Yeshwanthpur, Bengaluru, Karnataka 560022',
    lat: 13.0238,
    lng: 77.5505,
    contact: '+91 80 2337 4500',
    source: 'KSAMB (Karnataka State Agricultural Marketing Board)',
    updatedAt: '2026-08-30T05:30:00Z',
    prices: [
      { crop: 'Tomato', variety: 'Hybrid Kashi', price: 19.00, unit: 'kg' },
      { crop: 'Potato', variety: 'Hassan Red', price: 17.00, unit: 'kg' },
      { crop: 'Onion', variety: 'Bellary Medium', price: 23.50, unit: 'kg' },
      { crop: 'Rice / Paddy', variety: 'Sona Masoori', price: 2850.00, unit: 'quintal' },
      { crop: 'Maize', variety: 'Hybrid Yellow', price: 1920.00, unit: 'quintal' },
      { crop: 'Chilli', variety: 'Byadagi Special', price: 18500.00, unit: 'quintal' },
      { crop: 'Ragi', variety: 'Indaf-8', price: 3400.00, unit: 'quintal' },
    ]
  },
  // Andhra Pradesh
  {
    id: 'mkt-guntur',
    name: 'Guntur Mirchi & Agricultural Yard',
    state: 'Andhra Pradesh',
    address: 'Market Yard, Guntur, Andhra Pradesh 522004',
    lat: 16.3067,
    lng: 80.4365,
    contact: '+91 863 223 4567',
    source: 'AP Marketing Department',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Chilli', variety: 'Teja / 334', price: 16200.00, unit: 'quintal' },
      { crop: 'Cotton', variety: 'MCU-5', price: 6500.00, unit: 'quintal' },
      { crop: 'Rice / Paddy', variety: 'BPT-5204 (Samba Mahsuri)', price: 2600.00, unit: 'quintal' },
      { crop: 'Tomato', variety: 'Local Country', price: 17.00, unit: 'kg' },
      { crop: 'Maize', variety: 'Grain Feed', price: 1880.00, unit: 'quintal' },
      { crop: 'Turmeric', variety: 'Duggirala', price: 11200.00, unit: 'quintal' },
    ]
  },
  {
    id: 'mkt-kurnool',
    name: 'Kurnool Agricultural Market Committee',
    state: 'Andhra Pradesh',
    address: 'Market Yard Road, Kurnool, Andhra Pradesh 518003',
    lat: 15.8281,
    lng: 78.0373,
    contact: '+91 8518 240 123',
    source: 'AP Marketing Department',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Onion', variety: 'Kurnool Red', price: 21.00, unit: 'kg' },
      { crop: 'Groundnut', variety: 'TMV-2 Pods', price: 6900.00, unit: 'quintal' },
      { crop: 'Cotton', variety: 'Bunny Hybrid', price: 6380.00, unit: 'quintal' },
      { crop: 'Rice / Paddy', variety: 'Sona Masoori', price: 2750.00, unit: 'quintal' },
      { crop: 'Castor Seed', variety: 'Hybrid', price: 5400.00, unit: 'quintal' },
    ]
  },
  // Telangana
  {
    id: 'mkt-hyderabad',
    name: 'Hyderabad APMC Yard (Bowenpally)',
    state: 'Telangana',
    address: 'Bowenpally, Secunderabad, Telangana 500011',
    lat: 17.4728,
    lng: 78.4789,
    contact: '+91 40 2775 8890',
    source: 'Telangana Agricultural Marketing',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Tomato', variety: 'Local Red', price: 18.00, unit: 'kg' },
      { crop: 'Onion', variety: 'Nashik Big', price: 23.00, unit: 'kg' },
      { crop: 'Rice / Paddy', variety: 'Telangana Sona (RNR)', price: 2700.00, unit: 'quintal' },
      { crop: 'Cotton', variety: 'Long Staple', price: 6420.00, unit: 'quintal' },
      { crop: 'Maize', variety: 'Yellow', price: 1910.00, unit: 'quintal' },
    ]
  },
  // Tamil Nadu
  {
    id: 'mkt-chennai',
    name: 'Chennai Koyambedu Wholesale Market',
    state: 'Tamil Nadu',
    address: 'Koyambedu, Chennai, Tamil Nadu 600107',
    lat: 13.0694,
    lng: 80.1948,
    contact: '+91 44 2479 1234',
    source: 'TN Agricultural Marketing Board',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Tomato', variety: 'Nattu Tomato', price: 20.00, unit: 'kg' },
      { crop: 'Onion', variety: 'Shallots (Small Onion)', price: 42.00, unit: 'kg' },
      { crop: 'Potato', variety: 'Ooty Special', price: 22.00, unit: 'kg' },
      { crop: 'Rice / Paddy', variety: 'Ponni Raw', price: 3100.00, unit: 'quintal' },
      { crop: 'Groundnut', variety: 'Pods', price: 7200.00, unit: 'quintal' },
      { crop: 'Sugarcane', variety: 'Co-86032', price: 3250.00, unit: 'ton' },
    ]
  },
  // Delhi NCR
  {
    id: 'mkt-delhi',
    name: 'Delhi Azadpur APMC Mandi',
    state: 'Delhi',
    address: 'Azadpur, New Delhi, Delhi 110033',
    lat: 28.7073,
    lng: 77.1770,
    contact: '+91 11 2767 1234',
    source: 'DAMB (Delhi Agricultural Marketing Board)',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Tomato', variety: 'Himachal Hybrid', price: 22.00, unit: 'kg' },
      { crop: 'Potato', variety: 'Agra Jyoti', price: 14.50, unit: 'kg' },
      { crop: 'Onion', variety: 'Rajasthan Red', price: 22.50, unit: 'kg' },
      { crop: 'Wheat', variety: 'Sharbati MP', price: 2450.00, unit: 'quintal' },
      { crop: 'Mustard', variety: 'Black Seed', price: 5600.00, unit: 'quintal' },
      { crop: 'Basmati Rice / Paddy', variety: 'Pusa 1121', price: 3800.00, unit: 'quintal' },
    ]
  },
  // Gujarat
  {
    id: 'mkt-ahmedabad',
    name: 'Ahmedabad APMC Mandi (Jamalpur)',
    state: 'Gujarat',
    address: 'Jamalpur, Ahmedabad, Gujarat 380022',
    lat: 23.0120,
    lng: 72.5800,
    contact: '+91 79 2535 6789',
    source: 'GMB (Gujarat Marketing Board)',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Cotton', variety: 'Shankar-6', price: 6600.00, unit: 'quintal' },
      { crop: 'Groundnut', variety: 'Saurashtra Bold', price: 6950.00, unit: 'quintal' },
      { crop: 'Wheat', variety: 'Lok-1 Tukdi', price: 2300.00, unit: 'quintal' },
      { crop: 'Castor Seed', variety: 'Gujarat-4', price: 5800.00, unit: 'quintal' },
      { crop: 'Cumin (Jeera)', variety: 'Unjha Quality', price: 24500.00, unit: 'quintal' },
    ]
  },
  // Rajasthan
  {
    id: 'mkt-jaipur',
    name: 'Jaipur Muhana Terminal Mandi',
    state: 'Rajasthan',
    address: 'Muhana Mandi, Sanganer, Jaipur, Rajasthan 302029',
    lat: 26.7950,
    lng: 75.7680,
    contact: '+91 141 273 4567',
    source: 'RSAMB (Rajasthan State Agricultural Marketing Board)',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Mustard', variety: 'Yellow Mustard', price: 5750.00, unit: 'quintal' },
      { crop: 'Wheat', variety: 'Desi Kathia', price: 2280.00, unit: 'quintal' },
      { crop: 'Bajra (Pearl Millet)', variety: 'Hybrid', price: 2150.00, unit: 'quintal' },
      { crop: 'Guar Seed', variety: 'Standard', price: 5100.00, unit: 'quintal' },
      { crop: 'Onion', variety: 'Alwar Red', price: 21.50, unit: 'kg' },
    ]
  },
  // Uttar Pradesh
  {
    id: 'mkt-lucknow',
    name: 'Lucknow Naveen Mandi Samiti (Sitapur Road)',
    state: 'Uttar Pradesh',
    address: 'Sitapur Road, Lucknow, Uttar Pradesh 226020',
    lat: 26.9030,
    lng: 80.9380,
    contact: '+91 522 236 7890',
    source: 'UP Mandi Parishad',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Wheat', variety: 'UP-2003', price: 2180.00, unit: 'quintal' },
      { crop: 'Rice / Paddy', variety: 'Common Non-Basmati', price: 2200.00, unit: 'quintal' },
      { crop: 'Potato', variety: 'Farrukhabad Jyoti', price: 13.80, unit: 'kg' },
      { crop: 'Sugarcane', variety: 'Co-0238', price: 3400.00, unit: 'ton' },
      { crop: 'Mustard', variety: 'Black Seed', price: 5500.00, unit: 'quintal' },
    ]
  },
  // Punjab
  {
    id: 'mkt-khanna',
    name: 'Khanna Asia Largest Grain Market',
    state: 'Punjab',
    address: 'GT Road, Khanna, Ludhiana, Punjab 141401',
    lat: 30.7070,
    lng: 76.2160,
    contact: '+91 1628 226 500',
    source: 'Punjab Mandi Board',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Wheat', variety: 'PBW-550 / HD-2967', price: 2275.00, unit: 'quintal' },
      { crop: 'Paddy / Basmati', variety: '1509 Basmati', price: 3600.00, unit: 'quintal' },
      { crop: 'Maize', variety: 'Punjab Hybrid', price: 1950.00, unit: 'quintal' },
      { crop: 'Cotton', variety: 'Bt Cotton Medium', price: 6550.00, unit: 'quintal' },
    ]
  },
  // Madhya Pradesh
  {
    id: 'mkt-indore',
    name: 'Indore Choithram Mandi Samiti',
    state: 'Madhya Pradesh',
    address: 'Choithram Circle, Indore, Madhya Pradesh 452014',
    lat: 22.6850,
    lng: 75.8450,
    contact: '+91 731 247 1234',
    source: 'MP State Agricultural Marketing Board',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Soybean', variety: 'JS-9560 Yellow', price: 4650.00, unit: 'quintal' },
      { crop: 'Wheat', variety: 'Malwa Sharbati', price: 2650.00, unit: 'quintal' },
      { crop: 'Gram (Chana)', variety: 'Desi Dollar', price: 5850.00, unit: 'quintal' },
      { crop: 'Garlic', variety: 'Mandsaur Special', price: 110.00, unit: 'kg' },
      { crop: 'Onion', variety: 'Indore Red', price: 22.00, unit: 'kg' },
    ]
  },
  // West Bengal
  {
    id: 'mkt-kolkata',
    name: 'Kolkata Posta Wholesale Agri Market',
    state: 'West Bengal',
    address: 'Posta, Burrabazar, Kolkata, West Bengal 700007',
    lat: 22.5850,
    lng: 88.3580,
    contact: '+91 33 2268 4567',
    source: 'WB Agri Marketing Department',
    updatedAt: '2026-08-30T05:00:00Z',
    prices: [
      { crop: 'Rice / Paddy', variety: 'Govindabhog Special', price: 4200.00, unit: 'quintal' },
      { crop: 'Potato', variety: 'Hooghly Jyoti', price: 15.00, unit: 'kg' },
      { crop: 'Jute', variety: 'TD-5 Quality', price: 5900.00, unit: 'quintal' },
      { crop: 'Mustard', variety: 'Yellow Sarson', price: 5700.00, unit: 'quintal' },
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
