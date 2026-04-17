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
function progressColor(percent) {
  return percent >= 100 ? "#16a34a" : "#2563eb";
}

// ─── Arc Progress ─────────────────────────────────────────────
function ArcProgress({ percent = 0, size = 80, color, trackColor = "#ede9e3", strokeW = 7, children }) {
  const arcColor = color ?? progressColor(percent);
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeW} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={arcColor} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1), stroke 0.5s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">{children}</div>
    </div>
  );
}

// ─── Daily Target Card ────────────────────────────────────────
function DailyTargetCard({ todayCount = 0, dailyTarget = 0, label = "words" }) {
  const pct = dailyTarget > 0 ? Math.min(Math.round((todayCount / dailyTarget) * 100), 100) : 0;
  const done = pct >= 100;
  const started = todayCount > 0;
  const remaining = Math.max(0, dailyTarget - todayCount);
  const color = done ? "#16a34a" : started ? "#ea580c" : "#9a8c7a";
  const trackColor = done ? "#dcfce7" : started ? "#ffedd5" : "#ede9e3";
  return (
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <ArcProgress percent={pct} size={76} color={color} trackColor={trackColor} strokeW={7}>
        {done ? (
          <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <>
            <span className="font-serif font-bold leading-none text-[#2d3748]" style={{ fontSize: 16 }}>{fmt(todayCount)}</span>
            <span className="text-[#9a8c7a] leading-none mt-0.5" style={{ fontSize: 9 }}>of {fmt(dailyTarget)}</span>
          </>
        )}
      </ArcProgress>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1 truncate" style={{ color }}>{label}</p>
        {done ? <p className="text-sm font-semibold text-[#2d3748]">Daily goal complete 🎉</p>
          : started ? <>
            <p className="text-sm font-semibold text-[#2d3748]">{fmt(remaining)} {label} to go</p>
            <p className="text-[11px] text-[#9a8c7a] mt-0.5">{pct}% of today's goal</p>
          </> : <>
            <p className="text-sm font-semibold text-[#2d3748]">Start writing today</p>
            <p className="text-[11px] text-[#9a8c7a] mt-0.5">{fmt(dailyTarget)} {label} goal</p>
          </>}
      </div>
    </div>
  );
}

// ─── Session Goal Card ────────────────────────────────────────
function SessionGoalCard({ current = 0, target = 0, period = "WEEKLY", sessionsToday = 0 }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const done = pct >= 100;
  const remaining = Math.max(0, target - current);
  const color = done ? "#16a34a" : current > 0 ? "#7c3aed" : "#9a8c7a";
  const trackColor = done ? "#dcfce7" : current > 0 ? "#ede9d8" : "#ede9e3";
  const periodLabel = period === "WEEKLY" ? "this week" : "this month";
  return (
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <ArcProgress percent={pct} size={76} color={color} trackColor={trackColor} strokeW={7}>
        {done ? (
          <svg className="w-5 h-5" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <>
            <span className="font-serif font-bold leading-none text-[#2d3748]" style={{ fontSize: 16 }}>{current}</span>
            <span className="text-[#9a8c7a] leading-none mt-0.5" style={{ fontSize: 9 }}>of {target}</span>
          </>
        )}
      </ArcProgress>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color }}>Sessions · {period.toLowerCase()}</p>
        {done
          ? <p className="text-sm font-semibold text-[#2d3748]">Period goal complete 🎉</p>
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
          <p className="text-[11px] mt-1 font-semibold" style={{ color: "#7c3aed" }}>{sessionsToday} logged today</p>
        )}
      </div>
    </div>
  );
}


function ProgressRow({ label, current, target, percent, remaining, remainingLabel, color: overrideColor }) {
  const color = overrideColor ?? progressColor(percent);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#2d3748] uppercase tracking-wider">{label}</span>
        <span className="text-xs text-[#9a8c7a] tabular-nums">{fmt(current)} / {fmt(target)}</span>
      </div>
      <div className="relative w-full h-3 bg-[#ede9e3] rounded-full overflow-hidden" style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percent}%`, background: color, boxShadow: `0 1px 4px ${color}55` }} />
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="font-semibold" style={{ color }}>{percent}% complete</span>
        <span className="text-[#b8a898]">{fmt(remaining)} {remainingLabel} remaining</span>
      </div>
    </div>
  );
}

// ─── Dot Grid ─────────────────────────────────────────────────
function DotGrid({ current, target, cols = 20, rows = 3, color: overrideColor }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const color = overrideColor ?? progressColor(pct);
  // Use fewer cols on mobile via CSS container query simulation — we cap at 15 for display
  const displayCols = cols;
  const total = displayCols * rows;
  const filled = Math.round((pct / 100) * total);
  return (
    <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${displayCols}, 1fr)` }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          aspectRatio: "1", borderRadius: 2,
          backgroundColor: i < filled ? color : "#e8e3dc",
          opacity: i < filled ? 1 : 0.45,
          transition: `background-color 0.2s ease ${i * 6}ms`,
        }} />
      ))}
    </div>
  );
}

