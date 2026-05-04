import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../profile/header";
import API_URL from "../../config/api";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24)));
}
function fmt(n) { return (n ?? 0).toLocaleString(); }
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDateShort(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Color helpers ────────────────────────────────────────────
function overallColor(percent) {
  return percent >= 100 ? "#16a34a" : "#2563eb";
}
const TODAY_COLOR   = "#ea580c"; // orange for today's goal arc
const TODAY_TRACK   = "#ffedd5";
const STREAK_COLOR  = "#db2777";
const STREAK_TRACK  = "#fce7f3";
const SESSION_COLOR = "#ec4899";
const DONE_COLOR    = "#16a34a";

// ─── Arc Progress ─────────────────────────────────────────────
function ArcProgress({ percent = 0, size = 80, color, trackColor = "#ede9e3", strokeW = 7, children }) {
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeW} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1), stroke 0.5s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">{children}</div>
    </div>
  );
}

// ─── Checkmark SVG ────────────────────────────────────────────
function Check({ color = DONE_COLOR, size = 20 }) {
  return (
    <svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── Today Goal Card (orange arc, Trackbear-inspired) ────────
function TodayGoalCard({ todayCount = 0, dailyTarget = 0, label = "words", color = TODAY_COLOR, trackColor = TODAY_TRACK }) {
  const pct = dailyTarget > 0 ? Math.min(Math.round((todayCount / dailyTarget) * 100), 100) : 0;
  const done = pct >= 100;
  const started = todayCount > 0;
  const remaining = Math.max(0, dailyTarget - todayCount);
  const arcColor = done ? DONE_COLOR : color;
  const arcTrack = done ? "#dcfce7" : trackColor;

  return (
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <ArcProgress percent={pct} size={76} color={arcColor} trackColor={arcTrack} strokeW={7}>
        {done
          ? <Check />
          : <>
              <span className="font-serif font-bold leading-none text-[#2d3748]" style={{ fontSize: 15 }}>{fmt(todayCount)}</span>
              <span className="text-[#9a8c7a] leading-none mt-0.5" style={{ fontSize: 9 }}>of {fmt(dailyTarget)}</span>
            </>}
      </ArcProgress>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1 truncate" style={{ color: arcColor }}>
          {label}
        </p>
        {done
          ? <p className="text-sm font-semibold text-[#2d3748]">Daily goal complete ✓</p>
          : started
          ? <>
              <p className="text-sm font-semibold text-[#2d3748]">{fmt(remaining)} {label} to go</p>
              <p className="text-[11px] text-[#9a8c7a] mt-0.5">{pct}% of today's goal</p>
            </>
          : <>
              <p className="text-sm font-semibold text-[#2d3748]">Start writing today</p>
              <p className="text-[11px] text-[#9a8c7a] mt-0.5">{fmt(dailyTarget)} {label} goal</p>
            </>}
      </div>
    </div>
  );
}

// ─── Session Goal Card (today view) ───────────────────────────
function SessionGoalCard({ current = 0, target = 0, period = "WEEKLY", sessionsToday = 0 }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const done = pct >= 100;
  const remaining = Math.max(0, target - current);
  const arcColor = done ? DONE_COLOR : current > 0 ? SESSION_COLOR : "#9a8c7a";
  const arcTrack = done ? "#dcfce7" : current > 0 ? "#ede9d8" : "#ede9e3";
  const periodLabel = period === "WEEKLY" ? "this week" : "this month";

  return (
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <ArcProgress percent={pct} size={76} color={arcColor} trackColor={arcTrack} strokeW={7}>
        {done
          ? <Check color={DONE_COLOR} />
          : <>
              <span className="font-serif font-bold leading-none text-[#2d3748]" style={{ fontSize: 15 }}>{current}</span>
              <span className="text-[#9a8c7a] leading-none mt-0.5" style={{ fontSize: 9 }}>of {target}</span>
            </>}
      </ArcProgress>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: arcColor }}>
          Sessions · {period.toLowerCase()}
        </p>
        {done
          ? <p className="text-sm font-semibold text-[#2d3748]">Period goal complete ✓</p>
          : remaining > 0
          ? <>
              <p className="text-sm font-semibold text-[#2d3748]">{remaining} session{remaining !== 1 ? "s" : ""} to go</p>
              <p className="text-[11px] text-[#9a8c7a] mt-0.5">{current} logged {periodLabel}</p>
            </>
          : <>
              <p className="text-sm font-semibold text-[#2d3748]">No sessions yet</p>
              <p className="text-[11px] text-[#9a8c7a] mt-0.5">Goal: {target} sessions {periodLabel}</p>
            </>}
        {sessionsToday > 0 && (
          <p className="text-[11px] mt-1 font-semibold" style={{ color: SESSION_COLOR }}>{sessionsToday} logged today</p>
        )}
      </div>
    </div>
  );
}

// ─── Days Streak Card (today view) ────────────────────────────
// todayLogged: true when the user already logged a day today (streak counted)
function DaysStreakCard({ currentStreak = 0, target = 0, todayLogged = false }) {
  const pct = target > 0 ? Math.min(Math.round((currentStreak / target) * 100), 100) : 0;
  const done = pct >= 100;
  const remaining = Math.max(0, target - currentStreak);
  const arcColor = done ? DONE_COLOR : currentStreak > 0 ? STREAK_COLOR : "#9a8c7a";
  const arcTrack = done ? "#dcfce7" : currentStreak > 0 ? STREAK_TRACK : "#ede9e3";

  return (
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <ArcProgress percent={pct} size={76} color={arcColor} trackColor={arcTrack} strokeW={7}>
        {done
          ? <Check color={DONE_COLOR} />
          : <>
              <span className="font-serif font-bold leading-none text-[#2d3748]" style={{ fontSize: 15 }}>{currentStreak}</span>
              <span className="text-[#9a8c7a] leading-none mt-0.5" style={{ fontSize: 9 }}>of {target}</span>
            </>}
      </ArcProgress>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: arcColor }}>
          Days Streak
        </p>
        {done
          ? <p className="text-sm font-semibold text-[#2d3748]">Streak goal reached ✓</p>
          : todayLogged
          ? <>
              <p className="text-sm font-semibold text-[#2d3748]">Today counted ✓</p>
              <p className="text-[11px] text-[#9a8c7a] mt-0.5">{currentStreak} day{currentStreak !== 1 ? "s" : ""} in a row · {remaining} to go</p>
            </>
          : currentStreak > 0
          ? <>
              <p className="text-sm font-semibold text-[#2d3748]">{currentStreak} day{currentStreak !== 1 ? "s" : ""} in a row</p>
              <p className="text-[11px] text-[#9a8c7a] mt-0.5">{remaining} more to hit your target</p>
            </>
          : <>
              <p className="text-sm font-semibold text-[#2d3748]">No streak yet</p>
              <p className="text-[11px] text-[#9a8c7a] mt-0.5">Target: {target} consecutive days</p>
            </>}
      </div>
    </div>
  );
}

// ─── Overall Arc Item (blue, for overview/progress tabs) ──────
function OverallArcItem({ percent, label, line1, line2, color }) {
  const arcColor = color ?? overallColor(percent);
  return (
    <div className="flex items-center gap-4">
      <ArcProgress percent={percent} size={80} color={arcColor} trackColor={percent >= 100 ? "#dcfce7" : "#ede9e3"} strokeW={7}>
        {percent >= 100
          ? <Check color={DONE_COLOR} size={20} />
          : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{percent}%</span>}
      </ArcProgress>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: arcColor }}>{label}</p>
        <p className="text-sm font-semibold text-[#2d3748]">{line1}</p>
        {line2 && <p className="text-xs text-[#9a8c7a]">{line2}</p>}
      </div>
    </div>
  );
}

