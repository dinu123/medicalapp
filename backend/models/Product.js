const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  stock: { type: Number, required: true, min: 0 },
  mrp: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  saleDiscount: { type: Number, default: 0, min: 0, max: 100 }
});

const productSchema = new mongoose.Schema({
  hsnCode: { type: String, required: true },
  name: { type: String, required: true },
  pack: { type: String, required: true },
  manufacturer: { type: String, required: true },
  salts: { type: String },
  schedule: { type: String, enum: ['none', 'H', 'H1', 'narcotic', 'tb'], default: 'none' },
  batches: [batchSchema],
  category: { type: String },
  minStock: { type: Number, default: 0 },
  orderLater: { type: Boolean, default: false },
  isOrdered: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);