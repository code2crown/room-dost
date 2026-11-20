const express = require('express');
const Expense = require('../models/Expense');
const Room = require('../models/Room');
const { protect, requireRoom } = require('../middleware/auth');
const { sendRoomNotification } = require('../utils/notify');

const router = express.Router();

// GET /api/expenses?month=2026-11&category=Food&search=milk
router.get('/', protect, requireRoom, async (req, res) => {
  try {
    const { month, category, paidBy, search } = req.query;
    const filter = { room: req.user.room };

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      filter.date = {
        $gte: new Date(y, m - 1, 1),
        $lt: new Date(y, m, 1),
      };
    }
    if (category && category !== 'All') filter.category = category;
    if (paidBy && paidBy !== 'All') filter.paidBy = paidBy;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name avatarColor')
      .populate('splits.user', 'name avatarColor')
      .populate('addedBy', 'name')
      .sort({ date: -1, createdAt: -1 });

    res.json({ expenses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/expenses
router.post('/', protect, requireRoom, async (req, res) => {
  try {
    const { title, amount, category, paidBy, splitType = 'equal', splitBetween, customSplits, date, notes } = req.body;
    const numericAmount = Number(amount);
    if (!title || !numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: 'Valid item name and amount are required' });
    }

    let splits = [];
    if (splitType === 'custom' && Array.isArray(customSplits) && customSplits.length > 0) {
      const totalCustom = customSplits.reduce((acc, s) => acc + Number(s.share || 0), 0);
      if (Math.abs(totalCustom - numericAmount) > 1) {
        return res.status(400).json({
          message: `Custom split total (₹${totalCustom.toFixed(2)}) must equal expense amount (₹${numericAmount.toFixed(2)})`,
        });
      }
      splits = customSplits
        .filter((s) => Number(s.share) > 0)
        .map((s) => ({ user: s.user, share: Number(Number(s.share).toFixed(2)) }));
    } else {
      const room = await Room.findById(req.user.room);
      const participants =
        Array.isArray(splitBetween) && splitBetween.length > 0
          ? splitBetween
          : room.members.map((m) => m.toString());

      const baseShare = Number((numericAmount / participants.length).toFixed(2));
      splits = participants.map((uid, idx) => {
        if (idx === participants.length - 1) {
          const prevSum = baseShare * (participants.length - 1);
          return { user: uid, share: Number((numericAmount - prevSum).toFixed(2)) };
        }
        return { user: uid, share: baseShare };
      });
    }

    const expense = await Expense.create({
      room: req.user.room,
      title: title.trim(),
      amount: numericAmount,
      category: category || 'Food & Groceries',
      paidBy: paidBy || req.user._id,
      splitType,
      splits,
      date: date ? new Date(date) : new Date(),
      notes: notes || '',
      addedBy: req.user._id,
    });

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name avatarColor')
      .populate('splits.user', 'name avatarColor')
      .populate('addedBy', 'name');

    await sendRoomNotification(req, {
      roomId: req.user.room,
      actorId: req.user._id,
      type: 'expense',
      title: `New Expense: ₹${numericAmount.toFixed(0)}`,
      message: `${populated.paidBy.name} paid ₹${numericAmount.toFixed(2)} for "${populated.title}" (${populated.category}), split among ${populated.splits.length} roommates.`,
      meta: { expenseId: expense._id, amount: numericAmount, category: populated.category },
    });

    res.status(201).json({ expense: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', protect, requireRoom, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, room: req.user.room });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    await sendRoomNotification(req, {
      roomId: req.user.room,
      actorId: req.user._id,
      type: 'expense',
      title: 'Expense Removed',
      message: `${req.user.name} deleted "${expense.title}" (₹${expense.amount}).`,
    });

    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/expenses/analytics?month=2026-11
router.get('/analytics', protect, requireRoom, async (req, res) => {
  try {
    const { month } = req.query;
    const filter = { room: req.user.room };

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      filter.date = {
        $gte: new Date(y, m - 1, 1),
        $lt: new Date(y, m, 1),
      };
    }

    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name avatarColor')
      .populate('splits.user', 'name avatarColor');

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryMap = {};
    const memberPaidMap = {};
    const memberShareMap = {};

    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
      const pName = e.paidBy?.name || 'Unknown';
      memberPaidMap[pName] = (memberPaidMap[pName] || 0) + e.amount;

      e.splits.forEach((sp) => {
        const sName = sp.user?.name || 'Unknown';
        memberShareMap[sName] = (memberShareMap[sName] || 0) + sp.share;
      });
    });

    const byCategory = Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
        percent: totalSpent ? Number(((value / totalSpent) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const memberNames = Array.from(
      new Set([...Object.keys(memberPaidMap), ...Object.keys(memberShareMap)])
    );
    const byMember = memberNames.map((name) => ({
      name,
      paid: Number((memberPaidMap[name] || 0).toFixed(2)),
      share: Number((memberShareMap[name] || 0).toFixed(2)),
    }));

    res.json({
      totalSpent: Number(totalSpent.toFixed(2)),
      count: expenses.length,
      byCategory,
      byMember,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/expenses/export?month=2026-11
router.get('/export', protect, requireRoom, async (req, res) => {
  try {
    const { month } = req.query;
    const filter = { room: req.user.room };
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
    }
    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name')
      .populate('splits.user', 'name')
      .sort({ date: -1 });

    const header = 'Date,Item,Category,Amount (INR),Paid By,Split Between,Notes';
    const rows = expenses.map((e) => {
      const dt = new Date(e.date).toISOString().split('T')[0];
      const splitNames = e.splits.map((s) => `${s.user?.name || ''}(₹${s.share})`).join(' | ');
      const esc = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
      return [dt, esc(e.title), esc(e.category), e.amount, esc(e.paidBy?.name), esc(splitNames), esc(e.notes)].join(',');
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="room-dost-expenses-${month || 'all'}.csv"`);
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
