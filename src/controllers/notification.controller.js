'use strict';

const prisma = require('../config/prisma');

// GET /api/notifications — user's notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take:    30,
    });
    const unread = notifications.filter(n => !n.isRead).length;
    return res.json({ success: true, data: notifications, unread });
  } catch (err) { next(err); }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data:  { isRead: true },
    });
    return res.json({ success: true });
  } catch (err) { next(err); }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data:  { isRead: true },
    });
    return res.json({ success: true });
  } catch (err) { next(err); }
};

// Helper — create notification in DB
async function createNotification({ userId, type, title, body, orderId }) {
  try {
    return await prisma.notification.create({
      data: { userId, type, title, body, orderId: orderId || null },
    });
  } catch (err) {
    console.error('[NOTIFICATION]', err.message);
  }
}

module.exports.createNotification = createNotification;
