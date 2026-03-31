// Models/fileModals/fileSchema.js
import mongoose from "mongoose";

// Models/fileModals/fileSchema.js
const fileSchema = new mongoose.Schema(
  {
    fileName:     { type: String, required: true },
    fileUrl:      { type: String, required: true },
    publicId:     { type: String, required: true },
    size:         { type: Number, default: 0 },
    mimeType:     { type: String, default: "" },
    owner:        { type: mongoose.Schema.Types.ObjectId, ref: "SignIn", required: true },
    isShared:     { type: Boolean, default: false },
    isStarred:    { type: Boolean, default: false },
    isTrashed:    { type: Boolean, default: false },
    // ✅ new — track who it was shared with
    sharedWith: [
      {
        email:      { type: String },
        sharedAt:   { type: Date, default: Date.now },
        delivered:  { type: Boolean, default: false },  // email actually sent
        failReason: { type: String, default: "" },       // why it failed
      }
    ],
  },
  { timestamps: true }
);

export const File = mongoose.model("File", fileSchema);