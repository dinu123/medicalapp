const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  batchId: { type: String }
});

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['sale', 'purchase'], required: true, default: 'sale' },
  customerId: { type: String },
  customerName: { type: String },
  supplierId: { type: String }, // For purchases
  supplierName: { type: String }, // For purchases
  doctorName: { type: String },
  doctorRegNo: { type: String },
  isRghs: { type: Boolean, default: false },
  items: [transactionItemSchema],
  total: { type: Number, required: true, min: 0 },
  discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
  status: { type: String, enum: ['paid', 'credit'], required: true },
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'UPI', 'Bank'] },
  attachedPrescriptions: { type: Map, of: String },
  invoiceNumber: { type: String } // For purchases
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);