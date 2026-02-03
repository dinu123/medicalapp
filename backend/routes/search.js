const express = require('express');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const auth = require('../middleware/auth');

const router = express.Router();

// Global search endpoint
router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const searchTerm = q.toLowerCase();
    const results = [];
    
    // Search products
    const products = await Product.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { manufacturer: { $regex: searchTerm, $options: 'i' } },
        { 'batches.batchNumber': { $regex: searchTerm, $options: 'i' } }
      ]
    }).limit(5);
    
    products.forEach(product => {
      const totalStock = product.batches.reduce((sum, batch) => sum + batch.stock, 0);
      const firstBatchWithStock = product.batches.find(b => b.stock > 0);
      results.push({
        type: 'product',
        data: {
          ...product.toObject(),
          totalStock,
          mrp: firstBatchWithStock ? firstBatchWithStock.mrp : 0
        }
      });
    });
    
    // Search transactions
    const transactions = await Transaction.find({
      $or: [
        { customerName: { $regex: searchTerm, $options: 'i' } },
        { 'items.productName': { $regex: searchTerm, $options: 'i' } }
      ]
    }).limit(3);
    
    transactions.forEach(transaction => {
      results.push({
        type: transaction.type === 'purchase' ? 'purchase' : 'sale',
        data: transaction.toObject()
      });
    });
    
    // Search customers
    const customers = await Customer.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { phoneNumber: { $regex: searchTerm, $options: 'i' } }
      ]
    }).limit(3);
    
    customers.forEach(customer => {
      results.push({
        type: 'customer',
        data: customer.toObject()
      });
    });
    
    // Search suppliers
    const suppliers = await Supplier.find({
      name: { $regex: searchTerm, $options: 'i' }
    }).limit(3);
    
    suppliers.forEach(supplier => {
      results.push({
        type: 'supplier',
        data: supplier.toObject()
      });
    });
    
    res.json(results.slice(0, 10));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;