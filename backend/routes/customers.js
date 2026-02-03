const express = require('express');
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

const router = express.Router();

// Search customers by name - MUST be before /:id route
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 3) {
      return res.json([]);
    }
    
    const customers = await Customer.find({
      name: { $regex: q, $options: 'i' }
    }).limit(10);
    
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create or update customer
router.post('/', [auth, [
  body('name').notEmpty().withMessage('Name is required'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phoneNumber } = req.body;
    
    // Check if customer already exists
    let customer = await Customer.findOne({ phoneNumber });
    
    if (customer) {
      // Update existing customer
      customer.name = name;
      await customer.save();
    } else {
      // Create new customer
      customer = new Customer({
        name,
        phoneNumber,
        customerId: `CUST-${Date.now()}`
      });
      await customer.save();
    }
    
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;