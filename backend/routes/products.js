const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get inventory statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const products = await Product.find();
    
    let totalItems = products.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValue = 0;
    
    products.forEach(product => {
      const totalStock = product.batches.reduce((sum, batch) => sum + batch.stock, 0);
      const minStock = product.minStock || 20;
      
      if (totalStock === 0) {
        outOfStockCount++;
      } else if (totalStock < minStock) {
        lowStockCount++;
      }
      
      totalValue += product.batches.reduce((sum, batch) => sum + (batch.stock * batch.price), 0);
    });
    
    res.json({ totalItems, lowStockCount, outOfStockCount, totalValue });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get filtered products
router.get('/filter', auth, async (req, res) => {
  try {
    const { search, category, status, tag } = req.query;
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'All Categories') {
      query.category = category;
    }
    
    if (tag === 'ordered') {
      query.isOrdered = true;
    } else if (tag === 'order_later') {
      query.orderLater = true;
    }
    
    let products = await Product.find(query);
    
    if (status && status !== 'all') {
      products = products.filter(product => {
        const totalStock = product.batches.reduce((sum, batch) => sum + batch.stock, 0);
        const minStock = product.minStock || 20;
        
        if (status === 'out_of_stock') {
          return totalStock === 0;
        } else if (status === 'low_stock') {
          return totalStock > 0 && totalStock < minStock;
        }
        return true;
      });
    }
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search products
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) {
      return res.json([]);
    }
    
    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { manufacturer: { $regex: q, $options: 'i' } },
        { salts: { $regex: q, $options: 'i' } }
      ]
    }).limit(10);
    
    // Filter products with stock > 0
    const productsWithStock = products.filter(product => 
      product.batches.some(batch => batch.stock > 0)
    );
    
    res.json(productsWithStock);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get expiring products
router.get('/expiring', auth, async (req, res) => {
  try {
    const { filter = '30' } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const products = await Product.find();
    let expiringBatches = [];
    
    products.forEach(product => {
      product.batches.forEach(batch => {
        if (batch.stock > 0) {
          const expiryDate = new Date(batch.expiryDate);
          let shouldInclude = false;
          
          if (filter === 'expired') {
            shouldInclude = expiryDate < today;
          } else {
            const daysAhead = parseInt(filter);
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + daysAhead);
            shouldInclude = expiryDate >= today && expiryDate <= futureDate;
          }
          
          if (shouldInclude) {
            expiringBatches.push({
              ...batch.toObject(),
              product: {
                _id: product._id,
                name: product.name,
                manufacturer: product.manufacturer
              },
              daysRemaining: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
            });
          }
        }
      });
    });
    
    expiringBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    
    res.json(expiringBatches);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get product by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create product
router.post('/', [auth, [
  body('name').notEmpty().withMessage('Product name is required'),
  body('hsnCode').notEmpty().withMessage('HSN code is required'),
  body('pack').notEmpty().withMessage('Pack is required'),
  body('manufacturer').notEmpty().withMessage('Manufacturer is required')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update stock for a specific batch
router.put('/:id/batch/:batchId/stock', auth, async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const batch = product.batches.id(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    batch.stock = stock;
    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product batch discount
router.put('/:id/batch/:batchId/discount', auth, async (req, res) => {
  try {
    const { id, batchId } = req.params;
    const { discount } = req.body;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const batch = product.batches.id(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    batch.saleDiscount = discount;
    await product.save();
    
    res.json({ message: 'Discount updated successfully', batch });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;