import { useState, useEffect, useCallback, useRef } from "react"; // ✅ useRef imported
import axios from "axios";

const BASE = "http://localhost:8080/api/v1/dashboard";

const FILE_ICONS = {
    pdf: { e: "📄", bg: "rgba(255,90,90,0.11)", bd: "rgba(255,90,90,0.18)" },
    jpg: { e: "🖼️", bg: "rgba(255,175,45,0.11)", bd: "rgba(255,175,45,0.18)" },
    jpeg: { e: "🖼️", bg: "rgba(255,175,45,0.11)", bd: "rgba(255,175,45,0.18)" },
    png: { e: "🖼️", bg: "rgba(255,175,45,0.11)", bd: "rgba(255,175,45,0.18)" },
    mp4: { e: "🎬", bg: "rgba(120,90,255,0.11)", bd: "rgba(120,90,255,0.18)" },
    mp3: { e: "🎵", bg: "rgba(0,212,170,0.11)", bd: "rgba(0,212,170,0.18)" },
    zip: { e: "📦", bg: "rgba(255,145,45,0.11)", bd: "rgba(255,145,45,0.18)" },
    docx: { e: "📝", bg: "rgba(70,130,255,0.11)", bd: "rgba(70,130,255,0.18)" },
    xlsx: { e: "📊", bg: "rgba(40,195,110,0.11)", bd: "rgba(40,195,110,0.18)" },
    txt: { e: "📃", bg: "rgba(200,200,200,0.07)", bd: "rgba(200,200,200,0.11)" },
};

const fi = (name = "") => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return { ext, ...(FILE_ICONS[ext] || { e: "📁", bg: "rgba(200,200,200,0.07)", bd: "rgba(200,200,200,0.11)" }) };
};

const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtSize = (b) => !b ? "" : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

