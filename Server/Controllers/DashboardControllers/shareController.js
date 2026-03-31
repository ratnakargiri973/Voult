// Controllers/dashboard/shareController.js
import nodemailer from "nodemailer";
import mongoose   from "mongoose";
import { File }   from "../../Models/fileModals/fileSchema.js";
import { signInModal } from "../../Models/authModals/SignIn.js";
import { Activity } from "../../Models/activityModal/activityModal.js";

import { notifyShareSent, notifyShareFailed, notifyShareReceived } from "../../Helpers/Notification.js";

/* ══════════════════════════════════════════════════════════
   ACTIVITY HELPER — fire-and-forget, never crashes caller
══════════════════════════════════════════════════════════ */
const logActivity = async ({ userId, type, action, fileName = "", fileId = null, meta = {} }) => {
  try {
    await Activity.create({ userId, type, action, fileName, fileId, meta });
  } catch (err) {
    console.error("logActivity failed:", err.message);
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

/* ══════════════════════════════════════════════════════════
   POST /api/v1/dashboard/share/:fileId
══════════════════════════════════════════════════════════ */
export const shareFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { emails } = req.body;
    const senderId   = req.user.id;

    // ── Validate emails ──
    if (!emails || !Array.isArray(emails) || emails.length === 0)
      return res.status(400).json({ message: "Provide at least one email address" });

    const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails   = emails.filter(e => !validEmailRegex.test(e));
    if (invalidEmails.length > 0)
      return res.status(400).json({ message: "Invalid email addresses", invalid: invalidEmails });

    if (!mongoose.Types.ObjectId.isValid(fileId))
      return res.status(400).json({ message: "Invalid file ID" });

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    // ── Only owner can share ──
    if (file.owner.toString() !== senderId)
      return res.status(403).json({ message: "Not authorized to share this file" });

    const sender = await signInModal.findById(senderId, { email: 1 });

    // ── Send emails & track results ──
    const results = await Promise.allSettled(
      emails.map(async (recipientEmail) => {
        try {
          await transporter.sendMail({
            from:    `"Vault" <${process.env.EMAIL}>`,
            to:      recipientEmail,
            subject: `${sender.email} shared a file with you`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0f0f0f;border-radius:12px;color:#e4e8f0;">
                <div style="margin-bottom:24px;">
                  <span style="font-size:22px;font-weight:700;color:#00d4aa;">Vault</span>
                </div>
                <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#ffffff;">
                  You received a file
                </h2>
                <p style="font-size:14px;color:#aaa;margin-bottom:24px;">
                  <strong style="color:#e4e8f0;">${sender.email}</strong> shared a file with you via Vault.
                </p>
                <div style="background:#1a1e27;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:18px 20px;margin-bottom:24px;">
                  <div style="font-size:13px;color:#aaa;margin-bottom:4px;">File name</div>
                  <div style="font-size:15px;font-weight:600;color:#ffffff;">${file.fileName}</div>
                </div>
                <a href="${file.fileUrl}" target="_blank"
                  style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#00d4aa,#00b896);color:#0a0c10;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">
                  Open File →
                </a>
                <p style="font-size:12px;color:#555;margin-top:28px;">
                  This link gives direct access to the file. Do not forward this email if the file is private.
                </p>
              </div>
            `,
          });
          return { email: recipientEmail, delivered: true };
        } catch (mailErr) {
          return { email: recipientEmail, delivered: false, failReason: mailErr.message };
        }
      })
    );

    // ── Update file: add sharedWith records ──
    const shareRecords = results.map(r => ({
      email:      r.value.email,
      delivered:  r.value.delivered,
      failReason: r.value.failReason || "",
      sharedAt:   new Date(),
    }));

    for (const rec of shareRecords) {
      const existing = file.sharedWith.find(s => s.email === rec.email);
      if (existing) {
        existing.delivered  = rec.delivered;
        existing.failReason = rec.failReason;
        existing.sharedAt   = rec.sharedAt;
      } else {
        file.sharedWith.push(rec);
      }
    }

    const delivered = shareRecords.filter(r =>  r.delivered).map(r => r.email);
    const failed    = shareRecords.filter(r => !r.delivered).map(r => ({
      email:  r.email,
      reason: r.failReason,
    }));

    if (delivered.length > 0) {
      file.isShared = true;
    }

    await file.save();

    // ── Activity + notifications for successful deliveries ──
    if (delivered.length > 0) {
      await logActivity({
        userId:   senderId,
        type:     "share",
        action:   `shared ${file.fileName} with ${delivered.length} recipient(s)`,
        fileName: file.fileName,
        fileId:   file._id,
        meta: {
          deliveredTo: delivered,
          failedTo:    failed.map(f => f.email),
          partial:     failed.length > 0 && delivered.length > 0,
        },
      });
      await notifyShareSent(senderId, file.fileName, file._id, delivered);

      for (const email of delivered) {
        const recipient = await signInModal.findOne({ email }, { _id: 1 });
        if (recipient) {
          await notifyShareReceived(recipient._id, sender.email, file.fileName, file._id, file.fileUrl);
        }
      }
    }

    // ── Activity + notifications for failures ──
    if (failed.length > 0) {
      await logActivity({
        userId:   senderId,
        type:     "share_failed",
        action:   `failed to share ${file.fileName} with ${failed.length} recipient(s)`,
        fileName: file.fileName,
        fileId:   file._id,
        meta: {
          failedRecipients: failed,
        },
      });
      await notifyShareFailed(senderId, file.fileName, file._id, failed);
    }

    res.json({
      success:   true,
      message:   `Shared with ${delivered.length} recipient(s)`,
      delivered,
      failed,
      partial:   failed.length > 0 && delivered.length > 0,
      allFailed: delivered.length === 0,
    });

  } catch (err) {
    console.error("shareFile:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   GET /api/v1/dashboard/share/:fileId/history
══════════════════════════════════════════════════════════ */
export const getShareHistory = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId))
      return res.status(400).json({ message: "Invalid file ID" });

    const file = await File.findById(fileId, { sharedWith: 1, fileName: 1 });
    if (!file) return res.status(404).json({ message: "File not found" });

    await logActivity({
      userId:   req.user.id,
      type:     "view",
      action:   `viewed share history for ${file.fileName}`,
      fileName: file.fileName,
      fileId:   file._id,
    });

    res.json({
      success:    true,
      fileName:   file.fileName,
      sharedWith: file.sharedWith.sort((a, b) => new Date(b.sharedAt) - new Date(a.sharedAt)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   PATCH /api/v1/dashboard/share/:fileId/revoke
══════════════════════════════════════════════════════════ */
export const revokeShare = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { email }  = req.body;

    if (!mongoose.Types.ObjectId.isValid(fileId))
      return res.status(400).json({ message: "Invalid file ID" });

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    if (email) {
      file.sharedWith = file.sharedWith.filter(s => s.email !== email);
    } else {
      file.sharedWith = [];
    }

    if (file.sharedWith.length === 0) {
      file.isShared = false;
    }

    await file.save();

    await logActivity({
      userId:   req.user.id,
      type:     "unshare",
      action:   email
        ? `revoked access to ${file.fileName} for ${email}`
        : `revoked all access to ${file.fileName}`,
      fileName: file.fileName,
      fileId:   file._id,
      meta:     { revokedEmail: email || "all" },
    });

    res.json({
      success:  true,
      message:  email ? `Access revoked for ${email}` : "All access revoked",
      isShared: file.isShared,
    });
  } catch (err) {
    console.error("revokeShare:", err.message);
    res.status(500).json({ error: err.message });
  }
};