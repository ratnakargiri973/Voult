import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { clearAuth } from "../utils/handleAuth";

const DASH_BASE = "http://localhost:8080/api/v1/dashboard";

const FILE_ICONS = {
  pdf:  { e:"📄", bg:"rgba(255,90,90,0.11)",   bd:"rgba(255,90,90,0.18)" },
  jpg:  { e:"🖼️", bg:"rgba(255,175,45,0.11)",  bd:"rgba(255,175,45,0.18)" },
  jpeg: { e:"🖼️", bg:"rgba(255,175,45,0.11)",  bd:"rgba(255,175,45,0.18)" },
  png:  { e:"🖼️", bg:"rgba(255,175,45,0.11)",  bd:"rgba(255,175,45,0.18)" },
  gif:  { e:"🎞️", bg:"rgba(255,175,45,0.11)",  bd:"rgba(255,175,45,0.18)" },
  mp4:  { e:"🎬", bg:"rgba(120,90,255,0.11)",   bd:"rgba(120,90,255,0.18)" },
  mp3:  { e:"🎵", bg:"rgba(0,212,170,0.11)",    bd:"rgba(0,212,170,0.18)" },
  zip:  { e:"📦", bg:"rgba(255,145,45,0.11)",   bd:"rgba(255,145,45,0.18)" },
  doc:  { e:"📝", bg:"rgba(70,130,255,0.11)",   bd:"rgba(70,130,255,0.18)" },
  docx: { e:"📝", bg:"rgba(70,130,255,0.11)",   bd:"rgba(70,130,255,0.18)" },
  xls:  { e:"📊", bg:"rgba(40,195,110,0.11)",   bd:"rgba(40,195,110,0.18)" },
  xlsx: { e:"📊", bg:"rgba(40,195,110,0.11)",   bd:"rgba(40,195,110,0.18)" },
  txt:  { e:"📃", bg:"rgba(200,200,200,0.07)",  bd:"rgba(200,200,200,0.11)" },
};
const fi = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return { ext, ...(FILE_ICONS[ext] || { e:"📁", bg:"rgba(200,200,200,0.07)", bd:"rgba(200,200,200,0.11)" }) };
};
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
const fmtSize = (b) => b ? (b < 1024*1024 ? `${(b/1024).toFixed(0)} KB` : `${(b/(1024*1024)).toFixed(1)} MB`) : "";

