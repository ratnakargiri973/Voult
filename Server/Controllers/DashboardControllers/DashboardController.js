import mongoose from "mongoose";
import { File } from "../../Models/fileModals/fileSchema.js";
import { signInModal } from "../../Models/authModals/SignIn.js";
import { Activity } from "../../Models/activityModal/activityModal.js";
import cloudinary from "../../Middlewares/cloudinary.js";
import {
  notifyDelete,
  notifyTrash,
  notifyRestore,
  notifyStar,
  notifyProfileUpdate,
  notifyStorageWarn,
} from "../../Helpers/Notification.js";

const PLAN_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10 GB in bytes

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

/* ══════════════════════════════════════════════════════════
   GET /api/v1/dashboard/stats/:userId
══════════════════════════════════════════════════════════ */
export const getDashboardStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const [
      totalFiles,
      todayFiles,
      sharedFiles,
      trashedFiles,
      starredFiles,
      allFiles,
      user,
    ] = await Promise.all([
      File.countDocuments({ owner: userId, isTrashed: false }),
      File.countDocuments({
        owner: userId,
        isTrashed: false,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
      File.countDocuments({ owner: userId, isShared: true,  isTrashed: false }),
      File.countDocuments({ owner: userId, isTrashed: true }),
      File.countDocuments({ owner: userId, isStarred: true, isTrashed: false }),
      File.find({ owner: userId, isTrashed: false }, { size: 1 }),
      signInModal.findById(userId, { email: 1, createdAt: 1, isVerified: 1 }),
    ]);

    const storageUsedBytes = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    const storageUsedGB    = +(storageUsedBytes / 1024 ** 3).toFixed(2);
    const storageLimitGB   = +(PLAN_STORAGE_LIMIT / 1024 ** 3).toFixed(0);
    const storagePercent   = +((storageUsedBytes / PLAN_STORAGE_LIMIT) * 100).toFixed(1);

    // ── Notify if storage > 85% ──
    if (storagePercent > 85) {
      await notifyStorageWarn(userId, storagePercent);
    }

    res.json({
      success: true,
      stats: {
        totalFiles,
        todayUploads: todayFiles,
        sharedLinks:  sharedFiles,
        trashedFiles,
        starredFiles,
        storage: {
          usedBytes:   storageUsedBytes,
          usedGB:      storageUsedGB,
          limitGB:     storageLimitGB,
          remainingGB: +(storageLimitGB - storageUsedGB).toFixed(2),
          percent:     storagePercent,
          label:       `${storageUsedGB} GB of ${storageLimitGB} GB used`,
        },
      },
      user: user
        ? { email: user.email, joinedAt: user.createdAt, isVerified: user.isVerified }
        : null,
    });
  } catch (err) {
    console.error("getDashboardStats:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   GET /api/v1/dashboard/activity/:userId
   Query params: ?limit=10 &offset=0 &type=upload
══════════════════════════════════════════════════════════ */
export const getActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit  = Math.min(parseInt(req.query.limit)  || 10, 100);
    const offset = parseInt(req.query.offset) || 0;
    const type   = req.query.type || null;

    const query = { userId };
    if (type) query.type = type;

    const [activity, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Activity.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      activity: activity.map((a) => ({
        id:        a._id,
        type:      a.type,
        action:    a.action,
        fileName:  a.fileName,
        fileId:    a.fileId,
        meta:      a.meta,
        timestamp: a.createdAt,
      })),
    });
  } catch (err) {
    console.error("getActivity:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   GET /api/v1/dashboard/profile/:userId
══════════════════════════════════════════════════════════ */
export const getProfile = async (req, res) => {
  try {
    const user = await signInModal.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      profile: {
        id:         user._id,
        username:   user.username || user.email.split("@")[0],
        email:      user.email,
        phone:      user.phone    || "",
        bio:        user.bio      || "",
        plan:       user.plan     || "Free",
        isVerified: user.isVerified ?? false,
        joinedAt:   user.createdAt,
        storage: {
          usedBytes:   user.storageUsed  || 0,
          usedGB:      +((user.storageUsed || 0) / 1024 ** 3).toFixed(2),
          limitGB:     user.storageLimit || 10,
          remainingGB: +(((user.storageLimit || 10) * 1024 ** 3 - (user.storageUsed || 0)) / 1024 ** 3).toFixed(2),
          percent:     Math.min(100, Math.round(((user.storageUsed || 0) / ((user.storageLimit || 10) * 1024 ** 3)) * 100)),
        },
      },
    });
  } catch (err) {
    console.error("getProfile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ══════════════════════════════════════════════════════════
   PUT /api/v1/dashboard/profile/:userId
══════════════════════════════════════════════════════════ */
export const editProfile = async (req, res) => {
  try {
    const { username, email, phone, bio } = req.body;

    if (!username?.trim()) return res.status(400).json({ message: "Username is required" });
    if (!email?.trim())    return res.status(400).json({ message: "Email is required" });
    if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ message: "Invalid email format" });

    const conflict = await signInModal.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: req.params.userId },
    });
    if (conflict) return res.status(409).json({ message: "Email already in use by another account" });

    const updated = await signInModal.findByIdAndUpdate(
      req.params.userId,
      {
        $set: {
          username: username.trim(),
          email:    email.trim().toLowerCase(),
          phone:    phone?.trim() || "",
          bio:      bio?.trim()   || "",
        },
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "User not found" });

    // ── Activity log + Notification ──
    await logActivity({
      userId: req.params.userId,
      type:   "profile_update",
      action: "updated their profile",
      meta:   { updatedFields: Object.keys(req.body).filter((k) => req.body[k]) },
    });
    await notifyProfileUpdate(req.params.userId);

    res.json({
      message: "Profile updated successfully",
      profile: {
        id:       updated._id,
        username: updated.username,
        email:    updated.email,
        phone:    updated.phone || "",
        bio:      updated.bio   || "",
        plan:     updated.plan  || "Free",
      },
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Email already in use" });
    console.error("editProfile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ══════════════════════════════════════════════════════════
   PATCH /api/v1/dashboard/file/:fileId/toggle
══════════════════════════════════════════════════════════ */
export const toggleFileFlag = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { flag }   = req.body;

    const allowed = ["isShared", "isStarred", "isTrashed"];
    if (!allowed.includes(flag))
      return res.status(400).json({ message: "Invalid flag" });

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    file[flag] = !file[flag];
    await file.save();

    // ── Activity log ──
    const flagActivityMap = {
      isShared:  file[flag] ? "share"   : "unshare",
      isStarred: file[flag] ? "star"    : "unstar",
      isTrashed: file[flag] ? "trash"   : "restore",
    };
    const flagActionMap = {
      isShared:  file[flag] ? `shared ${file.fileName}`         : `unshared ${file.fileName}`,
      isStarred: file[flag] ? `starred ${file.fileName}`        : `unstarred ${file.fileName}`,
      isTrashed: file[flag] ? `moved ${file.fileName} to trash` : `restored ${file.fileName} from trash`,
    };

    await logActivity({
      userId:   file.owner,
      type:     flagActivityMap[flag],
      action:   flagActionMap[flag],
      fileName: file.fileName,
      fileId:   file._id,
    });

    // ── Notifications ──
    if (flag === "isTrashed" && file[flag] === true)  await notifyTrash(file.owner, file.fileName, file._id);
    if (flag === "isTrashed" && file[flag] === false) await notifyRestore(file.owner, file.fileName, file._id);
    if (flag === "isStarred" && file[flag] === true)  await notifyStar(file.owner, file.fileName, file._id);

    res.json({ success: true, [flag]: file[flag] });
  } catch (err) {
    console.error("toggleFileFlag:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   DELETE /api/v1/dashboard/file/:fileId  (permanent delete)
══════════════════════════════════════════════════════════ */
export const permanentDeleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (!file.isTrashed)
      return res.status(400).json({ message: "Move file to trash first" });

    const getResourceType = (mimeType = "") => {
      if (mimeType.startsWith("image/")) return "image";
      if (mimeType.startsWith("video/")) return "video";
      return "raw";
    };

    await cloudinary.uploader.destroy(file.publicId, {
      resource_type: getResourceType(file.mimeType),
    });

    // capture before deleting
    const { fileName, owner, _id } = file;
    await File.findByIdAndDelete(fileId);

    // ── Activity log + Notification ──
    await logActivity({
      userId:   owner,
      type:     "delete",
      action:   `permanently deleted ${fileName}`,
      fileName: fileName,
      fileId:   _id,
    });
    await notifyDelete(owner, fileName, _id);

    res.json({ success: true, message: "File permanently deleted" });
  } catch (err) {
    console.error("permanentDeleteFile:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   GET /api/v1/dashboard/shared/:userId
══════════════════════════════════════════════════════════ */
export const getSharedFiles = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    const files = await File.find(
      { owner: userId, isShared: true, isTrashed: false },
      { fileName: 1, fileUrl: 1, size: 1, sharedWith: 1, createdAt: 1, updatedAt: 1 }
    ).sort({ updatedAt: -1 });

    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   GET /api/v1/dashboard/trash/:userId
══════════════════════════════════════════════════════════ */
export const getTrashedFiles = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    const files = await File.find(
      { owner: new mongoose.Types.ObjectId(userId), isTrashed: true },
      { fileName: 1, fileUrl: 1, size: 1, mimeType: 1, createdAt: 1, updatedAt: 1 }
    ).sort({ updatedAt: -1 });

    res.json({ success: true, files });
  } catch (err) {
    console.error("getTrashedFiles error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   PATCH /api/v1/dashboard/trash/:fileId/restore
══════════════════════════════════════════════════════════ */
export const restoreFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    file.isTrashed = false;
    await file.save();

    // ── Activity log + Notification ──
    await logActivity({
      userId:   file.owner,
      type:     "restore",
      action:   `restored ${file.fileName} from trash`,
      fileName: file.fileName,
      fileId:   file._id,
    });
    await notifyRestore(file.owner, file.fileName, file._id);

    res.json({ success: true, message: "File restored" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   PATCH /api/v1/dashboard/starred/:fileId/star
══════════════════════════════════════════════════════════ */
export const starFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fileId))
      return res.status(400).json({ message: "Invalid file ID" });

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });
    if (file.isTrashed)
      return res.status(400).json({ message: "Cannot star a trashed file" });

    file.isStarred = true;
    await file.save();

    // ── Activity log + Notification ──
    await logActivity({
      userId:   file.owner,
      type:     "star",
      action:   `starred ${file.fileName}`,
      fileName: file.fileName,
      fileId:   file._id,
    });
    await notifyStar(file.owner, file.fileName, file._id);

    res.json({ success: true, message: "File starred", isStarred: file.isStarred });
  } catch (err) {
    console.error("starFile error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   PATCH /api/v1/dashboard/starred/:fileId/unstar
══════════════════════════════════════════════════════════ */
export const unstarFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fileId))
      return res.status(400).json({ message: "Invalid file ID" });

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    file.isStarred = false;
    await file.save();

    // ── Activity log ──
    await logActivity({
      userId:   file.owner,
      type:     "unstar",
      action:   `unstarred ${file.fileName}`,
      fileName: file.fileName,
      fileId:   file._id,
    });

    res.json({ success: true, message: "File unstarred", isStarred: file.isStarred });
  } catch (err) {
    console.error("unstarFile error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   GET /api/v1/dashboard/starred/:userId
══════════════════════════════════════════════════════════ */
export const getStarredFiles = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    const files = await File.find(
      { owner: new mongoose.Types.ObjectId(userId), isStarred: true, isTrashed: false },
      { fileName: 1, fileUrl: 1, size: 1, mimeType: 1, isShared: 1, createdAt: 1, updatedAt: 1 }
    ).sort({ updatedAt: -1 });

    await logActivity({
      userId,
      type:   "view",
      action: "viewed starred files",
    });

    res.json({ success: true, files });
  } catch (err) {
    console.error("getStarredFiles error:", err);
    res.status(500).json({ error: err.message });
  }
};
