import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { saveAuth } from "../utils/handleAuth";

const OTP_LENGTH = 6;
const BASE_URL = " http://localhost:8080/api/v1/auth";

export default function SignInWithOTP() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRefs = useRef([]);

  const navigate = useNavigate();

  useEffect(() => {
    let interval = null;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => interval && clearInterval(interval);
  }, [step, timer]);

  const sendOTP = async (email) => {
    try {
      const { data } = await axios.post(`${BASE_URL}/send-otp`, { email });
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Failed to send OTP");
    }
  };

  const verifyOTP = async (email, code) => {
    try {
      const { data } = await axios.post(`${BASE_URL}/verify-otp`, { email, otp: code });
      console.log(data);
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Invalid OTP");
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email"); return; }
    setLoading(true);
    try {
      await sendOTP(email);
      setStep("otp");
      setTimer(60);
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) { setError("Enter complete OTP"); return; }
    setLoading(true);
    try {
      const result = await verifyOTP(email, code);
      saveAuth(result.token, result.user); 
      setSuccessMessage(`Welcome back! Signed in as ${result.user?.email || email}`);
      setStep("success");
    } catch (err) {
      setError(err.message);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (e, idx) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (!value) return;
    const arr = [...otp];
    arr[idx] = value[0];
    setOtp(arr);
    setError("");
    if (idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      const arr = [...otp];
      arr[idx] = "";
      setOtp(arr);
      if (!otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError("");
    try {
      await sendOTP(email);
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimer(60);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setStep("email");
    setOtp(Array(OTP_LENGTH).fill(""));
    setTimer(0);
    setError("");
  };

  const timerPercent = (timer / 60) * 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .otp-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          font-family: 'DM Sans', sans-serif;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* Ambient blobs */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: drift 12s ease-in-out infinite alternate;
        }
        .blob-1 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%);
          top: -100px; left: -100px;
          animation-delay: 0s;
        }
        .blob-2 {
          width: 360px; height: 360px;
          background: radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%);
          bottom: -80px; right: -80px;
          animation-delay: -4s;
        }
        .blob-3 {
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(34,211,238,0.10) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -8s;
        }
        @keyframes drift {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, 20px) scale(1.1); }
        }

        /* Grid texture */
        .otp-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 44px 40px;
          backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.03),
            0 32px 80px rgba(0,0,0,0.6),
            0 0 60px rgba(99,102,241,0.06);
          animation: cardIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .icon-wrap {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(236,72,153,0.2));
          border: 1px solid rgba(99,102,241,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          margin-bottom: 24px;
          box-shadow: 0 0 24px rgba(99,102,241,0.2);
        }

        .card-title {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: #f0f0ff;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .card-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 32px;
          line-height: 1.5;
          font-weight: 300;
        }
        .card-subtitle span {
          color: rgba(99,102,241,0.9);
          font-weight: 500;
        }

        /* Email input */
        .input-wrap {
          position: relative;
          margin-bottom: 12px;
        }
        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          color: rgba(255,255,255,0.25);
          pointer-events: none;
          transition: color 0.2s;
        }
        .input-wrap.focused .input-icon { color: rgba(99,102,241,0.8); }

        .email-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px 16px 14px 44px;
          color: #f0f0ff;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 400;
          outline: none;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        .email-input::placeholder { color: rgba(255,255,255,0.2); }
        .email-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        /* Error */
        .error-msg {
          font-size: 13px;
          color: #f87171;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          animation: shake 0.35s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60%  { transform: translateX(-6px); }
          40%,80%  { transform: translateX(6px); }
        }

        /* Submit button */
        .btn-primary {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.3px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
        }
        .btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .btn-primary:hover:not(:disabled)::after { opacity: 1; }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.45);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0px); }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ---- OTP step ---- */
        .otp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .back-btn {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.2s;
          padding: 0;
        }
        .back-btn:hover { color: rgba(255,255,255,0.8); }

        .email-badge {
          font-size: 12px;
          color: rgba(99,102,241,0.9);
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 20px;
          padding: 4px 12px;
          font-weight: 500;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .otp-boxes {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 8px;
        }
        .otp-box {
          width: 54px; height: 62px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          text-align: center;
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #f0f0ff;
          outline: none;
          transition: all 0.15s;
          caret-color: transparent;
        }
        .otp-box:focus {
          border-color: rgba(99,102,241,0.6);
          background: rgba(99,102,241,0.08);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15), 0 0 16px rgba(99,102,241,0.1);
          transform: scale(1.05);
        }
        .otp-box.filled {
          border-color: rgba(139,92,246,0.4);
          background: rgba(139,92,246,0.07);
          color: #c4b5fd;
        }

        /* Timer bar */
        .timer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 20px 0 24px;
          gap: 12px;
        }
        .timer-bar-wrap {
          flex: 1;
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          overflow: hidden;
        }
        .timer-bar {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #6366f1, #a78bfa);
          transition: width 1s linear;
        }
        .timer-label {
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
          min-width: 32px;
          text-align: right;
        }
        .resend-btn {
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: rgba(99,102,241,0.85);
          padding: 0;
          transition: color 0.2s, opacity 0.2s;
          white-space: nowrap;
        }
        .resend-btn:disabled {
          color: rgba(255,255,255,0.2);
          cursor: not-allowed;
        }
        .resend-btn:not(:disabled):hover { color: #a78bfa; }

        /* Divider */
        .divider {
          display: flex; align-items: center; gap: 12px;
          margin: 28px 0;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.06);
        }
        .divider-text {
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* Success */
        .success-wrap {
          text-align: center;
          animation: cardIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .success-icon {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1));
          border: 1px solid rgba(52,211,153,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px;
          margin: 0 auto 24px;
          box-shadow: 0 0 40px rgba(52,211,153,0.2);
          animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes popIn {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .success-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #f0f0ff;
          margin-bottom: 8px;
        }
        .success-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.35);
          margin-bottom: 32px;
          line-height: 1.5;
          font-weight: 300;
        }
        .success-sub strong {
          color: rgba(52,211,153,0.8);
          font-weight: 500;
        }
      `}</style>

      <div className="otp-root">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <div className="card">
          {/* ─── EMAIL STEP ─── */}
          {step === "email" && (
            <form onSubmit={handleSendOTP}>
              <div className="icon-wrap">🔐</div>
              <div className="card-title">Welcome back</div>
              <div className="card-subtitle">
                Enter your email and we'll send you a<br />one-time passcode to sign in.
              </div>

              <div className={`input-wrap${focused ? " focused" : ""}`}>
                <span className="input-icon">✉</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  className="email-input"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                />
              </div>

              {error && <div className="error-msg">⚠ {error}</div>}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading && <span className="spinner" />}
                {loading ? "Sending code…" : "Send Passcode →"}
              </button>
            </form>
          )}

          {/* ─── OTP STEP ─── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP}>
              <div className="icon-wrap">✉️</div>
              <div className="card-title">Check your inbox</div>
              <div className="card-subtitle">
                We sent a 6-digit code to<br />
                <span>{email}</span>
              </div>

              <div className="otp-header">
                <button type="button" className="back-btn" onClick={handleGoBack}>
                  ← Change email
                </button>
                <span className="email-badge">{email}</span>
              </div>

              <div className="otp-boxes">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    className={`otp-box${digit ? " filled" : ""}`}
                    maxLength="1"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpInput(e, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  />
                ))}
              </div>

              {error && <div className="error-msg" style={{ justifyContent: "center" }}>⚠ {error}</div>}

              <div className="timer-row">
                <div className="timer-bar-wrap">
                  <div className="timer-bar" style={{ width: `${timerPercent}%` }} />
                </div>
                <span className="timer-label">{timer}s</span>
                <button
                  type="button"
                  className="resend-btn"
                  onClick={handleResendOTP}
                  disabled={timer > 0 || loading}
                >
                  {timer > 0 ? "Resend" : "Resend code"}
                </button>
              </div>

              <button type="submit" className="btn-primary" disabled={loading || otp.join("").length < OTP_LENGTH}>
                {loading && <span className="spinner" />}
                {loading ? "Verifying…" : "Verify & Sign In →"}
              </button>
            </form>
          )}

          {/* ─── SUCCESS STEP ─── */}
          {step === "success" && (
            <div className="success-wrap">
              <div className="success-icon">✓</div>
              <div className="success-title">You're in!</div>
              <div className="success-sub">
                Signed in as<br />
                <strong>{email}</strong>
              </div>
              <button
                className="btn-primary"
                onClick={() => navigate('/dashboard')}
                style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}
              >
                Continue to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
