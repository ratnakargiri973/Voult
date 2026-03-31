import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // OTP expires in 5 minutes
  }
});

export const otpModal = mongoose.model("Otp", otpSchema);