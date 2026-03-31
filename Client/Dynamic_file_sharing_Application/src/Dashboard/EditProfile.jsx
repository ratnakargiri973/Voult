import { useState, useEffect } from "react";
import axios from "axios";

const BASE = "http://localhost:8080/api/v1/dashboard";

const MODAL_STYLES = `
  .ep-overlay {
    position:fixed; inset:0; z-index:9999;
    background:rgba(0,0,0,0.7); backdrop-filter:blur(6px);
    display:flex; align-items:center; justify-content:center; padding:16px;
    animation:ep-fadeIn 0.18s ease both;
  }
  @keyframes ep-fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes ep-popIn  { from{opacity:0;transform:scale(0.93) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }

  .ep-box {
    background:var(--surface); border:1px solid var(--border2);
    border-radius:18px; width:100%; max-width:460px;
    display:flex; flex-direction:column;
    animation:ep-popIn 0.25s cubic-bezier(.34,1.56,.64,1) both;
    max-height:90vh; overflow:hidden;
  }
  .ep-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:20px 24px 16px; border-bottom:1px solid var(--border);
    flex-shrink:0;
  }
  .ep-title { font-family:var(--serif); font-size:18px; font-weight:900; color:var(--text); letter-spacing:-0.3px; }
  .ep-close {
    width:30px; height:30px; border-radius:8px;
    background:var(--surface2); border:1px solid var(--border);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:var(--text-2); transition:all 0.15s;
  }
  .ep-close:hover { background:var(--surface3); color:var(--text); }

  .ep-body { padding:24px; display:flex; flex-direction:column; gap:16px; overflow-y:auto; }

  .ep-avatar-row { display:flex; align-items:center; gap:16px; padding-bottom:4px; }
  .ep-avatar {
    width:64px; height:64px; border-radius:16px;
    background:linear-gradient(135deg,var(--amber),#d97706);
    display:flex; align-items:center; justify-content:center;
    font-family:var(--serif); font-size:26px; font-weight:900; color:#0f0d0b;
    flex-shrink:0; box-shadow:0 0 24px var(--amber-glow);
  }
  .ep-avatar-info { flex:1; }
  .ep-avatar-name { font-family:var(--serif); font-size:16px; font-weight:700; color:var(--text); margin-bottom:3px; }
  .ep-avatar-email { font-size:12px; color:var(--text-3); }

  .ep-field { display:flex; flex-direction:column; gap:6px; }
  .ep-label { font-size:11px; font-weight:500; color:var(--text-3); letter-spacing:0.06em; text-transform:uppercase; }
  .ep-input {
    width:100%; padding:10px 14px;
    background:var(--surface2); border:1px solid var(--border);
    border-radius:9px; color:var(--text);
    font-family:var(--sans); font-size:13px; font-weight:400;
    transition:all 0.15s; outline:none;
  }
  .ep-input:focus { border-color:rgba(245,158,11,0.45); background:var(--surface3); box-shadow:0 0 0 3px rgba(245,158,11,0.07); }
  .ep-input::placeholder { color:var(--text-3); }
  .ep-input:disabled { opacity:0.45; cursor:not-allowed; }
  .ep-textarea { resize:vertical; min-height:80px; line-height:1.5; }

  .ep-footer {
    padding:16px 24px; border-top:1px solid var(--border);
    display:flex; gap:10px; flex-shrink:0;
  }
  .ep-btn {
    flex:1; padding:10px 14px; border-radius:9px;
    font-family:var(--sans); font-size:13px; font-weight:600;
    cursor:pointer; transition:all 0.15s; border:1px solid var(--border);
  }
  .ep-btn.cancel { background:var(--surface2); color:var(--text-2); }
  .ep-btn.cancel:hover { background:var(--surface3); color:var(--text); }
  .ep-btn.save {
    background:linear-gradient(135deg,var(--amber),#d97706);
    color:#0f0d0b; border-color:transparent;
    box-shadow:0 3px 14px var(--amber-glow);
  }
  .ep-btn.save:hover { filter:brightness(1.08); transform:translateY(-1px); }
  .ep-btn.save:disabled { opacity:0.5; cursor:not-allowed; transform:none; filter:none; }

  .ep-error { font-size:12px; color:var(--red); background:var(--red-dim); border:1px solid rgba(248,113,113,0.2); border-radius:8px; padding:9px 13px; }
  .ep-success { font-size:12px; color:var(--green); background:var(--green-dim); border:1px solid rgba(52,211,153,0.2); border-radius:8px; padding:9px 13px; }
`;

