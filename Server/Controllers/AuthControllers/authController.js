import otpGenerator from 'otp-generator'
import { otpModal }    from '../../Models/authModals/Otp.js';
import { signInModal } from '../../Models/authModals/SignIn.js';
import { Activity }    from '../../Models/activityModal/activityModal.js';
import nodemailer      from 'nodemailer'
import { generateToken } from '../../Utils/generateWebToken.js';

/* ══════════════════════════════════════════════════════════
   ACTIVITY HELPER — fire-and-forget, never crashes caller
══════════════════════════════════════════════════════════ */
const logActivity = async ({ userId, type, action, meta = {} }) => {
  try {
    await Activity.create({ userId, type, action, fileName: "", fileId: null, meta });
  } catch (err) {
    console.error("logActivity failed:", err.message);
  }
};

/* ══════════════════════════════════════════════════════════
   POST /api/v1/auth/send-otp
══════════════════════════════════════════════════════════ */
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars:       false,
    });

    await otpModal.deleteMany({ email });
    await otpModal.create({ email, otp });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
      },
    });

    await transporter.sendMail({
      from:    `"Vault" <${process.env.EMAIL}>`,
      to:      email,
      subject: "Your One-Time Passcode",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0f0f;border-radius:12px;color:#e4e8f0;">
          <div style="margin-bottom:24px;">
            <span style="font-size:22px;font-weight:700;color:#f59e0b;">Vault</span>
          </div>
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#ffffff;">
            Your One-Time Passcode
          </h2>
          <p style="font-size:14px;color:#aaa;margin-bottom:24px;">
            Use the code below to sign in. It expires in <strong style="color:#e4e8f0;">10 minutes</strong>.
          </p>
          <div style="background:#1a1e27;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#f59e0b;">${otp}</span>
          </div>
          <p style="font-size:12px;color:#555;margin-top:8px;">
            Do not share this code with anyone. Vault will never ask for your OTP.
          </p>
        </div>
      `,
    });

    // ── Activity log — only if user already exists ──
    const existingUser = await signInModal.findOne({ email });
    if (existingUser) {
      await logActivity({
        userId: existingUser._id,
        type:   "otp_sent",
        action: "requested a new OTP",
        meta:   { email, ip: req.ip },
      });
    }

    res.json({ success: true, message: "OTP sent" });
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

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const record = await otpModal.findOne({ email, otp });

    if (!record)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    // Delete OTP so it can't be reused
    await otpModal.deleteOne({ _id: record._id });

    const isNewUser = !(await signInModal.exists({ email }));

    let user = await signInModal.findOne({ email });

    if (!user) {
      user = await signInModal.create({ email, isVerified: true });
    } else {
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user);

    // ── Activity log ──
    await logActivity({
      userId: user._id,
      type:   isNewUser ? "register" : "login",
      action: isNewUser ? "created an account" : "signed in",
      meta:   {
        email,
        ip:        req.ip,
        userAgent: req.headers["user-agent"] || "",
        isNewUser,
      },
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id:         user._id,
        email:      user.email,
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
   Call this from your frontend on sign-out
══════════════════════════════════════════════════════════ */
export const logout = async (req, res) => {
  try {
    // req.user is set by your verifyToken middleware
    await logActivity({
      userId: req.user.id,
      type:   "logout",
      action: "signed out",
      meta:   {
        ip:        req.ip,
        userAgent: req.headers["user-agent"] || "",
      },
    });

    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error("logout:", err.message);
    res.status(500).json({ error: err.message });
  }
};
