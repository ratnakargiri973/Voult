// models/Activity.js
import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "SignIn", required: true, index: true },
    type:     {
      type: String,
      enum: ["upload", "delete", "share", "unshare", "star", "unstar", "trash", "restore", "profile_update", "login", "logout"],
      required: true,
    },
    action:   { type: String, required: true },   // human-readable: "uploaded report.pdf"
    fileName: { type: String, default: "" },       // empty for non-file actions
    fileId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    meta:     { type: mongoose.Schema.Types.Mixed, default: {} }, // any extra data
  },
  { timestamps: true }
);

export const Activity = mongoose.model("Activity", activitySchema);