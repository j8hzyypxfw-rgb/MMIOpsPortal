import { useState, useRef, useEffect } from "react";

// ── Prompt loader — server-side, token never in browser ──────────────────────
async function assembleSystemPrompt() {
  try {
    const res = await fetch("/api/get-prompts");
    if (!res.ok) throw new Error(`get-prompts ${res.status}`);
    const data = await res.json();
    return data.prompt || "";
  } catch (err) {
    console.error("[assembleSystemPrompt]", err);
    return "";
  }
}

// ── Athlete identity ─────────────────────────────────────────────────────────
// Set by the athlete selector screen. Falls back to sessionStorage so
// the selection persists across page refreshes within the same tab.
let ATHLETE_ID = (() => {
  try { return sessionStorage.getItem("teos_athlete") || ""; } catch { return ""; }
})();
function setAthleteId(id) {
  ATHLETE_ID = id;
  try { sessionStorage.setItem("teos_athlete", id); } catch {}
}

async function fetchState() {
  try {
    const res = await fetch(`/api/get-state?athleteId=${ATHLETE_ID}`);
    if (!res.ok) throw new Error(`get-state ${res.status}`);
    const data = await res.json();
    if (data?._new) { console.info("[state] New athlete — empty state"); return null; }
    return data;
  } catch (err) {
    console.error("[fetchState]", err);
    return null;
  }
}

async function pushState(state) {
  const res = await fetch("/api/update-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ athleteId: ATHLETE_ID, state }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `update-state ${res.status}`);
  }
  return res.json();
}

// Save a single message to Supabase — fire and forget, never blocks UI
let _activeConvId = null;
async function saveMessage({ role, content, imageCount=0, tokenInput, tokenOutput, tokenCached }) {
  try {
    const text = typeof content === "string" ? content
      : Array.isArray(content) ? (content.find(b => b.type==="text")?.text || "")
      : "";
    // Strip DASHBOARD_UPDATE blocks before saving — they're internal protocol
    const clean = text.replace(/DASHBOARD_UPDATE:\s*```[\s\S]*?```/g, "[Dashboard updated]").trim();
    if (!clean) return;
    const res = await fetch("/api/save-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athleteId: ATHLETE_ID,
        role, content: clean,
        imageCount, tokenInput, tokenOutput, tokenCached,
        conversationId: _activeConvId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.conversationId) _activeConvId = data.conversationId;
    }
  } catch(e) { console.warn("[saveMessage]", e); }
}

// Deep merge: recursively merge patch into base, preserving fields not in patch
function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return patch ?? base;
  const result = { ...base };
  for (const key of Object.keys(patch)) {
    if (patch[key] !== null && typeof patch[key] === "object" && !Array.isArray(patch[key]) &&
        base[key] !== null && typeof base[key] === "object" && !Array.isArray(base[key])) {
      result[key] = deepMerge(base[key], patch[key]);
    } else {
      result[key] = patch[key];
    }
  }
  return result;
}

// Build a state context string to inject into every Coach T API call
function buildStateContext(appState) {
  if (!appState) return "";

  // Gates summary
  const g = appState.gates || {};
  const hrvVal    = parseFloat(appState.athlete?.latestHRV || 0);
  const hrvGate   = parseFloat(appState.athlete?.hrvGate   || 44);
  const hrvStatus = !hrvVal ? "clear" : hrvVal < hrvGate*0.85 ? "block" : hrvVal < hrvGate ? "flag" : "clear";

  const ctx = {
    today: new Date().toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric", timeZone:"America/Chicago" }),
    weekStats:   appState.weekStats   || {},
    fitness:     appState.fitness     || {},
    block: {
      name:        appState.block?.name,
      currentWeek: appState.block?.currentWeek,
      totalWeeks:  appState.block?.totalWeeks,
      phase:       appState.block?.phase,
      objective:   appState.block?.objective,
      aRace:       appState.block?.aRace,
    },
    athlete: {
      name:      appState.athlete?.name,
      age:       appState.athlete?.age,
      weight:    appState.athlete?.weight,
      height:    appState.athlete?.height,
      ftp:       appState.athlete?.ftp,
      lthr:      appState.athlete?.lthr,
      restingHR: appState.athlete?.restingHR,
      maxHR:     appState.athlete?.maxHR,
      weeklyCap: appState.athlete?.weeklyCap,
      hrvGate:   appState.athlete?.hrvGate,
      sleepGate: appState.athlete?.sleepGate,
      latestHRV: appState.athlete?.latestHRV,
      lastSleep: appState.athlete?.lastSleep,
    },
    gates: {
      sleep:        { status: g.sleep?.status        || "clear", note: g.sleep?.note        || null },
      hrv:          { status: hrvStatus,                          value: hrvVal || null },
      illness:      { status: g.illness?.status      || "clear", note: g.illness?.note      || null },
      injury:       { status: g.injury?.status       || "clear", note: g.injury?.note       || null },
      nutrition:    { status: g.nutrition?.status    || "clear", note: g.nutrition?.note    || null },
      availability: { status: g.availability?.status || "clear", note: g.availability?.note || null },
      accumulated:  { status: g.accumulated?.status  || "clear", note: g.accumulated?.note  || null },
      trainingCleared:  g.trainingCleared  ?? true,
      intensityCleared: g.intensityCleared ?? true,
    },
    races:      (appState.races || []).map(r => ({ name:r.name, date:r.date, priority:r.priority, swim:r.swim, bike:r.bike, run:r.run, done:r.done })),
    // Full week structure — sessions include all details so Coach T can update them precisely
    week:       (appState.week || []).map(d => ({
      day:       d.day,
      dow:       d.dow,
      completed: d.completed,
      sessions:  d.sessions || [],
      workout:   d.workout  || {},
    })),
    workoutLog: (appState.workoutLog || []).slice(-14).map(w => ({ domain:w.domain, date:w.date, duration:w.duration, tss:w.tss||null, if_:w.if_||null, avgHR:w.avgHR||null, rpe:w.rpe||null, notes:w.notes||null })),
    dailyLog:   (appState.dailyLog || []).slice(-7).map(d => ({
      date: d.date, hrv: d.hrv, sleep: d.sleep, restingHR: d.restingHR,
      sleepQuality: d.sleepQuality, energy: d.energy, stress: d.stress, notes: d.notes,
    })),
    benchmarks: appState.benchmarks  || {},
    lastUpdated: appState.lastUpdated,
  };

  return "\n\n---\nCURRENT ATHLETE STATE:\n" +
    JSON.stringify(ctx, null, 2) +
    "\n\nDASHBOARD_UPDATE INSTRUCTIONS:\n" +
    "- To update any data, respond with a DASHBOARD_UPDATE block containing ONLY the changed fields.\n" +
    "- Deep merge applies — omit any fields that are not changing.\n" +
    "- For week schedule changes, include the FULL week array with all 7 days.\n" +
    "- Each day in week must have: { day, dow, completed, sessions:[{type, label, duration, distance, tss, intensity, objective, coachingNote}], workout:{title, details:[], targets, coachingNote} }\n" +
    "- For workout log entries, include the array with new entry marked _new:true.\n" +
    "- For gates, include only the gates object with the changed statuses.\n\n" +
    "Example — log a completed swim:\n" +
    "DASHBOARD_UPDATE:\n" +
    "```json\n" +
    '{ "workoutLog": [{ "_new":true, "domain":"swim", "date":"2026-03-15", "duration":"55 min", "distance":"1800m", "tss":42, "avgHR":138, "notes":"Felt strong" }] }' + "\n" +
    "```\n---";
}

// ── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:          "#1a1a1a",
  bgDeep:      "#141414",
  bgCard:      "#242424",
  border:      "#2e2e2e",
  borderMid:   "#3a3a3a",
  text:        "#ffffff",
  textMuted:   "#d4d4d4",
  textDim:     "#888888",
  amber:       "#eab308",
  amberGlow:   "rgba(234,179,8,0.12)",
  amberBorder: "rgba(234,179,8,0.35)",
  swim:        "#60a5fa",
  swimGlow:    "rgba(96,165,250,0.18)",
  bike:        "#eab308",
  run:         "#22c55e",
  ssm:         "#a78bfa",
  success:     "#22c55e",
  danger:      "#f87171",
  orange:      "#fb923c",
  teal:        "#14b8a6",
  tealGlow:    "rgba(20,184,166,0.15)",
};

const typeColor = { swim: T.swim, bike: T.bike, run: T.run, ssm: T.ssm };
const typeLabel = { swim: "Swim", bike: "Bike", run: "Run", ssm: "SSM" };

function daysUntil(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }
function fmtDate(d)   { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

// ── Nav Structure ─────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",  label: "Dashboard",  subs: [] },
  { id: "training",   label: "Training",   subs: [
    { id: "week",    label: "This Week" },
    { id: "atp",     label: "ATP" },
    { id: "history", label: "History" },
    { id: "trends",  label: "Trends" },
  ]},
  { id: "races",      label: "Races",      subs: [
    { id: "calendar", label: "Calendar" },
    { id: "manage",   label: "Manage" },
  ]},
  { id: "daily",      label: "Daily",      subs: [
    { id: "log",      label: "Log" },
    { id: "history",  label: "History" },
    { id: "sleep",    label: "Sleep & HRV" },
  ]},
  { id: "nutrition",  label: "Nutrition",  subs: [] },
  { id: "review",     label: "Review",     subs: [] },
];

// ── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body, #root { height: 100%; }
  body { background: #0f1a2e; font-family: 'DM Sans', sans-serif; color: #e8edf8; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
  textarea::placeholder, input::placeholder { color: #3a4458; }
  input[type="text"], input[type="number"], input[type="date"] {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; padding: 8px 12px; color: #ffffff; font-family: 'DM Sans', sans-serif;
    font-size: 13px; outline: none; width: 100%;
  }
  input[type="text"]:focus, input[type="number"]:focus, input[type="date"]:focus {
    border-color: rgba(234,179,8,0.4);
  }
  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1) brightness(2);
    cursor: pointer;
    opacity: 0.7;
  }
  input[type="date"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }
  select {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; padding: 8px 12px; color: #e8edf8; font-family: 'DM Sans', sans-serif;
    font-size: 13px; outline: none; width: 100%; cursor: pointer;
  }
  select option { background: #0f1a2e; }
  @keyframes ctBounce { 0%,80%,100%{transform:scale(0);opacity:0.4}40%{transform:scale(1);opacity:1} }
  @keyframes ctFade { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
  @keyframes ctSlide { from{transform:translateX(100%)}to{transform:translateX(0)} }
  @keyframes ctSlideUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
  @keyframes ctSlideUpFull { from{transform:translateY(100%)}to{transform:translateY(0)} }
  /* Mobile overrides */
  @media (max-width: 768px) {
    body { -webkit-text-size-adjust: 100%; }
    input[type="text"], input[type="number"], input[type="date"] { font-size: 16px !important; }
    textarea { font-size: 16px !important; }
  }
`;

// ── Small Shared Components ──────────────────────────────────────────────────
function LoadingDots({ color = T.amber }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:color, display:"inline-block", animation:`ctBounce 1.2s ease ${i*0.2}s infinite` }} />
      ))}
    </div>
  );
}
function Loading() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", gap:12 }}>
      <LoadingDots /><span style={{ color:T.textMuted, fontSize:13 }}>Loading…</span>
    </div>
  );
}
function Card({ title, children, style={} }) {
  return (
    <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12, padding:16, marginBottom:16, ...style }}>
      {title && <h3 style={{ color:T.amber, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:14 }}>{title}</h3>}
      {children}
    </div>
  );
}
function Btn({ children, onClick, variant="default", style={}, disabled=false }) {
  const variants = {
    default:  { background:T.bgCard, border:`1px solid ${T.border}`, color:T.textMuted },
    primary:  { background:T.amberGlow, border:`1px solid ${T.amberBorder}`, color:T.amber },
    success:  { background:"rgba(141,200,48,0.1)", border:"1px solid rgba(141,200,48,0.3)", color:T.success },
    danger:   { background:"rgba(240,120,104,0.1)", border:"1px solid rgba(240,120,104,0.3)", color:T.danger },
    swim:     { background:"rgba(90,171,245,0.1)", border:"1px solid rgba(90,171,245,0.3)", color:T.swim },
  };
  const v = variants[variant] || variants.default;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...v, borderRadius:8, padding:"7px 14px", fontSize:12, cursor:disabled?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", opacity:disabled?0.5:1, transition:"all 0.15s", ...style }}>
      {children}
    </button>
  );
}

// ── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ activeNav, activeSub, setNav, athleteName, appState }) {
  const activeItem = NAV.find(n => n.id === activeNav);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goTo = (nav, sub) => { setNav(nav, sub); setProfileOpen(false); };

  return (
    <div style={{ flexShrink:0, zIndex:10, borderBottom:`1px solid ${T.border}`, background:T.bgDeep }}>
      {/* Main nav row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", height:50 }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:T.amber, letterSpacing:0.5 }}>
          Coach<em style={{ color:"#7a9cc8", fontStyle:"italic" }}>T</em>
        </div>
        <div style={{ display:"flex", gap:2 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setNav(n.id, n.subs[0]?.id || null)}
              style={{ fontSize:12, padding:"5px 16px", borderRadius:16, border:"none",
                background: activeNav===n.id ? T.amberGlow : "none",
                color: activeNav===n.id ? T.amber : T.textMuted,
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s",
                fontWeight: activeNav===n.id ? 500 : 400 }}>
              {n.label}
            </button>
          ))}
        </div>
        {/* Profile avatar + dropdown */}
        <div ref={profileRef} style={{ position:"relative" }}>
          <div onClick={() => setProfileOpen(o => !o)}
            style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"4px 8px", borderRadius:20,
              background: profileOpen ? T.amberGlow : "transparent",
              border: `1px solid ${profileOpen ? T.amberBorder : "transparent"}`,
              transition:"all 0.15s" }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:"#1a3a5c",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, fontWeight:500, color:"#7a9cc8", border:"1px solid rgba(122,156,200,0.3)" }}>
              {(athleteName||"D")[0].toUpperCase()}
            </div>
            <span style={{ fontSize:12, color:profileOpen ? T.amber : T.textMuted }}>{athleteName||"Dale"}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transition:"transform 0.15s", transform:profileOpen?"rotate(180deg)":"none" }}>
              <path d="M1 1L5 5L9 1" stroke={profileOpen ? T.amber : T.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {/* Dropdown menu */}
          {profileOpen && (
            <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, width:220,
              background:T.bgDeep, border:`1px solid ${T.border}`, borderRadius:12,
              boxShadow:"0 8px 32px rgba(0,0,0,0.4)", overflow:"hidden", animation:"ctFade 0.15s ease", zIndex:100 }}>
              {/* Profile header */}
              <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.border}`, background:T.bgCard }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:"#1a3a5c",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:15, fontWeight:500, color:"#7a9cc8", border:"1px solid rgba(122,156,200,0.3)", flexShrink:0 }}>
                    {(athleteName||"D")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{athleteName||"Dale"}</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>Keller, TX · Age {appState?.athlete?.age||56}</div>
                  </div>
                </div>
                <div style={{ marginTop:10, display:"flex", gap:8 }}>
                  {[["FTP", appState?.athlete?.ftp||"—", "W"], ["LTHR", appState?.athlete?.lthr||"—", "bpm"]].map(([k,v,u]) => (
                    <div key={k} style={{ flex:1, background:T.bg, border:`1px solid ${T.border}`, borderRadius:7, padding:"6px 10px" }}>
                      <div style={{ fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:1 }}>{k}</div>
                      <div style={{ fontSize:15, fontWeight:300, color:T.text }}>{v} <span style={{ fontSize:10, color:T.textMuted }}>{u}</span></div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Menu items */}
              {[
                { label:"Athlete Profile",   icon:"👤", nav:"athlete", sub:"profile" },
                { label:"Benchmarks",        icon:"📊", nav:"athlete", sub:"benchmarks" },
              ].map(item => (
                <button key={item.label} onClick={() => goTo(item.nav, item.sub)}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 16px",
                    background:"transparent", border:"none", borderBottom:`1px solid ${T.border}`,
                    color:T.textMuted, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                    textAlign:"left", transition:"all 0.1s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.bgCard; e.currentTarget.style.color = T.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMuted; }}>
                  <span style={{ fontSize:14 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <button onClick={() => { try { sessionStorage.removeItem("teos_athlete"); } catch{} window.location.reload(); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 16px",
                  background:"transparent", border:"none", borderBottom:`1px solid ${T.border}`,
                  color:T.textMuted, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", textAlign:"left" }}
                onMouseEnter={e => { e.currentTarget.style.background = T.bgCard; e.currentTarget.style.color = T.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMuted; }}>
                <span style={{ fontSize:14 }}>🔄</span>
                Switch Athlete
              </button>
              <div style={{ padding:"10px 16px" }}>
                <span style={{ fontSize:12, color:T.textDim }}>Block {appState?.block?.currentWeek||2} of {appState?.block?.totalWeeks||8} · {appState?.block?.name||"Active Block"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Sub-nav row */}
      {activeItem?.subs?.length > 0 && (
        <div style={{ display:"flex", gap:6, padding:"0 24px 10px", alignItems:"center" }}>
          {activeItem.subs.map(s => (
            <button key={s.id} onClick={() => setNav(activeNav, s.id)}
              style={{ fontSize:11, padding:"3px 13px", borderRadius:12, border:`1px solid ${activeSub===s.id ? T.amberBorder : T.border}`,
                background: activeSub===s.id ? T.amberGlow : "transparent",
                color: activeSub===s.id ? T.amber : T.textMuted,
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Left Sidebar ─────────────────────────────────────────────────────────────
function Sidebar({ appState, setAppState, promptStatus, messages, setMessages, systemPrompt, setNav }) {
  const s = appState;

  // Derive live weekStats from workoutLog if weekStats hasn't been populated yet
  const parseMins = (str) => {
    if (!str) return 0;
    const s = String(str);
    if (s.includes(":")) { const p = s.split(":").map(Number); return p.length===3?p[0]*60+p[1]:p[0]*60+p[1]; }
    const n = parseFloat(s);
    if (isNaN(n)) return 0;
    return s.toLowerCase().includes("hr")||s.toLowerCase().includes("h") ? n*60 : n;
  };
  const liveStats = (() => {
    const log = appState?.workoutLog || [];
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate()-now.getDay()); weekStart.setHours(0,0,0,0);
    const thisWeek = log.filter(e => new Date(e.loggedAt||e.date) >= weekStart);
    const totalMins = thisWeek.reduce((a,e) => a + parseMins(e.duration), 0);
    const totalTSS  = thisWeek.reduce((a,e) => a + (parseFloat(e.tss)||0), 0);
    return {
      volume:   totalMins > 0 ? (totalMins/60).toFixed(1) : null,
      tss:      totalTSS  > 0 ? Math.round(totalTSS)      : null,
      done:     thisWeek.length,
      total:    appState?.weekStats?.total || thisWeek.length,
    };
  })();

  const ws = appState?.weekStats || {};
  const vol      = ws.volume   || liveStats.volume   || "—";
  const tss      = ws.tss      || liveStats.tss      || "—";
  const done     = ws.done     != null ? ws.done     : liveStats.done;
  const total    = ws.total    != null ? ws.total    : liveStats.total;
  const loadDelta = ws.loadDelta || "—";

  const todayDow = new Date().toLocaleDateString("en-US", { weekday:"short", timeZone:"America/Chicago" });
  const weekDays = [
    { label:"M",  dow:"Mon", dot:"sw", text:"SW" },
    { label:"T",  dow:"Tue", dot:"bk", text:"BK" },
    { label:"W",  dow:"Wed", dot:"sw", text:"SW" },
    { label:"Th", dow:"Thu", dot:"rs", text:"—"  },
    { label:"F",  dow:"Fri", dot:"rn", text:"RN" },
    { label:"Sa", dow:"Sat", dot:"bk", text:"BK" },
    { label:"Su", dow:"Sun", dot:"sm", text:"SM" },
  ];
  const dotStyle = (type, isToday) => {
    const base = { width:26, height:26, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:500 };
    const types = {
      sw: { background:"rgba(55,138,221,0.2)", color:"#6aabf0", border:"1px solid rgba(55,138,221,0.25)" },
      bk: { background:"rgba(232,185,106,0.18)", color:T.amber, border:"1px solid rgba(232,185,106,0.25)" },
      rn: { background:"rgba(99,153,34,0.18)", color:"#8dc830", border:"1px solid rgba(99,153,34,0.25)" },
      sm: { background:"rgba(208,111,136,0.18)", color:"#e080a0", border:"1px solid rgba(208,111,136,0.25)" },
      rs: { background:"rgba(255,255,255,0.03)", color:T.textDim, border:`1px solid ${T.border}` },
    };
    const t = types[type] || types.rs;
    return { ...base, ...t, ...(isToday ? { boxShadow:"0 0 0 2px rgba(232,185,106,0.5)" } : {}) };
  };
  const SLabel = ({ children, mt=16 }) => (
    <div style={{ fontSize:9, letterSpacing:"1.2px", textTransform:"uppercase", color:T.textMuted, padding:"0 16px", marginBottom:8, marginTop:mt }}>{children}</div>
  );
  return (
    <div style={{ width:"100%", background:T.bgDeep, borderRight:`2px solid ${T.border}`, display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 0 10px" }}>
        <SLabel mt={0}>Active State</SLabel>
        <div style={{ margin:"0 16px 4px", background:"rgba(232,185,106,0.08)", border:`1px solid ${T.amberBorder}`, borderRadius:9, padding:"11px 13px" }}>
          <div style={{ fontSize:9, letterSpacing:"1px", textTransform:"uppercase", color:T.amber, marginBottom:2 }}>Mode</div>
          <div style={{ fontSize:15, fontWeight:500, color:"#e8eef8" }}>Execution</div>
          <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
            {s?.block?.name?.split("—")[0]?.trim() || "Block 1"} · Wk {s?.block?.currentWeek||2} of {s?.block?.totalWeeks||4}
          </div>
        </div>
        <SLabel>This Week</SLabel>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, padding:"0 16px" }}>
          {[
            ["Volume",   vol,                           "hr"],
            ["TSS",      tss,                           ""],
            ["Sessions", `${done||"—"}/${total||"—"}`,  ""],
            ["Load Δ",   loadDelta,                     "%"],
          ].map(([l,v,u]) => (
            <div key={l} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${T.border}`, borderRadius:7, padding:"9px 11px" }}>
              <div style={{ fontSize:9, color:T.textDim, letterSpacing:"0.5px", marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:17, fontWeight:400, color: v==="—" ? T.textDim : "#ccd4e8" }}>
                {v}<span style={{ fontSize:10, color:T.textMuted, marginLeft:2 }}>{u}</span>
              </div>
            </div>
          ))}
        </div>
        <SLabel>Week Layout</SLabel>
        <div style={{ padding:"0 16px" }}>
          <div style={{ display:"flex", gap:5 }}>
            {weekDays.map((d,i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <div style={dotStyle(d.dot, d.dow===todayDow)}>{d.text}</div>
                <div style={{ fontSize:9, color:T.textDim }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <SLabel>Benchmarks</SLabel>
        <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:9 }}>
          {[["Swim",40,T.swim,"T2"],["Bike",60,T.bike,"T3"],["Run",55,T.run,"T3"]].map(([l,w,col,tier]) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ fontSize:11, color:T.textMuted, width:30 }}>{l}</div>
              <div style={{ flex:1, height:5, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ width:`${w}%`, height:"100%", borderRadius:3, background:col }} />
              </div>
              <div style={{ fontSize:10, color:T.textDim, width:22, textAlign:"right" }}>{tier}</div>
            </div>
          ))}
        </div>
        <div style={{ margin:"16px 16px 0", background:"rgba(99,153,34,0.07)", border:"1px solid rgba(99,153,34,0.18)", borderRadius:8, padding:"9px 12px", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#8dc830", flexShrink:0 }} />
          <div style={{ fontSize:11, color:"#7aaa60" }}>All gates clear · {s?.athlete?.lastSleep||"7.2"}hr sleep</div>
        </div>
      </div>
      <RollingChat systemPrompt={systemPrompt} promptStatus={promptStatus} messages={messages} setMessages={setMessages} appState={appState} setAppState={setAppState} />
    </div>
  );
}

// ── Rolling Chat ──────────────────────────────────────────────────────────────
function RollingChat({ systemPrompt, promptStatus, messages, setMessages, appState, setAppState }) {
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenStats, setTokenStats] = useState({ lastCacheRead:0, sessionCached:0, sessionInput:0, sessionOutput:0, lastInput:0, lastOutput:0 });
  const [pendingImages, setPendingImages] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef(null);
  const taRef     = useRef(null);
  const fileRef   = useRef(null);
  const chatMessages = messages.filter(m => !m.nutritionThread);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMessages, loading]);

  const VALID_MT = ["image/jpeg","image/png","image/gif","image/webp"];
  const normMT   = (t) => VALID_MT.includes(t) ? t : "image/png";

  const readFile = (file) => new Promise(res => {
    const reader = new FileReader();
    reader.onload = () => res({ base64:reader.result.split(",")[1], mediaType:normMT(file.type), preview:reader.result, name:file.name });
    reader.readAsDataURL(file);
  });
  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files||[]).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const loaded = await Promise.all(files.map(readFile));
    setPendingImages(prev => [...prev, ...loaded]);
    e.target.value = "";
  };
  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items||[]).filter(i => i.type.startsWith("image/"));
    if (!items.length) return;
    e.preventDefault();
    const files = items.map(i => i.getAsFile()).filter(Boolean);
    const loaded = await Promise.all(files.map(readFile));
    setPendingImages(prev => [...prev, ...loaded]);
  };
  const handleDashboardUpdate = async (reply) => {
    try {
      const match = reply.match(/DASHBOARD_UPDATE:\s*```(?:json)?\s*[\n\r]+([\s\S]*?)[\n\r]*```/);
      if (!match) return;
      const patch = JSON.parse(match[1]);
      setSaveStatus("saving");
      // Deep merge patch into existing state — preserves all fields not in the patch
      const merged = deepMerge(appState || {}, { ...patch, lastUpdated: new Date().toISOString().split("T")[0] });
      await pushState(merged);
      if (setAppState) setAppState(merged);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
      // Refresh from DB if schedule/workout/log data changed so all pages stay in sync
      if (patch.week || patch.workoutLog || patch.dailyLog || patch.races) {
        setTimeout(async () => {
          try { const fresh = await fetchState(); if (fresh && setAppState) setAppState(fresh); }
          catch(e) { console.warn("[refresh]", e); }
        }, 1500);
      }
    } catch(e) { console.error("Dashboard update failed:", e); setSaveStatus("error"); setTimeout(() => setSaveStatus(null), 4000); }
  };
  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const imageBlocks = pendingImages.map(img => ({ type:"image", source:{ type:"base64", media_type:img.mediaType, data:img.base64 } }));
    const userContent = pendingImages.length > 0
      ? [...imageBlocks, { type:"text", text: text || (pendingImages.length > 1 ? `Analyze these ${pendingImages.length} screenshots in the context of my training.` : "Analyze this screenshot in the context of my training.") }]
      : text;
    const userMsg = { role:"user", content:userContent, imagePreviews:pendingImages.map(i=>i.preview), imageText:text };
    const next = [...messages, userMsg];
    setMessages(next);
    setPendingImages([]);
    setInput("");
    setLoading(true);
    if (taRef.current) taRef.current.style.height = "auto";
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:4000, system:systemPrompt + buildStateContext(appState), messages:next.map(m => ({ role:m.role, content:m.content })) }),
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const reply = data.content?.find(b => b.type==="text")?.text || "";
      const usage = data.usage || {};
      const cacheRead = usage.cache_read_input_tokens || 0;
      setTokenStats(prev => ({ sessionInput:prev.sessionInput+(usage.input_tokens||0), sessionOutput:prev.sessionOutput+(usage.output_tokens||0), sessionCached:(prev.sessionCached||0)+cacheRead, lastInput:usage.input_tokens||0, lastOutput:usage.output_tokens||0, lastCacheRead:cacheRead, lastCacheWrite:usage.cache_creation_input_tokens||0 }));
      setMessages([...next, { role:"assistant", content:reply }]);
      if (reply.includes("DASHBOARD_UPDATE:")) handleDashboardUpdate(reply);
    } catch { setMessages([...next, { role:"assistant", content:"Connection issue. Check ANTHROPIC_API_KEY in Vercel." }]); }
    setLoading(false);
  };

  return (
    <div style={{ flexShrink:0, borderTop:`1px solid ${T.border}`, display:"flex", flexDirection:"column", height:expanded?"60vh":340, transition:"height 0.25s ease", minHeight:expanded?"60vh":340 }}>
      <div style={{ padding:"10px 14px 8px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, cursor:"pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:11, fontWeight:500, color:"#b0b8cc" }}>Coach T</div>
          <div style={{ fontSize:9, letterSpacing:"1px", textTransform:"uppercase", color:T.amber, background:T.amberGlow, border:`1px solid ${T.amberBorder}`, borderRadius:10, padding:"2px 8px" }}>
            {promptStatus==="loading" ? "Loading…" : promptStatus==="error" ? "Error" : "Execution"}
          </div>
        </div>
        <div style={{ fontSize:13, color:T.textDim, userSelect:"none", padding:"0 2px" }} title={expanded?"Collapse chat":"Expand chat"}>
          {expanded ? "↓" : "↑"}
        </div>
      </div>
      {saveStatus && (
        <div style={{ padding:"5px 14px", fontSize:10, color:saveStatus==="saved"?T.success:saveStatus==="saving"?T.amber:T.danger, background:saveStatus==="saved"?"rgba(141,200,48,0.08)":"rgba(232,185,106,0.08)", borderBottom:`1px solid ${T.border}` }}>
          {saveStatus==="saving"?"Updating dashboard…":saveStatus==="saved"?"✓ Dashboard updated":"Update failed"}
        </div>
      )}
      <div style={{ flex:1, overflowY:"auto", padding:"4px 14px 6px", display:"flex", flexDirection:"column", gap:8 }}>
        {chatMessages.map((msg,i) => (
          <div key={i} style={{ maxWidth:"90%", alignSelf:msg.role==="user"?"flex-end":"flex-start", animation:"ctFade 0.2s ease" }}>
            <div style={{ fontSize:9, letterSpacing:"0.8px", textTransform:"uppercase", color:T.textDim, marginBottom:3 }}>{msg.role==="user"?"Dale":"Coach T"}</div>
            {msg.imagePreview && <img src={msg.imagePreview} alt="upload" style={{ maxWidth:"100%", maxHeight:80, borderRadius:6, border:`1px solid ${T.border}`, objectFit:"contain", display:"block", marginBottom:4 }} />}
            <div style={{ padding:"8px 11px", fontSize:11, lineHeight:1.55, whiteSpace:"pre-wrap", background:msg.role==="user"?"rgba(55,138,221,0.12)":T.bgCard, border:msg.role==="user"?"1px solid rgba(55,138,221,0.18)":`1px solid ${T.border}`, color:msg.role==="user"?"#a8c8e8":"#c0cce0", borderRadius:msg.role==="user"?"9px 3px 9px 9px":"3px 9px 9px 9px" }}>
              {(typeof msg.content==="string" ? msg.content : msg.imageText||"").replace(/DASHBOARD_UPDATE:\s*```json[\s\S]*?```/g,"✓ Dashboard updated.").trim()}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf:"flex-start" }}>
            <div style={{ fontSize:9, color:T.textDim, marginBottom:3, letterSpacing:"0.8px", textTransform:"uppercase" }}>Coach T</div>
            <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"3px 9px 9px 9px", padding:"8px 12px" }}><LoadingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:"8px 12px", borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
        {pendingImages.length > 0 && (
          <div style={{ marginBottom:6, display:"flex", gap:5, flexWrap:"wrap" }}>
            {pendingImages.map((img, idx) => (
              <div key={idx} style={{ position:"relative" }}>
                <img src={img.preview} alt={img.name} style={{ height:38, width:52, objectFit:"cover", borderRadius:5, border:`1px solid rgba(232,185,106,0.3)`, display:"block" }} />
                <button onClick={() => setPendingImages(p => p.filter((_,i) => i !== idx))}
                  style={{ position:"absolute", top:-4, right:-4, width:14, height:14, borderRadius:"50%", background:T.danger, border:`2px solid ${T.bgDeep}`, color:"#fff", fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", gap:6, alignItems:"flex-end" }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display:"none" }} />
          <button onClick={() => fileRef.current?.click()} disabled={loading}
            style={{ background:pendingImages.length?T.amberGlow:"rgba(255,255,255,0.03)", border:`1px solid ${pendingImages.length?T.amberBorder:T.border}`, borderRadius:7, padding:"7px 9px", color:pendingImages.length?T.amber:T.textMuted, cursor:"pointer", fontSize:13, flexShrink:0, position:"relative" }}>{pendingImages.length > 0 && <span style={{ position:"absolute", top:-5, right:-5, width:14, height:14, borderRadius:"50%", background:T.amber, color:"#0a1020", fontSize:8, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{pendingImages.length}</span>}📎</button>
          <textarea ref={taRef} value={input}
            onChange={e => { setInput(e.target.value); if(taRef.current){taRef.current.style.height="auto";taRef.current.style.height=Math.min(taRef.current.scrollHeight,80)+"px";} }}
            onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
            onPaste={handlePaste}
            placeholder={promptStatus==="loading"?"Loading…":"Message Coach T…"}
            rows={1} disabled={loading||promptStatus==="loading"}
            style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, borderRadius:7, padding:"7px 10px", color:T.text, fontSize:11, resize:"none", outline:"none", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5, minHeight:32, maxHeight:80 }} />
          <button onClick={send} disabled={loading||(!input.trim()&&!pendingImages.length)||promptStatus==="loading"}
            style={{ width:28, height:28, borderRadius:7, background:(input.trim()||pendingImages.length)&&!loading?T.amberGlow:"rgba(255,255,255,0.03)", border:`1px solid ${(input.trim()||pendingImages.length)&&!loading?T.amberBorder:T.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:(input.trim()||pendingImages.length)&&!loading?"pointer":"not-allowed", flexShrink:0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 5L1 1V4.5L6 5L1 5.5V9Z" fill={T.amber}/></svg>
          </button>
        </div>
        {tokenStats.lastInput > 0 && (
          <div style={{ display:"flex", gap:8, marginTop:5, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Last</span>
            <span style={{ fontSize:10, color:T.swim }}>↑{tokenStats.lastInput}</span>
            <span style={{ fontSize:10, color:T.amber }}>↓{tokenStats.lastOutput}</span>
            {tokenStats.lastCacheRead>0 && <span style={{ fontSize:10, color:T.success }} title="Cached tokens">⚡{tokenStats.lastCacheRead.toLocaleString()}</span>}
            <span style={{ fontSize:9, color:T.textDim }}>·</span>
            <span style={{ fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Sess</span>
            <span style={{ fontSize:10, color:T.swim }}>↑{tokenStats.sessionInput.toLocaleString()}</span>
            {(tokenStats.sessionCached||0)>0 && <span style={{ fontSize:10, color:T.success }}>⚡{tokenStats.sessionCached.toLocaleString()}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard Section ─────────────────────────────────────────────────────────
function DashboardSection({ appState, setAppState, promptStatus, setNav, systemPrompt, messages, setMessages }) {
  const s = appState;

  // ── Fitness metric cell ──
  const FitnessMet = ({ label, value, unit, delta, deltaType }) => (
    <div style={{ padding:"16px 24px", borderRight:`1px solid ${T.border}` }}>
      <div style={{ fontSize:11, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:34, fontWeight:300, color:T.text, lineHeight:1, marginBottom:4 }}>
        {value}{unit && <span style={{ fontSize:16, color:T.textDim, marginLeft:4 }}>{unit}</span>}
      </div>
      {delta && <div style={{ fontSize:12, color:deltaType==="up"?T.success:deltaType==="dn"?T.danger:T.textMuted }}>{delta}</div>}
    </div>
  );

  // ── Week dot — 44px, shows checkmark for completed days ──
  const WeekDot = ({ type, label, isToday, isDone, date }) => {
    const colors = { swim:"rgba(90,171,245,", bike:"rgba(240,192,112,", run:"rgba(160,216,64,", ssm:"rgba(240,144,184,", rest:"rgba(255,255,255," };
    const fg = { swim:T.swim, bike:T.amber, run:T.run, ssm:T.ssm, rest:T.textDim };
    const c = colors[type] || colors.rest;
    const label2 = { swim:"SW", bike:"BK", run:"RN", ssm:"SM", rest:"—" }[type] || "—";
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
        <div style={{ position:"relative", width:44, height:44 }}>
          <div style={{
            width:44, height:44, borderRadius:10,
            background:`${c}${isToday?"0.22)":"0.15)"}`,
            color: fg[type]||T.textDim,
            border:`${isToday?"2px":"1px"} solid ${c}${isToday?"0.75)":"0.28)"})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:600, letterSpacing:0.5,
          }}>{type==="rest"?"—":label2}</div>
          {isDone && (
            <div style={{ position:"absolute", top:-4, right:-4, width:14, height:14, borderRadius:"50%", background:T.success, border:`2px solid ${T.bgDeep}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="7" height="6" viewBox="0 0 7 6" fill="none"><path d="M1 3L2.8 5L6 1" stroke="#0a1020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
        </div>
        <div style={{ fontSize:10, color:isToday?T.amber:T.textDim, fontWeight:isToday?500:400 }}>{label}</div>
        {date && <div style={{ fontSize:9, color:T.textDim, marginTop:-1 }}>{date}</div>}
      </div>
    );
  };

  // ── Pull all workout detail from any state field structure ──
  const resolveSession = (sess, dayEntry) => {
    const w = dayEntry?.workout || {};
    // Title — cascade
    const title = sess.label || sess.title || sess.name || w.title || "Session";
    // Find actual log entry for this day+domain
    const dayName3 = (dayEntry?.day || dayEntry?.dow || "").slice(0,3);
    const DOW3 = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
    const off3 = DOW3[dayName3] ?? 0;
    const base3 = new Date(); base3.setDate(base3.getDate()-base3.getDay());
    const dd3 = new Date(base3); dd3.setDate(base3.getDate()+off3);
    const dStr3 = dd3.toISOString().split("T")[0];
    const logEntry3 = (s?.workoutLog||[]).find(l =>
      l.date === dStr3 && (l.domain||"").toLowerCase() === (sess.type||"").toLowerCase()
    );
    // TSS: actual logged beats planned
    const tss = logEntry3?.tss ? Math.round(parseFloat(logEntry3.tss))
      : parseFloat(sess.tss || sess.plannedTSS || w.tss) || "—";
    // IF: actual logged beats planned
    const ifVal = logEntry3?.if_ ? parseFloat(logEntry3.if_).toFixed(2)
      : (sess.if || sess.if_ || w.if || w.if_) ? parseFloat(sess.if || sess.if_ || w.if || w.if_).toFixed(2)
      : null;
    // Pills — all available metrics
    const extraPills = [
      ifVal      ? `IF ${ifVal}`       : null,
      sess.sets  ? `${sess.sets} sets` : null,
      sess.reps  ? `${sess.reps} reps` : null,
    ].filter((v,i,a) => v && a.indexOf(v)===i); // dedupe
    const pills = [
      sess.duration || w.duration,
      sess.distance,
      sess.intensity || w.intensity,
      sess.pace,
      ...extraPills,
    ].filter(Boolean);
    // Workout details — structured lines (from DayPanel w.details array)
    const details = w.details?.length > 0 ? w.details : null;
    // Targets
    const targets = w.targets && w.targets !== "—" ? w.targets : null;
    // Coaching note — separate from objective, shown below details
    const coachingNote = w.coachingNote || null;
    // Objective / description — used when no structured details
    const objective = sess.objective || sess.description || sess.note || sess.notes
      || w.objective || w.description || null;
    return { title, tss, pills, details, targets, coachingNote, objective };
  };
  // Dashboard day popup state
  const [dashSelectedDay, setDashSelectedDay] = useState(null);
  const [dashLogTarget, setDashLogTarget] = useState(null);

  // Compute today/tomorrow from week
  const DOW_MAP = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const todayDow = DOW_MAP[new Date().getDay()];
  const week = s?.week || [];
  const todayIdx = week.findIndex(d => (d.dow||d.day||"").startsWith(todayDow));
  const todayEntry = todayIdx >= 0 ? week[todayIdx] : null;
  const tomorrowEntry = todayIdx >= 0 ? week[todayIdx+1] : null;
  const sessions = todayEntry?.sessions || [];
  const colMap = { swim:T.swim, bike:T.bike, run:T.run, ssm:T.ssm };
  const dcMap  = { swim:"sw", bike:"bk", run:"rn", ssm:"sm" };
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric", timeZone:"America/Chicago" });

  // Latest race for countdown
  const nextRace = (s?.races||[]).filter(r=>!r.done).sort((a,b)=>a.date>b.date?1:-1)[0];
  const daysToRace = nextRace ? Math.ceil((new Date(nextRace.date) - new Date()) / 86400000) : null;

  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>

      {promptStatus !== "ready" && (
        <div style={{ padding:"8px 20px", background:promptStatus==="loading"?"rgba(232,185,106,0.08)":"rgba(224,112,96,0.1)", borderBottom:`1px solid ${promptStatus==="loading"?T.amberBorder:T.danger}`, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          {promptStatus==="loading" && <LoadingDots />}
          <span style={{ fontSize:12, color:promptStatus==="loading"?T.amber:T.danger }}>
            {promptStatus==="loading"?"Loading coaching intelligence…":"Prompt load error — check GitHub token in Vercel."}
          </span>
        </div>
      )}

      {/* ── ROW 1: FITNESS METRICS ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", background:"rgba(255,255,255,0.03)", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
        <FitnessMet label="Fitness — CTL" value={s?.fitness?.ctl||"—"} delta={s?.fitness?.ctl?"Chronic Training Load":"Ask Coach T to calculate"} deltaType={s?.fitness?.ctl?"up":"neu"} />
        <FitnessMet label="Fatigue — ATL" value={s?.fitness?.atl||"—"} delta={s?.fitness?.atl?"Acute Training Load":"Updates after workouts"} deltaType="neu" />
        <FitnessMet label="Form — TSB"    value={s?.fitness?.tsb||"—"} delta={s?.fitness?.tsb?(parseFloat(s.fitness.tsb)>0?"Positive — race ready":"Building phase"):"TSB = CTL − ATL"} deltaType={s?.fitness?.tsb&&parseFloat(s.fitness.tsb)>0?"up":"neu"} />
        <FitnessMet label="Weekly TSS" value={s?.weekStats?.tss||"—"} unit={s?.weekStats?.tssTgt?`/${s.weekStats.tssTgt}`:""} delta={s?.weekStats?.tss&&s?.weekStats?.tssTgt?`${Math.round(s.weekStats.tss/s.weekStats.tssTgt*100)}% of target`:"Log workouts to track"} deltaType={s?.weekStats?.tss?"up":"neu"} />
        <FitnessMet label="Avg IF · This Week" value={(() => {
          // Primary: live from weekStats (calculated server-side from DB)
          if (s?.weekStats?.avgIF) return parseFloat(s.weekStats.avgIF).toFixed(2);
          // Fallback: calculate from this week's workoutLog entries
          const now2 = new Date(); const ws2 = new Date(now2); ws2.setDate(now2.getDate()-now2.getDay()); ws2.setHours(0,0,0,0);
          const wl=(s?.workoutLog||[]).filter(w=>new Date((w.date||"")+"T12:00:00")>=ws2 && w.if_);
          return wl.length>0?(wl.reduce((s2,w)=>s2+parseFloat(w.if_||0),0)/wl.length).toFixed(2):"—";
        })()} unit="" delta="Intensity Factor — target 0.75–0.85" deltaType="neu" />
      </div>

      {/* ── COMBINED: WEEK LAYOUT + SEASON PLAN (Option C unified timeline) ── */}
      <div style={{ background:T.bgDeep, borderBottom:`1px solid ${T.border}`, padding:"16px 24px 18px", flexShrink:0 }}>
        {/* Header row: labels + gate pill + ATP link */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ fontSize:9, color:T.textDim, letterSpacing:"1.5px", textTransform:"uppercase" }}>This week</div>
            <div style={{ width:1, height:12, background:"rgba(255,255,255,0.12)" }} />
            <div style={{ fontSize:9, color:T.textDim, letterSpacing:"1.5px", textTransform:"uppercase" }}>
              Season plan · 2026 — A Race: <span style={{ color:T.amber, letterSpacing:0, textTransform:"none" }}>{s?.block?.aRace||"Olympic Tri Q4"}</span>
            </div>
            <div style={{ fontSize:10, color:T.textDim }}>· Wk {s?.block?.currentWeek||"2"} of {s?.block?.totalWeeks||"8"}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 14px", background:"rgba(160,216,64,0.07)", border:"1px solid rgba(160,216,64,0.18)", borderRadius:20 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:T.success }} />
              <div style={{ fontSize:12, color:"#80b030" }}>All gates clear · {s?.athlete?.lastSleep||"7.4"} hr sleep</div>
            </div>
            <div style={{ fontSize:11, color:T.swim, cursor:"pointer" }} onClick={() => setNav("training","atp")}>Full ATP →</div>
          </div>
        </div>
        {/* Unified timeline: week dots | vertical divider | ATP phases */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 1px 1fr", gap:20, alignItems:"start" }}>
          {/* Week dots */}
          <div style={{ display:"flex", gap:8 }}>
            {(week.length > 0 ? week : [
              {day:"Mon",sessions:[{type:"swim"}],completed:false},
              {day:"Tue",sessions:[{type:"bike"}],completed:false},
              {day:"Wed",sessions:[{type:"swim"}],completed:false},
              {day:"Thu",sessions:[],completed:false},
              {day:"Fri",sessions:[{type:"run"}],completed:false},
              {day:"Sat",sessions:[{type:"bike"}],completed:false},
              {day:"Sun",sessions:[{type:"ssm"}],completed:false},
            ]).map((d,i) => {
              const type = d.sessions?.[0]?.type || "rest";
              const label = (d.dow||d.day||"").slice(0,3);
              const isToday = (d.dow||d.day||"").startsWith(todayDow);
              const isDone = d.completed === true;
              const isSelected = dashSelectedDay?.day === (d.dow||d.day) || dashSelectedDay?.dow === (d.dow||d.day);
              // Compute mm/dd for this day
              const dayOrder = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
              const dayOffset = dayOrder.indexOf(label);
              const dotDate = (() => {
                const base = new Date();
                base.setDate(base.getDate() - base.getDay() + 1); // Monday of current week
                const dd = new Date(base);
                dd.setDate(base.getDate() + (dayOffset >= 0 ? dayOffset : 0));
                return `${dd.getMonth()+1}/${dd.getDate()}`;
              })();
              return (
                <div key={i} onClick={() => setDashSelectedDay(isSelected ? null : d)}
                  style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer",
                    borderRadius:12, outline: isSelected ? `2px solid ${T.amber}` : "none", outlineOffset:3, transition:"outline 0.15s" }}>
                  <WeekDot type={type} label={label} isToday={isToday} isDone={isDone} date={dotDate} />
                </div>
              );
            })}
          </div>
          {/* Vertical divider */}
          <div style={{ background:"rgba(255,255,255,0.10)", height:62, marginTop:1 }} />
          {/* ATP phases */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, paddingTop:1 }}>
            <div style={{ display:"flex", gap:3 }}>
              {[
                { label:"Aerobic Base", sub:"Jan–Mar", flex:1.4, col:"rgba(90,171,245,0.12)",  bc:"rgba(90,171,245,0.25)",  tc:"#7aaad8", now:true },
                { label:"Build 1",      sub:"Apr–Jun", flex:2.0, col:"rgba(240,192,112,0.07)", bc:"rgba(240,192,112,0.15)", tc:"#c09050", now:false },
                { label:"Build 2",      sub:"Jul–Sep", flex:1.5, col:"rgba(240,144,184,0.07)", bc:"rgba(240,144,184,0.14)", tc:"#d080a0", now:false },
                { label:"Race Peak",    sub:"Oct–Nov", flex:1.1, col:"rgba(160,216,64,0.07)",  bc:"rgba(160,216,64,0.16)",  tc:"#80b840", now:false },
                { label:"Trans",        sub:"Dec",     flex:0.7, col:"rgba(255,255,255,0.02)", bc:T.border,                 tc:T.textDim,  now:false },
              ].reduce((acc, ph, i, arr) => {
                acc.push(
                  <div key={ph.label} style={{ flex:ph.flex, position:"relative" }}>
                    <div style={{ height:44, background:ph.col, border:`1px solid ${ph.bc}`, borderRadius:8,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, fontWeight:500, color:ph.tc }}>{ph.label}</div>
                    {ph.now && i < arr.length-1 && (
                      <div style={{ position:"absolute", right:-2, top:-2, bottom:-2, width:2, background:T.amber, borderRadius:1, zIndex:2 }}>
                        <span style={{ position:"absolute", bottom:"calc(100% + 3px)", left:"50%", transform:"translateX(-50%)", fontSize:8, color:T.amber, whiteSpace:"nowrap", letterSpacing:"0.5px" }}>NOW</span>
                      </div>
                    )}
                  </div>
                );
                return acc;
              }, [])}
            </div>
            <div style={{ display:"flex", gap:3 }}>
              {[{sub:"Jan–Mar",flex:1.4},{sub:"Apr–Jun",flex:2.0},{sub:"Jul–Sep",flex:1.5},{sub:"Oct–Nov",flex:1.1},{sub:"Dec",flex:0.7}].map(ph => (
                <div key={ph.sub} style={{ flex:ph.flex, fontSize:10, color:T.textDim, textAlign:"center" }}>{ph.sub}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"18px 24px", display:"flex", flexDirection:"column", gap:16 }}>

        {/* ── ROW 3: TODAY'S SESSIONS ── */}
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ fontSize:11, letterSpacing:"1.2px", textTransform:"uppercase", color:T.textDim }}>Today · {todayLabel}</div>
            <div style={{ fontSize:11, color:T.swim, cursor:"pointer" }} onClick={() => setNav("training","week")}>View full week →</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.max(Math.min(sessions.length+(tomorrowEntry?1:0),3),1)},1fr)`, gap:12 }}>
            {sessions.length > 0 ? sessions.slice(0,2).map((sess,i) => {
              const { title, tss, pills, details, targets, coachingNote, objective } = resolveSession(sess, todayEntry);
              return (
                <div key={i} onClick={() => setDashSelectedDay(todayEntry)} style={{ cursor:"pointer" }}>
                  <SessionCard
                    accent={colMap[sess.type]||T.amber}
                    domain={(sess.type||"").toUpperCase()}
                    domainClass={dcMap[sess.type]||"sw"}
                    title={title}
                    tss={tss}
                    pills={pills}
                    details={details}
                    targets={targets}
                    coachingNote={coachingNote}
                    objective={objective}
                  />
                </div>
              );
            }) : (
              <div style={{ background:"rgba(255,255,255,0.02)", border:`1px dashed ${T.border}`, borderRadius:11, padding:20 }}>
                <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"1px", color:T.textDim, marginBottom:6 }}>Today</div>
                <div style={{ fontSize:16, color:T.textMuted }}>{todayEntry?"Rest Day":"No schedule loaded"}</div>
                <div style={{ fontSize:13, color:T.textDim, marginTop:6 }}>{todayEntry?.workout?.coachingNote||"Check Training → This Week"}</div>
              </div>
            )}
            {/* Tomorrow card — full details */}
            {tomorrowEntry && (() => {
              const tomSess = tomorrowEntry.sessions?.[0];
              const tomResolved = tomSess ? resolveSession(tomSess, tomorrowEntry) : null;
              const tomColMap = { swim:T.swim, bike:T.bike, run:T.run, ssm:T.ssm };
              const tomAccent = tomColMap[tomSess?.type] || "rgba(255,255,255,0.08)";
              return (
                <div onClick={() => setDashSelectedDay(tomorrowEntry)}
                  style={{ background:"rgba(255,255,255,0.015)", border:`1px dashed ${T.border}`, borderRadius:11, padding:"16px 18px 16px 20px", position:"relative", overflow:"hidden", cursor:"pointer" }}>
                  <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:tomAccent, borderRadius:"11px 0 0 11px", opacity:0.5 }} />
                  <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"1.2px", color:T.textDim, marginBottom:10 }}>Tomorrow · {tomorrowEntry.day||tomorrowEntry.dow}</div>
                  {tomorrowEntry.sessions?.length > 0 && tomResolved ? <>
                    {/* Domain + TSS header */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                      <div style={{ display:"flex", gap:6 }}>
                        {tomorrowEntry.sessions.map((s2,si) => (
                          <div key={si} style={{ fontSize:10, fontWeight:600, letterSpacing:"1.5px", textTransform:"uppercase", color:tomColMap[s2.type]||T.textMuted }}>{(s2.type||"").toUpperCase()}</div>
                        ))}
                      </div>
                      {tomResolved.tss !== "—" && (
                        <div style={{ display:"flex", alignItems:"baseline", gap:3 }}>
                          <div style={{ fontSize:22, fontWeight:300, color:T.textDim, lineHeight:1 }}>{tomResolved.tss}</div>
                          <div style={{ fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.8px" }}>TSS</div>
                        </div>
                      )}
                    </div>
                    {/* Title */}
                    <div style={{ fontSize:16, fontWeight:500, color:T.text, marginBottom:8, lineHeight:1.3 }}>{tomResolved.title}</div>
                    {/* Pills */}
                    {tomResolved.pills.length > 0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                        {tomResolved.pills.map((p,pi) => (
                          <div key={pi} style={{ fontSize:11, padding:"3px 10px", borderRadius:12, background:"rgba(255,255,255,0.04)", color:T.textMuted, border:`1px solid ${T.border}` }}>{p}</div>
                        ))}
                      </div>
                    )}
                    {/* Workout details */}
                    {tomResolved.details ? (
                      <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:10, marginBottom: tomResolved.coachingNote ? 10 : 0 }}>
                        {tomResolved.details.map((line,li) =>
                          !line ? <div key={li} style={{ height:6 }} /> :
                          line.match(/^[A-Z].*—/) ? <div key={li} style={{ fontSize:11, color:T.amber, fontWeight:500, marginTop:li>0?6:0, marginBottom:3 }}>{line}</div> :
                          <div key={li} style={{ display:"flex", gap:8, padding:"3px 0" }}>
                            <span style={{ color:T.textDim, fontSize:11, flexShrink:0 }}>›</span>
                            <span style={{ color:T.textMuted, fontSize:12, lineHeight:1.5 }}>{line}</span>
                          </div>
                        )}
                        {tomResolved.targets && (
                          <div style={{ marginTop:8, fontSize:12, color:T.textMuted }}>
                            <span style={{ color:T.amber }}>→ </span>{tomResolved.targets}
                          </div>
                        )}
                      </div>
                    ) : tomResolved.objective ? (
                      <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:10, fontSize:12, color:T.textMuted, lineHeight:1.6, marginBottom: tomResolved.coachingNote ? 10 : 0 }}>{tomResolved.objective}</div>
                    ) : null}
                    {/* Coach note */}
                    {tomResolved.coachingNote && (
                      <div style={{ background:"rgba(232,185,106,0.06)", border:`1px solid rgba(232,185,106,0.18)`, borderRadius:8, padding:"10px 12px" }}>
                        <div style={{ fontSize:9, color:T.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>Coach T</div>
                        <div style={{ fontSize:12, color:T.textMuted, lineHeight:1.6, fontStyle:"italic" }}>"{tomResolved.coachingNote}"</div>
                      </div>
                    )}
                  </> : (
                    <div style={{ fontSize:16, color:T.textMuted }}>Rest Day</div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── ROW 5: TRENDS ── */}
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ fontSize:11, letterSpacing:"1.2px", textTransform:"uppercase", color:T.textDim }}>Trends · last 8 weeks</div>
            <div style={{ fontSize:11, color:T.swim, cursor:"pointer" }} onClick={() => setNav("training","trends")}>Expand →</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            <TrendCard title="Swim · Best Continuous" value={(() => { const e=(appState?.workoutLog||[]).filter(x=>(x.domain||"").toLowerCase()==="swim").at(-1); return e?.distance?String(e.distance).replace(/[^0-9.m]/g,""):"—"; })()} unit="" sub="from workout log · goal 800m">
              <svg width="100%" height="58" viewBox="0 0 180 58"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5aabf5" stopOpacity="0.18"/><stop offset="100%" stopColor="#5aabf5" stopOpacity="0"/></linearGradient></defs><polygon points="0,50 26,48 52,44 78,40 104,35 130,30 156,25 180,20 180,58 0,58" fill="url(#sg)"/><polyline points="0,50 26,48 52,44 78,40 104,35 130,30 156,25 180,20" fill="none" stroke="#5aabf5" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="180" cy="20" r="3" fill="#5aabf5"/></svg>
            </TrendCard>
            <TrendCard title="Bike · FTP" value={s?.athlete?.ftp||"194"} unit="w" sub="Provisional · revalidate wk 4">
              <svg width="100%" height="58" viewBox="0 0 180 58"><defs><linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f0c070" stopOpacity="0.15"/><stop offset="100%" stopColor="#f0c070" stopOpacity="0"/></linearGradient></defs><polygon points="0,46 26,45 52,43 78,42 104,40 130,38 156,36 180,34 180,58 0,58" fill="url(#bg2)"/><polyline points="0,46 26,45 52,43 78,42 104,40 130,38 156,36 180,34" fill="none" stroke="#f0c070" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="180" cy="34" r="3" fill="#f0c070"/></svg>
            </TrendCard>
            <TrendCard title="Weekly Duration" value={s?.weekStats?.volume||"—"} unit="hr" sub={`Target ${s?.athlete?.weeklyCap||8}hr${s?.weekStats?.volume?(" · "+Math.round(parseFloat(s.weekStats.volume)/(s?.athlete?.weeklyCap||8)*100)+"%"):""}`}>
              <svg width="100%" height="58" viewBox="0 0 180 58">{[44,38,41,33,30,36,43,26].map((y,i) => `<rect x="${i*23}" y="${y}" width="18" height="${58-y}" rx="2" fill="${i===7?"rgba(90,171,245,0.45)":"rgba(90,171,245,0.18)"}" stroke="${i===7?"#5aabf5":"none"}" strokeWidth="1"/>`).join("")}<line x1="0" y1="18" x2="180" y2="18" stroke="rgba(240,192,112,0.2)" strokeWidth="1" strokeDasharray="3,3"/></svg>
            </TrendCard>
            <TrendCard title="Weekly TSS" value={s?.weekStats?.tss||"—"} unit="" sub={`Target ${s?.weekStats?.tssTgt||380} · ${s?.weekStats?.tss?Math.round(s.weekStats.tss/(s.weekStats.tssTgt||380)*100)+"%":"building"}`}>
              <svg width="100%" height="58" viewBox="0 0 180 58">{[46,38,42,34,31,37,43,27].map((y,i) => `<rect x="${i*23}" y="${y}" width="18" height="${58-y}" rx="2" fill="${i===7?"rgba(160,216,64,0.4)":"rgba(160,216,64,0.18)"}" stroke="${i===7?"#a0d840":"none"}" strokeWidth="1"/>`).join("")}</svg>
            </TrendCard>
          </div>
        </div>

        {/* ── ROW 6: BOTTOM — gates + season goals + next race ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          {/* Gates — all 6 from constitutional §5 */}
          {(() => {
            const g = s?.gates || {};
            const sc = { clear:T.success, flag:T.amber, block:T.danger };

            // Gate rows — HRV and Sleep show live values from daily log
            const gateRows = [
              { key:"sleep",        label:"Sleep",             sub: s?.athlete?.lastSleep  ? `${s.athlete.lastSleep} hr`  : null },
              { key:"hrv",          label:"HRV",               sub: s?.athlete?.latestHRV  ? `${s.athlete.latestHRV} ms`  : null, computed:true },
              { key:"illness",      label:"Illness",           sub: null },
              { key:"injury",       label:"Injury",            sub: null },
              { key:"nutrition",    label:"Nutrition",         sub: null },
              { key:"availability", label:"Life Availability", sub: null },
              { key:"accumulated",  label:"Accumulated Risk",  sub: null },
            ];

            // HRV gate: compute from daily log vs athlete baseline
            const hrvVal   = parseFloat(s?.athlete?.latestHRV || 0);
            const hrvGate  = parseFloat(s?.athlete?.hrvGate   || 44);
            const hrvStatus = !hrvVal ? "clear"
              : hrvVal < hrvGate * 0.85 ? "block"
              : hrvVal < hrvGate        ? "flag"
              : "clear";

            // Resolve status for each gate
            const getStatus = (key) => {
              if (key === "hrv") return hrvStatus;
              return g[key]?.status || "clear";
            };

            // Overall score — weighted severity
            const severity = { clear:0, flag:1, block:2 };
            const scores   = gateRows.map(r => severity[getStatus(r.key)] || 0);
            const blocked  = scores.filter(s => s === 2).length;
            const flagged  = scores.filter(s => s === 1).length;
            const totalScore = blocked * 2 + flagged;
            const overallStatus = blocked > 0 ? "block" : flagged > 0 ? "flag" : "clear";
            const overallLabel  = blocked > 0 ? "Training Risk" : flagged > 0 ? "Monitor" : "All Clear";
            const overallColor  = sc[overallStatus];

            // Score out of 10 — 10 = perfect, 0 = full block
            const maxScore = gateRows.length * 2;
            const readiness = Math.round(((maxScore - totalScore) / maxScore) * 10);

            const cardBorder = overallStatus === "clear"
              ? "rgba(160,216,64,0.2)"
              : overallStatus === "flag"
              ? "rgba(240,192,112,0.25)"
              : "rgba(240,120,104,0.3)";

            return (
              <div style={{ background:T.bgCard, border:`1px solid ${cardBorder}`, borderRadius:11, padding:"14px 18px" }}>

                {/* Header row */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"1.2px" }}>Recovery gates</div>
                  {!g?.trainingCleared && (
                    <div style={{ fontSize:10, color:T.danger, background:"rgba(240,120,104,0.1)", border:"1px solid rgba(240,120,104,0.3)", borderRadius:10, padding:"2px 8px" }}>Training blocked</div>
                  )}
                  {g?.trainingCleared && !g?.intensityCleared && (
                    <div style={{ fontSize:10, color:T.amber, background:T.amberGlow, border:`1px solid ${T.amberBorder}`, borderRadius:10, padding:"2px 8px" }}>Intensity restricted</div>
                  )}
                </div>

                {/* Overall readiness score */}
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:`rgba(255,255,255,0.03)`, border:`1px solid rgba(255,255,255,0.07)`, borderRadius:9, marginBottom:12 }}>
                  {/* Score ring */}
                  <div style={{ position:"relative", width:44, height:44, flexShrink:0 }}>
                    <svg width="44" height="44" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
                      <circle cx="22" cy="22" r="18" fill="none" stroke={overallColor} strokeWidth="4"
                        strokeDasharray={`${(readiness/10)*113} 113`}
                        strokeLinecap="round"
                        transform="rotate(-90 22 22)"
                        style={{ transition:"stroke-dasharray 0.6s ease" }}/>
                    </svg>
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, color:overallColor }}>{readiness}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:500, color:overallColor, marginBottom:3 }}>{overallLabel}</div>
                    <div style={{ fontSize:11, color:T.textDim }}>
                      {blocked > 0 ? `${blocked} gate${blocked>1?"s":""} blocked · ${flagged} flagged`
                       : flagged > 0 ? `${flagged} gate${flagged>1?"s":""} flagged · ${gateRows.length-flagged} clear`
                       : `All ${gateRows.length} gates clear`}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    {gateRows.map(r => {
                      const st = getStatus(r.key);
                      return <div key={r.key} style={{ width:8, height:8, borderRadius:2, background:sc[st]||T.success, opacity:st==="clear"?0.5:1 }} title={r.label} />;
                    })}
                  </div>
                </div>

                {/* Individual gates */}
                {gateRows.map(({ key, label, sub }) => {
                  const st  = getStatus(key);
                  const col = sc[st] || T.success;
                  const note = key === "hrv" ? null : g[key]?.note;
                  return (
                    <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
                      <div style={{ fontSize:12, color:T.textMuted }}>{label}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        {sub && <div style={{ fontSize:11, color:T.textDim }}>{sub}</div>}
                        <div style={{ width:6, height:6, borderRadius:"50%", background:col, flexShrink:0 }}/>
                        <div style={{ fontSize:12, fontWeight:500, color:col }}>
                          {st}
                          {note && st !== "clear" && <span style={{ color:T.textDim, fontWeight:400 }}> · {note}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {/* Season goals */}
          <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:11, padding:"14px 18px" }}>
            <div style={{ fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:12 }}>Season goals</div>
            {[
              ["Swim continuous", "420 m", "800 m", 28, T.swim],
              ["Long run",        "68 min", "90 min", 75, T.run],
              ["Weekly TSS",      s?.weekStats?.tss ? `${s.weekStats.tss}` : "—", `${s?.weekStats?.tssTgt||380}`, s?.weekStats?.tss?Math.round(s.weekStats.tss/(s.weekStats.tssTgt||380)*100):0, T.amber],
            ].map(([label,val,target,pct,color]) => (
              <div key={label} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
                  <div style={{ fontSize:13, color:T.textMuted }}>{label}</div>
                  <div style={{ fontSize:13, color:T.text, fontWeight:500 }}>{val} <span style={{ fontSize:10, color:T.textDim }}>/ {target}</span></div>
                </div>
                <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
          {/* Next race countdown */}
          <div style={{ background:T.bgCard, border:`1px solid ${nextRace?"rgba(240,192,112,0.2)":T.border}`, borderRadius:11, padding:"14px 18px" }}>
            <div style={{ fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:12 }}>Next race</div>
            {nextRace ? (
              <>
                <div style={{ fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Priority {nextRace.priority}</div>
                <div style={{ fontSize:17, color:T.text, marginBottom:4, lineHeight:1.3 }}>{nextRace.name}</div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:14 }}>{new Date(nextRace.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · {nextRace.swim} / {nextRace.bike} / {nextRace.run}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                  <div style={{ fontSize:12, color:T.textDim }}>Days out</div>
                  <div style={{ fontSize:34, fontWeight:300, color:daysToRace<30?T.danger:T.amber, lineHeight:1 }}>{daysToRace}</div>
                </div>
              </>
            ) : (
              <div style={{ fontSize:13, color:T.textDim, paddingTop:8 }}>No races scheduled.<br/>Add one in Races → Manage.</div>
            )}
          </div>
        </div>

        {/* ── REVIEW BAR ── */}
        {(() => {
          const today = new Date();
          const dayName = today.toLocaleDateString("en-US",{weekday:"long"});
          const isReviewDay = dayName === "Sunday" || dayName === "Monday";
          const sessionsThisWeek = (s?.week||[]).filter(d => d.sessions?.length > 0).length;
          const completedThisWeek = (s?.week||[]).filter(d => d.completed === true).length;
          const pendingLogs = (s?.workoutLog||[]).filter(w => {
            const ws = new Date(); ws.setDate(today.getDate()-today.getDay()); ws.setHours(0,0,0,0);
            return new Date(w.date+"T12:00:00") >= ws;
          }).length;
          const gateFlags = Object.values(s?.gates||{}).filter(v => v?.status && v.status !== "clear").length;
          const reviewReady = isReviewDay || gateFlags > 0;
          const borderCol = reviewReady ? "rgba(240,192,112,0.35)" : "rgba(240,192,112,0.14)";
          const bgCol     = reviewReady ? "rgba(240,192,112,0.08)" : "rgba(240,192,112,0.03)";
          const statusText = reviewReady
            ? `${dayName} — review ready · Block ${s?.block?.currentWeek||"?"} of ${s?.block?.totalWeeks||"?"} complete`
            : `Next review: Sunday · Week ${s?.block?.currentWeek||"?"} in progress`;
          const subText = gateFlags > 0
            ? `${gateFlags} gate flag${gateFlags>1?"s":""} · ${completedThisWeek}/${sessionsThisWeek} sessions done`
            : `${completedThisWeek}/${sessionsThisWeek} sessions · ${pendingLogs} logged this week`;
          return (
            <div style={{ background:bgCol, border:`1px solid ${borderCol}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:13, color:"#c09050", fontWeight:500, marginBottom:3 }}>{statusText}</div>
                <div style={{ fontSize:12, color:T.textMuted }}>{subText}</div>
              </div>
              <div style={{ fontSize:12, color:T.amber, background:T.amberGlow, border:`1px solid ${T.amberBorder}`, borderRadius:16, padding:"8px 20px", cursor:"pointer", whiteSpace:"nowrap", opacity: reviewReady ? 1 : 0.7 }} onClick={() => setNav("review")}>
                {reviewReady ? "Enter Review →" : "Review →"}
              </div>
            </div>
          );
        })()}

      {/* ── Day panel popup — triggered by clicking week dots ── */}
      {dashSelectedDay && (
        <DayPanel
          day={dashSelectedDay}
          onClose={() => setDashSelectedDay(null)}
          onToggleComplete={(dayName, val) => {
            setDashSelectedDay(prev => prev?.day===dayName ? { ...prev, completed:val } : prev);
          }}
          appState={appState}
          setAppState={setAppState}
          onLog={() => {
            setDashLogTarget({
              domain: dashSelectedDay.sessions?.[0]?.type || "workout",
              date: dashSelectedDay.day,
              workout: dashSelectedDay,
            });
          }}
        />
      )}
      {/* Workout log modal triggered from dashboard day panel */}
      {dashLogTarget && (
        <WorkoutLogModal
          workout={dashLogTarget}
          systemPrompt={systemPrompt}
          appState={appState}
          setAppState={setAppState}
          messages={messages}
          setMessages={setMessages}
          onClose={() => setDashLogTarget(null)}
        />
      )}
      </div>
    </div>
  );
}

function SessionCard({ accent, domain, domainClass, title, tss, pills, details, targets, coachingNote, objective, onLog }) {
  const domainColors = { sw:T.swim, bk:T.bike, rn:T.run, sm:T.ssm };
  const dc = domainColors[domainClass] || T.amber;
  const hasContent = details?.length > 0 || targets || objective || coachingNote;
  return (
    <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:11, padding:"16px 18px 16px 20px", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column" }}>
      {/* Left accent stripe */}
      <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:accent, borderRadius:"11px 0 0 11px" }} />

      {/* Domain + TSS */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
        <div style={{ fontSize:10, letterSpacing:"1.5px", textTransform:"uppercase", fontWeight:600, color:dc }}>{domain}</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
          <div style={{ fontSize:28, fontWeight:300, color:tss==="—"?T.textDim:T.text, lineHeight:1 }}>{tss}</div>
          <div style={{ fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.8px" }}>TSS</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize:18, fontWeight:500, color:T.text, lineHeight:1.25, marginBottom:10 }}>{title}</div>

      {/* Pills */}
      {pills?.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:12 }}>
          {pills.filter(Boolean).map((p,i) => (
            <div key={i} style={{ fontSize:11, padding:"4px 11px", borderRadius:12, background:"rgba(255,255,255,0.05)", color:T.textMuted, border:`1px solid ${T.border}` }}>{p}</div>
          ))}
        </div>
      )}

      {/* ── Workout details (structured lines) — shown first ── */}
      {details?.length > 0 && (
        <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:10, marginBottom:12 }}>
          {details.map((line,i) =>
            !line ? <div key={i} style={{ height:6 }} /> :
            line.match(/^[A-Z].*—/) ? (
              <div key={i} style={{ fontSize:11, color:T.amber, fontWeight:500, marginTop:i>0?8:0, marginBottom:3 }}>{line}</div>
            ) : (
              <div key={i} style={{ display:"flex", gap:8, padding:"3px 0", borderBottom:`1px solid rgba(255,255,255,0.03)` }}>
                <span style={{ color:T.textDim, fontSize:11, flexShrink:0, marginTop:1 }}>›</span>
                <span style={{ color:T.textMuted, fontSize:13, lineHeight:1.55 }}>{line}</span>
              </div>
            )
          )}
          {targets && (
            <div style={{ marginTop:10, fontSize:13, color:T.textMuted }}>
              <span style={{ color:T.amber, fontWeight:500 }}>Targets: </span>{targets}
            </div>
          )}
        </div>
      )}

      {/* Objective text — shown when no structured details */}
      {!details?.length && objective && (
        <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:10, marginBottom:12, fontSize:13, color:T.textMuted, lineHeight:1.6 }}>
          {objective}
          {targets && <div style={{ marginTop:8 }}><span style={{ color:T.amber, fontWeight:500 }}>Targets: </span>{targets}</div>}
        </div>
      )}

      {/* No content fallback */}
      {!hasContent && (
        <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:10, marginBottom:12, fontSize:12, color:T.textDim, fontStyle:"italic" }}>
          No details yet — ask Coach T to set up this session
        </div>
      )}

      {/* ── Coach T note — always shown last ── */}
      {coachingNote && (
        <div style={{ background:"rgba(232,185,106,0.06)", border:`1px solid rgba(232,185,106,0.18)`, borderRadius:9, padding:"11px 14px", marginTop:"auto" }}>
          <div style={{ fontSize:9, color:T.amber, textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:6 }}>Coach T</div>
          <div style={{ fontSize:13, color:T.textMuted, lineHeight:1.65, fontStyle:"italic" }}>"{coachingNote}"</div>
        </div>
      )}

      {/* Log button */}
      {onLog && (
        <button onClick={onLog}
          style={{ marginTop:12, width:"100%", padding:"8px 0", fontSize:12, borderRadius:8, border:`1px solid ${T.border}`, background:"rgba(255,255,255,0.03)", color:T.textMuted, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=T.amberBorder; e.currentTarget.style.color=T.amber; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textMuted; }}>
          + Log workout
        </button>
      )}
    </div>
  );
}

function TrendCard({ title, value, unit, sub, children }) {
  return (
    <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:11, padding:"15px 16px" }}>
      <div style={{ fontSize:11, letterSpacing:"0.8px", textTransform:"uppercase", color:T.textMuted, marginBottom:3 }}>{title}</div>
      <div style={{ fontSize:22, fontWeight:300, color:T.text, marginBottom:2 }}>{value}<span style={{ fontSize:12, color:T.textMuted, marginLeft:2 }}>{unit}</span></div>
      <div style={{ fontSize:11, color:T.textMuted, marginBottom:10 }}>{sub}</div>
      {children}
    </div>
  );
}

// ── Workout Log Modal ─────────────────────────────────────────────────────────
function WorkoutLogModal({ workout, onClose, systemPrompt, appState, setAppState, messages, setMessages }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    duration: "", distance: "", avgHR: "", maxHR: "", tss: "",
    if_: "", rpe: "5", notes: "", completed: true,
  });

  // Auto-calculate TSS and IF from HR/duration
  const calcTssIF = (f, aState) => {
    const lthr  = parseFloat(aState?.athlete?.lthr || 155);
    const avgHR = parseFloat(f.avgHR);
    const durStr = f.duration || "";
    const parseMins = (s) => {
      if (!s) return 0;
      if (String(s).includes(":")) { const p=String(s).split(":").map(Number); return p.length===3?p[0]*60+p[1]:p[0]*60+p[1]; }
      const n = parseFloat(s); if (isNaN(n)) return 0;
      return String(s).toLowerCase().includes("h") ? n*60 : n;
    };
    const mins = parseMins(durStr);
    if (!avgHR || !mins || !lthr) return { tss: null, if_: null };
    const hrFrac = avgHR / lthr;
    const ifVal  = Math.round(hrFrac * 100) / 100; // HR-based IF proxy
    const tss    = Math.round((mins / 60) * (ifVal * ifVal) * 100);
    return { tss: String(tss), if_: String(ifVal) };
  };
  const [images, setImages] = useState([]);
  const [mode, setMode] = useState("upload");
  const [dragOver, setDragOver] = useState(false);
  const [sending, setSending] = useState(false);
  const [coachReply, setCoachReply] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const fileRef = useRef(null);

  // Recalculate weekStats from workoutLog entries for the current week
  const recalcWeekStats = (log, existing) => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0,0,0,0);

    const thisWeek = (log || []).filter(e => {
      const d = new Date(e.loggedAt || e.date);
      return d >= weekStart;
    });

    // Parse duration string like "55 min", "1:10:00", "70" → minutes
    const parseMins = (s) => {
      if (!s) return 0;
      const str = String(s);
      if (str.includes(":")) {
        const parts = str.split(":").map(Number);
        return parts.length === 3 ? parts[0]*60+parts[1] : parts[0]*60+parts[1];
      }
      const n = parseFloat(str);
      if (isNaN(n)) return 0;
      return str.toLowerCase().includes("hr") || str.toLowerCase().includes("h") ? n*60 : n;
    };

    const totalMins = thisWeek.reduce((s, e) => s + parseMins(e.duration), 0);
    const totalTSS  = thisWeek.reduce((s, e) => s + (parseFloat(e.tss)||0), 0);
    const done      = thisWeek.length;
    const total     = existing?.weekStats?.total || done;

    return {
      volume:    totalMins > 0 ? (totalMins/60).toFixed(1) : (existing?.weekStats?.volume || "—"),
      tss:       totalTSS  > 0 ? Math.round(totalTSS)     : (existing?.weekStats?.tss    || "—"),
      done,
      total,
      loadDelta: existing?.weekStats?.loadDelta || "—",
      tssTgt:    existing?.weekStats?.tssTgt    || 380,
    };
  };

  const handleSave = async () => {
    setSending(true);
    setSaveStatus(null);

    // Auto-fill TSS/IF if not manually set
    const autoCalc = (!form.tss || !form.if_) ? calcTssIF(form, appState) : { tss: form.tss, if_: form.if_ };
    const finalForm = { ...form, tss: form.tss || autoCalc.tss || "", if_: form.if_ || autoCalc.if_ || "" };

    // Build a text summary of manual fields
    const manualSummary = [
      form.date     && `Date: ${form.date}`,
      form.duration && `Duration: ${form.duration}`,
      form.distance && `Distance: ${form.distance}`,
      form.avgHR    && `Avg HR: ${form.avgHR} bpm`,
      form.maxHR    && `Max HR: ${form.maxHR} bpm`,
      form.tss      && `TSS: ${form.tss}`,
      form.rpe      && `RPE: ${form.rpe}/10`,
      form.notes    && `Notes: ${form.notes}`,
    ].filter(Boolean).join("\n");

    // Build message — images first, then analysis prompt
    const contextNote = `Workout logged for ${workout?.domain || "training"} session${workout?.date ? ` on ${workout.date}` : ""}.`;
    const userText = images.length > 0
      ? `${contextNote} I am uploading ${images.length} screenshot${images.length>1?"s":""} from my Garmin/device. Please: (1) extract ALL metrics visible — duration, distance, avg HR, max HR, TSS, pace, power, calories, elevation; (2) assess vs planned targets; (3) include a DASHBOARD_UPDATE block with: workoutLog entry (_new:true with all extracted metrics), weekStats (updated tss, volume, done count), and fitness estimates if CTL/ATL/TSB can be inferred.${manualSummary ? "\n\nAdditional manual notes:\n"+manualSummary : ""}`
      : `${contextNote} Here is my manually entered workout data:\n${manualSummary}\n\nPlease: (1) acknowledge and assess vs planned targets, (2) include a DASHBOARD_UPDATE block that updates: workoutLog (add this entry with _new:true), weekStats (recalculate tss, volume, done from all this week's workouts), and if you can estimate CTL/ATL/TSB trends, update fitness too.`;

    const userContent = images.length > 0
      ? [
          ...images.map(img => ({ type:"image", source:{ type:"base64", media_type:img.mediaType, data:img.base64 } })),
          { type:"text", text: userText },
        ]
      : userText;

    const userMsg = { role:"user", content:userContent, imagePreview: images[0]?.preview, imageText: userText };
    const nextMessages = [...(messages||[]), userMsg];

    // Save workout record + recalculate weekStats immediately
    const workoutRecord = { ...finalForm, domain: workout?.domain, images: images.length, loggedAt: new Date().toISOString() };
    // Deduplicate: remove any existing entry for same date+domain, then add new
    const existingLogs = (appState?.workoutLog || []).filter(e =>
      !(e.date === workoutRecord.date && e.domain === workoutRecord.domain)
    );
    const updatedLog = [...existingLogs, workoutRecord];
    const newWeekStats  = recalcWeekStats(updatedLog, appState);
    const newState = {
      ...appState,
      workoutLog: updatedLog,
      weekStats:  newWeekStats,
      lastUpdated: new Date().toISOString().split("T")[0],
    };

    try {
      await pushState(newState);
      if (setAppState) setAppState(newState);
      setSaveStatus("saved");
    } catch(e) {
      console.error("State save failed:", e);
      setSaveStatus("error");
    }

    // Call Coach T — parse DASHBOARD_UPDATE if present to refine weekStats further
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1500,
          system: systemPrompt,
          messages: nextMessages.map(m => ({ role:m.role, content:m.content })),
        }),
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const reply = data.content?.find(b => b.type==="text")?.text || "";

      // If Coach T sends back a DASHBOARD_UPDATE, merge it in
      const match = reply.match(/DASHBOARD_UPDATE:\s*```(?:json)?\s*[\n\r]+([\s\S]*?)[\n\r]*```/);
      if (match) {
        try {
          const coachUpdate = JSON.parse(match[1]);
          const merged = { ...newState, ...coachUpdate, workoutLog: updatedLog };
          await pushState(merged);
          if (setAppState) setAppState(merged);
        } catch(e) { console.warn("DASHBOARD_UPDATE parse failed", e); }
      }

      const cleanReply = reply.replace(/DASHBOARD_UPDATE:\s*```json[\s\S]*?```/g, "✓ Dashboard updated.").trim();
      setCoachReply(cleanReply);
      if (setMessages) setMessages([...nextMessages, { role:"assistant", content:reply }]);
    } catch(e) {
      setCoachReply("Couldn't reach Coach T — workout data was saved. You can discuss it in the sidebar chat.");
    }

    setSending(false);
  };

  const VALID_MT = ["image/jpeg","image/png","image/gif","image/webp"];
  const normMT = (t) => VALID_MT.includes(t) ? t : "image/png";

  const readFile = (file) => new Promise((res) => {
    const reader = new FileReader();
    reader.onload = () => res({ preview:reader.result, name:file.name, base64:reader.result.split(",")[1], mediaType:normMT(file.type) });
    reader.readAsDataURL(file);
  });

  const addFiles = async (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/") || f.name.match(/\.(fit|csv)$/i));
    const loaded = await Promise.all(valid.map(readFile));
    setImages(prev => [...prev, ...loaded]);
  };

  const handleFileInput = async (e) => {
    if (e.target.files?.length) await addFiles(e.target.files);
    e.target.value = "";
  };

  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith("image/"));
    if (!items.length) return;
    e.preventDefault();
    const files = items.map(i => i.getAsFile()).filter(Boolean);
    await addFiles(files);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) await addFiles(e.dataTransfer.files);
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_,i) => i !== idx));

  const F = ({ label, name, type="text", placeholder="" }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <div style={{ fontSize:11, color:T.textMuted }}>{label}</div>
      <input type={type} value={form[name]||""} placeholder={placeholder}
        onChange={e => setForm(f => ({...f, [name]:e.target.value}))} />
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, animation:"ctFade 0.2s ease" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:520, maxHeight:"90vh", overflowY:"auto", background:T.bgDeep, border:`1px solid ${T.borderMid}`, borderRadius:16, zIndex:201, animation:"ctSlideUp 0.25s ease" }}
        onPaste={handlePaste}>
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>{workout?.domain || "Workout"}</div>
            <div style={{ fontSize:17, fontWeight:500, color:T.text }}>Log Session</div>
          </div>
          <button onClick={onClose} style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:8, width:32, height:32, color:T.textMuted, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Mode toggle */}
        <div style={{ padding:"14px 24px 0", display:"flex", gap:8 }}>
          {["upload","manual"].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex:1, padding:"8px 0", borderRadius:8, border:`1px solid ${mode===m?T.amberBorder:T.border}`, background:mode===m?T.amberGlow:"rgba(255,255,255,0.02)", color:mode===m?T.amber:T.textMuted, cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
              {m==="upload" ? "📎 Upload / Paste Screenshots" : "✏️ Manual Entry"}
            </button>
          ))}
        </div>

        <div style={{ padding:24 }}>
          {mode==="upload" ? (
            <div>
              <input ref={fileRef} type="file" accept="image/*,.fit,.csv" multiple onChange={handleFileInput} style={{ display:"none" }} />
              {/* Drop / paste zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ border:`2px dashed ${dragOver?T.amber:images.length?T.amberBorder:T.border}`, borderRadius:12, padding:"22px 20px", cursor:"pointer", background:dragOver?"rgba(232,185,106,0.08)":"rgba(255,255,255,0.01)", transition:"all 0.2s", textAlign:"center", marginBottom:14 }}>
                <div style={{ fontSize:26, marginBottom:6 }}>📱</div>
                <div style={{ fontSize:13, color:T.textMuted, marginBottom:3 }}>
                  {dragOver ? "Drop to add" : "Tap to select · Drag & drop · or Paste (⌘V / Ctrl+V)"}
                </div>
                <div style={{ fontSize:11, color:T.textDim }}>Multiple screenshots OK · Garmin, Wahoo, any app · paste directly from phone</div>
              </div>

              {/* Thumbnails */}
              {images.length > 0 && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, color:T.textMuted, marginBottom:8 }}>{images.length} screenshot{images.length > 1 ? "s" : ""} queued</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {images.map((img, i) => (
                      <div key={i} style={{ position:"relative" }}>
                        <img src={img.preview} alt={img.name}
                          style={{ height:80, width:108, objectFit:"cover", borderRadius:8, border:`1px solid ${T.amberBorder}`, display:"block" }} />
                        <button onClick={e => { e.stopPropagation(); removeImage(i); }}
                          style={{ position:"absolute", top:-7, right:-7, width:20, height:20, borderRadius:"50%", background:T.danger, border:"2px solid #0a1020", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>×</button>
                        <div style={{ fontSize:9, color:T.textDim, marginTop:3, maxWidth:108, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{img.name}</div>
                      </div>
                    ))}
                    <div onClick={() => fileRef.current?.click()}
                      style={{ height:80, width:108, borderRadius:8, border:`2px dashed ${T.border}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", gap:4 }}>
                      <div style={{ fontSize:22, color:T.textDim }}>+</div>
                      <div style={{ fontSize:9, color:T.textDim }}>Add more</div>
                    </div>
                  </div>
                </div>
              )}

              <F label="Date" name="date" type="date" />
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:5 }}>Notes (optional)</div>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))}
                  placeholder="Any context for this session…" rows={2}
                  style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 12px", color:T.text, fontSize:13, resize:"none", outline:"none", fontFamily:"'DM Sans',sans-serif" }} />
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <F label="Date" name="date" type="date" />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <F label="Duration" name="duration" placeholder="e.g. 55 min" />
                <F label="Distance" name="distance" placeholder="e.g. 1800m / 22mi" />
                <F label="Avg HR" name="avgHR" type="number" placeholder="bpm" />
                <F label="Max HR" name="maxHR" type="number" placeholder="bpm" />
                <F label="TSS" name="tss" type="number" placeholder="Training Stress Score" />
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <div style={{ fontSize:11, color:T.textMuted }}>RPE (1–10)</div>
                  <div style={{ display:"flex", gap:5 }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setForm(f => ({...f, rpe:String(n)}))}
                        style={{ flex:1, padding:"5px 0", borderRadius:5, border:`1px solid ${form.rpe===String(n)?T.amberBorder:T.border}`, background:form.rpe===String(n)?T.amberGlow:"rgba(255,255,255,0.02)", color:form.rpe===String(n)?T.amber:T.textMuted, cursor:"pointer", fontSize:10, fontFamily:"'DM Sans',sans-serif" }}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:5 }}>Notes</div>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))}
                  placeholder="How did it feel? Any issues?" rows={3}
                  style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 12px", color:T.text, fontSize:13, resize:"none", outline:"none", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5 }} />
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <Btn onClick={onClose} style={{ flex:1 }} disabled={sending}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave} style={{ flex:2 }} disabled={sending}>
              {sending ? "Sending to Coach T…" : mode==="upload" && images.length > 0 ? `Send ${images.length} Screenshot${images.length>1?"s":""} to Coach T` : "Save Workout"}
            </Btn>
          </div>
          {coachReply && (
            <div style={{ marginTop:16, background:"rgba(232,185,106,0.06)", border:`1px solid rgba(232,185,106,0.2)`, borderRadius:10, padding:"14px 16px", animation:"ctFade 0.3s ease" }}>
              <div style={{ fontSize:10, color:T.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Coach T</div>
              <div style={{ fontSize:13, color:T.text, lineHeight:1.65, whiteSpace:"pre-wrap" }}>{coachReply}</div>
              <Btn variant="primary" onClick={onClose} style={{ marginTop:12, width:"100%" }}>Done</Btn>
            </div>
          )}
          {saveStatus && !coachReply && (
            <div style={{ marginTop:10, fontSize:12, color:saveStatus==="error"?T.danger:T.success, textAlign:"center" }}>
              {saveStatus==="error" ? "Save failed — check connection" : "✓ Workout saved to state"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Training Week Sub-View ────────────────────────────────────────────────────
function TrainingWeek({ appState, setAppState, systemPrompt, messages, setMessages }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [logTarget, setLogTarget]     = useState(null);

  if (appState === null || appState === undefined) return <Loading />;
  const s = appState;
  const completedCount = s.week?.filter(d => d.completed===true).length||0;
  const trainingDays   = s.week?.filter(d => d.sessions?.length>0).length||0;
  const handleToggle   = (dayName,val) => setSelectedDay(prev => prev?.day===dayName ? {...prev,completed:val} : prev);

  // ── Week-level distance totals from workoutLog ───────────────────────────
  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate()-today.getDay()); weekStart.setHours(0,0,0,0);
  const thisWeekLogs = (s.workoutLog||[]).filter(w => {
    const d = new Date((w.date||w.loggedAt?.split("T")[0]||"")+"T12:00:00");
    return d >= weekStart;
  });
  const parseDist = (val, dom) => {
    if (!val) return 0;
    const n = parseFloat(String(val).replace(/[^0-9.]/g,""));
    return isNaN(n) ? 0 : n;
  };
  const swimDist = thisWeekLogs.filter(w=>w.domain==="swim").reduce((s,w)=>s+parseDist(w.distance,"swim"),0);
  const bikeDist = thisWeekLogs.filter(w=>w.domain==="bike").reduce((s,w)=>s+parseDist(w.distance,"bike"),0);
  const runDist  = thisWeekLogs.filter(w=>w.domain==="run" ).reduce((s,w)=>s+parseDist(w.distance,"run"),0);

  // ── CTL / ATL / TSB from weekStats ──────────────────────────────────────
  const ws     = s.weekStats || {};
  const ctl    = ws.ctl    ?? "—";
  const atl    = ws.atl    ?? "—";
  const tsb    = ws.tsb    != null ? (ws.tsb > 0 ? `+${ws.tsb}` : String(ws.tsb)) : "—";
  const tsbCol = ws.tsb == null ? T.textDim : ws.tsb >= 5 ? T.success : ws.tsb >= -10 ? T.amber : T.danger;
  const weekTSS = ws.tss || thisWeekLogs.reduce((a,w)=>a+(parseFloat(w.tss)||0),0);
  const tssTgt  = ws.tssTgt || s.athlete?.tssTgt || 310;
  const avgIF   = ws.avgIF  || (()=>{
    const hasIF = thisWeekLogs.filter(w=>w.if_);
    return hasIF.length ? (hasIF.reduce((a,w)=>a+parseFloat(w.if_||0),0)/hasIF.length).toFixed(2) : null;
  })();
  const weekVol  = ws.volume || parseFloat((thisWeekLogs.reduce((a,w)=>{
    const str=String(w.duration||""); if(str.includes(":")){const p=str.split(":").map(Number);return a+p[0]*60+(p[1]||0);} const n=parseFloat(str); return a+(isNaN(n)?0:(str.toLowerCase().includes("h")?n*60:n));
  },0)/60).toFixed(1));
  const volTgt   = s.athlete?.weeklyCap || 7;

  return (
    <div style={{padding:24, overflowY:"auto", height:"100%", position:"relative"}}>

      {/* ── Week header ── */}
      <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16}}>
        <div>
          <h2 style={{color:T.text, fontSize:20, fontWeight:500, marginBottom:2}}>This Week</h2>
          <p style={{color:T.amber, fontSize:13}}>{s.block?.name} · Week {s.block?.currentWeek} of {s.block?.totalWeeks}</p>
        </div>
        <div style={{background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:"8px 14px", textAlign:"center"}}>
          <div style={{color:T.amber, fontSize:20, fontWeight:500, lineHeight:1}}>{completedCount}/{trainingDays}</div>
          <div style={{color:T.textMuted, fontSize:10, marginTop:2}}>sessions done</div>
        </div>
      </div>

      {/* ── 8 stat cards ── */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:10, marginBottom:16}}>
        {[
          {label:"CTL",       value:ctl,                                color:T.swim,    sub:"fitness"},
          {label:"ATL",       value:atl,                                color:"#f07080", sub:"fatigue"},
          {label:"TSB",       value:tsb,                                color:tsbCol,    sub:"form"},
          {label:"Week TSS",  value:Math.round(weekTSS)||"—",           color:T.amber,   sub:`/ ${tssTgt} target`},
          {label:"Avg IF",    value:avgIF||"—",                         color:T.swim,    sub:"intensity"},
          {label:"Hours",     value:weekVol||"—",                       color:T.run,     sub:`/ ${volTgt} target`},
          {label:"Swim",      value:swimDist>0?`${Math.round(swimDist)}m`:"—", color:T.swim, sub:"this week"},
          {label:"Bike / Run",value:bikeDist>0||runDist>0?`${Math.round(bikeDist)}mi · ${Math.round(runDist)}km`:"—", color:T.bike, sub:"this week"},
        ].map(({label,value,color,sub}) => (
          <div key={label} style={{background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 12px"}}>
            <div style={{fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5}}>{label}</div>
            <div style={{fontSize:label==="Bike / Run"?13:22, fontWeight:300, color, lineHeight:1, marginBottom:3}}>{value}</div>
            <div style={{fontSize:9, color:T.textDim}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Discipline filter ── */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
        <div style={{fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px"}}>{s.block?.name}</div>
      </div>

      {/* ── 7-day cards ── */}
      {(!s.week||s.week.length===0) && (
        <div style={{background:"rgba(255,255,255,0.02)", border:`1px dashed ${T.border}`, borderRadius:12, padding:"28px 20px", marginBottom:20, textAlign:"center"}}>
          <div style={{fontSize:15, color:T.textMuted, marginBottom:8}}>No week schedule loaded yet</div>
          <div style={{fontSize:13, color:T.textDim, marginBottom:16}}>Tell Coach T your training week and he'll set it up.</div>
          <div style={{fontSize:12, color:T.swim, fontStyle:"italic"}}>Try: "Set up this week's schedule — swim Mon/Wed/Fri, bike Tue/Sat, run Sun, rest Thu"</div>
        </div>
      )}
      <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8, marginBottom:16}}>
        {(s.week||[]).map((d,i) => {
          const isRest = !d.sessions?.length;
          const isDone = d.completed===true;
          const isSelected = selectedDay?.day===d.day;
          const domCol = d.sessions?.[0]?.type ? typeColor[d.sessions[0].type] : T.border;
          return (
            <div key={i} onClick={() => setSelectedDay(d)}
              style={{background:isDone?`${T.success}15`:T.bgCard, border:`1px solid ${isDone?T.success:isSelected?T.amber:isRest?"#1a2840":domCol+"55"}`, borderRadius:12, padding:10, cursor:"pointer", transition:"all 0.2s", minHeight:110, transform:isSelected?"translateY(-2px)":"none"}}>
              {(() => {
                const DOW2 = {Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
                const wkMon = new Date(); wkMon.setDate(wkMon.getDate()-((wkMon.getDay()+6)%7));
                const off = DOW2[d.day] ?? DOW2[d.dow] ?? 0;
                const dt  = new Date(wkMon); dt.setDate(wkMon.getDate()+off);
                const mmdd = `${dt.getMonth()+1}/${dt.getDate()}`;
                return (
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6}}>
                    <div>
                      <div style={{color:isRest?T.textDim:domCol||T.amber, fontSize:12, fontWeight:600, textTransform:"uppercase", lineHeight:1.2}}>{d.day}</div>
                      <div style={{color:T.textDim, fontSize:10, marginTop:1}}>{mmdd}</div>
                    </div>
                    {isDone && <div style={{color:T.success, fontSize:12}}>✓</div>}
                  </div>
                );
              })()}
              {isRest
                ? <div style={{color:T.textDim, fontSize:11, textAlign:"center", marginTop:14}}>REST</div>
                : d.sessions.map((s2,j) => (
                  <div key={j} style={{marginBottom:6}}>
                    <div style={{height:3, borderRadius:2, background:typeColor[s2.type]||T.textMuted, marginBottom:4}}/>
                    <div style={{color:T.text, fontSize:11, lineHeight:1.4}}>{s2.label}</div>
                    {s2.tss && <div style={{fontSize:10, color:T.amber, marginTop:2}}>{s2.tss} TSS</div>}
                  </div>
                ))
              }
              {!isRest && <div style={{color:T.textDim, fontSize:10, marginTop:6}}>tap for details</div>}
            </div>
          );
        })}
      </div>

      {/* ── Log historical banner ── */}
      <div style={{background:"rgba(90,171,245,0.06)", border:"1px solid rgba(90,171,245,0.15)", borderRadius:8, padding:"9px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10}}>
        <span style={{fontSize:13}}>📝</span>
        <div style={{fontSize:12, color:T.swim}}>Missed logging a past workout? Click any day or use <strong>+ Log Historical</strong>.</div>
        <Btn onClick={() => setLogTarget({domain:"Historical", date:null})} variant="swim" style={{marginLeft:"auto", whiteSpace:"nowrap", flexShrink:0}}>+ Log Historical</Btn>
      </div>

      {/* ── Zone detail panels ── */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16}}>
        {/* Bike zones */}
        <div style={{background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 16px"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12}}>
            <div style={{fontSize:12, fontWeight:500, color:T.bike}}>Bike · FTP {s.athlete?.ftp}W {s.athlete?.ftp?"":"(pending)"}</div>
            <div style={{fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px"}}>Planned time in zone</div>
          </div>
          {(s.bikeZones||[["Z1 Recovery","< 90W"],["Z2 Endurance","90–135W"],["Z3 Tempo","136–162W"],["Z4 Threshold","163–180W"],["Z5 VO2","181+W"]]).map(([z,r],i) => {
            const pcts=[10,55,20,10,5]; const cols=["#4a6a8a",T.swim,"#27a060",T.amber,"#f07080"];
            const times=["12 min","2h 40m","56 min","26 min","10 min"];
            return (
              <div key={z} style={{display:"flex", alignItems:"center", gap:8, marginBottom:7}}>
                <div style={{fontSize:10, color:"#8899aa", width:88, flexShrink:0}}>{z}</div>
                <div style={{flex:1, height:22, background:"rgba(0,0,0,0.3)", borderRadius:4, overflow:"hidden"}}>
                  <div style={{width:`${pcts[i]}%`, height:"100%", background:`${cols[i]}22`, borderLeft:`3px solid ${cols[i]}`, display:"flex", alignItems:"center", paddingLeft:6}}>
                    <span style={{fontSize:10, fontWeight:500, color:cols[i], whiteSpace:"nowrap"}}>{r}</span>
                  </div>
                </div>
                <div style={{fontSize:10, color:T.textDim, width:40, textAlign:"right", flexShrink:0}}>{times[i]}</div>
              </div>
            );
          })}
        </div>
        {/* Run zones */}
        <div style={{background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 16px"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12}}>
            <div style={{fontSize:12, fontWeight:500, color:T.run}}>Run · LTHR {s.athlete?.lthr} bpm</div>
            <div style={{fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px"}}>Planned time in zone</div>
          </div>
          {(s.runZones||[["Z1 Recovery","< 153 bpm"],["Z2 Endurance","153–168"],["Z3 Tempo","169–178"],["Z4 Threshold","179–185"],["Z5 VO2","185+ bpm"]]).map(([z,r],i) => {
            const pcts=[8,68,18,5,1]; const cols=["#4a6a8a",T.swim,"#27a060",T.amber,"#f07080"];
            const times=["10 min","33 min","10 min","2 min","—"];
            return (
              <div key={z} style={{display:"flex", alignItems:"center", gap:8, marginBottom:7}}>
                <div style={{fontSize:10, color:"#8899aa", width:88, flexShrink:0}}>{z}</div>
                <div style={{flex:1, height:22, background:"rgba(0,0,0,0.3)", borderRadius:4, overflow:"hidden"}}>
                  <div style={{width:`${Math.max(pcts[i],2)}%`, height:"100%", background:`${cols[i]}22`, borderLeft:`3px solid ${cols[i]}`, display:"flex", alignItems:"center", paddingLeft:6}}>
                    <span style={{fontSize:10, fontWeight:500, color:cols[i], whiteSpace:"nowrap"}}>{r}</span>
                  </div>
                </div>
                <div style={{fontSize:10, color:T.textDim, width:40, textAlign:"right", flexShrink:0}}>{times[i]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Block focus ── */}
      <Card title={s.block?.name}>
        <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14}}>
          {[
            {label:"Wk 1–2", focus:"Breathing mechanics · 50–100m repeats",   active:s.block?.currentWeek<=2},
            {label:"Wk 3–4", focus:"125–150m repeats · reduce rest",           active:s.block?.currentWeek>2&&s.block?.currentWeek<=4},
            {label:"Wk 5–6", focus:"150–200m segments · continuous building",  active:s.block?.currentWeek>4&&s.block?.currentWeek<=6},
            {label:"Wk 7–8", focus:"300–350m → 400m continuous calm attempt",  active:s.block?.currentWeek>6},
          ].map((w,i) => (
            <div key={i} style={{background:w.active?"rgba(232,185,106,0.08)":T.bgDeep, border:`1px solid ${w.active?T.amberBorder:T.border}`, borderRadius:8, padding:"10px 12px"}}>
              <div style={{color:w.active?T.amber:T.textMuted, fontSize:11, fontWeight:500, marginBottom:4}}>{w.label}</div>
              <div style={{color:T.text, fontSize:11, lineHeight:1.5}}>{w.focus}</div>
            </div>
          ))}
        </div>
        <div style={{color:T.textMuted, fontSize:12}}>Block objective: <span style={{color:T.amber}}>{s.block?.objective}</span></div>
      </Card>

      <Card title="SSM — Strength &amp; Stability">
        {(s.ssm||[]).map(({exercise,prescription}) => (
          <div key={exercise} style={{display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${T.border}`}}>
            <span style={{color:T.text, fontSize:12}}>{exercise}</span>
            <span style={{color:T.textMuted, fontSize:12}}>{prescription}</span>
          </div>
        ))}
      </Card>

      <div style={{color:T.textMuted, fontSize:11, textAlign:"right", marginTop:-8}}>Last updated: {s.lastUpdated}</div>

      {selectedDay && <DayPanel day={selectedDay} onClose={() => setSelectedDay(null)} onToggleComplete={handleToggle} appState={appState} setAppState={setAppState} onLog={() => setLogTarget({domain:selectedDay.sessions?.[0]?.type||"workout", date:selectedDay.day})}/>}
      {logTarget && <WorkoutLogModal workout={logTarget} systemPrompt={systemPrompt} appState={appState} setAppState={setAppState} messages={messages} setMessages={setMessages} onClose={() => setLogTarget(null)}/>}
    </div>
  );
}

// ── ATP Sub-View ──────────────────────────────────────────────────────────────
function ATPSection({ appState }) {
  const s = appState || {};
  const phases = [
    {label:"Aerobic Base", dates:"Jan 1 – Mar 31", weeks:"1–12",  focus:"Swim mechanics, Zone 2 base, SSM foundation, HRV establishment",         col:T.swim,    now:true},
    {label:"Build 1",      dates:"Apr 1 – Jun 30", weeks:"13–26", focus:"Swim continuity 400–600m, Bike threshold development, Run durability",     col:T.amber,   now:false},
    {label:"Build 2",      dates:"Jul 1 – Sep 15", weeks:"27–37", focus:"Swim 600–900m continuous, Race-specific intensities, Brick training",       col:T.ssm,     now:false},
    {label:"Race Peak",    dates:"Sep 16 – Nov 15",weeks:"38–45", focus:"Taper protocol, race rehearsals, 1500m swim attempt Q4",                   col:T.run,     now:false},
    {label:"Transition",   dates:"Nov 16 – Dec 31",weeks:"46–52", focus:"Unstructured movement, recovery, 2027 planning",                           col:T.textMuted,now:false},
  ];
  const races = [
    {name:"Tri Rock Dallas Sprint", date:"Apr 12", week:14, priority:"B"},
    {name:"Hotter-N-Hell 100 (bike)",date:"Aug 29",week:34, priority:"B"},
    {name:"A Race: Olympic Tri TBD", date:"Oct 4", week:40, priority:"A"},
  ];
  const benchmarks = [
    {dom:"Swim", col:T.swim, tiers:[
      {desc:"200m continuous",    done:true},
      {desc:"400m continuous",    active:true},
      {desc:"800m continuous",    future:true},
      {desc:"1000–1200m",         future:true},
      {desc:"1500m race-ready",   future:true},
    ]},
    {dom:"Bike", col:T.bike, tiers:[
      {desc:"60 min aerobic",     done:true},
      {desc:"75 min stable",      done:true},
      {desc:"90 min endurance",   active:true},
      {desc:"Power intervals",    future:true},
      {desc:"Race pace execution",future:true},
    ]},
    {dom:"Run", col:T.run, tiers:[
      {desc:"20 min continuous",  done:true},
      {desc:"30 min aerobic",     done:true},
      {desc:"45 min controlled",  active:true},
      {desc:"60–75 min endurance",future:true},
      {desc:"90 min durable run", future:true},
    ]},
    {dom:"SSM", col:T.ssm, tiers:[
      {desc:"Basic mobility",     done:true},
      {desc:"Weekly consistency", active:true},
      {desc:"Movement quality L3",future:true},
      {desc:"Load tolerance",     future:true},
      {desc:"Advanced resilience",future:true},
    ]},
  ];

  return (
    <div style={{padding:24, overflowY:"auto", height:"100%"}}>
      <div style={{marginBottom:20}}>
        <h2 style={{color:T.text, fontSize:20, fontWeight:500, marginBottom:4}}>Annual Training Plan · 2026</h2>
        <p style={{color:T.textMuted, fontSize:13}}>Capacity & Mastery Year · 70.3 moves to 2027 · 52 weeks · Swim frontier primary</p>
      </div>

      {/* ── Benchmark ladder cards at top ── */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20}}>
        {benchmarks.map(({dom,col,tiers}) => (
          <div key={dom} style={{background:T.bgCard, border:`1px solid ${col}33`, borderRadius:12, padding:"16px 18px"}}>
            <div style={{fontSize:13, fontWeight:600, color:col, marginBottom:12}}>{dom}</div>
            {tiers.map(({desc,done,active,future},i) => (
              <div key={i} style={{display:"flex", alignItems:"center", gap:9, marginBottom:8}}>
                <div style={{
                  width:22, height:22, borderRadius:"50%", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:active?11:10, fontWeight:700,
                  background:done?col:active?`${col}33`:"rgba(255,255,255,0.05)",
                  border:active?`2px solid ${col}`:"none",
                  color:done?"#0a1020":active?col:"#364a60",
                }}>
                  {done ? "✓" : i+1}
                </div>
                <div style={{flex:1, fontSize:11, color:done?T.textDim:active?T.text:"#364a60", fontWeight:active?500:400, lineHeight:1.3}}>{desc}</div>
                {active && <div style={{fontSize:9, color:T.amber, background:"rgba(232,185,106,0.12)", border:"1px solid rgba(232,185,106,0.3)", borderRadius:8, padding:"1px 7px", whiteSpace:"nowrap", flexShrink:0}}>Active</div>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Season timeline ── */}
      <Card title="Season Timeline">
        <div style={{marginBottom:6, display:"flex"}}>
          {[1,5,10,15,20,25,30,35,40,45,50].map(w => (
            <div key={w} style={{flex:1, fontSize:9, color:T.textDim, textAlign:"center"}}>Wk{w}</div>
          ))}
        </div>
        <div style={{position:"relative", height:18, borderRadius:6, background:"rgba(255,255,255,0.03)", border:`1px solid ${T.border}`, marginBottom:16, overflow:"visible"}}>
          <div style={{position:"absolute", left:0, top:0, height:"100%", width:"19%", background:"rgba(55,138,221,0.25)", borderRadius:"6px 0 0 6px", borderRight:`2px solid ${T.amber}`}}/>
          <div style={{position:"absolute", left:"19%", top:-20, fontSize:9, color:T.amber, fontWeight:500}}>NOW</div>
          {races.map((r,i) => (
            <div key={i} style={{position:"absolute", top:-4, transform:"translateX(-50%)", left:`${((r.week-1)/52)*100}%`}}>
              <div style={{width:10, height:10, borderRadius:"50%", background:r.priority==="A"?T.danger:T.amber, border:`2px solid ${T.bg}`, cursor:"pointer"}} title={r.name}/>
            </div>
          ))}
        </div>
        <div style={{display:"flex", gap:12, marginBottom:8}}>
          {races.map((r,i) => (
            <div key={i} style={{display:"flex", alignItems:"center", gap:6, fontSize:11, color:T.textMuted}}>
              <div style={{width:8, height:8, borderRadius:"50%", background:r.priority==="A"?T.danger:T.amber, flexShrink:0}}/>
              {r.name} <span style={{color:T.textDim}}>({r.date})</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Phase rows ── */}
      <div style={{display:"flex", flexDirection:"column", gap:8, marginTop:16}}>
        {phases.map((ph,i) => (
          <div key={i} style={{background:ph.now?`${ph.col}12`:"rgba(255,255,255,0.01)", border:`1px solid ${ph.now?ph.col+"44":"#1a2840"}`, borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:14}}>
            {ph.now
              ? <div style={{fontSize:9, color:T.amber, background:"rgba(232,185,106,0.12)", border:"1px solid rgba(232,185,106,0.3)", borderRadius:8, padding:"2px 8px", flexShrink:0, width:52, textAlign:"center"}}>ACTIVE</div>
              : <div style={{width:52, flexShrink:0}}/>}
            <div style={{width:120, flexShrink:0}}>
              <div style={{fontSize:13, fontWeight:500, color:ph.col}}>{ph.label}</div>
              <div style={{fontSize:10, color:T.textDim}}>{ph.dates} · Wk {ph.weeks}</div>
            </div>
            <div style={{fontSize:12, color:"#8899aa", lineHeight:1.5}}>{ph.focus}</div>
          </div>
        ))}
      </div>

      {/* ── Season goals ── */}
      <Card title="Season Goals" style={{marginTop:16}}>
        {[
          {dom:"Swim", goal:`1500m continuous, calm — by Oct 4`, color:T.swim},
          {dom:"Bike", goal:`FTP +5–10% over provisional ${s.athlete?.ftp||194}W baseline`, color:T.bike},
          {dom:"Run",  goal:"90-min durable run · cadence 160–165 spm", color:T.run},
          {dom:"SSM",  goal:"L4 movement quality across all patterns", color:T.ssm},
        ].map(({dom,goal,color}) => (
          <div key={dom} style={{display:"flex", gap:14, padding:"9px 0", borderBottom:`1px solid ${T.border}`}}>
            <span style={{color, fontSize:12, fontWeight:600, width:44, flexShrink:0}}>{dom}</span>
            <span style={{color:T.text, fontSize:13, lineHeight:1.5}}>{goal}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Training History Page ────────────────────────────────────────────────────
function TrainingHistory({ appState }) {
  const rawLog = appState?.workoutLog || [];
  const domCol   = { swim:T.swim, bike:T.bike, run:T.run, ssm:T.ssm };
  const domLabel = { swim:"Swim", bike:"Bike", run:"Run", ssm:"SSM" };

  const seen = new Set();
  const log = [...rawLog]
    .sort((a,b) => (b.date||"") > (a.date||"") ? 1 : -1)
    .filter(w => {
      const key = `${w.date||w.loggedAt?.split("T")[0]}:${w.domain}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });

  const [filter, setFilter]     = useState("all");
  const [viewMonth, setViewMonth] = useState(() => { const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),1); });
  const [selected, setSelected]   = useState(null);

  const byDate = {};
  log.forEach(w => { const d=w.date||w.loggedAt?.split("T")[0]; if(!d) return; if(!byDate[d]) byDate[d]=[]; byDate[d].push(w); });

  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const monthEnd   = new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 0);
  const today      = new Date();
  const todayStr   = today.toISOString().split("T")[0];
  const startPad   = monthStart.getDay();
  const cells = [];
  for (let i=0; i<startPad; i++) cells.push(null);
  for (let d=1; d<=monthEnd.getDate(); d++) {
    const dt=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),d);
    const key=dt.toISOString().split("T")[0];
    cells.push({date:key, dt, workouts:byDate[key]||[], isToday:key===todayStr, isFuture:dt>today});
  }
  while (cells.length%7!==0) cells.push(null);
  const rows=[]; for(let i=0;i<cells.length;i+=7) rows.push(cells.slice(i,i+7));

  const filtered = filter==="all" ? log : log.filter(w => w.domain===filter);

  const parseMinsH = s => { if(!s) return 0; const str=String(s); if(str.includes(":")){const p=str.split(":").map(Number);return p[0]*60+(p[1]||0);} const n=parseFloat(str); return isNaN(n)?0:(str.toLowerCase().includes("h")?n*60:n); };
  const parseDist  = (val) => { if(!val) return 0; const n=parseFloat(String(val).replace(/[^0-9.]/g,"")); return isNaN(n)?0:n; };

  // Stats — respect filter
  const flog = filtered;
  const totalTSS  = flog.reduce((s,w)=>s+(parseFloat(w.tss)||0),0);
  const totalMins = flog.reduce((s,w)=>s+parseMinsH(w.duration),0);
  const avgIF     = flog.filter(w=>w.if_).length ? (flog.filter(w=>w.if_).reduce((s,w)=>s+parseFloat(w.if_||0),0)/flog.filter(w=>w.if_).length).toFixed(2) : null;
  const swimDist  = flog.filter(w=>w.domain==="swim").reduce((s,w)=>s+parseDist(w.distance),0);
  const bikeDist  = flog.filter(w=>w.domain==="bike").reduce((s,w)=>s+parseDist(w.distance),0);
  const runDist   = flog.filter(w=>w.domain==="run" ).reduce((s,w)=>s+parseDist(w.distance),0);

  const prevMonth = () => setViewMonth(m => new Date(m.getFullYear(),m.getMonth()-1,1));
  const nextMonth = () => { const next=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1); if(next<=new Date(today.getFullYear(),today.getMonth(),1)) setViewMonth(next); };
  const canNext   = viewMonth < new Date(today.getFullYear(),today.getMonth(),1);

  return (
    <div style={{display:"flex", height:"100%", overflow:"hidden", flexDirection:"column"}}>

      {/* ── Filter pills at top ── */}
      <div style={{display:"flex", alignItems:"center", gap:7, padding:"12px 20px", borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
        <span style={{fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px", marginRight:4}}>Filter:</span>
        {[["all","All",T.text],["swim","Swim",T.swim],["bike","Bike",T.bike],["run","Run",T.run],["ssm","SSM",T.ssm]].map(([id,label,col]) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{padding:"4px 13px", borderRadius:16, fontSize:11, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              background:filter===id?`${col}18`:"rgba(255,255,255,0.03)",
              border:`1px solid ${filter===id?col+"66":T.border}`,
              color:filter===id?col:T.textDim}}>
            {label}
          </button>
        ))}
        <span style={{fontSize:10, color:"#364a60", marginLeft:4}}>cards and list update on selection</span>
      </div>

      {/* ── Stat cards — 6 cards, filter-aware ── */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, padding:"12px 20px 0", flexShrink:0}}>
        {[
          {label:"Sessions",    value:flog.length,                  color:T.swim,  sub:filter==="all"?"all disciplines":domLabel[filter]},
          {label:"Total TSS",   value:Math.round(totalTSS)||"—",    color:T.amber, sub:"training stress"},
          {label:"Hours",       value:(totalMins/60).toFixed(1),    color:T.run,   sub:"volume"},
          {label:"Avg IF",      value:avgIF||"—",                   color:T.swim,  sub:"intensity factor"},
          {label:"Swim Dist",   value:swimDist>0?`${Math.round(swimDist)}m`:"—",  color:T.swim,  sub:"total meters"},
          {label:"Bike / Run",  value:bikeDist>0||runDist>0?`${Math.round(bikeDist)}mi`:"—", color:T.bike, sub:runDist>0?`${Math.round(runDist)}km run`:"distance"},
        ].map(({label,value,color,sub}) => (
          <div key={label} style={{background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px"}}>
            <div style={{fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:5}}>{label}</div>
            <div style={{fontSize:label==="Bike / Run"?14:26, fontWeight:300, color, lineHeight:1, marginBottom:3}}>{value}</div>
            <div style={{fontSize:10, color:T.textDim}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Calendar + list ── */}
      <div style={{display:"flex", flex:1, overflow:"hidden", marginTop:12}}>

        {/* LEFT: Calendar — wider at 345px */}
        <div style={{width:345, flexShrink:0, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
            <button onClick={prevMonth} style={{background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:18, padding:"0 6px", lineHeight:1}}>‹</button>
            <div style={{fontSize:13, fontWeight:500, color:T.text}}>{viewMonth.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
            <button onClick={nextMonth} disabled={!canNext} style={{background:"none", border:"none", color:canNext?T.textMuted:"rgba(255,255,255,0.15)", cursor:canNext?"pointer":"not-allowed", fontSize:18, padding:"0 6px", lineHeight:1}}>›</button>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", padding:"6px 10px 2px", flexShrink:0}}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <div key={d} style={{textAlign:"center", fontSize:9, color:T.textDim, fontWeight:600}}>{d}</div>
            ))}
          </div>
          <div style={{padding:"3px 10px 10px", flex:1, overflowY:"auto"}}>
            {rows.map((row,ri) => (
              <div key={ri} style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3}}>
                {row.map((cell,ci) => {
                  if (!cell) return <div key={ci}/>;
                  const hasLog = cell.workouts.length>0;
                  const doms   = [...new Set(cell.workouts.map(w=>w.domain?.toLowerCase()))];
                  const tss    = cell.workouts.reduce((s,w)=>s+(parseFloat(w.tss)||0),0);
                  const isSelected = selected?.date===cell.date;
                  const priCol = domCol[doms[0]]||T.textMuted;
                  return (
                    <div key={ci} onClick={() => setSelected(isSelected?null:cell)}
                      style={{borderRadius:7, height:48, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:5, cursor:"pointer",
                        background:isSelected?"rgba(240,192,112,0.15)":hasLog?`${priCol}15`:"rgba(255,255,255,0.02)",
                        border:`1px solid ${isSelected?T.amberBorder:cell.isToday?T.amber:hasLog?`${priCol}44`:"rgba(255,255,255,0.05)"}`,
                        opacity:cell.isFuture?0.25:1}}>
                      <span style={{fontSize:11, fontWeight:cell.isToday?700:400, color:cell.isToday?T.amber:hasLog?T.text:T.textDim, lineHeight:1}}>{cell.dt.getDate()}</span>
                      {hasLog && <div style={{display:"flex", gap:2, marginTop:3}}>{doms.slice(0,3).map(d=><div key={d} style={{width:6, height:6, borderRadius:2, background:domCol[d]||T.textMuted}}/>)}</div>}
                      {tss>0 && <div style={{fontSize:8, color:T.amber, marginTop:2, lineHeight:1}}>{Math.round(tss)}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Selected day mini-detail */}
          {selected && selected.workouts.length>0 && (
            <div style={{borderTop:`1px solid ${T.border}`, padding:"10px 14px", flexShrink:0, background:"rgba(255,255,255,0.01)"}}>
              <div style={{fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8}}>
                {selected.dt.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
              </div>
              {selected.workouts.map((w,i) => {
                const col=domCol[w.domain]||T.textMuted;
                return (
                  <div key={i} style={{display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:i<selected.workouts.length-1?`1px solid rgba(255,255,255,0.05)`:"none"}}>
                    <div style={{width:3, height:28, borderRadius:2, background:col, flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12, fontWeight:500, color:col}}>{domLabel[w.domain]||w.domain}</div>
                      <div style={{fontSize:10, color:T.textDim}}>{[w.duration,w.distance].filter(Boolean).join(" · ")}</div>
                    </div>
                    {w.tss && <div style={{fontSize:13, fontWeight:500, color:T.amber}}>{Math.round(w.tss)}</div>}
                    {w.if_ && <div style={{fontSize:11, color:T.swim}}>{parseFloat(w.if_).toFixed(2)}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Session list */}
        <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
          <div style={{display:"flex", alignItems:"center", padding:"9px 18px", borderBottom:`1px solid ${T.border}`, background:"rgba(255,255,255,0.01)", flexShrink:0}}>
            <div style={{width:56, flexShrink:0}}/>
            <div style={{width:3, flexShrink:0, margin:"0 12px"}}/>
            <div style={{flex:1, fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px"}}>
              {filter==="all"?"All Sessions":`${domLabel[filter]||filter} Sessions`} · {filtered.length}
            </div>
            <div style={{display:"flex"}}>
              <div style={{width:52, textAlign:"right", fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.8px"}}>IF</div>
              <div style={{width:52, textAlign:"right", fontSize:9, color:T.amber, textTransform:"uppercase", letterSpacing:"0.8px"}}>TSS</div>
              <div style={{width:44, textAlign:"right", fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.8px"}}>RPE</div>
            </div>
          </div>
          <div style={{flex:1, overflowY:"auto"}}>
            {filtered.length===0 ? (
              <div style={{padding:"40px 20px", textAlign:"center", fontSize:13, color:T.textDim}}>No sessions logged yet</div>
            ) : filtered.map((w,i) => {
              const col  = domCol[w.domain]||T.textMuted;
              const date = w.date||w.loggedAt?.split("T")[0];
              const isSel = selected?.date===date;
              return (
                <div key={i}
                  onClick={() => date && setSelected(isSel?null:{date, dt:new Date(date+"T12:00:00"), workouts:[w]})}
                  style={{display:"flex", alignItems:"center", padding:"11px 18px", borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:"pointer", background:isSel?"rgba(240,192,112,0.04)":"transparent"}}
                  onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background="rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background="transparent"; }}>
                  <div style={{width:56, flexShrink:0}}>
                    <div style={{fontSize:13, fontWeight:500, color:T.text, lineHeight:1.2}}>
                      {date ? new Date(date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—"}
                    </div>
                    <div style={{fontSize:10, color:T.textDim, marginTop:1}}>
                      {date ? new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"}) : ""}
                    </div>
                  </div>
                  <div style={{width:3, height:36, borderRadius:2, background:col, flexShrink:0, margin:"0 12px"}}/>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:14, fontWeight:500, color:col, lineHeight:1.2, marginBottom:2}}>{domLabel[w.domain]||w.domain}</div>
                    <div style={{fontSize:11, color:T.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                      {[w.duration, w.distance&&String(w.distance), w.avgHR&&`${w.avgHR} bpm`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{display:"flex"}}>
                    <div style={{width:52, textAlign:"right"}}>
                      <div style={{fontSize:8, color:T.textDim, marginBottom:2}}>IF</div>
                      <div style={{fontSize:15, fontWeight:500, color:T.swim}}>{w.if_ ? parseFloat(w.if_).toFixed(2) : <span style={{color:T.textDim, fontSize:11}}>—</span>}</div>
                    </div>
                    <div style={{width:52, textAlign:"right"}}>
                      <div style={{fontSize:8, color:T.textDim, marginBottom:2}}>TSS</div>
                      <div style={{fontSize:15, fontWeight:500, color:T.amber}}>{w.tss ? Math.round(w.tss) : <span style={{color:T.textDim, fontSize:11}}>—</span>}</div>
                    </div>
                    <div style={{width:44, textAlign:"right"}}>
                      <div style={{fontSize:8, color:T.textDim, marginBottom:2}}>RPE</div>
                      <div style={{fontSize:15, fontWeight:500, color:"#8899aa"}}>{w.rpe || <span style={{color:T.textDim, fontSize:11}}>—</span>}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Workout History Calendar ──────────────────────────────────────────────────
function WorkoutCalendar({ appState, style={} }) {
  const log = appState?.workoutLog || [];
  const domCol = { swim:T.swim, bike:T.bike, run:T.run, ssm:T.ssm };

  // Build a map of date → workouts
  const byDate = {};
  log.forEach(w => {
    const d = w.date || w.loggedAt?.split("T")[0];
    if (!d) return;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(w);
  });

  // Build last 12 weeks of calendar
  const today = new Date();
  const weeks = [];
  // Start from 11 weeks ago Monday
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + 1 - 77); // 11 weeks back, Monday
  for (let w = 0; w < 12; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w*7 + d);
      const key = dt.toISOString().split("T")[0];
      const isFuture = dt > today;
      days.push({ date:key, dt, workouts: byDate[key]||[], isFuture, isToday: key===today.toISOString().split("T")[0] });
    }
    weeks.push(days);
  }

  const DOW_LABELS = ["M","T","W","T","F","S","S"];

  return (
    <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 20px", ...style }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ fontSize:11, color:T.textDim, textTransform:"uppercase", letterSpacing:"1.2px" }}>Workout History · Last 12 Weeks</div>
        <div style={{ display:"flex", gap:10 }}>
          {[["Swim",T.swim],["Bike",T.bike],["Run",T.run],["SSM",T.ssm]].map(([l,c]) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:T.textDim }}>
              <div style={{ width:8, height:8, borderRadius:2, background:c, opacity:0.8 }}/>
              {l}
            </div>
          ))}
        </div>
      </div>
      {/* Day of week headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
        {DOW_LABELS.map((d,i) => (
          <div key={i} style={{ textAlign:"center", fontSize:9, color:T.textDim }}>{d}</div>
        ))}
      </div>
      {/* Week rows */}
      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
            {week.map((day, di) => {
              const hasLog = day.workouts.length > 0;
              const doms = [...new Set(day.workouts.map(w => (w.domain||"").toLowerCase()))];
              const tss = day.workouts.reduce((s,w) => s+(parseFloat(w.tss)||0), 0);
              // Color by primary domain
              const primaryDom = doms[0];
              const bg = hasLog ? (domCol[primaryDom] || T.textMuted) : "rgba(255,255,255,0.03)";
              const opacity = hasLog ? Math.min(0.3 + (tss/100)*0.7, 1) : 1;
              return (
                <div key={di} title={hasLog ? `${day.date}: ${doms.join("+")} ${tss ? `· ${Math.round(tss)} TSS` : ""}` : day.date}
                  style={{
                    height:14, borderRadius:3,
                    background: hasLog ? bg : "rgba(255,255,255,0.03)",
                    opacity: day.isFuture ? 0.2 : hasLog ? opacity : 0.6,
                    border: day.isToday ? `1px solid ${T.amber}` : "none",
                    cursor: hasLog ? "pointer" : "default",
                    position:"relative",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* Month labels */}
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
        {[-10,-7,-4,-1].map(offset => {
          const d = new Date(today);
          d.setDate(today.getDate() + offset*7);
          return <div key={offset} style={{ fontSize:9, color:T.textDim }}>{d.toLocaleDateString("en-US",{month:"short"})}</div>;
        })}
      </div>
      {log.length === 0 && (
        <div style={{ textAlign:"center", padding:"20px 0", fontSize:13, color:T.textDim }}>
          No workouts logged yet — use + Log on any session to start building your history
        </div>
      )}
    </div>
  );
}

// ── Trends Sub-View ───────────────────────────────────────────────────────────
function TrendsSection({ appState }) {
  const [range, setRange] = useState("8w");
  const wlog = [...(appState?.workoutLog||[])].sort((a,b)=>new Date(a.date||a.loggedAt)-new Date(b.date||b.loggedAt));
  const dlog = [...(appState?.dailyLog||[])].sort((a,b)=>b.date>a.date?1:-1);

  // Helpers
  const pn = v => parseFloat(String(v||"0").replace(/[^0-9.]/g,""))||0;
  const parseMinsLocal = s => { if(!s) return 0; const str=String(s); if(str.includes(":")){const p=str.split(":").map(Number);return p[0]*60+(p[1]||0);} const n=parseFloat(str); return isNaN(n)?0:(str.toLowerCase().includes("h")?n*60:n); };
  const rangeWks = range==="4w"?4:range==="12w"?12:range==="Season"?20:8;
  const weekAgo = n => { const d=new Date(); d.setDate(d.getDate()-n*7); d.setHours(0,0,0,0); return d; };

  // Build weekly buckets
  const weeks = Array.from({length:rangeWks},(_,wi) => {
    const start = weekAgo(rangeWks-1-wi);
    const end   = weekAgo(rangeWks-2-wi);
    const logs  = wlog.filter(x => { const d=new Date((x.date||x.loggedAt||"")+"T12:00:00"); return d>=start && d<end; });
    return {
      label: start.toLocaleDateString("en-US",{month:"short",day:"numeric"}),
      tss:   Math.round(logs.reduce((s,e)=>s+(parseFloat(e.tss)||0),0)),
      if_:   logs.filter(e=>e.if_).length ? parseFloat((logs.filter(e=>e.if_).reduce((s,e)=>s+parseFloat(e.if_||0),0)/logs.filter(e=>e.if_).length).toFixed(2)) : 0,
      vol:   parseFloat((logs.reduce((s,e)=>s+parseMinsLocal(e.duration),0)/60).toFixed(1)),
      sessions: logs.length,
    };
  });

  const norm = (arr, ceil) => { const mx=Math.max(...arr, ceil||1); return arr.map(v=>Math.round((v/mx)*72)+4); };
  const weeklyTSS = weeks.map(w=>w.tss);
  const weeklyVol = weeks.map(w=>w.vol);
  const weeklyIF  = weeks.map(w=>w.if_);

  // Domain breakdowns from full log
  const byDom = dom => wlog.filter(e=>(e.domain||"").toLowerCase()===dom);
  const swimLog = byDom("swim"); const bikeLog = byDom("bike");
  const runLog  = byDom("run");  const ssmLog  = byDom("ssm");

  // Current week
  const thisWeekStart = weekAgo(0); thisWeekStart.setDate(new Date().getDate()-new Date().getDay());
  const thisWeek = wlog.filter(x=>new Date((x.date||x.loggedAt||"")+"T12:00:00")>=thisWeekStart);
  const twTSS = Math.round(thisWeek.reduce((s,e)=>s+(parseFloat(e.tss)||0),0));
  const twIF  = thisWeek.filter(e=>e.if_).length ? parseFloat((thisWeek.filter(e=>e.if_).reduce((s,e)=>s+parseFloat(e.if_||0),0)/thisWeek.filter(e=>e.if_).length).toFixed(2)) : null;
  const twVol = parseFloat((thisWeek.reduce((s,e)=>s+parseMinsLocal(e.duration),0)/60).toFixed(1));

  const tssTgt = appState?.weekStats?.tssTgt || appState?.athlete?.weeklyCap && appState.athlete.weeklyCap * 45 || 310;
  const hrv14  = dlog.slice(0,14).reverse().map(e=>e.hrv).filter(Boolean);
  const sleep7 = dlog.slice(0,7).map(e=>e.sleep).filter(Boolean);
  const avgSleep = sleep7.length ? (sleep7.reduce((s,v)=>s+v,0)/sleep7.length).toFixed(1) : null;

  // Mini sparkline SVG
  const Spark = ({data, color, width=120, height=36, target}) => {
    if (!data || data.length < 2) return <div style={{width,height,opacity:0.2,background:`${color}11`,borderRadius:4}}/>;
    const norm2 = arr => { const mx=Math.max(...arr,1); return arr.map(v=>(v/mx)*(height-6)+3); };
    const pts = norm2(data);
    const points = pts.map((y,i)=>`${i*(width/(pts.length-1))},${height-y}`).join(" ");
    const poly   = points + ` ${width},${height} 0,${height}`;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{overflow:"visible"}}>
        <defs><linearGradient id={`sp-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient></defs>
        <polygon points={poly} fill={`url(#sp-${color.replace("#","")})`}/>
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx={pts.length>1?((pts.length-1)*(width/(pts.length-1))):0} cy={height-pts[pts.length-1]} r="3" fill={color}/>
      </svg>
    );
  };

  // Stat pill
  const Pill = ({label, value, color}) => (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:52}}>
      <div style={{fontSize:18,fontWeight:300,color:color||T.text,lineHeight:1}}>{value}</div>
      <div style={{fontSize:9,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.8px"}}>{label}</div>
    </div>
  );

  // Domain row
  const domStats = [
    { dom:"Swim", col:T.swim, logs:swimLog, unit:"m",  metric: e=>pn(e.distance), metricLabel:"Dist", latest: swimLog.at(-1)?.distance ? String(swimLog.at(-1).distance).replace(/[^0-9.km]/g,"") : "—" },
    { dom:"Bike", col:T.bike, logs:bikeLog, unit:"mi", metric: e=>parseMinsLocal(e.duration), metricLabel:"Dur", latest: bikeLog.at(-1)?.duration || "—" },
    { dom:"Run",  col:T.run,  logs:runLog,  unit:"km", metric: e=>parseMinsLocal(e.duration), metricLabel:"Dur", latest: runLog.at(-1)?.duration  || "—" },
    { dom:"SSM",  col:T.ssm,  logs:ssmLog,  unit:"",   metric: e=>parseMinsLocal(e.duration), metricLabel:"Dur", latest: ssmLog.at(-1)?.duration  || "—" },
  ].map(d => ({
    ...d,
    sessions: d.logs.length,
    avgTSS:   d.logs.length ? Math.round(d.logs.reduce((s,e)=>s+(parseFloat(e.tss)||0),0)/d.logs.length) : null,
    avgIF:    d.logs.filter(e=>e.if_).length ? parseFloat((d.logs.filter(e=>e.if_).reduce((s,e)=>s+parseFloat(e.if_||0),0)/d.logs.filter(e=>e.if_).length).toFixed(2)) : null,
    trend:    d.logs.length >= 4 ? (() => { const h=d.logs.slice(-4).map(d.metric); const a=h.slice(0,2).reduce((s,v)=>s+v,0)/2; const b=h.slice(2).reduce((s,v)=>s+v,0)/2; return b>a*1.05?"↑":b<a*0.95?"↓":"→"; })() : "→",
    sparkData: d.logs.slice(-rangeWks).map(d.metric),
  }));

  return (
    <div style={{padding:24,overflowY:"auto",height:"100%"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h2 style={{color:T.text,fontSize:20,fontWeight:500,marginBottom:2}}>Trends</h2>
          <p style={{color:T.textMuted,fontSize:13}}>{appState?.block?.name} · {wlog.length} sessions logged</p>
        </div>
        <div style={{display:"flex",gap:6}}>
          {["4w","8w","12w","Season"].map(r => (
            <button key={r} onClick={()=>setRange(r)}
              style={{padding:"4px 12px",borderRadius:12,border:`1px solid ${range===r?T.amberBorder:T.border}`,background:range===r?T.amberGlow:"transparent",color:range===r?T.amber:T.textMuted,cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>{r}</button>
          ))}
        </div>
      </div>

      {/* ── Row 1: This-week snapshot + Load chart ── */}
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:14,marginBottom:14}}>

        {/* This week summary */}
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 18px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{fontSize:10,color:T.textDim,textTransform:"uppercase",letterSpacing:"1.2px"}}>This Week</div>
          <div style={{display:"flex",gap:0,justifyContent:"space-between"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:300,color:twTSS>0?T.amber:T.textDim,lineHeight:1}}>{twTSS||"—"}</div>
              <div style={{fontSize:9,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.8px",marginTop:3}}>TSS</div>
              <div style={{fontSize:10,color:T.textDim,marginTop:2}}>/ {tssTgt}</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,0.06)"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:300,color:twIF?T.swim:T.textDim,lineHeight:1}}>{twIF||"—"}</div>
              <div style={{fontSize:9,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.8px",marginTop:3}}>Avg IF</div>
              <div style={{fontSize:10,color:T.textDim,marginTop:2}}>0.75–0.85</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,0.06)"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:300,color:twVol>0?T.run:T.textDim,lineHeight:1}}>{twVol||"—"}</div>
              <div style={{fontSize:9,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.8px",marginTop:3}}>Hours</div>
              <div style={{fontSize:10,color:T.textDim,marginTop:2}}>/ {appState?.athlete?.weeklyCap||7}</div>
            </div>
          </div>
          {/* Progress bar */}
          {twTSS > 0 && (
            <div>
              <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                <div style={{width:`${Math.min(twTSS/tssTgt*100,100)}%`,height:"100%",background:T.amber,borderRadius:2,transition:"width 0.5s"}}/>
              </div>
              <div style={{fontSize:10,color:T.textDim,marginTop:4}}>{Math.round(twTSS/tssTgt*100)}% of weekly TSS target</div>
            </div>
          )}
          {/* HRV + Sleep */}
          <div style={{display:"flex",gap:10,paddingTop:10,borderTop:`1px solid rgba(255,255,255,0.06)`}}>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:300,color:hrv14.at(-1)?T.ssm:T.textDim}}>{hrv14.at(-1)||"—"}</div>
              <div style={{fontSize:9,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.8px"}}>HRV ms</div>
            </div>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:300,color:avgSleep?T.swim:T.textDim}}>{avgSleep||"—"}</div>
              <div style={{fontSize:9,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.8px"}}>Sleep hr</div>
            </div>
          </div>
        </div>

        {/* Load chart — TSS + IF over range */}
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 20px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:10,color:T.textDim,textTransform:"uppercase",letterSpacing:"1.2px"}}>Weekly Load — {range}</div>
            <div style={{display:"flex",gap:12,fontSize:10,color:T.textDim}}>
              <span style={{color:T.amber}}>■ TSS</span>
              <span style={{color:T.swim}}>■ IF (×100)</span>
              <span style={{color:T.run}}>■ Volume hr</span>
            </div>
          </div>
          <svg width="100%" height="100" viewBox={`0 0 ${rangeWks*40} 100`} preserveAspectRatio="none" style={{overflow:"visible"}}>
            <defs>
              <linearGradient id="tssGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.amber} stopOpacity="0.2"/><stop offset="100%" stopColor={T.amber} stopOpacity="0"/></linearGradient>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.run} stopOpacity="0.15"/><stop offset="100%" stopColor={T.run} stopOpacity="0"/></linearGradient>
            </defs>
            {weeklyTSS.some(v=>v>0) && (() => {
              const pts = norm(weeklyTSS, tssTgt);
              const W = rangeWks*40;
              const points = pts.map((y,i)=>`${i*(W/(pts.length-1))},${100-y}`).join(" ");
              return (<>
                <polygon points={points+` ${W},100 0,100`} fill="url(#tssGrad)"/>
                <polyline points={points} fill="none" stroke={T.amber} strokeWidth="2" strokeLinejoin="round"/>
              </>);
            })()}
            {weeklyVol.some(v=>v>0) && (() => {
              const pts = norm(weeklyVol, appState?.athlete?.weeklyCap||7);
              const W = rangeWks*40;
              const points = pts.map((y,i)=>`${i*(W/(pts.length-1))},${100-y}`).join(" ");
              return <polyline points={points} fill="none" stroke={T.run} strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="3 2"/>;
            })()}
            {/* Week labels */}
            {weeks.map((w,i) => (
              <text key={i} x={i*(rangeWks*40/(rangeWks-1))} y="112" fontSize="7" fill={T.textDim} textAnchor="middle">{w.label}</text>
            ))}
          </svg>
        </div>
      </div>

      {/* ── Row 2: Domain cards ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {domStats.map(d => (
          <div key={d.dom} style={{background:T.bgCard,border:`1px solid ${d.col}22`,borderRadius:12,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:d.col,borderRadius:"12px 0 0 12px"}}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:600,color:d.col,letterSpacing:"0.5px"}}>{d.dom}</div>
              <div style={{fontSize:12,color:d.trend==="↑"?T.success:d.trend==="↓"?T.danger:T.textDim,fontWeight:600}}>{d.trend}</div>
            </div>
            <div style={{display:"flex",gap:12,marginBottom:10}}>
              <div>
                <div style={{fontSize:10,color:T.textDim}}>Sessions</div>
                <div style={{fontSize:18,fontWeight:300,color:T.text}}>{d.sessions}</div>
              </div>
              <div>
                <div style={{fontSize:10,color:T.textDim}}>Avg TSS</div>
                <div style={{fontSize:18,fontWeight:300,color:T.amber}}>{d.avgTSS||"—"}</div>
              </div>
              <div>
                <div style={{fontSize:10,color:T.textDim}}>Avg IF</div>
                <div style={{fontSize:18,fontWeight:300,color:T.swim}}>{d.avgIF||"—"}</div>
              </div>
            </div>
            <div style={{marginBottom:6}}>
              <div style={{fontSize:10,color:T.textDim,marginBottom:3}}>Latest: {d.latest}</div>
              <Spark data={d.sparkData} color={d.col} width={160} height={28}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 3: HRV + Sleep ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px"}}>
          <div style={{fontSize:10,color:T.textDim,textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:10}}>HRV · 14-Day Rolling</div>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:8}}>
            <div><div style={{fontSize:28,fontWeight:300,color:T.ssm,lineHeight:1}}>{hrv14.at(-1)||"—"}</div><div style={{fontSize:10,color:T.textDim}}>ms latest · gate {appState?.athlete?.hrvGate||44}ms</div></div>
            {hrv14.length>1 && <Spark data={hrv14} color={T.ssm} width={180} height={36}/>}
          </div>
          {hrv14.length>0 && <div style={{fontSize:11,color:T.textDim}}>7-day avg: {(hrv14.slice(-7).reduce((s,v)=>s+v,0)/Math.min(hrv14.slice(-7).length,7)).toFixed(0)}ms · 14-day avg: {(hrv14.reduce((s,v)=>s+v,0)/hrv14.length).toFixed(0)}ms</div>}
        </div>
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px"}}>
          <div style={{fontSize:10,color:T.textDim,textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:10}}>Sleep · 7-Day</div>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:8}}>
            <div><div style={{fontSize:28,fontWeight:300,color:T.swim,lineHeight:1}}>{avgSleep||"—"}</div><div style={{fontSize:10,color:T.textDim}}>hr avg · gate {appState?.athlete?.sleepGate||6.5}hr</div></div>
            {sleep7.length>1 && <Spark data={sleep7} color={T.swim} width={180} height={36}/>}
          </div>
          {sleep7.length>0 && <div style={{fontSize:11,color:T.textDim}}>{sleep7.filter(v=>v>=(appState?.athlete?.sleepGate||6.5)).length}/{sleep7.length} nights above gate · min {Math.min(...sleep7).toFixed(1)}hr</div>}
        </div>
      </div>

    </div>
  );
}


// ── DayPanel (slide-out) ──────────────────────────────────────────────────────
function DayPanel({ day, onClose, onToggleComplete, appState, setAppState, onLog }) {
  if (!day) return null;
  const isRest = !day.sessions?.length;
  const w = day.workout || {};
  // Find existing log entries for this day
  // Match by day name against current week dates
  const DOW_TO_IDX = { Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:0 };
  const dayName = (day.day||day.dow||"").slice(0,3);
  const thisWeekDates = (() => {
    const dates = {};
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach((d,i) => {
      const dt = new Date(sunday);
      dt.setDate(sunday.getDate() + i);
      dates[d] = dt.toISOString().split("T")[0];
    });
    return dates;
  })();
  const targetDate = thisWeekDates[dayName] || day.date;
  const existingLogs = (appState?.workoutLog||[]).filter(l => {
    const lDate = l.date || l.loggedAt?.split("T")[0];
    return lDate === targetDate;
  });
  const existingLog = existingLogs[0] || null;
  const handleComplete = async () => {
    const newCompleted = !day.completed;
    const newWeek = appState.week.map(d => d.day===day.day ? { ...d, completed:newCompleted } : d);
    const newState = { ...appState, week:newWeek, lastUpdated:new Date().toISOString().split("T")[0] };
    setAppState(newState);
    onToggleComplete(day.day, newCompleted);
    try { await pushState(newState); } catch(e) { console.error("Save failed:",e); }
  };
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:200, animation:"ctFade 0.15s ease" }} />
      {/* Centered modal popup */}
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:"min(580px, 92vw)", maxHeight:"80vh",
        background:T.bgDeep, border:`1px solid ${T.border}`, borderRadius:16,
        zIndex:201, display:"flex", flexDirection:"column",
        boxShadow:"0 24px 80px rgba(0,0,0,0.6)", animation:"ctFade 0.18s ease" }}>
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ color:T.textMuted, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>{day.day} · {w.duration||"—"}</div>
            <div style={{ color:T.text, fontSize:18, fontWeight:500 }}>{w.title||(isRest?"Full Rest":"Session")}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {!isRest && onLog && <Btn variant="primary" onClick={onLog} style={{ fontSize:11, padding:"5px 12px" }}>+ Log</Btn>}
            <button onClick={onClose} style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:8, width:32, height:32, color:T.textMuted, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
          </div>
        </div>
        {!isRest && (
          <div style={{ padding:"12px 24px", borderBottom:`1px solid ${T.border}`, display:"flex", gap:8 }}>
            {day.sessions.map((s,i) => (
              <div key={i} style={{ background:`${typeColor[s.type]}22`, border:`1px solid ${typeColor[s.type]}55`, borderRadius:20, padding:"4px 12px", display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:typeColor[s.type] }} />
                <span style={{ color:typeColor[s.type], fontSize:12, fontWeight:500 }}>{typeLabel[s.type]}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ flex:1, overflowY:"auto", padding:24 }}>
          {w.details?.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ color:T.amber, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Workout</div>
              <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 16px" }}>
                {w.details.map((line,i) =>
                  line==="" ? <div key={i} style={{ height:10 }} /> :
                  line.match(/^[A-Z].*—/)
                    ? <div key={i} style={{ color:T.amber, fontSize:12, fontWeight:500, marginTop:i>0?8:0, marginBottom:4 }}>{line}</div>
                    : <div key={i} style={{ display:"flex", gap:10, padding:"4px 0", borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ color:T.textMuted, fontSize:12, flexShrink:0, marginTop:1 }}>›</span>
                        <span style={{ color:T.text, fontSize:13, lineHeight:1.5 }}>{line}</span>
                      </div>
                )}
              </div>
            </div>
          )}
          {w.targets && w.targets!=="—" && (
            <div style={{ marginBottom:20 }}>
              <div style={{ color:T.amber, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Targets</div>
              <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 16px" }}>
                {w.targets.split(" · ").map((t,i) => (
                  <div key={i} style={{ display:"flex", gap:10, padding:"4px 0", borderBottom:i<w.targets.split(" · ").length-1?`1px solid ${T.border}`:"none" }}>
                    <span style={{ color:T.amber, fontSize:12, flexShrink:0 }}>→</span>
                    <span style={{ color:T.text, fontSize:13 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {w.coachingNote && (
            <div style={{ marginBottom:20 }}>
              <div style={{ color:T.amber, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Coach T Note</div>
              <div style={{ background:"rgba(232,185,106,0.06)", border:`1px solid rgba(232,185,106,0.2)`, borderRadius:10, padding:"14px 16px" }}>
                <div style={{ color:T.text, fontSize:13, lineHeight:1.7, fontStyle:"italic" }}>"{w.coachingNote}"</div>
              </div>
            </div>
          )}
          {isRest && (
            <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:20, textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🛑</div>
              <div style={{ color:T.text, fontSize:15, fontWeight:500, marginBottom:8 }}>Protected Rest Day</div>
              <div style={{ color:T.textMuted, fontSize:13, lineHeight:1.6 }}>{w.coachingNote}</div>
            </div>
          )}
        </div>
        {/* Existing log summary */}
        {existingLog && (
          <div style={{ margin:"0 24px 16px", background:"rgba(160,216,64,0.07)", border:`1px solid rgba(160,216,64,0.2)`, borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontSize:10, color:T.success, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>✓ Logged</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {existingLog.duration && <span style={{ fontSize:12, color:T.textMuted }}>{existingLog.duration}</span>}
              {existingLog.distance && <span style={{ fontSize:12, color:T.textMuted }}>· {existingLog.distance}</span>}
              {existingLog.avgHR    && <span style={{ fontSize:12, color:T.textMuted }}>· {existingLog.avgHR} bpm</span>}
              {existingLog.tss      && <span style={{ fontSize:13, fontWeight:600, color:T.amber }}>· {Math.round(parseFloat(existingLog.tss))} TSS</span>}
              {existingLog.if_      && <span style={{ fontSize:13, fontWeight:600, color:T.swim }}>· IF {parseFloat(existingLog.if_).toFixed(2)}</span>}
              {existingLog.rpe      && <span style={{ fontSize:12, color:T.textMuted }}>· RPE {existingLog.rpe}</span>}
            </div>
            {existingLog.notes && <div style={{ fontSize:12, color:T.textDim, marginTop:6, fontStyle:"italic" }}>{existingLog.notes}</div>}
          </div>
        )}
        {!isRest && day.completed!==null && (
          <div style={{ padding:"16px 24px", borderTop:`1px solid ${T.border}` }}>
            <button onClick={handleComplete} style={{ width:"100%", padding:13, borderRadius:10, border:`1px solid ${day.completed?T.success:T.border}`, background:day.completed?`${T.success}22`:T.bgCard, color:day.completed?T.success:T.textMuted, fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s" }}>
              <span style={{ fontSize:16 }}>{day.completed?"✓":"○"}</span>
              {day.completed?"Session Complete":"Mark as Complete"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Daily Log Section ─────────────────────────────────────────────────────────
function DailyLog({ appState, setAppState, systemPrompt, messages, setMessages }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ date:today, hrv:"", sleep:"", restingHR:"", sleepQuality:"", energy:"5", stress:"5", mood:"5", notes:"" });
  const [fieldImages, setFieldImages] = useState({ sleep:[], hrv:[], general:[] });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [coachReply, setCoachReply] = useState(null);
  const fileRefs = { hrv:useRef(null), sleep:useRef(null), general:useRef(null) };

  const VALID_MT = ["image/jpeg","image/png","image/gif","image/webp"];
  const normMT = (t) => VALID_MT.includes(t) ? t : "image/png";

  const readFile = (file) => new Promise((res) => {
    const reader = new FileReader();
    reader.onload = () => res({ preview:reader.result, name:file.name, base64:reader.result.split(",")[1], mediaType:normMT(file.type) });
    reader.readAsDataURL(file);
  });

  const addToField = async (field, files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    const loaded = await Promise.all(valid.map(readFile));
    setFieldImages(p => ({...p, [field]: [...p[field], ...loaded]}));
  };

  const handleFileInput = (field, e) => {
    if (e.target.files?.length) addToField(field, e.target.files);
    e.target.value = "";
  };

  const removeFieldImage = (field, idx) => {
    setFieldImages(p => ({...p, [field]: p[field].filter((_,i) => i !== idx)}));
  };

  const totalImages = Object.values(fieldImages).reduce((s, arr) => s + arr.length, 0);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    setCoachReply(null);

    // Build log entry
    const entry = {
      date:        form.date,
      hrv:         form.hrv   ? parseFloat(form.hrv)   : null,
      sleep:       form.sleep ? parseFloat(form.sleep) : null,
      restingHR:   form.restingHR ? parseFloat(form.restingHR) : null,
      sleepQuality: form.sleepQuality || null,
      energy:      parseInt(form.energy),
      stress:      parseInt(form.stress),
      mood:        parseInt(form.mood),

      notes:       form.notes,
      imageCount:  totalImages,
      loggedAt:    new Date().toISOString(),
    };

    // Merge into dailyLog (replace same date if exists)
    const updatedLog = [...(appState?.dailyLog || []).filter(e => e.date !== entry.date), entry]
      .sort((a,b) => b.date > a.date ? 1 : -1);

    // Update athlete.lastSleep so sidebar gate shows real data
    const newState = deepMerge(appState || {}, {
      dailyLog:    updatedLog,
      athlete:     { lastSleep: entry.sleep || appState?.athlete?.lastSleep },
      lastUpdated: new Date().toISOString().split("T")[0],
    });

    try {
      await pushState(newState);
      if (setAppState) setAppState(newState);
      setSaveStatus("saved");
    } catch(e) {
      setSaveStatus("error");
      setSaving(false);
      return;
    }

    // Build summary for Coach T
    const allImages = Object.values(fieldImages).flat();
    const last7 = updatedLog.slice(0,7);
    const avgHRV   = last7.filter(e=>e.hrv).length   ? (last7.filter(e=>e.hrv).reduce((s,e)=>s+e.hrv,0)/last7.filter(e=>e.hrv).length).toFixed(1)   : null;
    const avgSleep = last7.filter(e=>e.sleep).length ? (last7.filter(e=>e.sleep).reduce((s,e)=>s+e.sleep,0)/last7.filter(e=>e.sleep).length).toFixed(1) : null;

    const lines = [
      `Date: ${entry.date}`,
      entry.hrv      && `HRV: ${entry.hrv}ms`,
      entry.sleep    && `Sleep: ${entry.sleep}hr${entry.sleepQuality ? ` (${entry.sleepQuality})` : ""}`,
      `Energy: ${entry.energy}/10  |  Stress: ${entry.stress}/10  |  Mood: ${entry.mood}/10`,

      entry.notes    && `Notes: ${entry.notes}`,
      avgHRV         && `7-day avg HRV: ${avgHRV}ms`,
      avgSleep       && `7-day avg sleep: ${avgSleep}hr`,
    ].filter(Boolean).join("\n");

    const userText = allImages.length > 0
      ? `Daily log for ${entry.date} — ${allImages.length} screenshot(s) attached. Please extract sleep/HRV metrics from the images, assess recovery status, and flag any HRV suppressor effects. Manual readings:\n${lines}\n\nIf you can update fitness or recovery metrics in state, include a DASHBOARD_UPDATE block.`
      : `Daily log for ${entry.date}:\n${lines}\n\nPlease assess my recovery status, flag any concerns, and check gates. Include a DASHBOARD_UPDATE if any state fields should change.`;

    const userContent = allImages.length > 0
      ? [...allImages.map(img => ({ type:"image", source:{ type:"base64", media_type:img.mediaType, data:img.base64 }})), { type:"text", text:userText }]
      : userText;

    const userMsg = { role:"user", content:userContent, imageText:userText };
    const nextMsgs = [...(messages||[]), userMsg];

    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:900,
          system: systemPrompt + buildStateContext(newState),
          messages: nextMsgs.map(m => ({ role:m.role, content:m.content })) }),
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const reply = data.content?.find(b => b.type==="text")?.text || "";
      // Apply any DASHBOARD_UPDATE
      const match = reply.match(/DASHBOARD_UPDATE:\s*```(?:json)?\s*[\n\r]+([\s\S]*?)[\n\r]*```/);
      if (match) {
        try {
          const merged = deepMerge(newState, JSON.parse(match[1]));
          await pushState(merged);
          if (setAppState) setAppState(merged);
        } catch(e) { console.warn("DU parse fail", e); }
      }
      const clean = reply.replace(/DASHBOARD_UPDATE:\s*```json[\s\S]*?```/g, "").trim();
      setCoachReply(clean);
      if (setMessages) setMessages([...nextMsgs, { role:"assistant", content:reply }]);
    } catch(e) {
      setCoachReply("Daily log saved. Coach T couldn't be reached — discuss it in chat.");
    }
    setSaving(false);
  };

  const handleGlobalPaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith("image/"));
    if (!items.length) return;
    e.preventDefault();
    await addToField("general", items.map(i => i.getAsFile()).filter(Boolean));
  };

  const Slider = ({ label, name, min=1, max=10, color=T.amber }) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:12, color:T.textMuted }}>{label}</span>
        <span style={{ fontSize:14, fontWeight:500, color }}>{form[name]}/10</span>
      </div>
      <div style={{ display:"flex", gap:5 }}>
        {Array.from({length:max-min+1},(_,i)=>i+min).map(n => (
          <button key={n} onClick={() => setForm(f => ({...f, [name]:String(n)}))}
            style={{ flex:1, height:28, borderRadius:5, border:`1px solid ${String(n)===form[name]?color:"rgba(255,255,255,0.06)"}`, background:String(n)===form[name]?`${color}22`:"rgba(255,255,255,0.02)", color:String(n)===form[name]?color:T.textDim, cursor:"pointer", fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>{n}</button>
        ))}
      </div>
    </div>
  );

  const UploadField = ({ label, field, placeholder }) => {
    const imgs = fieldImages[field] || [];
    return (
      <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${imgs.length?T.amberBorder:T.border}`, borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:imgs.length?10:0 }}>
          <div style={{ fontSize:12, color:T.textMuted, fontWeight:500 }}>{label}</div>
          <div style={{ display:"flex", gap:8 }}>
            <input ref={fileRefs[field]} type="file" accept="image/*" multiple onChange={e => handleFileInput(field, e)} style={{ display:"none" }} />
            <Btn onClick={() => fileRefs[field]?.current?.click()} style={{ fontSize:10, padding:"3px 10px" }}>📎 Upload / Paste</Btn>
          </div>
        </div>
        {imgs.length > 0 ? (
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {imgs.map((img, i) => (
              <div key={i} style={{ position:"relative" }}>
                <img src={img.preview} alt={img.name} style={{ height:56, width:80, objectFit:"cover", borderRadius:6, border:`1px solid ${T.amberBorder}`, display:"block" }} />
                <button onClick={() => removeFieldImage(field, i)}
                  style={{ position:"absolute", top:-6, right:-6, width:18, height:18, borderRadius:"50%", background:T.danger, border:"2px solid #0a1020", color:"#fff", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>×</button>
              </div>
            ))}
            <div onClick={() => fileRefs[field]?.current?.click()}
              style={{ height:56, width:80, borderRadius:6, border:`2px dashed ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:20, color:T.textDim }}>+</div>
          </div>
        ) : (
          <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>{placeholder} · paste (⌘V) or tap Upload</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }} onPaste={handleGlobalPaste}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h2 style={{ color:T.text, fontSize:20, fontWeight:500, marginBottom:2 }}>Daily Log</h2>
          <p style={{ color:T.textMuted, fontSize:13 }}>Upload Garmin screenshots, paste images, or enter manually · saves to state + notifies Coach T</p>
        </div>
        <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date:e.target.value}))} style={{ width:"auto", padding:"6px 12px" }} />
      </div>

      <Card title="Upload Garmin / Device Screenshots">
        <UploadField label="Sleep Data" field="sleep" placeholder="Garmin Connect sleep screenshot" />
        <UploadField label="HRV Reading" field="hrv" placeholder="Garmin HRV status or any HRV app" />
        <UploadField label="Other Data" field="general" placeholder="Any other training or health screenshot" />
      </Card>

      <Card title="Manual Entry">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, color:T.textMuted, marginBottom:5 }}>HRV (ms)</div>
            <input type="number" value={form.hrv} onChange={e => setForm(f => ({...f, hrv:e.target.value}))} placeholder="e.g. 52" />
          </div>
          <div>
            <div style={{ fontSize:11, color:T.textMuted, marginBottom:5 }}>Sleep (hrs)</div>
            <input type="number" value={form.sleep} step="0.1" onChange={e => setForm(f => ({...f, sleep:e.target.value}))} placeholder="e.g. 7.4" />
          </div>
          <div>
            <div style={{ fontSize:11, color:T.textMuted, marginBottom:5 }}>Resting HR (bpm)</div>
            <input type="number" value={form.restingHR} onChange={e => setForm(f => ({...f, restingHR:e.target.value}))} placeholder="e.g. 53" />
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:T.textMuted, marginBottom:8 }}>Sleep Quality</div>
          <div style={{ display:"flex", gap:8 }}>
            {["Poor","Fair","Good","Great"].map(q => (
              <button key={q} onClick={() => setForm(f => ({...f, sleepQuality:q}))}
                style={{ flex:1, padding:"7px 0", borderRadius:8, border:`1px solid ${form.sleepQuality===q?T.amberBorder:T.border}`, background:form.sleepQuality===q?T.amberGlow:"rgba(255,255,255,0.02)", color:form.sleepQuality===q?T.amber:T.textMuted, cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>{q}</button>
            ))}
          </div>
        </div>
        <Slider label="Energy Level" name="energy" color={T.run} />
        <Slider label="Stress Level" name="stress" color={T.danger} />
        <Slider label="Mood" name="mood" color={T.swim} />

        <div>
          <div style={{ fontSize:11, color:T.textMuted, marginBottom:5 }}>Notes</div>
          <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} placeholder="How do you feel? Any context for today…" rows={3}
            style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 12px", color:T.text, fontSize:13, resize:"none", outline:"none", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5 }} />
        </div>
      </Card>

      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <Btn variant="primary" onClick={handleSave} disabled={saving} style={{ flex:1, padding:"11px 0", fontSize:13 }}>
          {saving ? "Saving & notifying Coach T…" : totalImages > 0 ? `Save & Send ${totalImages} Screenshot${totalImages>1?"s":""} to Coach T` : "Save Daily Log"}
        </Btn>
      </div>

      {saveStatus==="saved" && !coachReply && (
        <div style={{ padding:"10px 14px", background:"rgba(141,200,48,0.08)", border:"1px solid rgba(141,200,48,0.2)", borderRadius:8, fontSize:12, color:T.success, marginBottom:12 }}>
          ✓ Saved to state · Coach T reviewing…
        </div>
      )}
      {saveStatus==="error" && (
        <div style={{ padding:"10px 14px", background:"rgba(240,120,104,0.08)", border:"1px solid rgba(240,120,104,0.2)", borderRadius:8, fontSize:12, color:T.danger, marginBottom:12 }}>
          Save failed — check connection
        </div>
      )}
      {coachReply && (
        <div style={{ background:"rgba(232,185,106,0.06)", border:`1px solid rgba(232,185,106,0.2)`, borderRadius:10, padding:"14px 16px", animation:"ctFade 0.3s ease" }}>
          <div style={{ fontSize:10, color:T.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Coach T · Daily Review</div>
          <div style={{ fontSize:13, color:T.text, lineHeight:1.65, whiteSpace:"pre-wrap" }}>{coachReply}</div>
        </div>
      )}
    </div>
  );
}

// ── Daily History Sub-View ────────────────────────────────────────────────────
function DailyHistory({ appState }) {
  const data = [...(appState?.dailyLog || [])].sort((a,b) => b.date > a.date ? 1 : -1);

  const avgHRV   = data.filter(d=>d.hrv).length   ? Math.round(data.filter(d=>d.hrv).reduce((s,d)=>s+d.hrv,0)/data.filter(d=>d.hrv).length)    : null;
  const avgSleep = data.filter(d=>d.sleep).length ? (data.filter(d=>d.sleep).reduce((s,d)=>s+d.sleep,0)/data.filter(d=>d.sleep).length).toFixed(1) : null;
  const avgEnergy= data.filter(d=>d.energy).length? (data.filter(d=>d.energy).reduce((s,d)=>s+d.energy,0)/data.filter(d=>d.energy).length).toFixed(1) : null;
  const avgStress= data.filter(d=>d.stress).length? (data.filter(d=>d.stress).reduce((s,d)=>s+d.stress,0)/data.filter(d=>d.stress).length).toFixed(1) : null;

  const qColor = q => ({Poor:T.danger, Fair:T.amber, Good:T.success, Great:"#5aabf5"}[q] || T.textDim);

  if (data.length === 0) return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <h2 style={{ color:T.text, fontSize:20, fontWeight:500, marginBottom:4 }}>Daily History</h2>
      <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12, padding:32, textAlign:"center", color:T.textMuted, fontSize:13, marginTop:20 }}>
        No daily logs yet — use Daily → Log to start tracking HRV, sleep, and wellness.
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Stat strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, padding:"16px 20px 0", flexShrink:0 }}>
        {[
          { label:"Avg HRV",    value:avgHRV   ? `${avgHRV}ms`     : "—", color:T.ssm,    sub:`${data.filter(d=>d.hrv).length} readings` },
          { label:"Avg Sleep",  value:avgSleep ? `${avgSleep}hr`   : "—", color:T.swim,   sub:`gate 6.5hr` },
          { label:"Avg Energy", value:avgEnergy ? `${avgEnergy}`   : "—", color:T.run,    sub:"out of 10" },
          { label:"Avg Stress", value:avgStress ? `${avgStress}`   : "—", color:T.danger, sub:"out of 10" },
        ].map(({label,value,color,sub}) => (
          <div key={label} style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 18px" }}>
            <div style={{ fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:30, fontWeight:300, color, lineHeight:1, marginBottom:4 }}>{value}</div>
            <div style={{ fontSize:10, color:T.textDim }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Column header */}
      <div style={{ display:"flex", alignItems:"center", padding:"10px 20px", borderBottom:`1px solid ${T.border}`, flexShrink:0, marginTop:14 }}>
        <div style={{ width:90, flexShrink:0, fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px" }}>Date</div>
        <div style={{ flex:1, fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"1px" }}>Notes</div>
        <div style={{ display:"flex", gap:0 }}>
          {[["HRV",T.ssm],["Sleep",T.swim],["Energy",T.run],["Stress",T.danger],["Mood",T.swim]].map(([l,c]) => (
            <div key={l} style={{ width:56, textAlign:"right", fontSize:9, color:c, textTransform:"uppercase", letterSpacing:"0.8px" }}>{l}</div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {data.map((d,i) => {
          const dateStr = new Date(d.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
          const dayStr  = new Date(d.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"});
          const sleepOk = d.sleep && d.sleep >= 6.5;
          const hrvOk   = d.hrv   && d.hrv   >= (appState?.athlete?.hrvGate||44);
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", padding:"11px 20px", borderBottom:`1px solid rgba(255,255,255,0.04)` }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

              {/* Date */}
              <div style={{ width:90, flexShrink:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:T.text }}>{dateStr}</div>
                <div style={{ fontSize:10, color:T.textDim, marginTop:1 }}>{dayStr}</div>
                {d.sleepQuality && (
                  <div style={{ fontSize:9, color:qColor(d.sleepQuality), marginTop:2, fontWeight:500 }}>{d.sleepQuality}</div>
                )}
              </div>

              {/* Notes */}
              <div style={{ flex:1, fontSize:12, color:T.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:12 }}>
                {d.notes || <span style={{color:"rgba(255,255,255,0.1)"}}>—</span>}
              </div>

              {/* Metrics */}
              <div style={{ display:"flex", gap:0, flexShrink:0 }}>
                <div style={{ width:56, textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:500, color:d.hrv ? (hrvOk?T.ssm:T.amber) : T.textDim }}>{d.hrv || "—"}</div>
                  {d.hrv && <div style={{ fontSize:8, color:T.textDim }}>{`${d.hrv}ms`}</div>}
                </div>
                <div style={{ width:56, textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:500, color:d.sleep ? (sleepOk?T.swim:T.danger) : T.textDim }}>{d.sleep ? `${d.sleep}hr` : "—"}</div>
                  {d.restingHR && <div style={{ fontSize:8, color:T.textDim }}>{d.restingHR} bpm</div>}
                </div>
                <div style={{ width:56, textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:500, color:d.energy ? T.run : T.textDim }}>{d.energy ?? "—"}</div>
                </div>
                <div style={{ width:56, textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:500, color:d.stress ? (d.stress<=3?T.success:d.stress<=6?T.amber:T.danger) : T.textDim }}>{d.stress ?? "—"}</div>
                </div>
                <div style={{ width:56, textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:500, color:T.textMuted }}>{d.mood ?? "—"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── Sleep & HRV Sub-View ──────────────────────────────────────────────────────
function SleepHRV({ appState }) {
  const log = [...(appState?.dailyLog || [])].sort((a,b)=>b.date>a.date?1:-1).slice(0,14).reverse();
  const hasData = log.length > 0;
  const HRV_GATE = 44, SLEEP_GATE = 7;
  const validHRV   = log.map(e=>e.hrv).filter(Boolean);
  const validSleep = log.map(e=>e.sleep).filter(Boolean);
  const latestHRV   = validHRV.at(-1)   ?? null;
  const latestSleep = validSleep.at(-1) ?? null;
  const avg7HRV   = validHRV.slice(-7).length   ? (validHRV.slice(-7).reduce((s,v)=>s+v,0)/validHRV.slice(-7).length).toFixed(1)   : null;
  const avg7Sleep = validSleep.slice(-7).length ? (validSleep.slice(-7).reduce((s,v)=>s+v,0)/validSleep.slice(-7).length).toFixed(1) : null;
  const sleepOK = validSleep.filter(v=>v>=SLEEP_GATE).length;
  const W=280, H=70;
  const n = Math.max(log.length,1);
  const cx = i => i*(W/Math.max(n-1,1));
  const hrvMin = validHRV.length ? Math.min(...validHRV)-4 : 40;
  const hrvMax = validHRV.length ? Math.max(...validHRV)+4 : 60;
  const hy = v => H - ((v-hrvMin)/(hrvMax-hrvMin))*(H-8) - 4;
  const sy = v => H - ((v-5)/(9-5))*(H-8) - 4;
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <h2 style={{ color:T.text, fontSize:20, fontWeight:500, marginBottom:4 }}>Sleep & HRV</h2>
      <p style={{ color:T.textMuted, fontSize:13, marginBottom:20 }}>14-day rolling · Your primary recovery indicators</p>
      {!hasData && (
        <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12, padding:24, textAlign:"center", color:T.textMuted, fontSize:13, marginBottom:16 }}>
          No data yet. Log daily HRV and sleep in Daily → Log to see trends here.
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <Card title="HRV — 14 Day" style={{ marginBottom:0 }}>
          <div style={{ fontSize:32, fontWeight:300, color:T.ssm, marginBottom:4 }}>{latestHRV??<span style={{color:T.textDim}}>—</span>}<span style={{ fontSize:14, color:T.textMuted }}> ms</span></div>
          <div style={{ fontSize:12, color:T.textMuted, marginBottom:12 }}>{avg7HRV?`7-day avg ${avg7HRV}ms`:"No data"} · Gate: {HRV_GATE}ms</div>
          <svg width="100%" height="70" viewBox={`0 0 ${W} ${H}`}>
            {hasData && <line x1="0" y1={hy(HRV_GATE)} x2={W} y2={hy(HRV_GATE)} stroke="rgba(240,120,104,0.35)" strokeWidth="1" strokeDasharray="4,3"/>}
            {log.length>1 && <polyline points={log.map((e,i)=>e.hrv?`${cx(i)},${hy(e.hrv)}`:null).filter(Boolean).join(" ")} fill="none" stroke={T.ssm} strokeWidth="1.5" strokeLinejoin="round"/>}
            {log.map((e,i)=>e.hrv?<circle key={i} cx={cx(i)} cy={hy(e.hrv)} r="3" fill={e.hrv<HRV_GATE?T.danger:T.ssm}/>:null)}
          </svg>
          <div style={{ fontSize:10, color:T.textDim, marginTop:6 }}>Red = below {HRV_GATE}ms gate</div>
        </Card>
        <Card title="Sleep Duration — 14 Day" style={{ marginBottom:0 }}>
          <div style={{ fontSize:32, fontWeight:300, color:T.swim, marginBottom:4 }}>{latestSleep??<span style={{color:T.textDim}}>—</span>}<span style={{ fontSize:14, color:T.textMuted }}> hr</span></div>
          <div style={{ fontSize:12, color:T.textMuted, marginBottom:12 }}>{avg7Sleep?`7-day avg ${avg7Sleep}hr`:"No data"} · Gate: {SLEEP_GATE}hr · {sleepOK}/{validSleep.length} days</div>
          <svg width="100%" height="70" viewBox={`0 0 ${W} ${H}`}>
            {hasData && <line x1="0" y1={sy(SLEEP_GATE)} x2={W} y2={sy(SLEEP_GATE)} stroke="rgba(90,171,245,0.35)" strokeWidth="1" strokeDasharray="4,3"/>}
            {log.map((e,i)=>e.sleep?<rect key={i} x={cx(i)-8} y={sy(e.sleep)} width={16} height={H-sy(e.sleep)} rx="2" fill={e.sleep<SLEEP_GATE?"rgba(240,120,104,0.5)":"rgba(90,171,245,0.4)"}/>:null)}
          </svg>
          <div style={{ fontSize:10, color:T.textDim, marginTop:6 }}>Red = below {SLEEP_GATE}hr gate</div>
        </Card>
      </div>
      <Card title="HRV Suppressors — Your Ranked Priority">
        {["Late large meals — digestive load","Late threshold training (within 2–3 hrs of bed)","Sleep fragmentation / heat"].map((item,i) => (
          <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ color:T.amber, fontWeight:500, fontSize:13, width:18, flexShrink:0 }}>{i+1}</span>
            <span style={{ color:T.text, fontSize:13 }}>{item}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Races Calendar ────────────────────────────────────────────────────────────
function RacesCalendar({ s }) {
  if (s === null || s === undefined) return <Loading />;
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <h2 style={{ color:T.text, fontSize:20, fontWeight:500, marginBottom:2 }}>Race Calendar</h2>
      <p style={{ color:T.textMuted, fontSize:13, marginBottom:20 }}>2026 Season · Capacity & Mastery Year · 70.3 moves to 2027</p>
      {(!s.races || s.races.length === 0) && (
        <div style={{ background:"rgba(255,255,255,0.02)", border:`1px dashed ${T.border}`, borderRadius:12, padding:"28px 20px", marginBottom:20, textAlign:"center" }}>
          <div style={{ fontSize:15, color:T.textMuted, marginBottom:8 }}>No races scheduled yet</div>
          <div style={{ fontSize:13, color:T.textDim, marginBottom:16 }}>Add your 2026 race calendar via Races → Manage, or tell Coach T.</div>
          <div style={{ fontSize:12, color:T.swim, fontStyle:"italic" }}>Try: "Add the Sprint Tri on April 12 as a C race"</div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        {(s.races||[]).map(r => {
          const days = daysUntil(r.date);
          const priCol = { A:T.danger, B:T.amber, C:T.bgCard };
          return (
            <div key={r.id} style={{ background:T.bgCard, border:`1px solid ${r.priority==="A"?T.amberBorder:T.border}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:14, opacity:r.done?0.45:1 }}>
              <div style={{ width:28, height:28, borderRadius:6, background:priCol[r.priority]||T.bgCard, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, color:r.priority==="C"?T.textMuted:T.bg, flexShrink:0 }}>{r.priority}</div>
              <div style={{ flex:1 }}>
                <div style={{ color:T.text, fontSize:14, fontWeight:500 }}>{r.name}</div>
                <div style={{ color:T.textMuted, fontSize:12, marginTop:2 }}>{fmtDate(r.date)} · {r.swim} / {r.bike} / {r.run}</div>
              </div>
              {r.done ? <div style={{ color:T.textMuted, fontSize:11, fontWeight:500 }}>DONE</div>
                : <div style={{ textAlign:"right" }}>
                    <div style={{ color:days<30?T.amber:T.text, fontSize:20, fontWeight:300, lineHeight:1 }}>{days}</div>
                    <div style={{ color:T.textMuted, fontSize:10 }}>days</div>
                  </div>
              }
            </div>
          );
        })}
      </div>
      {s.nextRaceGoals && (
        <Card title={`${s.nextRaceGoals.race} Goals`}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[["Bike",s.nextRaceGoals.bike],["Run",s.nextRaceGoals.run],["T1",s.nextRaceGoals.t1],["T2",s.nextRaceGoals.t2]].map(([l,v]) => (
              <div key={l} style={{ background:T.bgDeep, border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
                <div style={{ color:T.textMuted, fontSize:11, marginBottom:4 }}>{l}</div>
                <div style={{ color:T.amber, fontSize:14, fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ color:T.textMuted, fontSize:12, marginTop:12 }}>Swim: {s.nextRaceGoals.swim}</div>
        </Card>
      )}
    </div>
  );
}

// ── Races Manage ─────────────────────────────────────────────────────────────
// ── Race form helpers — defined OUTSIDE RacesManage to prevent focus loss ────
const makeBlank = () => ({ id:Date.now(), name:"", date:"", priority:"B", swim:"", bike:"", run:"", notes:"", done:false });

function RaceField({ label, name, type="text", placeholder="", form, setForm }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <div style={{ fontSize:11, color:T.textMuted }}>{label}</div>
      <input type={type} value={form[name]||""} placeholder={placeholder}
        style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 12px", color:T.text, fontSize:13, outline:"none", fontFamily:"'DM Sans',sans-serif", width:"100%", boxSizing:"border-box" }}
        onChange={e => setForm(f => ({...f, [name]:e.target.value}))} />
    </div>
  );
}

function RaceFormPanel({ form, setForm, onSave, onCancel, isEditing }) {
  return (
    <div style={{ background:"rgba(232,185,106,0.05)", border:`1px solid ${T.amberBorder}`, borderRadius:12, padding:20, marginBottom:16, animation:"ctFade 0.2s ease" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div style={{ gridColumn:"1/-1" }}>
          <RaceField label="Race Name" name="name" placeholder="e.g. Tri Rock Dallas Sprint" form={form} setForm={setForm} />
        </div>
        <RaceField label="Date" name="date" type="date" form={form} setForm={setForm} />
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <div style={{ fontSize:11, color:T.textMuted }}>Priority</div>
          <div style={{ display:"flex", gap:8 }}>
            {["A","B","C"].map(p => (
              <button key={p} onClick={() => setForm(f => ({...f, priority:p}))}
                style={{ flex:1, padding:"7px 0", borderRadius:8, border:`1px solid ${form.priority===p?T.amberBorder:T.border}`, background:form.priority===p?T.amberGlow:"rgba(255,255,255,0.02)", color:form.priority===p?T.amber:T.textMuted, cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>{p}</button>
            ))}
          </div>
        </div>
        <RaceField label="Swim" name="swim" placeholder="e.g. 750m"  form={form} setForm={setForm} />
        <RaceField label="Bike" name="bike" placeholder="e.g. 20km"  form={form} setForm={setForm} />
        <RaceField label="Run"  name="run"  placeholder="e.g. 5km"   form={form} setForm={setForm} />
        <div style={{ gridColumn:"1/-1" }}>
          <RaceField label="Notes / Goals" name="notes" placeholder="Race goals, travel, logistics…" form={form} setForm={setForm} />
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn onClick={onCancel} style={{ flex:1 }}>Cancel</Btn>
        <Btn variant="primary" onClick={onSave} style={{ flex:2 }}>
          {isEditing ? "Update Race" : "Add Race"}
        </Btn>
      </div>
    </div>
  );
}

function RacesManage({ appState, setAppState, systemPrompt, messages, setMessages }) {
  const [races, setRaces] = useState(appState?.races || []);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  
  const [form, setForm] = useState(makeBlank);
  const [saveStatus, setSaveStatus] = useState(null);
  const [coachReply, setCoachReply] = useState(null);

  const save = async (list, changeDesc) => {
    setRaces(list);
    const newState = { ...appState, races:list, lastUpdated:new Date().toISOString().split("T")[0] };
    setAppState(newState);
    setSaveStatus("saving"); setCoachReply(null);
    try { await pushState(newState); setSaveStatus("saved"); } catch(e) { console.error("Save failed:",e); setSaveStatus("error"); return; }
    if (!systemPrompt || !changeDesc) return;
    const raceSummary = list.map(r=>`${r.priority}: ${r.name} — ${r.date} (${[r.swim,r.bike,r.run].filter(Boolean).join("/")||"distances TBD"})`).join("\n");
    const userText = `Race calendar updated: ${changeDesc}\n\nFull race list:\n${raceSummary}\n\nPlease: (1) acknowledge the change, (2) flag any implications for training block structure, taper timing, or prep priorities, (3) note if any upcoming race within 12 weeks needs immediate attention. Include DASHBOARD_UPDATE if any priorities or block goals should change.`;
    const userMsg = { role:"user", content:userText };
    const nextMsgs = [...(messages||[]), userMsg];
    try {
      const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:600, system:systemPrompt+buildStateContext(newState), messages:nextMsgs.map(m=>({role:m.role,content:m.content})) }) });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const reply = data.content?.find(b=>b.type==="text")?.text||"";
      const match = reply.match(/DASHBOARD_UPDATE:\s*```(?:json)?\s*[\n\r]+([\s\S]*?)[\n\r]*```/);
      if (match) { try { const merged=deepMerge(newState,JSON.parse(match[1])); await pushState(merged); if(setAppState)setAppState(merged); } catch {} }
      setCoachReply(reply.replace(/DASHBOARD_UPDATE:\s*```json[\s\S]*?```/g,"").trim());
      if (setMessages) setMessages([...nextMsgs, { role:"assistant", content:reply }]);
    } catch(e) { setCoachReply("Race saved. Coach T will factor this in your next chat."); }
  };

  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h2 style={{ color:T.text, fontSize:20, fontWeight:500, marginBottom:2 }}>Manage Races</h2>
          <p style={{ color:T.textMuted, fontSize:13 }}>Add, edit, or remove races from your season calendar</p>
        </div>
        <Btn variant="primary" onClick={() => { setAdding(true); setEditing(null); setForm(makeBlank()); }}>+ Add Race</Btn>
      </div>
      {adding && (
        <RaceFormPanel
          form={form} setForm={setForm} isEditing={false}
          onSave={() => { save([...races, {...form, id:Date.now()}], `Added: ${form.name} on ${form.date} (Priority ${form.priority})`); setAdding(false); setForm(makeBlank()); }}
          onCancel={() => { setAdding(false); setForm(makeBlank()); }}
        />
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {races.map((r,i) => (
          <div key={r.id||i}>
            {editing===r.id ? (
              <RaceFormPanel
                form={form} setForm={setForm} isEditing={true}
                onSave={() => { save(races.map(x => x.id===r.id ? {...form, id:r.id} : x), `Updated: ${form.name} on ${form.date}`); setEditing(null); setForm(makeBlank()); }}
                onCancel={() => { setEditing(null); setForm(makeBlank()); }}
              />
            ) : (
              <div style={{ background:T.bgCard, border:`1px solid ${r.priority==="A"?T.amberBorder:T.border}`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:26, height:26, borderRadius:6, background:{A:T.danger,B:T.amber,C:T.bgDeep}[r.priority], display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:{A:T.bg,B:T.bg,C:T.textMuted}[r.priority], flexShrink:0 }}>{r.priority}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:T.text, fontSize:14, fontWeight:500 }}>{r.name}</div>
                  <div style={{ color:T.textMuted, fontSize:12, marginTop:2 }}>{fmtDate(r.date)} · {r.swim} / {r.bike} / {r.run}</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <Btn onClick={() => { setEditing(r.id); setAdding(false); setForm({...r}); }}>Edit</Btn>
                  <Btn variant="danger" onClick={() => save(races.filter(x => x.id!==r.id), `Removed: ${r.name}`)}>Remove</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {races.length===0 && !adding && (
        <div style={{ textAlign:"center", padding:40, color:T.textMuted, fontSize:14 }}>No races added yet. Click + Add Race to get started.</div>
      )}
      {saveStatus==="saving" && <div style={{ marginTop:10, fontSize:12, color:T.amber }}>Saving and notifying Coach T…</div>}
      {saveStatus==="error"  && <div style={{ marginTop:10, fontSize:12, color:T.danger }}>Save failed — check connection</div>}
      {coachReply && (
        <div style={{ marginTop:16, background:"rgba(232,185,106,0.06)", border:`1px solid ${T.amberBorder}`, borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontSize:10, color:T.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Coach T · Race Update</div>
          <div style={{ fontSize:13, color:T.text, lineHeight:1.65, whiteSpace:"pre-wrap" }}>{coachReply}</div>
        </div>
      )}
    </div>
  );
}

// ── Athlete Profile ───────────────────────────────────────────────────────────
function AthleteProfile({ s, setAppState }) {
  if (!s) return <Loading />;
  const a = s.athlete||{};
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (field, currentVal) => { setEditing(field); setEditVal(String(currentVal||"")); };
  const saveEdit  = async (field) => {
    if (!editVal.trim() || !setAppState) { setEditing(null); return; }
    setSaving(true);
    const patch = { athlete: { [field]: isNaN(parseFloat(editVal)) ? editVal : parseFloat(editVal) } };
    const merged = deepMerge(s, { ...patch, lastUpdated: new Date().toISOString().split("T")[0] });
    try {
      await pushState(merged);
      setAppState(merged);
    } catch(e) { console.error("Save failed:", e); }
    setSaving(false);
    setEditing(null);
  };

  const StatCard = ({ label, field, value, unit }) => (
    <div onClick={() => !editing && startEdit(field, value)}
      style={{ background:T.bgCard, border:`1px solid ${editing===field?T.amberBorder:T.border}`, borderRadius:12, padding:"12px 14px", cursor:"pointer", position:"relative" }}
      title="Click to edit">
      <div style={{ color:T.textMuted, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{label}</div>
      {editing === field ? (
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <input autoFocus type="text" value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => { if(e.key==="Enter") saveEdit(field); if(e.key==="Escape") setEditing(null); }}
            style={{ width:"100%", background:"rgba(255,255,255,0.08)", border:"none", borderBottom:`1px solid ${T.amber}`, outline:"none", color:T.amber, fontSize:18, fontWeight:300, fontFamily:"'DM Sans',sans-serif", padding:"2px 0" }}/>
          <button onClick={() => saveEdit(field)} style={{ background:T.amberGlow, border:`1px solid ${T.amberBorder}`, borderRadius:6, padding:"3px 8px", color:T.amber, fontSize:11, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>{saving?"…":"✓"}</button>
          <button onClick={() => setEditing(null)} style={{ background:"none", border:"none", color:T.textDim, cursor:"pointer", fontSize:14 }}>✕</button>
        </div>
      ) : (
        <div style={{ display:"flex", alignItems:"baseline", gap:3, justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:3 }}>
            <span style={{ color:value!=null&&value!==""?T.amber:T.textDim, fontSize:22, fontWeight:300, lineHeight:1 }}>{value!=null&&value!==""?value:"—"}</span>
            <span style={{ color:T.textMuted, fontSize:11 }}>{unit}</span>
          </div>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.15)" }}>✎</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h2 style={{ color:T.text, fontSize:20, fontWeight:500, marginBottom:2 }}>{a.name}</h2>
          <p style={{ color:T.textMuted, fontSize:13 }}>{a.age} · Keller, TX · Age Group Athlete · {s.block?.name}</p>
        </div>
        <div style={{ fontSize:11, color:T.textDim }}>Click any metric to edit</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
        <StatCard label="Weight"     field="weight"    value={a.weight}    unit="lb" />
        <StatCard label="Bike FTP"   field="ftp"       value={a.ftp}       unit="W" />
        <StatCard label="Run LTHR"   field="lthr"      value={a.lthr}      unit="bpm" />
        <StatCard label="Resting HR" field="restingHR" value={a.restingHR} unit="bpm" />
        <StatCard label="Max HR"     field="maxHR"     value={a.maxHR}     unit="bpm" />
        <StatCard label="Weekly Cap" field="weeklyCap" value={a.weeklyCap} unit="hrs" />
      </div>
      <Card title="2026 Season Goals">
        {[["Swim","1500m continuous, calm — by Oct 4"],["Bike",`FTP +5–10% over provisional ${a.ftp}W baseline`],["Run","90-min durable run · cadence 160–165 spm"],["Identity","Training as stewardship · sequenced ambition"]].map(([l,g]) => (
          <div key={l} style={{ display:"flex", gap:14, padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ color:T.amber, fontSize:12, fontWeight:500, width:60, flexShrink:0 }}>{l}</span>
            <span style={{ color:T.text, fontSize:13, lineHeight:1.5 }}>{g}</span>
          </div>
        ))}
      </Card>
      <Card title="Life Architecture">
        {[["Rest Day","Thursday — fully protected"],["Date Night","Weekly with Julie — evenings protected"],["Swim Anchors","Mon · Wed · Fri"],["Hour Ceiling",`${a.weeklyCap} hrs/week average`],["Measurements","Swim: m · Bike: mi · Run: km · KB: kg"],["Faith","Stewardship over validation · Ordered ambition"]].map(([k,v]) => (
          <div key={k} style={{ display:"flex", gap:14, padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ color:T.textMuted, fontSize:12, width:100, flexShrink:0 }}>{k}</span>
            <span style={{ color:T.text, fontSize:12 }}>{v}</span>
          </div>
        ))}
      </Card>
      <Card title="HRV Suppressors — Priority Order">
        {["Late large meals — digestive load","Late threshold training (within 2–3 hrs of bed)","Sleep fragmentation / heat"].map((item,i) => (
          <div key={i} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ color:T.amber, fontWeight:500, fontSize:13, width:18, flexShrink:0 }}>{i+1}</span>
            <span style={{ color:T.text, fontSize:12 }}>{item}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Athlete Benchmarks ────────────────────────────────────────────────────────
function AthleteBenchmarks({ s }) {
  const tiers = [
    { label:"T1", desc:"Foundational", col:"rgba(90,90,90,0.5)" },
    { label:"T2", desc:"Developing",   col:"rgba(90,171,245,0.5)" },
    { label:"T3", desc:"Established",  col:"rgba(232,185,106,0.5)" },
    { label:"T4", desc:"Advanced",     col:"rgba(141,200,48,0.5)" },
    { label:"T5", desc:"Elite AG",     col:"rgba(240,144,184,0.5)" },
  ];
  const benchmarks = [
    { domain:"Swim", current:"T2", next:"T3", progress:40, metric:"420m continuous", nextMilestone:"600m continuous", color:T.swim },
    { domain:"Bike", current:"T3", next:"T4", progress:60, metric:"FTP 194W (prov.)", nextMilestone:"FTP 215W validated", color:T.bike },
    { domain:"Run",  current:"T3", next:"T4", progress:55, metric:"68 min continuous", nextMilestone:"90 min durable", color:T.run },
    { domain:"SSM",  current:"T2", next:"T3", progress:45, metric:"Level 2 patterns", nextMilestone:"Level 3 all patterns", color:T.ssm },
  ];
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <h2 style={{ color:T.text, fontSize:20, fontWeight:500, marginBottom:4 }}>Benchmarks</h2>
      <p style={{ color:T.textMuted, fontSize:13, marginBottom:20 }}>Your current tier placement and progression targets</p>
      {/* Tier legend */}
      <Card title="Tier Ladder">
        <div style={{ display:"flex", gap:8 }}>
          {tiers.map(t => (
            <div key={t.label} style={{ flex:1, background:t.col, border:`1px solid rgba(255,255,255,0.1)`, borderRadius:8, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontSize:15, fontWeight:500, color:T.text, marginBottom:2 }}>{t.label}</div>
              <div style={{ fontSize:10, color:T.textMuted }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </Card>
      {/* Per-domain benchmarks */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {benchmarks.map(b => (
          <div key={b.domain} style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12, padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:b.color }} />
                <div style={{ fontSize:16, fontWeight:500, color:b.color }}>{b.domain}</div>
                <div style={{ fontSize:12, color:T.textMuted }}>{b.metric}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <div style={{ fontSize:12, color:T.textMuted }}>Current:</div>
                <div style={{ fontSize:14, fontWeight:500, color:b.color, background:`${b.color}22`, border:`1px solid ${b.color}44`, borderRadius:6, padding:"2px 10px" }}>{b.current}</div>
                <div style={{ color:T.textDim }}>→</div>
                <div style={{ fontSize:14, fontWeight:500, color:T.textDim, background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, borderRadius:6, padding:"2px 10px" }}>{b.next}</div>
              </div>
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <div style={{ fontSize:11, color:T.textDim }}>Next milestone</div>
                <div style={{ fontSize:11, color:b.color }}>{b.nextMilestone}</div>
              </div>
              <div style={{ height:7, background:"rgba(255,255,255,0.05)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ width:`${b.progress}%`, height:"100%", background:b.color, borderRadius:4, transition:"width 0.5s ease" }} />
              </div>
              <div style={{ fontSize:10, color:T.textDim, marginTop:4, textAlign:"right" }}>{b.progress}% to {b.next}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Nutrition Section (full page chat) ───────────────────────────────────────
function NutritionSection({ systemPrompt, promptStatus, messages, setMessages }) {
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const bottomRef  = useRef(null);
  const taRef      = useRef(null);
  const fileInputRef = useRef(null);
  const nutritionMessages = messages.filter(m => m.nutritionThread);

  const VALID_MT = ["image/jpeg","image/png","image/gif","image/webp"];
  const normMT   = (t) => VALID_MT.includes(t) ? t : "image/png";

  const readFileNu = (file) => new Promise(res => {
    const reader = new FileReader();
    reader.onload = () => res({ base64:reader.result.split(",")[1], mediaType:normMT(file.type), preview:reader.result, name:file.name });
    reader.readAsDataURL(file);
  });
  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files||[]).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const loaded = await Promise.all(files.map(readFileNu));
    setPendingImages(prev => [...prev, ...loaded]);
    e.target.value = "";
  };
  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items||[]).filter(i => i.type.startsWith("image/"));
    if (!items.length) return;
    e.preventDefault();
    const files = items.map(i => i.getAsFile()).filter(Boolean);
    const loaded = await Promise.all(files.map(readFileNu));
    setPendingImages(prev => [...prev, ...loaded]);
  };
  const adjustTa = () => { if (!taRef.current) return; taRef.current.style.height="auto"; taRef.current.style.height=Math.min(taRef.current.scrollHeight,140)+"px"; };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [nutritionMessages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text||loading) return;
    const imageBlocks = pendingImages.map(img => ({ type:"image", source:{ type:"base64", media_type:img.mediaType, data:img.base64 } }));
    const userContent = pendingImages.length > 0
      ? [...imageBlocks, { type:"text", text: text || "Analyze these screenshots for nutrition context." }]
      : text;
    const userMsg = { role:"user", content:userContent, imagePreviews:pendingImages.map(i=>i.preview), imageText:text, nutritionThread:true };
    setMessages(prev => [...prev, userMsg]);
    setPendingImages([]);
    setInput("");
    setLoading(true);
    if (taRef.current) taRef.current.style.height = "auto";
    const allNutrition = [...nutritionMessages, userMsg].map(m => ({ role:m.role, content:m.content }));
    const ctx = `${systemPrompt}\n\n---\n\nYou are now in NUTRITION mode. Focus exclusively on fueling, hydration, and nutrition guidance for Dale's training and racing.`;
    try {
      const res = await fetch("/api/chat", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1500, system:ctx, messages:allNutrition }) });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const reply = data.content?.find(b => b.type==="text")?.text||"";
      setMessages(prev => [...prev, { role:"assistant", content:reply, nutritionThread:true }]);
    } catch { setMessages(prev => [...prev, { role:"assistant", content:"Connection issue.", nutritionThread:true }]); }
    setLoading(false);
  };

  const quickPrompts = ["Plan my nutrition for this week's training.","What should I eat before tomorrow's swim?","Race day nutrition plan for April 12.","What do I eat during a long bike session?","Post-workout recovery nutrition."];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:14 }}>
        {nutritionMessages.length===0 && !loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Card title="Nutrition Focus Areas">
              {[["Weekly Fuel Plan","Tied to training load each week"],["Pre-Workout","Timing and composition by session type"],["During Training","Fueling for sessions over 60–90 min"],["Post-Workout","Recovery nutrition windows"],["Race Day","Protocol for each upcoming race"]].map(([t,d]) => (
                <div key={t} style={{ display:"flex", gap:14, padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ color:T.amber, fontSize:12, fontWeight:500, width:110, flexShrink:0 }}>{t}</span>
                  <span style={{ color:T.textMuted, fontSize:12 }}>{d}</span>
                </div>
              ))}
            </Card>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {quickPrompts.map(p => (
                <button key={p} onClick={() => { setInput(p); taRef.current?.focus(); }}
                  style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:"9px 14px", color:T.textMuted, fontSize:13, textAlign:"left", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{p}</button>
              ))}
            </div>
          </div>
        )}
        {nutritionMessages.map((msg,i) => (
          <div key={i} style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start" }}>
            {msg.role==="assistant" && <div style={{ width:32, height:32, borderRadius:"50%", background:T.amberGlow, border:`1px solid ${T.amberBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:500, fontSize:13, color:T.amber, marginRight:10, flexShrink:0, marginTop:2 }}>T</div>}
            <div style={{ maxWidth:"72%", display:"flex", flexDirection:"column", gap:6, alignItems:msg.role==="user"?"flex-end":"flex-start" }}>
              {msg.imagePreview && <img src={msg.imagePreview} alt="uploaded" style={{ maxWidth:"100%", maxHeight:200, borderRadius:10, border:`1px solid ${T.border}`, objectFit:"contain", background:T.bgCard }} />}
              {(typeof msg.content==="string" ? msg.content : msg.imageText||"") && (
                <div style={{ background:msg.role==="user"?"rgba(55,138,221,0.15)":T.bgCard, border:`1px solid ${msg.role==="user"?"rgba(55,138,221,0.2)":T.border}`, borderRadius:msg.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", padding:"12px 16px", color:T.text, fontSize:14, lineHeight:1.65, whiteSpace:"pre-wrap" }}>
                  {typeof msg.content==="string" ? msg.content : msg.imageText||""}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:T.amberGlow, border:`1px solid ${T.amberBorder}`, display:"flex", alignItems:"center", justifyContent:"center", color:T.amber, fontSize:13, fontWeight:500 }}>T</div>
            <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"14px 14px 14px 4px", padding:"10px 16px" }}><LoadingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:"14px 20px 18px", borderTop:`1px solid ${T.border}`, background:T.bgDeep }}>
        {pendingImages.length > 0 && (
          <div style={{ marginBottom:12, display:"flex", gap:6, flexWrap:"wrap" }}>
            {pendingImages.map((img, idx) => (
              <div key={idx} style={{ position:"relative" }}>
                <img src={img.preview} alt={img.name} style={{ height:52, width:76, objectFit:"cover", borderRadius:6, border:`1px solid ${T.border}`, display:"block" }} />
                <button onClick={() => setPendingImages(p => p.filter((_,i) => i !== idx))}
                  style={{ position:"absolute", top:-5, right:-5, width:16, height:16, borderRadius:"50%", background:T.danger, border:`2px solid ${T.bgDeep}`, color:"#fff", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>×</button>
              </div>
            ))}
            <div style={{ fontSize:11, color:T.textMuted, alignSelf:"center" }}>{pendingImages.length} image{pendingImages.length>1?"s":""} ready</div>
          </div>
        )}
        <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display:"none" }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={loading}
            style={{ background:pendingImages.length?T.amberGlow:T.bgCard, border:`1px solid ${pendingImages.length?T.amberBorder:T.border}`, borderRadius:12, padding:"11px 13px", color:pendingImages.length?T.amber:T.textMuted, cursor:"pointer", fontSize:16, flexShrink:0 }}>📎</button>
          <textarea ref={taRef} value={input}
            onChange={e => { setInput(e.target.value); adjustTa(); }}
            onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
            placeholder="Ask about nutrition, fueling, race day plans…"
            rows={1} disabled={loading} onPaste={handlePaste}
            style={{ flex:1, background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:12, padding:"11px 14px", color:T.text, fontSize:14, resize:"none", outline:"none", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5, minHeight:42, maxHeight:140 }} />
          <button onClick={send} disabled={loading||(!input.trim()&&!pendingImages.length)}
            style={{ background:(input.trim()||pendingImages.length)&&!loading?T.amberGlow:T.bgCard, border:`1px solid ${(input.trim()||pendingImages.length)&&!loading?T.amberBorder:T.border}`, borderRadius:12, padding:"12px 18px", color:T.text, cursor:(input.trim()||pendingImages.length)&&!loading?"pointer":"not-allowed", fontSize:18, transition:"all 0.2s" }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile Bottom Tab Nav ────────────────────────────────────────────────────
const MOBILE_TABS = [
  { id:"dashboard", label:"Home",      icon:"⌂" },
  { id:"training",  label:"Train",     icon:"🏊" },
  { id:"daily",     label:"Daily",     icon:"📊" },
  { id:"races",     label:"Races",     icon:"🏁" },
  { id:"chat",      label:"Chat",      icon:"💬" },
];

function MobileLayout({ appState, setAppState, systemPrompt, promptStatus, messages, setMessages }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeSub, setActiveSub] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSummaryDrawer, setShowSummaryDrawer] = useState(false);

  const setNav = (nav, sub=null) => {
    const item = NAV.find(n => n.id===nav);
    setActiveTab(nav);
    setActiveSub(sub || item?.subs?.[0]?.id || null);
    setShowMoreMenu(false);
  };

  const s = appState;

  const mainContent = () => {
    if (activeTab==="dashboard") return <DashboardSection appState={appState} setAppState={setAppState} promptStatus={promptStatus} setNav={setNav} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
    if (activeTab==="training") {
      if (activeSub==="atp")    return <ATPSection appState={appState} />;
      if (activeSub==="trends") return <TrendsSection appState={appState} />;
      return <TrainingWeek appState={appState} setAppState={setAppState} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
    }
    if (activeTab==="daily") {
      if (activeSub==="history") return <DailyHistory appState={appState} />;
      if (activeSub==="sleep")   return <SleepHRV appState={appState} />;
      return <DailyLog appState={appState} setAppState={setAppState} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
    }
    if (activeTab==="races") {
      if (activeSub==="manage") return <RacesManage appState={appState} setAppState={setAppState} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
      return <RacesCalendar s={appState} />;
    }
    if (activeTab==="chat") return <MobileChat systemPrompt={systemPrompt} promptStatus={promptStatus} messages={messages} setMessages={setMessages} appState={appState} />;
    if (activeTab==="nutrition") return <NutritionSection systemPrompt={systemPrompt} promptStatus={promptStatus} messages={messages} setMessages={setMessages} />;
    if (activeTab==="athlete") {
      if (activeSub==="benchmarks") return <AthleteBenchmarks s={appState} />;
      return <AthleteProfile s={appState} setAppState={setAppState} />;
    }
    return <DashboardSection appState={appState} setAppState={setAppState} promptStatus={promptStatus} setNav={setNav} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
  };

  const activeNavItem = NAV.find(n => n.id===activeTab);
  const hasSubs = activeNavItem?.subs?.length > 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", background:T.bg }}>

      {/* Mobile topbar */}
      <div style={{ flexShrink:0, background:T.bgDeep, borderBottom:`1px solid ${T.border}`, padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:T.amber }}>
          Coach<em style={{ color:"#7a9cc8", fontStyle:"italic" }}>T</em>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Stats pill */}
          <button onClick={() => setShowSummaryDrawer(true)}
            style={{ background:T.amberGlow, border:`1px solid ${T.amberBorder}`, borderRadius:16, padding:"4px 12px", fontSize:11, color:T.amber, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            TSS {s?.weekStats?.tss||"—"} · CTL {s?.fitness?.ctl||"—"}
          </button>
          {/* More menu */}
          <button onClick={() => setShowMoreMenu(m => !m)}
            style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${T.border}`, borderRadius:8, width:34, height:34, color:T.textMuted, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>⋯</button>
        </div>
      </div>

      {/* Sub-nav strip — horizontal scroll */}
      {hasSubs && (
        <div style={{ flexShrink:0, background:T.bgDeep, borderBottom:`1px solid ${T.border}`, padding:"8px 16px", display:"flex", gap:8, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          {activeNavItem.subs.map(sub => (
            <button key={sub.id} onClick={() => setActiveSub(sub.id)}
              style={{ flexShrink:0, padding:"5px 14px", borderRadius:14, border:`1px solid ${activeSub===sub.id?T.amberBorder:T.border}`, background:activeSub===sub.id?T.amberGlow:"transparent", color:activeSub===sub.id?T.amber:T.textMuted, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", minWidth:0 }}>
        {mainContent()}
      </div>

      {/* Bottom tab bar */}
      <div style={{ flexShrink:0, background:T.bgDeep, borderTop:`1px solid ${T.border}`, display:"flex", paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>
        {MOBILE_TABS.map(tab => {
          const active = activeTab===tab.id;
          return (
            <button key={tab.id} onClick={() => setNav(tab.id)}
              style={{ flex:1, padding:"10px 4px 8px", border:"none", background:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{ fontSize:20, lineHeight:1, filter:active?"none":"grayscale(1) opacity(0.5)" }}>{tab.icon}</div>
              <div style={{ fontSize:10, color:active?T.amber:T.textDim, fontFamily:"'DM Sans',sans-serif", fontWeight:active?500:400 }}>{tab.label}</div>
              {active && <div style={{ width:18, height:2, borderRadius:1, background:T.amber }} />}
            </button>
          );
        })}
      </div>

      {/* More menu overlay */}
      {showMoreMenu && (
        <>
          <div onClick={() => setShowMoreMenu(false)} style={{ position:"fixed", inset:0, zIndex:300 }} />
          <div style={{ position:"fixed", top:52, right:12, background:T.bgDeep, border:`1px solid ${T.borderMid}`, borderRadius:12, zIndex:301, minWidth:180, overflow:"hidden", animation:"ctFade 0.15s ease" }}>
            {[
              { id:"nutrition", label:"Nutrition",  icon:"🥗" },
              { id:"athlete",   label:"Athlete",    icon:"👤" },
              { id:"athlete",   label:"Benchmarks", icon:"📈", sub:"benchmarks" },
              { id:"races",     label:"Manage Races",icon:"✏️", sub:"manage" },
              { id:"training",  label:"ATP Plan",   icon:"📋", sub:"atp" },
              { id:"training",  label:"Trends",     icon:"📉", sub:"trends" },
            ].map((item,i) => (
              <button key={i} onClick={() => { setNav(item.id, item.sub||null); }}
                style={{ width:"100%", padding:"12px 16px", background:"none", border:"none", borderBottom:`1px solid ${T.border}`, color:T.text, fontSize:13, textAlign:"left", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:10 }}>
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Summary drawer — sidebar stats on mobile */}
      {showSummaryDrawer && (
        <>
          <div onClick={() => setShowSummaryDrawer(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:400 }} />
          <div style={{ position:"fixed", bottom:0, left:0, right:0, background:T.bgDeep, border:`1px solid ${T.borderMid}`, borderRadius:"16px 16px 0 0", zIndex:401, padding:20, paddingBottom:"calc(20px + env(safe-area-inset-bottom,0px))", animation:"ctSlideUpFull 0.25s ease" }}>
            <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.15)", margin:"0 auto 16px" }} />
            <div style={{ fontSize:11, color:T.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>This Week</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:16 }}>
              {[
                ["Volume", s?.weekStats?.volume||"—", "hr"],
                ["TSS",    s?.weekStats?.tss||"—",    ""],
                ["Done",   `${s?.weekStats?.done||"—"}/${s?.weekStats?.total||"—"}`, ""],
                ["CTL",    s?.fitness?.ctl||"—",      ""],
              ].map(([l,v,u]) => (
                <div key={l} style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:9, color:T.textDim, marginBottom:4, textTransform:"uppercase" }}>{l}</div>
                  <div style={{ fontSize:18, fontWeight:400, color:T.text }}>{v}<span style={{ fontSize:9, color:T.textMuted }}>{u}</span></div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:11, color:T.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Benchmarks</div>
            {[["Swim",40,T.swim,"T2"],["Bike",60,T.bike,"T3"],["Run",55,T.run,"T3"]].map(([l,w,col,tier]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <div style={{ fontSize:12, color:T.textMuted, width:32 }}>{l}</div>
                <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${w}%`, height:"100%", borderRadius:3, background:col }} />
                </div>
                <div style={{ fontSize:11, color:T.textDim, width:24, textAlign:"right" }}>{tier}</div>
              </div>
            ))}
            <div style={{ marginTop:14, background:"rgba(99,153,34,0.07)", border:"1px solid rgba(99,153,34,0.18)", borderRadius:8, padding:"9px 12px", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#8dc830", flexShrink:0 }} />
              <div style={{ fontSize:11, color:"#7aaa60" }}>All gates clear · {s?.athlete?.lastSleep||"7.2"}hr sleep</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Mobile Chat (full-screen version of RollingChat) ─────────────────────────
function MobileChat({ systemPrompt, promptStatus, messages, setMessages, appState }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const bottomRef = useRef(null);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const chatMessages = messages.filter(m => !m.nutritionThread);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMessages, loading]);

  const VALID_MT = ["image/jpeg","image/png","image/gif","image/webp"];
  const normMT = t => VALID_MT.includes(t) ? t : "image/png";

  const readFileMC = (file) => new Promise(res => {
    const reader = new FileReader();
    const VALID_MC = ["image/jpeg","image/png","image/gif","image/webp"];
    const mt = VALID_MC.includes(file.type) ? file.type : "image/png";
    reader.onload = () => res({ base64:reader.result.split(",")[1], mediaType:mt, preview:reader.result, name:file.name });
    reader.readAsDataURL(file);
  });
  const handleImageSelect = async e => {
    const files = Array.from(e.target.files||[]).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const loaded = await Promise.all(files.map(readFileMC));
    setPendingImages(prev => [...prev, ...loaded]);
    e.target.value = "";
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !pendingImages.length) || loading) return;
    const imageBlocks = pendingImages.map(img => ({ type:"image", source:{ type:"base64", media_type:img.mediaType, data:img.base64 } }));
    const userContent = pendingImages.length > 0
      ? [...imageBlocks, { type:"text", text: text || (pendingImages.length > 1 ? `Analyze these ${pendingImages.length} screenshots in the context of my training.` : "Analyze this screenshot in the context of my training.") }]
      : text;
    const userMsg = { role:"user", content:userContent, imagePreviews:pendingImages.map(i=>i.preview), imageText:text };
    const next = [...messages, userMsg];
    setMessages(next);
    setPendingImages([]);
    setInput("");
    setLoading(true);
    if (taRef.current) taRef.current.style.height = "auto";
    try {
      const res = await fetch("/api/chat", { method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1500, system:systemPrompt + buildStateContext(appState), messages:next.map(m => ({ role:m.role, content:m.content })) }) });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const reply = data.content?.find(b => b.type==="text")?.text || "";
      setMessages([...next, { role:"assistant", content:reply }]);
    } catch { setMessages([...next, { role:"assistant", content:"Connection issue." }]); }
    setLoading(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {chatMessages.map((msg, i) => (
          <div key={i} style={{ maxWidth:"85%", alignSelf:msg.role==="user"?"flex-end":"flex-start", animation:"ctFade 0.2s ease" }}>
            <div style={{ fontSize:10, color:T.textDim, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.8px" }}>{msg.role==="user"?"Dale":"Coach T"}</div>
            {(msg.imagePreviews||[]).map((p,pi) => <img key={pi} src={p} alt="upload" style={{ maxWidth:"100%", maxHeight:120, borderRadius:8, border:`1px solid ${T.border}`, objectFit:"contain", display:"block", marginBottom:4 }} />)}
            {!msg.imagePreviews?.length && msg.imagePreview && <img src={msg.imagePreview} alt="upload" style={{ maxWidth:"100%", maxHeight:120, borderRadius:8, border:`1px solid ${T.border}`, objectFit:"contain", display:"block", marginBottom:4 }} />}
            <div style={{ padding:"10px 13px", borderRadius:msg.role==="user"?"12px 3px 12px 12px":"3px 12px 12px 12px", fontSize:14, lineHeight:1.6, whiteSpace:"pre-wrap",
              background:msg.role==="user"?"rgba(55,138,221,0.15)":T.bgCard,
              border:msg.role==="user"?"1px solid rgba(55,138,221,0.2)":`1px solid ${T.border}`,
              color:msg.role==="user"?"#a8c8e8":T.text }}>
              {(typeof msg.content==="string" ? msg.content : msg.imageText||"").replace(/DASHBOARD_UPDATE:\s*```json[\s\S]*?```/g,"✓ Dashboard updated.").trim()}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf:"flex-start" }}>
            <div style={{ fontSize:10, color:T.textDim, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.8px" }}>Coach T</div>
            <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"3px 12px 12px 12px", padding:"10px 14px" }}><LoadingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:"10px 14px 10px", borderTop:`1px solid ${T.border}`, background:T.bgDeep }}>
        {pendingImages.length > 0 && (
          <div style={{ marginBottom:8, display:"flex", gap:6, flexWrap:"wrap", padding:"4px 0" }}>
            {pendingImages.map((img, idx) => (
              <div key={idx} style={{ position:"relative" }}>
                <img src={img.preview} alt={img.name} style={{ height:44, width:60, objectFit:"cover", borderRadius:6, border:`1px solid ${T.amberBorder}`, display:"block" }} />
                <button onClick={() => setPendingImages(p => p.filter((_,i) => i !== idx))}
                  style={{ position:"absolute", top:-5, right:-5, width:16, height:16, borderRadius:"50%", background:T.danger, border:`2px solid ${T.bgDeep}`, color:"#fff", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display:"none" }} />
          <button onClick={() => fileRef.current?.click()}
            style={{ background:pendingImages.length?T.amberGlow:"rgba(255,255,255,0.05)", border:`1px solid ${pendingImages.length?T.amberBorder:T.border}`, borderRadius:10, padding:"10px 12px", color:pendingImages.length?T.amber:T.textMuted, cursor:"pointer", fontSize:16, flexShrink:0, minWidth:44, minHeight:44, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>{pendingImages.length > 0 && <span style={{ position:"absolute", top:-4, right:-4, width:15, height:15, borderRadius:"50%", background:T.amber, color:"#0a1020", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{pendingImages.length}</span>}📎</button>
          <textarea ref={taRef} value={input}
            onChange={e => { setInput(e.target.value); if(taRef.current){taRef.current.style.height="auto";taRef.current.style.height=Math.min(taRef.current.scrollHeight,120)+"px";} }}
            onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
            placeholder={promptStatus==="loading"?"Loading…":"Message Coach T…"}
            rows={1} disabled={loading||promptStatus==="loading"}
            style={{ flex:1, background:"rgba(255,255,255,0.05)", border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", color:T.text, fontSize:15, resize:"none", outline:"none", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5, minHeight:44, maxHeight:120 }} />
          <button onClick={send} disabled={loading||(!input.trim()&&!pendingImages.length)||promptStatus==="loading"}
            style={{ minWidth:44, minHeight:44, borderRadius:10, background:(input.trim()||pendingImages.length)&&!loading?T.amberGlow:"rgba(255,255,255,0.04)", border:`1px solid ${(input.trim()||pendingImages.length)&&!loading?T.amberBorder:T.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:(input.trim()||pendingImages.length)&&!loading?"pointer":"not-allowed", flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 5L1 1V4.5L6 5L1 5.5V9Z" fill={T.amber}/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Coach T Floating Drawer ──────────────────────────────────────────────────
function CoachTDrawer({ systemPrompt, promptStatus, messages, setMessages, appState, setAppState }) {
  const [open, setOpen] = useState(() => { try { return sessionStorage.getItem("coacht_open")==="1"; } catch { return false; } });
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null);
  const [tokenStats, setTokenStats] = useState({ lastCacheRead:0, sessionCached:0, sessionInput:0, sessionOutput:0, lastInput:0, lastOutput:0 });
  const bottomRef = useRef(null);
  const taRef     = useRef(null);
  const fileRef   = useRef(null);
  const chatMessages = messages.filter(m => !m.nutritionThread);

  const toggleOpen = (val) => {
    setOpen(val);
    try { sessionStorage.setItem("coacht_open", val ? "1" : "0"); } catch {}
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMessages, loading, open]);

  const VALID_MT = ["image/jpeg","image/png","image/gif","image/webp"];
  const normMT = t => VALID_MT.includes(t) ? t : "image/png";

  const readFile = (file) => new Promise(res => {
    const reader = new FileReader();
    reader.onload = () => res({ base64:reader.result.split(",")[1], mediaType:normMT(file.type), preview:reader.result, name:file.name });
    reader.readAsDataURL(file);
  });

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files||[]).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const loaded = await Promise.all(files.map(readFile));
    setPendingImages(prev => [...prev, ...loaded]);
    e.target.value = "";
  };

  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items||[]).filter(i => i.type.startsWith("image/"));
    if (!items.length) return;
    e.preventDefault();
    const files = items.map(i => i.getAsFile()).filter(Boolean);
    const loaded = await Promise.all(files.map(readFile));
    setPendingImages(prev => [...prev, ...loaded]);
  };

  const handleDashboardUpdate = async (reply) => {
    try {
      // Match both ``` and plain JSON formats
      const match = reply.match(/DASHBOARD_UPDATE:\s*```(?:json)?[^\n]*\n([\s\S]*?)\n?```/);
      if (!match) return;
      const patch = JSON.parse(match[1].trim());
      setSaveStatus("saving");
      const merged = deepMerge(appState||{}, { ...patch, lastUpdated:new Date().toISOString().split("T")[0] });
      await pushState(merged);
      if (setAppState) setAppState(merged);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
      // Refresh from DB after writes so all pages stay in sync
      if (patch.week || patch.workoutLog || patch.dailyLog || patch.races || patch.gates) {
        setTimeout(async () => {
          try {
            const fresh = await fetchState();
            if (fresh && setAppState) setAppState(fresh);
          } catch(e) { console.warn("[refresh]", e); }
        }, 1500);
      }
    } catch(e) {
      console.error("DASHBOARD_UPDATE failed:", e);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };
  const send = async () => {
    const text = input.trim();
    if ((!text && !pendingImages.length) || loading) return;
    const imageBlocks = pendingImages.map(img => ({ type:"image", source:{ type:"base64", media_type:img.mediaType, data:img.base64 } }));
    const userContent = pendingImages.length > 0
      ? [...imageBlocks, { type:"text", text: text || (pendingImages.length > 1 ? `Analyze these ${pendingImages.length} screenshots in the context of my training.` : "Analyze this screenshot in the context of my training.") }]
      : text;
    const userMsg = { role:"user", content:userContent, imagePreviews:pendingImages.map(i=>i.preview), imageText:text };
    const next = [...messages, userMsg];
    setMessages(next); setPendingImages([]); setInput(""); setLoading(true);
    if (taRef.current) taRef.current.style.height = "auto";
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:4000,
          system: systemPrompt + buildStateContext(appState),
          messages: next.map(m => ({ role:m.role, content:m.content })) }),
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const reply = data.content?.find(b => b.type==="text")?.text || "";
      const usage = data.usage || {};
      const cacheRead = usage.cache_read_input_tokens || 0;
      setTokenStats(prev => ({ sessionInput:prev.sessionInput+(usage.input_tokens||0), sessionOutput:prev.sessionOutput+(usage.output_tokens||0), sessionCached:(prev.sessionCached||0)+cacheRead, lastInput:usage.input_tokens||0, lastOutput:usage.output_tokens||0, lastCacheRead:cacheRead, lastCacheWrite:usage.cache_creation_input_tokens||0 }));
      const assistantMsg = { role:"assistant", content:reply };
      setMessages([...next, assistantMsg]);
      if (reply.includes("DASHBOARD_UPDATE:")) handleDashboardUpdate(reply);
      // Persist both messages to Supabase
      const userMsg2 = next[next.length - 1];
      saveMessage({ role:"user", content:userMsg2.imageText || userMsg2.content, imageCount: userMsg2.imagePreviews?.length || 0 });
      saveMessage({ role:"assistant", content:reply, tokenInput:usage.input_tokens, tokenOutput:usage.output_tokens, tokenCached:cacheRead });
    } catch { setMessages([...next, { role:"assistant", content:"Connection issue." }]); }
    setLoading(false);
  };

  const unread = chatMessages.length > 1 && !open;

  return (
    <>
      {/* Backdrop when open */}
      {open && <div onClick={() => toggleOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:900, animation:"ctFade 0.2s ease" }} />}

      {/* Slide-up drawer */}
      <div style={{
        position:"fixed", bottom:0, right:24,
        width:420, height: open ? "70vh" : 0,
        minHeight: open ? 400 : 0,
        background:T.bgDeep, border:`1px solid ${T.border}`,
        borderBottom:"none", borderRadius:"14px 14px 0 0",
        display:"flex", flexDirection:"column",
        overflow:"hidden", zIndex:1000,
        transition:"height 0.3s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: open ? "0 -8px 40px rgba(0,0,0,0.5)" : "none",
      }}>
        {/* Drawer header */}
        <div style={{ padding:"14px 18px 12px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:T.bgCard }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg, ${T.amber}, #e89050)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Serif Display',serif", fontSize:16, color:"#0a1020" }}>T</div>
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:T.text }}>Coach T</div>
              <div style={{ fontSize:10, color:T.textDim }}>
                {promptStatus==="loading" ? "Loading intelligence…" : promptStatus==="error" ? "Error — check config" : "Training authority active"}
              </div>
            </div>
            {saveStatus && <div style={{ fontSize:10, color:saveStatus==="saved"?T.success:T.amber, marginLeft:4 }}>{saveStatus==="saved"?"✓ Dashboard updated":"Updating…"}</div>}
          </div>
          <button onClick={() => toggleOpen(false)}
            style={{ width:28, height:28, borderRadius:7, background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, color:T.textMuted, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start", animation:"ctFade 0.2s ease" }}>
              {msg.role==="assistant" && (
                <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg, ${T.amber}, #e89050)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Serif Display',serif", fontSize:13, color:"#0a1020", marginRight:8, flexShrink:0, marginTop:2 }}>T</div>
              )}
              <div style={{ maxWidth:"80%", display:"flex", flexDirection:"column", gap:5, alignItems:msg.role==="user"?"flex-end":"flex-start" }}>
                {(msg.imagePreviews||[]).map((p,pi) => <img key={pi} src={p} alt="upload" style={{ maxWidth:"100%", maxHeight:100, borderRadius:8, border:`1px solid ${T.border}`, objectFit:"contain", display:"block", marginBottom:4 }} />)}
              {!msg.imagePreviews?.length && msg.imagePreview && <img src={msg.imagePreview} alt="upload" style={{ maxWidth:"100%", maxHeight:100, borderRadius:8, border:`1px solid ${T.border}`, objectFit:"contain" }} />}
                {(typeof msg.content==="string" ? msg.content : msg.imageText||"") && (
                  <div style={{
                    background: msg.role==="user" ? T.amberGlow : T.bgCard,
                    border: `1px solid ${msg.role==="user" ? T.amberBorder : T.border}`,
                    borderRadius: msg.role==="user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                    padding:"10px 14px", fontSize:13, color:T.text, lineHeight:1.65, whiteSpace:"pre-wrap"
                  }}>
                    {(typeof msg.content==="string" ? msg.content : msg.imageText||"")
                      .replace(/DASHBOARD_UPDATE:\s*```json[\s\S]*?```/g, "✓ Dashboard updated.").trim()}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg, ${T.amber}, #e89050)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Serif Display',serif", fontSize:13, color:"#0a1020" }}>T</div>
              <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"4px 14px 14px 14px", padding:"10px 14px" }}><LoadingDots /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Token counter */}
        {tokenStats.lastInput > 0 && (
          <div style={{ padding:"4px 16px", display:"flex", gap:8, alignItems:"center", borderTop:`1px solid ${T.border}`, background:T.bgCard }}>
            <span style={{ fontSize:9, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Last</span>
            <span style={{ fontSize:10, color:T.swim }}>↑{tokenStats.lastInput}</span>
            <span style={{ fontSize:10, color:T.amber }}>↓{tokenStats.lastOutput}</span>
            {tokenStats.lastCacheRead > 0 && <span style={{ fontSize:10, color:T.success }} title="Cached">⚡{tokenStats.lastCacheRead.toLocaleString()}</span>}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:"10px 14px 14px" }}>
          {pendingImages.length > 0 && (
            <div style={{ marginBottom:8, display:"flex", gap:6, flexWrap:"wrap" }}>
              {pendingImages.map((img, idx) => (
                <div key={idx} style={{ position:"relative" }}>
                  <img src={img.preview} alt={img.name} style={{ height:48, width:64, objectFit:"cover", borderRadius:6, border:`1px solid ${T.amberBorder}`, display:"block" }} />
                  <button onClick={() => setPendingImages(p => p.filter((_,i) => i !== idx))}
                    style={{ position:"absolute", top:-5, right:-5, width:16, height:16, borderRadius:"50%", background:T.danger, border:`2px solid ${T.bgDeep}`, color:"#fff", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>×</button>
                </div>
              ))}
              <div style={{ fontSize:10, color:T.textDim, alignSelf:"center", marginLeft:2 }}>{pendingImages.length} image{pendingImages.length>1?"s":""} queued</div>
            </div>
          )}
          <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display:"none" }} />
            <button onClick={() => fileRef.current?.click()} disabled={loading}
              style={{ background:pendingImages.length?T.amberGlow:"rgba(255,255,255,0.04)", border:`1px solid ${pendingImages.length?T.amberBorder:T.border}`, borderRadius:9, padding:"9px 11px", color:pendingImages.length?T.amber:T.textMuted, cursor:"pointer", fontSize:14, flexShrink:0, position:"relative" }}>
              {pendingImages.length > 0 && <span style={{ position:"absolute", top:-5, right:-5, width:16, height:16, borderRadius:"50%", background:T.amber, color:"#0a1020", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{pendingImages.length}</span>}📎</button>
            <textarea ref={taRef} value={input}
              onChange={e => { setInput(e.target.value); if(taRef.current){taRef.current.style.height="auto";taRef.current.style.height=Math.min(taRef.current.scrollHeight,120)+"px";} }}
              onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
              onPaste={handlePaste}
              placeholder={promptStatus==="loading"?"Loading…":"Message Coach T… (Ctrl+V to paste)"}
              rows={1} disabled={loading||promptStatus==="loading"}
              style={{ flex:1, background:"rgba(255,255,255,0.05)", border:`1px solid ${T.border}`, borderRadius:9, padding:"9px 12px", color:T.text, fontSize:14, resize:"none", outline:"none", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5, minHeight:38, maxHeight:120 }} />
            <button onClick={send} disabled={loading||(!input.trim()&&!pendingImages.length)||promptStatus==="loading"}
              style={{ background:(input.trim()||pendingImages.length)&&!loading?T.amberGlow:"rgba(255,255,255,0.04)", border:`1px solid ${(input.trim()||pendingImages.length)&&!loading?T.amberBorder:T.border}`, borderRadius:9, padding:"9px 13px", color:T.amber, cursor:(input.trim()||pendingImages.length)&&!loading?"pointer":"not-allowed", fontSize:16, flexShrink:0, transition:"all 0.15s" }}>
              <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 5L1 1V4.5L6 5L1 5.5V9Z" fill={T.amber}/></svg>
            </button>
          </div>
          <div style={{ fontSize:10, color:T.textDim, marginTop:5, textAlign:"center" }}>Enter to send · Shift+Enter for new line</div>
        </div>
      </div>

      {/* Floating button — always visible when drawer is closed */}
      {!open && (
        <button onClick={() => toggleOpen(true)}
          style={{
            position:"fixed", bottom:24, right:24, zIndex:1000,
            width:52, height:52, borderRadius:"50%",
            background:`linear-gradient(135deg, ${T.amber}, #e89050)`,
            border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 20px rgba(240,192,112,0.4)",
            transition:"transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform="scale(1.08)"; e.currentTarget.style.boxShadow="0 6px 28px rgba(240,192,112,0.55)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 4px 20px rgba(240,192,112,0.4)"; }}>
          <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, color:"#0a1020", fontStyle:"italic", lineHeight:1, paddingTop:1 }}>T</span>
          {unread && (
            <div style={{ position:"absolute", top:0, right:0, width:14, height:14, borderRadius:"50%", background:T.swim, border:`2px solid ${T.bg}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#fff" }} />
            </div>
          )}
        </button>
      )}
    </>
  );
}

// ── Weekly Review ─────────────────────────────────────────────────────────────
function WeeklyReview({ appState, setAppState, systemPrompt, messages, setMessages }) {
  const s = appState || {};
  const domCol   = { swim:T.swim, bike:T.bike, run:T.run, ssm:T.ssm };
  const domLabel = { swim:"Swim", bike:"Bike", run:"Run", ssm:"SSM" };
  const domIcon  = { swim:"🏊", bike:"🚴", run:"🏃", ssm:"💪" };

  const week = s.week || [];
  const trainingSessions = week.filter(d => d.sessions?.length > 0);
  const totalSessions    = trainingSessions.length;
  const completedCount   = trainingSessions.filter(d => d.completed).length;

  // Review history from appState
  const reviewHistory = (s.reviewHistory || []).slice().sort((a,b) => b.date > a.date ? 1 : -1);

  // UI mode: "new" | "history"
  const [mode, setMode]             = useState("new");
  const [selectedReview, setSelectedReview] = useState(null);

  // New review state
  const initSessionState = () => {
    const st = {};
    const wlog = s.workoutLog || [];
    const DOW3 = {Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
    const wkMon3 = new Date(); wkMon3.setDate(wkMon3.getDate()-((wkMon3.getDay()+6)%7));
    trainingSessions.forEach(d => {
      const key  = d.day || d.dow;
      const off  = DOW3[key] ?? 0;
      const dt   = new Date(wkMon3); dt.setDate(wkMon3.getDate()+off);
      const dateStr = dt.toISOString().split("T")[0];
      const dom  = d.sessions?.[0]?.type?.toLowerCase();
      // Find logged workout matching this day+domain
      const logged = wlog.find(w => {
        const wDate = w.date || w.loggedAt?.split("T")[0];
        return wDate === dateStr && (!dom || (w.domain||"").toLowerCase() === dom);
      });
      if (logged) {
        st[key] = {
          status:   "completed",
          rpe:      logged.rpe      ? String(logged.rpe)       : "",
          duration: logged.duration ? String(logged.duration)  : "",
          distance: logged.distance ? String(logged.distance)  : "",
          avgHR:    logged.avgHR    ? String(logged.avgHR)     : "",
          tss:      logged.tss      ? String(Math.round(parseFloat(logged.tss)||0)) : "",
          notes:    logged.notes    || "",
        };
      } else if (d.completed) {
        st[key] = { status:"completed", rpe:"", duration:"", distance:"", avgHR:"", notes:"", tss:"" };
      } else {
        st[key] = { status:"skipped", rpe:"", duration:"", distance:"", avgHR:"", notes:"", tss:"" };
      }
    });
    return st;
  };

  const [sessionData, setSessionData] = useState(initSessionState);
  const [globalNotes, setGlobalNotes] = useState({ sleep:"", stress:"", nutrition:"", constraints:"" });
  const [phase, setPhase]             = useState("input");
  const [reviewOutput, setReviewOutput] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [saveStatus, setSaveStatus]   = useState(null);

  const updateSession = (day, field, value) =>
    setSessionData(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

  const statusOptions = [
    { id:"completed", label:"✓ Done",    col:T.success },
    { id:"partial",   label:"◐ Partial", col:T.amber   },
    { id:"skipped",   label:"✗ Skipped", col:T.danger  },
    { id:"gate",      label:"⊘ Gated",   col:"#8888aa" },
  ];

  const buildReviewPrompt = () => {
    const weekSummary = trainingSessions.map(d => {
      const key = d.day || d.dow;
      const sd  = sessionData[key] || {};
      const planned  = d.sessions?.map(s2 => `${domLabel[s2.type]||s2.type} (${s2.duration||"—"}, TSS ~${s2.tss||"?"})`).join(" + ");
      const executed = sd.status === "completed"
        ? `Completed — ${[sd.duration&&`${sd.duration}`, sd.distance&&`${sd.distance}`, sd.avgHR&&`avg HR ${sd.avgHR}`, sd.tss&&`TSS ${sd.tss}`, sd.rpe&&`RPE ${sd.rpe}/10`].filter(Boolean).join(", ")}`
        : sd.status === "partial" ? `Partial — ${sd.notes||"shortened"} ${sd.rpe?`· RPE ${sd.rpe}/10`:""}`
        : sd.status === "gate"    ? `Gate blocked — ${sd.notes||"not specified"}`
        : `Skipped — ${sd.notes||"not specified"}`;
      return `${key}: Planned: ${planned||"Rest"} | Executed: ${executed}${sd.notes&&sd.status==="completed"?` | Notes: ${sd.notes}`:""}`;
    }).join("\n");

    const today      = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
    const blockInfo  = `Block: ${s.block?.name||"Block 1"} · Week ${s.block?.currentWeek||"2"} of ${s.block?.totalWeeks||"8"}`;
    const weekStats  = s.weekStats ? `Weekly totals: TSS ${s.weekStats.tss||"—"}, Volume ${s.weekStats.volume||"—"} hrs, Sessions ${s.weekStats.done||"—"}/${s.weekStats.total||"—"}` : "";
    return [
      `WEEKLY REVIEW REQUEST — ${today}`, blockInfo, weekStats, "",
      "SESSIONS THIS WEEK:", weekSummary, "", "RECOVERY CONTEXT:",
      `Sleep trend: ${globalNotes.sleep||"not reported"}`,
      `Stress/life load: ${globalNotes.stress||"not reported"}`,
      `Nutrition/fueling: ${globalNotes.nutrition||"not reported"}`,
      `Upcoming constraints: ${globalNotes.constraints||"none"}`,
      "", "Current benchmark tiers: Swim Tier 1→2, Bike Tier 2, Run Tier 2, SSM active", "",
      "Please conduct the full TEOS weekly review in exact order:",
      "1. Executive summary", "2. Signals vs noise",
      "3. Domain pattern read (Swim, Bike, Run, SSM)",
      "4. Recovery and durability read", "5. Risk register",
      "6. Decision log", "7. Next block intent (one line per domain)",
      "8. Athlete expectations (what to do, what not to do, what to report)", "",
      "End with:", "Changes apply next cycle.", "Next review: [recommend day/timeframe]", "",
      "If any training decisions changed, include a DASHBOARD_UPDATE block.",
    ].join("\n");
  };

  const handleSaveReview = async () => {
    if (!reviewOutput) return;
    setSaveStatus("saving");
    const today3    = new Date().toISOString().split("T")[0];
    const weekStart3 = (() => { const d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d.toISOString().split("T")[0]; })();
    const reviewRecord = {
      date:      today3,
      weekStart: weekStart3,
      blockName: s.block?.name || null,
      weekNum:   s.block?.currentWeek || null,
      content:   reviewOutput,
      summary:   reviewOutput.split("\n").find(l => l.length > 40 && !l.match(/^[1-8]\./)) || reviewOutput.slice(0,200),
      status:    "complete",
    };
    try {
      const saveRes = await fetch("/api/update-state", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ athleteId: s.athlete?.slug||s.athlete?.id, state:{ saveReview: reviewRecord } }),
      });
      if (saveRes.ok) {
        setSaveStatus("saved");
        if (setAppState) setAppState(prev => ({
          ...prev,
          reviewHistory: [{ ...reviewRecord, id:`local_${Date.now()}` }, ...(prev?.reviewHistory||[])],
        }));
      } else { setSaveStatus("error"); }
    } catch(e) { setSaveStatus("error"); }
    setTimeout(() => setSaveStatus(null), 4000);
  };

    const handleGenerateReview = async () => {
    setPhase("generating"); setLoading(true);
    const reviewPrompt = buildReviewPrompt();
    const userMsg = { role:"user", content: reviewPrompt };
    const next = [...(messages||[]), userMsg];
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 4000,
          system: systemPrompt + "\n\nYou are now conducting a formal TEOS weekly review. Follow the exact 8-step review format. Be analytical, direct, and specific to this athlete's data.",
          messages: next.map(m => ({ role:m.role, content:typeof m.content==="string"?m.content:m.imageText||"" })),
        }),
      });
      if (!res.ok) throw new Error(res.status);
      const data  = await res.json();
      const reply = data.content?.find(b => b.type==="text")?.text || "";

      // Apply DASHBOARD_UPDATE if present
      const match = reply.match(/DASHBOARD_UPDATE:\s*```(?:json)?[^\n]*\n([\s\S]*?)\n?```/);
      if (match) {
        try {
          const patch  = JSON.parse(match[1].trim());
          const merged = deepMerge(appState||{}, { ...patch, lastUpdated: new Date().toISOString().split("T")[0] });
          await pushState(merged);
          if (setAppState) setAppState(merged);
        } catch(e) { console.warn("Review DASHBOARD_UPDATE failed:", e); }
      }

      const cleanReply = reply.replace(/DASHBOARD_UPDATE:\s*```[\s\S]*?```/g, "").trim();
      setReviewOutput(cleanReply);
      setMessages([...next, { role:"assistant", content:reply }]);

      // ── Save review to DB ─────────────────────────────────────────────────
      const today     = new Date().toISOString().split("T")[0];
      const weekStart = (() => { const d=new Date(); d.setDate(d.getDate()-d.getDay()+1); return d.toISOString().split("T")[0]; })();
      const reviewRecord = {
        date:      today,
        weekStart: weekStart,
        blockName: s.block?.name || null,
        weekNum:   s.block?.currentWeek || null,
        content:   cleanReply,
        summary:   cleanReply.split("\n").find(l => l.match(/^1\.|Executive/i)) || cleanReply.slice(0,200),
        status:    "complete",
        flags:     null,
        actions:   null,
      };
      try {
        const saveRes = await fetch("/api/update-state", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ athleteId: s.athlete?.slug || s.athlete?.id, state: { saveReview: reviewRecord } }),
        });
        if (saveRes.ok) {
          setSaveStatus("saved");
          // Optimistically add to local reviewHistory
          if (setAppState) {
            setAppState(prev => ({
              ...prev,
              reviewHistory: [{ ...reviewRecord, id: `local_${Date.now()}` }, ...(prev?.reviewHistory||[])],
            }));
          }
        } else {
          setSaveStatus("error");
        }
      } catch(e) {
        console.error("Review save error:", e);
        setSaveStatus("error");
      }

      setPhase("output");
      setTimeout(() => setSaveStatus(null), 4000);
    } catch(e) {
      console.error("Review generation failed:", e);
      setReviewOutput("Connection error — please try again.");
      setPhase("output");
    }
    setLoading(false);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderReviewText = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.match(/^[1-8]\.\s+[A-Z]/) || line.match(/^#{1,3}\s/)) {
        const clean = line.replace(/^#{1,3}\s/,"").replace(/^\d+\.\s+/,"");
        const num   = line.match(/^(\d+)\./)?.[1];
        return (
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,margin:"20px 0 8px",paddingTop:i>0?16:0,borderTop:i>0?`1px solid rgba(255,255,255,0.08)`:"none"}}>
            {num && <div style={{fontSize:11,fontWeight:700,color:T.amber,width:18,flexShrink:0}}>{num}.</div>}
            <div style={{fontSize:13,fontWeight:600,color:T.text,textTransform:"uppercase",letterSpacing:"1px"}}>{clean}</div>
          </div>
        );
      }
      if (line.match(/^---/)) return <div key={i} style={{height:1,background:"rgba(255,255,255,0.06)",margin:"10px 0"}}/>;
      if (line.match(/^[-•·]\s/)) return (
        <div key={i} style={{display:"flex",gap:10,padding:"3px 0",marginLeft:8}}>
          <span style={{color:T.amber,fontSize:12,flexShrink:0,marginTop:2}}>›</span>
          <span style={{fontSize:13,color:T.textMuted,lineHeight:1.65}}>{line.replace(/^[-•·]\s/,"").replace(/\*\*/g,"")}</span>
        </div>
      );
      if (line.includes("Changes apply next cycle")||line.includes("Next review")) return (
        <div key={i} style={{fontSize:13,color:T.amber,fontStyle:"italic",padding:"8px 12px",background:T.amberGlow,border:`1px solid ${T.amberBorder}`,borderRadius:8,marginTop:4,marginBottom:4}}>{line}</div>
      );
      if (!line.trim()) return <div key={i} style={{height:6}}/>;
      return <div key={i} style={{fontSize:13,color:T.textMuted,lineHeight:1.75,marginBottom:2}}>{line.replace(/\*\*/g,"")}</div>;
    });
  };

  const formatReviewDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  };

  return (
    <div style={{display:"flex", height:"100%", overflow:"hidden"}}>

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div style={{width:420, flexShrink:0, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", background:"#141414"}}>

        {/* Mode toggle */}
        <div style={{display:"flex", borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
          <button onClick={() => setMode("new")}
            style={{flex:1, padding:"13px 0", fontSize:12, fontWeight:mode==="new"?600:400, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", background:"transparent", border:"none", borderBottom:`2px solid ${mode==="new"?T.amber:"transparent"}`, color:mode==="new"?T.amber:T.textDim, transition:"all 0.15s"}}>
            New Review
          </button>
          <button onClick={() => setMode("history")}
            style={{flex:1, padding:"13px 0", fontSize:12, fontWeight:mode==="history"?600:400, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", background:"transparent", border:"none", borderBottom:`2px solid ${mode==="history"?T.amber:"transparent"}`, color:mode==="history"?T.amber:T.textDim, transition:"all 0.15s"}}>
            History {reviewHistory.length > 0 && `(${reviewHistory.length})`}
          </button>
        </div>

        {/* ── HISTORY MODE ── */}
        {mode === "history" && (
          <div style={{flex:1, overflowY:"auto", padding:"12px 0"}}>
            {reviewHistory.length === 0 ? (
              <div style={{padding:"40px 24px", textAlign:"center", color:T.textDim, fontSize:13}}>
                No reviews saved yet — generate your first review using the New Review tab.
              </div>
            ) : reviewHistory.map((rv, i) => {
              const isSelected = selectedReview?.id === rv.id || (selectedReview?.date === rv.date && !rv.id);
              return (
                <div key={rv.id||i} onClick={() => { setSelectedReview(rv); setMode("history"); }}
                  style={{padding:"13px 20px", borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:"pointer",
                    background:isSelected?"rgba(234,179,8,0.06)":"transparent",
                    borderLeft:`3px solid ${isSelected?T.amber:"transparent"}`}}
                  onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.background="rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.background="transparent"; }}>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4}}>
                    <div style={{fontSize:13, fontWeight:500, color:T.text}}>{formatReviewDate(rv.date)}</div>
                    <div style={{fontSize:10, color:rv.status==="complete"?T.success:T.amber, background:rv.status==="complete"?"rgba(34,197,94,0.1)":"rgba(234,179,8,0.1)", border:`1px solid ${rv.status==="complete"?"rgba(34,197,94,0.3)":"rgba(234,179,8,0.3)"}`, borderRadius:8, padding:"1px 8px"}}>
                      {rv.status==="complete"?"Complete":"Pending"}
                    </div>
                  </div>
                  <div style={{fontSize:11, color:T.textDim}}>
                    {rv.blockName && `${rv.blockName} · `}{rv.weekNum && `Week ${rv.weekNum}`}
                  </div>
                  {rv.summary && (
                    <div style={{fontSize:11, color:T.textMuted, marginTop:4, overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", lineHeight:1.5}}>
                      {rv.summary.replace(/^1\.\s*/,"").replace(/\*\*/g,"")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── NEW REVIEW MODE ── */}
        {mode === "new" && (
          <div style={{flex:1, overflowY:"auto"}}>
            {/* Block progress header */}
            <div style={{padding:"16px 20px 14px", borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4}}>
                <div style={{fontSize:15, fontWeight:600, color:T.text}}>Weekly Review</div>
                {saveStatus && <div style={{fontSize:11, color:saveStatus==="saved"?T.success:T.danger}}>{saveStatus==="saved"?"✓ Saved":"Save failed"}</div>}
              </div>
              <div style={{fontSize:12, color:T.amber}}>{s.block?.name} · Week {s.block?.currentWeek||"2"} of {s.block?.totalWeeks||"8"}</div>
              <div style={{marginTop:10, display:"flex", alignItems:"center", gap:8}}>
                <div style={{flex:1, height:4, borderRadius:2, background:"rgba(255,255,255,0.06)", overflow:"hidden"}}>
                  <div style={{width:`${totalSessions>0?(completedCount/totalSessions)*100:0}%`, height:"100%", background:T.success, borderRadius:2}}/>
                </div>
                <div style={{fontSize:11, color:T.textDim, whiteSpace:"nowrap"}}>{completedCount}/{totalSessions} sessions</div>
              </div>
            </div>

            <div style={{padding:"16px 20px"}}>
              {/* Session completion */}
              <div style={{fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:12}}>Session Completion</div>
              {trainingSessions.length === 0 && (
                <div style={{fontSize:13, color:T.textDim, padding:"16px 0"}}>No sessions scheduled this week.</div>
              )}
              {trainingSessions.map((d, i) => {
                const key  = d.day || d.dow;
                const sd   = sessionData[key] || {};
                const sess = d.sessions?.[0];
                const col  = domCol[sess?.type] || T.textMuted;
                return (
                  <div key={key} style={{marginBottom:i<trainingSessions.length-1?16:0, paddingBottom:i<trainingSessions.length-1?16:0, borderBottom:i<trainingSessions.length-1?`1px solid rgba(255,255,255,0.06)`:"none"}}>
                    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
                      <div style={{width:6, height:6, borderRadius:2, background:col}}/>
                      <span style={{fontSize:13, fontWeight:500, color:T.text}}>{key}</span>
                      <span style={{fontSize:12, color:col}}>{domIcon[sess?.type]||""} {domLabel[sess?.type]||sess?.type}</span>
                      {sess?.duration && <span style={{fontSize:11, color:T.textDim}}>· {sess.duration}</span>}
                    </div>
                    <div style={{display:"flex", gap:6, marginBottom:8, flexWrap:"wrap"}}>
                      {statusOptions.map(opt => (
                        <button key={opt.id} onClick={() => updateSession(key, "status", opt.id)}
                          style={{padding:"4px 10px", borderRadius:14, fontSize:11, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                            background:sd.status===opt.id?`${opt.col}22`:"rgba(255,255,255,0.03)",
                            border:`1px solid ${sd.status===opt.id?opt.col:T.border}`,
                            color:sd.status===opt.id?opt.col:T.textDim}}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {(sd.status==="completed"||sd.status==="partial") && (
                      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:6}}>
                        {[["duration","Duration","55 min"],["rpe","RPE (1-10)","7"],["avgHR","Avg HR","138"]].map(([field,label,ph]) => (
                          <div key={field}>
                            <div style={{fontSize:10, color:T.textDim, marginBottom:3}}>{label}</div>
                            <input value={sd[field]||""} placeholder={ph} onChange={e => updateSession(key, field, e.target.value)}
                              style={{width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, borderRadius:6, padding:"5px 8px", color:T.text, fontSize:12, outline:"none", fontFamily:"'DM Sans',sans-serif"}}/>
                          </div>
                        ))}
                      </div>
                    )}
                    <textarea value={sd.notes||""} placeholder={sd.status==="skipped"||sd.status==="gate"?"Reason…":"How it landed…"}
                      onChange={e => updateSession(key, "notes", e.target.value)} rows={2}
                      style={{width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.03)", border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 8px", color:T.text, fontSize:12, outline:"none", fontFamily:"'DM Sans',sans-serif", resize:"none", lineHeight:1.5}}/>
                  </div>
                );
              })}

              {/* Recovery context */}
              <div style={{marginTop:20, paddingTop:20, borderTop:`1px solid ${T.border}`}}>
                <div style={{fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:12}}>Recovery Context</div>
                {[["sleep","Sleep trend this week","e.g. 7.2 hrs avg"],["stress","Stress / life load","e.g. heavy work week"],["nutrition","Fueling & nutrition","e.g. solid, missed pre-workout"],["constraints","Upcoming constraints","e.g. travel next week"]].map(([k,label,ph]) => (
                  <div key={k} style={{marginBottom:10}}>
                    <div style={{fontSize:11, color:T.textMuted, marginBottom:4}}>{label}</div>
                    <input value={globalNotes[k]||""} placeholder={ph} onChange={e => setGlobalNotes(p => ({...p,[k]:e.target.value}))}
                      style={{width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, borderRadius:6, padding:"7px 10px", color:T.text, fontSize:12, outline:"none", fontFamily:"'DM Sans',sans-serif"}}/>
                  </div>
                ))}
              </div>

              {/* Generate button */}
              <div style={{marginTop:20, paddingTop:20, borderTop:`1px solid ${T.border}`}}>
                <button onClick={handleGenerateReview} disabled={loading||totalSessions===0}
                  style={{width:"100%", padding:"13px 0", borderRadius:10, fontSize:14, fontWeight:500, cursor:loading?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif",
                    background:loading?"rgba(255,255,255,0.04)":T.amberGlow,
                    border:`1px solid ${loading?T.border:T.amberBorder}`,
                    color:loading?T.textDim:T.amber,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                  {loading ? <><LoadingDots/><span>Coach T is reviewing…</span></> : "Generate Review →"}
                </button>
                <div style={{fontSize:11, color:T.textDim, textAlign:"center", marginTop:8}}>Review is saved automatically</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Review output ──────────────────────────────────────── */}
      <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>

        {/* History mode: show selected review */}
        {mode === "history" && selectedReview && (
          <div style={{flex:1, overflowY:"auto"}}>
            <div style={{padding:"18px 28px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.01)", position:"sticky", top:0, zIndex:2}}>
              <div>
                <div style={{fontSize:16, fontWeight:500, color:T.text}}>{formatReviewDate(selectedReview.date)}</div>
                <div style={{fontSize:12, color:T.amber, marginTop:2}}>{selectedReview.blockName} {selectedReview.weekNum ? `· Week ${selectedReview.weekNum}` : ""}</div>
              </div>
              <button onClick={() => { navigator.clipboard?.writeText(selectedReview.content||""); }}
                style={{padding:"6px 16px", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", background:T.amberGlow, border:`1px solid ${T.amberBorder}`, color:T.amber}}>
                Copy
              </button>
            </div>
            <div style={{padding:"20px 28px"}}>{renderReviewText(selectedReview.content)}</div>
          </div>
        )}

        {/* History mode: no selection */}
        {mode === "history" && !selectedReview && (
          <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, padding:40}}>
            <div style={{fontSize:40, opacity:0.12}}>📋</div>
            <div style={{fontSize:15, color:T.textMuted}}>Select a review from the list</div>
            <div style={{fontSize:13, color:T.textDim}}>{reviewHistory.length} review{reviewHistory.length!==1?"s":""} saved</div>
          </div>
        )}

        {/* New review: waiting for input */}
        {mode === "new" && phase === "input" && (
          <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14, padding:40}}>
            <div style={{fontSize:44, opacity:0.12}}>📋</div>
            <div style={{fontSize:16, color:T.textMuted, fontWeight:500}}>Review output will appear here</div>
            <div style={{fontSize:13, color:T.textDim, textAlign:"center", maxWidth:380, lineHeight:1.7}}>Fill in session completion and recovery context, then click Generate Review.</div>
            <div style={{marginTop:4, display:"flex", flexDirection:"column", gap:5, alignItems:"flex-start"}}>
              {["1. Executive summary","2. Signals vs noise","3. Domain pattern read","4. Recovery & durability","5. Risk register","6. Decision log","7. Next block intent","8. Athlete expectations"].map(s2 => (
                <div key={s2} style={{fontSize:12, color:T.textDim, display:"flex", alignItems:"center", gap:8}}>
                  <div style={{width:5, height:5, borderRadius:"50%", background:"rgba(255,255,255,0.15)"}}/>
                  {s2}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New review: generating */}
        {mode === "new" && phase === "generating" && (
          <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16}}>
            <div style={{width:48, height:48, borderRadius:"50%", background:`linear-gradient(135deg,${T.amber},#e89050)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#0a1020"}}>T</div>
            <div style={{fontSize:15, color:T.text}}>Conducting weekly review…</div>
            <div style={{fontSize:13, color:T.textDim}}>Analyzing {totalSessions} sessions · 8-section report</div>
            <LoadingDots/>
          </div>
        )}

        {/* New review: output */}
        {mode === "new" && phase === "output" && reviewOutput && (
          <div style={{flex:1, overflowY:"auto"}}>
            <div style={{padding:"18px 28px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.01)", position:"sticky", top:0, zIndex:2}}>
              <div>
                <div style={{fontSize:16, fontWeight:500, color:T.text}}>Weekly Review</div>
                <div style={{fontSize:12, color:T.amber, marginTop:2}}>
                  {s.block?.name} · {new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
                  {saveStatus==="saved" && <span style={{color:T.success, marginLeft:12}}>✓ Saved</span>}
                  {saveStatus==="error"  && <span style={{color:T.danger,  marginLeft:12}}>Save failed</span>}
                </div>
              </div>
              <div style={{display:"flex", gap:8, alignItems:"center"}}>
                {saveStatus==="saved"  && <span style={{fontSize:11,color:T.success}}>✓ Saved to history</span>}
                {saveStatus==="error"  && <span style={{fontSize:11,color:T.danger}}>Save failed</span>}
                {saveStatus==="saving" && <span style={{fontSize:11,color:T.amber}}>Saving…</span>}
                <button onClick={() => { setPhase("input"); setReviewOutput(null); }}
                  style={{padding:"6px 14px", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, color:T.textMuted}}>← Edit</button>
                <button onClick={() => { navigator.clipboard?.writeText(reviewOutput); }}
                  style={{padding:"6px 16px", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", background:"rgba(255,255,255,0.04)", border:`1px solid ${T.border}`, color:T.textMuted}}>Copy</button>
                <button onClick={handleSaveReview}
                  style={{padding:"6px 16px", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", background:T.amberGlow, border:`1px solid ${T.amberBorder}`, color:T.amber, fontWeight:500}}>Save ↓</button>
              </div>
            </div>
            <div style={{padding:"20px 28px"}}>{renderReviewText(reviewOutput)}</div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Onboarding Gate ───────────────────────────────────────────────────────────
// Shown when athlete.onboardingComplete === false.
// Wraps the Coach T chat interface in ONBOARDING mode — same API, same prompts,
// but the full dashboard is locked until onboarding completes.
function OnboardingGate({ athleteId, athleteName, systemPrompt, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [step, setStep]         = useState(0);
  const bottomRef = useRef(null);
  const taRef     = useRef(null);

  // Kick off with Coach T introduction on mount
  useEffect(() => {
    if (systemPrompt && messages.length === 0) {
      sendToCoach("__ONBOARDING_START__", true);
    }
  }, [systemPrompt]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const sendToCoach = async (text, isInit = false) => {
    const userMsg = isInit
      ? null
      : { role:"user", content: text };

    const next = isInit
      ? []
      : [...messages, userMsg];

    if (!isInit) setMessages(next);
    setLoading(true);

    // System prompt in ONBOARDING mode — same prompts, mode anchored
    const onboardSys = systemPrompt +
      `

SYSTEM: athlete_state.onboarding_complete = false. You are in ONBOARDING mode. ` +
      `Run the canonical 21-step onboarding sequence in exact order. ` +
      `Ask only one question per message. Do not prescribe training. ` +
      `When onboarding is fully complete and the athlete gives explicit consent, ` +
      `end your final message with the exact token: [ONBOARDING_COMPLETE]`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          system: onboardSys,
          messages: isInit
            ? [{ role:"user", content:"Begin onboarding." }]
            : next.map(m => ({ role:m.role, content:typeof m.content==="string"?m.content:m.imageText||"" })),
        }),
      });
      if (!res.ok) throw new Error(res.status);
      const data  = await res.json();
      const reply = data.content?.find(b => b.type==="text")?.text || "";

      // Check for completion token
      const isComplete = reply.includes("[ONBOARDING_COMPLETE]");
      const cleanReply = reply.replace("[ONBOARDING_COMPLETE]", "").trim();

      const assistantMsg = { role:"assistant", content: cleanReply };
      setMessages(isInit ? [assistantMsg] : [...next, assistantMsg]);

      if (isComplete) {
        // Mark athlete as onboarding complete in DB
        try {
          await fetch("/api/update-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              athleteId,
              state: {
                athlete: {
                  onboardingComplete: true,
                  consentGiven:       true,
                  consentDate:        new Date().toISOString().split("T")[0],
                }
              }
            }),
          });
        } catch(e) { console.error("Onboarding completion save failed:", e); }
        setTimeout(() => onComplete(), 1800);
      }
    } catch(e) {
      const errMsg = { role:"assistant", content:"Connection error — please try again." };
      setMessages(isInit ? [errMsg] : [...next, errMsg]);
    }
    setLoading(false);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const send = () => {
    const text = input.trim();
    if (!text || loading) return;
    sendToCoach(text);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#141414", display:"flex", flexDirection:"column", zIndex:9999, fontFamily:"'DM Sans',sans-serif" }}>
      {/* Header */}
      <div style={{ padding:"18px 28px", borderBottom:`1px solid #2e2e2e`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${T.amber},#e89050)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Serif Display',serif", fontSize:18, color:"#141414", fontWeight:700 }}>T</div>
          <div>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:"#ffffff", letterSpacing:"-0.3px" }}>Coach<span style={{ color:T.teal }}>T</span></div>
            <div style={{ fontSize:11, color:"#888", marginTop:1 }}>Athlete Onboarding</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:T.amber, animation:"ctBounce 1.4s ease infinite" }}/>
          <div style={{ fontSize:12, color:T.textMuted }}>ONBOARDING MODE</div>
        </div>
      </div>

      {/* Progress hint */}
      <div style={{ padding:"10px 28px", background:"rgba(234,179,8,0.05)", borderBottom:`1px solid rgba(234,179,8,0.15)`, flexShrink:0 }}>
        <div style={{ fontSize:12, color:T.amber }}>
          Welcome{athleteName ? `, ${athleteName}` : ""}. Before accessing your dashboard, Coach T needs to complete a short intake to govern your training correctly.
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 28px" }}>
        {messages.length === 0 && !loading && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:40, opacity:0.12 }}>📋</div>
            <div style={{ fontSize:14, color:T.textMuted }}>Coach T is preparing your intake…</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom:18, display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", gap:10, alignItems:"flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${T.amber},#e89050)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Serif Display',serif", fontSize:14, color:"#141414", flexShrink:0 }}>T</div>
            )}
            <div style={{ maxWidth:"75%", padding:"12px 16px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
              background: m.role==="user" ? "rgba(234,179,8,0.1)" : "#242424",
              border:`1px solid ${m.role==="user"?"rgba(234,179,8,0.25)":"#2e2e2e"}`,
              color:"#f5f5f5", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"flex-start" }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${T.amber},#e89050)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Serif Display',serif", fontSize:14, color:"#141414", flexShrink:0 }}>T</div>
            <div style={{ padding:"12px 16px", borderRadius:"16px 16px 16px 4px", background:"#242424", border:`1px solid #2e2e2e` }}>
              <LoadingDots/>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:"14px 28px", borderTop:`1px solid #2e2e2e`, flexShrink:0 }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
          <textarea ref={taRef} value={input} onChange={e => { setInput(e.target.value); if(taRef.current){taRef.current.style.height="auto";taRef.current.style.height=Math.min(taRef.current.scrollHeight,120)+"px";}}}
            onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Type your response…" rows={1} disabled={loading}
            style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid #2e2e2e`, borderRadius:10, padding:"11px 14px", color:"#f5f5f5", fontSize:14, resize:"none", outline:"none", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5, maxHeight:120 }}/>
          <button onClick={send} disabled={loading||!input.trim()}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.amberBorder}`, background:T.amberGlow, color:T.amber, cursor:loading||!input.trim()?"not-allowed":"pointer", fontSize:14, fontFamily:"'DM Sans',sans-serif", flexShrink:0, fontWeight:500 }}>Send</button>
        </div>
        <div style={{ fontSize:11, color:"#555", marginTop:8, textAlign:"center" }}>
          Onboarding typically takes 10–15 minutes. Your responses are saved as you go.
        </div>
      </div>
    </div>
  );
}

// ── New Athlete Setup ──────────────────────────────────────────────────────────
// Admin-only screen shown when navigating to a slug that doesn't exist yet.
// Provisions the athlete in Supabase then hands off to OnboardingGate.
function NewAthleteSetup({ onProvisioned, onCancel }) {
  const [name,   setName]   = useState("");
  const [slug,   setSlug]   = useState("");
  const [email,  setEmail]  = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const provision = async () => {
    if (!name.trim() || !slug.trim()) return;
    setSaving(true); setError(null);
    try {
      const res  = await fetch("/api/provision-athlete", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ slug: slug.trim(), name: name.trim(), email: email.trim()||undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Provision failed"); setSaving(false); return; }
      onProvisioned(data.slug, data.name);
    } catch(e) { setError(e.message); setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#141414", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:440, background:"#1e1e1e", border:`1px solid #2e2e2e`, borderRadius:16, padding:36 }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#ffffff", marginBottom:4 }}>Add New Athlete</div>
        <div style={{ fontSize:13, color:"#888", marginBottom:28 }}>Create an athlete profile. They'll complete onboarding before accessing the dashboard.</div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>Full Name</div>
          <input value={name} onChange={e => { setName(e.target.value); if(!slug||slug===slugAttempt) setSlug(e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")); }}
            placeholder="e.g. Sarah Johnson" autoFocus
            style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:`1px solid #2e2e2e`, borderRadius:8, padding:"10px 14px", color:"#ffffff", fontSize:14, outline:"none", fontFamily:"'DM Sans',sans-serif" }}/>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>Athlete Slug <span style={{ color:"#555", fontSize:10, fontStyle:"italic" }}>(URL identifier, auto-filled)</span></div>
          <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))}
            placeholder="e.g. sarah-johnson"
            style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:`1px solid #2e2e2e`, borderRadius:8, padding:"10px 14px", color:T.swim, fontSize:14, outline:"none", fontFamily:"'DM Serif Display',monospace,sans-serif", letterSpacing:"0.5px" }}/>
        </div>

        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, color:"#888", textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>Email <span style={{ color:"#555", fontSize:10, fontStyle:"italic" }}>(optional)</span></div>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email"
            placeholder="athlete@email.com"
            style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:`1px solid #2e2e2e`, borderRadius:8, padding:"10px 14px", color:"#ffffff", fontSize:14, outline:"none", fontFamily:"'DM Sans',sans-serif" }}/>
        </div>

        {error && <div style={{ fontSize:12, color:T.danger, marginBottom:16, padding:"8px 12px", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:8 }}>{error}</div>}

        <button onClick={provision} disabled={saving||!name.trim()||!slug.trim()}
          style={{ width:"100%", padding:"12px 0", borderRadius:10, border:`1px solid ${T.amberBorder}`, background:T.amberGlow, color:T.amber, cursor:saving||!name.trim()||!slug.trim()?"not-allowed":"pointer", fontSize:14, fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>
          {saving ? "Creating…" : "Create Athlete & Start Onboarding →"}
        </button>

        <div style={{ fontSize:11, color:"#444", textAlign:"center", marginTop:14 }}>
          The athlete will complete a 21-step intake before accessing their dashboard.
        </div>

        {onCancel && (
          <button onClick={onCancel}
            style={{ width:"100%", padding:"8px 0", marginTop:10, borderRadius:8, border:`1px solid #2e2e2e`, background:"transparent", color:"#555", cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
            ← Back to athlete selection
          </button>
        )}
      </div>
    </div>
  );
}


// ── Athlete Selector ─────────────────────────────────────────────────────────
const ATHLETES = [
  {
    id: "dale",
    name: "Dale",
    subtitle: "Age 56 · Keller, TX",
    detail: "Block 1 — Aerobic Base · Wk 2 of 8",
    initials: "D",
    color: "#60a5fa",
    badge: "Live",
    badgeColor: T.success,
  },
  {
    id: "alisha",
    name: "Alisha",
    subtitle: "Age 42 · Southlake, TX",
    detail: "Block 2 — Aerobic Build · Wk 4 of 8",
    initials: "A",
    color: "#a78bfa",
    badge: "Demo",
    badgeColor: T.amber,
  },
];

function AthleteSelector({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{
      position:"fixed", inset:0,
      background:"#141414",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      zIndex:9999, fontFamily:"'DM Sans',sans-serif",
    }}>
      <div style={{ marginBottom:48, textAlign:"center" }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:36, color:T.text, letterSpacing:"0.5px", marginBottom:8 }}>
          Coach<span style={{ color:T.teal }}>T</span>
        </div>
        <div style={{ fontSize:13, color:T.textDim, letterSpacing:"2px", textTransform:"uppercase" }}>
          Endurance Operating System
        </div>
      </div>

      <div style={{ display:"flex", gap:16, marginBottom:36 }}>
        {ATHLETES.map(a => (
          <div key={a.id}
            onClick={() => onSelect(a.id)}
            onMouseEnter={() => setHovered(a.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width:210, background:T.bgCard,
              border:`1px solid ${hovered===a.id ? a.color : T.border}`,
              borderRadius:14, padding:24, cursor:"pointer",
              transition:"all 0.18s",
              transform: hovered===a.id ? "translateY(-3px)" : "none",
            }}>
            <div style={{
              width:52, height:52, borderRadius:"50%",
              background:`${a.color}18`, border:`2px solid ${a.color}44`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20, fontWeight:600, color:a.color, marginBottom:14,
            }}>{a.initials}</div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
              <div style={{ fontSize:17, fontWeight:500, color:T.text }}>{a.name}</div>
              <div style={{
                fontSize:9, letterSpacing:"1px", textTransform:"uppercase",
                color:a.badgeColor, background:`${a.badgeColor}18`,
                border:`1px solid ${a.badgeColor}44`, borderRadius:10, padding:"2px 7px",
              }}>{a.badge}</div>
            </div>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:3 }}>{a.subtitle}</div>
            <div style={{ fontSize:11, color:T.textDim, marginBottom:18 }}>{a.detail}</div>
            <div style={{ fontSize:12, color:hovered===a.id ? a.color : T.textDim, display:"flex", alignItems:"center", gap:6, transition:"color 0.15s" }}>
              Open dashboard <span style={{ fontSize:15 }}>→</span>
            </div>
          </div>
        ))}

        {/* Add new athlete */}
        <div
          onClick={() => onSelect("__new__")}
          onMouseEnter={() => setHovered("__new__")}
          onMouseLeave={() => setHovered(null)}
          style={{
            width:210, background:"rgba(255,255,255,0.02)",
            border:`2px dashed ${hovered==="__new__" ? "#666" : "#333"}`,
            borderRadius:14, padding:24, cursor:"pointer",
            transition:"all 0.18s",
            transform: hovered==="__new__" ? "translateY(-3px)" : "none",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10,
          }}>
          <div style={{
            width:52, height:52, borderRadius:"50%",
            background:"rgba(255,255,255,0.03)", border:`2px dashed ${hovered==="__new__" ? "#555" : "#333"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:26, color:hovered==="__new__" ? "#777" : "#444",
          }}>+</div>
          <div style={{ fontSize:15, fontWeight:500, color:hovered==="__new__" ? "#aaa" : "#555", transition:"color 0.15s" }}>Add Athlete</div>
          <div style={{ fontSize:11, color:"#444", textAlign:"center", lineHeight:1.5 }}>Create a new athlete profile and run onboarding</div>
        </div>
      </div>

      <div style={{ fontSize:11, color:T.textDim }}>Select a profile or add a new athlete</div>
    </div>
  );
}


// ── Root ─────────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function CoachT() {
  const isMobile = useIsMobile();
  const [athleteId, setAthleteIdState] = useState(ATHLETE_ID);
  const [activeNav, setActiveNav]       = useState("dashboard");
  const [activeSub, setActiveSub]       = useState(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptStatus, setPromptStatus] = useState("loading");
  const [appState, setAppState]         = useState(null);
  const [isNewAthlete, setIsNewAthlete] = useState(false);

  const handleSelectAthlete = (id) => {
    if (id === "__new__") {
      // Show new athlete provisioning form
      setIsNewAthlete(true);
      setAppState(null);
      return;
    }
    setAthleteId(id);
    setAthleteIdState(id);
    setIsNewAthlete(false);
  };

  // sidebarW removed — no sidebar in new layout
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem("coacht_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [{
      role: "assistant",
      content: "Ready when you are, Dale. Training authority is active. Block 1 underway — swim is the primary frontier.\n\nWhat are we working on?",
    }];
  });

  // Persist messages to sessionStorage whenever they change
  // This survives page refresh but clears on tab close (intentional — not full DB yet)
  useEffect(() => {
    try {
      // Only keep last 50 messages to avoid storage limits
      // Strip image data before storing (base64 is huge)
      const toStore = messages.slice(-50).map(m => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : m.imageText || "",
        imageText: m.imageText,
      }));
      sessionStorage.setItem("coacht_messages", JSON.stringify(toStore));
    } catch {}
  }, [messages]);
  useEffect(() => {
    // Reset state when athlete changes
    setAppState(null);
    setMessages([{
      role: "assistant",
      content: `Ready when you are, ${athleteId === "alisha" ? "Alisha" : "Dale"}. Training authority is active.\n\nWhat are we working on?`,
    }]);
    _activeConvId = null;
    Promise.all([assembleSystemPrompt(), fetchState()]).then(([prompt, state]) => {
      setSystemPrompt(prompt);
      setPromptStatus(prompt ? "ready" : "error");
      if (state) {
        // get-state returns { _new: true } when the slug doesn't exist in DB
        if (state._new) {
          setIsNewAthlete(true);
          setAppState(null);
          return;
        }
        setIsNewAthlete(false);
        setAppState(state);
        if (state.messages?.length > 1) {
          const restored = state.messages.map(m => ({ role: m.role, content: m.content }));
          setMessages(restored);
          if (state.conversationId) _activeConvId = state.conversationId;
        }
      }
    }).catch(() => setPromptStatus("error"));
  }, [athleteId]);

  // Show athlete selector if no athlete chosen
  if (!athleteId) {
    return <AthleteSelector onSelect={handleSelectAthlete} />;
  }

  // New athlete — show provisioning form
  if (isNewAthlete) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <NewAthleteSetup
          onProvisioned={(newSlug, newName) => {
            setAthleteId(newSlug);
            setAthleteIdState(newSlug);
            setIsNewAthlete(false);
            // State will load via the useEffect dependency on athleteId
          }}
          onCancel={() => {
            setIsNewAthlete(false);
            setAthleteId("");
            setAthleteIdState("");
          }}
        />
      </>
    );
  }

  // Existing athlete awaiting onboarding completion
  // Guard: only block if appState is loaded AND explicitly false (not null/undefined)
  const onboardingComplete = appState === null ? true : (appState?.athlete?.onboardingComplete ?? true);
  if (!onboardingComplete && systemPrompt) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <OnboardingGate
          athleteId={athleteId}
          athleteName={appState?.athlete?.name || ""}
          systemPrompt={systemPrompt}
          onComplete={() => {
            setAppState(prev => ({
              ...prev,
              athlete: { ...(prev?.athlete || {}), onboardingComplete: true, consentGiven: true },
            }));
          }}
        />
      </>
    );
  }

  const setNav = (nav, sub=null) => {
    setActiveNav(nav);
    const item = NAV.find(n => n.id===nav);
    setActiveSub(sub || item?.subs?.[0]?.id || null);
  };

  // drag handlers removed — no sidebar divider

  // Shared props
  const sharedProps = { appState, setAppState, systemPrompt, promptStatus, messages, setMessages };

  if (isMobile) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <MobileLayout {...sharedProps} />
      </>
    );
  }

  const mainContent = () => {
    // Dashboard always renders (handles null appState gracefully)
    if (activeNav==="dashboard") return <DashboardSection appState={appState} setAppState={setAppState} promptStatus={promptStatus} setNav={setNav} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
    // All other pages: show loading spinner while initial state fetch is in flight
    // Once appState is set (even to {}), render the page — it handles empty data itself
    if (activeNav==="training") {
      if (appState === null) return <Loading />;
      if (activeSub==="atp")     return <ATPSection appState={appState} />;
      if (activeSub==="history") return <TrainingHistory appState={appState} />;
      if (activeSub==="trends")  return <TrendsSection appState={appState} />;
      return <TrainingWeek appState={appState} setAppState={setAppState} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
    }
    if (activeNav==="races") {
      if (appState === null) return <Loading />;
      if (activeSub==="manage") return <RacesManage appState={appState} setAppState={setAppState} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
      return <RacesCalendar s={appState} />;
    }
    if (activeNav==="daily") {
      if (activeSub==="history") return <DailyHistory appState={appState} />;
      if (activeSub==="sleep")   return <SleepHRV appState={appState} />;
      return <DailyLog appState={appState} setAppState={setAppState} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
    }
    if (activeNav==="athlete") {
      if (activeSub==="benchmarks") return <AthleteBenchmarks s={appState} />;
      return <AthleteProfile s={appState} />;
    }
    if (activeNav==="nutrition") return <NutritionSection systemPrompt={systemPrompt} promptStatus={promptStatus} messages={messages} setMessages={setMessages} />;
    if (activeNav==="review")    return <WeeklyReview appState={appState} setAppState={setAppState} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
    return <DashboardSection appState={appState} setAppState={setAppState} promptStatus={promptStatus} setNav={setNav} systemPrompt={systemPrompt} messages={messages} setMessages={setMessages} />;
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden" }}>
        <Topbar activeNav={activeNav} activeSub={activeSub} setNav={setNav} athleteName={appState?.athlete?.name||"Dale"} appState={appState} />
        {/* Main content — full width, no sidebar */}
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", minWidth:0 }}>
          {mainContent()}
        </div>
      </div>
      {/* Floating Coach T — available on every page */}
      <CoachTDrawer
        systemPrompt={systemPrompt}
        promptStatus={promptStatus}
        messages={messages}
        setMessages={setMessages}
        appState={appState}
        setAppState={setAppState}
      />
    </>
  );
}