const TRASH_STYLES = `
  .tr-shell { display:flex; flex-direction:column; gap:0; }

  .tr-banner {
    display:flex; align-items:center; gap:10px;
    padding:12px 16px; margin-bottom:24px;
    background:rgba(248,113,113,0.07);
    border:1px solid rgba(248,113,113,0.18);
    border-radius:12px; font-size:13px; color:var(--red);
    font-weight:300; line-height:1.5;
  }

  .tr-toolbar {
    display:flex; align-items:center; justify-content:space-between;
    gap:12px; margin-bottom:20px; flex-wrap:wrap;
  }
  .tr-count {
    font-family:var(--serif); font-size:14px; color:var(--text-2);
    display:flex; align-items:center; gap:8px;
  }
  .tr-count strong { color:var(--red); font-style:italic; }
  .tr-toolbar-right { display:flex; gap:8px; }

  .tr-btn {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 14px; border-radius:8px; border:1px solid var(--border);
    background:var(--surface); color:var(--text-2);
    font-family:var(--sans); font-size:12px; font-weight:500;
    cursor:pointer; transition:all 0.15s;
  }
  .tr-btn:hover { background:var(--surface2); color:var(--text); border-color:var(--border2); }
  .tr-btn.danger       { color:var(--red); }
  .tr-btn.danger:hover { background:rgba(248,113,113,0.1); border-color:rgba(248,113,113,0.3); }
  .tr-btn:disabled     { opacity:0.4; cursor:not-allowed; pointer-events:none; }

  .tr-list { display:flex; flex-direction:column; gap:8px; }

  .tr-row {
    display:flex; align-items:center; gap:14px;
    background:var(--surface); border:1px solid var(--border);
    border-radius:12px; padding:14px 16px;
    transition:all 0.15s; position:relative; overflow:hidden;
  }
  .tr-row::after {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,rgba(248,113,113,0.15),transparent);
    opacity:0; transition:opacity 0.15s;
  }
  .tr-row:hover { background:var(--surface2); border-color:rgba(248,113,113,0.2); }
  .tr-row:hover::after { opacity:1; }

  .tr-checkbox {
    width:16px; height:16px; border-radius:4px; flex-shrink:0;
    border:1.5px solid var(--border2); background:var(--surface2);
    cursor:pointer; appearance:none; -webkit-appearance:none; transition:all 0.15s;
    position:relative;
  }
  .tr-checkbox:checked { background:var(--red); border-color:var(--red); }
  .tr-checkbox:checked::after {
    content:''; position:absolute; top:1px; left:4px;
    width:5px; height:8px; border:2px solid white;
    border-top:none; border-left:none; transform:rotate(45deg);
  }

  .tr-icon  { width:38px; height:38px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:17px; }
  .tr-info  { flex:1; min-width:0; }
  .tr-name  { font-size:13px; color:var(--text); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .tr-meta  { font-size:11px; color:var(--text-3); margin-top:3px; display:flex; gap:10px; }
  .tr-ext   { font-size:9px; color:var(--text-3); background:var(--surface2); border:1px solid var(--border); border-radius:4px; padding:1px 6px; text-transform:uppercase; flex-shrink:0; font-family:monospace; }

  .tr-actions { display:flex; gap:6px; flex-shrink:0; }
  .tr-act {
    display:inline-flex; align-items:center; gap:4px;
    padding:6px 10px; border-radius:7px; border:1px solid var(--border);
    background:transparent; color:var(--text-2);
    font-family:var(--sans); font-size:11px; font-weight:500;
    cursor:pointer; transition:all 0.13s; white-space:nowrap;
  }
  .tr-act.restore:hover { border-color:rgba(52,211,153,0.3); color:var(--green); background:var(--green-dim); }
  .tr-act.perm:hover    { border-color:rgba(248,113,113,0.3); color:var(--red); background:var(--red-dim); }

  .tr-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:64px 32px; text-align:center; }
  .tr-empty-icon { font-size:48px; margin-bottom:16px; }
  .tr-empty-t    { font-family:var(--serif); font-size:18px; font-weight:700; color:var(--text); margin-bottom:6px; }
  .tr-empty-s    { font-size:13px; color:var(--text-2); font-weight:300; }

  /* ✅ Self-contained skeleton — no dependency on Dashboard styles */
  .tr-skel {
    display:flex; align-items:center; gap:14px;
    background:var(--surface); border:1px solid var(--border);
    border-radius:12px; padding:14px 16px;
  }
  .tr-skel-box {
    background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);
    background-size:200% 100%;
    animation:tr-shimmer 1.5s infinite;
    border-radius:6px;
  }
  @keyframes tr-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .tr-modal-overlay {
    position:fixed; inset:0; z-index:100;
    background:rgba(0,0,0,0.65); backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center;
  }
  .tr-modal {
    background:var(--surface); border:1px solid rgba(248,113,113,0.2);
    border-radius:16px; padding:28px; width:320px; max-width:90vw;
    box-shadow:0 16px 48px rgba(0,0,0,0.5);
  }
  .tr-modal-icon  { font-size:32px; margin-bottom:14px; text-align:center; }
  .tr-modal-title { font-family:var(--serif); font-size:17px; font-weight:700; color:var(--text); margin-bottom:6px; text-align:center; }
  .tr-modal-sub   { font-size:13px; color:var(--text-2); font-weight:300; line-height:1.6; text-align:center; margin-bottom:22px; }
  .tr-modal-btns  { display:flex; gap:8px; }
  .tr-modal-cancel {
    flex:1; padding:10px; border-radius:8px;
    background:var(--surface2); border:1px solid var(--border);
    color:var(--text-2); font-family:var(--sans); font-size:13px;
    cursor:pointer; transition:all 0.15s;
  }
  .tr-modal-cancel:hover { background:var(--surface3); color:var(--text); }
  .tr-modal-confirm {
    flex:1; padding:10px; border-radius:8px;
    background:rgba(248,113,113,0.15); border:1px solid rgba(248,113,113,0.3);
    color:var(--red); font-family:var(--sans); font-size:13px; font-weight:600;
    cursor:pointer; transition:all 0.15s;
  }
  .tr-modal-confirm:hover { background:rgba(248,113,113,0.25); }

  .tr-toast {
    position:fixed; bottom:22px; right:22px; z-index:200;
    padding:11px 16px; border-radius:10px; font-size:13px; font-weight:500;
    display:flex; align-items:center; gap:8px; backdrop-filter:blur(12px);
  }
  .tr-toast.ok  { background:rgba(52,211,153,0.1);  border:1px solid rgba(52,211,153,0.25);  color:var(--green); }
  .tr-toast.err { background:rgba(248,113,113,0.09); border:1px solid rgba(248,113,113,0.25); color:var(--red); }

  /* ✅ error banner for fetch failures */
  .tr-error {
    display:flex; align-items:center; gap:10px; padding:12px 16px;
    background:rgba(248,113,113,0.07); border:1px solid rgba(248,113,113,0.2);
    border-radius:10px; font-size:13px; color:var(--red); margin-bottom:16px;
  }
`;

