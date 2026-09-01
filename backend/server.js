require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const productsRoute = require('./routes/products');
const communityRoute = require('./routes/community');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/market', require('./routes/market'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/disease', require('./routes/disease'));
app.use('/api/schemes', require('./routes/schemes'));
app.use('/api/water', require('./routes/water'));
app.use('/api/fertilizer', require('./routes/fertilizer'));
app.use('/api/products', productsRoute);
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/user', require('./routes/user'));
app.use('/api/community', communityRoute);
app.use('/api/history', require('./routes/history'));
app.use('/api/documents', require('./routes/documents'));

// Server root status check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'AgroAssist API Server',
    time: new Date()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    message: 'An internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

// Start Server and Database Connection
const startServer = async () => {
  const conn = await connectDB();
  if (conn) {
    // Seed initial data only if connected
    if (productsRoute.seedProductsIfEmpty) {
      productsRoute.seedProductsIfEmpty();
    }
    if (communityRoute.seedCommunityIfEmpty) {
      communityRoute.seedCommunityIfEmpty();
    }
  }

  app.listen(PORT, () => {
    console.log(`AgroAssist Server running on port ${PORT}`);
  });
};

startServer();