const STYLES = `
  @keyframes sp-fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes sp-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes sp-slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sp-spin    { to{transform:rotate(360deg)} }

  .sp-topbar {
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:20px; flex-wrap:wrap; gap:12px;
  }
  .sp-heading {
    font-family:var(--serif); font-size:18px; font-weight:900;
    color:var(--text); letter-spacing:-0.3px;
    display:flex; align-items:center; gap:10px;
  }
  .sp-count {
    font-size:10px; color:var(--amber);
    background:var(--amber-dim); border:1px solid rgba(245,158,11,0.18);
    border-radius:20px; padding:2px 9px; font-family:'Courier New',monospace;
  }
  .sp-controls { display:flex; align-items:center; gap:8px; }
  .sp-view-toggle { display:flex; background:var(--surface); border:1px solid var(--border); border-radius:8px; overflow:hidden; }
  .sp-view-btn { padding:6px 10px; background:none; border:none; cursor:pointer; color:var(--text-3); transition:all 0.15s; display:flex; align-items:center; }
  .sp-view-btn.active { background:var(--surface2); color:var(--amber); }
  .sp-view-btn:hover:not(.active) { color:var(--text-2); }
  .sp-ref-btn {
    display:flex; align-items:center; gap:5px; padding:6px 12px;
    background:var(--surface); border:1px solid var(--border); border-radius:7px;
    color:var(--text-2); font-family:var(--sans); font-size:12px;
    cursor:pointer; transition:all 0.15s;
  }
  .sp-ref-btn:hover { background:var(--surface2); color:var(--text); border-color:var(--border2); }

  .sp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
  .sp-list { display:flex; flex-direction:column; gap:8px; }

  .sp-fc {
    background:var(--surface); border:1px solid var(--border);
    border-radius:13px; padding:16px;
    display:flex; flex-direction:column; gap:12px;
    transition:all 0.18s; position:relative;
    animation:sp-slideUp 0.32s cubic-bezier(.22,1,.36,1) both;
  }
  .sp-fc:hover { border-color:rgba(245,158,11,0.25); background:var(--surface2); transform:translateY(-2px); box-shadow:0 6px 28px rgba(0,0,0,0.25); }
  .sp-fc-top  { display:flex; align-items:flex-start; gap:10px; }
  .sp-fc-icon { width:38px; height:38px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:17px; }
  .sp-fc-body { flex:1; min-width:0; }
  .sp-fc-name { font-size:11px; color:var(--text); word-break:break-all; line-height:1.5; font-family:'Courier New',monospace; }
  .sp-fc-meta { font-size:10px; color:var(--text-3); margin-top:3px; font-family:'Courier New',monospace; }
  .sp-fc-ext  { font-size:9px; color:var(--text-3); background:var(--surface2); border:1px solid var(--border); border-radius:4px; padding:2px 6px; text-transform:uppercase; flex-shrink:0; font-family:'Courier New',monospace; }
  .sp-star-pip { position:absolute; top:12px; right:12px; line-height:1; }
  .sp-fc-actions { display:flex; gap:5px; }

  .sp-fr {
    background:var(--surface); border:1px solid var(--border);
    border-radius:11px; padding:12px 16px;
    display:flex; align-items:center; gap:14px;
    transition:all 0.15s;
    animation:sp-slideUp 0.3s cubic-bezier(.22,1,.36,1) both;
  }
  .sp-fr:hover { background:var(--surface2); border-color:rgba(245,158,11,0.2); }
  .sp-fr-icon { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:15px; }
  .sp-fr-info { flex:1; min-width:0; }
  .sp-fr-name { font-size:12px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Courier New',monospace; }
  .sp-fr-meta { font-size:10px; color:var(--text-3); margin-top:2px; font-family:'Courier New',monospace; display:flex; gap:8px; }
  .sp-fr-ext  { font-size:9px; color:var(--text-3); background:var(--surface2); border:1px solid var(--border); border-radius:4px; padding:1px 6px; text-transform:uppercase; flex-shrink:0; font-family:'Courier New',monospace; }
  .sp-fr-actions { display:flex; gap:6px; flex-shrink:0; }

  .sp-btn {
    flex:1; padding:7px 6px; border-radius:7px; border:1px solid var(--border);
    background:transparent; color:var(--text-2); font-family:var(--sans);
    font-size:11px; font-weight:500; cursor:pointer; transition:all 0.13s;
    display:flex; align-items:center; justify-content:center; gap:4px;
    text-decoration:none; white-space:nowrap;
  }
  .sp-btn:hover        { border-color:rgba(245,158,11,0.3); color:var(--amber); background:var(--amber-dim); }
  .sp-btn.danger:hover { border-color:rgba(248,113,113,0.3); color:var(--red); background:var(--red-dim); }
  .sp-btn:disabled     { opacity:0.45; cursor:not-allowed; pointer-events:none; }

  .sp-skel { background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%); background-size:200% 100%; animation:sp-shimmer 1.4s infinite; border-radius:6px; }

  .sp-empty {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:64px 32px; text-align:center; animation:sp-fadeIn 0.4s ease both;
  }
  .sp-empty-icon {
    width:72px; height:72px; border-radius:18px;
    background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.18);
    display:flex; align-items:center; justify-content:center;
    margin-bottom:18px; font-size:30px; box-shadow:0 0 36px rgba(245,158,11,0.06);
  }
  .sp-empty-title { font-family:var(--serif); font-size:20px; font-weight:700; color:var(--text); margin-bottom:8px; }
  .sp-empty-sub   { font-size:14px; color:var(--text-2); font-weight:300; line-height:1.6; max-width:300px; }

  .sp-err { display:flex; align-items:center; gap:10px; padding:12px 16px; background:var(--red-dim); border:1px solid rgba(248,113,113,0.2); border-radius:10px; font-size:13px; color:var(--red); margin-bottom:20px; }
  .sp-err-retry { background:none; border:none; color:var(--red); cursor:pointer; font-size:12px; font-weight:500; text-decoration:underline; margin-left:auto; padding:0; }

  .sp-debug { font-size:11px; color:var(--text-3); background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:10px 14px; margin-bottom:16px; font-family:'Courier New',monospace; line-height:1.7; }

  @media (max-width:600px) { .sp-grid { grid-template-columns:1fr; } }
`;

