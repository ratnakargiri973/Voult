// Routes/notificationRoutes.js
import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
} from "../Controllers/Notification/notificationController.js";
import { verifyToken } from "../Middlewares/verifyToken.js";

const notificationRouter = express.Router();

notificationRouter.get   ("/:userId",            verifyToken, getNotifications);
notificationRouter.get   ("/:userId/unread-count", verifyToken, getUnreadCount);
notificationRouter.patch ("/:notifId/read",      verifyToken, markAsRead);
notificationRouter.patch ("/:userId/read-all",   verifyToken, markAllAsRead);
notificationRouter.delete("/:notifId",           verifyToken, deleteNotification);
notificationRouter.delete("/:userId/clear-all",  verifyToken, clearAllNotifications);

export default notificationRouter;

/* ── Register in server.js / app.js ──
import notificationRoutes from "./Routes/notificationRoutes.js";
app.use("/api/v1/notifications", notificationRoutes);
*/