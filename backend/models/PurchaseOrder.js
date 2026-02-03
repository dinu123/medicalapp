const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  manufacturer: { type: String, default: '' },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true }
});

const purchaseOrderSchema = new mongoose.Schema({
  supplierId: { type: String, required: true },
  items: [purchaseOrderItemSchema],
  totalValue: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'received', 'cancelled'], default: 'pending' }
}, {
  timestamps: true
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);