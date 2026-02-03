const express = require('express');
const { body, validationResult } = require('express-validator');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all purchases
router.get('/', auth, async (req, res) => {
  try {
    const purchases = await Purchase.find().populate('supplierId').sort({ createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get purchase by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('supplierId');
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create purchase
router.post('/', [auth, [
  body('supplierId').notEmpty().withMessage('Supplier ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('total').isNumeric().withMessage('Total must be a number'),
  body('status').isIn(['paid', 'credit']).withMessage('Invalid status')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const purchase = new Purchase(req.body);
    
    // Update stock for each item
    for (const item of purchase.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const batch = product.batches.id(item.batchId);
        if (batch) {
          batch.stock += item.quantity;
          await product.save();
        }
      }
    }

    await purchase.save();
    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update purchase
router.put('/:id', auth, async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;