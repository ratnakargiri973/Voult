// Utils/notify.js
import { Notification } from "../Models/activityModal/notificationModal.js";

/**
 * createNotification — fire-and-forget, never throws
 *
 * Usage:
 *   await notify({ userId, type: "upload", title: "File uploaded", message: "report.pdf was uploaded" })
 */
export const notify = async ({
  userId,
  type,
  title,
  message,
  fileId   = null,
  fileName = "",
  meta     = {},
}) => {
  try {
    await Notification.create({ userId, type, title, message, fileId, fileName, meta });
  } catch (err) {
    console.error("notify failed:", err.message);
  }
};

/* ── Preset helpers — call these from controllers ── */

export const notifyUpload = (userId, fileName, fileId) =>
  notify({ userId, type: "upload", title: "File uploaded", message: `"${fileName}" was uploaded successfully.`, fileId, fileName });

export const notifyDelete = (userId, fileName, fileId) =>
  notify({ userId, type: "delete", title: "File deleted", message: `"${fileName}" was permanently deleted.`, fileId, fileName });

export const notifyTrash = (userId, fileName, fileId) =>
  notify({ userId, type: "trash", title: "Moved to trash", message: `"${fileName}" was moved to trash.`, fileId, fileName });

export const notifyRestore = (userId, fileName, fileId) =>
  notify({ userId, type: "restore", title: "File restored", message: `"${fileName}" has been restored.`, fileId, fileName });

export const notifyStar = (userId, fileName, fileId) =>
  notify({ userId, type: "star", title: "File starred", message: `"${fileName}" was added to starred.`, fileId, fileName });

export const notifyShareSent = (userId, fileName, fileId, recipients) =>
  notify({ userId, type: "share_sent", title: "File shared", message: `"${fileName}" was shared with ${recipients.join(", ")}.`, fileId, fileName, meta: { recipients } });

export const notifyShareFailed = (userId, fileName, fileId, failed) =>
  notify({ userId, type: "share_failed", title: "Share partially failed", message: `Could not deliver "${fileName}" to ${failed.length} recipient(s).`, fileId, fileName, meta: { failed } });

export const notifyShareReceived = (recipientUserId, senderEmail, fileName, fileId, fileUrl) =>
  notify({ userId: recipientUserId, type: "share", title: "File received", message: `${senderEmail} shared "${fileName}" with you.`, fileId, fileName, meta: { senderEmail, fileUrl } });

export const notifyProfileUpdate = (userId) =>
  notify({ userId, type: "profile_update", title: "Profile updated", message: "Your profile was updated successfully." });

export const notifyLogin = (userId, ip, userAgent) =>
  notify({ userId, type: "login", title: "New sign-in", message: "A new sign-in to your account was detected.", meta: { ip, userAgent } });

export const notifyRegister = (userId, email) =>
  notify({ userId, type: "register", title: "Welcome to Vault!", message: `Your account for ${email} has been created.`, meta: { email } });

export const notifyStorageWarn = (userId, percent) =>
  notify({ userId, type: "storage_warn", title: "Storage almost full", message: `You've used ${percent}% of your storage. Consider upgrading.`, meta: { percent } });