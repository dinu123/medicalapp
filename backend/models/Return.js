const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  batchId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  amount: { type: Number, required: true, min: 0 }
});

const returnSchema = new mongoose.Schema({
  type: { type: String, enum: ['customer', 'supplier'], required: true },
  originalTransactionId: { type: String }, // For customer returns
  originalPurchaseId: { type: String }, // For supplier returns
  supplierId: { type: String }, // For supplier returns
  items: [returnItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  settlementType: { type: String, enum: ['refund', 'voucher', 'credit_note', 'ledger_adjustment'] },
  voucherId: { type: String }, // If settlement is voucher
  creditNoteId: { type: String }, // If settlement is credit note
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  processedBy: { type: String }, // User who processed the return
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Return', returnSchema);