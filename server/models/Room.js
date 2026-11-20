const mongoose = require('mongoose');
const crypto = require('crypto');

const generateCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    address: { type: String, trim: true, default: '' },
    inviteCode: { type: String, unique: true, uppercase: true, default: generateCode },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    monthlyRent: { type: Number, default: 0, min: 0 },
    wifiBill: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

roomSchema.statics.generateInviteCode = generateCode;

module.exports = mongoose.model('Room', roomSchema);