/* ── Confirm Modal ── */
function ConfirmModal({ count, onCancel, onConfirm, loading }) {
    return (
        <div className="tr-modal-overlay">
            <div className="tr-modal">
                <div className="tr-modal-icon">⚠️</div>
                <div className="tr-modal-title">Delete permanently?</div>
                <div className="tr-modal-sub">
                    {count === 1
                        ? "This file will be removed from Cloudinary and cannot be recovered."
                        : `These ${count} files will be permanently deleted and cannot be recovered.`}
                </div>
                <div className="tr-modal-btns">
                    <button className="tr-modal-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
                    <button className="tr-modal-confirm" onClick={onConfirm} disabled={loading}>
                        {loading ? "Deleting…" : "Yes, delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Skeleton row ── */
function TrSkel() {
    return (
        <div className="tr-skel">
            {/* ✅ using tr-skel-box instead of "skeleton" */}
            <div className="tr-skel-box" style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }} />
            <div className="tr-skel-box" style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                <div className="tr-skel-box" style={{ height: 11, width: "60%", borderRadius: 4 }} />
                <div className="tr-skel-box" style={{ height: 9, width: "35%", borderRadius: 4 }} />
            </div>
            <div className="tr-skel-box" style={{ width: 140, height: 30, borderRadius: 7 }} />
        </div>
    );
}

/* ══════════════════
   TRASH PAGE
══════════════════ */
export function TrashPage({ onBack, authUser, token, BackBtn }) {
    const [files, setFiles] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [toast, setToast] = useState(null);
    const [fetchErr, setFetchErr] = useState("");

    const toastTimer = useRef(null); // ✅ proper useRef
    const headers = { Authorization: `Bearer ${token}` };

    const showToast = (msg, type = "ok") => {
        clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 3200);
    };

    /* ── fetch ── */
    const fetchTrash = useCallback(async () => {
        setLoading(true);
        setFetchErr("");

        // ✅ Add this — check what's actually being sent
        console.log("authUser:", authUser);
        console.log("authUser.id:", authUser?.id);
        console.log("Fetching URL:", `${BASE}/trash/${authUser?.id}`);

        try {
            const { data } = await axios.get(`${BASE}/trash/${authUser.id}`, { headers });
            console.log("Response:", data); // ✅ see what comes back
            setFiles(data.files || []);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to load trash";
            setFetchErr(msg);
            console.error("fetchTrash error:", err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    }, [authUser.id, token]);

    useEffect(() => { fetchTrash(); }, [fetchTrash]);

    /* ── select helpers ── */
    const toggleSelect = (id) => setSelected(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });
    const allSelected = files.length > 0 && selected.size === files.length;
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(files.map(f => f._id)));

    /* ── restore single ── */
    const handleRestore = async (fileId) => {
        setActing(true);
        try {
            await axios.patch(`${BASE}/trash/${fileId}/restore`, {}, { headers });
            setFiles(prev => prev.filter(f => f._id !== fileId));
            setSelected(prev => { const n = new Set(prev); n.delete(fileId); return n; });
            showToast("File restored to My Files");
        } catch (err) {
            showToast(err.response?.data?.message || "Restore failed", "err");
        } finally { setActing(false); }
    };

    /* ── restore selected ── */
    const handleRestoreSelected = async () => {
        if (!selected.size) return;
        setActing(true);
        try {
            await Promise.all([...selected].map(id =>
                axios.patch(`${BASE}/trash/${id}/restore`, {}, { headers })
            ));
            setFiles(prev => prev.filter(f => !selected.has(f._id)));
            showToast(`${selected.size} file${selected.size > 1 ? "s" : ""} restored`);
            setSelected(new Set());
        } catch (err) {
            showToast(err.response?.data?.message || "Some restores failed", "err");
        } finally { setActing(false); }
    };

    /* ── permanent delete ── */
    const execDelete = async (ids) => {
        setActing(true);
        try {
            await Promise.all(ids.map(id =>
                axios.delete(`${BASE}/file/${id}`, { headers })
            ));
            setFiles(prev => prev.filter(f => !ids.includes(f._id)));
            setSelected(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
            showToast(`${ids.length} file${ids.length > 1 ? "s" : ""} permanently deleted`);
        } catch (err) {
            showToast(err.response?.data?.message || "Delete failed", "err");
        } finally { setActing(false); setConfirm(null); }
    };

    const confirmInfo = confirm === "bulk"
        ? { count: selected.size, ids: [...selected] }
        : confirm?.id
            ? { count: 1, ids: [confirm.id] }
            : null;

    return (
        <>
            <style>{TRASH_STYLES}</style>

            <div className="tr-shell">

                {/* Header */}
                <div className="page-header-row">
                    <BackBtn onClick={onBack} />
                    <h1 className="page-header-title">🗑️ <span>Trash</span></h1>
                </div>

                {/* Warning banner */}
                <div className="tr-banner">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M7.5 1L14 13H1L7.5 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                        <path d="M7.5 6v3.5M7.5 11v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    Files in trash are permanently deleted after 30 days. Restore them to keep them safe.
                </div>

                {/* ✅ fetch error with retry */}
                {fetchErr && (
                    <div className="tr-error">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" /><path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                        {fetchErr}
                        <button
                            onClick={fetchTrash}
                            style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 12, fontWeight: 500, textDecoration: "underline" }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Toolbar */}
                <div className="tr-toolbar">
                    <div className="tr-count">
                        {loading ? "Loading…" : (
                            <>
                                <strong>{files.length}</strong>
                                {" "}file{files.length !== 1 ? "s" : ""} in trash
                                {selected.size > 0 && (
                                    <span style={{ color: "var(--text-3)", fontWeight: 300 }}>
                                        · {selected.size} selected
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                    <div className="tr-toolbar-right">
                        {selected.size > 0 && (
                            <>
                                <button className="tr-btn" onClick={handleRestoreSelected} disabled={acting}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M1 6A5 5 0 009.5 2.2M11 6A5 5 0 012.5 9.8M10 2v3H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Restore {selected.size > 1 ? `(${selected.size})` : ""}
                                </button>
                                <button className="tr-btn danger" onClick={() => setConfirm("bulk")} disabled={acting}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M1.5 2.5h9M4 2.5V2a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v.5M5 5v4.5M7 5v4.5M2 2.5l.8 7.5a.5.5 0 00.5.5h5.4a.5.5 0 00.5-.5L10 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Delete {selected.size > 1 ? `(${selected.size})` : ""}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="tr-list">
                        {[0, 1, 2, 3].map(i => <TrSkel key={i} />)}
                    </div>
                ) : files.length === 0 ? (
                    <div className="tr-empty">
                        <div className="tr-empty-icon">🗑️</div>
                        <div className="tr-empty-t">Trash is empty</div>
                        <div className="tr-empty-s">Files you delete will appear here before being permanently removed.</div>
                    </div>
                ) : (
                    <div className="tr-list">
                        {/* Select-all row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 16px 8px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                            <input type="checkbox" className="tr-checkbox" checked={allSelected} onChange={toggleAll} />
                            <span style={{ fontSize: 12, color: "var(--text-3)" }}>Select all</span>
                        </div>

                        {files.map((file, i) => {
                            const { e, bg, bd, ext } = fi(file.fileName);
                            const isSelected = selected.has(file._id);
                            return (
                                <div
                                    key={file._id}
                                    className="tr-row"
                                    style={{
                                        animationDelay: `${i * 40}ms`,
                                        outline: isSelected ? "1px solid rgba(248,113,113,0.25)" : "none"
                                    }}
                                >
                                    <input
                                        type="checkbox" className="tr-checkbox"
                                        checked={isSelected} onChange={() => toggleSelect(file._id)}
                                    />
                                    <div className="tr-icon" style={{ background: bg, border: `1px solid ${bd}` }}>{e}</div>
                                    <div className="tr-info">
                                        <div className="tr-name" title={file.fileName}>{file.fileName}</div>
                                        <div className="tr-meta">
                                            {file.createdAt && <span>{fmtDate(file.createdAt)}</span>}
                                            {file.size > 0 && <span>{fmtSize(file.size)}</span>}
                                        </div>
                                    </div>
                                    <span className="tr-ext">{ext}</span>
                                    <div className="tr-actions">
                                        <button className="tr-act restore" onClick={() => handleRestore(file._id)} disabled={acting}>
                                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                                <path d="M1 5.5A4.5 4.5 0 009 2M10 5.5A4.5 4.5 0 012 9M9 1.5v3H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Restore
                                        </button>
                                        <button className="tr-act perm" onClick={() => setConfirm({ id: file._id })} disabled={acting}>
                                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                                <path d="M1.5 2.5h8M3.5 2.5V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v.5M4 4.5v4M7 4.5v4M2 2.5l.6 7a.5.5 0 00.5.5h4.8a.5.5 0 00.5-.5l.6-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Confirm modal */}
            {confirmInfo && (
                <ConfirmModal
                    count={confirmInfo.count}
                    loading={acting}
                    onCancel={() => setConfirm(null)}
                    onConfirm={() => execDelete(confirmInfo.ids)}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`tr-toast ${toast.type}`}>
                    {toast.type === "ok"
                        ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4 6.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        : <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" /><path d="M6.5 4v3M6.5 9v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                    }
                    {toast.msg}
                </div>
            )}
        </>
    );
}