const Spinner = () => (
  <div style={{ width:10, height:10, border:"1.5px solid rgba(248,113,113,0.3)", borderTopColor:"var(--red)", borderRadius:"50%", animation:"sp-spin 0.6s linear infinite", flexShrink:0 }}/>
);

const StarIcon = ({ filled }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill={filled ? "var(--amber)" : "none"}>
    <path d="M6 1l1.4 3h3.1l-2.5 2 1 3L6 7.3 3 9l1-3L1.5 4h3.1L6 1z"
      stroke="var(--amber)" strokeWidth="1.1" strokeLinejoin="round"/>
  </svg>
);

function SpSkelGrid() {
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:13, padding:16, display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:10 }}>
        <div className="sp-skel" style={{ width:38, height:38, borderRadius:9, flexShrink:0 }}/>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:7 }}>
          <div className="sp-skel" style={{ height:11, width:"72%", borderRadius:4 }}/>
          <div className="sp-skel" style={{ height:9, width:"40%", borderRadius:4 }}/>
        </div>
      </div>
      <div className="sp-skel" style={{ height:28, borderRadius:7 }}/>
    </div>
  );
}

function SpSkelRow() {
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:11, padding:"12px 16px", display:"flex", alignItems:"center", gap:14 }}>
      <div className="sp-skel" style={{ width:34, height:34, borderRadius:8, flexShrink:0 }}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
        <div className="sp-skel" style={{ height:11, width:"55%", borderRadius:4 }}/>
        <div className="sp-skel" style={{ height:9, width:"28%", borderRadius:4 }}/>
      </div>
      <div className="sp-skel" style={{ width:70, height:26, borderRadius:7 }}/>
    </div>
  );
}

