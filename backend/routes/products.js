const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { protect } = require('../middleware/auth');

// Seed products data helper
const seedProductsIfEmpty = async () => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) return;

    const seedData = [
      // Crop Protection
      {
        name: 'Mancozeb 75% WP Fungicide',
        category: 'Crop Protection Products',
        price: 280,
        description: 'Broad spectrum contact fungicide used to control scab, early/late blight, and rust in vegetable crops.',
        availability: true,
        store: 'Kisan Kendra Seeds & Pesticides',
        image: 'https://images.unsplash.com/photo-1599933310631-89938f6b866f?w=400&auto=format&fit=crop&q=60', // General plant image or product mockup placeholder
        details: { Weight: '1 kg', Formulation: 'Wettable Powder', Brand: 'UPL' },
        contact: '+91 20 2426 9001',
        location: { lat: 18.4952, lng: 73.8643, address: 'Gultekdi Market Yard, Pune' }
      },
      {
        name: 'Chlorothalonil 75% WP Fungicide',
        category: 'Crop Protection Products',
        price: 520,
        description: 'Multi-site contact fungicide for controlling downy mildew, leaf spot, and fruit rot diseases.',
        availability: true,
        store: 'Krishi Vikas Kendra Vashi',
        image: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=400&auto=format&fit=crop&q=60',
        details: { Weight: '1 kg', Formulation: 'Wettable Powder', Brand: 'Syngenta' },
        contact: '+91 22 2788 9002',
        location: { lat: 19.0760, lng: 73.0076, address: 'APMC Market Vashi, Mumbai' }
      },
      {
        name: 'Carbendazim 50% WP Systemic Fungicide',
        category: 'Crop Protection Products',
        price: 380,
        description: 'Highly effective systemic fungicide that controls leaf spot, powdery mildew, and blast in various crops.',
        availability: true,
        store: 'Kisan Kendra Seeds & Pesticides',
        image: 'https://images.unsplash.com/photo-1599933310631-89938f6b866f?w=400&auto=format&fit=crop&q=60',
        details: { Weight: '1 kg', Formulation: 'Powder', Brand: 'Crystal Crop' },
        contact: '+91 20 2426 9001',
        location: { lat: 18.4952, lng: 73.8643, address: 'Gultekdi Market Yard, Pune' }
      },
      // Seeds
      {
        name: 'Hybrid Tomato Seeds (Indeterminate)',
        category: 'Seeds',
        price: 150,
        description: 'High-yielding F1 hybrid tomato seeds. Resistant to Tomato Yellow Leaf Curl Virus (TYLCV).',
        availability: true,
        store: 'Maharashtra Seeds Corp',
        image: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=400&auto=format&fit=crop&q=60',
        details: { Quantity: '10g (approx 3000 seeds)', GerminationRate: '85%', Purity: '99%' },
        contact: '+91 253 251 9003',
        location: { lat: 20.0080, lng: 73.8016, address: 'Panchavati APMC, Nashik' }
      },
      {
        name: 'Lokwan Wheat Seeds (Premium)',
        category: 'Seeds',
        price: 850,
        description: 'Traditional high-quality wheat seeds suitable for irrigated conditions. High flour recovery.',
        availability: true,
        store: 'Krishi Vikas Kendra Vashi',
        image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&auto=format&fit=crop&q=60',
        details: { Weight: '40 kg Bag', SeedType: 'Varietal', Treatment: 'Thiram Treated' },
        contact: '+91 22 2788 9002',
        location: { lat: 19.0760, lng: 73.0076, address: 'APMC Market Vashi, Mumbai' }
      },
      // Fertilizers
      {
        name: 'NPK 19-19-19 Water Soluble Fertilizer',
        category: 'Fertilizers',
        price: 180,
        description: 'Fully water-soluble nitrogen, phosphorus, and potassium fertilizer for vegetative and flowering stages.',
        availability: true,
        store: 'Kisan Kendra Seeds & Pesticides',
        image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=400&auto=format&fit=crop&q=60',
        details: { Weight: '1 kg', Brand: 'IFFCO', Nitrogen: '19%', Phosphorus: '19%', Potassium: '19%' },
        contact: '+91 20 2426 9001',
        location: { lat: 18.4952, lng: 73.8643, address: 'Gultekdi Market Yard, Pune' }
      },
      {
        name: 'Organic Vermicompost Fertilizer',
        category: 'Organic Products',
        price: 250,
        description: 'Enriched organic fertilizer produced by earthworms. Increases soil aeration and moisture retention.',
        availability: true,
        store: 'Kolhapur Bio-Organics',
        image: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&auto=format&fit=crop&q=60',
        details: { Weight: '25 kg Bag', Composition: '100% Organic Humus', NPKRatio: 'Nitrogen-rich' },
        contact: '+91 231 265 9004',
        location: { lat: 16.7028, lng: 74.2405, address: 'Shahupuri APMC, Kolhapur' }
      },
      // Irrigation
      {
        name: 'Drip Irrigation Starter Kit (0.5 Acre)',
        category: 'Irrigation Products',
        price: 4500,
        description: 'Complete DIY micro-irrigation system with 16mm drip main line, drippers, connectors, and screen filter.',
        availability: true,
        store: 'Pune Irrigation Systems',
        image: 'https://images.unsplash.com/photo-1463123081488-729f60c3c527?w=400&auto=format&fit=crop&q=60',
        details: { Coverage: '0.5 Acre', DripperSpacing: '40cm', PipeLength: '200 meters' },
        contact: '+91 20 2544 1234',
        location: { lat: 18.5204, lng: 73.8567, address: 'Shivajinagar, Pune' }
      },
      // Equipment
      {
        name: 'Knapsack Power Sprayer (16 Liters)',
        category: 'Agricultural Equipment',
        price: 3200,
        description: 'Battery-operated shoulder sprayer for pesticide and fungicide applications. Includes 4 nozzle types.',
        availability: true,
        store: 'Nagpur Agri Implements',
        image: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=400&auto=format&fit=crop&q=60',
        details: { Capacity: '16 L', Battery: '12V 8Ah', RunTime: '4-5 Hours' },
        contact: '+91 712 268 9005',
        location: { lat: 21.1663, lng: 79.1415, address: 'Kalamna Market Yard, Nagpur' }
      }
    ];

    await Product.insertMany(seedData);
    console.log('Agricultural Products Seeded Successfully.');
  } catch (err) {
    console.error('Error seeding products:', err.message);
  }
};

