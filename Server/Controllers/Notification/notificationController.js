// Controllers/notifications/notificationController.js
import mongoose from "mongoose";
import { Notification } from "../../Models/activityModal/notificationModal.js";

/* ══════════════════════════════════════════════════════════
   GET /api/v1/notifications/:userId
   Query: ?limit=20 &offset=0 &unreadOnly=true
══════════════════════════════════════════════════════════ */
export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    const limit      = Math.min(parseInt(req.query.limit)  || 20, 100);
    const offset     = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === "true";

    const query = { userId };
    if (unreadOnly) query.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    res.json({
      success: true,
      total,
      unreadCount,
      notifications: notifications.map((n) => ({
        id:        n._id,
        type:      n.type,
        title:     n.title,
        message:   n.message,
        isRead:    n.isRead,
        fileId:    n.fileId,
        fileName:  n.fileName,
        meta:      n.meta,
        timestamp: n.createdAt,
      })),
    });
  } catch (err) {
    console.error("getNotifications:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   PATCH /api/v1/notifications/:notifId/read
   Mark a single notification as read
══════════════════════════════════════════════════════════ */
export const markAsRead = async (req, res) => {
  try {
    const { notifId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notifId))
      return res.status(400).json({ message: "Invalid notification ID" });

    const notif = await Notification.findByIdAndUpdate(
      notifId,
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Notification not found" });

    res.json({ success: true, notification: { id: notif._id, isRead: notif.isRead } });
  } catch (err) {
    console.error("markAsRead:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   PATCH /api/v1/notifications/:userId/read-all
   Mark ALL notifications as read for a user
══════════════════════════════════════════════════════════ */
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, markedRead: result.modifiedCount });
  } catch (err) {
    console.error("markAllAsRead:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   DELETE /api/v1/notifications/:notifId
   Delete a single notification
══════════════════════════════════════════════════════════ */
export const deleteNotification = async (req, res) => {
  try {
    const { notifId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notifId))
      return res.status(400).json({ message: "Invalid notification ID" });

    await Notification.findByIdAndDelete(notifId);
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("deleteNotification:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   DELETE /api/v1/notifications/:userId/clear-all
   Delete all notifications for a user
══════════════════════════════════════════════════════════ */
export const clearAllNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    const result = await Notification.deleteMany({ userId });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    console.error("clearAllNotifications:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   GET /api/v1/notifications/:userId/unread-count
   Lightweight poll endpoint — just returns the count
══════════════════════════════════════════════════════════ */
export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    const count = await Notification.countDocuments({ userId, isRead: false });
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    console.error("getUnreadCount:", err.message);
    res.status(500).json({ error: err.message });
  }
};