export default function EditProfile({ user, token, onClose, onSave }) {
  const [form, setForm] = useState({
    username: user?.username || user?.email?.split("@")[0] || "",
    email:    user?.email    || "",
    phone:    user?.phone    || "",
    bio:      user?.bio      || "",
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const set = (k) => (e) => {
    setError(""); setSuccess("");
    setForm(prev => ({ ...prev, [k]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.username.trim()) return setError("Username is required.");
    if (!form.email.trim())    return setError("Email is required.");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setError("Enter a valid email.");

    setSaving(true); setError(""); setSuccess("");
    try {
      const { data } = await axios.put(
        `${BASE}/profile/${user.id || user._id}`,
        { username: form.username.trim(), email: form.email.trim(), phone: form.phone.trim(), bio: form.bio.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Profile updated successfully!");
      onSave?.(data.profile);
      setTimeout(onClose, 1200);
    } catch (err) {
        console.log(err);
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally { setSaving(false); }
  };

  const initials = form.username?.[0]?.toUpperCase() || "U";

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="ep-overlay" onClick={onClose}>
        <div className="ep-box" onClick={e => e.stopPropagation()}>

          <div className="ep-header">
            <span className="ep-title">Edit Profile</span>
            <button className="ep-close" onClick={onClose}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="ep-body">
            <div className="ep-avatar-row">
              <div className="ep-avatar">{initials}</div>
              <div className="ep-avatar-info">
                <div className="ep-avatar-name">{form.username || "Your name"}</div>
                <div className="ep-avatar-email">{form.email}</div>
              </div>
            </div>

            {error   && <div className="ep-error">{error}</div>}
            {success && <div className="ep-success">{success}</div>}

            <div className="ep-field">
              <label className="ep-label">Username</label>
              <input className="ep-input" value={form.username} onChange={set("username")} placeholder="your_username" disabled={saving}/>
            </div>

            <div className="ep-field">
              <label className="ep-label">Email</label>
              <input className="ep-input" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" disabled={saving}/>
            </div>

            <div className="ep-field">
              <label className="ep-label">Phone <span style={{color:"var(--text-3)",textTransform:"none",letterSpacing:0,fontSize:11}}>(optional)</span></label>
              <input className="ep-input" value={form.phone} onChange={set("phone")} placeholder="+1 555 000 0000" disabled={saving}/>
            </div>

            <div className="ep-field">
              <label className="ep-label">Bio <span style={{color:"var(--text-3)",textTransform:"none",letterSpacing:0,fontSize:11}}>(optional)</span></label>
              <textarea className="ep-input ep-textarea" value={form.bio} onChange={set("bio")} placeholder="A short bio about yourself…" disabled={saving}/>
            </div>
          </div>

          <div className="ep-footer">
            <button className="ep-btn cancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="ep-btn save" onClick={handleSave} disabled={saving}>
              {saving
                ? <span style={{display:"flex",alignItems:"center",gap:7,justifyContent:"center"}}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{animation:"fm-spin 0.7s linear infinite"}}>
                      <circle cx="6" cy="6" r="4.5" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5"/>
                      <path d="M6 1.5A4.5 4.5 0 0110.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Saving…
                  </span>
                : "Save changes"
              }
            </button>
          </div>

        </div>
      </div>
    </>
  );
}