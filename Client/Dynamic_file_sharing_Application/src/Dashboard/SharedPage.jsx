// ─── Drop this SharedPage into your Dashboard.jsx ───
// Replace the existing SharedPage function with this one.
// Also add ShareModal import at the top of Dashboard.jsx:
// import ShareModal from "./ShareModal";

import axios from "axios";
import React, { useState, useEffect, useCallback } from "react";
import { getToken } from "../utils/handleAuth";

const FILE_BASE = "http://localhost:8080/api/v1/file";
const DASH_BASE = "http://localhost:8080/api/v1/dashboard";

/* ── helpers ── */
const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fi = (name = "") => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const map = {
        pdf: "📄", jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🎞️",
        mp4: "🎬", mp3: "🎵", zip: "📦", doc: "📝", docx: "📝",
        xls: "📊", xlsx: "📊", txt: "📃",
    };
    return map[ext] || "📁";
};

const SHARED_STYLES = `
  @keyframes spPageIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
  @keyframes spSpin    { to{transform:rotate(360deg)} }
  @keyframes spSlide   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .sp-shell    { animation:spPageIn 0.35s cubic-bezier(.22,1,.36,1) both; }
  .sp-skel     { background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%); background-size:200% 100%; animation:spShimmer 1.4s infinite; border-radius:6px; }
  .sp-slide    { animation:spSlide 0.28s ease both; }

  /* stat strip */
  .sp-stats    { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:28px; }
  .sp-stat     { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:18px 16px; }
  .sp-stat-val { font-family:var(--serif); font-size:24px; font-weight:900; color:var(--text); letter-spacing:-0.5px; }
  .sp-stat-lbl { font-size:11px; color:var(--text-3); margin-top:4px; letter-spacing:0.03em; }

  /* file cards */
  .sp-grid     { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:14px; }
  .sp-card     {
    background:var(--surface); border:1px solid var(--border); border-radius:14px;
    overflow:hidden; transition:all 0.18s; position:relative;
  }
  .sp-card:hover { border-color:var(--border2); background:var(--surface2); box-shadow:0 6px 28px rgba(0,0,0,0.25); }
  .sp-card-top { padding:16px 16px 12px; display:flex; align-items:flex-start; gap:12px; }
  .sp-card-icon{ width:40px; height:40px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; background:rgba(52,211,153,0.1); border:1px solid rgba(52,211,153,0.18); }
  .sp-card-meta{ flex:1; min-width:0; }
  .sp-card-name{ font-family:'Courier New',monospace; font-size:12px; color:var(--text); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sp-card-date{ font-size:11px; color:var(--text-3); margin-top:3px; }

  /* recipients list */
  .sp-recips   { border-top:1px solid var(--border); padding:10px 16px 14px; display:flex; flex-direction:column; gap:6px; }
  .sp-recip-hdr{ font-size:10px; color:var(--text-3); text-transform:uppercase; letter-spacing:0.07em; font-weight:500; margin-bottom:2px; }
  .sp-recip    { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:8px; background:var(--surface2); border:1px solid var(--border); }
  .sp-recip.failed { background:rgba(248,113,113,0.06); border-color:rgba(248,113,113,0.15); }
  .sp-recip-email { font-family:'Courier New',monospace; font-size:11px; color:var(--text-2); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .sp-recip-date  { font-size:10px; color:var(--text-3); flex-shrink:0; }
  .sp-badge    { font-size:9px; font-weight:600; padding:2px 7px; border-radius:20px; text-transform:uppercase; letter-spacing:0.04em; flex-shrink:0; }
  .sp-badge.ok { background:rgba(52,211,153,0.12); color:var(--green); }
  .sp-badge.fail{ background:rgba(248,113,113,0.12); color:var(--red); }
  .sp-badge.rev { background:rgba(240,236,228,0.07); color:var(--text-3); }
  .sp-fail-reason { font-size:10px; color:rgba(248,113,113,0.65); font-style:italic; margin-top:2px; }

  /* card actions */
  .sp-card-actions { display:flex; gap:8px; padding:0 16px 14px; }
  .sp-act-btn {
    flex:1; padding:8px 10px; border-radius:8px; border:1px solid var(--border);
    background:transparent; color:var(--text-2); font-family:var(--sans);
    font-size:11px; font-weight:500; cursor:pointer; transition:all 0.13s;
    display:flex; align-items:center; justify-content:center; gap:5px;
  }
  .sp-act-btn:hover       { border-color:rgba(52,211,153,0.28); color:var(--green); background:rgba(52,211,153,0.07); }
  .sp-act-btn.danger:hover{ border-color:rgba(248,113,113,0.28); color:var(--red);  background:rgba(248,113,113,0.07); }

  /* empty */
  .sp-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 24px; text-align:center; }
  .sp-empty-box { width:72px; height:72px; border-radius:20px; background:var(--surface); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:18px; }
  .sp-empty-t   { font-family:var(--serif); font-size:18px; font-weight:700; color:var(--text); margin-bottom:8px; }
  .sp-empty-s   { font-size:13px; color:var(--text-2); font-weight:300; line-height:1.6; }

  /* toast */
  .sp-toast {
    position:fixed; bottom:24px; right:24px; z-index:400;
    padding:11px 18px; border-radius:10px; font-size:13px; font-weight:500;
    display:flex; align-items:center; gap:8px; max-width:300px;
    backdrop-filter:blur(12px); animation:spSlide 0.25s ease both;
  }
  .sp-toast.ok  { background:rgba(52,211,153,0.11); border:1px solid rgba(52,211,153,0.25); color:var(--green); }
  .sp-toast.err { background:rgba(248,113,113,0.1);  border:1px solid rgba(248,113,113,0.25); color:var(--red); }

  /* responsive */
  @media(max-width:600px) {
    .sp-stats { grid-template-columns:repeat(2,1fr); }
    .sp-grid  { grid-template-columns:1fr; }
  }
`;

