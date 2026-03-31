// components/NotificationPanel.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const BASE = " https://voult-server.onrender.com/api/v1/notifications";

const NOTIF_STYLES = `
  @keyframes np-fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes np-slideIn { from{opacity:0;transform:translateX(100%)} to{opacity:1;transform:translateX(0)} }
  @keyframes np-popIn   { from{opacity:0;transform:scale(0.94) translateY(-8px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes np-slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes np-pulse   { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes np-spin    { to{transform:rotate(360deg)} }
  @keyframes np-ping    { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(2.2);opacity:0} }

  /* ── Bell button ── */
  .np-bell-wrap { position:relative; }
  .np-bell-btn {
    width:36px; height:36px; border-radius:8px;
    background:var(--surface); border:1px solid var(--border);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all 0.15s; color:var(--text-2); position:relative;
  }
  .np-bell-btn:hover  { background:var(--surface2); color:var(--text); border-color:var(--border2); }
  .np-bell-btn.active { background:var(--amber-dim); color:var(--amber); border-color:rgba(245,158,11,0.25); }

  .np-badge {
    position:absolute; top:-5px; right:-5px;
    min-width:18px; height:18px; border-radius:9px; padding:0 5px;
    background:var(--red); color:#fff;
    font-size:10px; font-weight:700; font-family:'Courier New',monospace;
    display:flex; align-items:center; justify-content:center;
    border:2px solid var(--bg); z-index:2;
    animation:np-popIn 0.25s cubic-bezier(.34,1.56,.64,1) both;
  }
  .np-ping {
    position:absolute; top:-5px; right:-5px;
    width:18px; height:18px; border-radius:50%;
    background:var(--red); opacity:0.6;
    animation:np-ping 1.4s cubic-bezier(0,0,0.2,1) infinite;
  }

  /* ── Drawer overlay ── */
  .np-overlay {
    position:fixed; inset:0; z-index:80;
    background:rgba(0,0,0,0.55); backdrop-filter:blur(4px);
    animation:np-fadeIn 0.2s ease both;
  }

  /* ── Drawer ── */
  .np-drawer {
    position:fixed; top:0; right:0; width:380px; height:100vh;
    background:var(--surface); border-left:1px solid var(--border);
    z-index:90; display:flex; flex-direction:column;
    animation:np-slideIn 0.32s cubic-bezier(.22,1,.36,1) both;
  }
  @media(max-width:480px){ .np-drawer{ width:100%; } }

  /* ── Drawer header ── */
  .np-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:20px 20px 16px; border-bottom:1px solid var(--border);
    position:sticky; top:0; background:var(--surface); z-index:2; flex-shrink:0;
  }
  .np-header-left { display:flex; align-items:center; gap:10px; }
  .np-title { font-family:var(--serif); font-size:17px; font-weight:900; color:var(--text); letter-spacing:-0.3px; }
  .np-unread-pill {
    font-size:10px; color:var(--amber); font-weight:700;
    background:var(--amber-dim); border:1px solid rgba(245,158,11,0.2);
    border-radius:20px; padding:2px 8px; font-family:'Courier New',monospace;
  }
  .np-header-right { display:flex; align-items:center; gap:6px; }
  .np-hdr-btn {
    padding:5px 10px; border-radius:7px; border:1px solid var(--border);
    background:var(--surface2); color:var(--text-3);
    font-family:var(--sans); font-size:11px; font-weight:500;
    cursor:pointer; transition:all 0.13s; white-space:nowrap;
  }
  .np-hdr-btn:hover { color:var(--text-2); border-color:var(--border2); background:var(--surface3); }
  .np-hdr-btn.danger:hover { color:var(--red); border-color:rgba(248,113,113,0.25); background:var(--red-dim); }
  .np-close {
    width:28px; height:28px; border-radius:7px;
    background:var(--surface2); border:1px solid var(--border);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:var(--text-2); transition:all 0.13s;
  }
  .np-close:hover { color:var(--text); border-color:var(--border2); }

  /* ── Filter tabs ── */
  .np-tabs {
    display:flex; gap:4px; padding:12px 20px 10px;
    border-bottom:1px solid var(--border); flex-shrink:0; overflow-x:auto;
  }
  .np-tab {
    padding:5px 12px; border-radius:7px; border:1px solid transparent;
    background:none; color:var(--text-3); font-family:var(--sans); font-size:12px;
    font-weight:500; cursor:pointer; transition:all 0.13s; white-space:nowrap;
  }
  .np-tab:hover { color:var(--text-2); background:var(--surface2); }
  .np-tab.active { background:var(--amber-dim); color:var(--amber); border-color:rgba(245,158,11,0.2); }

  /* ── List ── */
  .np-list { flex:1; overflow-y:auto; padding:8px 0; }

  /* ── Notification item ── */
  .np-item {
    display:flex; align-items:flex-start; gap:12px;
    padding:14px 20px; border-bottom:1px solid var(--border);
    transition:background 0.13s; cursor:pointer; position:relative;
    animation:np-slideUp 0.25s cubic-bezier(.22,1,.36,1) both;
  }
  .np-item:last-child { border-bottom:none; }
  .np-item:hover { background:var(--surface2); }
  .np-item.unread { background:rgba(245,158,11,0.03); }
  .np-item.unread:hover { background:rgba(245,158,11,0.06); }

  .np-item-icon {
    width:36px; height:36px; border-radius:10px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center; font-size:16px;
    margin-top:1px;
  }
  .np-item-body { flex:1; min-width:0; }
  .np-item-title {
    font-size:13px; color:var(--text); font-weight:500; line-height:1.4;
    margin-bottom:3px; display:flex; align-items:center; gap:6px;
  }
  .np-item-title .np-dot {
    width:6px; height:6px; border-radius:50%; background:var(--amber); flex-shrink:0;
    animation:np-pulse 2s ease infinite;
  }
  .np-item-msg  { font-size:12px; color:var(--text-2); font-weight:300; line-height:1.5; margin-bottom:4px; }
  .np-item-meta { display:flex; align-items:center; gap:8px; }
  .np-item-time { font-size:10px; color:var(--text-3); font-family:'Courier New',monospace; }
  .np-item-file {
    font-size:10px; color:var(--text-3); background:var(--surface2);
    border:1px solid var(--border); border-radius:4px; padding:1px 6px;
    max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    font-family:'Courier New',monospace;
  }
  .np-item-actions { display:flex; gap:4px; flex-shrink:0; align-self:flex-start; margin-top:2px; opacity:0; transition:opacity 0.13s; }
  .np-item:hover .np-item-actions { opacity:1; }
  .np-action-btn {
    width:24px; height:24px; border-radius:6px; border:1px solid var(--border);
    background:var(--surface); color:var(--text-3); display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all 0.13s;
  }
  .np-action-btn:hover       { color:var(--amber); border-color:rgba(245,158,11,0.3); background:var(--amber-dim); }
  .np-action-btn.del:hover   { color:var(--red);   border-color:rgba(248,113,113,0.3); background:var(--red-dim); }

  /* ── Empty ── */
  .np-empty {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:60px 32px; text-align:center; min-height:300px;
    animation:np-fadeIn 0.3s ease both;
  }
  .np-empty-icon { font-size:36px; margin-bottom:14px; opacity:0.4; }
  .np-empty-t { font-family:var(--serif); font-size:16px; font-weight:700; color:var(--text); margin-bottom:5px; }
  .np-empty-s { font-size:12px; color:var(--text-3); font-weight:300; }

  /* ── Skeleton ── */
  .np-skel {
    display:flex; align-items:flex-start; gap:12px; padding:14px 20px;
    border-bottom:1px solid var(--border);
  }
  .np-skel-icon { width:36px; height:36px; border-radius:10px; flex-shrink:0; }
  .np-skel-body { flex:1; display:flex; flex-direction:column; gap:7px; padding-top:2px; }
  .np-sk { background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%); background-size:200% 100%; animation:np-spin 0s, shimmer 1.4s infinite; border-radius:4px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* ── Loading spinner ── */
  .np-spinner { display:flex; justify-content:center; padding:40px; }
  .np-spin-ring { width:24px; height:24px; border:2px solid rgba(245,158,11,0.15); border-top-color:var(--amber); border-radius:50%; animation:np-spin 0.7s linear infinite; }
`;

