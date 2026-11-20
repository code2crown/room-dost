const mongoose = require('mongoose');

const CATEGORIES = [
  'Food & Groceries',
  'Rent',
  'Electricity',
  'WiFi',
  'Gas & Water',
  'Cleaning & Essentials',
  'Outing',
  'Other',
];

const splitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    share: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, enum: CATEGORIES, default: 'Food & Groceries' },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    splitType: { type: String, enum: ['equal', 'custom'], default: 'equal' },
    splits: {
      type: [splitSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one roommate must be included in the split.',
      },
    },
    date: { type: Date, default: Date.now, index: true },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

expenseSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Expense', expenseSchema);
