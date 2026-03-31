import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getUser, getToken, clearAuth } from "../utils/handleAuth";
import { SharedPage } from './SharedPage'
import { TrashPage } from "./Trash";
import FileManager from "../FIleManager/FileManager";
import { StarredPage } from "./StarredPage";
import EditProfile from "./EditProfile";
import NotificationPanel from "./NotificationPanel";

const BASE = " https://voult-server.onrender.com/api/v1/dashboard";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,600;0,900;1,600&family=Outfit:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }

  /* ── DARK theme (default) ── */
  :root {
    --bg:         #0f0d0b;
    --surface:    #161310;
    --surface2:   #1e1a15;
    --surface3:   #252018;
    --border:     rgba(255,255,255,0.07);
    --border2:    rgba(255,255,255,0.12);
    --border3:    rgba(255,255,255,0.18);
    --amber:      #f59e0b;
    --amber-dim:  rgba(245,158,11,0.1);
    --amber-glow: rgba(245,158,11,0.25);
    --green:      #34d399;
    --green-dim:  rgba(52,211,153,0.1);
    --red:        #f87171;
    --red-dim:    rgba(248,113,113,0.1);
    --blue:       #60a5fa;
    --blue-dim:   rgba(96,165,250,0.1);
    --text:       #f0ece4;
    --text-2:     rgba(240,236,228,0.55);
    --text-3:     rgba(240,236,228,0.28);
    --shadow:     rgba(0,0,0,0.45);
    --topbar-bg:  rgba(15,13,11,0.85);
    --serif:      'Fraunces', serif;
    --sans:       'Outfit', sans-serif;
  }

  /* ── LIGHT theme ── */
  :root.light {
    --bg:         #f5f2ed;
    --surface:    #ffffff;
    --surface2:   #f0ece5;
    --surface3:   #e8e3da;
    --border:     rgba(0,0,0,0.08);
    --border2:    rgba(0,0,0,0.14);
    --border3:    rgba(0,0,0,0.20);
    --amber:      #d97706;
    --amber-dim:  rgba(217,119,6,0.1);
    --amber-glow: rgba(217,119,6,0.2);
    --green:      #059669;
    --green-dim:  rgba(5,150,105,0.1);
    --red:        #dc2626;
    --red-dim:    rgba(220,38,38,0.1);
    --blue:       #2563eb;
    --blue-dim:   rgba(37,99,235,0.1);
    --text:       #1c1814;
    --text-2:     rgba(28,24,20,0.58);
    --text-3:     rgba(28,24,20,0.32);
    --shadow:     rgba(0,0,0,0.1);
    --topbar-bg:  rgba(245,242,237,0.88);
  }

  body {
    background: var(--bg); color: var(--text);
    font-family: var(--sans); overflow-x: hidden;
    transition: background 0.3s ease, color 0.3s ease;
  }

  @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes slideInR  { from{opacity:0;transform:translateX(100%)} to{opacity:1;transform:translateX(0)} }
  @keyframes slideInL  { from{opacity:0;transform:translateX(-100%)} to{opacity:1;transform:translateX(0)} }
  @keyframes popIn     { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes shimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes countUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pageIn    { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }

  .anim-fadeup   { animation: fadeUp 0.5s cubic-bezier(.22,1,.36,1) both; }
  .anim-fadein   { animation: fadeIn 0.3s ease both; }
  .anim-slideinR { animation: slideInR 0.35s cubic-bezier(.22,1,.36,1) both; }
  .anim-slideinL { animation: slideInL 0.35s cubic-bezier(.22,1,.36,1) both; }
  .anim-popin    { animation: popIn 0.28s cubic-bezier(.22,1,.36,1) both; }
  .anim-pageIn   { animation: pageIn 0.35s cubic-bezier(.22,1,.36,1) both; }

  .d1{animation-delay:.05s} .d2{animation-delay:.10s} .d3{animation-delay:.15s}
  .d4{animation-delay:.20s} .d5{animation-delay:.25s} .d6{animation-delay:.30s}

  .dash-shell { display:flex; min-height:100vh; position:relative; }

  /* ════════════════ SIDEBAR ════════════════ */
  .sidebar {
    width:240px; flex-shrink:0; background:var(--surface);
    border-right:1px solid var(--border); display:flex; flex-direction:column;
    position:fixed; top:0; left:0; height:100vh; z-index:50;
    transition:transform 0.3s cubic-bezier(.22,1,.36,1), background 0.3s, border-color 0.3s;
  }
  .sidebar-logo {
    display:flex; align-items:center; gap:10px;
    padding:24px 20px 20px; border-bottom:1px solid var(--border);
    cursor:pointer; transition:opacity 0.15s;
  }
  .sidebar-logo:hover { opacity:0.8; }
  .logo-mark {
    width:34px; height:34px; border-radius:9px;
    background:linear-gradient(135deg,var(--amber),#b45309);
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 0 20px var(--amber-glow); flex-shrink:0;
  }
  .logo-text { font-family:var(--serif); font-size:18px; font-weight:600; color:var(--text); letter-spacing:-0.3px; }
  .sidebar-nav { flex:1; padding:16px 12px; display:flex; flex-direction:column; gap:2px; overflow-y:auto; }
  .nav-section-label { font-size:10px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--text-3); padding:12px 8px 6px; }
  .nav-item {
    display:flex; align-items:center; gap:10px; padding:10px 12px;
    border-radius:10px; color:var(--text-2); font-size:14px; font-weight:400;
    cursor:pointer; transition:all 0.15s; border:1px solid transparent;
    background:none; width:100%; text-align:left; font-family:var(--sans);
  }
  .nav-item:hover  { background:var(--surface2); color:var(--text); border-color:var(--border); }
  .nav-item.active { background:var(--amber-dim); color:var(--amber); border-color:rgba(245,158,11,0.2); font-weight:500; }
  .nav-item svg { opacity:0.6; flex-shrink:0; }
  .nav-item.active svg { opacity:1; }
  .nav-badge {
    margin-left:auto; background:var(--amber-dim); color:var(--amber);
    border:1px solid rgba(245,158,11,0.2); border-radius:20px;
    font-size:10px; font-weight:600; padding:1px 7px; font-family:'Courier New',monospace;
  }
  .sidebar-footer { padding:16px 12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px; }
  .sidebar-user {
    display:flex; align-items:center; gap:10px; padding:10px 12px;
    border-radius:10px; cursor:pointer; transition:all 0.15s; border:1px solid transparent;
  }
  .sidebar-user:hover { background:var(--surface2); border-color:var(--border); }
  .user-avatar-sm {
    width:32px; height:32px; border-radius:8px;
    background:linear-gradient(135deg,var(--amber),#b45309);
    display:flex; align-items:center; justify-content:center;
    font-family:var(--serif); font-size:13px; font-weight:700; color:#fff; flex-shrink:0;
  }
  .user-info-sm { flex:1; min-width:0; }
  .user-email-sm { font-size:12px; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .user-role-sm  { font-size:10px; color:var(--text-3); margin-top:1px; }

  /* ── Theme toggle row in sidebar footer ── */
  .theme-row {
    display:flex; align-items:center; justify-content:space-between;
    padding:9px 12px; border-radius:10px;
    border:1px solid var(--border); background:var(--surface2);
  }
  .theme-row-label { font-size:12px; color:var(--text-2); display:flex; align-items:center; gap:6px; }
  .theme-pill { display:flex; background:var(--surface3); border-radius:20px; padding:2px; gap:2px; border:1px solid var(--border); }
  .theme-pill-btn {
    padding:4px 9px; border-radius:16px; border:none; background:transparent;
    font-size:11px; font-weight:500; cursor:pointer; color:var(--text-3);
    transition:all 0.2s; font-family:var(--sans); display:flex; align-items:center; gap:4px;
  }
  .theme-pill-btn.active { background:var(--amber); color:#fff; box-shadow:0 2px 8px var(--amber-glow); }
  :root.light .theme-pill-btn.active { color:#fff; }

  /* ════════════════ TOPBAR ════════════════ */
  .main-content { flex:1; margin-left:240px; min-height:100vh; display:flex; flex-direction:column; }
  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:16px 32px; border-bottom:1px solid var(--border);
    background:var(--topbar-bg); backdrop-filter:blur(14px);
    position:sticky; top:0; z-index:40; gap:16px;
    transition:background 0.3s, border-color 0.3s;
  }
  .topbar-left  { display:flex; align-items:center; gap:14px; }
  .topbar-right { display:flex; align-items:center; gap:10px; }
  .menu-btn {
    width:36px; height:36px; border-radius:8px; background:var(--surface);
    border:1px solid var(--border); display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all 0.15s; flex-shrink:0; color:var(--text-2);
  }
  .menu-btn:hover { background:var(--surface2); color:var(--text); border-color:var(--border2); }
  .page-breadcrumb { font-size:13px; color:var(--text-3); font-weight:300; display:flex; align-items:center; gap:6px; }
  .page-breadcrumb span { color:var(--text-2); }
  .breadcrumb-sep { color:var(--text-3); }

  /* search trigger in topbar */
  .search-trigger {
    display:flex; align-items:center; gap:8px; padding:8px 12px;
    background:var(--surface); border:1px solid var(--border); border-radius:10px;
    cursor:pointer; transition:all 0.15s; color:var(--text-3); font-size:13px;
    font-family:var(--sans); min-width:160px;
  }
  .search-trigger:hover { background:var(--surface2); border-color:var(--border2); color:var(--text-2); }
  .search-trigger-kbd {
    margin-left:auto; font-size:10px; border:1px solid var(--border2);
    border-radius:5px; padding:1px 6px; font-family:'Courier New',monospace; color:var(--text-3);
  }

  .back-btn {
    display:inline-flex; align-items:center; gap:7px; padding:7px 14px;
    background:var(--surface); border:1px solid var(--border); border-radius:8px;
    color:var(--text-2); font-family:var(--sans); font-size:13px; font-weight:500;
    cursor:pointer; transition:all 0.15s;
  }
  .back-btn:hover { background:var(--surface2); color:var(--text); border-color:var(--border2); }
  .page-header-row { display:flex; align-items:center; gap:14px; margin-bottom:28px; flex-wrap:wrap; }
  .page-header-title { font-family:var(--serif); font-size:clamp(22px,3vw,30px); font-weight:900; color:var(--text); letter-spacing:-0.5px; }
  .page-header-title span { font-style:italic; color:var(--amber); }

  .icon-btn {
    width:36px; height:36px; border-radius:8px; background:var(--surface);
    border:1px solid var(--border); display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all 0.15s; color:var(--text-2); position:relative;
  }
  .icon-btn:hover { background:var(--surface2); color:var(--text); border-color:var(--border2); }
  .profile-trigger {
    display:flex; align-items:center; gap:8px; padding:6px 12px 6px 6px;
    background:var(--surface); border:1px solid var(--border); border-radius:10px;
    cursor:pointer; transition:all 0.15s;
  }
  .profile-trigger:hover { background:var(--surface2); border-color:var(--border2); }
  .avatar-xs {
    width:26px; height:26px; border-radius:6px;
    background:linear-gradient(135deg,var(--amber),#b45309);
    display:flex; align-items:center; justify-content:center;
    font-family:var(--serif); font-size:11px; font-weight:700; color:#fff;
  }
  .profile-trigger-name { font-size:13px; font-weight:500; color:var(--text-2); max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .page-body { flex:1; padding:36px 32px; max-width:1200px; width:100%; }

  /* ════════════════ STAT CARDS ════════════════ */
  .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:36px; }
  .stat-card {
    background:var(--surface); border:1px solid var(--border); border-radius:16px;
    padding:22px; position:relative; overflow:hidden; transition:all 0.2s; cursor:default;
  }
  .stat-card::after { content:''; position:absolute; top:0; left:0; right:0; height:1px; opacity:0; transition:opacity 0.2s; }
  .stat-card:hover { background:var(--surface2); transform:translateY(-2px); box-shadow:0 8px 32px var(--shadow); }
  .stat-card:hover::after { opacity:1; }
  .stat-card.amber::after { background:linear-gradient(90deg,transparent,var(--amber),transparent); }
  .stat-card.green::after  { background:linear-gradient(90deg,transparent,var(--green),transparent); }
  .stat-card.blue::after   { background:linear-gradient(90deg,transparent,var(--blue),transparent); }
  .stat-card.red::after    { background:linear-gradient(90deg,transparent,var(--red),transparent); }
  .stat-icon  { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:16px; }
  .stat-label { font-size:12px; color:var(--text-3); font-weight:400; margin-bottom:6px; letter-spacing:0.03em; }
  .stat-value { font-family:var(--serif); font-size:28px; font-weight:900; color:var(--text); letter-spacing:-0.5px; line-height:1; animation:countUp 0.5s ease both; }
  .stat-delta { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:500; margin-top:8px; padding:2px 8px; border-radius:20px; }
  .stat-delta.up   { color:var(--green); background:var(--green-dim); }
  .stat-delta.down { color:var(--red);   background:var(--red-dim); }

  /* ════════════════ ACTIVITY ════════════════ */
  .section-title { font-family:var(--serif); font-size:18px; font-weight:600; color:var(--text); margin-bottom:16px; display:flex; align-items:center; gap:10px; }
  .activity-list { background:var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
  .activity-item { display:flex; align-items:center; gap:14px; padding:16px 20px; border-bottom:1px solid var(--border); transition:background 0.15s; }
  .activity-item:last-child { border-bottom:none; }
  .activity-item:hover { background:var(--surface2); }
  .activity-dot  { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .activity-text { flex:1; font-size:13px; color:var(--text-2); font-weight:300; line-height:1.5; }
  .activity-text strong { color:var(--text); font-weight:500; }
  .activity-time { font-size:11px; color:var(--text-3); white-space:nowrap; }

  /* ════════════════ QUICK ACTIONS ════════════════ */
  .quick-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:36px; }
  .quick-card {
    background:var(--surface); border:1px solid var(--border); border-radius:14px;
    padding:20px 16px; display:flex; flex-direction:column; align-items:center; gap:10px;
    cursor:pointer; transition:all 0.2s; text-align:center; font-family:var(--sans);
  }
  .quick-card:hover { background:var(--surface2); border-color:var(--border2); transform:translateY(-2px); box-shadow:0 6px 24px var(--shadow); }
  .quick-icon  { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
  .quick-label { font-size:13px; font-weight:500; color:var(--text-2); }

  /* ════════════════ SKELETON ════════════════ */
  .skeleton {
    background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);
    background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:6px;
  }

  /* ════════════════ SEARCH OVERLAY ════════════════ */
  .search-overlay {
    position:fixed; inset:0; z-index:200;
    background:rgba(0,0,0,0.52); backdrop-filter:blur(6px);
    display:flex; align-items:flex-start; justify-content:center;
    padding-top:72px; animation:fadeIn 0.18s ease both;
  }
  :root.light .search-overlay { background:rgba(0,0,0,0.22); }

  .search-modal {
    width:100%; max-width:620px; margin:0 16px;
    background:var(--surface); border:1px solid var(--border2);
    border-radius:18px; overflow:hidden;
    box-shadow:0 24px 80px var(--shadow);
    animation:popIn 0.22s cubic-bezier(.22,1,.36,1) both;
  }
  .search-input-wrap {
    display:flex; align-items:center; gap:12px; padding:18px 20px;
    border-bottom:1px solid var(--border);
  }
  .search-input-icon { color:var(--text-3); flex-shrink:0; }
  .search-input {
    flex:1; background:none; border:none; outline:none;
    font-family:var(--sans); font-size:16px; color:var(--text);
    caret-color:var(--amber);
  }
  .search-input::placeholder { color:var(--text-3); }
  .search-clear-btn {
    background:none; border:none; color:var(--text-3); cursor:pointer;
    font-size:20px; line-height:1; padding:0; display:flex; align-items:center;
    transition:color 0.15s;
  }
  .search-clear-btn:hover { color:var(--text-2); }
  .search-kbd {
    font-size:11px; color:var(--text-3); border:1px solid var(--border2);
    border-radius:5px; padding:2px 7px; font-family:'Courier New',monospace; white-space:nowrap;
  }

  .search-filters {
    display:flex; gap:6px; padding:12px 20px; border-bottom:1px solid var(--border);
    overflow-x:auto; scrollbar-width:none;
  }
  .search-filters::-webkit-scrollbar { display:none; }
  .search-filter-chip {
    display:inline-flex; align-items:center; gap:5px; padding:5px 12px;
    border-radius:20px; font-size:12px; font-weight:500; cursor:pointer;
    border:1px solid var(--border); color:var(--text-2); background:var(--surface2);
    transition:all 0.15s; white-space:nowrap; font-family:var(--sans);
  }
  .search-filter-chip:hover  { border-color:var(--border2); color:var(--text); }
  .search-filter-chip.active { background:var(--amber-dim); color:var(--amber); border-color:rgba(245,158,11,0.3); }

  .search-body { max-height:400px; overflow-y:auto; }
  .search-section-label {
    font-size:10px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase;
    color:var(--text-3); padding:12px 20px 6px;
  }
  .search-result-item {
    display:flex; align-items:center; gap:12px; padding:11px 20px;
    cursor:pointer; transition:background 0.12s;
  }
  .search-result-item:hover,
  .search-result-item.highlighted { background:var(--surface2); }
  .search-result-icon {
    width:36px; height:36px; border-radius:9px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center; font-size:16px;
  }
  .search-result-info  { flex:1; min-width:0; }
  .search-result-name  { font-size:13px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .search-result-name mark { background:var(--amber-dim); color:var(--amber); border-radius:2px; padding:0 1px; font-style:normal; }
  .search-result-meta  { font-size:11px; color:var(--text-3); margin-top:2px; }
  .search-result-badge {
    font-size:10px; padding:2px 8px; border-radius:20px; font-weight:500;
    border:1px solid var(--border); color:var(--text-3); white-space:nowrap; flex-shrink:0;
  }
  .search-empty { padding:40px 20px; text-align:center; color:var(--text-3); font-size:13px; }
  .search-empty-icon { font-size:36px; margin-bottom:12px; }
  .search-spinner { display:flex; align-items:center; justify-content:center; padding:36px; }
  .search-footer {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 20px; border-top:1px solid var(--border);
    font-size:11px; color:var(--text-3);
  }
  .search-footer-hints { display:flex; gap:14px; align-items:center; }
  .search-hint { display:flex; align-items:center; gap:4px; }
  .search-hint kbd {
    background:var(--surface2); border:1px solid var(--border2);
    border-radius:4px; padding:1px 5px; font-size:10px; font-family:'Courier New',monospace;
  }

  /* ════════════════ PROFILE DRAWER ════════════════ */
  .drawer-overlay  { position:fixed; inset:0; z-index:80; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); animation:fadeIn 0.2s ease both; }
  .profile-drawer  {
    position:fixed; top:0; right:0; width:360px; height:100vh;
    background:var(--surface); border-left:1px solid var(--border);
    z-index:90; display:flex; flex-direction:column;
    animation:slideInR 0.35s cubic-bezier(.22,1,.36,1) both; overflow-y:auto;
  }
  .drawer-header   { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--surface); z-index:2; }
  .drawer-title    { font-family:var(--serif); font-size:17px; font-weight:600; color:var(--text); }
  .close-btn       { width:32px; height:32px; border-radius:8px; background:var(--surface2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-2); transition:all 0.15s; }
  .close-btn:hover { color:var(--text); border-color:var(--border2); }
  .profile-hero    { padding:32px 24px 24px; border-bottom:1px solid var(--border); text-align:center; position:relative; }
  .profile-hero::before { content:''; position:absolute; top:0; left:0; right:0; height:80px; background:linear-gradient(180deg,var(--amber-dim) 0%,transparent 100%); }
  .avatar-lg       { width:80px; height:80px; border-radius:20px; background:linear-gradient(135deg,var(--amber),#b45309); display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:32px; font-weight:900; color:#fff; margin:0 auto 16px; box-shadow:0 0 40px var(--amber-glow); position:relative; z-index:1; }
  .profile-name    { font-family:var(--serif); font-size:20px; font-weight:700; color:var(--text); letter-spacing:-0.3px; margin-bottom:4px; }
  .profile-email   { font-size:13px; color:var(--text-2); font-weight:300; margin-bottom:16px; }
  .profile-badges  { display:flex; justify-content:center; gap:8px; flex-wrap:wrap; }
  .profile-badge   { font-size:11px; font-weight:500; padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:4px; }
  .profile-badge.verified { background:var(--green-dim); color:var(--green); border:1px solid rgba(52,211,153,0.25); }
  .profile-badge.plan     { background:var(--amber-dim); color:var(--amber); border:1px solid rgba(245,158,11,0.25); }
  .profile-stats   { display:grid; grid-template-columns:repeat(3,1fr); padding:20px 24px; border-bottom:1px solid var(--border); gap:1px; background:var(--border); }
  .profile-stat    { background:var(--surface); padding:14px 8px; text-align:center; }
  .profile-stat-val   { font-family:var(--serif); font-size:20px; font-weight:900; color:var(--text); letter-spacing:-0.5px; }
  .profile-stat-label { font-size:10px; color:var(--text-3); margin-top:3px; letter-spacing:0.05em; }
  .drawer-section  { padding:20px 24px; border-bottom:1px solid var(--border); }
  .drawer-section-title { font-size:11px; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-3); margin-bottom:14px; }
  .info-row        { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border); }
  .info-row:last-child { border-bottom:none; }
  .info-label      { font-size:13px; color:var(--text-3); font-weight:300; }
  .info-value      { font-size:13px; color:var(--text-2); font-weight:400; text-align:right; }
  .info-value.mono { font-family:'Courier New',monospace; font-size:12px; }
  .toggle-row      { display:flex; align-items:center; justify-content:space-between; padding:12px 0; }
  .toggle-info     { flex:1; }
  .toggle-label    { font-size:13px; color:var(--text-2); font-weight:400; }
  .toggle-desc     { font-size:11px; color:var(--text-3); font-weight:300; margin-top:2px; }
  .toggle          { width:36px; height:20px; border-radius:10px; background:var(--surface2); border:1px solid var(--border); position:relative; cursor:pointer; transition:all 0.2s; flex-shrink:0; }
  .toggle.on       { background:var(--amber); border-color:var(--amber); }
  .toggle-thumb    { position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:var(--text-3); transition:all 0.2s; }
  .toggle.on .toggle-thumb { left:18px; background:#fff; }
  .drawer-actions  { padding:20px 24px; display:flex; flex-direction:column; gap:8px; }
  .drawer-btn      { width:100%; padding:12px; border-radius:10px; border:1px solid var(--border); background:var(--surface2); color:var(--text-2); font-family:var(--sans); font-size:14px; font-weight:500; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; justify-content:center; gap:8px; }
  .drawer-btn:hover        { background:var(--surface3); color:var(--text); border-color:var(--border2); }
  .drawer-btn.danger       { color:var(--red); }
  .drawer-btn.danger:hover { background:var(--red-dim); border-color:rgba(248,113,113,0.25); }

  .error-banner { display:flex; align-items:center; gap:10px; padding:12px 16px; background:var(--red-dim); border:1px solid rgba(248,113,113,0.2); border-radius:10px; font-size:13px; color:var(--red); margin-bottom:24px; }

  /* ════════════════ MOBILE ════════════════ */
  .sidebar-overlay { display:none; position:fixed; inset:0; z-index:45; background:rgba(0,0,0,0.55); animation:fadeIn 0.2s ease; }

  @media (max-width:900px) {
    .sidebar { transform:translateX(-100%); }
    .sidebar.open { transform:translateX(0); animation:slideInL 0.3s cubic-bezier(.22,1,.36,1) both; }
    .sidebar-overlay { display:block; }
    .main-content { margin-left:0 !important; }
    .page-body { padding:24px 20px; }
    .topbar { padding:14px 20px; }
    .search-trigger { min-width:unset; }
    .search-trigger-kbd { display:none; }
  }
  @media (max-width:600px) {
    .stats-grid { grid-template-columns:repeat(2,1fr); }
    .quick-grid { grid-template-columns:repeat(2,1fr); }
    .profile-drawer { width:100%; }
    .search-modal { margin:0 10px; border-radius:14px; }
    .page-body { padding:20px 16px; }
    .topbar { padding:12px 16px; }
    .profile-trigger-name { display:none; }
    .search-trigger span:not(.search-trigger-kbd) { display:none; }
  }
  @media (max-width:380px) { .stats-grid { grid-template-columns:1fr; } }
`;

/* ─── Helpers ─── */
const fmt = (d) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  if (m < 2880) return "Yesterday";
  return new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric" });
};
const fmtJoined  = (d) => d ? new Date(d).toLocaleDateString("en-US", { month:"short", year:"numeric" }) : "—";
const fmtStorage = (bytes = 0) => {
  const gb = bytes / (1024 ** 3);
  return gb < 0.01 ? `${(bytes / (1024 ** 2)).toFixed(1)} MB` : `${gb.toFixed(2)} GB`;
};
const activityColor = (type) => ({ upload:"#f59e0b", share:"#34d399", trash:"#f87171" }[type] || "#60a5fa");

/* ── File type icon helper ── */
const fileIcon = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return { icon:"🖼️", bg:"rgba(96,165,250,0.12)" };
  if (["mp4","mov","avi","mkv"].includes(ext))               return { icon:"🎬", bg:"rgba(167,139,250,0.12)" };
  if (["mp3","wav","flac"].includes(ext))                    return { icon:"🎵", bg:"rgba(52,211,153,0.12)" };
  if (["pdf"].includes(ext))                                 return { icon:"📄", bg:"rgba(248,113,113,0.12)" };
  if (["zip","rar","7z","tar"].includes(ext))                return { icon:"📦", bg:"rgba(245,158,11,0.12)" };
  if (["doc","docx"].includes(ext))                          return { icon:"📝", bg:"rgba(96,165,250,0.12)" };
  if (["xls","xlsx","csv"].includes(ext))                    return { icon:"📊", bg:"rgba(52,211,153,0.12)" };
  if (["js","ts","jsx","tsx","py","go","rs"].includes(ext))  return { icon:"💻", bg:"rgba(245,158,11,0.12)" };
  return { icon:"📁", bg:"rgba(200,200,200,0.1)" };
};

/* ── Highlight query match in text ── */
const Highlighted = ({ text = "", query = "" }) => {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

/* ─── Icons ─── */
const IconHome   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 6.5L7.5 1 14 6.5V14H10v-4H5v4H1V6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
const IconFiles  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 3a2 2 0 012-2h4l3 3v9a2 2 0 01-2 2H4a2 2 0 01-2-2V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M8 1v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
const IconShared = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="3" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7L10.5 3.5M4.5 8L10.5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IconStar   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1l1.8 4h4.2l-3.4 2.8 1.3 4.2L7.5 9.3l-3.9 2.7 1.3-4.2L1.5 5h4.2L7.5 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
const IconTrash  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 3.5h12M5 3.5V2h5v1.5M6 6.5v5M9 6.5v5M2.5 3.5l.8 9a1 1 0 001 .9h6.4a1 1 0 001-.9l.8-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconSearch = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IconLogout = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5.5 13H3a1 1 0 01-1-1V3a1 1 0 011-1h2.5M10 10l3-3-3-3M13 7.5H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconBack   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconMoon   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 9A6 6 0 015 2a6 6 0 100 10h7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
const IconSun    = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1.1 1.1M10 10l1.1 1.1M2.9 11.1L4 10M10 4l1.1-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;

/* ─── Skeletons ─── */
const StatSkeleton = () => (
  <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:22 }}>
    <div className="skeleton" style={{ width:40, height:40, borderRadius:10, marginBottom:16 }}/>
    <div className="skeleton" style={{ width:"60%", height:10, borderRadius:4, marginBottom:8 }}/>
    <div className="skeleton" style={{ width:"40%", height:24, borderRadius:4, marginBottom:10 }}/>
    <div className="skeleton" style={{ width:60, height:18, borderRadius:20 }}/>
  </div>
);
const ActivitySkeleton = () => (
  <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", borderBottom:"1px solid var(--border)" }}>
    <div className="skeleton" style={{ width:8, height:8, borderRadius:"50%", flexShrink:0 }}/>
    <div className="skeleton" style={{ flex:1, height:12, borderRadius:4 }}/>
    <div className="skeleton" style={{ width:48, height:10, borderRadius:4 }}/>
  </div>
);

/* ─── Back Button ─── */
function BackBtn({ onClick }) {
  return (
    <button className="back-btn" onClick={onClick}>
      <IconBack /> Back to Dashboard
    </button>
  );
}

/* ══════════════════════════════════════════
   SEARCH MODAL COMPONENT
══════════════════════════════════════════ */
const SEARCH_FILTERS = [
  { id:"all",    label:"All",    emoji:"🔍" },
  { id:"files",  label:"Files",  emoji:"📁" },
  { id:"shared", label:"Shared", emoji:"🔗" },
  { id:"images", label:"Images", emoji:"🖼️" },
  { id:"docs",   label:"Docs",   emoji:"📄" },
];

const QUICK_NAV_ITEMS = [
  { label:"My Files",  emoji:"📁", page:"files"   },
  { label:"Shared",    emoji:"🔗", page:"shared"  },
  { label:"Starred",   emoji:"⭐", page:"starred" },
  { label:"Trash",     emoji:"🗑️", page:"trash"   },
];

function SearchModal({ onClose, token, userId, onNavigate }) {
  const [query,       setQuery]       = useState("");
  const [filter,      setFilter]      = useState("all");
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef    = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  /* keyboard nav */
  useEffect(() => {
    const items = query ? results : QUICK_NAV_ITEMS;
    const handler = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, items.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
      if (e.key === "Enter") {
        if (query && results[highlighted]) {
          handleFileSelect(results[highlighted]);
        } else if (!query && QUICK_NAV_ITEMS[highlighted]) {
          onNavigate(QUICK_NAV_ITEMS[highlighted].page);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [results, highlighted, query]);

  /* debounced search */
  useEffect(() => {
    setHighlighted(0);
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `${BASE}/search/${userId}?q=${encodeURIComponent(query)}&filter=${filter}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, filter, userId, token]);

  const handleFileSelect = (item) => {
    onNavigate(item.type === "shared" ? "shared" : "files");
    onClose();
  };

  return (
    <div
      className="search-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="search-modal">

        {/* ── Input row ── */}
        <div className="search-input-wrap">
          <span className="search-input-icon"><IconSearch /></span>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search files, shared links…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {query
            ? <button className="search-clear-btn" onClick={() => setQuery("")}>×</button>
            : <span className="search-kbd">Esc</span>
          }
        </div>

        {/* ── Filter chips ── */}
        <div className="search-filters">
          {SEARCH_FILTERS.map(f => (
            <button
              key={f.id}
              className={`search-filter-chip ${filter === f.id ? "active" : ""}`}
              onClick={() => { setFilter(f.id); inputRef.current?.focus(); }}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {/* ── Results body ── */}
        <div className="search-body">

          {/* Loading */}
          {loading && (
            <div className="search-spinner">
              <div style={{ width:22, height:22, border:"2.5px solid var(--amber-dim)", borderTopColor:"var(--amber)", borderRadius:"50%", animation:"spin 0.65s linear infinite" }}/>
            </div>
          )}

          {/* No results */}
          {!loading && query && results.length === 0 && (
            <div className="search-empty">
              <div className="search-empty-icon">🔍</div>
              <div style={{ color:"var(--text-2)", fontWeight:500 }}>No results for "{query}"</div>
              <div style={{ marginTop:6, fontSize:12 }}>Try a different keyword or change the filter</div>
            </div>
          )}

          {/* File results */}
          {!loading && query && results.length > 0 && (
            <>
              <div className="search-section-label">{results.length} result{results.length !== 1 ? "s" : ""}</div>
              {results.map((item, i) => {
                const fi = fileIcon(item.fileName || item.name || "");
                const name = item.fileName || item.name || "Untitled";
                return (
                  <div
                    key={item._id || i}
                    className={`search-result-item ${i === highlighted ? "highlighted" : ""}`}
                    onClick={() => handleFileSelect(item)}
                    onMouseEnter={() => setHighlighted(i)}
                  >
                    <div className="search-result-icon" style={{ background: fi.bg }}>{fi.icon}</div>
                    <div className="search-result-info">
                      <div className="search-result-name">
                        <Highlighted text={name} query={query} />
                      </div>
                      <div className="search-result-meta">
                        {item.fileSize ? fmtStorage(item.fileSize) : ""}
                        {item.fileSize && item.updatedAt ? " · " : ""}
                        {item.updatedAt ? fmt(item.updatedAt) : ""}
                        {item.isShared ? " · Shared" : ""}
                      </div>
                    </div>
                    <span className="search-result-badge">
                      {item.isShared ? "shared" : "file"}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {/* Quick nav (empty state) */}
          {!loading && !query && (
            <>
              <div className="search-section-label">Quick Navigate</div>
              {QUICK_NAV_ITEMS.map((n, i) => (
                <div
                  key={n.page}
                  className={`search-result-item ${i === highlighted ? "highlighted" : ""}`}
                  onClick={() => { onNavigate(n.page); onClose(); }}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <div className="search-result-icon" style={{ background:"var(--surface2)", fontSize:18 }}>{n.emoji}</div>
                  <div className="search-result-info">
                    <div className="search-result-name">{n.label}</div>
                    <div className="search-result-meta">Go to {n.label}</div>
                  </div>
                  <span className="search-result-badge">page</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="search-footer">
          <div className="search-footer-hints">
            <span className="search-hint"><kbd>↑↓</kbd> navigate</span>
            <span className="search-hint"><kbd>↵</kbd> open</span>
            <span className="search-hint"><kbd>Esc</kbd> close</span>
          </div>
          {query && !loading && (
            <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Quick actions data ─── */
const QUICK_ACTIONS = [
  { label:"Upload File", color:"#f59e0b", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.2)", page:"files",
    icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M5 8l5-5 5 5M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { label:"My Files",   color:"#60a5fa", bg:"rgba(96,165,250,0.12)",  border:"rgba(96,165,250,0.2)", page:"files",
    icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
  { label:"Shared",     color:"#34d399", bg:"rgba(52,211,153,0.12)",  border:"rgba(52,211,153,0.2)", page:"shared",
    icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="15" cy="15" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 9l6-3M7 11l6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label:"Starred",    color:"#a78bfa", bg:"rgba(167,139,250,0.12)", border:"rgba(167,139,250,0.2)", page:"starred",
    icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2l2.4 5h5.2l-4.2 3.4 1.6 5.2L10 12.5l-5 3.1 1.6-5.2L2.4 7h5.2L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
];

/* ══════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
══════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const authUser = getUser() || { email:"user@example.com", id:"" };
  const token    = getToken();
  const initials = authUser.email?.[0]?.toUpperCase() || "U";
  const username = authUser.email?.split("@")[0] || "User";

  /* ── Theme — persisted to localStorage ── */
  const [theme, setTheme] = useState(() => localStorage.getItem("vaultTheme") || "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("vaultTheme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  /* ── UI state ── */
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [activeNav,        setActiveNav]        = useState("dashboard");
  const [currentPage,      setCurrentPage]      = useState("dashboard");
  const [toggles,          setToggles]          = useState({ notifications:true, twoFactor:false });

  /* ── Data state ── */
  const [stats,            setStats]            = useState(null);
  const [activity,         setActivity]         = useState([]);
  const [profile,          setProfile]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [activityLoad,     setActivityLoad]     = useState(false);
  const [profLoad,         setProfLoad]         = useState(false);
  const [error,            setError]            = useState("");
  const [editProfileOpen,  setEditProfileOpen]  = useState(false);

  const headers = { Authorization:`Bearer ${token}` };

  /* ── Ctrl/Cmd+K to open search ── */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ── fetchActivity (lightweight, no full reload) ── */
  const fetchActivity = useCallback(async (silent = true) => {
    if (!authUser.id) return;
    if (!silent) setActivityLoad(true);
    try {
      const { data } = await axios.get(`${BASE}/activity/${authUser.id}?limit=6`, { headers });
      setActivity(data.activity || []);
    } catch { /* silent */ } finally {
      if (!silent) setActivityLoad(false);
    }
  }, [authUser.id, token]);

  /* ── fetchDashboard (full: stats + activity) ── */
  const fetchDashboard = useCallback(async () => {
    if (!authUser.id) return;
    setLoading(true); setError("");
    try {
      const [sRes, aRes] = await Promise.all([
        axios.get(`${BASE}/stats/${authUser.id}`,            { headers }),
        axios.get(`${BASE}/activity/${authUser.id}?limit=6`, { headers }),
      ]);
      setStats(sRes.data.stats);
      setActivity(aRes.data.activity || []);
    } catch (err) {
      if (err.response?.status === 401) { clearAuth(); navigate("/login"); return; }
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally { setLoading(false); }
  }, [authUser.id, token]);

  /* ── fetchProfile ── */
  const fetchProfile = useCallback(async () => {
    if (!authUser.id || profile) return;
    setProfLoad(true);
    try {
      const { data } = await axios.get(`${BASE}/profile/${authUser.id}`, { headers });
      setProfile(data.profile);
    } catch { /* silent */ } finally { setProfLoad(false); }
  }, [authUser.id, token, profile]);

  /* ── Effects ── */
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  /* Instant refresh when navigating back to dashboard */
  useEffect(() => {
    if (currentPage === "dashboard") fetchActivity(true);
  }, [currentPage]);

  /* Poll every 5s while on dashboard */
  useEffect(() => {
    if (currentPage !== "dashboard") return;
    const id = setInterval(() => fetchActivity(true), 5000);
    return () => clearInterval(id);
  }, [currentPage, fetchActivity]);

  useEffect(() => { if (profileOpen) fetchProfile(); }, [profileOpen, fetchProfile]);

  useEffect(() => {
    const fn = () => { if (window.innerWidth > 900) setSidebarOpen(false); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  /* ── Derived values ── */
  const p              = profile || {};
  const storageUsedGB  = p.storage?.usedGB  ?? stats?.storage?.usedGB  ?? 0;
  const storagePct     = p.storage?.percent  ?? stats?.storage?.percent  ?? 0;
  const storageLimitGB = p.storage?.limitGB  ?? stats?.storage?.limitGB  ?? 10;
  const storageLabel   = `${storageUsedGB} GB of ${storageLimitGB} GB used`;

  const STAT_CARDS = stats ? [
    { label:"Total Files",   color:"amber", value:String(stats.totalFiles ?? 0),             delta:`${stats.totalFiles ?? 0} files`,    up:true,                         iconBg:"rgba(245,158,11,0.12)",  iconColor:"#f59e0b",
      icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> },
    { label:"Storage Used",  color:"blue",  value:fmtStorage(stats.storage?.usedBytes ?? 0), delta:`${storagePct}% used`,               up:storagePct < 80,              iconBg:"rgba(96,165,250,0.12)",   iconColor:"#60a5fa",
      icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><ellipse cx="9" cy="6" rx="6" ry="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M3 6v6c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6" stroke="currentColor" strokeWidth="1.3"/><path d="M3 9c0 1.4 2.7 2.5 6 2.5S15 10.4 15 9" stroke="currentColor" strokeWidth="1.3"/></svg> },
    { label:"Uploads Today", color:"green", value:String(stats.todayUploads ?? 0),            delta:"today",                             up:true,                         iconBg:"rgba(52,211,153,0.12)",  iconColor:"#34d399",
      icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v9M5 7l4-4 4 4M3 14h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label:"Shared Links",  color:"red",   value:String(stats.sharedLinks ?? 0),             delta:`${stats.sharedLinks ?? 0} active`,  up:(stats.sharedLinks ?? 0) > 0, iconBg:"rgba(248,113,113,0.12)", iconColor:"#f87171",
      icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="13" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="13" cy="14" r="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="5" cy="9" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M7 8l4-3M7 10l4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  ] : [];

  /* ── Navigation ── */
  const goToPage = (pageId) => { setActiveNav(pageId); setCurrentPage(pageId); setSidebarOpen(false); };
  const goBack   = () => { setCurrentPage("dashboard"); setActiveNav("dashboard"); };

  const NAV = [
    { id:"dashboard", label:"Dashboard", icon:<IconHome /> },
    { id:"files",     label:"My Files",  icon:<IconFiles />,  badge:stats?.totalFiles },
    { id:"shared",    label:"Shared",    icon:<IconShared />, badge:stats?.sharedLinks },
    { id:"starred",   label:"Starred",   icon:<IconStar /> },
    { id:"trash",     label:"Trash",     icon:<IconTrash />,  badge:stats?.trashedFiles },
  ];

  const handleLogout = () => { clearAuth(); navigate("/login"); };
  const hour         = new Date().getHours();
  const greeting     = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const PAGE_LABELS  = { dashboard:"Dashboard", files:"My Files", shared:"Shared", starred:"Starred", trash:"Trash" };

  return (
    <>
      <style>{STYLES}</style>
      <div className="dash-shell">

        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}/>}

        {/* ════════════ SEARCH MODAL ════════════ */}
        {searchOpen && (
          <SearchModal
            onClose={() => setSearchOpen(false)}
            token={token}
            userId={authUser.id}
            onNavigate={(page) => { goToPage(page); }}
          />
        )}

        {/* ════════════ SIDEBAR ════════════ */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-logo" onClick={() => { goBack(); setSidebarOpen(false); }}>
            <div className="logo-mark">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4a2 2 0 012-2h4l4 4v6a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" fill="white" fillOpacity="0.9"/>
                <path d="M8 2l4 4H8V2z" fill="white" fillOpacity="0.5"/>
              </svg>
            </div>
            <span className="logo-text">Vault</span>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Menu</div>
            {NAV.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeNav === item.id ? "active" : ""}`}
                onClick={() => goToPage(item.id)}
              >
                {item.icon}
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            ))}

            {/* <div className="nav-section-label" style={{ marginTop:8 }}>Storage</div>
            <div style={{ padding:"8px 12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:12, color:"var(--text-3)" }}>Used</span>
                <span style={{ fontSize:12, color:"var(--text-2)", fontFamily:"'Courier New',monospace" }}>
                  {loading ? "—" : `${storageUsedGB} / ${storageLimitGB} GB`}
                </span>
              </div>
              <div style={{ height:4, background:"var(--surface2)", borderRadius:999, overflow:"hidden" }}>
                <div style={{ width:`${storagePct}%`, height:"100%", background:"linear-gradient(90deg,var(--amber),#fcd34d)", borderRadius:999, transition:"width 0.6s ease" }}/>
              </div>
              <div style={{ fontSize:11, color:"var(--text-3)", marginTop:6 }}>
                {loading ? "Loading…" : `${stats?.storage?.remainingGB ?? storageLimitGB} GB remaining`}
              </div>
            </div> */}
          </nav>

          <div className="sidebar-footer">
            {/* ── Light / Dark toggle ── */}
            <div className="theme-row">
              <span className="theme-row-label">
                {theme === "dark" ? <IconMoon /> : <IconSun />}
                Theme
              </span>
              <div className="theme-pill">
                <button
                  className={`theme-pill-btn ${theme === "light" ? "active" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  <IconSun /> Light
                </button>
                <button
                  className={`theme-pill-btn ${theme === "dark" ? "active" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  <IconMoon /> Dark
                </button>
              </div>
            </div>

            <div className="sidebar-user" onClick={() => { setProfileOpen(true); setSidebarOpen(false); }}>
              <div className="user-avatar-sm">{initials}</div>
              <div className="user-info-sm">
                <div className="user-email-sm">{authUser.email}</div>
                <div className="user-role-sm">{p.plan ?? "Free"} Plan</div>
              </div>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color:"var(--text-3)", flexShrink:0 }}>
                <path d="M5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </aside>

        {/* ════════════ MAIN CONTENT ════════════ */}
        <div className="main-content">
          <header className="topbar">
            <div className="topbar-left">
              <button className="menu-btn" onClick={() => setSidebarOpen(o => !o)}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2 4h11M2 7.5h11M2 11h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
              <span className="page-breadcrumb">
                {currentPage !== "dashboard" ? (
                  <>
                    <span style={{ cursor:"pointer", color:"var(--amber)", opacity:0.8 }} onClick={goBack}>Vault</span>
                    <span className="breadcrumb-sep">/</span>
                    <span>{PAGE_LABELS[currentPage]}</span>
                  </>
                ) : (
                  <>Vault / <span>Dashboard</span></>
                )}
              </span>
            </div>

            <div className="topbar-right">
              {/* ── Search trigger button ── */}
              <button
                className="search-trigger"
                onClick={() => setSearchOpen(true)}
                title="Search (Ctrl+K)"
              >
                <IconSearch />
                <span style={{ color:"var(--text-3)", fontSize:13 }}>Search…</span>
                <span className="search-trigger-kbd">⌘K</span>
              </button>

              {/* ── Theme toggle icon (compact, for topbar) ── */}
              <button
                className="icon-btn"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
              >
                {theme === "dark" ? <IconSun /> : <IconMoon />}
              </button>

              <NotificationPanel userId={authUser.id} token={token} />

              <div className="profile-trigger" onClick={() => setProfileOpen(true)}>
                <div className="avatar-xs">{initials}</div>
                <span className="profile-trigger-name">{username}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color:"var(--text-3)" }}>
                  <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </header>

          <div className="page-body">

            {/* ══════════ DASHBOARD HOME ══════════ */}
            {currentPage === "dashboard" && (
              <>
                <div className="anim-fadeup" style={{ marginBottom:32 }}>
                  <h1 style={{ fontFamily:"var(--serif)", fontSize:"clamp(24px,4vw,36px)", fontWeight:900, color:"var(--text)", letterSpacing:"-0.5px", lineHeight:1.15, marginBottom:6 }}>
                    {greeting}, <span style={{ fontStyle:"italic", color:"var(--amber)" }}>{username}</span> 👋
                  </h1>
                  <p style={{ fontSize:14, color:"var(--text-2)", fontWeight:300 }}>
                    Here's what's happening with your files today.
                  </p>
                </div>

                {error && (
                  <div className="error-banner">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 4.5v4M7.5 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    {error}
                    <button onClick={fetchDashboard} style={{ marginLeft:"auto", background:"none", border:"none", color:"var(--red)", cursor:"pointer", fontSize:12, fontWeight:500, textDecoration:"underline" }}>Retry</button>
                  </div>
                )}

                {/* Stat cards */}
                <div className="stats-grid">
                  {loading
                    ? [0,1,2,3].map(i => <StatSkeleton key={i}/>)
                    : STAT_CARDS.map((s, i) => (
                      <div key={i} className={`stat-card ${s.color} anim-fadeup d${i+1}`}>
                        <div className="stat-icon" style={{ background:s.iconBg, border:`1px solid ${s.iconColor}33` }}>
                          <span style={{ color:s.iconColor }}>{s.icon}</span>
                        </div>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value">{s.value}</div>
                        <div className={`stat-delta ${s.up ? "up" : "down"}`}>
                          {s.up
                            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          }
                          {s.delta}
                        </div>
                      </div>
                    ))
                  }
                </div>

                {/* Quick actions */}
                <div className="section-title anim-fadeup d3">Quick Actions</div>
                <div className="quick-grid anim-fadeup d4">
                  {QUICK_ACTIONS.map((a, i) => (
                    <div key={i} className="quick-card" onClick={() => goToPage(a.page)}>
                      <div className="quick-icon" style={{ background:a.bg, border:`1px solid ${a.border}` }}>
                        <span style={{ color:a.color }}>{a.icon}</span>
                      </div>
                      <span className="quick-label">{a.label}</span>
                    </div>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="section-title anim-fadeup d5" style={{ marginTop:8 }}>
                  Recent Activity
                  {activityLoad && (
                    <span style={{ width:14, height:14, border:"2px solid var(--amber-dim)", borderTopColor:"var(--amber)", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }}/>
                  )}
                </div>
                <div className="activity-list anim-fadeup d6">
                  {loading
                    ? [0,1,2,3,4,5].map(i => <ActivitySkeleton key={i}/>)
                    : activity.length === 0
                      ? <div style={{ padding:"40px 20px", textAlign:"center", color:"var(--text-3)", fontSize:13 }}>No recent activity yet. Upload your first file!</div>
                      : activity.map((a, i) => {
                          const color = activityColor(a.type);
                          return (
                            <div key={i} className="activity-item">
                              <div className="activity-dot" style={{ background:color, boxShadow:`0 0 6px ${color}` }}/>
                              <div className="activity-text"><strong>{a.fileName}</strong> {a.action}</div>
                              <div className="activity-time">{fmt(a.timestamp)}</div>
                            </div>
                          );
                        })
                  }
                </div>
              </>
            )}

            {/* ══════════ CHILD PAGES ══════════ */}
            {currentPage === "files" && (
              <FileManager
                onBack={goBack} authUser={authUser} token={token}
                userId={authUser.id} BackBtn={BackBtn} navigate={navigate}
                onActivityUpdate={() => fetchActivity(true)}
              />
            )}
            {currentPage === "shared" && (
              <SharedPage
                onBack={goBack} stats={stats} authUser={authUser}
                BackBtn={BackBtn} navigate={navigate}
                onActivityUpdate={() => fetchActivity(true)}
              />
            )}
            {currentPage === "starred" && (
              <StarredPage
                onBack={goBack} authUser={authUser} token={token}
                BackBtn={BackBtn}
                onActivityUpdate={() => fetchActivity(true)}
              />
            )}
            {currentPage === "trash" && (
              <TrashPage
                onBack={goBack} authUser={authUser} token={token}
                BackBtn={BackBtn}
                onActivityUpdate={() => fetchActivity(true)}
              />
            )}

          </div>
        </div>

        {/* ════════════ PROFILE DRAWER ════════════ */}
        {profileOpen && (
          <>
            <div className="drawer-overlay" onClick={() => setProfileOpen(false)}/>
            <aside className="profile-drawer">
              <div className="drawer-header">
                <span className="drawer-title">Profile</span>
                <button className="close-btn" onClick={() => setProfileOpen(false)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>

              {profLoad ? (
                <div style={{ padding:40, display:"flex", justifyContent:"center" }}>
                  <div style={{ width:24, height:24, border:"2px solid var(--amber-dim)", borderTopColor:"var(--amber)", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
                </div>
              ) : (
                <>
                  <div className="profile-hero">
                    <div className="avatar-lg">{initials}</div>
                    <div className="profile-name">{p.username ?? username}</div>
                    <div className="profile-email">{p.email ?? authUser.email}</div>
                    <div className="profile-badges">
                      {(p.isVerified ?? true) && (
                        <span className="profile-badge verified">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Verified
                        </span>
                      )}
                      <span className="profile-badge plan">{p.plan ?? "Free"} Plan</span>
                    </div>
                  </div>

                  <div className="profile-stats">
                    {[
                      [String(p.files?.total ?? stats?.totalFiles ?? 0),                       "Files"],
                      [fmtStorage(p.storage?.usedBytes ?? stats?.storage?.usedBytes ?? 0),     "Used"],
                      [String(p.files?.shared ?? stats?.sharedLinks ?? 0),                     "Shared"],
                    ].map(([v, l]) => (
                      <div key={l} className="profile-stat">
                        <div className="profile-stat-val">{v}</div>
                        <div className="profile-stat-label">{l}</div>
                      </div>
                    ))}
                  </div>

                  <div className="drawer-section">
                    <div className="drawer-section-title">Account</div>
                    {[
                      ["Email",   p.email ?? authUser.email,                           "mono"],
                      ["User ID", (p.id ?? authUser.id ?? "—").slice(-10),             "mono"],
                      ["Joined",  fmtJoined(p.joinedAt),                               ""],
                      // ["Plan",    `${p.plan ?? "Free"} · ${p.storage?.limitGB ?? 10} GB`, ""],
                      ["Status",  p.isVerified ? "Verified" : "Unverified",            ""],
                    ].map(([label, value, cls]) => (
                      <div key={label} className="info-row">
                        <span className="info-label">{label}</span>
                        <span className={`info-value ${cls}`} style={label === "Status" ? { color: p.isVerified ? "var(--green)" : "var(--red)" } : {}}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="drawer-section">
                    <div className="drawer-section-title">Preferences</div>

                    {/* {[
                      { key:"notifications", label:"Email notifications", desc:"Get notified on uploads & shares" },
                      { key:"twoFactor",     label:"Two-factor auth",     desc:"Extra OTP on each login" },
                    ].map(t => (
                      <div key={t.key} className="toggle-row">
                        <div className="toggle-info">
                          <div className="toggle-label">{t.label}</div>
                          <div className="toggle-desc">{t.desc}</div>
                        </div>
                        <div
                          className={`toggle ${toggles[t.key] ? "on" : ""}`}
                          onClick={() => setToggles(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                        >
                          <div className="toggle-thumb"/>
                        </div>
                      </div>
                    ))} */}

                    {/* Dark mode toggle inside drawer */}
                    <div className="toggle-row">
                      <div className="toggle-info">
                        <div className="toggle-label">Dark mode</div>
                        <div className="toggle-desc">{theme === "dark" ? "Currently active" : "Currently inactive"}</div>
                      </div>
                      <div className={`toggle ${theme === "dark" ? "on" : ""}`} onClick={toggleTheme}>
                        <div className="toggle-thumb"/>
                      </div>
                    </div>
                  </div>

                  {/* <div className="drawer-section">
                    <div className="drawer-section-title">Storage</div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                      <span style={{ fontSize:13, color:"var(--text-2)" }}>{storageLabel}</span>
                      <span style={{ fontSize:13, color:"var(--amber)", fontWeight:500 }}>{storagePct}%</span>
                    </div>
                    <div style={{ height:6, background:"var(--surface2)", borderRadius:999, overflow:"hidden", marginBottom:12 }}>
                      <div style={{ width:`${storagePct}%`, height:"100%", background:"linear-gradient(90deg,var(--amber),#fcd34d)", borderRadius:999, transition:"width 0.6s ease" }}/>
                    </div>
                    <button style={{ width:"100%", padding:"10px", background:"linear-gradient(135deg,var(--amber),#b45309)", color:"#fff", fontFamily:"var(--sans)", fontSize:13, fontWeight:600, border:"none", borderRadius:8, cursor:"pointer", boxShadow:"0 4px 16px var(--amber-glow)" }}>
                      Upgrade to Pro →
                    </button>
                  </div> */}

                  <div className="drawer-actions">
                    <button className="drawer-btn" onClick={() => setEditProfileOpen(true)}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Edit Profile
                    </button>
                    <button className="drawer-btn danger" onClick={handleLogout}>
                      <IconLogout /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </aside>
          </>
        )}

        {editProfileOpen && (
          <EditProfile
            user={{ ...authUser, ...(profile || {}) }}
            token={token}
            onClose={() => setEditProfileOpen(false)}
            onSave={(updated) => setProfile(prev => ({ ...prev, ...updated }))}
          />
        )}

      </div>
    </>
  );
}
