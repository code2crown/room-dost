const express = require('express');
const Notification = require('../models/Notification');
const { protect, requireRoom } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', protect, requireRoom, async (req, res) => {
  try {
    const notifications = await Notification.find({ room: req.user.room })
      .populate('actor', 'name avatarColor')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter(
      (n) => !n.readBy.some((id) => id.toString() === req.user._id.toString())
    ).length;

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', protect, requireRoom, async (req, res) => {
  try {
    await Notification.updateMany(
      { room: req.user.room, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
