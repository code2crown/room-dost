const express = require('express');
const Room = require('../models/Room');
const User = require('../models/User');
const { protect, requireRoom } = require('../middleware/auth');
const { sendRoomNotification } = require('../utils/notify');

const router = express.Router();

// POST /api/rooms/create
router.post('/create', protect, async (req, res) => {
  try {
    const { name, address, monthlyRent, wifiBill } = req.body;
    if (!name) return res.status(400).json({ message: 'Room name is required' });

    const room = await Room.create({
      name: name.trim(),
      address: address || '',
      monthlyRent: Number(monthlyRent) || 0,
      wifiBill: Number(wifiBill) || 0,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    req.user.room = room._id;
    req.user.role = 'admin';
    await req.user.save();

    const populated = await Room.findById(room._id).populate(
      'members',
      'name email phone upiId avatarColor role'
    );
    res.status(201).json({ room: populated, user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rooms/join
router.post('/join', protect, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ message: 'Invite code is required' });

    const room = await Room.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!room) return res.status(404).json({ message: 'Invalid invite code. Room not found.' });

    const alreadyMember = room.members.some((m) => m.toString() === req.user._id.toString());
    if (!alreadyMember) {
      room.members.push(req.user._id);
      await room.save();
    }

    req.user.room = room._id;
    req.user.role = room.createdBy.toString() === req.user._id.toString() ? 'admin' : 'member';
    await req.user.save();

    await sendRoomNotification(req, {
      roomId: room._id,
      actorId: req.user._id,
      type: 'room',
      title: 'New Roommate Joined!',
      message: `${req.user.name} joined ${room.name}.`,
    });

    const populated = await Room.findById(room._id).populate(
      'members',
      'name email phone upiId avatarColor role'
    );
    res.json({ room: populated, user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/mine
router.get('/mine', protect, requireRoom, async (req, res) => {
  try {
    const room = await Room.findById(req.user.room).populate(
      'members',
      'name email phone upiId avatarColor role'
    );
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/rooms/settings
router.put('/settings', protect, requireRoom, async (req, res) => {
  try {
    const { name, address, monthlyRent, wifiBill } = req.body;
    const room = await Room.findById(req.user.room);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (name) room.name = name.trim();
    if (address !== undefined) room.address = address.trim();
    if (monthlyRent !== undefined) room.monthlyRent = Number(monthlyRent) || 0;
    if (wifiBill !== undefined) room.wifiBill = Number(wifiBill) || 0;
    await room.save();

    const populated = await Room.findById(room._id).populate(
      'members',
      'name email phone upiId avatarColor role'
    );
    res.json({ room: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rooms/regenerate-code
router.post('/regenerate-code', protect, requireRoom, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only room admin can regenerate invite code' });
    }
    const room = await Room.findById(req.user.room);
    room.inviteCode = Room.generateInviteCode();
    await room.save();
    res.json({ inviteCode: room.inviteCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/rooms/members/:memberId
router.delete('/members/:memberId', protect, requireRoom, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only room admin can remove members' });
    }
    const { memberId } = req.params;
    if (memberId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Admin cannot remove themselves' });
    }
    await Room.findByIdAndUpdate(req.user.room, { $pull: { members: memberId } });
    await User.findByIdAndUpdate(memberId, { room: null, role: 'member' });
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