// ─── Streak Running Totals ───────────────────────────────────
function StreakRunningTotals({ dayLogs }) {
  if (!dayLogs?.length) return (
    <div className="bg-gradient-to-br from-[#fdf2f8] to-[#fff0fa] rounded-2xl border border-dashed border-[#f9a8d4] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-[#fbcfe8]" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#be185d]">Built through this streak</p>
        <div className="h-px flex-1 bg-[#fbcfe8]" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["words written", "chapters drafted", "scenes completed", "minutes spent"].map((label, i) => (
          <div key={i} className="text-center opacity-40">
            <p className="font-serif font-bold text-2xl text-[#9d174d]">—</p>
            <p className="text-[10px] text-[#be185d] uppercase tracking-wide font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-center text-[#f472b6] leading-relaxed mt-3">
        Log your first day to start building your streak stats. Your words, chapters, and minutes will all appear right here — one day at a time. 🔥
      </p>
    </div>
  );
  const totals = dayLogs.reduce(
    (acc, l) => ({
      words:    acc.words    + (l.wordsLogged    || 0),
      chapters: acc.chapters + (l.chaptersLogged || 0),
      scenes:   acc.scenes   + (l.scenesLogged   || 0),
      minutes:  acc.minutes  + (l.minutesLogged  || 0),
    }),
    { words: 0, chapters: 0, scenes: 0, minutes: 0 }
  );
  const items = [
    { key: "words",    label: "words written",    value: totals.words,    show: totals.words > 0 },
    { key: "chapters", label: "chapters drafted", value: totals.chapters, show: totals.chapters > 0 },
    { key: "scenes",   label: "scenes completed", value: totals.scenes,   show: totals.scenes > 0 },
    { key: "minutes",  label: "minutes spent",    value: totals.minutes,  show: totals.minutes > 0 },
  ].filter(i => i.show);

  if (!items.length) return null;

  return (
    <div className="bg-gradient-to-br from-[#fdf2f8] to-[#fff0fa] rounded-2xl border border-[#fbcfe8] p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px flex-1 bg-[#fbcfe8]" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#be185d]">Built through this streak</p>
        <div className="h-px flex-1 bg-[#fbcfe8]" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(item => (
          <div key={item.key} className="text-center">
            <p className="font-serif font-bold text-2xl text-[#9d174d]">{(item.value ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-[#be185d] uppercase tracking-wide font-semibold mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-center text-[#f472b6] leading-relaxed">
        Every number above was built one day at a time. Keep the chain alive.
      </p>
    </div>
  );
}

// ─── Session Running Totals ──────────────────────────────────
function SessionRunningTotals({ sessionLogs }) {
  if (!sessionLogs?.length) return (
    <div className="bg-gradient-to-br from-[#fdf2f8] to-[#fce7f3] rounded-2xl border border-dashed border-[#f9a8d4] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-[#fbcfe8]" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#be185d]">Across all sessions</p>
        <div className="h-px flex-1 bg-[#fbcfe8]" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["words written", "chapters drafted", "scenes completed", "minutes logged"].map((label, i) => (
          <div key={i} className="text-center opacity-40">
            <p className="font-serif font-bold text-2xl text-[#9d174d]">—</p>
            <p className="text-[10px] text-[#be185d] uppercase tracking-wide font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-center text-[#f472b6] leading-relaxed mt-3">
        Log your first session and watch your totals fill in here. Every minute and every word counts. ✍️
      </p>
    </div>
  );
  const totals = sessionLogs.reduce(
    (acc, l) => ({
      words:    acc.words    + (l.wordsWritten    || 0),
      chapters: acc.chapters + (l.chaptersWritten || 0),
      scenes:   acc.scenes   + (l.scenesWritten   || 0),
      minutes:  acc.minutes  + (l.minutesWritten  || 0),
    }),
    { words: 0, chapters: 0, scenes: 0, minutes: 0 }
  );
  const items = [
    { key: "words",    label: "words written",    value: totals.words,    show: totals.words > 0 },
    { key: "chapters", label: "chapters drafted", value: totals.chapters, show: totals.chapters > 0 },
    { key: "scenes",   label: "scenes completed", value: totals.scenes,   show: totals.scenes > 0 },
    { key: "minutes",  label: "minutes logged",   value: totals.minutes,  show: totals.minutes > 0 },
  ].filter(i => i.show);

  if (!items.length) return null;

  return (
    <div className="bg-gradient-to-br from-[#fdf2f8] to-[#fce7f3] rounded-2xl border border-[#fbcfe8] p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px flex-1 bg-[#fbcfe8]" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#be185d]">Across all sessions</p>
        <div className="h-px flex-1 bg-[#fbcfe8]" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map(item => (
          <div key={item.key} className="text-center">
            <p className="font-serif font-bold text-2xl text-[#9d174d]">{(item.value ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-[#be185d] uppercase tracking-wide font-semibold mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-center text-[#f472b6] leading-relaxed">
        {sessionLogs.length} session{sessionLogs.length !== 1 ? "s" : ""} logged in total.
      </p>
    </div>
  );
}

// ─── History Log ──────────────────────────────────────────────
function HistoryLog({ logs }) {
  const [expanded, setExpanded] = useState(false);
  if (!logs?.length) return (
    <div className="text-center py-10">
      <div className="w-10 h-10 rounded-2xl border-2 border-dashed border-[#e8e0d0] mx-auto mb-3 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-[#c4bdb4]" />
      </div>
      <p className="text-sm text-[#9a8c7a]">No activity logged yet</p>
      <p className="text-xs text-[#c4bdb4] mt-1">Your writing sessions will appear here</p>
    </div>
  );

  const visible = expanded ? logs : logs.slice(0, 6);

  return (
    <div className="space-y-1">
      {visible.map((log, i) => {
        const isWordLog = log._type === "word";
        const isAdd = isWordLog ? log.wordsAdded > 0 : (log.chaptersAdded > 0 || log.scenesAdded > 0);
        let parts = [];
        if (isWordLog) parts.push(`${fmt(Math.abs(log.wordsAdded))} words`);
        else {
          if (log.chaptersAdded && log.chaptersAdded !== 0) parts.push(`${Math.abs(log.chaptersAdded)} ch`);
          if (log.scenesAdded && log.scenesAdded !== 0) parts.push(`${Math.abs(log.scenesAdded)} sc`);
        }
        return (
          <div key={log.id || i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-[#faf7f2] transition-colors">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ background: isAdd ? "#f0fdf4" : "#fff1f2", color: isAdd ? "#2d6e5a" : "#ef4444" }}>
              {isAdd ? "+" : "−"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#2d3748] font-medium">{isAdd ? "Added" : "Removed"} {parts.join(", ")}</p>
              <p className="text-[11px] text-[#9a8c7a]">{fmtDate(log.loggedAt)}</p>
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color: isAdd ? "#2d6e5a" : "#ef4444" }}>
              {isAdd ? "+" : "−"}{parts[0]}
            </span>
          </div>
        );
      })}
      {logs.length > 6 && (
        <button onClick={() => setExpanded(e => !e)}
          className="w-full text-center text-[11px] font-semibold text-[#9a8c7a] hover:text-[#2d3748] py-2 transition-colors">
          {expanded ? "Show less" : `Show all ${logs.length} entries`}
        </button>
      )}
    </div>
  );
}

// ─── Progress Modal ───────────────────────────────────────────
// Only handles progress types — sessions have their own modal
const TRACK_TYPES = [
  { key: "words",    label: "Words",    color: "#2d6e5a", bg: "#f0fdf4" },
  { key: "chapters", label: "Chapters", color: "#b8962e", bg: "#fffbeb" },
  { key: "scenes",   label: "Scenes",   color: "#6d28d9", bg: "#f5f3ff" },
];

function ProgressModal({ open, onClose, projectId, trackerSummary, onSuccess }) {
  const [activeType, setActiveType] = useState("words");
  const [amount, setAmount]         = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [preview, setPreview]       = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [removeMode, setRemoveMode] = useState(false);
  const inputRef   = useRef(null);
  const overlayRef = useRef(null);

  const wc = trackerSummary?.wordCount;
  const ch = trackerSummary?.chapters;
  const sc = trackerSummary?.scenes;

  const availableTypes = TRACK_TYPES.filter(t => {
    if (t.key === "words")    return !!wc;
    if (t.key === "chapters") return !!ch;
    if (t.key === "scenes")   return !!sc;
    return false;
  });

  const currentType = TRACK_TYPES.find(t => t.key === activeType);

  useEffect(() => {
    setAmount("");
    setError("");
    setPreview(null);
    setRemoveMode(false);
    if (open) {
      if (!availableTypes.find(t => t.key === activeType)) {
        setActiveType(availableTypes[0]?.key || "session");
      }
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, activeType]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function fetchPreview(field, amt) {
    if (!amt || isNaN(amt) || Number(amt) <= 0) { setPreview(null); return; }
    setPreviewLoading(true);
    try {
      const r = await fetch(`${API_URL}/projects/${projectId}/previewDelete`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, amount: Number(amt) }),
      });
      const d = await r.json();
      if (r.ok) setPreview(d);
    } catch {}
    finally { setPreviewLoading(false); }
  }

  async function handleAdd() {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError("Please enter a valid number."); return;
    }
    setLoading(true); setError("");
    try {
      let url, body;
      if (activeType === "words") {
        url = `${API_URL}/projects/${projectId}/logWords`;
        body = { wordsAdded: Number(amount) };
      } else {
        url = `${API_URL}/projects/${projectId}/logChapterScene`;
        body = activeType === "chapters"
          ? { chaptersAdded: Number(amount) }
          : { scenesAdded: Number(amount) };
      }
      const r = await fetch(url, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const d = await r.json(); setError(d.message || "Something went wrong."); return; }
      onSuccess(); onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError("Please enter a valid number."); return;
    }
    setLoading(true); setError("");
    try {
      let url, field;
      if (activeType === "words") { url = `${API_URL}/projects/${projectId}/deleteWords`; field = "words"; }
      else { url = `${API_URL}/projects/${projectId}/deleteChapterScene`; field = activeType; }
      const r = await fetch(url, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, amount: Number(amount) }),
      });
      if (!r.ok) { const d = await r.json(); setError(d.message || "Something went wrong."); return; }
      onSuccess(); onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  if (!open) return null;

  return (
    <div ref={overlayRef} onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(30,24,16,0.45)", backdropFilter: "blur(4px)" }}>
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ boxShadow: "0 32px 64px rgba(30,24,16,0.24), 0 8px 24px rgba(30,24,16,0.12)" }}>

        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[#f0ebe3]">
          <div>
            <p className="text-[10px] text-[#ea580c] uppercase tracking-widest font-semibold mb-0.5">Enter Progress</p>
            <h2 className="font-serif text-xl text-[#2d3748] leading-tight">What did you write?</h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#f5f0ea] hover:bg-[#e8e0d0] flex items-center justify-center text-[#9a8c7a] hover:text-[#2d3748] transition-all">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="flex gap-2 flex-wrap">
            {availableTypes.map(t => (
              <button key={t.key} onClick={() => setActiveType(t.key)}
                className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all"
                style={activeType === t.key
                  ? { background: t.bg, borderColor: t.color, color: t.color }
                  : { background: "white", borderColor: "#e8e0d0", color: "#6b5c4a" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pt-5 pb-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-2 block">
              Number of {currentType?.label}
            </label>
            <input
              ref={inputRef}
              type="number" min="1"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(""); setPreview(null); setRemoveMode(false); }}
              onBlur={e => { if (removeMode) fetchPreview(activeType, e.target.value); }}
              onFocus={e => e.target.style.borderColor = currentType?.color}
              placeholder={`e.g. ${activeType === "words" ? "500" : "1"}`}
              className="w-full px-4 py-3.5 rounded-2xl border text-[#2d3748] font-serif text-xl font-bold outline-none transition-all"
              style={{ borderColor: error ? "#fca5a5" : "#e8e0d0" }}
            />
            {error && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {error}
              </p>
            )}
          </div>

          {preview && !isSession && (
            <div className="mt-3 p-3.5 rounded-2xl border border-amber-200 bg-amber-50">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-1">
                <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                Heads up — removal only
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                {preview.message || `Removing ${fmt(Number(amount))} ${activeType} will update your progress.`}
              </p>
            </div>
          )}
          {previewLoading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[#9a8c7a]">
              <div className="w-3 h-3 border border-[#9a8c7a] border-t-transparent rounded-full animate-spin" />
              Checking impact…
            </div>
          )}
        </div>

        <div className="px-6 pt-3 pb-7 flex gap-3">
          <button
            onClick={() => {
              setRemoveMode(true); setPreview(null);
              if (amount) fetchPreview(activeType, amount);
              handleDelete();
            }}
            disabled={loading || !amount}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: "#fca5a5", color: "#ef4444", background: "#fff1f2" }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
              : <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </>}
          </button>
          <button
            onClick={() => { setRemoveMode(false); setPreview(null); handleAdd(); }}
            disabled={loading || !amount}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: loading ? "#9a8c7a" : currentType?.color }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add to progress
              </>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Log Day Modal ────────────────────────────────────────────
function LogDayModal({ open, onClose, projectId, trackerSummary, onSuccess, dayLogs, currentStreak, daysTarget }) {
  const overlayRef = useRef(null);
  const [reflection, setReflection] = useState("");
  const [wordsToday, setWordsToday]   = useState("");
  const [chaptersToday, setChaptersToday] = useState("");
  const [scenesToday, setScenesToday] = useState("");
  const [minutesToday, setMinutesToday] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const wc = trackerSummary?.wordCount;
  const ch = trackerSummary?.chapters;
  const sc = trackerSummary?.scenes;
  const streak = currentStreak || 0;
  const target = daysTarget || 0;

  useEffect(() => {
    if (open) {
      setReflection(""); setWordsToday(""); setChaptersToday("");
      setScenesToday(""); setMinutesToday(""); setError("");
    }
  }, [open]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit() {
    setError("");
    const words    = Number(wordsToday)    || 0;
    const chapters = Number(chaptersToday) || 0;
    const scenes   = Number(scenesToday)   || 0;
    const minutes  = Number(minutesToday)  || 0;

    if (!words && !chapters && !scenes && !minutes) {
      setError("Please enter at least one value to log the day.");
      return;
    }

    setLoading(true);
    try {
      const dayRes = await fetch(`${API_URL}/projects/${projectId}/logDay`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordsLogged: words, chaptersLogged: chapters, scenesLogged: scenes, minutesLogged: minutes }),
      });
      if (!dayRes.ok) {
        const d = await dayRes.json();
        setError(d.message || "Could not log the day.");
        return;
      }

      if (reflection.trim()) {
        const formData = new FormData();
        formData.append("context", reflection.trim());
        formData.append("sourceType", "DAYS_CHALLENGE");
        await fetch(`${API_URL}/snippets`, { method: "POST", credentials: "include", body: formData });
      }

      onSuccess(); onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div ref={overlayRef} onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(30,24,16,0.45)", backdropFilter: "blur(4px)" }}>
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ boxShadow: "0 32px 64px rgba(30,24,16,0.24), 0 8px 24px rgba(30,24,16,0.12)" }}>

        <div className="bg-[#2d3748] px-6 pt-5 pb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#d4af37] uppercase tracking-widest font-semibold mb-0.5">Day Challenge</p>
            <h2 className="font-serif text-xl text-white leading-tight">How was your writing today?</h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-5 pb-2 space-y-5 overflow-y-auto max-h-[70vh]">

          {/* Streak progress indicator */}
          {target > 0 && (
            <div className="flex items-center gap-3 bg-[#fdf2f8] rounded-2xl px-4 py-3 border border-[#fbcfe8]">
              <div className="flex-shrink-0">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="12" stroke="#fbcfe8" strokeWidth="3" />
                  <circle cx="14" cy="14" r="12" stroke="#be185d" strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 12}`}
                    strokeDashoffset={`${2 * Math.PI * 12 * (1 - Math.min(streak / target, 1))}`}
                    strokeLinecap="round"
                    style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                  />
                  <text x="14" y="18" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#9d174d">{streak}</text>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-[#9d174d]">
                  {streak === 0
                    ? "Start your streak today"
                    : streak >= target
                    ? "Streak complete — you did it"
                    : `${streak} of ${target} days — ${target - streak} to go`}
                </p>
                <p className="text-[10px] text-[#f472b6] mt-0.5">
                  {streak === 0
                    ? "Log today to begin the chain."
                    : "Log today to keep the chain alive."}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-2 block">
              Share a reflection <span className="font-normal text-[#c4bdb4] normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="How did today's writing go? Any wins, struggles, or surprises worth noting?"
              rows={3} maxLength={300}
              className="w-full px-4 py-3 rounded-2xl border border-[#e8e0d0] text-sm text-[#2d3748] placeholder-[#c4bdb4] leading-relaxed resize-none outline-none transition-all bg-[#faf7f2]"
              onFocus={e => e.target.style.borderColor = "#d4af37"}
              onBlur={e => e.target.style.borderColor = "#e8e0d0"}
            />
            <p className="text-[10px] text-[#c4bdb4] text-right mt-1">{reflection.length}/300</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-3">
              What did you write today? <span className="font-normal text-[#c4bdb4] normal-case tracking-normal">— enter at least one</span>
            </p>
            {/* All four fields always shown — writers log whatever they did */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-[#2d6e5a] uppercase tracking-wider mb-1.5 block">Words</label>
                <input type="number" min="0" value={wordsToday} onChange={e => setWordsToday(e.target.value)}
                  placeholder="e.g. 800"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#2d3748] outline-none transition-all font-semibold"
                  onFocus={e => e.target.style.borderColor = "#2d6e5a"} onBlur={e => e.target.style.borderColor = "#e8e0d0"} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#b8962e] uppercase tracking-wider mb-1.5 block">Chapters</label>
                <input type="number" min="0" value={chaptersToday} onChange={e => setChaptersToday(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#2d3748] outline-none transition-all font-semibold"
                  onFocus={e => e.target.style.borderColor = "#b8962e"} onBlur={e => e.target.style.borderColor = "#e8e0d0"} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#6d28d9] uppercase tracking-wider mb-1.5 block">Scenes</label>
                <input type="number" min="0" value={scenesToday} onChange={e => setScenesToday(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#2d3748] outline-none transition-all font-semibold"
                  onFocus={e => e.target.style.borderColor = "#6d28d9"} onBlur={e => e.target.style.borderColor = "#e8e0d0"} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#9a8c7a] uppercase tracking-wider mb-1.5 block">Minutes</label>
                <input type="number" min="0" value={minutesToday} onChange={e => setMinutesToday(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#2d3748] outline-none transition-all font-semibold"
                  onFocus={e => e.target.style.borderColor = "#9a8c7a"} onBlur={e => e.target.style.borderColor = "#e8e0d0"} />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {error}
            </p>
          )}

          <div className="flex items-start gap-2 text-[11px] text-[#9a8c7a] bg-[#faf7f2] rounded-xl px-3.5 py-3 border border-[#e8e0d0]">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 16v-4m0-4h.01" />
            </svg>
            <span className="leading-relaxed">This counts as your writing day and updates your consecutive streak. Your reflection will be shared as a day-challenge snippet.</span>
          </div>
        </div>

        <div className="px-6 pt-3 pb-7">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: loading ? "#9a8c7a" : "linear-gradient(135deg, #2d3748 0%, #1a2535 100%)" }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Count today's writing
              </>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Log Session Modal ────────────────────────────────────────
// For session-tracked projects — writers log what they did in the session
function LogSessionModal({ open, onClose, projectId, onSuccess }) {
  const overlayRef = useRef(null);
  const [wordsWritten, setWordsWritten]   = useState("");
  const [chapters, setChapters]           = useState("");
  const [scenes, setScenes]               = useState("");
  const [minutes, setMinutes]             = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");

  useEffect(() => {
    if (open) {
      setWordsWritten(""); setChapters(""); setScenes(""); setMinutes(""); setError("");
    }
  }, [open]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit() {
    setError("");
    const words    = Number(wordsWritten) || 0;
    const chaps    = Number(chapters)     || 0;
    const scs      = Number(scenes)       || 0;
    const mins     = Number(minutes)      || 0;

    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/projects/${projectId}/logSession`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordsWritten: words, chaptersWritten: chaps, scenesWritten: scs, minutesWritten: mins }),
      });
      if (!r.ok) {
        const d = await r.json();
        setError(d.message || "Could not log the session.");
        return;
      }
      onSuccess(); onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div ref={overlayRef} onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(30,24,16,0.45)", backdropFilter: "blur(4px)" }}>
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ boxShadow: "0 32px 64px rgba(30,24,16,0.24), 0 8px 24px rgba(30,24,16,0.12)" }}>

        <div className="bg-[#be185d] px-6 pt-5 pb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-pink-200 uppercase tracking-widest font-semibold mb-0.5">Session Tracker</p>
            <h2 className="font-serif text-xl text-white leading-tight">Log your writing session</h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-5 pb-2 space-y-5 overflow-y-auto max-h-[70vh]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-3">
              What did you do this session? <span className="font-normal text-[#c4bdb4] normal-case tracking-normal">— all optional</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-[#2d6e5a] uppercase tracking-wider mb-1.5 block">Words</label>
                <input type="number" min="0" value={wordsWritten} onChange={e => setWordsWritten(e.target.value)}
                  placeholder="e.g. 800"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#2d3748] outline-none transition-all font-semibold"
                  onFocus={e => e.target.style.borderColor = "#2d6e5a"} onBlur={e => e.target.style.borderColor = "#e8e0d0"} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#b8962e] uppercase tracking-wider mb-1.5 block">Chapters</label>
                <input type="number" min="0" value={chapters} onChange={e => setChapters(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#2d3748] outline-none transition-all font-semibold"
                  onFocus={e => e.target.style.borderColor = "#b8962e"} onBlur={e => e.target.style.borderColor = "#e8e0d0"} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#6d28d9] uppercase tracking-wider mb-1.5 block">Scenes</label>
                <input type="number" min="0" value={scenes} onChange={e => setScenes(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#2d3748] outline-none transition-all font-semibold"
                  onFocus={e => e.target.style.borderColor = "#6d28d9"} onBlur={e => e.target.style.borderColor = "#e8e0d0"} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#9a8c7a] uppercase tracking-wider mb-1.5 block">Minutes</label>
                <input type="number" min="0" value={minutes} onChange={e => setMinutes(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#2d3748] outline-none transition-all font-semibold"
                  onFocus={e => e.target.style.borderColor = "#9a8c7a"} onBlur={e => e.target.style.borderColor = "#e8e0d0"} />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {error}
            </p>
          )}

          <div className="flex items-start gap-2 text-[11px] text-[#9a8c7a] bg-[#fdf2f8] rounded-xl px-3.5 py-3 border border-[#fbcfe8]">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 16v-4m0-4h.01" />
            </svg>
            <span className="leading-relaxed">This logs one writing session toward your session goal. All work fields are optional — fill in what you tracked.</span>
          </div>
        </div>

        <div className="px-6 pt-3 pb-7">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: loading ? "#9a8c7a" : "linear-gradient(135deg, #be185d 0%, #9d174d 100%)" }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Log this session
              </>}
          </button>
        </div>
      </div>
    </div>
  );
}


const PLACEHOLDER_TODOS = [
  { id: "pt1", task: "Outline your next chapter before writing it",      markComplete: false, createdAt: null },
  { id: "pt2", task: "Write the hardest scene first, while you're fresh", markComplete: false, createdAt: null },
  { id: "pt3", task: "Read the last page you wrote before starting today", markComplete: true,  createdAt: null },
];

function TodoTab({ projectId }) {
  const [todos,     setTodos]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [input,     setInput]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [deletingId,setDeletingId]= useState(null);
  const [filter,    setFilter]    = useState("all");

  useEffect(() => { loadTodos(); }, [projectId]);

  async function loadTodos() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/todos/${projectId}/todos`, { credentials: "include" });
      const d = await r.json();
      if (r.ok) setTodos(d.todos || []);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/todos/${projectId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: input.trim() }),
      });
      const d = await r.json();
      if (r.ok) { setTodos(prev => [d.todo, ...prev]); setInput(""); }
    } catch {}
    finally { setSaving(false); }
  }

  async function handleToggle(todo) {
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, markComplete: !t.markComplete } : t));
    try {
      await fetch(`${API_URL}/todos/toggle`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoId: todo.id }),
      });
    } catch { loadTodos(); }
  }

  async function handleDelete(todoId) {
    setDeletingId(todoId);
    try {
      const r = await fetch(`${API_URL}/todos/delete`, {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoId }),
      });
      if (r.ok) setTodos(prev => prev.filter(t => t.id !== todoId));
    } catch {}
    finally { setDeletingId(null); }
  }

  const isPlaceholder = todos.length === 0 && !saving;
  const displayTodos  = isPlaceholder ? PLACEHOLDER_TODOS : todos;
  const activeCount   = todos.filter(t => !t.markComplete).length;
  const doneCount     = todos.filter(t => t.markComplete).length;
  const filtered      = isPlaceholder ? displayTodos : displayTodos.filter(t =>
    filter === "all" ? true : filter === "active" ? !t.markComplete : t.markComplete
  );

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-3">
        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Add a writing task…"
          className="flex-1 px-4 py-3 rounded-2xl border border-[#e8e0d0] text-sm text-[#2d3748] outline-none bg-white transition-all placeholder:text-[#c4bdb4]"
          onFocus={e => e.target.style.borderColor = "#2d6e5a"} onBlur={e => e.target.style.borderColor = "#e8e0d0"} />
        <button type="submit" disabled={saving || !input.trim()}
          className="px-5 py-3 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: "#2d6e5a" }}>
          {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : "Add"}
        </button>
      </form>

      <div className="bg-white rounded-3xl border border-[#e8e0d0] overflow-hidden"
        style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
        {isPlaceholder && (
          <div className="flex items-center gap-2.5 px-5 py-3 bg-[#faf7f2] border-b border-dashed border-[#e8e0d0]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c4bdb4]" />
            <p className="text-[11px] text-[#9a8c7a]">These are example tasks — add your first real task above.</p>
          </div>
        )}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f5f0ea]">
          <div className="flex gap-1 p-1 bg-[#faf7f2] rounded-xl">
            {[["all", `All ${displayTodos.length}`], ["active", `Active ${activeCount}`], ["done", `Done ${doneCount}`]].map(([k, label]) => (
              <button key={k} onClick={() => !isPlaceholder && setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${filter === k ? "bg-white text-[#2d3748] shadow-sm" : "text-[#9a8c7a] hover:text-[#2d3748]"} ${isPlaceholder ? "cursor-default" : ""}`}>
                {label}
              </button>
            ))}
          </div>
          {!isPlaceholder && doneCount > 0 && (
            <span className="text-[11px] text-[#9a8c7a]">{Math.round((doneCount / todos.length) * 100)}% complete</span>
          )}
        </div>
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#e8e0d0] border-t-[#2d6e5a] rounded-full animate-spin" />
          </div>
        ) : !isPlaceholder && filtered.length === 0 ? (
          <div className="py-16 text-center px-6">
            <p className="text-sm text-[#9a8c7a]">
              {filter === "done" ? "No completed tasks yet" : filter === "active" ? "No active tasks" : "No tasks yet — add one above"}
            </p>
          </div>
        ) : (
          <div className={`divide-y divide-[#f5f0ea] ${isPlaceholder ? "opacity-50 pointer-events-none select-none" : ""}`}>
            {filtered.map(todo => (
              <div key={todo.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#fdfaf6] transition-colors group">
                <button onClick={() => handleToggle(todo)}
                  className="w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  style={{ borderColor: todo.markComplete ? "#2d6e5a" : "#c4bdb4", background: todo.markComplete ? "#2d6e5a" : "white" }}>
                  {todo.markComplete && <svg width="10" height="10" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm transition-all leading-relaxed ${todo.markComplete ? "text-[#b8a898] line-through" : "text-[#2d3748]"}`}>{todo.task}</p>
                  {todo.createdAt && <p className="text-[11px] text-[#c4bdb4] mt-0.5">{fmtDateShort(todo.createdAt)}</p>}
                </div>
                {!isPlaceholder && (
                  <button onClick={() => handleDelete(todo.id)} disabled={deletingId === todo.id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c4bdb4] hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40">
                    {deletingId === todo.id
                      ? <div className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                      : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────
const PLACEHOLDER_NOTES = [
  { id: "pn1", title: "Character voice", note: "How does your protagonist speak when nervous vs confident? Jot down their quirks, phrases they overuse, what they never say.", createdAt: null },
  { id: "pn2", title: "World detail to revisit", note: "What does your setting look, smell, and feel like at key moments? Sensory details make scenes come alive.", createdAt: null },
  { id: "pn3", title: "Opening line ideas", note: "Drop first-line experiments here so you never lose them. The right opener can unlock the whole chapter.", createdAt: null },
];

function NotesTab({ projectId }) {
  const [notes, setNotes]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [titleInput, setTitle]  = useState("");
  const [bodyInput, setBody]    = useState("");
  const [saving, setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadNotes(); }, [projectId]);

  async function loadNotes() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/notes/${projectId}/notes`, { credentials: "include" });
      const d = await r.json();
      if (r.ok) setNotes(d.notes || []);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!bodyInput.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/notes/${projectId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput.trim() || null, note: bodyInput.trim() }),
      });
      const d = await r.json();
      if (r.ok) { setNotes(prev => [d.note, ...prev]); setTitle(""); setBody(""); setCreating(false); }
    } catch {}
    finally { setSaving(false); }
  }

  async function handleDelete(noteId) {
    setDeletingId(noteId);
    try {
      const r = await fetch(`${API_URL}/notes/delete`, {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      if (r.ok) setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch {}
    finally { setDeletingId(null); }
  }

  const isPlaceholder  = notes.length === 0 && !creating;
  const displayNotes   = isPlaceholder ? PLACEHOLDER_NOTES : notes;

  return (
    <div className="space-y-4">
      {creating ? (
        <div className="bg-white rounded-3xl border border-[#2d6e5a] p-5 sm:p-6"
          style={{ boxShadow: "0 0 0 3px rgba(45,110,90,0.08), 0 8px 24px rgba(45,35,20,0.06)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-4">New note</p>
          <input value={titleInput} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)"
            className="w-full px-0 py-1 text-base font-serif font-semibold text-[#2d3748] border-0 border-b border-[#e8e0d0] outline-none mb-4 bg-transparent placeholder:text-[#d4cdc4]" />
          <textarea value={bodyInput} onChange={e => setBody(e.target.value)} placeholder="Write your note here..."
            rows={5} className="w-full px-0 py-1 text-sm text-[#2d3748] border-0 outline-none resize-none bg-transparent placeholder:text-[#c4bdb4] leading-relaxed"
            style={{ fontFamily: "inherit" }} autoFocus />
          <div className="flex gap-3 mt-4 pt-4 border-t border-[#f0ebe3]">
            <button onClick={handleSave} disabled={saving || !bodyInput.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: "#2d6e5a" }}>
              {saving ? "Saving…" : "Save note"}
            </button>
            <button onClick={() => { setCreating(false); setTitle(""); setBody(""); }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#9a8c7a] hover:text-[#2d3748] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)}
          className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 border-dashed border-[#e8e0d0] hover:border-[#2d6e5a] text-[#9a8c7a] hover:text-[#2d6e5a] transition-all bg-white">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-semibold">Add a note</span>
        </button>
      )}

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#e8e0d0] border-t-[#2d6e5a] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {isPlaceholder && (
            <p className="text-xs text-[#c4bdb4] text-center py-2">Your notes will appear here — add your first one above.</p>
          )}
          <div className={`space-y-3 ${isPlaceholder ? "opacity-50 pointer-events-none select-none" : ""}`}>
            {displayNotes.map(note => {
              const isExpanded = expandedId === note.id;
              const isLong = note.note?.length > 200;
              return (
                <div key={note.id} className="bg-white rounded-2xl border border-[#e8e0d0] p-5 group"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {note.title && <p className="text-sm font-serif font-semibold text-[#2d3748] mb-1 leading-snug">{note.title}</p>}
                      <p className={`text-sm text-[#5c5347] leading-relaxed whitespace-pre-wrap ${!isExpanded && isLong ? "line-clamp-4" : ""}`}>{note.note}</p>
                      {isLong && !isPlaceholder && (
                        <button onClick={() => setExpandedId(isExpanded ? null : note.id)}
                          className="text-[11px] font-semibold text-[#2d6e5a] hover:text-[#1e5244] mt-1.5 transition-colors">
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                    {!isPlaceholder && (
                      <button onClick={() => handleDelete(note.id)} disabled={deletingId === note.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c4bdb4] hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 disabled:opacity-40">
                        {deletingId === note.id
                          ? <div className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                          : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                      </button>
                    )}
                  </div>
                  {note.createdAt && <p className="text-[10px] text-[#c4bdb4] font-medium mt-3">{fmtDate(note.createdAt)}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function ProjectStats() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [logDayOpen, setLogDayOpen] = useState(false);
  const [logSessionOpen, setLogSessionOpen] = useState(false);
  const [joinEventOpen, setJoinEventOpen] = useState(false);
  const [activeEvents, setActiveEvents] = useState([]);
  const [joiningEvent, setJoiningEvent] = useState(false);
  const [joinEventId, setJoinEventId] = useState("");
  const [joinEventError, setJoinEventError] = useState("");
  // Track if user logged a day this session (so streak arc shows "today counted")
  const [todayDayLogged, setTodayDayLogged] = useState(false);

  useEffect(() => { loadDashboard(); }, [projectId]);

  useEffect(() => {
    fetch(`${API_URL}/events/active`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const daysChallenges = (d?.events || []).filter(ev => ev.type === "DAYS_CHALLENGE");
        setActiveEvents(daysChallenges);
        if (daysChallenges.length > 0) setJoinEventId(String(daysChallenges[0].id));
      })
      .catch(() => {});
  }, []);

  async function handleJoinEvent() {
    if (!joinEventId) return;
    setJoiningEvent(true);
    setJoinEventError("");
    try {
      const r = await fetch(`${API_URL}/projects/${projectId}/enrollEvent`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: Number(joinEventId) }),
      });
      if (r.ok) {
        setJoinEventOpen(false);
        setJoinEventError("");
        loadDashboard();
      } else {
        const d = await r.json();
        setJoinEventError(d.message || "Could not join the challenge. Please try again.");
      }
    } catch {
      setJoinEventError("Network error. Please try again.");
    }
    finally { setJoiningEvent(false); }
  }

  function loadDashboard() {
    return fetch(`${API_URL}/projects/${projectId}/dashboard`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d))
      .catch(() => navigate("/projects"))
      .finally(() => setLoading(false));
  }

  function handleProgressSuccess() {
    fetch(`${API_URL}/projects/${projectId}/dashboard`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d))
      .catch(() => {});
  }

  function handleDayLogSuccess() {
    setTodayDayLogged(true);
    handleProgressSuccess();
  }

  if (loading) return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-7 h-7 border-2 border-[#2d3748] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const { project, trackerSummary, todayTotals } = data;
  const wc = trackerSummary?.wordCount;
  const ch = trackerSummary?.chapters;
  const sc = trackerSummary?.scenes;
  const ss = trackerSummary?.sessions;
  const daysLeft = daysUntil(project.deadline);

  const hasDaysTarget = !!project.consecutiveDaysTarget;
  const currentStreak = project.currentStreak ?? 0;
  const daysTarget    = project.consecutiveDaysTarget ?? 0;
  const daysPercent   = daysTarget > 0 ? Math.min(Math.round((currentStreak / daysTarget) * 100), 100) : 0;

  const allLogs = [
    ...(project.wordLogs || []).map(l => ({ ...l, _type: "word" })),
    ...(project.progressLogs || []).map(l => ({ ...l, _type: "progress" })),
  ].sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));

  const dayLogs     = project.dayLogs     || [];
  const sessionLogs = project.sessionLogs || [];

  const hasGoals = wc || ch || sc || ss || hasDaysTarget;
  const hasTodayGoals = wc?.dailyTarget || ch?.dailyTarget || sc?.dailyTarget || ss || hasDaysTarget;

  // Today's streak is "done" if user just logged a day, OR if streak increased today
  // We track todayDayLogged as a session flag
  const streakDoneToday = todayDayLogged;

  const tabs = [
    { key: "overview", label: "Overview" },
    hasGoals && { key: "progress", label: "Progress" },
    { key: "todos",   label: "Tasks" },
    { key: "notes",   label: "Notes" },
  ].filter(Boolean);

  const statusStyles = {
    IN_PROGRESS: { label: "In progress", color: "#2d6e5a", bg: "#f0fdf4", border: "#bbf7d0" },
    COMPLETED:   { label: "Completed",   color: "#b8962e", bg: "#fffbeb", border: "#fde68a" },
    ON_HOLD:     { label: "On hold",     color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" },
    ABANDONED:   { label: "Abandoned",   color: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb" },
  };
  const statusStyle    = statusStyles[project.status] || statusStyles.IN_PROGRESS;
  const deadlineColor  = daysLeft === 0 ? "#ef4444" : daysLeft !== null && daysLeft <= 7 ? "#c47d1e" : "#2d3748";
  const deadlineBg     = daysLeft === 0 ? "#fff1f2" : daysLeft !== null && daysLeft <= 7 ? "#fffbeb" : "white";
  const deadlineBorder = daysLeft === 0 ? "#fecaca" : daysLeft !== null && daysLeft <= 7 ? "#fde68a" : "#e8e0d0";

  // ── Tab icons for mobile nav ────────────────────────────────
  const tabIcons = {
    overview: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    progress: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    todos:    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    notes:    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  };

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 pb-24 sm:pb-12">

        {/* ── Nav bar ── */}
        <div className="flex items-center justify-between mb-6 sm:mb-10">
          <button onClick={() => navigate("/projects")}
            className="flex items-center gap-1.5 text-xs text-[#9a8c7a] hover:text-[#2d3748] transition-colors font-semibold tracking-wide uppercase">
            ← Projects
          </button>
          <div className="flex items-center gap-2">
            {hasDaysTarget && (
              <button onClick={() => setLogDayOpen(true)}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-[#d4af37] text-[#b8962e] bg-[#fffbeb] hover:bg-[#fef3c7] transition-all">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Log day
              </button>
            )}
            {ss && (
              <button onClick={() => setLogSessionOpen(true)}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-[#fbcfe8] text-[#be185d] bg-[#fdf2f8] hover:bg-[#fce7f3] transition-all">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Log session
              </button>
            )}
            {(wc || ch || sc) && (
              <button onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 text-xs font-semibold text-white px-4 py-2 rounded-full transition-all"
                style={{ background: "linear-gradient(135deg, #2d6e5a 0%, #1e5244 100%)", boxShadow: "0 2px 8px rgba(45,110,90,0.35)" }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Enter progress
              </button>
            )}
            <button onClick={() => navigate(`/projects/${projectId}/edit`)}
              className="text-xs font-semibold text-[#b8962e] hover:text-[#d4af37] transition-colors border border-[#fde68a] bg-[#fffbeb] px-3.5 py-1.5 rounded-full">
              Edit
            </button>
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
              style={{ color: statusStyle.color, background: statusStyle.bg, borderColor: statusStyle.border }}>
              {statusStyle.label}
            </span>
            {project.genre && <span className="text-[11px] text-[#9a8c7a] bg-white border border-[#e8e0d0] px-2.5 py-1 rounded-full">{project.genre}</span>}
            {project.visibility === "PUBLIC" && <span className="text-[11px] text-[#9a8c7a] bg-white border border-[#e8e0d0] px-2.5 py-1 rounded-full">Public</span>}
            {hasDaysTarget && (
              <span className="text-[11px] font-semibold bg-[#fffbeb] border border-[#fde68a] text-[#b8962e] px-2.5 py-1 rounded-full">
                🔥 {currentStreak} / {daysTarget} day streak
              </span>
            )}
            {hasDaysTarget && activeEvents.length > 0 && !project.eventEntries?.length && (
              <button onClick={() => setJoinEventOpen(true)}
                className="text-[11px] font-semibold bg-[#fefce8] border border-[#fde68a] text-[#92680a] px-2.5 py-1 rounded-full hover:bg-[#fef3c7] transition-all flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#d97706] animate-pulse" />
                Join challenge
              </button>
            )}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#2d3748] leading-tight mb-2">{project.title}</h1>
          {project.description && <p className="text-sm text-[#9a8c7a] max-w-xl leading-relaxed">{project.description}</p>}
          {project.createdAt && (
            <p className="text-[11px] text-[#c4bdb4] mt-2 flex items-center gap-1.5">
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Started {new Date(project.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>

        {/* ── Quick stat numbers (text only, no squares) ── */}
        <div className="flex flex-wrap gap-x-8 gap-y-3 mb-6 sm:mb-10">
          {wc && (
            <div>
              <p className="font-serif font-bold text-2xl text-[#2563eb]">{fmt(wc.current)}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9a8c7a]">Words written</p>
            </div>
          )}
          {ch && (
            <div>
              <p className="font-serif font-bold text-2xl text-[#2563eb]">{ch.current}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9a8c7a]">Chapters done</p>
            </div>
          )}
          {sc && (
            <div>
              <p className="font-serif font-bold text-2xl text-[#2563eb]">{sc.current}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9a8c7a]">Scenes done</p>
            </div>
          )}
          {ss && (
            <div>
              <p className="font-serif font-bold text-2xl" style={{ color: SESSION_COLOR }}>{ss.current}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9a8c7a]">Sessions ({ss.period.toLowerCase()})</p>
            </div>
          )}
          {hasDaysTarget && (
            <div>
              <p className="font-serif font-bold text-2xl" style={{ color: STREAK_COLOR }}>{currentStreak}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9a8c7a]">Day streak (of {daysTarget})</p>
            </div>
          )}
          {daysLeft !== null && (
            <div>
              <p className="font-serif font-bold text-2xl" style={{ color: deadlineColor }}>{daysLeft === 0 ? "Due" : daysLeft}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9a8c7a]">{daysLeft === 0 ? "Past deadline" : "Days left"}</p>
            </div>
          )}
        </div>

        {/* ── Desktop Tabs ── */}
        <div className="hidden sm:flex gap-1 mb-7 p-1 bg-white border border-[#e8e0d0] rounded-2xl w-fit"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === t.key ? "bg-[#2d3748] text-white" : "text-[#6b5c4a] hover:text-[#2d3748]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Mobile bottom nav ── */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e8e0d0] px-2 pb-safe"
          style={{ boxShadow: "0 -4px 20px rgba(45,35,20,0.08)", paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
          <div className="flex items-stretch">
            {tabs.map(t => {
              const isActive = activeTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all relative" style={{ minWidth: 0 }}>
                  {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#2d3748]" />}
                  <svg width="20" height="20" fill="none" stroke={isActive ? "#2d3748" : "#b8a898"} strokeWidth={isActive ? 2.2 : 1.8} viewBox="0 0 24 24">
                    {tabIcons[t.key]}
                  </svg>
                  <span className="text-[9px] font-semibold leading-none" style={{ color: isActive ? "#2d3748" : "#b8a898" }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="sm:hidden h-16" />

        {/* ══ OVERVIEW ══ */}
        {activeTab === "overview" && (
          <div className="space-y-5">

            {/* Combined: Overall + Today — Trackbear style side-by-side */}
            {hasGoals && (
              <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6 sm:p-8"
                style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>

                {/* Words */}
                {wc && (
                  <div className="mb-6 last:mb-0">
                    <div className="flex flex-col sm:flex-row sm:gap-10 gap-5">
                      {/* Overall */}
                      <div className="flex items-center gap-4 flex-1">
                        <ArcProgress percent={wc.percent} size={80} color={wc.percent >= 100 ? DONE_COLOR : "#2563eb"} trackColor={wc.percent >= 100 ? "#dcfce7" : "#ede9e3"} strokeW={7}>
                          {wc.percent >= 100
                            ? <Check color={DONE_COLOR} size={20} />
                            : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{wc.percent}%</span>}
                        </ArcProgress>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[#2563eb]">Words · Overall</p>
                          <p className="text-sm font-semibold text-[#2d3748]">{fmt(wc.current)} written</p>
                          <p className="text-xs text-[#9a8c7a]">{fmt(wc.remaining)} to go · {fmt(wc.target)} total</p>
                        </div>
                      </div>
                      {/* Today */}
                      {wc.dailyTarget && (
                        <div className="sm:border-l sm:border-[#f0ebe3] sm:pl-10 border-t border-[#f0ebe3] pt-5 sm:pt-0">
                          <TodayGoalCard
                            todayCount={todayTotals?.wordsToday || 0}
                            dailyTarget={wc.dailyTarget}
                            label="words today"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Chapters */}
                {ch && (
                  <div className="mb-6 last:mb-0 pt-6 border-t border-[#f0ebe3]">
                    <div className="flex flex-col sm:flex-row sm:gap-10 gap-5">
                      <div className="flex items-center gap-4 flex-1">
                        <ArcProgress percent={ch.percent} size={80} color={ch.percent >= 100 ? DONE_COLOR : "#2563eb"} trackColor={ch.percent >= 100 ? "#dcfce7" : "#ede9e3"} strokeW={7}>
                          {ch.percent >= 100
                            ? <Check color={DONE_COLOR} size={20} />
                            : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{ch.percent}%</span>}
                        </ArcProgress>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[#2563eb]">Chapters · Overall</p>
                          <p className="text-sm font-semibold text-[#2d3748]">{ch.current} done</p>
                          <p className="text-xs text-[#9a8c7a]">{ch.remaining} left · {ch.target} total</p>
                        </div>
                      </div>
                      {ch.dailyTarget && (
                        <div className="sm:border-l sm:border-[#f0ebe3] sm:pl-10 border-t border-[#f0ebe3] pt-5 sm:pt-0">
                          <TodayGoalCard
                            todayCount={todayTotals?.chaptersToday || 0}
                            dailyTarget={ch.dailyTarget}
                            label="chapters today"
                            color={TODAY_COLOR}
                            trackColor={TODAY_TRACK}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scenes */}
                {sc && (
                  <div className="mb-6 last:mb-0 pt-6 border-t border-[#f0ebe3]">
                    <div className="flex flex-col sm:flex-row sm:gap-10 gap-5">
                      <div className="flex items-center gap-4 flex-1">
                        <ArcProgress percent={sc.percent} size={80} color={sc.percent >= 100 ? DONE_COLOR : "#2563eb"} trackColor={sc.percent >= 100 ? "#dcfce7" : "#ede9e3"} strokeW={7}>
                          {sc.percent >= 100
                            ? <Check color={DONE_COLOR} size={20} />
                            : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{sc.percent}%</span>}
                        </ArcProgress>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[#2563eb]">Scenes · Overall</p>
                          <p className="text-sm font-semibold text-[#2d3748]">{sc.current} done</p>
                          <p className="text-xs text-[#9a8c7a]">{sc.remaining} left · {sc.target} total</p>
                        </div>
                      </div>
                      {sc.dailyTarget && (
                        <div className="sm:border-l sm:border-[#f0ebe3] sm:pl-10 border-t border-[#f0ebe3] pt-5 sm:pt-0">
                          <TodayGoalCard
                            todayCount={todayTotals?.scenesToday || 0}
                            dailyTarget={sc.dailyTarget}
                            label="scenes today"
                            color={TODAY_COLOR}
                            trackColor={TODAY_TRACK}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sessions — pink */}
                {ss && (
                  <div className="mb-6 last:mb-0 pt-6 border-t border-[#f0ebe3]">
                    <div className="flex flex-col sm:flex-row sm:gap-10 gap-5">
                      <div className="flex items-center gap-4 flex-1">
                        <ArcProgress percent={ss.percent} size={80} color={ss.percent >= 100 ? DONE_COLOR : SESSION_COLOR} trackColor={ss.percent >= 100 ? "#dcfce7" : "#fce7f3"} strokeW={7}>
                          {ss.percent >= 100
                            ? <Check color={DONE_COLOR} size={20} />
                            : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{ss.percent}%</span>}
                        </ArcProgress>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: SESSION_COLOR }}>Sessions · {ss.period.toLowerCase()}</p>
                          <p className="text-sm font-semibold text-[#2d3748]">{ss.current} / {ss.target}</p>
                          <p className="text-xs text-[#9a8c7a]">{ss.remaining} left</p>
                        </div>
                      </div>
                      {/* Today sessions */}
                      <div className="sm:border-l sm:border-[#f0ebe3] sm:pl-10 border-t border-[#f0ebe3] pt-5 sm:pt-0">
                        <SessionGoalCard
                          current={ss.current}
                          target={ss.target}
                          period={ss.period}
                          sessionsToday={todayTotals?.sessionsToday || 0}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Day Streak — pink */}
                {hasDaysTarget && (
                  <div className="pt-6 border-t border-[#f0ebe3]">
                    <div className="flex flex-col sm:flex-row sm:gap-10 gap-5">
                      <div className="flex items-center gap-4 flex-1">
                        <ArcProgress percent={daysPercent} size={80} color={daysPercent >= 100 ? DONE_COLOR : STREAK_COLOR} trackColor={daysPercent >= 100 ? "#dcfce7" : STREAK_TRACK} strokeW={7}>
                          {daysPercent >= 100
                            ? <Check color={DONE_COLOR} size={20} />
                            : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{daysPercent}%</span>}
                        </ArcProgress>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: STREAK_COLOR }}>Day Streak · Overall</p>
                          <p className="text-sm font-semibold text-[#2d3748]">{currentStreak} / {daysTarget} days</p>
                          <p className="text-xs text-[#9a8c7a]">{Math.max(0, daysTarget - currentStreak)} days to go</p>
                        </div>
                      </div>
                      <div className="sm:border-l sm:border-[#f0ebe3] sm:pl-10 border-t border-[#f0ebe3] pt-5 sm:pt-0">
                        <DaysStreakCard
                          currentStreak={currentStreak}
                          target={daysTarget}
                          todayLogged={streakDoneToday}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Streak running totals — always show (empty state when no logs) */}
                {hasDaysTarget && (
                  <div className="pt-6 border-t border-[#f0ebe3]">
                    <StreakRunningTotals dayLogs={dayLogs} />
                  </div>
                )}

                {/* Session running totals — always show (empty state when no logs) */}
                {ss && (
                  <div className="pt-6 border-t border-[#f0ebe3]">
                    <SessionRunningTotals sessionLogs={sessionLogs} />
                  </div>
                )}

                {/* Deadline arc — if no streak/session to pair with */}
                {daysLeft !== null && !hasDaysTarget && !ss && (
                  <div className="pt-6 border-t border-[#f0ebe3]">
                    <div className="flex items-center gap-4">
                      <ArcProgress
                        percent={daysLeft === 0 ? 100 : Math.min(100, Math.round((1 - daysLeft / 365) * 100))}
                        size={80} color={deadlineColor} trackColor="#ede9e3" strokeW={7}>
                        <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 14 }}>
                          {daysLeft === 0 ? "Due" : daysLeft}
                        </span>
                      </ArcProgress>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: deadlineColor }}>Deadline</p>
                        <p className="text-sm font-semibold text-[#2d3748]">{daysLeft === 0 ? "Past due" : `${daysLeft} days left`}</p>
                        {project.deadline && <p className="text-xs text-[#9a8c7a]">{new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Deadline info bar */}
            {project.deadline && (
              <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6"
                style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
                <div className="flex flex-wrap gap-6 items-center">
                  <div>
                    <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-0.5">Deadline</p>
                    <p className="font-serif text-lg text-[#2d3748]">
                      {new Date(project.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  {project.daysPerWeek && <div>
                    <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-0.5">Schedule</p>
                    <p className="font-serif text-lg text-[#2d3748]">{project.daysPerWeek} days / week</p>
                  </div>}
                  {wc?.dailyTarget && <div className="ml-auto">
                    <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-0.5">Daily pace</p>
                    <p className="font-serif text-lg font-bold text-[#2d6e5a]">{fmt(wc.dailyTarget)} words / session</p>
                  </div>}
                  {daysLeft !== null && (
                    <div>
                      <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-0.5">Days left</p>
                      <p className="font-serif text-lg font-bold" style={{ color: deadlineColor }}>{daysLeft === 0 ? "Past due" : daysLeft}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {(wc || ch || sc) && (
                <button onClick={() => setModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ background: "linear-gradient(135deg, #2d6e5a 0%, #1e5244 100%)", boxShadow: "0 4px 14px rgba(45,110,90,0.35)" }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Enter progress
                </button>
              )}
              {ss && (
                <button onClick={() => setLogSessionOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ background: "linear-gradient(135deg, #be185d 0%, #9d174d 100%)", boxShadow: "0 4px 14px rgba(190,24,93,0.35)" }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Log session
                </button>
              )}
              {hasDaysTarget && (
                <button onClick={() => setLogDayOpen(true)}
                  className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-sm font-semibold border border-[#fde68a] text-[#b8962e] bg-[#fffbeb] hover:bg-[#fef3c7] transition-all">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Log day
                </button>
              )}
            </div>

            {/* History */}
            {allLogs.length > 0 && (
              <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6 sm:p-8"
                style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
                <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-5">Recent activity</p>
                <HistoryLog logs={allLogs} />
              </div>
            )}
          </div>
        )}

        {/* ══ PROGRESS ══ */}
        {activeTab === "progress" && hasGoals && (
          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6 sm:p-8"
              style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
              <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-6">Overall progress</p>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-5 sm:gap-8">
                {wc && <OverallArcItem percent={wc.percent} label="Words" line1={`${fmt(wc.current)} written`} line2={`${fmt(wc.remaining)} left`} />}
                {ch && <OverallArcItem percent={ch.percent} label="Chapters" line1={`${ch.current} done`} line2={`${ch.remaining} left`} />}
                {sc && <OverallArcItem percent={sc.percent} label="Scenes" line1={`${sc.current} done`} line2={`${sc.remaining} left`} />}
                {ss && <OverallArcItem percent={ss.percent} label="Sessions" line1={`${ss.current} / ${ss.target}`} line2={`${ss.remaining} left · ${ss.period.toLowerCase()}`} color={SESSION_COLOR} />}
                {hasDaysTarget && (
                  <OverallArcItem
                    percent={daysPercent}
                    label="Day Streak"
                    line1={`${currentStreak} / ${daysTarget} days`}
                    line2={`${Math.max(0, daysTarget - currentStreak)} days to go`}
                    color={STREAK_COLOR}
                  />
                )}
              </div>
            </div>

            {/* Milestones / detailed numbers */}
            <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6 sm:p-8"
              style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
              <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-6">Detailed numbers</p>
              <div className="divide-y divide-[#f5f0ea]">
                {wc && (
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-semibold text-[#2d3748]">Words</span>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: overallColor(wc.percent) }}>{fmt(wc.current)}</span>
                      <span className="text-xs text-[#9a8c7a]"> / {fmt(wc.target)}</span>
                      <p className="text-[11px] text-[#9a8c7a]">{wc.percent}% · {fmt(wc.remaining)} left</p>
                    </div>
                  </div>
                )}
                {ch && (
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-semibold text-[#2d3748]">Chapters</span>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: overallColor(ch.percent) }}>{ch.current}</span>
                      <span className="text-xs text-[#9a8c7a]"> / {ch.target}</span>
                      <p className="text-[11px] text-[#9a8c7a]">{ch.percent}% · {ch.remaining} left</p>
                    </div>
                  </div>
                )}
                {sc && (
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-semibold text-[#2d3748]">Scenes</span>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: overallColor(sc.percent) }}>{sc.current}</span>
                      <span className="text-xs text-[#9a8c7a]"> / {sc.target}</span>
                      <p className="text-[11px] text-[#9a8c7a]">{sc.percent}% · {sc.remaining} left</p>
                    </div>
                  </div>
                )}
                {ss && (
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-semibold text-[#2d3748]">Sessions ({ss.period.toLowerCase()})</span>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: SESSION_COLOR }}>{ss.current}</span>
                      <span className="text-xs text-[#9a8c7a]"> / {ss.target}</span>
                      <p className="text-[11px] text-[#9a8c7a]">{ss.percent}% · {ss.remaining} left</p>
                    </div>
                  </div>
                )}
                {hasDaysTarget && (
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-semibold text-[#2d3748]">Day Streak</span>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: STREAK_COLOR }}>{currentStreak}</span>
                      <span className="text-xs text-[#9a8c7a]"> / {daysTarget}</span>
                      <p className="text-[11px] text-[#9a8c7a]">{daysPercent}% · {Math.max(0, daysTarget - currentStreak)} days left</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Streak running totals in progress tab */}
            {hasDaysTarget && dayLogs.length > 0 && (
              <div>
                <StreakRunningTotals dayLogs={dayLogs} />
              </div>
            )}

            {/* Session running totals in progress tab */}
            {ss && sessionLogs.length > 0 && (
              <div>
                <SessionRunningTotals sessionLogs={sessionLogs} />
              </div>
            )}

            {/* History — also visible under progress */}
            {allLogs.length > 0 && (
              <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6 sm:p-8"
                style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
                <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-5">Activity history</p>
                <HistoryLog logs={allLogs} />
              </div>
            )}
          </div>
        )}

        {activeTab === "todos" && <TodoTab projectId={projectId} />}
        {activeTab === "notes" && <NotesTab projectId={projectId} />}

        {/* Danger zone */}
        <div className="mt-14 pt-8 border-t border-[#f0ebe3]">
          <p className="text-[10px] text-[#b8a898] uppercase tracking-widest mb-3 font-semibold">Danger zone</p>
          <button
            onClick={() => {
              if (confirm(`Delete "${project.title}"? This cannot be undone.`)) {
                fetch(`${API_URL}/projects/${projectId}/deleteProject`, { method: "POST", credentials: "include" })
                  .then(() => navigate("/projects"));
              }
            }}
            className="text-xs text-red-400 hover:text-red-500 border border-red-200 hover:border-red-300 px-4 py-2 rounded-xl transition-all">
            Delete project
          </button>
        </div>
      </main>

      <ProgressModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projectId={projectId}
        trackerSummary={trackerSummary}
        onSuccess={handleProgressSuccess}
      />

      <LogDayModal
        open={logDayOpen}
        onClose={() => setLogDayOpen(false)}
        projectId={projectId}
        trackerSummary={trackerSummary}
        onSuccess={handleDayLogSuccess}
        dayLogs={dayLogs}
        currentStreak={currentStreak}
        daysTarget={daysTarget}
      />

      <LogSessionModal
        open={logSessionOpen}
        onClose={() => setLogSessionOpen(false)}
        projectId={projectId}
        onSuccess={handleProgressSuccess}
      />

      {/* Join Event Modal */}
      {joinEventOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          style={{ background: "rgba(30,24,16,0.45)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setJoinEventOpen(false); }}>
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ boxShadow: "0 32px 64px rgba(30,24,16,0.24)" }}>
            <div className="px-6 pt-5 pb-4 border-b border-[#f0ebe3] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#d97706] uppercase tracking-widest font-semibold mb-0.5">Days Challenge</p>
                <h2 className="font-serif text-xl text-[#2d3748]">Join a challenge</h2>
              </div>
              <button onClick={() => { setJoinEventOpen(false); setJoinEventError(""); }}
                className="w-7 h-7 rounded-full bg-[#f5f0ea] hover:bg-[#e8e0d0] flex items-center justify-center text-[#9a8c7a] transition-all">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pt-5 pb-2 space-y-4">
              <p className="text-sm text-[#9a8c7a] leading-relaxed">
                Write every single day of the challenge to stay on the community leaderboard. Your project will be made public.
              </p>

              {/* Eligibility checklist */}
              {(() => {
                const selectedEvent = activeEvents.find(ev => String(ev.id) === joinEventId);
                const checks = selectedEvent ? [
                  {
                    label: "Project existed on challenge start day",
                    pass: project.createdAt && new Date(new Date(project.createdAt).toDateString()) <= new Date(new Date(selectedEvent.startDate).toDateString()),
                    fail: "Your project was created after the challenge started. Only projects that existed on day one can join.",
                  },
                  {
                    label: "No existing streak",
                    pass: (project.currentStreak ?? 0) === 0,
                    fail: `Your project already has a ${project.currentStreak}-day streak. To join, your project streak must be at 0 (start fresh).`,
                  },
                  {
                    label: `Consecutive days target matches challenge (${selectedEvent.daysTarget} days)`,
                    pass: project.consecutiveDaysTarget === selectedEvent.daysTarget,
                    fail: `Your project's days target is ${project.consecutiveDaysTarget ?? "not set"}, but this challenge requires ${selectedEvent.daysTarget}. Edit your project to set it to ${selectedEvent.daysTarget}, then try again.`,
                  },
                  {
                    label: "Not already enrolled in this challenge",
                    pass: !project.eventEntries?.some(e => String(e.eventId) === joinEventId && !e.disqualified),
                    fail: "You already have a project in this challenge.",
                  },
                ] : [];
                const allPass = checks.every(c => c.pass);
                const firstFail = checks.find(c => !c.pass);
                return checks.length > 0 ? (
                  <div className="rounded-2xl border border-[#f0ebe3] bg-[#faf7f2] px-4 py-3.5 space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-1">Eligibility requirements</p>
                    {checks.map((c, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 mt-0.5">
                          {c.pass
                            ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#dcfce7"/><path stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M7 13l3 3 7-7"/></svg>
                            : <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fef2f2"/><path stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6"/></svg>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[11px] font-semibold leading-snug ${c.pass ? "text-[#2d3748]" : "text-red-600"}`}>{c.label}</p>
                          {!c.pass && <p className="text-[10px] text-red-500 mt-0.5 leading-relaxed">{c.fail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              <div className="space-y-2">
                {activeEvents.map(ev => (
                  <button key={ev.id} type="button" onClick={() => { setJoinEventId(String(ev.id)); setJoinEventError(""); }}
                    className="w-full text-left rounded-2xl border px-4 py-3 transition-all"
                    style={{
                      borderColor: joinEventId === String(ev.id) ? "#d97706" : "#fde68a",
                      background:  joinEventId === String(ev.id) ? "#fffbeb" : "white",
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#2d3748]">{ev.title}</p>
                        {ev.daysTarget && <p className="text-[11px] text-[#9a8c7a] mt-0.5">{ev.daysTarget} consecutive days</p>}
                        {ev.startDate && (
                          <p className="text-[10px] text-[#9a8c7a] mt-0.5">
                            Started {new Date(ev.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                      {ev.endDate && (
                        <span className="text-[10px] text-[#92680a] bg-[#fef3c7] px-2 py-0.5 rounded-full flex-shrink-0">
                          Ends {new Date(ev.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Error from server (shown after a failed join attempt) */}
              {joinEventError && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5 text-red-400">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <p className="text-[12px] text-red-600 leading-relaxed">{joinEventError}</p>
                </div>
              )}
            </div>
            <div className="px-6 pt-3 pb-7 flex gap-3">
              <button onClick={() => { setJoinEventOpen(false); setJoinEventError(""); }}
                className="flex-1 py-3.5 rounded-2xl border border-[#e8e0d0] text-sm font-semibold text-[#9a8c7a] hover:text-[#2d3748] transition-all">
                Cancel
              </button>
              <button onClick={handleJoinEvent} disabled={joiningEvent || !joinEventId}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)" }}>
                {joiningEvent
                  ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" />
                  : "Join challenge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}