/* ── Type config — icon + colors ── */
const TYPE_CONFIG = {
  upload:         { icon: "⬆️", bg: "rgba(245,158,11,0.12)",  bd: "rgba(245,158,11,0.2)" },
  share:          { icon: "🔗", bg: "rgba(52,211,153,0.12)",  bd: "rgba(52,211,153,0.2)" },
  share_sent:     { icon: "📤", bg: "rgba(52,211,153,0.12)",  bd: "rgba(52,211,153,0.2)" },
  share_failed:   { icon: "⚠️", bg: "rgba(248,113,113,0.12)", bd: "rgba(248,113,113,0.2)" },
  delete:         { icon: "🗑️", bg: "rgba(248,113,113,0.12)", bd: "rgba(248,113,113,0.2)" },
  trash:          { icon: "🗑️", bg: "rgba(248,113,113,0.12)", bd: "rgba(248,113,113,0.2)" },
  restore:        { icon: "♻️", bg: "rgba(96,165,250,0.12)",  bd: "rgba(96,165,250,0.2)" },
  star:           { icon: "⭐", bg: "rgba(245,158,11,0.12)",  bd: "rgba(245,158,11,0.2)" },
  profile_update: { icon: "✏️", bg: "rgba(167,139,250,0.12)", bd: "rgba(167,139,250,0.2)" },
  login:          { icon: "🔐", bg: "rgba(96,165,250,0.12)",  bd: "rgba(96,165,250,0.2)" },
  register:       { icon: "🎉", bg: "rgba(52,211,153,0.12)",  bd: "rgba(52,211,153,0.2)" },
  storage_warn:   { icon: "💾", bg: "rgba(248,113,113,0.12)", bd: "rgba(248,113,113,0.2)" },
  system:         { icon: "🔔", bg: "rgba(200,200,200,0.07)", bd: "rgba(200,200,200,0.12)" },
};
const tc = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.system;

