// models/User.js (or wherever your schema is)
import mongoose from 'mongoose'

const signInSchema = new mongoose.Schema({
  email:      { type: String, required: true, unique: true },
  password:   { type: String },
  username:   { type: String, default: "" },
  phone:      { type: String, default: "" },
  bio:        { type: String, default: "" },
  plan:       { type: String, default: "Free" },
  isVerified: { type: Boolean, default: false },
  storageUsed:  { type: Number, default: 0 },
  storageLimit: { type: Number, default: 10 },
}, { timestamps: true });  // ← gives you createdAt/updatedAt automatically

export const signInModal = mongoose.model("SignIn", signInSchema);