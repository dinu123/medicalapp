const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all transactions
router.get('/', auth, async (req, res) => {
  try {
    // Update existing transactions without type field
    await Transaction.updateMany(
      { type: { $exists: false } },
      { $set: { type: 'sale' } }
    );
    
    const transactions = await Transaction.find().populate('customerId').sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transaction statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const totalTransactions = await Transaction.countDocuments();
    const totalSales = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalPurchases = await Transaction.countDocuments({ type: 'purchase' });
    
    res.json({
      totalTransactions,
      totalSales: totalSales[0]?.total || 0,
      totalPurchases
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get filtered transactions
router.get('/filter', auth, async (req, res) => {
  try {
    const { type, period, status, startDate, endDate, customerId, productSearch, partySearch, paymentMethods, schedules } = req.query;
    let query = {};
    let andConditions = [];
    
    if (type && type !== 'all') {
      query.type = type; // 'sale' or 'purchase'
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (customerId) {
      query.customerId = customerId;
    }
    
    // Payment method filtering (multiple) - OR within payment methods
    if (paymentMethods) {
      const methods = Array.isArray(paymentMethods) ? paymentMethods : [paymentMethods];
      const paymentQuery = [];
      
      methods.forEach(method => {
        if (method === 'Credit') {
          paymentQuery.push({ status: 'credit' });
        } else {
          paymentQuery.push({ paymentMethod: { $regex: method, $options: 'i' } });
        }
      });
      
      if (paymentQuery.length > 0) {
        andConditions.push({ $or: paymentQuery });
      }
    }
    
    // Date filtering
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (period && period !== 'all') {
      const now = new Date();
      let dateFilter = {};
      
      switch (period) {
        case 'today':
          dateFilter = {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lt: new Date(now.setHours(23, 59, 59, 999))
          };
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = { $gte: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = { $gte: monthAgo };
          break;
      }
      
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }
    }
    
    // Product search - search in items array
    if (productSearch && productSearch.length >= 3) {
      query['items.productName'] = { $regex: productSearch, $options: 'i' };
    }
    
    // Party search - search in customer/supplier names - OR within party search
    if (partySearch && partySearch.length >= 3) {
      const partyQuery = [
        { customerName: { $regex: partySearch, $options: 'i' } },
        { supplierName: { $regex: partySearch, $options: 'i' } }
      ];
      andConditions.push({ $or: partyQuery });
    }
    
    // Schedule filtering - need to populate products to filter by schedule
    if (schedules) {
      const scheduleArray = Array.isArray(schedules) ? schedules : [schedules];
      // First get all products with matching schedules
      const products = await Product.find({ schedule: { $in: scheduleArray } });
      const productIds = products.map(p => p._id.toString());
      
      // Then find transactions that contain these products
      query['items.productId'] = { $in: productIds };
    }
    
    // Combine all AND conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }
    
    const transactions = await Transaction.find(query)
      .populate('customerId')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get chart data for financial overview
router.get('/chart/:range', auth, async (req, res) => {
  try {
    const { range } = req.params;
    const endDate = new Date();
    let startDate, groupBy;
    
    switch (range) {
      case 'day':
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 29);
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(endDate.getDate() - 84); // 12 weeks
        groupBy = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
        break;
      case 'month':
      default:
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);
        groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        break;
    }
    
    const chartData = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            period: groupBy,
            type: "$type"
          },
          total: { $sum: "$total" },
          date: { $first: "$createdAt" }
        }
      },
      {
        $group: {
          _id: "$_id.period",
          sales: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "sale"] }, "$total", 0]
            }
          },
          purchases: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "purchase"] }, "$total", 0]
            }
          },
          date: { $first: "$date" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(chartData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transaction by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('customerId');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create transaction
router.post('/', [auth, [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('total').isNumeric().withMessage('Total must be a number'),
  body('status').isIn(['paid', 'credit']).withMessage('Invalid status')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const transaction = new Transaction(req.body);
    
    // Note: Stock updates would need to be handled separately 
    // since we're using string IDs that don't match MongoDB ObjectIds
    // For now, just save the transaction
    
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update transaction
router.put('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get sales analytics
router.get('/analytics/summary', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [dailySales, monthlySales, totalTransactions] = await Promise.all([
      Transaction.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]),
      Transaction.countDocuments()
    ]);

    res.json({
      dailySales: dailySales[0] || { total: 0, count: 0 },
      monthlySales: monthlySales[0] || { total: 0, count: 0 },
      totalTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;