/* ── Time formatter ── */
const fmt = (d) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)    return "just now";
  if (m < 60)   return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  if (m < 2880) return "Yesterday";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const TABS = [
  { id: "all",     label: "All" },
  { id: "unread",  label: "Unread" },
  { id: "files",   label: "Files" },
  { id: "account", label: "Account" },
];
const FILE_TYPES    = ["upload", "share", "share_sent", "share_failed", "delete", "trash", "restore", "star"];
const ACCOUNT_TYPES = ["login", "register", "profile_update", "storage_warn", "system"];

function SkelItem() {
  return (
    <div className="np-skel">
      <div className="np-skel-icon np-sk" />
      <div className="np-skel-body">
        <div className="np-sk" style={{ height: 12, width: "60%" }} />
        <div className="np-sk" style={{ height: 10, width: "85%" }} />
        <div className="np-sk" style={{ height: 9,  width: "30%" }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════ */
export default function NotificationPanel({ userId, token }) {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [tab,           setTab]           = useState("all");
  const headers = { Authorization: `Bearer ${token}` };
  const pollRef = useRef();

  /* ── Fetch notifications ── */
  const fetchNotifs = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await axios.get(`${BASE}/${userId}?limit=40`, { headers });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("fetchNotifs:", err.message);
    } finally { setLoading(false); }
  }, [userId, token]);

  /* ── Poll unread count every 30s ── */
  const pollUnread = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await axios.get(`${BASE}/${userId}/unread-count`, { headers });
      setUnreadCount(data.unreadCount || 0);
    } catch { /* silent */ }
  }, [userId, token]);

  useEffect(() => {
    fetchNotifs();
    pollRef.current = setInterval(pollUnread, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifs, pollUnread]);

  useEffect(() => { if (open) fetchNotifs(); }, [open]);

  /* ── Mark single as read ── */
  const markRead = async (notif) => {
    if (notif.isRead) return;
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try {
      await axios.patch(`${BASE}/${notif.id}/read`, {}, { headers });
    } catch { /* rollback */ fetchNotifs(true); }
  };

  /* ── Mark all as read ── */
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await axios.patch(`${BASE}/${userId}/read-all`, {}, { headers });
    } catch { fetchNotifs(true); }
  };

  /* ── Delete one ── */
  const deleteOne = async (e, notifId) => {
    e.stopPropagation();
    const notif = notifications.find(n => n.id === notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    if (notif && !notif.isRead) setUnreadCount(c => Math.max(0, c - 1));
    try {
      await axios.delete(`${BASE}/${notifId}`, { headers });
    } catch { fetchNotifs(true); }
  };

  /* ── Clear all ── */
  const clearAll = async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await axios.delete(`${BASE}/${userId}/clear-all`, { headers });
    } catch { fetchNotifs(true); }
  };

  /* ── Filter by tab ── */
  const visible = notifications.filter(n => {
    if (tab === "unread")  return !n.isRead;
    if (tab === "files")   return FILE_TYPES.includes(n.type);
    if (tab === "account") return ACCOUNT_TYPES.includes(n.type);
    return true;
  });

  return (
    <>
      <style>{NOTIF_STYLES}</style>

      {/* ── Bell button ── */}
      <div className="np-bell-wrap">
        <button
          className={`np-bell-btn ${open ? "active" : ""}`}
          onClick={() => setOpen(o => !o)}
          title="Notifications"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 1.5A4 4 0 003.5 5.5v3l-1.5 2h11l-1.5-2v-3A4 4 0 007.5 1.5z"
              stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M6 10.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {unreadCount > 0 && (
            <>
              <div className="np-ping" />
              <div className="np-badge">{unreadCount > 99 ? "99+" : unreadCount}</div>
            </>
          )}
        </button>
      </div>

      {/* ── Drawer ── */}
      {open && (
        <>
          <div className="np-overlay" onClick={() => setOpen(false)} />
          <aside className="np-drawer">

            {/* Header */}
            <div className="np-header">
              <div className="np-header-left">
                <span className="np-title">Notifications</span>
                {unreadCount > 0 && <span className="np-unread-pill">{unreadCount} new</span>}
              </div>
              <div className="np-header-right">
                {unreadCount > 0 && (
                  <button className="np-hdr-btn" onClick={markAllRead}>Mark all read</button>
                )}
                {notifications.length > 0 && (
                  <button className="np-hdr-btn danger" onClick={clearAll}>Clear all</button>
                )}
                <button className="np-close" onClick={() => setOpen(false)}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="np-tabs">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`np-tab ${tab === t.id ? "active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                  {t.id === "unread" && unreadCount > 0 && ` (${unreadCount})`}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="np-list">
              {loading ? (
                [0,1,2,3,4].map(i => <SkelItem key={i} />)
              ) : visible.length === 0 ? (
                <div className="np-empty">
                  <div className="np-empty-icon">🔔</div>
                  <div className="np-empty-t">
                    {tab === "unread" ? "All caught up!" : "No notifications"}
                  </div>
                  <div className="np-empty-s">
                    {tab === "unread"
                      ? "You have no unread notifications."
                      : "Notifications will appear here when something happens."}
                  </div>
                </div>
              ) : (
                visible.map((n, i) => {
                  const { icon, bg, bd } = tc(n.type);
                  return (
                    <div
                      key={n.id}
                      className={`np-item ${!n.isRead ? "unread" : ""}`}
                      style={{ animationDelay: `${i * 25}ms` }}
                      onClick={() => markRead(n)}
                    >
                      <div className="np-item-icon" style={{ background: bg, border: `1px solid ${bd}` }}>
                        {icon}
                      </div>

                      <div className="np-item-body">
                        <div className="np-item-title">
                          {!n.isRead && <span className="np-dot" />}
                          {n.title}
                        </div>
                        <div className="np-item-msg">{n.message}</div>
                        <div className="np-item-meta">
                          <span className="np-item-time">{fmt(n.timestamp)}</span>
                          {n.fileName && <span className="np-item-file">{n.fileName}</span>}
                        </div>
                      </div>

                      <div className="np-item-actions">
                        {!n.isRead && (
                          <button
                            className="np-action-btn"
                            title="Mark as read"
                            onClick={(e) => { e.stopPropagation(); markRead(n); }}
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                        <button
                          className="np-action-btn del"
                          title="Delete"
                          onClick={(e) => deleteOne(e, n.id)}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1 2h8M3.5 2V1.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5V2M4 4v4M6 4v4M1.5 2l.5 7a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.5-7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </aside>
        </>
      )}
    </>
  );
}
