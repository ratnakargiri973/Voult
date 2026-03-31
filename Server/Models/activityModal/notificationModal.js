// Models/notificationModal/notificationModal.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SignIn",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "upload",       // file uploaded
        "share",        // file shared with you
        "share_sent",   // you shared a file
        "share_failed", // share delivery failed
        "delete",       // file deleted
        "trash",        // file moved to trash
        "restore",      // file restored
        "star",         // file starred
        "profile_update", // profile updated
        "login",        // new login detected
        "register",     // account created
        "storage_warn", // storage nearing limit
        "system",       // generic system message
      ],
      required: true,
    },
    title:   { type: String, required: true },       // short heading
    message: { type: String, required: true },       // full description
    isRead:  { type: Boolean, default: false, index: true },
    fileId:  { type: mongoose.Schema.Types.ObjectId, default: null },
    fileName:{ type: String, default: "" },
    meta:    { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound index for fast unread queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);