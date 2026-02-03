const express = require('express');
const { body, validationResult } = require('express-validator');
const Supplier = require('../models/Supplier');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all suppliers
router.get('/', auth, async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search suppliers
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    console.log('Search query:', q);
    
    if (!q) {
      return res.json([]);
    }

    const searchRegex = new RegExp(q, 'i');
    const suppliers = await Supplier.find({
      $or: [
        { name: searchRegex },
        { contact: searchRegex },
        { gstin: searchRegex },
        { dlNumber: searchRegex },
        { foodLicenseNumber: searchRegex },
        { address: searchRegex }
      ]
    });
    
    console.log('Found suppliers:', suppliers.length);
    res.json(suppliers);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get supplier by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create supplier
router.post('/', [auth, [
  body('name').notEmpty().withMessage('Supplier name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('contact').notEmpty().withMessage('Contact is required'),
  body('gstin').notEmpty().withMessage('GSTIN is required'),
  body('dlNumber').notEmpty().withMessage('DL Number is required'),
  body('foodLicenseNumber').notEmpty().withMessage('Food License Number is required')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update supplier
router.put('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete supplier
router.delete('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;