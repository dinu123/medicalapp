const express = require('express');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    
    // Monthly sales
    const monthlySales = await Transaction.aggregate([
      {
        $match: {
          type: 'sale',
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    // Monthly purchases
    const monthlyPurchases = await Transaction.aggregate([
      {
        $match: {
          type: 'purchase',
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    // Get all products for stock analysis
    const products = await Product.find();
    
    let lowStockCount = 0;
    let expiringSoonCount = 0;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    products.forEach(product => {
      const totalStock = product.batches.reduce((sum, batch) => sum + batch.stock, 0);
      const minStock = product.minStock || 20;
      
      // Check low stock
      if (totalStock > 0 && totalStock < minStock) {
        lowStockCount++;
      }
      
      // Check expiring soon
      product.batches.forEach(batch => {
        const expiryDate = new Date(batch.expiryDate);
        if (expiryDate > now && expiryDate <= thirtyDaysFromNow && batch.stock > 0) {
          expiringSoonCount++;
        }
      });
    });
    
    res.json({
      monthlySales: monthlySales[0]?.total || 0,
      monthlyPurchases: monthlyPurchases[0]?.total || 0,
      lowStockCount,
      expiringSoonCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard analytics with detailed alerts
router.get('/alerts', auth, async (req, res) => {
  try {
    const currentDate = new Date();
    const thirtyDaysFromNow = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const products = await Product.find();
    
    // Low stock items
    const lowStockItems = products.filter(product => {
      const totalStock = product.batches.reduce((sum, batch) => sum + batch.stock, 0);
      return totalStock > 0 && totalStock < (product.minStock || 20);
    }).map(product => ({
      name: product.name,
      currentStock: product.batches.reduce((sum, batch) => sum + batch.stock, 0),
      minStock: product.minStock || 20
    }));
    
    // Expiring items
    const expiringItems = products.flatMap(product => 
      product.batches
        .filter(batch => {
          const expiryDate = new Date(batch.expiryDate);
          return batch.stock > 0 && expiryDate > currentDate && expiryDate <= thirtyDaysFromNow;
        })
        .map(batch => ({
          productName: product.name,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          stock: batch.stock,
          daysToExpiry: Math.ceil((new Date(batch.expiryDate) - currentDate) / (1000 * 60 * 60 * 24))
        }))
    );
    
    res.json({
      lowStockItems,
      expiringItems
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;