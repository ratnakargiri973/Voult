import React, { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getUser, getToken, clearAuth } from "../utils/handleAuth";
import ShareModal from "./ShareModal";

const BASE_URL = "http://localhost:8080/api/v1/file";
const DASH_BASE = "http://localhost:8080/api/v1/dashboard";

const FM_STYLES = `
  @keyframes fm-fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fm-fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes fm-spin    { to{transform:rotate(360deg)} }
  @keyframes fm-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes fm-slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fm-popIn   { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
  @keyframes fm-progFill{ from{width:0%} to{width:100%} }
  @keyframes fm-pulse   { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes fm-borderGlow {
    0%,100%{ border-color:rgba(245,158,11,0.28); }
    50%    { border-color:rgba(245,158,11,0.6); box-shadow:0 0 20px rgba(245,158,11,0.12); }
  }

  .fm-wrap {
    display:grid;
    grid-template-columns: 380px 1fr;
    min-height: calc(100vh - 130px);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
  }

  /* LEFT PANEL */
  .fm-panel-upload {
    border-right:1px solid var(--border);
    display:flex; flex-direction:column;
    background:var(--surface);
    overflow-y:auto;
    max-height: calc(100vh - 130px);
  }
  .fm-panel-inner {
    padding:28px 24px;
    display:flex; flex-direction:column; gap:20px;
    animation:fm-fadeUp 0.45s cubic-bezier(.22,1,.36,1) both;
  }
  .fm-panel-title { font-family:var(--serif); font-size:20px; font-weight:900; color:var(--text); letter-spacing:-0.4px; line-height:1.2; }
  .fm-panel-title span { font-style:italic; color:var(--amber); }
  .fm-panel-sub { font-size:13px; color:var(--text-2); font-weight:300; line-height:1.55; margin-top:4px; }

  .fm-drop-zone {
    position:relative; border:2px dashed rgba(245,158,11,0.22);
    border-radius:16px; padding:32px 20px; text-align:center;
    cursor:pointer; background:var(--surface2); transition:all 0.22s;
    overflow:hidden;
  }
  .fm-drop-zone.drag { border-color:var(--amber); background:rgba(245,158,11,0.04); animation:fm-borderGlow 1.4s ease infinite; }
  .fm-drop-zone:hover:not(.drag) { border-color:rgba(245,158,11,0.4); background:rgba(245,158,11,0.02); }
  .fm-dz-icon {
    width:56px; height:56px; border-radius:14px;
    background:var(--amber-dim); border:1px solid rgba(245,158,11,0.18);
    display:flex; align-items:center; justify-content:center;
    margin:0 auto 12px; transition:all 0.2s;
  }
  .fm-drop-zone:hover .fm-dz-icon, .fm-drop-zone.drag .fm-dz-icon {
    background:rgba(245,158,11,0.18); box-shadow:0 0 28px var(--amber-glow); transform:translateY(-3px);
  }
  .fm-dz-title { font-family:var(--serif); font-size:17px; font-weight:700; color:var(--text); margin-bottom:5px; }
  .fm-dz-sub   { font-size:12px; color:var(--text-2); font-weight:300; line-height:1.6; margin-bottom:16px; }
  .fm-dz-sub strong { color:var(--amber); font-weight:500; }
  .fm-dz-btn {
    display:inline-flex; align-items:center; gap:7px; padding:9px 20px;
    background:linear-gradient(135deg,var(--amber),#d97706);
    color:#0f0d0b; font-family:var(--sans); font-size:13px; font-weight:600;
    border:none; border-radius:9px; cursor:pointer; transition:all 0.2s;
    box-shadow:0 3px 16px var(--amber-glow);
  }
  .fm-dz-btn:hover { transform:translateY(-1px); box-shadow:0 6px 22px var(--amber-glow); }
  .fm-dz-formats { margin-top:12px; display:flex; flex-wrap:wrap; gap:5px; justify-content:center; }
  .fm-fmt-tag {
    font-size:9px; color:var(--text-3);
    background:var(--surface3); border:1px solid var(--border);
    border-radius:4px; padding:2px 7px; letter-spacing:0.05em; text-transform:uppercase;
  }
  .fm-dz-progress { position:absolute; bottom:0; left:0; right:0; height:3px; background:var(--border); }
  .fm-prog-bar { height:100%; background:linear-gradient(90deg,var(--amber),#fcd34d); animation:fm-progFill 1.8s cubic-bezier(.4,0,.2,1) forwards; }
  .fm-uploading { display:flex; flex-direction:column; align-items:center; gap:10px; }
  .fm-spin-ring {
    width:48px; height:48px; border-radius:12px;
    background:var(--amber-dim); border:1px solid rgba(245,158,11,0.25);
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 0 24px var(--amber-glow);
  }

  .fm-info-row {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 14px; background:var(--surface2);
    border:1px solid var(--border); border-radius:10px;
  }
  .fm-info-label { font-size:12px; color:var(--text-3); }
  .fm-info-val   { font-size:11px; color:var(--text-2); font-family:'Courier New',monospace; }
  .fm-info-val.ok { color:var(--amber); }

  /* RIGHT PANEL */
  .fm-panel-files { display:flex; flex-direction:column; background:var(--bg); overflow-y:auto; max-height:calc(100vh - 130px); }
  .fm-files-topbar {
    position:sticky; top:0; z-index:10;
    display:flex; align-items:center; justify-content:space-between;
    padding:18px 24px 14px;
    background:rgba(15,13,11,0.92); backdrop-filter:blur(12px);
    border-bottom:1px solid var(--border);
    gap:12px; flex-wrap:wrap;
  }
  .fm-files-heading {
    font-family:var(--serif); font-size:18px; font-weight:900;
    color:var(--text); letter-spacing:-0.3px;
    display:flex; align-items:center; gap:10px;
  }
  .fm-count-pill {
    font-size:10px; color:var(--amber);
    background:var(--amber-dim); border:1px solid rgba(245,158,11,0.18);
    border-radius:20px; padding:2px 9px; font-family:'Courier New',monospace;
  }
  .fm-topbar-right { display:flex; align-items:center; gap:8px; }
  .fm-view-toggle { display:flex; background:var(--surface); border:1px solid var(--border); border-radius:8px; overflow:hidden; }
  .fm-view-btn { padding:6px 10px; background:none; border:none; cursor:pointer; color:var(--text-3); transition:all 0.15s; display:flex; align-items:center; }
  .fm-view-btn.active { background:var(--surface2); color:var(--amber); }
  .fm-view-btn:hover:not(.active) { color:var(--text-2); }
  .fm-ref-btn {
    display:flex; align-items:center; gap:5px; padding:6px 12px;
    background:var(--surface); border:1px solid var(--border); border-radius:7px;
    color:var(--text-2); font-family:var(--sans); font-size:12px;
    cursor:pointer; transition:all 0.15s;
  }
  .fm-ref-btn:hover { background:var(--surface2); color:var(--text); border-color:var(--border2); }

  .fm-files-content { padding:18px 24px 28px; flex:1; }
  .fm-file-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
  .fm-file-list { display:flex; flex-direction:column; gap:8px; }

  /* File card */
  .fm-fc {
    background:var(--surface); border:1px solid var(--border);
    border-radius:13px; padding:16px;
    display:flex; flex-direction:column; gap:12px;
    transition:all 0.18s; position:relative; overflow:hidden;
    animation:fm-slideUp 0.32s cubic-bezier(.22,1,.36,1) both;
  }
  .fm-fc:hover { border-color:var(--border2); background:var(--surface2); transform:translateY(-2px); box-shadow:0 6px 28px rgba(0,0,0,0.28); }
  .fm-fc-top   { display:flex; align-items:flex-start; gap:10px; }
  .fm-fc-icon  { width:38px; height:38px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:17px; }
  .fm-fc-name  { font-size:11px; color:var(--text); font-weight:400; word-break:break-all; line-height:1.5; flex:1; margin-top:1px; font-family:'Courier New',monospace; }
  .fm-fc-ext   { font-size:9px; color:var(--text-3); background:var(--surface2); border:1px solid var(--border); border-radius:4px; padding:2px 6px; text-transform:uppercase; flex-shrink:0; margin-top:2px; font-family:'Courier New',monospace; }
  .fm-fc-date  { font-size:10px; color:var(--text-3); margin-top:2px; font-family:'Courier New',monospace; }
  .fm-fc-actions { display:flex; gap:5px; flex-wrap:wrap; }

  .fm-fa-btn {
    flex:1; padding:7px 6px; border-radius:7px; border:1px solid var(--border);
    background:transparent; color:var(--text-2); font-family:var(--sans);
    font-size:11px; font-weight:500; cursor:pointer; transition:all 0.13s;
    display:flex; align-items:center; justify-content:center; gap:4px; text-decoration:none;
    white-space:nowrap;
  }
  .fm-fa-btn:hover     { border-color:rgba(245,158,11,0.3); color:var(--amber); background:var(--amber-dim); }
  .fm-fa-btn.del:hover { border-color:rgba(248,113,113,0.3); color:var(--red); background:var(--red-dim); }

  /* File row */
  .fm-fr {
    background:var(--surface); border:1px solid var(--border);
    border-radius:11px; padding:12px 16px;
    display:flex; align-items:center; gap:14px;
    transition:all 0.15s;
    animation:fm-slideUp 0.3s cubic-bezier(.22,1,.36,1) both;
  }
  .fm-fr:hover { background:var(--surface2); border-color:var(--border2); }
  .fm-fr-icon { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:15px; }
  .fm-fr-info { flex:1; min-width:0; }
  .fm-fr-name { font-size:12px; color:var(--text); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Courier New',monospace; }
  .fm-fr-meta { font-size:10px; color:var(--text-3); margin-top:2px; display:flex; gap:10px; font-family:'Courier New',monospace; }
  .fm-fr-ext  { font-size:9px; color:var(--text-3); background:var(--surface2); border:1px solid var(--border); border-radius:4px; padding:1px 6px; text-transform:uppercase; flex-shrink:0; font-family:'Courier New',monospace; }
  .fm-fr-actions { display:flex; gap:6px; flex-shrink:0; }

  /* Empty */
  .fm-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 32px; text-align:center; min-height:300px; animation:fm-fadeIn 0.4s ease both; }
  .fm-empty-box { width:64px; height:64px; border-radius:16px; background:var(--surface); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; margin-bottom:16px; font-size:26px; }
  .fm-empty-t { font-family:var(--serif); font-size:17px; font-weight:700; color:var(--text); margin-bottom:5px; }
  .fm-empty-s { font-size:13px; color:var(--text-2); font-weight:300; }

  /* Skeleton */
  .fm-skel { background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%); background-size:200% 100%; animation:fm-shimmer 1.4s infinite; border-radius:6px; }

  /* Toast */
  .fm-toast {
    position:fixed; bottom:22px; right:22px; z-index:9999;
    padding:12px 18px; border-radius:11px; font-size:13px; font-weight:500;
    display:flex; align-items:center; gap:9px;
    animation:fm-popIn 0.28s cubic-bezier(.34,1.56,.64,1) both;
    backdrop-filter:blur(12px); max-width:300px; font-family:var(--sans);
  }
  .fm-toast.ok  { background:rgba(52,211,153,0.1); border:1px solid rgba(52,211,153,0.25); color:var(--green); }
  .fm-toast.err { background:var(--red-dim); border:1px solid rgba(248,113,113,0.25); color:var(--red); }

  /* Delete Modal */
  .fm-modal-overlay {
    position:fixed; inset:0; z-index:9998;
    background:rgba(0,0,0,0.65); backdrop-filter:blur(6px);
    display:flex; align-items:center; justify-content:center;
    animation:fm-fadeIn 0.18s ease both;
  }
  .fm-modal-box {
    background:var(--surface); border:1px solid var(--border2);
    border-radius:16px; padding:28px 28px 24px;
    width:100%; max-width:380px; margin:16px;
    animation:fm-popIn 0.22s cubic-bezier(.34,1.56,.64,1) both;
    display:flex; flex-direction:column; gap:18px;
  }
  .fm-modal-icon {
    width:46px; height:46px; border-radius:12px;
    background:var(--red-dim); border:1px solid rgba(248,113,113,0.22);
    display:flex; align-items:center; justify-content:center;
  }
  .fm-modal-title { font-family:var(--serif); font-size:18px; font-weight:900; color:var(--text); letter-spacing:-0.3px; }
  .fm-modal-sub   { font-size:13px; color:var(--text-2); font-weight:300; line-height:1.55; margin-top:4px; }
  .fm-modal-fname {
    font-size:11px; color:var(--text);
    background:var(--surface2); border:1px solid var(--border);
    border-radius:8px; padding:10px 13px;
    word-break:break-all; line-height:1.6; font-family:'Courier New',monospace;
  }
  .fm-modal-actions { display:flex; gap:9px; }
  .fm-modal-btn {
    flex:1; padding:10px 14px; border-radius:9px;
    font-family:var(--sans); font-size:13px; font-weight:600;
    cursor:pointer; transition:all 0.15s; border:1px solid var(--border);
  }
  .fm-modal-btn.cancel  { background:var(--surface2); color:var(--text-2); }
  .fm-modal-btn.cancel:hover { background:var(--surface3); color:var(--text); }
  .fm-modal-btn.confirm { background:var(--red); color:#fff; border-color:var(--red); box-shadow:0 3px 14px rgba(248,113,113,0.22); }
  .fm-modal-btn.confirm:hover { filter:brightness(1.1); }

  @media (max-width:900px) {
    .fm-wrap { grid-template-columns:1fr; grid-template-rows:auto 1fr; }
    .fm-panel-upload { max-height:none; border-right:none; border-bottom:1px solid var(--border); }
    .fm-panel-files  { max-height:none; }
  }
  @media (max-width:600px) {
    .fm-panel-inner  { padding:18px 16px; }
    .fm-files-content{ padding:14px 16px; }
    .fm-files-topbar { padding:12px 16px; }
    .fm-file-grid    { grid-template-columns:1fr; }
  }
`;

