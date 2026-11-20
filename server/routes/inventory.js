const express = require('express');
const InventoryItem = require('../models/InventoryItem');
const Expense = require('../models/Expense');
const Room = require('../models/Room');
const { protect, requireRoom } = require('../middleware/auth');
const { sendRoomNotification } = require('../utils/notify');

const router = express.Router();

const STATUS_LABELS = {
  in_stock: 'In Stock',
  low: 'Hone Wala Hai (Low Stock)',
  out: 'Khatm Ho Gaya (Out of Stock)',
};

// GET /api/inventory
router.get('/', protect, requireRoom, async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = { room: req.user.room };
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'All') filter.category = category;

    const items = await InventoryItem.find(filter)
      .populate('updatedBy', 'name avatarColor')
      .sort({ status: -1, updatedAt: -1 });

    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventory
router.post('/', protect, requireRoom, async (req, res) => {
  try {
    const { name, category = 'Kitchen', quantity = '', status = 'out', notes = '' } = req.body;
    if (!name) return res.status(400).json({ message: 'Item name is required' });

    const item = await InventoryItem.create({
      room: req.user.room,
      name: name.trim(),
      category,
      quantity,
      status,
      notes,
      updatedBy: req.user._id,
    });

    const populated = await InventoryItem.findById(item._id).populate('updatedBy', 'name avatarColor');

    if (status === 'low' || status === 'out') {
      await sendRoomNotification(req, {
        roomId: req.user.room,
        actorId: req.user._id,
        type: 'inventory',
        title: status === 'out' ? `Item Khatm: ${populated.name}` : `Low Stock: ${populated.name}`,
        message: `${req.user.name} marked "${populated.name}" as ${STATUS_LABELS[status]}.`,
        meta: { itemId: item._id, status },
      });
    }

    res.status(201).json({ item: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/inventory/:id/status
router.patch('/:id/status', protect, requireRoom, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['in_stock', 'low', 'out'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, room: req.user.room },
      { status, updatedBy: req.user._id },
      { new: true }
    ).populate('updatedBy', 'name avatarColor');

    if (!item) return res.status(404).json({ message: 'Item not found' });

    await sendRoomNotification(req, {
      roomId: req.user.room,
      actorId: req.user._id,
      type: 'inventory',
      title: `Stock Update: ${item.name}`,
      message: `${req.user.name} updated "${item.name}" → ${STATUS_LABELS[status]}.`,
      meta: { itemId: item._id, status },
    });

    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventory/:id/restock — Marks item in_stock & optionally creates an Expense!
router.post('/:id/restock', protect, requireRoom, async (req, res) => {
  try {
    const { amount, addExpense = false, splitBetween } = req.body;
    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, room: req.user.room },
      { status: 'in_stock', updatedBy: req.user._id },
      { new: true }
    ).populate('updatedBy', 'name avatarColor');

    if (!item) return res.status(404).json({ message: 'Item not found' });

    let createdExpense = null;
    if (addExpense && Number(amount) > 0) {
      const numericAmount = Number(amount);
      const room = await Room.findById(req.user.room);
      const participants =
        Array.isArray(splitBetween) && splitBetween.length > 0
          ? splitBetween
          : room.members.map((m) => m.toString());

      const baseShare = Number((numericAmount / participants.length).toFixed(2));
      const splits = participants.map((uid, idx) =>
        idx === participants.length - 1
          ? { user: uid, share: Number((numericAmount - baseShare * (participants.length - 1)).toFixed(2)) }
          : { user: uid, share: baseShare }
      );

      const categoryMap = {
        Kitchen: 'Food & Groceries',
        'Snacks & Drinks': 'Food & Groceries',
        Cleaning: 'Cleaning & Essentials',
        Bathroom: 'Cleaning & Essentials',
        Utility: 'Other',
      };

      createdExpense = await Expense.create({
        room: req.user.room,
        title: `${item.name}${item.quantity ? ` (${item.quantity})` : ''}`,
        amount: numericAmount,
        category: categoryMap[item.category] || 'Food & Groceries',
        paidBy: req.user._id,
        splitType: 'equal',
        splits,
        addedBy: req.user._id,
      });
    }

    await sendRoomNotification(req, {
      roomId: req.user.room,
      actorId: req.user._id,
      type: 'inventory',
      title: `Restocked: ${item.name}`,
      message: createdExpense
        ? `${req.user.name} bought "${item.name}" for ₹${Number(amount).toFixed(2)} and added it to expenses.`
        : `${req.user.name} marked "${item.name}" as In Stock.`,
    });

    res.json({ item, expense: createdExpense });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', protect, requireRoom, async (req, res) => {
  try {
    const item = await InventoryItem.findOneAndDelete({ _id: req.params.id, room: req.user.room });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Inventory item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
