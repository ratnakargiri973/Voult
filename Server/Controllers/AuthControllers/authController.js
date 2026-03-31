import otpGenerator from "otp-generator";
import { otpModal } from "../../Models/authModals/Otp.js";
import { signInModal } from "../../Models/authModals/SignIn.js";
import { Activity } from "../../Models/activityModal/activityModal.js";
import nodemailer from "nodemailer";
import { generateToken } from "../../Utils/generateWebToken.js";

/* ══════════════════════════════════════════════════════════
   ACTIVITY HELPER — fire-and-forget
══════════════════════════════════════════════════════════ */
const logActivity = async ({ userId, type, action, meta = {} }) => {
  try {
    await Activity.create({
      userId,
      type,
      action,
      fileName: "",
      fileId: null,
      meta,
    });
  } catch (err) {
    console.error("logActivity failed:", err.message);
  }
};

/* ══════════════════════════════════════════════════════════
   MAIL TRANSPORTER (create once, reuse)
══════════════════════════════════════════════════════════ */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

/* ══════════════════════════════════════════════════════════
   POST /api/v1/auth/send-otp
══════════════════════════════════════════════════════════ */
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    // DB operations
    await otpModal.deleteMany({ email });
    await otpModal.create({ email, otp });

    // ✅ Respond immediately (FAST)
    res.json({ success: true, message: "OTP sent" });

    // 🔥 Send email in background (non-blocking)
    transporter
      .sendMail({
        from: `"Vault" <${process.env.EMAIL}>`,
        to: email,
        subject: "Your One-Time Passcode",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0f0f;border-radius:12px;color:#e4e8f0;">
            <h2 style="color:#fff;">Your OTP</h2>
            <p>Use this OTP. It expires in 10 minutes.</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#f59e0b;">
              ${otp}
            </div>
          </div>
        `,
      })
      .catch((err) => console.error("Mail error:", err.message));

    // 🔥 Background activity log
    const existingUser = await signInModal.findOne({ email });
    if (existingUser) {
      logActivity({
        userId: existingUser._id,
        type: "otp_sent",
        action: "requested a new OTP",
        meta: { email, ip: req.ip },
      });
    }
  } catch (err) {
    console.error("sendOtp:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   POST /api/v1/auth/verify-otp
══════════════════════════════════════════════════════════ */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ message: "Email and OTP are required" });
    }

    const record = await otpModal.findOne({ email, otp });

    if (!record) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP" });
    }

    // Delete OTP
    await otpModal.deleteOne({ _id: record._id });

    let user = await signInModal.findOne({ email });
    const isNewUser = !user;

    if (!user) {
      user = await signInModal.create({ email, isVerified: true });
    } else {
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user);

    // 🔥 Background activity log (no await)
    logActivity({
      userId: user._id,
      type: isNewUser ? "register" : "login",
      action: isNewUser ? "created an account" : "signed in",
      meta: {
        email,
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
        isNewUser,
      },
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("verifyOtp:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════════════════════════
   POST /api/v1/auth/logout
══════════════════════════════════════════════════════════ */
export const logout = async (req, res) => {
  try {
    // 🔥 Background log
    logActivity({
      userId: req.user.id,
      type: "logout",
      action: "signed out",
      meta: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
      },
    });

    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error("logout:", err.message);
    res.status(500).json({ error: err.message });
  }
};