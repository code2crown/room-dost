const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: {
      type: String,
      enum: ['Kitchen', 'Bathroom', 'Cleaning', 'Snacks & Drinks', 'Utility', 'Other'],
      default: 'Kitchen',
    },
    quantity: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['in_stock', 'low', 'out'],
      default: 'out',
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 200, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
