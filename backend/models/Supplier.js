const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  contact: { type: String, required: true },
  gstin: { type: String, required: true },
  dlNumber: { type: String, required: true },
  foodLicenseNumber: { type: String, required: true },
  defaultDiscount: { type: Number, default: 0, min: 0, max: 100 }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);