// ─── Stat Block ───────────────────────────────────────────────
function StatBlock({ value, label, color = "#2d3748", accent, bg = "white", border = "#e8e0d0" }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-2xl border"
      style={{ background: bg, borderColor: border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {accent && <div className="w-5 h-[3px] rounded-full mb-1" style={{ background: accent }} />}
      <p className="font-serif font-bold leading-none" style={{ fontSize: 26, color }}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9a8c7a] leading-tight">{label}</p>
    </div>
  );
}

// ─── History Log ──────────────────────────────────────────────
function HistoryLog({ logs }) {
  if (!logs?.length) return (
    <div className="text-center py-16">
      <div className="w-10 h-10 rounded-2xl border-2 border-dashed border-[#e8e0d0] mx-auto mb-3 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-[#c4bdb4]" />
      </div>
      <p className="text-sm text-[#9a8c7a]">No activity logged yet</p>
      <p className="text-xs text-[#c4bdb4] mt-1">Your writing sessions will appear here</p>
    </div>
  );
  return (
    <div className="space-y-1">
      {logs.map((log, i) => {
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
    </div>
  );
}

// ─── Progress Modal ───────────────────────────────────────────
// FIX: removed emojis from type labels
// FIX: preview was triggering on Add click due to double blur handlers (onBlur + onBlurCapture)
//      — removed onBlurCapture, only call fetchPreview explicitly on onBlur
// FIX: chapters and session now properly wired
const TRACK_TYPES = [
  { key: "words",    label: "Words",    color: "#2d6e5a", bg: "#f0fdf4" },
  { key: "chapters", label: "Chapters", color: "#b8962e", bg: "#fffbeb" },
  { key: "scenes",   label: "Scenes",   color: "#6d28d9", bg: "#f5f3ff" },
  { key: "session",  label: "Session",  color: "#2d3748", bg: "#f8fafc" },
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
    if (t.key === "session")  return true;
    if (t.key === "words")    return !!wc;
    if (t.key === "chapters") return !!ch;
    if (t.key === "scenes")   return !!sc;
    return false;
  });

  const currentType = TRACK_TYPES.find(t => t.key === activeType);
  const isSession   = activeType === "session";

  useEffect(() => {
    setAmount("");
    setError("");
    setPreview(null);
    setRemoveMode(false);
    // Ensure active type stays valid when modal opens
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

  // FIX: only called on blur — not on button clicks
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
      if (r.ok) setPreview(d.preview);
      else setPreview(null);
    } catch { setPreview(null); }
    finally { setPreviewLoading(false); }
  }

  async function handleAdd() {
    setError("");
    if (isSession) {
      setLoading(true);
      try {
        const r = await fetch(`${API_URL}/projects/${projectId}/logSession`, {
          method: "POST", credentials: "include",
        });
        const d = await r.json();
        if (!r.ok) { setError(d.message || "Something went wrong."); return; }
        onSuccess();
        onClose();
      } catch { setError("Network error. Please try again."); }
      finally { setLoading(false); }
      return;
    }
    const val = Number(amount);
    if (!val || val <= 0) { setError("Please enter a positive number."); return; }
    setLoading(true);
    try {
      let url, body;
      if (activeType === "words") {
        url  = `${API_URL}/projects/${projectId}/logWords`;
        body = { wordsAdded: val };
      } else {
        // FIX: chapters and scenes now properly send to logChapterScene
        url  = `${API_URL}/projects/${projectId}/logChapterScene`;
        body = activeType === "chapters" ? { chaptersAdded: val } : { scenesAdded: val };
      }
      const r = await fetch(url, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.message || "Something went wrong."); return; }
      onSuccess();
      onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    setError("");
    const val = Number(amount);
    if (!val || val <= 0) { setError("Please enter a positive number."); return; }
    setLoading(true);
    try {
      let url, body;
      if (activeType === "words") {
        url  = `${API_URL}/projects/${projectId}/deleteWords`;
        body = { wordsToRemove: val };
      } else {
        url  = `${API_URL}/projects/${projectId}/deleteChapterScene`;
        body = activeType === "chapters" ? { chaptersToRemove: val } : { scenesToRemove: val };
      }
      const r = await fetch(url, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.message || "Something went wrong."); return; }
      onSuccess();
      onClose();
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

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0ebe3]">
          <div>
            <h2 className="font-serif text-xl text-[#2d3748] leading-tight">Enter Progress</h2>
            <p className="text-xs text-[#9a8c7a] mt-0.5">Log what you wrote today</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl border border-[#e8e0d0] flex items-center justify-center text-[#9a8c7a] hover:text-[#2d3748] hover:border-[#c4bdb4] transition-all">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Type selector */}
        <div className="px-6 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-3">What are you logging?</p>
          <div className="flex gap-2 flex-wrap">
            {availableTypes.map(t => (
              <button key={t.key} onClick={() => setActiveType(t.key)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all"
                style={activeType === t.key
                  ? { background: t.bg, borderColor: t.color, color: t.color }
                  : { background: "white", borderColor: "#e8e0d0", color: "#6b5c4a" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="px-6 pt-5 pb-2">
          {isSession ? (
            <div className="rounded-2xl border border-[#e8e0d0] bg-[#faf7f2] p-4 text-center">
              <p className="text-sm text-[#2d3748] font-medium">Mark this writing session as complete</p>
              <p className="text-xs text-[#9a8c7a] mt-1">No count needed — just log the session.</p>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-2 block">
                Number of {currentType?.label}
              </label>
              <input
                ref={inputRef}
                type="number" min="1"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(""); setPreview(null); setRemoveMode(false); }}
                // FIX: only onBlur triggers preview (not onBlurCapture which also fires before button clicks)
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
          )}

          {/* Delete preview warning — only shown when user blurs the input, NOT on add click */}
          {preview && !isSession && (
            <div className="mt-3 p-3.5 rounded-2xl border border-amber-200 bg-amber-50">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-1">
                <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                Heads up — for removal only
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                {preview.message || `Removing ${fmt(Number(amount))} ${activeType} will update your progress.`}
              </p>
              {preview.dailyTargetBefore != null && preview.dailyTargetAfter != null && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  Daily target: {fmt(preview.dailyTargetBefore)} → {fmt(preview.dailyTargetAfter)} words/session
                </p>
              )}
            </div>
          )}
          {previewLoading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[#9a8c7a]">
              <div className="w-3 h-3 border border-[#9a8c7a] border-t-transparent rounded-full animate-spin" />
              Checking impact…
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 pt-3 pb-7 flex gap-3">
          {!isSession && (
            <button
              onClick={() => {
                setRemoveMode(true);
                setPreview(null);
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
          )}
          <button
            onClick={() => { setRemoveMode(false); setPreview(null); handleAdd(); }}
            disabled={loading || (!isSession && !amount)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: loading ? "#9a8c7a" : currentType?.color }}>
            {loading
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {isSession ? "Log Session" : "Add to Today"}
              </>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Todo Tab ─────────────────────────────────────────────────
const PLACEHOLDER_TASKS = [
  { id: "p1", task: "Outline all three acts of your story", markComplete: true,  createdAt: null },
  { id: "p2", task: "Write the opening chapter",            markComplete: false, createdAt: null },
  { id: "p3", task: "Research your setting in detail",      markComplete: false, createdAt: null },
];

function TodoTab({ projectId }) {
  const [todos, setTodos]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [input, setInput]       = useState("");
  const [adding, setAdding]     = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter]     = useState("all"); // all | active | done
  const inputRef = useRef(null);

  useEffect(() => { loadTodos(); }, [projectId]);

  async function loadTodos() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/todos/${projectId}/all`, { credentials: "include" });
      const d = await r.json();
      if (r.ok) setTodos(d.todolist || []);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleAdd() {
    const task = input.trim();
    if (!task) return;
    setAdding(true);
    try {
      const r = await fetch(`${API_URL}/todos/${projectId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      const d = await r.json();
      if (r.ok) { setTodos(prev => [d.todolist, ...prev]); setInput(""); }
    } catch {}
    finally { setAdding(false); }
  }

  async function handleToggle(todo) {
    const updated = { ...todo, markComplete: !todo.markComplete };
    setTodos(prev => prev.map(t => t.id === todo.id ? updated : t));
    try {
      await fetch(`${API_URL}/todos/markcomplete`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: todo.id, markComplete: !todo.markComplete }),
      });
    } catch {
      setTodos(prev => prev.map(t => t.id === todo.id ? todo : t));
    }
  }

  async function handleDelete(taskId) {
    setDeletingId(taskId);
    try {
      const r = await fetch(`${API_URL}/todos/delete`, {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (r.ok) setTodos(prev => prev.filter(t => t.id !== taskId));
    } catch {}
    finally { setDeletingId(null); }
  }

  const isPlaceholder = todos.length === 0;
  const displayTodos  = isPlaceholder ? PLACEHOLDER_TASKS : todos;

  const filtered = displayTodos.filter(t =>
    filter === "all" ? true : filter === "active" ? !t.markComplete : t.markComplete
  );
  const doneCount   = displayTodos.filter(t => t.markComplete).length;
  const activeCount = displayTodos.filter(t => !t.markComplete).length;

  return (
    <div className="space-y-4">
      {/* Add input */}
      <div className="bg-white rounded-3xl border border-[#e8e0d0] p-5 sm:p-6"
        style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-4">Add a task</p>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Outline chapter 3..."
            className="flex-1 px-4 py-3 rounded-2xl border border-[#e8e0d0] text-sm text-[#2d3748] outline-none transition-all placeholder:text-[#c4bdb4]"
            style={{ fontFamily: "inherit" }}
            onFocus={e => e.target.style.borderColor = "#2d6e5a"}
            onBlur={e => e.target.style.borderColor = "#e8e0d0"}
          />
          <button onClick={handleAdd} disabled={adding || !input.trim()}
            className="px-5 py-3 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-40 flex items-center gap-2 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #2d6e5a 0%, #1e5244 100%)", boxShadow: "0 4px 14px rgba(45,110,90,0.4)", minWidth: 80 }}>
            {adding
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>}
            Add
          </button>
        </div>
      </div>

      {/* Filter + list */}
      <div className={`bg-white rounded-3xl border overflow-hidden transition-all ${
        isPlaceholder ? "border-dashed border-[#d4cdc4]" : "border-[#e8e0d0]"}`}
        style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>

        {/* Placeholder banner */}
        {isPlaceholder && (
          <div className="flex items-center gap-2.5 px-5 sm:px-6 py-3 bg-[#faf7f2] border-b border-dashed border-[#e8e0d0]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c4bdb4] flex-shrink-0" />
            <p className="text-[11px] text-[#9a8c7a]">
              These are example tasks to get you started — add your first real task above and they'll be replaced.
            </p>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4 border-b border-[#f5f0ea]">
          <div className="flex gap-1 p-1 bg-[#faf7f2] rounded-xl">
            {[["all", `All ${displayTodos.length}`], ["active", `Active ${activeCount}`], ["done", `Done ${doneCount}`]].map(([k, label]) => (
              <button key={k} onClick={() => !isPlaceholder && setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  filter === k ? "bg-white text-[#2d3748] shadow-sm" : "text-[#9a8c7a] hover:text-[#2d3748]"} ${
                  isPlaceholder ? "cursor-default" : ""}`}>
                {label}
              </button>
            ))}
          </div>
          {!isPlaceholder && doneCount > 0 && (
            <span className="text-[11px] text-[#9a8c7a]">{Math.round((doneCount / todos.length) * 100)}% complete</span>
          )}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#e8e0d0] border-t-[#2d6e5a] rounded-full animate-spin" />
          </div>
        ) : !isPlaceholder && filtered.length === 0 ? (
          <div className="py-16 text-center px-6">
            <div className="w-10 h-10 rounded-2xl border-2 border-dashed border-[#e8e0d0] mx-auto mb-3 flex items-center justify-center">
              <svg width="16" height="16" fill="none" stroke="#c4bdb4" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-[#9a8c7a]">
              {filter === "done" ? "No completed tasks yet" : filter === "active" ? "No active tasks" : "No tasks yet — add one above"}
            </p>
          </div>
        ) : (
          <div className={`divide-y divide-[#f5f0ea] ${isPlaceholder ? "opacity-50 pointer-events-none select-none" : ""}`}>
            {filtered.map(todo => (
              <div key={todo.id}
                className="flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-[#fdfaf6] transition-colors group">
                {/* Checkbox */}
                <button onClick={() => handleToggle(todo)}
                  className="w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  style={{
                    borderColor: todo.markComplete ? "#2d6e5a" : "#c4bdb4",
                    background: todo.markComplete ? "#2d6e5a" : "white",
                  }}>
                  {todo.markComplete && (
                    <svg width="10" height="10" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Task text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm transition-all leading-relaxed ${
                    todo.markComplete ? "text-[#b8a898] line-through" : "text-[#2d3748]"}`}>
                    {todo.task}
                  </p>
                  {todo.createdAt && (
                    <p className="text-[11px] text-[#c4bdb4] mt-0.5">{fmtDateShort(todo.createdAt)}</p>
                  )}
                </div>

                {/* Delete — hidden on placeholders */}
                {!isPlaceholder && (
                  <button onClick={() => handleDelete(todo.id)} disabled={deletingId === todo.id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c4bdb4] hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40">
                    {deletingId === todo.id
                      ? <div className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                      : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Completion bar at bottom — only for real todos */}
        {!isPlaceholder && todos.length > 0 && (
          <div className="px-5 sm:px-6 py-4 border-t border-[#f5f0ea]">
            <div className="w-full h-2.5 bg-[#f0ebe3] rounded-full overflow-hidden" style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }}>
              <div className="h-full bg-[#2d6e5a] rounded-full transition-all duration-700"
                style={{ width: `${Math.round((doneCount / todos.length) * 100)}%`, boxShadow: "0 1px 4px rgba(45,110,90,0.4)" }} />
            </div>
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
      if (r.ok) {
        setNotes(prev => [d.note, ...prev]);
        setTitle(""); setBody(""); setCreating(false);
      }
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
      {/* Create panel */}
      {creating ? (
        <div className="bg-white rounded-3xl border border-[#2d6e5a] p-5 sm:p-6"
          style={{ boxShadow: "0 0 0 3px rgba(45,110,90,0.08), 0 8px 24px rgba(45,35,20,0.06)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-4">New note</p>
          <input
            value={titleInput}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-0 py-1 text-base font-serif font-semibold text-[#2d3748] border-0 border-b border-[#e8e0d0] outline-none mb-4 bg-transparent placeholder:text-[#d4cdc4]"
          />
          <textarea
            value={bodyInput}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your note here..."
            rows={5}
            className="w-full px-0 py-1 text-sm text-[#2d3748] border-0 outline-none resize-none bg-transparent placeholder:text-[#c4bdb4] leading-relaxed"
            style={{ fontFamily: "inherit" }}
            autoFocus
          />
          <div className="flex gap-3 mt-4 pt-4 border-t border-[#f0ebe3]">
            <button onClick={() => { setCreating(false); setTitle(""); setBody(""); }}
              className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-[#9a8c7a] hover:text-[#2d3748] border border-[#e8e0d0] transition-all">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !bodyInput.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #2d6e5a 0%, #1e5244 100%)" }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : "Save note"}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)}
          className="w-full flex items-center gap-3 p-5 bg-white rounded-3xl border border-[#e8e0d0] text-left hover:border-[#2d6e5a] hover:shadow-md transition-all group"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="w-8 h-8 rounded-xl border-2 border-dashed border-[#c8e6de] group-hover:border-[#2d6e5a] flex items-center justify-center transition-all flex-shrink-0">
            <svg width="14" height="14" fill="none" stroke="#2d6e5a" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2d3748]">New note</p>
            <p className="text-xs text-[#9a8c7a] mt-0.5">Capture ideas, research, or reminders for this project</p>
          </div>
        </button>
      )}

      {/* Notes list */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#e8e0d0] border-t-[#2d6e5a] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Placeholder banner */}
          {isPlaceholder && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-dashed border-[#d4cdc4] bg-[#faf7f2]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c4bdb4] flex-shrink-0" />
              <p className="text-[11px] text-[#9a8c7a]">
                These are example notes to inspire you — save your first real note above and they'll be replaced.
              </p>
            </div>
          )}

          <div className={`grid gap-3 sm:grid-cols-2 ${isPlaceholder ? "opacity-50 pointer-events-none select-none" : ""}`}>
            {displayNotes.map(note => {
              const isExpanded = expandedId === note.id;
              const isLong = note.note.length > 200;
              return (
                <div key={note.id}
                  className={`bg-white rounded-3xl p-5 flex flex-col gap-3 transition-all group ${
                    isPlaceholder
                      ? "border border-dashed border-[#d4cdc4]"
                      : "border border-[#e8e0d0] hover:border-[#d4cdc4]"}`}
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {note.title && (
                        <p className="text-sm font-serif font-semibold text-[#2d3748] mb-1 leading-snug">{note.title}</p>
                      )}
                      <p className={`text-sm text-[#5c5347] leading-relaxed whitespace-pre-wrap ${
                        !isExpanded && isLong ? "line-clamp-4" : ""}`}>
                        {note.note}
                      </p>
                      {isLong && !isPlaceholder && (
                        <button onClick={() => setExpandedId(isExpanded ? null : note.id)}
                          className="text-[11px] font-semibold text-[#2d6e5a] hover:text-[#1e5244] mt-1.5 transition-colors">
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                    {/* Delete — hidden on placeholders */}
                    {!isPlaceholder && (
                      <button onClick={() => handleDelete(note.id)} disabled={deletingId === note.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c4bdb4] hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 disabled:opacity-40">
                        {deletingId === note.id
                          ? <div className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                          : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>}
                      </button>
                    )}
                  </div>
                  {note.createdAt && (
                    <p className="text-[10px] text-[#c4bdb4] font-medium">{fmtDate(note.createdAt)}</p>
                  )}
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
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { loadDashboard(); }, [projectId]);

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

  const allLogs = [
    ...(project.wordLogs || []).map(l => ({ ...l, _type: "word" })),
    ...(project.progressLogs || []).map(l => ({ ...l, _type: "progress" })),
  ].sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));

  const hasGoals = wc || ch || sc || ss;

  const tabs = [
    { key: "overview", label: "Overview" },
    hasGoals && { key: "today",    label: "Today" },
    hasGoals && { key: "progress", label: "Progress" },
    { key: "history", label: "History" },
    { key: "todos",   label: "Tasks" },
    { key: "notes",   label: "Notes" },
  ].filter(Boolean);

  const statusStyles = {
    IN_PROGRESS: { label: "In progress", color: "#2d6e5a", bg: "#f0fdf4", border: "#bbf7d0" },
    COMPLETED:   { label: "Completed",   color: "#b8962e", bg: "#fffbeb", border: "#fde68a" },
    ON_HOLD:     { label: "On hold",     color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" },
    ABANDONED:   { label: "Abandoned",   color: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb" },
  };
  const statusStyle = statusStyles[project.status] || statusStyles.IN_PROGRESS;
  const deadlineColor  = daysLeft === 0 ? "#ef4444" : daysLeft !== null && daysLeft <= 7 ? "#c47d1e" : "#2d3748";
  const deadlineBg     = daysLeft === 0 ? "#fff1f2" : daysLeft !== null && daysLeft <= 7 ? "#fffbeb" : "white";
  const deadlineBorder = daysLeft === 0 ? "#fecaca" : daysLeft !== null && daysLeft <= 7 ? "#fde68a" : "#e8e0d0";

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 pb-24 sm:pb-12">

        {/* Nav */}
        <div className="flex items-center justify-between mb-6 sm:mb-10">
          <button onClick={() => navigate("/projects")}
            className="flex items-center gap-1.5 text-xs text-[#9a8c7a] hover:text-[#2d3748] transition-colors font-semibold tracking-wide uppercase">
            ← Projects
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold text-white px-4 py-2 rounded-full transition-all"
              style={{ background: "linear-gradient(135deg, #2d6e5a 0%, #1e5244 100%)", boxShadow: "0 2px 8px rgba(45,110,90,0.35)" }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Enter Progress
            </button>
            <button onClick={() => navigate(`/projects/${projectId}/edit`)}
              className="text-xs font-semibold text-[#b8962e] hover:text-[#d4af37] transition-colors border border-[#fde68a] bg-[#fffbeb] px-3.5 py-1.5 rounded-full">
              Edit project
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
              style={{ color: statusStyle.color, background: statusStyle.bg, borderColor: statusStyle.border }}>
              {statusStyle.label}
            </span>
            {project.genre && <span className="text-[11px] text-[#9a8c7a] bg-white border border-[#e8e0d0] px-2.5 py-1 rounded-full">{project.genre}</span>}
            {project.visibility === "PUBLIC" && <span className="text-[11px] text-[#9a8c7a] bg-white border border-[#e8e0d0] px-2.5 py-1 rounded-full">Public</span>}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#2d3748] leading-tight mb-2">{project.title}</h1>
          {project.description && <p className="text-sm text-[#9a8c7a] max-w-xl leading-relaxed">{project.description}</p>}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 sm:mb-10">
          {wc && <StatBlock value={fmt(wc.current)} label="Words written" color="#2563eb" accent="#2563eb" />}
          {ch && <StatBlock value={ch.current} label="Chapters done" color="#2563eb" accent="#2563eb" />}
          {sc && <StatBlock value={sc.current} label="Scenes done" color="#2563eb" accent="#2563eb" />}
          {ss && <StatBlock value={ss.current} label={`Sessions (${ss.period.toLowerCase()})`} color="#7c3aed" accent="#7c3aed" />}
          {daysLeft !== null && (
            <StatBlock value={daysLeft === 0 ? "Due" : daysLeft}
              label={daysLeft === 0 ? "Past deadline" : "Days left"}
              color={deadlineColor} accent={deadlineColor} bg={deadlineBg} border={deadlineBorder} />
          )}
        </div>

        {/* Tabs — top bar on desktop, hidden on mobile (see bottom nav) */}
        <div className="hidden sm:flex gap-1 mb-7 p-1 bg-white border border-[#e8e0d0] rounded-2xl w-fit"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === t.key ? "bg-[#2d3748] text-white" : "text-[#6b5c4a] hover:text-[#2d3748]"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Mobile bottom tab nav */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e8e0d0] px-2 pb-safe"
          style={{ boxShadow: "0 -4px 20px rgba(45,35,20,0.08)", paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
          <div className="flex items-stretch">
            {tabs.map(t => {
              const tabIcons = {
                overview: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
                today:    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07l-.71.71M6.34 17.66l-.71.71m0-12.02l.71.71M17.66 17.66l.71.71" />,
                progress: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
                history:  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
                todos:    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
                notes:    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
              };
              const isActive = activeTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all relative"
                  style={{ minWidth: 0 }}>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#2d3748]" />
                  )}
                  <svg width="20" height="20" fill="none" stroke={isActive ? "#2d3748" : "#b8a898"} strokeWidth={isActive ? 2.2 : 1.8} viewBox="0 0 24 24">
                    {tabIcons[t.key]}
                  </svg>
                  <span className="text-[9px] font-semibold leading-none" style={{ color: isActive ? "#2d3748" : "#b8a898" }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Spacer so content doesn't hide behind mobile bottom nav */}
        <div className="sm:hidden h-16" />

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {hasGoals && (
              <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6 sm:p-8"
                style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
                <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-6">Overall progress</p>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-5 sm:gap-8">
                  {wc && <div className="flex items-center gap-4">
                    <ArcProgress percent={wc.percent} size={80} strokeW={7}>
                      {wc.percent >= 100
                        ? <svg className="w-5 h-5" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{wc.percent}%</span>
                      }
                    </ArcProgress>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: progressColor(wc.percent) }}>Words</p>
                      <p className="text-sm font-semibold text-[#2d3748]">{fmt(wc.current)} written</p>
                      <p className="text-xs text-[#9a8c7a]">{fmt(wc.remaining)} to go</p>
                    </div>
                  </div>}
                  {ch && <div className="flex items-center gap-4">
                    <ArcProgress percent={ch.percent} size={80} strokeW={7}>
                      {ch.percent >= 100
                        ? <svg className="w-5 h-5" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{ch.percent}%</span>
                      }
                    </ArcProgress>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: progressColor(ch.percent) }}>Chapters</p>
                      <p className="text-sm font-semibold text-[#2d3748]">{ch.current} done</p>
                      <p className="text-xs text-[#9a8c7a]">{ch.remaining} left</p>
                    </div>
                  </div>}
                  {sc && <div className="flex items-center gap-4">
                    <ArcProgress percent={sc.percent} size={80} strokeW={7}>
                      {sc.percent >= 100
                        ? <svg className="w-5 h-5" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{sc.percent}%</span>
                      }
                    </ArcProgress>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: progressColor(sc.percent) }}>Scenes</p>
                      <p className="text-sm font-semibold text-[#2d3748]">{sc.current} done</p>
                      <p className="text-xs text-[#9a8c7a]">{sc.remaining} left</p>
                    </div>
                  </div>}
                  {ss && <div className="flex items-center gap-4">
                    <ArcProgress percent={ss.percent} size={80} color="#7c3aed" strokeW={7}>
                      {ss.percent >= 100
                        ? <svg className="w-5 h-5" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{ss.percent}%</span>
                      }
                    </ArcProgress>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#7c3aed" }}>Sessions</p>
                      <p className="text-sm font-semibold text-[#2d3748]">{ss.current} / {ss.target}</p>
                      <p className="text-xs text-[#9a8c7a]">{ss.remaining} left · {ss.period.toLowerCase()}</p>
                    </div>
                  </div>}
                  {daysLeft !== null && <div className="flex items-center gap-4">
                    <ArcProgress percent={daysLeft === 0 ? 100 : Math.min(100, Math.round((1 - daysLeft / 365) * 100))}
                      size={80} color={deadlineColor} strokeW={7}>
                      <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: daysLeft === 0 ? 11 : 16 }}>
                        {daysLeft === 0 ? "Due!" : daysLeft}
                      </span>
                    </ArcProgress>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: deadlineColor }}>Deadline</p>
                      <p className="text-sm font-semibold text-[#2d3748]">{daysLeft === 0 ? "Past due" : `${daysLeft} days left`}</p>
                      {project.deadline && <p className="text-xs text-[#9a8c7a]">
                        {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>}
                    </div>
                  </div>}
                </div>
              </div>
            )}

            {hasGoals && (
              <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6 sm:p-8"
                style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
                <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-6">Progress grid</p>
                <div className="space-y-7">
                  {wc && <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#2d3748] uppercase tracking-wider">Words</span>
                      <span className="text-xs text-[#9a8c7a] tabular-nums">{fmt(wc.current)} / {fmt(wc.target)}</span>
                    </div>
                    <DotGrid current={wc.current} target={wc.target} cols={20} rows={3} />
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold" style={{ color: progressColor(wc.percent) }}>{wc.percent}% complete</span>
                      <span className="text-[#b8a898]">{fmt(wc.remaining)} words remaining</span>
                    </div>
                  </div>}
                  {ch && <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#2d3748] uppercase tracking-wider">Chapters</span>
                      <span className="text-xs text-[#9a8c7a] tabular-nums">{ch.current} / {ch.target}</span>
                    </div>
                    <DotGrid current={ch.current} target={ch.target} cols={20} rows={2} />
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold" style={{ color: progressColor(ch.percent) }}>{ch.percent}% complete</span>
                      <span className="text-[#b8a898]">{ch.remaining} chapters remaining</span>
                    </div>
                  </div>}
                  {sc && <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#2d3748] uppercase tracking-wider">Scenes</span>
                      <span className="text-xs text-[#9a8c7a] tabular-nums">{sc.current} / {sc.target}</span>
                    </div>
                    <DotGrid current={sc.current} target={sc.target} cols={20} rows={2} />
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold" style={{ color: progressColor(sc.percent) }}>{sc.percent}% complete</span>
                      <span className="text-[#b8a898]">{sc.remaining} scenes remaining</span>
                    </div>
                  </div>}
                  {ss && <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#2d3748] uppercase tracking-wider">Sessions <span className="font-normal text-[#9a8c7a] normal-case tracking-normal">({ss.period.toLowerCase()})</span></span>
                      <span className="text-xs text-[#9a8c7a] tabular-nums">{ss.current} / {ss.target}</span>
                    </div>
                    <DotGrid current={ss.current} target={ss.target} cols={ss.target <= 10 ? ss.target : 20} rows={ss.target <= 10 ? 1 : 2} color="#7c3aed" />
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold" style={{ color: "#7c3aed" }}>{ss.percent}% complete</span>
                      <span className="text-[#b8a898]">{ss.remaining} sessions remaining</span>
                    </div>
                  </div>}
                </div>
              </div>
            )}

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
                </div>
                {wc && <div className="mt-4 w-full h-3 bg-[#ede9e3] rounded-full overflow-hidden" style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((wc.current / wc.target) * 100, 100)}%`, background: progressColor(wc.percent), boxShadow: `0 1px 4px ${progressColor(wc.percent)}55` }} />
                </div>}
              </div>
            )}
          </div>
        )}

        {/* ── Today ── */}
        {activeTab === "today" && hasGoals && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-[#e8e0d0] p-5 sm:p-8"
              style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
              <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-5">Today's goal</p>
              {(wc?.dailyTarget || ch?.dailyTarget || sc?.dailyTarget || ss) ? (
                <div className="flex flex-col gap-5 divide-y divide-[#f0ebe3]">
                  {wc?.dailyTarget && <DailyTargetCard todayCount={todayTotals?.wordsToday || 0} dailyTarget={wc.dailyTarget} label="words" />}
                  {ch?.dailyTarget && <div className="pt-5"><DailyTargetCard todayCount={todayTotals?.chaptersToday || 0} dailyTarget={ch.dailyTarget} label="chapters" /></div>}
                  {sc?.dailyTarget && <div className="pt-5"><DailyTargetCard todayCount={todayTotals?.scenesToday || 0} dailyTarget={sc.dailyTarget} label="scenes" /></div>}
                  {ss && <div className={wc?.dailyTarget || ch?.dailyTarget || sc?.dailyTarget ? "pt-5" : ""}>
                    <SessionGoalCard current={ss.current} target={ss.target} period={ss.period} sessionsToday={todayTotals?.sessionsToday || 0} />
                  </div>}
                </div>
              ) : <p className="text-sm text-[#9a8c7a] py-6">Add a deadline and schedule to unlock daily goals.</p>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {wc && <StatBlock value={fmt(todayTotals?.wordsToday || 0)} label="Words today" color={(todayTotals?.wordsToday || 0) >= wc?.dailyTarget ? "#16a34a" : "#ea580c"} accent={(todayTotals?.wordsToday || 0) >= wc?.dailyTarget ? "#16a34a" : "#ea580c"} />}
              {ch && <StatBlock value={todayTotals?.chaptersToday || 0} label="Chapters today" color={(todayTotals?.chaptersToday || 0) >= ch?.dailyTarget ? "#16a34a" : "#ea580c"} accent={(todayTotals?.chaptersToday || 0) >= ch?.dailyTarget ? "#16a34a" : "#ea580c"} />}
              {sc && <StatBlock value={todayTotals?.scenesToday || 0} label="Scenes today" color={(todayTotals?.scenesToday || 0) >= sc?.dailyTarget ? "#16a34a" : "#ea580c"} accent={(todayTotals?.scenesToday || 0) >= sc?.dailyTarget ? "#16a34a" : "#ea580c"} />}
              <StatBlock value={todayTotals?.sessionsToday || 0} label="Sessions today" color="#7c3aed" accent="#7c3aed" />
            </div>
            <button onClick={() => setModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ background: ss && !wc && !ch && !sc ? "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)" : "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", boxShadow: ss && !wc && !ch && !sc ? "0 4px 14px rgba(124,58,237,0.35)" : "0 4px 14px rgba(234,88,12,0.35)" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {ss && !wc && !ch && !sc ? "Log a session" : "Log today's writing"}
            </button>
          </div>
        )}

        {/* ── Progress ── */}
        {activeTab === "progress" && hasGoals && (
          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6 sm:p-8"
              style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
              <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-6">Overall progress</p>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-5 sm:gap-8">
                {wc && <div className="flex items-center gap-4">
                  <ArcProgress percent={wc.percent} size={80} strokeW={7}>
                    {wc.percent >= 100
                      ? <svg className="w-5 h-5" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{wc.percent}%</span>}
                  </ArcProgress>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: progressColor(wc.percent) }}>Words</p>
                    <p className="text-sm font-semibold text-[#2d3748]">{fmt(wc.current)} written</p>
                    <p className="text-xs text-[#9a8c7a]">{fmt(wc.remaining)} left</p>
                  </div>
                </div>}
                {ch && <div className="flex items-center gap-4">
                  <ArcProgress percent={ch.percent} size={80} strokeW={7}>
                    {ch.percent >= 100
                      ? <svg className="w-5 h-5" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{ch.percent}%</span>}
                  </ArcProgress>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: progressColor(ch.percent) }}>Chapters</p>
                    <p className="text-sm font-semibold text-[#2d3748]">{ch.current} done</p>
                    <p className="text-xs text-[#9a8c7a]">{ch.remaining} left</p>
                  </div>
                </div>}
                {sc && <div className="flex items-center gap-4">
                  <ArcProgress percent={sc.percent} size={80} strokeW={7}>
                    {sc.percent >= 100
                      ? <svg className="w-5 h-5" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{sc.percent}%</span>}
                  </ArcProgress>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: progressColor(sc.percent) }}>Scenes</p>
                    <p className="text-sm font-semibold text-[#2d3748]">{sc.current} done</p>
                    <p className="text-xs text-[#9a8c7a]">{sc.remaining} left</p>
                  </div>
                </div>}
                {ss && <div className="flex items-center gap-4">
                  <ArcProgress percent={ss.percent} size={80} color="#7c3aed" strokeW={7}>
                    {ss.percent >= 100
                      ? <svg className="w-5 h-5" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 16 }}>{ss.percent}%</span>}
                  </ArcProgress>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#7c3aed" }}>Sessions</p>
                    <p className="text-sm font-semibold text-[#2d3748]">{ss.current} / {ss.target}</p>
                    <p className="text-xs text-[#9a8c7a]">{ss.remaining} left · {ss.period.toLowerCase()}</p>
                  </div>
                </div>}
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6 sm:p-8"
              style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
              <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-6">Detailed breakdown</p>
              <div className="space-y-8">
                {wc && <div className="space-y-4">
                  <ProgressRow label="Words" current={wc.current} target={wc.target} percent={wc.percent} remaining={wc.remaining} remainingLabel="words" />
                  <DotGrid current={wc.current} target={wc.target} cols={20} rows={3} />
                </div>}
                {ch && <ProgressRow label="Chapters" current={ch.current} target={ch.target} percent={ch.percent} remaining={ch.remaining} remainingLabel="chapters" />}
                {sc && <ProgressRow label="Scenes" current={sc.current} target={sc.target} percent={sc.percent} remaining={sc.remaining} remainingLabel="scenes" />}
                {ss && <div className="space-y-4">
                  <ProgressRow label={`Sessions (${ss.period.toLowerCase()})`} current={ss.current} target={ss.target} percent={ss.percent} remaining={ss.remaining} remainingLabel="sessions" color="#7c3aed" />
                  <DotGrid current={ss.current} target={ss.target} cols={ss.target <= 10 ? ss.target : 20} rows={ss.target <= 10 ? 1 : 2} color="#7c3aed" />
                </div>}
              </div>
            </div>
          </div>
        )}

        {/* ── History ── */}
        {activeTab === "history" && (
          <div className="bg-white rounded-3xl border border-[#e8e0d0] p-6"
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
            <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-5">Progress history</p>
            <HistoryLog logs={allLogs} />
          </div>
        )}

        {/* ── Tasks ── */}
        {activeTab === "todos" && <TodoTab projectId={projectId} />}

        {/* ── Notes ── */}
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
    </div>
  );
}