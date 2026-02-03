const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  batchId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 }
});

const purchaseSchema = new mongoose.Schema({
  supplierId: { type: String, required: true },
  invoiceNumber: { type: String },
  items: [purchaseItemSchema],
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['paid', 'credit'], required: true },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'upi'] },
  notes: { type: String },
  sourceFileId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);