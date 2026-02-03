const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!', timestamp: new Date() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/search', require('./routes/search'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/returns', require('./routes/returns'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  ssl: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.log('\nOptions to fix this:');
    console.log('1. Check MongoDB Atlas connection string');
    console.log('2. Verify network connectivity');
    console.log('3. Check MongoDB Atlas IP whitelist');
  });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});