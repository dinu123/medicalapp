const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Search invoices for returns
router.get('/search', auth, async (req, res) => {
  try {
    const { q: searchTerm, type } = req.query;
    
    if (!searchTerm || !type) {
      return res.status(400).json({ message: 'Search term and type are required' });
    }

    const term = searchTerm.toLowerCase();
    let results = [];

    if (type === 'customer') {
      // Search in transactions collection
      const Transaction = require('../models/Transaction');
      const searchQuery = {
        $or: [
          { customerName: new RegExp(term, 'i') },
          { invoiceNumber: new RegExp(term, 'i') }
        ]
      };
      
      // If term looks like ObjectId, search by _id
      if (term.match(/^[0-9a-fA-F]{24}$/)) {
        searchQuery.$or.push({ _id: term });
      }
      
      results = await Transaction.find(searchQuery);
    } else if (type === 'supplier') {
      // Search in purchases collection
      const Purchase = require('../models/Purchase');
      const searchQuery = {
        $or: [
          { invoiceNumber: new RegExp(term, 'i') }
        ]
      };
      
      // If term looks like ObjectId, search by _id
      if (term.match(/^[0-9a-fA-F]{24}$/)) {
        searchQuery.$or.push({ _id: term });
      }
      
      results = await Purchase.find(searchQuery).populate('supplierId');
    }

    res.json(results);
  } catch (error) {
    console.error('Search invoices error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Process customer return
router.post('/customer', auth, async (req, res) => {
  try {
    const { originalTransactionId, items, totalAmount, settlementType } = req.body;

    console.log('Received return data:', req.body); // Debug log

    // Validate required fields
    if (!originalTransactionId) {
      return res.status(400).json({ message: 'Original transaction ID is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required and cannot be empty' });
    }
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Total amount must be greater than 0' });
    }

    const Transaction = require('../models/Transaction');
    const Product = require('../models/Product');
    const Return = require('../models/Return');

    // Verify original transaction exists
    const originalTransaction = await Transaction.findById(originalTransactionId);
    if (!originalTransaction) {
      return res.status(404).json({ message: 'Original transaction not found' });
    }

    // Create return record
    const returnData = {
      type: 'customer',
      originalTransactionId,
      items,
      totalAmount,
      settlementType,
      status: 'completed',
      processedBy: req.user.id
    };

    // If voucher settlement, create voucher record
    if (settlementType === 'voucher') {
      returnData.voucherId = `VCHR-${Date.now()}`;
    }

    const newReturn = new Return(returnData);
    await newReturn.save();

    res.json({ 
      success: true, 
      message: 'Customer return processed successfully',
      return: newReturn 
    });
  } catch (error) {
    console.error('Process customer return error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Process supplier return
router.post('/supplier', auth, async (req, res) => {
  try {
    const { originalPurchaseId, items, totalAmount } = req.body;

    // Validate required fields
    if (!originalPurchaseId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid return data' });
    }

    const Purchase = require('../models/Purchase');
    const Product = require('../models/Product');
    const Return = require('../models/Return');

    // Verify original purchase exists
    const originalPurchase = await Purchase.findById(originalPurchaseId);
    if (!originalPurchase) {
      return res.status(404).json({ message: 'Original purchase not found' });
    }

    // Create return record
    const returnData = {
      type: 'supplier',
      originalPurchaseId,
      supplierId: originalPurchase.supplierId,
      items,
      totalAmount,
      settlementType: originalPurchase.status === 'paid' ? 'credit_note' : 'ledger_adjustment',
      status: 'completed',
      processedBy: req.user.id
    };

    // If credit note settlement, create credit note
    if (returnData.settlementType === 'credit_note') {
      returnData.creditNoteId = `CN-${Date.now()}`;
    }

    const newReturn = new Return(returnData);
    await newReturn.save();

    res.json({ 
      success: true, 
      message: 'Supplier return processed successfully',
      return: newReturn 
    });
  } catch (error) {
    console.error('Process supplier return error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get returns history
router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const Return = require('../models/Return');
    
    let query = {};
    if (type && ['customer', 'supplier'].includes(type)) {
      query.type = type;
    }
    
    const returns = await Return.find(query)
      .sort({ createdAt: -1 })
      .limit(100); // Limit to recent 100 returns
    
    res.json(returns);
  } catch (error) {
    console.error('Get returns error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;