const Notification = require('../models/Notification');

/**
 * Persists a notification in MongoDB and broadcasts it in real time via Socket.io
 * to everyone connected to the room.
 */
async function sendRoomNotification(req, { roomId, actorId, type, title, message, meta = {} }) {
  try {
    const doc = await Notification.create({
      room: roomId,
      actor: actorId,
      type,
      title,
      message,
      meta,
      readBy: [actorId],
    });

    const populated = await Notification.findById(doc._id).populate(
      'actor',
      'name avatarColor'
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`room:${roomId.toString()}`).emit('room:notification', populated);
      io.to(`room:${roomId.toString()}`).emit('room:data_updated', { type });
    }
    return populated;
  } catch (err) {
    console.error('Notification error:', err.message);
    return null;
  }
}

module.exports = { sendRoomNotification };