function StarredCard({ file, onUnstar, busy, delay }) {
  const { e, bg, bd, ext } = fi(file.fileName);
  const name = file.fileName.length > 26 ? file.fileName.slice(0, 24) + "…" : file.fileName;
  return (
    <div className="sp-fc" style={{ animationDelay:`${delay}ms` }}>
      <div className="sp-star-pip"><StarIcon filled/></div>
      <div className="sp-fc-top">
        <div className="sp-fc-icon" style={{ background:bg, border:`1px solid ${bd}` }}>{e}</div>
        <div className="sp-fc-body">
          <div className="sp-fc-name" title={file.fileName}>{name}</div>
          <div className="sp-fc-meta">
            {file.createdAt && fmtDate(file.createdAt)}
            {file.size > 0 && ` · ${fmtSize(file.size)}`}
          </div>
        </div>
        <span className="sp-fc-ext">{ext}</span>
      </div>
      <div className="sp-fc-actions">
        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="sp-btn">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M4 1H1.5A.5.5 0 001 1.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V7M7 1h3m0 0v3m0-3L4.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Open
        </a>
        <a href={file.fileUrl} download={file.fileName} className="sp-btn">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v7M3 5.5l2.5 2.5L8 5.5M1 9.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Save
        </a>
        <button className="sp-btn danger" disabled={busy} onClick={() => onUnstar(file)}>
          {busy ? <Spinner/> : <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 2l7 7M9 2L2 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
          Unstar
        </button>
      </div>
    </div>
  );
}

function StarredRow({ file, onUnstar, busy, delay }) {
  const { e, bg, bd, ext } = fi(file.fileName);
  const name = file.fileName.length > 40 ? file.fileName.slice(0, 38) + "…" : file.fileName;
  return (
    <div className="sp-fr" style={{ animationDelay:`${delay}ms` }}>
      <div className="sp-fr-icon" style={{ background:bg, border:`1px solid ${bd}` }}>{e}</div>
      <div className="sp-fr-info">
        <div className="sp-fr-name" title={file.fileName}>{name}</div>
        <div className="sp-fr-meta">
          {file.createdAt && <span>{fmtDate(file.createdAt)}</span>}
          {file.size > 0  && <span>{fmtSize(file.size)}</span>}
        </div>
      </div>
      <span className="sp-fr-ext">{ext}</span>
      <div className="sp-fr-actions">
        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="sp-btn">Open</a>
        <a href={file.fileUrl} download={file.fileName} className="sp-btn">Save</a>
        <button className="sp-btn danger" disabled={busy} onClick={() => onUnstar(file)}
          style={{ display:"flex", alignItems:"center", gap:5 }}>
          {busy ? <Spinner/> : <StarIcon filled/>}
          Unstar
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════
   EXPORT
══════════════════════════════ */
export function StarredPage({ onBack, authUser, token, BackBtn }) {
  const navigate = useNavigate();

  // ✅ FIX 1: handle both .id and ._id
  const USER_ID = authUser?.id ?? authUser?._id;

  const [files,     setFiles]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [view,      setView]      = useState("grid");
  const [busyIds,   setBusyIds]   = useState(new Set());

  const fetchStarred = useCallback(async () => {
    if (!USER_ID) {
      setError("No user ID found — make sure authUser is passed correctly.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ✅ FIX 2: headers inside callback — not a stale closure
      const headers = { Authorization: `Bearer ${token}` };
      const { data } = await axios.get(`${DASH_BASE}/starred/${USER_ID}`, { headers });

      // ✅ FIX 3: normalise — backend uses isStarred, UI uses starred
      const normalised = (data.files ?? []).map(f => ({
        ...f,
        starred: f.isStarred ?? f.starred ?? true,
      }));
      setFiles(normalised);
    } catch (err) {
      if (err.response?.status === 401) { clearAuth(); navigate("/login"); return; }
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to load starred files");
    } finally {
      setLoading(false);
    }
  }, [USER_ID, token, navigate]);

  useEffect(() => { fetchStarred(); }, [fetchStarred]);

  const handleUnstar = async (file) => {
    // Optimistic remove
    setBusyIds(prev => new Set(prev).add(file._id));
    setFiles(prev => prev.filter(f => f._id !== file._id));

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${DASH_BASE}/starred/${file._id}/unstar`, {}, { headers });
    } catch (err) {
      // Roll back
      setFiles(prev =>
        [file, ...prev].sort((a, b) =>
          new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt)
        )
      );
      if (err.response?.status === 401) { clearAuth(); navigate("/login"); return; }
      setError(err.response?.data?.message || "Failed to unstar — try again");
    } finally {
      setBusyIds(prev => { const n = new Set(prev); n.delete(file._id); return n; });
    }
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="anim-pageIn">

        {BackBtn && (
          <div className="page-header-row" style={{ marginBottom:24 }}>
            <BackBtn onClick={onBack}/>
            <h1 className="page-header-title"><span>Starred</span> Files</h1>
          </div>
        )}

        {error && (
          <div className="sp-err">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M7 4v3M7 9v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {error}
            <button className="sp-err-retry" onClick={() => { setError(""); fetchStarred(); }}>Retry</button>
          </div>
        )}

        <div className="sp-topbar">
          <div className="sp-heading">
            Starred
            {!loading && files.length > 0 && <span className="sp-count">{files.length}</span>}
          </div>
          <div className="sp-controls">
            <div className="sp-view-toggle">
              <button className={`sp-view-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="8" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="1" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="8" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              </button>
              <button className={`sp-view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <button className="sp-ref-btn" onClick={fetchStarred} disabled={loading}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                style={{ animation: loading ? "sp-spin 0.7s linear infinite" : "none" }}>
                <path d="M1 6A5 5 0 019.5 2.2M11 6A5 5 0 012.5 9.8M9 1v3H6M3 8v3h3"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          view === "grid"
            ? <div className="sp-grid">{[0,1,2,3].map(i => <SpSkelGrid key={i}/>)}</div>
            : <div className="sp-list">{[0,1,2,3].map(i => <SpSkelRow key={i}/>)}</div>
        )}

        {!loading && !error && files.length === 0 && (
          <div className="sp-empty">
            <div className="sp-empty-icon">⭐</div>
            <div className="sp-empty-title">No starred files yet</div>
            <div className="sp-empty-sub">
              Use the ★ button in <strong style={{ color:"var(--text)" }}>My Files</strong> to star anything — it'll show up here.
            </div>
          </div>
        )}

        {!loading && files.length > 0 && view === "grid" && (
          <div className="sp-grid">
            {files.map((f, i) => (
              <StarredCard key={f._id} file={f} onUnstar={handleUnstar}
                busy={busyIds.has(f._id)} delay={i * 40}/>
            ))}
          </div>
        )}

        {!loading && files.length > 0 && view === "list" && (
          <div className="sp-list">
            {files.map((f, i) => (
              <StarredRow key={f._id} file={f} onUnstar={handleUnstar}
                busy={busyIds.has(f._id)} delay={i * 30}/>
            ))}
          </div>
        )}

      </div>
    </>
  );
}