// Export router and seed function
module.exports = router;
module.exports.seedProductsIfEmpty = seedProductsIfEmpty;

// @route   GET api/products
// @desc    Get all products, filterable by category
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let filter = {};
    if (category) {
      filter.category = category;
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving products list.' });
  }
});

// @route   GET api/products/categories
// @desc    Get all product categories
router.get('/categories', async (req, res) => {
  res.json([
    'Seeds',
    'Fertilizers',
    'Organic Products',
    'Farming Tools',
    'Irrigation Products',
    'Crop Protection Products',
    'Agricultural Equipment'
  ]);
});

// @route   GET api/products/cart
// @desc    Get user's shopping cart
router.get('/cart', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }
    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Error loading shopping cart.' });
  }
});

// @route   POST api/products/cart
// @desc    Add product to cart or increment quantity
router.post('/cart', protect, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
    } else {
      cart.items.push({ productId, quantity: qty });
    }

    cart.updatedAt = new Date();
    await cart.save();
    
    // Return populated cart
    const populatedCart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    res.json(populatedCart);

  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Server error adding product to cart.' });
  }
});

// @route   PUT api/products/cart/:productId
// @desc    Update quantity of item in cart
router.put('/cart/:productId', protect, async (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity);
    const productId = req.params.productId;

    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1.' });
    }

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = qty;
      cart.updatedAt = new Date();
      await cart.save();
      
      const populatedCart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
      return res.json(populatedCart);
    } else {
      return res.status(404).json({ message: 'Item not found in cart.' });
    }

  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    res.status(500).json({ message: 'Server error updating quantity.' });
  }
});

// @route   DELETE api/products/cart/:productId
// @desc    Remove product from cart
router.delete('/cart/:productId', protect, async (req, res) => {
  try {
    const productId = req.params.productId;
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    cart.items = cart.items.filter(item => item.productId.toString() !== productId);
    cart.updatedAt = new Date();
    await cart.save();

    const populatedCart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    res.json(populatedCart);

  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ message: 'Server error removing item from cart.' });
  }
});

// @route   DELETE api/products/cart
// @desc    Clear entire cart
router.delete('/cart', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id });
    if (cart) {
      cart.items = [];
      cart.updatedAt = new Date();
      await cart.save();
    }
    res.json({ message: 'Cart cleared successfully.', items: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error clearing cart.' });
  }
});



// @route   POST api/products/checkout
// @desc    Checkout and process Cash on Delivery (COD)
router.post('/checkout', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty. Cannot checkout.' });
    }

    // Process Order using Cash on Delivery (COD)
    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Order placed successfully! Selected: Cash on Delivery (COD).'
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ message: 'Server error during checkout processing.' });
  }
});

module.exports = router;
