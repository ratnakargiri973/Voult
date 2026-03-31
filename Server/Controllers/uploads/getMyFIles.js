import { File } from "../../Models/fileModals/fileSchema.js";
import cloudinary from "../../Middlewares/cloudinary.js";
import mongoose from 'mongoose'

// Controllers/uploads/getMyFiles.js
export const uploadFile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) return res.status(400).json({ message: "File is required" });

    const getResourceType = (mimetype) => {
      if (mimetype.startsWith("image/")) return "image";
      if (mimetype.startsWith("video/")) return "video";
      if (mimetype === "application/pdf") return "image"; // ✅ key fix
      return "raw";
    };

    const resourceType = getResourceType(req.file.mimetype);

    cloudinary.uploader.upload_stream(
      {
        folder: "user_files",
        resource_type: resourceType,
        type: "upload",
        access_mode: "public",
        // ✅ For PDFs uploaded as "image", tell Cloudinary the page to extract
        ...(req.file.mimetype === "application/pdf" && { pages: true }),
      },
      async (error, result) => {
        if (error) return res.status(500).json({ error: error.message });

        // ✅ Correct URL per file type
        let viewableUrl = result.secure_url;
        if (resourceType === "raw") {
          viewableUrl = result.secure_url.replace("/upload/", "/upload/fl_inline/");
        }

        const file = await File.create({
          fileName: req.file.originalname,
          fileUrl: viewableUrl, // ✅ correct viewable URL saved
          publicId: result.public_id,
          size: req.file.size,
          mimeType: req.file.mimetype,
          owner: userId,
        });

        res.json({ success: true, file });
      }
    ).end(req.file.buffer);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getMyFiles = async (req, res) => {
  try {
    const { userId } = req.params;

    // ✅ Validate ObjectId before hitting DB
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const files = await File.find({ owner: userId }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId))
      return res.status(400).json({ message: "Invalid file ID" });

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    // ✅ Soft delete — just flag it, don't touch Cloudinary
    file.isTrashed = true;
    await file.save();

    res.json({ success: true, message: "File moved to trash" });
  } catch (err) {
    console.error("deleteFile:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Helper: map mimeType to Cloudinary resource_type ──
const getResourceType = (mimeType = "") => {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  return "raw"; // pdf, zip, docx, etc.
};