/* ─── File type map ─── */
const FILE_ICONS = {
  pdf: { e: "📄", bg: "rgba(255,90,90,0.11)", bd: "rgba(255,90,90,0.18)" },
  jpg: { e: "🖼️", bg: "rgba(255,175,45,0.11)", bd: "rgba(255,175,45,0.18)" },
  jpeg: { e: "🖼️", bg: "rgba(255,175,45,0.11)", bd: "rgba(255,175,45,0.18)" },
  png: { e: "🖼️", bg: "rgba(255,175,45,0.11)", bd: "rgba(255,175,45,0.18)" },
  gif: { e: "🎞️", bg: "rgba(255,175,45,0.11)", bd: "rgba(255,175,45,0.18)" },
  mp4: { e: "🎬", bg: "rgba(120,90,255,0.11)", bd: "rgba(120,90,255,0.18)" },
  mp3: { e: "🎵", bg: "rgba(0,212,170,0.11)", bd: "rgba(0,212,170,0.18)" },
  zip: { e: "📦", bg: "rgba(255,145,45,0.11)", bd: "rgba(255,145,45,0.18)" },
  doc: { e: "📝", bg: "rgba(70,130,255,0.11)", bd: "rgba(70,130,255,0.18)" },
  docx: { e: "📝", bg: "rgba(70,130,255,0.11)", bd: "rgba(70,130,255,0.18)" },
  xls: { e: "📊", bg: "rgba(40,195,110,0.11)", bd: "rgba(40,195,110,0.18)" },
  xlsx: { e: "📊", bg: "rgba(40,195,110,0.11)", bd: "rgba(40,195,110,0.18)" },
  txt: { e: "📃", bg: "rgba(200,200,200,0.07)", bd: "rgba(200,200,200,0.11)" },
};
const fi = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return { ext, ...(FILE_ICONS[ext] || { e: "📁", bg: "rgba(200,200,200,0.07)", bd: "rgba(200,200,200,0.11)" }) };
};
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtSize = (b) => b ? (b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`) : "";

/* ─── Sub-components ─── */
function FmToast({ t }) {
  if (!t) return null;
  return (
    <div className={`fm-toast ${t.type === "success" ? "ok" : "err"}`}>
      {t.type === "success"
        ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" /><path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" /><path d="M7 4v3M7 9v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
      }
      {t.msg}
    </div>
  );
}

function FmDeleteModal({ file, onConfirm, onCancel }) {
  useEffect(() => {
    if (!file) return;
    const fn = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [file, onCancel]);
  if (!file) return null;
  return (
    <div className="fm-modal-overlay" onClick={onCancel}>
      <div className="fm-modal-box" onClick={e => e.stopPropagation()}>
        <div className="fm-modal-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2.5 5h15M7 5V3.5A.5.5 0 017.5 3h5a.5.5 0 01.5.5V5M8 8.5v6M12 8.5v6M3.5 5l1 12a.5.5 0 00.5.5h10a.5.5 0 00.5-.5l1-12" stroke="var(--red)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div className="fm-modal-title">Move to trash?</div>
          <div className="fm-modal-sub">This file will be permanently deleted and cannot be recovered.</div>
        </div>
        <div className="fm-modal-fname">{file.fileName}</div>
        <div className="fm-modal-actions">
          <button className="fm-modal-btn cancel" onClick={onCancel}>Cancel</button>
          <button className="fm-modal-btn confirm" onClick={onConfirm}>Delete file</button>
        </div>
      </div>
    </div>
  );
}

function FileCard({ file, onDelete, onShare, onStar, delay }) {
  const { e, bg, bd, ext } = fi(file.fileName);
  const name = file.fileName.length > 26 ? file.fileName.slice(0, 24) + "…" : file.fileName;
  return (
    <div className="fm-fc" style={{ animationDelay: `${delay}ms` }}>
      <div className="fm-fc-top">
        <div className="fm-fc-icon" style={{ background: bg, border: `1px solid ${bd}` }}>{e}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fm-fc-name" title={file.fileName}>{name}</div>
          {file.createdAt && <div className="fm-fc-date">{fmtDate(file.createdAt)}</div>}
          {file.size > 0 && <div className="fm-fc-date">{fmtSize(file.size)}</div>}
        </div>
        <span className="fm-fc-ext">{ext}</span>
      </div>
      <div className="fm-fc-actions">
        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="fm-fa-btn">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M4 1H1.5A.5.5 0 001 1.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V7M7 1h3m0 0v3m0-3L4.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Open
        </a>
        <a href={file.fileUrl} download={file.fileName} className="fm-fa-btn">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v7M3 5.5l2.5 2.5L8 5.5M1 9.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Save
        </a>
        <button className="fm-fa-btn" onClick={() => onShare(file)}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="9" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.1" /><circle cx="9" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.1" /><circle cx="2" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.1" /><path d="M3.4 5L7.6 2.7M3.4 6L7.6 8.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
          Share
        </button>
        <button
          className="fm-fa-btn"
          title={file.starred ? "Unstar" : "Star"}
          onClick={() => onStar(file)}
          style={{ flex: "0 0 auto", padding: "7px 9px", color: (file.starred ?? file.isStarred) ? "var(--amber)" : undefined }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill={(file.starred ?? file.isStarred) ? "var(--amber)" : "none"}
            style={{ color: (file.starred ?? file.isStarred) ? "var(--amber)" : undefined }}>
            <path d="M6 1l1.4 3h3.1l-2.5 2 1 3L6 7.3 3 9l1-3L1.5 4h3.1L6 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="fm-fa-btn del" onClick={() => onDelete(file)} style={{ flex: "0 0 auto", padding: "7px 9px" }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2.5h8M3.5 2.5V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v.5M4 4.5v4M7 4.5v4M2 2.5l.6 7a.5.5 0 00.5.5h4.8a.5.5 0 00.5-.5l.6-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}

function FileRow({ file, onDelete, onShare, onStar, delay }) {
  const { e, bg, bd, ext } = fi(file.fileName);
  const name = file.fileName.length > 38 ? file.fileName.slice(0, 36) + "…" : file.fileName;
  return (
    <div className="fm-fr" style={{ animationDelay: `${delay}ms` }}>
      <div className="fm-fr-icon" style={{ background: bg, border: `1px solid ${bd}` }}>{e}</div>
      <div className="fm-fr-info">
        <div className="fm-fr-name" title={file.fileName}>{name}</div>
        <div className="fm-fr-meta">
          {file.createdAt && <span>{fmtDate(file.createdAt)}</span>}
          {file.size > 0 && <span>{fmtSize(file.size)}</span>}
        </div>
      </div>
      <span className="fm-fr-ext">{ext}</span>
      <div className="fm-fr-actions">
        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="fm-fa-btn">Open</a>
        <a href={file.fileUrl} download={file.fileName} className="fm-fa-btn">Save</a>
        <button className="fm-fa-btn" onClick={() => onShare(file)}>Share</button>
        <button
          className="fm-fa-btn"
          onClick={() => onStar(file)}
          title={file.starred ? "Unstar" : "Star"}
          style={{ color: file.starred ? "var(--amber)" : undefined }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill={(file.starred ?? file.isStarred) ? "var(--amber)" : "none"}
            style={{ color: (file.starred ?? file.isStarred) ? "var(--amber)" : undefined }}>
            <path d="M6 1l1.4 3h3.1l-2.5 2 1 3L6 7.3 3 9l1-3L1.5 4h3.1L6 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="fm-fa-btn del" onClick={() => onDelete(file)}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2.5h8M3.5 2.5V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v.5M4 4.5v4M7 4.5v4M2 2.5l.6 7a.5.5 0 00.5.5h4.8a.5.5 0 00.5-.5l.6-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}

function SkelGrid() {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 13, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="fm-skel" style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          <div className="fm-skel" style={{ height: 11, width: "75%", borderRadius: 4 }} />
          <div className="fm-skel" style={{ height: 9, width: "42%", borderRadius: 4 }} />
        </div>
      </div>
      <div className="fm-skel" style={{ height: 30, borderRadius: 7 }} />
    </div>
  );
}
function SkelRow() {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 11, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
      <div className="fm-skel" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="fm-skel" style={{ height: 11, width: "55%", borderRadius: 4 }} />
        <div className="fm-skel" style={{ height: 9, width: "28%", borderRadius: 4 }} />
      </div>
      <div className="fm-skel" style={{ width: 80, height: 28, borderRadius: 7 }} />
    </div>
  );
}

/* ══════════════════════════════
   MAIN COMPONENT — accepts props from Dashboard
══════════════════════════════ */
export default function FileManager({ onBack, authUser, token: tokenProp, userId: userIdProp, BackBtn }) {
  // Support both standalone usage and embedded usage from Dashboard
  const navigate = useNavigate();
  const standaloneUser = getUser();
  const standaloneToken = getToken();

  const user = authUser || standaloneUser;
  const token = tokenProp || standaloneToken;
  const USER_ID = userIdProp || user?.id;
  const headers = { Authorization: `Bearer ${token}` };

  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [view, setView] = useState("grid");
  const [shareTarget, setShareTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fileInputRef = useRef();
  const toastTimer = useRef();

  const showToast = (msg, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const fetchFiles = useCallback(async () => {
    if (!USER_ID) return;
    setFetching(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/my-files/${USER_ID}`, { headers });
      // AFTER
      setFiles(data.map(f => ({ ...f, starred: f.starred ?? f.isStarred ?? false })));
      setFetched(true);
    } catch (err) {
      if (err.response?.status === 401) { clearAuth(); navigate("/login"); return; }
      showToast("Failed to load files", "error");
    } finally { setFetching(false); }
  }, [USER_ID, token]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (file) => {
    if (!file || !USER_ID) return;
    setSelectedFile(file);
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await axios.post(`${BASE_URL}/upload/${USER_ID}`, form, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      setFiles(prev => [data.file, ...prev]);
      showToast(`"${file.name}" uploaded`);
    } catch (err) {
      if (err.response?.status === 401) { clearAuth(); navigate("/login"); return; }
      showToast(err.response?.data?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleUpload(e.dataTransfer.files?.[0]);
  };

  const handleDelete = async () => {
    const file = deleteTarget;
    setDeleteTarget(null);
    try {
      await axios.delete(`${BASE_URL}/delete/${file._id}`, { headers });
      setFiles(prev => prev.filter(f => f._id !== file._id));
      showToast(`"${file.fileName}" moved to trash`);
    } catch (err) {
      if (err.response?.status === 401) { clearAuth(); navigate("/login"); return; }
      if (err.response?.status === 403) { showToast("Not authorized", "error"); return; }
      showToast(err.response?.data?.message || "Delete failed", "error");
    }
  };

  const handleStar = async (file) => {
    const isStarred = !!(file.starred ?? file.isStarred ?? false);

    // Optimistic update
   setFiles(prev => prev.map(f =>
  f._id === file._id ? { ...f, starred: !isStarred } : f
));

    try {
      if (isStarred) {
        await axios.patch(`${DASH_BASE}/starred/${file._id}/unstar`, {}, { headers });
      } else {
        await axios.patch(`${DASH_BASE}/starred/${file._id}/star`, {}, { headers });
      }
    } catch (err) {
      console.log(err);
    setFiles(prev => prev.map(f =>
  f._id === file._id ? { ...f, starred: isStarred } : f
));
      if (err.response?.status === 401) { clearAuth(); navigate("/login"); return; }
      showToast("Failed to update star", "error");

    }
  };

  const FMTS = ["PDF", "JPG", "PNG", "MP4", "MP3", "ZIP", "DOCX", "XLSX", "TXT"];
  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);

  return (
    <>
      <style>{FM_STYLES}</style>

      {/* Header row with back button — only shown when embedded via Dashboard's BackBtn prop */}
      {BackBtn && (
        <div style={{ marginBottom: 20 }} className="anim-pageIn">
          <div className="page-header-row">
            <BackBtn onClick={onBack} />
            <h1 className="page-header-title">My <span>Files</span></h1>
          </div>
        </div>
      )}

      <div className="fm-wrap">
        {/* LEFT: Upload Panel */}
        <div className="fm-panel-upload">
          <div className="fm-panel-inner">
            <div>
              <div className="fm-panel-title">Add <span>files</span></div>
              <div className="fm-panel-sub">Drag & drop or browse to upload files to the cloud.</div>
            </div>

            <div
              className={`fm-drop-zone${dragging ? " drag" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={e => handleUpload(e.target.files?.[0])}
              />
              {uploading ? (
                <div className="fm-uploading">
                  <div className="fm-spin-ring">
                    <div style={{ width: 22, height: 22, border: "2.5px solid rgba(245,158,11,0.22)", borderTopColor: "var(--amber)", borderRadius: "50%", animation: "fm-spin 0.7s linear infinite" }} />
                  </div>
                  <div className="fm-dz-title">Uploading…</div>
                  <div style={{ fontSize: 12, color: "var(--amber)", fontWeight: 500 }}>{selectedFile?.name}</div>
                  <div className="fm-dz-progress"><div className="fm-prog-bar" /></div>
                </div>
              ) : (
                <>
                  <div className="fm-dz-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M12 4v13M7 9l5-5 5 5" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 19h18" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
                    </svg>
                  </div>
                  <div className="fm-dz-title">{dragging ? "Drop it!" : "Drop your file here"}</div>
                  <div className="fm-dz-sub">or <strong>click to browse</strong><br />Up to 100 MB · All formats</div>
                  <button className="fm-dz-btn" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v8M3 4l3-3 3 3M1 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Choose file
                  </button>
                  <div className="fm-dz-formats">
                    {FMTS.map(f => <span key={f} className="fm-fmt-tag">{f}</span>)}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <div className="fm-info-row">
                <span className="fm-info-label">Total files</span>
                <span className={`fm-info-val ${files.length > 0 ? "ok" : ""}`}>{files.length}</span>
              </div>
              <div className="fm-info-row">
                <span className="fm-info-label">Storage used</span>
                <span className="fm-info-val">{fmtSize(totalSize) || "0 KB"}</span>
              </div>
              <div className="fm-info-row">
                <span className="fm-info-label">Status</span>
                <span className="fm-info-val ok">● Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Files Panel */}
        <div className="fm-panel-files">
          <div className="fm-files-topbar">
            <div className="fm-files-heading">
              My files
              {files.length > 0 && <span className="fm-count-pill">{files.length}</span>}
            </div>
            <div className="fm-topbar-right">
              <div className="fm-view-toggle">
                <button className={`fm-view-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="8" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="1" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="8" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
                <button className={`fm-view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <button className="fm-ref-btn" onClick={fetchFiles} disabled={fetching}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                  style={{ animation: fetching ? "fm-spin 0.7s linear infinite" : "none" }}>
                  <path d="M1 6A5 5 0 019.5 2.2M11 6A5 5 0 012.5 9.8M9 1v3H6M3 8v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="fm-files-content">
            {fetching && !fetched && (
              view === "grid"
                ? <div className="fm-file-grid">{[0, 1, 2, 3].map(i => <SkelGrid key={i} />)}</div>
                : <div className="fm-file-list">{[0, 1, 2, 3].map(i => <SkelRow key={i} />)}</div>
            )}

            {!fetching && fetched && files.length === 0 && (
              <div className="fm-empty">
                <div className="fm-empty-box">🗂️</div>
                <div className="fm-empty-t">No files yet</div>
                <div className="fm-empty-s">Upload your first file using the panel on the left.</div>
              </div>
            )}

            {files.length > 0 && view === "grid" && (
              <div className="fm-file-grid">
                {files.map((f, i) => (
                  <FileCard
                    key={f._id || f.fileUrl}
                    file={f}
                    onDelete={setDeleteTarget}
                    onShare={setShareTarget}
                    onStar={handleStar}
                    delay={i * 40}
                  />
                ))}
              </div>
            )}

            {files.length > 0 && view === "list" && (
              <div className="fm-file-list">
                {files.map((f, i) => (
                  <FileRow
                    key={f._id || f.fileUrl}
                    file={f}
                    onDelete={setDeleteTarget}
                    onShare={setShareTarget}
                    onStar={handleStar}
                    delay={i * 30}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <FmToast t={toast} />

      {shareTarget && (
        <ShareModal file={shareTarget} onClose={() => setShareTarget(null)} />
      )}

      <FmDeleteModal
        file={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
