import nodemailer from "nodemailer";
import mongoose from "mongoose";
import { File } from "../../Models/fileModals/fileSchema.js";
import { signInModal } from "../../Models/authModals/SignIn.js";
import { Activity } from "../../Models/activityModal/activityModal.js";

import {
  notifyShareSent,
  notifyShareFailed,
  notifyShareReceived,
} from "../../Helpers/Notification.js";

/* ══════════════════════════════════════════════════════════
   ACTIVITY HELPER — fire-and-forget
══════════════════════════════════════════════════════════ */
const logActivity = async (data) => {
  try {
    await Activity.create(data);
  } catch (err) {
    console.error("logActivity failed:", err.message);
  }
};

/* ══════════════════════════════════════════════════════════
   MAIL TRANSPORTER (reuse)
══════════════════════════════════════════════════════════ */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

/* ══════════════════════════════════════════════════════════
   SHARE FILE
══════════════════════════════════════════════════════════ */
export const shareFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { emails } = req.body;
    const senderId = req.user.id;

    if (!emails || !Array.isArray(emails) || emails.length === 0)
      return res.status(400).json({ message: "Provide emails" });

    if (!mongoose.Types.ObjectId.isValid(fileId))
      return res.status(400).json({ message: "Invalid file ID" });

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.owner.toString() !== senderId)
      return res.status(403).json({ message: "Not authorized" });

    const sender = await signInModal.findById(senderId, { email: 1 });

    /* 🔥 SEND EMAILS IN PARALLEL */
    const results = await Promise.allSettled(
      emails.map((email) =>
        transporter.sendMail({
          from: `"Vault" <${process.env.EMAIL}>`,
          to: email,
          subject: `${sender.email} shared a file`,
          html: `<b>${file.fileName}</b> <br/> <a href="${file.fileUrl}">Open</a>`,
        })
      )
    );

    const delivered = [];
    const failed = [];

    results.forEach((r, i) => {
      if (r.status === "fulfilled") delivered.push(emails[i]);
      else failed.push({ email: emails[i], reason: r.reason?.message });
    });

    /* 🔥 UPDATE DB */
    file.sharedWith = emails.map((email) => ({
      email,
      delivered: delivered.includes(email),
      failReason:
        failed.find((f) => f.email === email)?.reason || "",
      sharedAt: new Date(),
    }));

    file.isShared = delivered.length > 0;
    await file.save();

    /* ✅ RESPOND FAST */
    res.json({
      success: true,
      delivered,
      failed,
    });

    /* 🔥 BACKGROUND TASKS */

    // Activity logs
    logActivity({
      userId: senderId,
      type: "share",
      action: `shared ${file.fileName}`,
      fileName: file.fileName,
      fileId: file._id,
    });

    // Notifications (non-blocking)
    notifyShareSent(senderId, file.fileName, file._id, delivered).catch(console.error);
    notifyShareFailed(senderId, file.fileName, file._id, failed).catch(console.error);

    // 🔥 PARALLEL recipient lookup
    const recipients = await signInModal.find(
      { email: { $in: delivered } },
      { _id: 1, email: 1 }
    );

    recipients.forEach((user) => {
      notifyShareReceived(
        user._id,
        sender.email,
        file.fileName,
        file._id,
        file.fileUrl
      ).catch(console.error);
    });

  } catch (err) {
    console.error("shareFile:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   SHARE HISTORY
══════════════════════════════════════════════════════════ */
export const getShareHistory = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "Not found" });

    res.json({
      success: true,
      sharedWith: file.sharedWith,
    });

    // background log
    logActivity({
      userId: req.user.id,
      type: "view",
      action: "viewed share history",
      fileName: file.fileName,
      fileId: file._id,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   REVOKE SHARE
══════════════════════════════════════════════════════════ */
export const revokeShare = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { email } = req.body;

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "Not found" });

    if (file.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not allowed" });

    file.sharedWith = email
      ? file.sharedWith.filter((s) => s.email !== email)
      : [];

    file.isShared = file.sharedWith.length > 0;
    await file.save();

    res.json({ success: true });

    // background log
    logActivity({
      userId: req.user.id,
      type: "unshare",
      action: "revoked access",
      fileName: file.fileName,
      fileId: file._id,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};