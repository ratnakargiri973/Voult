import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getToken } from "../utils/handleAuth";

const BASE_URL = "http://localhost:8080/api/v1/dashboard";

const STYLES = `
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }
  @keyframes modalIn   { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

  .sm-overlay {
    position:fixed; inset:0; z-index:300;
    background:rgba(0,0,0,0.65); backdrop-filter:blur(6px);
    display:flex; align-items:center; justify-content:center;
    padding:20px; animation:overlayIn 0.2s ease both;
  }
  .sm-modal {
    background:#111318; border:1px solid rgba(255,255,255,0.08);
    border-radius:20px; width:100%; max-width:500px;
    box-shadow:0 24px 80px rgba(0,0,0,0.6);
    animation:modalIn 0.3s cubic-bezier(.22,1,.36,1) both;
    overflow:hidden; max-height:90vh; display:flex; flex-direction:column;
  }

  /* Header */
  .sm-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:20px 24px; border-bottom:1px solid rgba(255,255,255,0.06);
  }
  .sm-header-left { display:flex; align-items:center; gap:12px; }
  .sm-icon-box {
    width:40px; height:40px; border-radius:10px;
    background:rgba(0,212,170,0.1); border:1px solid rgba(0,212,170,0.2);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .sm-title     { font-family:'Fraunces',serif; font-size:16px; font-weight:700; color:#e4e8f0; }
  .sm-filename  { font-family:'Courier New',monospace; font-size:11px; color:rgba(228,232,240,0.4); margin-top:2px; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .sm-close {
    width:30px; height:30px; border-radius:8px; background:#181c24;
    border:1px solid rgba(255,255,255,0.06); cursor:pointer; color:rgba(228,232,240,0.4);
    display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0;
  }
  .sm-close:hover { color:#e4e8f0; border-color:rgba(255,255,255,0.12); }

  /* Body */
  .sm-body { padding:20px 24px; display:flex; flex-direction:column; gap:16px; overflow-y:auto; }

  /* Email input area */
  .sm-label { font-size:12px; color:rgba(228,232,240,0.4); font-weight:500; letter-spacing:0.04em; text-transform:uppercase; margin-bottom:8px; }

  .sm-tag-input-wrap {
    background:#181c24; border:1px solid rgba(255,255,255,0.08);
    border-radius:11px; padding:10px 12px;
    display:flex; flex-wrap:wrap; gap:6px; align-items:center;
    cursor:text; transition:border-color 0.15s; min-height:52px;
  }
  .sm-tag-input-wrap:focus-within { border-color:rgba(0,212,170,0.4); }

  .sm-tag {
    display:inline-flex; align-items:center; gap:5px;
    padding:3px 10px 3px 10px; border-radius:20px; font-size:12px; font-weight:500;
    background:rgba(0,212,170,0.1); border:1px solid rgba(0,212,170,0.25); color:#00d4aa;
    font-family:'Courier New',monospace;
    animation:slideDown 0.18s ease both;
  }
  .sm-tag.invalid {
    background:rgba(255,92,92,0.1); border-color:rgba(255,92,92,0.25); color:#ff5c5c;
  }
  .sm-tag-remove {
    background:none; border:none; cursor:pointer; color:inherit; opacity:0.6;
    padding:0; display:flex; align-items:center; font-size:13px; line-height:1;
    transition:opacity 0.15s;
  }
  .sm-tag-remove:hover { opacity:1; }

  .sm-tag-input {
    background:none; border:none; outline:none; color:#e4e8f0;
    font-family:'Geist',sans-serif; font-size:13px; flex:1; min-width:120px;
    padding:2px 0;
  }
  .sm-tag-input::placeholder { color:rgba(228,232,240,0.2); }

  .sm-hint { font-size:11px; color:rgba(228,232,240,0.25); font-weight:300; }

  /* Send button */
  .sm-send-btn {
    width:100%; padding:13px; border:none; border-radius:10px; cursor:pointer;
    font-family:'Geist',sans-serif; font-size:14px; font-weight:600;
    transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .sm-send-btn.ready {
    background:linear-gradient(135deg,#00d4aa,#00b896);
    color:#0a0c10; box-shadow:0 4px 18px rgba(0,212,170,0.28);
  }
  .sm-send-btn.ready:hover { transform:translateY(-1px); box-shadow:0 7px 24px rgba(0,212,170,0.35); }
  .sm-send-btn.disabled {
    background:rgba(255,255,255,0.04); color:rgba(228,232,240,0.2); cursor:not-allowed;
  }
  .sm-spinner {
    width:15px; height:15px; border:2px solid rgba(10,12,16,0.3);
    border-top-color:#0a0c10; border-radius:50%; animation:spin 0.7s linear infinite;
  }

  /* Results */
  .sm-results { display:flex; flex-direction:column; gap:6px; animation:slideDown 0.2s ease both; }
  .sm-result-row {
    display:flex; align-items:center; gap:10px;
    padding:10px 14px; border-radius:9px; font-size:12px;
  }
  .sm-result-row.sent   { background:rgba(0,212,170,0.07); border:1px solid rgba(0,212,170,0.15); }
  .sm-result-row.failed { background:rgba(255,92,92,0.07); border:1px solid rgba(255,92,92,0.15); }
  .sm-result-email { font-family:'Courier New',monospace; color:#e4e8f0; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .sm-result-badge {
    font-size:10px; font-weight:600; padding:2px 8px; border-radius:20px;
    letter-spacing:0.04em; text-transform:uppercase; flex-shrink:0;
  }
  .sm-result-badge.sent   { background:rgba(0,212,170,0.15); color:#00d4aa; }
  .sm-result-badge.failed { background:rgba(255,92,92,0.15); color:#ff5c5c; }
  .sm-result-reason { font-size:11px; color:rgba(255,92,92,0.7); font-weight:300; margin-top:3px; font-style:italic; }

  /* Summary banner */
  .sm-summary {
    padding:11px 14px; border-radius:9px; font-size:13px; font-weight:500;
    display:flex; align-items:center; gap:8px; animation:slideDown 0.2s ease both;
  }
  .sm-summary.all-ok     { background:rgba(0,212,170,0.09); border:1px solid rgba(0,212,170,0.2); color:#00d4aa; }
  .sm-summary.partial    { background:rgba(245,158,11,0.09); border:1px solid rgba(245,158,11,0.2); color:#f59e0b; }
  .sm-summary.all-failed { background:rgba(255,92,92,0.09); border:1px solid rgba(255,92,92,0.2); color:#ff5c5c; }

  /* History */
  .sm-history-toggle {
    display:flex; align-items:center; gap:6px; background:none; border:none;
    color:rgba(228,232,240,0.35); font-family:'Geist',sans-serif; font-size:12px;
    cursor:pointer; padding:0; transition:color 0.15s;
  }
  .sm-history-toggle:hover { color:rgba(228,232,240,0.65); }

  .sm-history { display:flex; flex-direction:column; gap:5px; animation:slideDown 0.18s ease both; }
  .sm-history-row {
    display:flex; align-items:center; gap:10px;
    padding:9px 12px; border-radius:8px; background:#181c24;
    border:1px solid rgba(255,255,255,0.05);
  }
  .sm-history-email { font-family:'Courier New',monospace; font-size:11px; color:rgba(228,232,240,0.6); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .sm-history-date  { font-size:10px; color:rgba(228,232,240,0.25); flex-shrink:0; }

  /* Divider */
  .sm-divider { height:1px; background:rgba(255,255,255,0.05); }

  /* Copy link row */
  .sm-copy-row {
    display:flex; gap:8px; align-items:center;
  }
  .sm-copy-input {
    flex:1; background:#181c24; border:1px solid rgba(255,255,255,0.07);
    border-radius:8px; padding:9px 12px; color:rgba(228,232,240,0.5);
    font-family:'Courier New',monospace; font-size:11px; outline:none;
  }
  .sm-copy-btn {
    padding:9px 14px; background:#181c24; border:1px solid rgba(255,255,255,0.08);
    border-radius:8px; color:rgba(228,232,240,0.6); font-family:'Geist',sans-serif;
    font-size:12px; cursor:pointer; transition:all 0.15s; white-space:nowrap; flex-shrink:0;
  }
  .sm-copy-btn:hover { background:#1f2430; color:#e4e8f0; border-color:rgba(255,255,255,0.14); }
  .sm-copy-btn.copied { color:#00d4aa; border-color:rgba(0,212,170,0.25); background:rgba(0,212,170,0.07); }
`;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function ShareModal({ file, onClose }) {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };

    const [inputVal, setInputVal] = useState("");
    const [emails, setEmails] = useState([]);        // { value, valid }[]
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState(null);      // per-email results
    const [summary, setSummary] = useState("");
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHist, setLoadingHist] = useState(false);
    const [copied, setCopied] = useState(false);
    const inputRef = useRef();

    // ── Load share history on open ──────────────────────
    useEffect(() => {
        if (!file?._id) return;
        setLoadingHist(true);
        axios.get(`${BASE_URL}/share-history/${file._id}`, { headers })
            .then(({ data }) => setHistory(data.sharedWith || []))
            .catch(() => { })
            .finally(() => setLoadingHist(false));
    }, [file?._id]);

    // ── Add email tag on Enter / Space / comma ──────────
    const handleKeyDown = (e) => {
        if (["Enter", " ", ",", "Tab"].includes(e.key)) {
            e.preventDefault();
            addEmail(inputVal.trim());
        }
        if (e.key === "Backspace" && !inputVal && emails.length) {
            setEmails(prev => prev.slice(0, -1));
        }
    };

    const addEmail = (val) => {
        if (!val) return;
        const valid = EMAIL_REGEX.test(val);
        const dupe = emails.some(e => e.value === val);
        if (!dupe) setEmails(prev => [...prev, { value: val, valid }]);
        setInputVal("");
    };

    const removeEmail = (idx) => setEmails(prev => prev.filter((_, i) => i !== idx));

    // ── Send ─────────────────────────────────────────────
    const handleSend = async () => {
    const validEmails = emails.filter(e => e.valid).map(e => e.value);
    if (!validEmails.length) return;

    setSending(true);
    setResults(null);
    setSummary("");

    const freshHeaders = { Authorization: `Bearer ${getToken()}` };

    try {
        const { data } = await axios.post(
            `${BASE_URL}/share/${file._id}`,
            { emails: validEmails },
            { headers: freshHeaders }
        );

        // ✅ Map backend shape to UI shape
        const mapped = [
            ...(data.delivered || []).map(email => ({
                email,
                status: "sent",
                error:  null,
            })),
            ...(data.failed || []).map(f => ({
                email:  f.email,
                status: "failed",
                error:  f.reason,
            })),
        ];

        setResults(mapped);
        setSummary(data.message || "");

        // ✅ Refresh history
        const freshHeaders2 = { Authorization: `Bearer ${getToken()}` };
        const histRes = await axios.get(
            `${BASE_URL}/share-history/${file._id}`,
            { headers: freshHeaders2 }
        );
        setHistory(histRes.data.sharedWith || []);

        // ✅ Remove delivered emails from tag input
        const sentSet = new Set(data.delivered || []);
        setEmails(prev => prev.filter(e => !sentSet.has(e.value)));

    } catch (err) {
        setSummary(err.response?.data?.message || "Something went wrong.");
        setResults([]);
    } finally {
        setSending(false);
    }
};

    const handleCopyLink = () => {
        navigator.clipboard.writeText(file.fileUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const validCount = emails.filter(e => e.valid).length;
    const invalidCount = emails.filter(e => !e.valid).length;
    const canSend = validCount > 0 && !sending;

    const summaryClass = results
        ? results.every(r => r.status === "sent") ? "all-ok"
            : results.every(r => r.status === "failed") ? "all-failed"
                : "partial"
        : "";

    return (
        <>
            <style>{STYLES}</style>
            <div className="sm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="sm-modal">

                    {/* ── Header ── */}
                    <div className="sm-header">
                        <div className="sm-header-left">
                            <div className="sm-icon-box">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <circle cx="13" cy="3.5" r="2" stroke="#00d4aa" strokeWidth="1.4" />
                                    <circle cx="13" cy="14.5" r="2" stroke="#00d4aa" strokeWidth="1.4" />
                                    <circle cx="5" cy="9" r="2" stroke="#00d4aa" strokeWidth="1.4" />
                                    <path d="M6.8 8l4.4-3M6.8 10l4.4 3" stroke="#00d4aa" strokeWidth="1.4" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div>
                                <div className="sm-title">Share via email</div>
                                <div className="sm-filename">{file?.fileName}</div>
                            </div>
                        </div>
                        <button className="sm-close" onClick={onClose}>
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* ── Body ── */}
                    <div className="sm-body">

                        {/* Email tag input */}
                        <div>
                            <div className="sm-label">Recipients</div>
                            <div className="sm-tag-input-wrap" onClick={() => inputRef.current?.focus()}>
                                {emails.map((e, i) => (
                                    <span key={i} className={`sm-tag ${e.valid ? "" : "invalid"}`}>
                                        {e.value}
                                        <button className="sm-tag-remove" onClick={() => removeEmail(i)}>×</button>
                                    </span>
                                ))}
                                <input
                                    ref={inputRef}
                                    className="sm-tag-input"
                                    value={inputVal}
                                    placeholder={emails.length ? "" : "name@example.com, press Enter to add…"}
                                    onChange={e => setInputVal(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={() => addEmail(inputVal.trim())}
                                    onPaste={e => {
                                        e.preventDefault();
                                        const pasted = e.clipboardData.getData("text");
                                        pasted.split(/[\s,;]+/).filter(Boolean).forEach(addEmail);
                                    }}
                                />
                            </div>
                            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span className="sm-hint">Press Enter, Space, or comma to add multiple addresses</span>
                                {invalidCount > 0 && (
                                    <span style={{ fontSize: 11, color: "#ff5c5c" }}>{invalidCount} invalid</span>
                                )}
                            </div>
                        </div>

                        {/* Summary banner */}
                        {summary && (
                            <div className={`sm-summary ${summaryClass}`}>
                                {summaryClass === "all-ok" && (
                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" /><path d="M4.5 7.5l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                )}
                                {summaryClass === "all-failed" && (
                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" /><path d="M7.5 4.5v4M7.5 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                                )}
                                {summaryClass === "partial" && (
                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L9 5.5h4.5l-3.6 2.8 1.4 4.2L7.5 10l-3.8 2.5 1.4-4.2L1.5 5.5H6L7.5 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                                )}
                                {summary}
                            </div>
                        )}

                        {/* Per-email results */}
                        {results && results.length > 0 && (
                            <div className="sm-results">
                                {results.map((r, i) => (
                                    <div key={i} className={`sm-result-row ${r.status}`}>
                                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                            {r.status === "sent"
                                                ? <><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" /><path d="M3.5 6.5l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></>
                                                : <><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" /><path d="M6.5 3.5v3.5M6.5 9v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></>
                                            }
                                        </svg>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="sm-result-email">{r.email}</div>
                                            {r.status === "failed" && r.error && (
                                                <div className="sm-result-reason">{r.error}</div>
                                            )}
                                        </div>
                                        <span className={`sm-result-badge ${r.status}`}>
                                            {r.status === "sent" ? "✓ Delivered" : "✗ Failed"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Send button */}
                        <button
                            className={`sm-send-btn ${canSend ? "ready" : "disabled"}`}
                            onClick={handleSend}
                            disabled={!canSend}
                        >
                            {sending ? (
                                <><div className="sm-spinner" /> Sending…</>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M1 1l12 6-12 6V8.5l8-1.5-8-1.5V1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                                    </svg>
                                    Send to {validCount > 0 ? `${validCount} recipient${validCount !== 1 ? "s" : ""}` : "recipients"}
                                </>
                            )}
                        </button>

                        <div className="sm-divider" />

                        {/* Copy link */}
                        <div>
                            <div className="sm-label">Or share link directly</div>
                            <div className="sm-copy-row">
                                <input
                                    className="sm-copy-input"
                                    value={file?.fileUrl || ""}
                                    readOnly
                                    onClick={e => e.target.select()}
                                />
                                <button className={`sm-copy-btn ${copied ? "copied" : ""}`} onClick={handleCopyLink}>
                                    {copied ? "✓ Copied!" : "Copy link"}
                                </button>
                            </div>
                        </div>

                        {/* Share history */}
                        {(history.length > 0 || loadingHist) && (
                            <>
                                <div className="sm-divider" />
                                <div>
                                    <button className="sm-history-toggle" onClick={() => setShowHistory(v => !v)}>
                                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ transform: showHistory ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
                                            <path d="M5 3l4 3.5L5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Previously shared with ({history.length})
                                    </button>

                                    {showHistory && (
                                        <div className="sm-history" style={{ marginTop: 10 }}>
                                            {loadingHist ? (
                                                <div style={{ textAlign: "center", padding: "12px 0", color: "rgba(228,232,240,0.3)", fontSize: 12 }}>Loading…</div>
                                            ) : (
                                                history.map((h, i) => (
                                                    <div key={i} className="sm-history-row">
                                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                            {h.status === "sent"
                                                                ? <><circle cx="6" cy="6" r="5" stroke="#00d4aa" strokeWidth="1.2" /><path d="M3.5 6l1.8 1.8 3-3" stroke="#00d4aa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></>
                                                                : <><circle cx="6" cy="6" r="5" stroke="#ff5c5c" strokeWidth="1.2" /><path d="M6 3.5v3M6 8.5v.5" stroke="#ff5c5c" strokeWidth="1.2" strokeLinecap="round" /></>
                                                            }
                                                        </svg>
                                                        <span className="sm-history-email">{h.email}</span>
                                                        <span className="sm-history-date">{fmtDate(h.sharedAt)}</span>
                                                        {h.status === "failed" && (
                                                            <span style={{ fontSize: 9, color: "#ff5c5c", background: "rgba(255,92,92,0.1)", border: "1px solid rgba(255,92,92,0.2)", borderRadius: 4, padding: "1px 5px" }}>FAILED</span>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
}
