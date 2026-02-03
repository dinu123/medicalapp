const express = require('express');
const { body, validationResult } = require('express-validator');
const PurchaseOrder = require('../models/PurchaseOrder');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all purchase orders
router.get('/', auth, async (req, res) => {
  try {
    const purchaseOrders = await PurchaseOrder.find().sort({ createdAt: -1 });
    res.json(purchaseOrders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create purchase order
router.post('/', [auth, [
  body('supplierId').notEmpty().withMessage('Supplier ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('totalValue').isNumeric().withMessage('Total value must be a number')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const purchaseOrder = new PurchaseOrder(req.body);
    await purchaseOrder.save();
    res.status(201).json(purchaseOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update purchase order status
router.put('/:id', auth, async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    res.json(purchaseOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;