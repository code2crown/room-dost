const express = require('express');
const Room = require('../models/Room');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const { protect, requireRoom } = require('../middleware/auth');
const { calculateSettlements } = require('../utils/debtSimplifier');
const { sendRoomNotification } = require('../utils/notify');

const router = express.Router();

// GET /api/settlements/summary
router.get('/summary', protect, requireRoom, async (req, res) => {
  try {
    const room = await Room.findById(req.user.room).populate(
      'members',
      'name email upiId avatarColor'
    );
    const expenses = await Expense.find({ room: req.user.room });
    const settlements = await Settlement.find({ room: req.user.room })
      .populate('from', 'name avatarColor upiId')
      .populate('to', 'name avatarColor upiId')
      .sort({ date: -1, createdAt: -1 });

    const { balances, transfers } = calculateSettlements(room.members, expenses, settlements);

    res.json({ balances, transfers, history: settlements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/settlements
router.post('/', protect, requireRoom, async (req, res) => {
  try {
    const { from, to, amount, method = 'UPI', note = '' } = req.body;
    const numericAmount = Number(amount);
    if (!from || !to || !numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: 'From, To, and valid amount are required' });
    }
    if (from === to) {
      return res.status(400).json({ message: 'Cannot settle with yourself' });
    }

    const settlement = await Settlement.create({
      room: req.user.room,
      from,
      to,
      amount: numericAmount,
      method,
      note,
      recordedBy: req.user._id,
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('from', 'name avatarColor')
      .populate('to', 'name avatarColor');

    await sendRoomNotification(req, {
      roomId: req.user.room,
      actorId: req.user._id,
      type: 'settlement',
      title: `Payment Settled: ₹${numericAmount.toFixed(0)}`,
      message: `${populated.from.name} paid ₹${numericAmount.toFixed(2)} to ${populated.to.name} via ${method}.`,
      meta: { settlementId: settlement._id },
    });

    res.status(201).json({ settlement: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/settlements/:id
router.delete('/:id', protect, requireRoom, async (req, res) => {
  try {
    const deleted = await Settlement.findOneAndDelete({ _id: req.params.id, room: req.user.room });
    if (!deleted) return res.status(404).json({ message: 'Settlement not found' });
    res.json({ message: 'Settlement removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
