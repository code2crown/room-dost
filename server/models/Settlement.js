const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ['UPI', 'Cash', 'Bank Transfer', 'Other'], default: 'UPI' },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    date: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settlement', settlementSchema);
