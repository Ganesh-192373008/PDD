require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Initialize database connection
connectDB();

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static uploads folder (for profile/product images in future)
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
app.use('/api/products', require('./routes/products'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/user', require('./routes/user'));
app.use('/api/community', require('./routes/community'));
app.use('/api/history', require('./routes/history'));

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

app.listen(PORT, () => {
  console.log(`AgroAssist Server running on port ${PORT}`);
});