/* ─────────────────────────────────────────────────
   SHARED PAGE — paste this into Dashboard.jsx
───────────────────────────────────────────────── */
export function SharedPage({ onBack, stats, authUser, BackBtn, navigate }) {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };

    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [revoking, setRevoking] = useState(null);   // fileId being revoked
    const [shareTarget, setShareTarget] = useState(null);   // file to open ShareModal for

    const toastTimer = React.useRef();
    const showToast = (msg, type = "ok") => {
        clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    };

    /* ── fetch shared files ── */
    const fetchShared = useCallback(async () => {
        if (!authUser?.id) return;
        setLoading(true);

        // ✅ Read token fresh inside the callback — not from outer scope
        const freshToken = getToken();
        if (!freshToken) {
            showToast("Not authenticated", "err");
            setLoading(false);
            return;
        }

        const freshHeaders = { Authorization: `Bearer ${freshToken}` };

        try {
            const { data } = await axios.get(
                `${DASH_BASE}/shared-files/${authUser.id}`,
                { headers: freshHeaders }   // ✅
            );
            setFiles(data.files || []);
        } catch (err) {
            if (err.response?.status === 401) { clearAuth(); navigate("/login"); return; }
            showToast(err.response?.data?.message || "Failed to load shared files", "err");
        } finally {
            setLoading(false);
        }
    }, [authUser?.id]); // ✅ token removed from deps — we read it fresh each time

    useEffect(() => { fetchShared(); }, [fetchShared]);

    /* ── revoke share ── */
    const handleRevoke = async (file) => {
        if (!window.confirm(`Revoke all share links for "${file.fileName}"?`)) return;
        setRevoking(file._id);

        const freshHeaders = { Authorization: `Bearer ${getToken()}` }; // ✅

        try {
            await axios.patch(
                `${DASH_BASE}/file/${file._id}/toggle`,
                { flag: "isShared" },
                { headers: freshHeaders }
            );
            setFiles(prev => prev.filter(f => f._id !== file._id));
            showToast(`"${file.fileName}" is no longer shared`);
        } catch (err) {
            if (err.response?.status === 401) { clearAuth(); navigate("/login"); return; }
            showToast(err.response?.data?.message || "Failed to revoke", "err");
        } finally {
            setRevoking(null);
        }
    };

    /* ── derived stats ── */
    const totalRecipients = files.reduce((s, f) => s + (f.sharedWith?.length || 0), 0);
    const failedCount = files.reduce(
        (s, f) => s + (f.sharedWith?.filter(r => r.status === "failed").length || 0), 0
    );

    return (
        <>
            <style>{SHARED_STYLES}</style>
            <div className="sp-shell">

                {/* page header */}
                <div className="page-header-row">
                    <BackBtn onClick={onBack} />
                    <h1 className="page-header-title"><span>Shared</span> Files</h1>
                    <button
                        onClick={fetchShared}
                        style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-2)", fontFamily: "var(--sans)", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--text-2)"; }}
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: loading ? "spSpin 0.7s linear infinite" : "none" }}>
                            <path d="M1 6A5 5 0 019.5 2.2M11 6A5 5 0 012.5 9.8M9 1v3H6M3 8v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Refresh
                    </button>
                </div>

                {/* stat strip */}
                <div className="sp-stats">
                    {[
                        { label: "Shared Files", val: loading ? "—" : files.length, color: "var(--green)" },
                        { label: "Total Recipients", val: loading ? "—" : totalRecipients, color: "var(--text)" },
                        { label: "Failed Deliveries", val: loading ? "—" : failedCount, color: failedCount > 0 ? "var(--red)" : "var(--text-3)" },
                    ].map(s => (
                        <div key={s.label} className="sp-stat">
                            <div className="sp-stat-val" style={{ color: s.color }}>{s.val}</div>
                            <div className="sp-stat-lbl">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* loading skeletons */}
                {loading && (
                    <div className="sp-grid">
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                                <div style={{ padding: "16px 16px 12px", display: "flex", gap: 12 }}>
                                    <div className="sp-skel" style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                                        <div className="sp-skel" style={{ height: 12, width: "70%" }} />
                                        <div className="sp-skel" style={{ height: 10, width: "40%" }} />
                                    </div>
                                </div>
                                <div style={{ borderTop: "1px solid var(--border)", padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div className="sp-skel" style={{ height: 32, borderRadius: 8 }} />
                                    <div className="sp-skel" style={{ height: 32, borderRadius: 8 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* empty state */}
                {!loading && files.length === 0 && (
                    <div className="sp-empty">
                        <div className="sp-empty-box">🔗</div>
                        <div className="sp-empty-t">No shared files yet</div>
                        <div className="sp-empty-s">
                            Files you share with others will appear here.<br />
                            Use the Share button on any file to get started.
                        </div>
                        {navigate && (
                            <button
                                onClick={() => navigate("/files")}
                                style={{ marginTop: 20, padding: "9px 20px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 10, color: "var(--green)", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                            >
                                Go to My Files →
                            </button>
                        )}
                    </div>
                )}

                {/* file cards */}
                {!loading && files.length > 0 && (
                    <div className="sp-grid">
                        {files.map((file, idx) => (
                            <div key={file._id} className="sp-card sp-slide" style={{ animationDelay: `${idx * 40}ms` }}>

                                {/* card top */}
                                <div className="sp-card-top">
                                    <div className="sp-card-icon">{fi(file.fileName)}</div>
                                    <div className="sp-card-meta">
                                        <div className="sp-card-name" title={file.fileName}>{file.fileName}</div>
                                        <div className="sp-card-date">Shared · {fmtDate(file.updatedAt || file.createdAt)}</div>
                                    </div>
                                    <a
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ padding: "5px 10px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-3)", fontSize: 11, textDecoration: "none", flexShrink: 0, transition: "all 0.15s" }}
                                        onMouseEnter={e => e.currentTarget.style.color = "var(--text)"}
                                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
                                    >
                                        Open ↗
                                    </a>
                                </div>

                                {/* recipients */}
                                <div className="sp-recips">
                                    <div className="sp-recip-hdr">
                                        {file.sharedWith?.length
                                            ? `${file.sharedWith.length} recipient${file.sharedWith.length !== 1 ? "s" : ""}`
                                            : "No recipient history"
                                        }
                                    </div>
                                    {file.sharedWith?.length ? (
                                        file.sharedWith.slice(0, 4).map((r, i) => (
                                            <div key={i} className={`sp-recip ${r.status === "failed" ? "failed" : ""}`}>
                                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                                    {r.status === "sent"
                                                        ? <><circle cx="5.5" cy="5.5" r="4.5" stroke="#34d399" strokeWidth="1.1" /><path d="M3 5.5l1.6 1.6 2.8-2.8" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></>
                                                        : <><circle cx="5.5" cy="5.5" r="4.5" stroke="#f87171" strokeWidth="1.1" /><path d="M5.5 3.5v2.5M5.5 7.5v.5" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round" /></>
                                                    }
                                                </svg>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="sp-recip-email">{r.email}</div>
                                                    {r.status === "failed" && r.failReason && (
                                                        <div className="sp-fail-reason">{r.failReason}</div>
                                                    )}
                                                </div>
                                                <span className="sp-badge" style={{ marginRight: 4 }}>
                                                    {r.status === "sent" ? <span className="sp-badge ok">✓ Sent</span>
                                                        : r.status === "failed" ? <span className="sp-badge fail">✗ Failed</span>
                                                            : <span className="sp-badge rev">Revoked</span>
                                                    }
                                                </span>
                                                <span className="sp-recip-date">{fmtDate(r.sharedAt)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ fontSize: 11, color: "var(--text-3)", padding: "4px 0" }}>No email recipients recorded</div>
                                    )}
                                    {file.sharedWith?.length > 4 && (
                                        <div style={{ fontSize: 11, color: "var(--text-3)", paddingLeft: 4 }}>
                                            +{file.sharedWith.length - 4} more recipients
                                        </div>
                                    )}
                                </div>

                                {/* actions */}
                                <div className="sp-card-actions">
                                    <button
                                        className="sp-act-btn"
                                        onClick={() => setShareTarget(file)}
                                    >
                                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                            <circle cx="9" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.1" />
                                            <circle cx="9" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.1" />
                                            <circle cx="2" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.1" />
                                            <path d="M3.4 5L7.6 2.7M3.4 6L7.6 8.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                                        </svg>
                                        Share again
                                    </button>
                                    <button
                                        className="sp-act-btn danger"
                                        onClick={() => handleRevoke(file)}
                                        disabled={revoking === file._id}
                                        style={{ flex: "0 0 auto", padding: "8px 14px" }}
                                    >
                                        {revoking === file._id ? (
                                            <div style={{ width: 11, height: 11, border: "1.5px solid rgba(248,113,113,0.3)", borderTopColor: "var(--red)", borderRadius: "50%", animation: "spSpin 0.7s linear infinite" }} />
                                        ) : (
                                            <>
                                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                                    <path d="M1 5.5a4.5 4.5 0 018.5-2M10 5.5a4.5 4.5 0 01-8.5 2M8.5 1v2.5H6M2.5 7.5V10H5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                Revoke
                                            </>
                                        )}
                                    </button>
                                </div>

                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* ShareModal */}
            {shareTarget && (
                <ShareModal
                    file={shareTarget}
                    onClose={() => { setShareTarget(null); fetchShared(); }}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`sp-toast ${toast.type}`}>
                    {toast.type === "ok"
                        ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" /><path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" /><path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    }
                    {toast.msg}
                </div>
            )}
        </>
    );
}
