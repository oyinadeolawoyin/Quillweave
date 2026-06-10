// src/components/challenge/challengepage.jsx
// Daily Writing Challenge page — /challenge
// Redesigned: emotional stats, community-first layout, sprint CTA, no hero, no 14-day bars

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "../profile/header";
import { StartGroupSprintModal } from "../sprint/groupSprintModal";

// ─── helpers ─────────────────────────────────────────────────────────────────

const GOAL_LABELS = {
  WORDS:    { singular: "word",    plural: "words",    verb: "written" },
  CHAPTERS: { singular: "chapter", plural: "chapters", verb: "completed" },
  SCENES:   { singular: "scene",   plural: "scenes",   verb: "completed" },
  DURATION: { singular: "minute",  plural: "minutes",  verb: "of writing" },
};

function goalLabel(type, count) {
  const g = GOAL_LABELS[type] ?? GOAL_LABELS.WORDS;
  return `${count} ${count === 1 ? g.singular : g.plural}`;
}

function goalVerb(type) {
  return GOAL_LABELS[type]?.verb ?? "written";
}

function Avatar({ user, size = 32 }) {
  if (!user) return null;
  return user.avatar
    ? <img src={user.avatar} alt={user.username} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
    : (
      <div
        className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, background: "#1a1a2e", fontSize: size * 0.38 }}
      >
        {user.username?.charAt(0).toUpperCase()}
      </div>
    );
}

// ─── animated count-up ───────────────────────────────────────────────────────

function useCountUp(target, duration = 1200, running = false) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!running) { setValue(0); return; }
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf.current = requestAnimationFrame(step);
      else setValue(target);
    }
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, running]);

  return value;
}

// ─── circle progress ─────────────────────────────────────────────────────────

function CircleProgress({ value, max, size = 120, strokeWidth = 8, children, color = "#d4af37", bg = "#e8e0d0" }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = pct * circ;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

// ─── confetti burst ──────────────────────────────────────────────────────────

function ConfettiBurst({ active }) {
  const particles = useRef(
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: -(Math.random() * 240 + 80),
      rot: Math.random() * 720 - 360,
      color: ["#d4af37", "#1a1a2e", "#b8860b", "#fffdf0", "#6b5c4a", "#c9a42d"][i % 6],
      size: Math.random() * 8 + 5,
      delay: Math.random() * 200,
    }))
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" style={{ zIndex: 10 }}>
      {particles.current.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: `confetti-fly 1.1s cubic-bezier(0.25,0.46,0.45,0.94) ${p.delay}ms forwards`,
            "--tx": `${p.x}px`,
            "--ty": `${p.y}px`,
            "--tr": `${p.rot}deg`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fly {
          0%   { transform: translate(0,0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--tr)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── celebration modal ───────────────────────────────────────────────────────

function CelebrationModal({ result, onClose }) {
  const [phase, setPhase] = useState("counting"); // counting | tada
  const countTarget = result?.finalCount ?? 0;
  const totalTarget = result?.totalLogged ?? 0;
  const counting = useCountUp(countTarget, 1100, phase === "counting");
  const totalCounting = useCountUp(totalTarget, 1400, phase === "tada");

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setPhase("tada"), 1400);
    return () => clearTimeout(t);
  }, [result]);

  if (!result) return null;

  const goalType = result.goalType ?? "WORDS";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center relative overflow-hidden border border-[#e8e0d0]"
        style={{ borderTop: "4px solid #d4af37" }}
      >
        <ConfettiBurst active={phase === "tada"} />

        {phase === "counting" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-4">Today's count</p>
            <div className="font-serif text-7xl font-bold text-[#1a1a2e] leading-none mb-2 tabular-nums">
              {counting.toLocaleString()}
            </div>
            <p className="text-[13px] text-[#9a8c7a]">{goalLabel(goalType, countTarget).replace(/^\d+ /, "")} {goalVerb(goalType)}</p>
          </>
        )}

        {phase === "tada" && (
          <>
            <div style={{ animation: "tada 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-3">Goal met</p>
              <CircleProgress value={result.finalCount} max={result.goalValue} size={128} strokeWidth={9} color="#d4af37">
                <span className="font-serif text-2xl font-bold text-[#1a1a2e]">{result.finalCount.toLocaleString()}</span>
                <span className="text-[9px] text-[#9a8c7a] uppercase tracking-wide mt-0.5">
                  / {result.goalValue}
                </span>
              </CircleProgress>
            </div>

            <p className="font-serif text-[#1a1a2e] text-lg font-bold mt-4 mb-1">
              Well done.
            </p>
            <p className="text-[12px] text-[#6b5c4a] mb-4 leading-relaxed">
              You showed up today. That's the whole thing.
            </p>

            <div className="grid grid-cols-3 gap-3 bg-[#faf7f2] rounded-xl p-4 mb-5">
              <div className="text-center">
                <div className="font-serif text-xl font-bold text-[#1a1a2e]">{result.currentStreak}</div>
                <div className="text-[9px] text-[#9a8c7a] uppercase tracking-wide">Day streak</div>
              </div>
              <div className="text-center border-x border-[#e8e0d0]">
                <div className="font-serif text-xl font-bold text-[#1a1a2e]">{totalCounting.toLocaleString()}</div>
                <div className="text-[9px] text-[#9a8c7a] uppercase tracking-wide">Total logged</div>
              </div>
              <div className="text-center">
                <div className="font-serif text-xl font-bold text-[#1a1a2e]">{result.longestStreak}</div>
                <div className="text-[9px] text-[#9a8c7a] uppercase tracking-wide">Best streak</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors"
            >
              Back to challenge
            </button>
          </>
        )}

        <style>{`
          @keyframes tada {
            0%   { transform: scale(0.6) rotate(-6deg); opacity: 0; }
            60%  { transform: scale(1.08) rotate(2deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

// ─── join form ───────────────────────────────────────────────────────────────

function JoinForm({ onJoined }) {
  const [goalValue, setGoalValue] = useState("");
  const [goalType, setGoalType]   = useState("WORDS");
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");

  async function submit() {
    if (!goalValue || isNaN(goalValue) || Number(goalValue) < 1) {
      setErr("Enter a positive number for your daily goal."); return;
    }
    setSaving(true); setErr("");
    try {
      const r = await fetch(`${API_URL}/challenge/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalValue: Number(goalValue), goalType }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.message ?? "Something went wrong."); return; }
      onJoined(d);
    } catch { setErr("Network error — please try again."); }
    finally { setSaving(false); }
  }

  const typeOptions = [
    { value: "WORDS",    label: "Words" },
    { value: "CHAPTERS", label: "Chapters" },
    { value: "SCENES",   label: "Scenes" },
    { value: "DURATION", label: "Minutes" },
  ];

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl p-7" style={{ borderTop: "4px solid #d4af37" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-2">Daily Challenge</p>
      <h2 className="font-serif text-[#1a1a2e] text-xl font-bold mb-1 leading-tight">Set your daily goal</h2>
      <p className="text-[12px] text-[#9a8c7a] mb-6 leading-relaxed">
        Choose what you'll commit to each day. You can adjust it anytime.
      </p>

      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {typeOptions.map(o => (
          <button
            key={o.value}
            onClick={() => setGoalType(o.value)}
            className="py-2 text-[11px] font-semibold rounded-lg border transition-all"
            style={goalType === o.value
              ? { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" }
              : { background: "#faf7f2", color: "#6b5c4a", borderColor: "#e8e0d0" }
            }
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <label className="text-[11px] font-semibold text-[#6b5c4a] uppercase tracking-wide block mb-1.5">
          Daily target
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={goalValue}
            onChange={e => setGoalValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder={goalType === "WORDS" ? "500" : goalType === "DURATION" ? "30" : "2"}
            className="flex-1 px-4 py-2.5 border border-[#e8e0d0] rounded-lg text-[13px] text-[#1a1a2e] focus:outline-none focus:border-[#d4af37] bg-white"
          />
          <span className="text-[12px] text-[#9a8c7a] flex-shrink-0">
            {goalType === "WORDS" ? "words/day" : goalType === "DURATION" ? "min/day" : goalType === "CHAPTERS" ? "ch/day" : "scenes/day"}
          </span>
        </div>
      </div>

      {err && <p className="text-[11px] text-[#c0392b] mb-3">{err}</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="w-full py-3 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors disabled:opacity-60"
      >
        {saving ? "Joining…" : "Join the challenge"}
      </button>
    </div>
  );
}

// ─── check-in panel ──────────────────────────────────────────────────────────

function CheckInPanel({ participation, onCheckIn, onStartSprint, autoOpenLog = false }) {
  const [answered, setAnswered]   = useState(autoOpenLog ? "yes" : null); // null | "yes" | "no"
  const [count, setCount]         = useState("");
  const [mode, setMode]           = useState("add");
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");

  const todayCheckIn = participation.checkIns?.find(c => {
    const d = new Date(c.checkInDate);
    const today = new Date();
    return d.getUTCFullYear() === today.getUTCFullYear()
      && d.getUTCMonth() === today.getUTCMonth()
      && d.getUTCDate() === today.getUTCDate();
  });
  const todayCount = todayCheckIn?.countLogged ?? 0;
  const metToday   = todayCheckIn?.metDailyGoal ?? false;
  const pct        = Math.min(todayCount / participation.goalValue, 1);
  const soClose    = !metToday && pct >= 0.7 && pct < 1;

  async function logProgress() {
    const n = Number(count);
    if (!count || isNaN(n) || n < 0) { setErr("Enter a valid number."); return; }
    setSaving(true); setErr("");
    try {
      const r = await fetch(`${API_URL}/challenge/checkin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countLogged: n, mode }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.message ?? "Something went wrong."); return; }
      onCheckIn(d);
      setAnswered(null);
      setCount("");
    } catch { setErr("Network error — please try again."); }
    finally { setSaving(false); }
  }

  const goalType  = participation.goalType;
  const typeLabel = GOAL_LABELS[goalType] ?? GOAL_LABELS.WORDS;

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden" style={{ borderTop: "4px solid #d4af37" }}>
      {/* Sprint return prompt — shown when navigated back from a completed sprint */}
      {autoOpenLog && answered === "yes" && (
        <div className="mx-6 mt-4 mb-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#fffdf0] border border-[#d4af37]/30">
          <svg className="w-3.5 h-3.5 text-[#d4af37] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[11px] text-[#6b5c4a] font-medium">Sprint done — log your count below.</p>
        </div>
      )}

      {/* Progress ring + status */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center gap-5">
          <CircleProgress value={todayCount} max={participation.goalValue} size={100} strokeWidth={8} color={metToday ? "#059669" : "#d4af37"}>
            <span className="font-serif text-lg font-bold text-[#1a1a2e] leading-none">{todayCount.toLocaleString()}</span>
            <span className="text-[9px] text-[#9a8c7a] mt-0.5">/ {participation.goalValue}</span>
          </CircleProgress>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-1">Today</p>
            {metToday ? (
              <>
                <p className="font-serif text-[#1a1a2e] text-base font-bold leading-snug">Goal met.</p>
                <p className="text-[12px] text-[#059669] mt-0.5">Day {participation.currentStreak} complete ✓</p>
              </>
            ) : soClose ? (
              <>
                <p className="font-serif text-[#1a1a2e] text-base font-bold leading-snug">So close.</p>
                <p className="text-[12px] text-[#b8860b] mt-0.5">
                  {(participation.goalValue - todayCount).toLocaleString()} {typeLabel.plural} to go.
                </p>
              </>
            ) : (
              <>
                <p className="font-serif text-[#1a1a2e] text-base font-bold leading-snug">
                  {goalLabel(goalType, participation.goalValue)} / day
                </p>
                <p className="text-[12px] text-[#9a8c7a] mt-0.5">{typeLabel.plural} {typeLabel.verb}</p>
              </>
            )}
          </div>
        </div>

        {/* Start a sprint — sits right below the progress ring, always visible */}
        <button
          onClick={onStartSprint}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-[#1a1a2e] text-[#1a1a2e] text-[12px] font-bold hover:bg-[#1a1a2e] hover:text-white transition-all group"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Start a sprint
        </button>
      </div>

      {/* Log progress section */}
      <div className="border-t border-[#f0ebe3] px-6 pb-6 pt-4">
        {answered === null && (
          <>
            <p className="text-[13px] font-semibold text-[#1a1a2e] mb-3 text-center">Did you write today?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setAnswered("yes")}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-bold border-2 border-[#d4af37] text-[#1a1a2e] hover:bg-[#fffdf0] transition-colors"
              >
                Yes, log progress
              </button>
              <button
                onClick={() => setAnswered("no")}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold border border-[#e8e0d0] text-[#9a8c7a] hover:bg-[#faf7f2] transition-colors"
              >
                Not yet
              </button>
            </div>
          </>
        )}

        {answered === "no" && (
          <div className="text-center">
            <p className="text-[13px] text-[#6b5c4a] leading-relaxed mb-3">
              That's okay. The day isn't over yet.
            </p>
            <button onClick={() => setAnswered(null)} className="text-[11px] text-[#9a8c7a] underline">Back</button>
          </div>
        )}

        {answered === "yes" && (
          <div>
            <p className="text-[12px] font-semibold text-[#6b5c4a] mb-3">
              How many {typeLabel.plural} did you log?
            </p>

            {todayCount > 0 && (
              <div className="flex gap-1.5 mb-3">
                {[
                  { v: "add",     label: "Add to today" },
                  { v: "replace", label: "Replace today" },
                ].map(o => (
                  <button
                    key={o.v}
                    onClick={() => setMode(o.v)}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg border transition-all"
                    style={mode === o.v
                      ? { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" }
                      : { background: "#faf7f2", color: "#6b5c4a", borderColor: "#e8e0d0" }
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mb-1">
              <input
                type="number"
                min="0"
                value={count}
                onChange={e => setCount(e.target.value)}
                onKeyDown={e => e.key === "Enter" && logProgress()}
                placeholder={goalType === "WORDS" ? "e.g. 500" : "e.g. 2"}
                className="flex-1 px-4 py-2.5 border border-[#e8e0d0] rounded-lg text-[13px] text-[#1a1a2e] focus:outline-none focus:border-[#d4af37] bg-white"
              />
              <span className="text-[11px] text-[#9a8c7a] flex-shrink-0">{typeLabel.plural}</span>
            </div>
            {err && <p className="text-[11px] text-[#c0392b] mb-2">{err}</p>}

            <div className="flex gap-2 mt-3">
              <button
                onClick={logProgress}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-colors disabled:opacity-60"
              >
                {saving ? "Logging…" : "Log progress"}
              </button>
              <button onClick={() => setAnswered(null)} className="px-3 py-2.5 border border-[#e8e0d0] rounded-lg text-[11px] text-[#9a8c7a] hover:bg-[#faf7f2] transition-colors">
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── my stats panel ──────────────────────────────────────────────────────────
// Beautiful daily goal card: arc progress, streak fire, motivational copy, total output

function MyStats({ participation }) {
  const goalType  = participation.goalType;
  const typeLabel = GOAL_LABELS[goalType] ?? GOAL_LABELS.WORDS;
  const total     = participation.totalLogged ?? 0;
  const streak    = participation.currentStreak ?? 0;
  const longest   = participation.longestStreak ?? 0;

  // Streak emotion
  const streakEmoji = streak >= 14 ? "🔥" : streak >= 7 ? "🔥" : streak >= 3 ? "✦" : null;
  const streakMsg =
    streak === 0  ? "Start writing today to begin your streak." :
    streak < 3    ? "Keep going — 3 days builds a habit." :
    streak < 7    ? "Three days in. You're building something real." :
    streak < 14   ? "A full week. That's rare." :
                    "Two weeks straight. You're a writer.";

  return (
    <div className="rounded-2xl overflow-hidden border border-[#e8e0d0]" style={{ background: "#fff" }}>

      {/* ── Top: dark streak band ── */}
      <div
        className="relative px-6 py-5 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #252545 100%)",
        }}
      >
        {/* Decorative arc background */}
        <svg
          className="absolute right-0 top-0 opacity-[0.06] pointer-events-none"
          width="180" height="120" viewBox="0 0 180 120" fill="none"
        >
          <circle cx="160" cy="-10" r="100" stroke="#d4af37" strokeWidth="40" />
        </svg>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]/60 mb-3">Your streak</p>

        <div className="flex items-end justify-between relative z-10">
          {/* Current streak — hero number */}
          <div>
            <div className="flex items-end gap-2 leading-none">
              <span className="font-serif text-[56px] font-bold text-[#d4af37] tabular-nums leading-none">{streak}</span>
              {streakEmoji && <span className="text-3xl mb-1.5">{streakEmoji}</span>}
            </div>
            <p className="text-[11px] text-white/45 uppercase tracking-widest mt-1">days in a row</p>
          </div>

          {/* Best streak — quiet stat */}
          <div className="text-right pb-1">
            <div className="font-serif text-2xl font-bold text-white/50 tabular-nums">{longest}</div>
            <p className="text-[10px] text-white/30 uppercase tracking-wide mt-0.5">best ever</p>
          </div>
        </div>

        {/* Motivational line */}
        <p className="text-[11px] text-white/35 mt-3 leading-relaxed relative z-10">{streakMsg}</p>
      </div>

      {/* ── Middle: total output ── */}
      <div
        className="px-6 py-4 flex items-center justify-between border-b border-[#f0ebe3]"
        style={{ background: "#fffdf4" }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8b89a] mb-0.5">Total output</p>
          <p className="font-serif text-2xl font-bold text-[#1a1a2e] tabular-nums leading-none">{total.toLocaleString()}</p>
          <p className="text-[11px] text-[#b8a890] mt-1">{typeLabel.plural} {typeLabel.verb}</p>
        </div>
        {/* Small quill icon */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.12)" }}>
          <svg className="w-5 h-5" fill="none" stroke="#d4af37" strokeWidth="1.6" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>

      {/* ── Bottom: daily goal mini-ring ── */}
      <div className="px-6 py-4 flex items-center gap-4">
        {/* Mini arc showing all-time completion ratio */}
        <div className="flex-shrink-0">
          <GoalRing participation={participation} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a8c7a] mb-0.5">Daily goal</p>
          <p className="font-serif text-[15px] font-bold text-[#1a1a2e] leading-snug">
            {goalLabel(goalType, participation.goalValue)}
            <span className="font-sans font-normal text-[12px] text-[#b8a890]"> / day</span>
          </p>
          <p className="text-[11px] text-[#c8b89a] mt-0.5 capitalize">{typeLabel.plural} {typeLabel.verb}</p>
        </div>
      </div>
    </div>
  );
}

// Small arc ring showing days-met / days-active ratio
function GoalRing({ participation }) {
  const checkIns = participation.checkIns ?? [];
  const totalDays = checkIns.length;
  const metDays   = checkIns.filter(c => c.metDailyGoal).length;
  const pct       = totalDays > 0 ? metDays / totalDays : 0;

  const size = 52;
  const sw   = 5;
  const r    = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0ebe3" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#d4af37" strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <span className="font-serif text-[13px] font-bold text-[#1a1a2e] tabular-nums leading-none">
          {totalDays > 0 ? Math.round(pct * 100) : "—"}
        </span>
        {totalDays > 0 && <span className="block text-[8px] text-[#b8a890]">%</span>}
      </div>
    </div>
  );
}

// ─── goal actions bar ─────────────────────────────────────────────────────────
// Update goal + leave challenge — compact, always visible

function GoalActionsBar({ participation, onUpdated, onLeave }) {
  const [mode, setMode]         = useState(null); // null | "edit"
  const [goalValue, setGV]      = useState(String(participation.goalValue));
  const [goalType, setGT]       = useState(participation.goalType);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");
  const [leaving, setLeaving]   = useState(false);

  async function save() {
    const n = Number(goalValue);
    if (!goalValue || isNaN(n) || n < 1) { setErr("Enter a positive number."); return; }
    setSaving(true); setErr("");
    try {
      const r = await fetch(`${API_URL}/challenge/goal`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalValue: n, goalType }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.message ?? "Something went wrong."); return; }
      onUpdated(d);
      setMode(null);
    } catch { setErr("Network error."); }
    finally { setSaving(false); }
  }

  async function confirmLeave() {
    if (!window.confirm("Leave the daily challenge? Your streak progress will be saved.")) return;
    setLeaving(true);
    try {
      const r = await fetch(`${API_URL}/challenge/leave`, { method: "POST", credentials: "include" });
      if (r.ok) onLeave();
    } catch {}
    finally { setLeaving(false); }
  }

  const typeOptions = [
    { value: "WORDS",    label: "Words" },
    { value: "CHAPTERS", label: "Chapters" },
    { value: "SCENES",   label: "Scenes" },
    { value: "DURATION", label: "Minutes" },
  ];

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl overflow-hidden">
      {/* Action row */}
      <div className="flex items-center divide-x divide-[#f0ebe3]">
        <button
          onClick={() => { setMode(m => m === "edit" ? null : "edit"); setErr(""); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold text-[#6b5c4a] hover:bg-[#faf7f2] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Update goal
          <span className="text-[10px] text-[#c8b89a] font-normal">
            ({goalLabel(participation.goalType, participation.goalValue)}/day)
          </span>
        </button>
        <button
          onClick={confirmLeave}
          disabled={leaving}
          className="flex items-center justify-center gap-1.5 px-4 py-3 text-[12px] font-semibold text-[#c0392b]/70 hover:text-[#c0392b] hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {leaving ? "Leaving…" : "Leave"}
        </button>
      </div>

      {/* Inline goal editor */}
      {mode === "edit" && (
        <div className="border-t border-[#f0ebe3] px-5 py-4">
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {typeOptions.map(o => (
              <button key={o.value} onClick={() => setGT(o.value)}
                className="py-1.5 text-[11px] font-semibold rounded-lg border transition-all"
                style={goalType === o.value ? { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" } : { background: "#faf7f2", color: "#6b5c4a", borderColor: "#e8e0d0" }}
              >{o.label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" min="1" value={goalValue} onChange={e => setGV(e.target.value)}
              onKeyDown={e => e.key === "Enter" && save()}
              className="flex-1 px-3 py-2 border border-[#e8e0d0] rounded-lg text-[13px] text-[#1a1a2e] focus:outline-none focus:border-[#d4af37] bg-white" />
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-[#d4af37] text-[#1a1a2e] text-[12px] font-bold rounded-lg hover:bg-[#c9a42d] transition-colors disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setMode(null)}
              className="px-3 py-2 border border-[#e8e0d0] rounded-lg text-[11px] text-[#9a8c7a] hover:bg-[#faf7f2] transition-colors">
              Cancel
            </button>
          </div>
          {err && <p className="text-[11px] text-[#c0392b] mt-1.5">{err}</p>}
        </div>
      )}
    </div>
  );
}

// ─── community stats ─────────────────────────────────────────────────────────

function CommunityStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="space-y-4">

      {/* Live pulse banner */}
      <div className="bg-[#1a1a2e] rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse flex-shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]/80">Writing right now</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-serif text-3xl font-bold text-white tabular-nums">{stats.totalActive}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">writers in</div>
          </div>
          <div className="text-right">
            <div className="font-serif text-3xl font-bold text-[#d4af37] tabular-nums">{stats.todayGoalCount}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">goals hit today</div>
          </div>
        </div>
      </div>

      {/* Streak leaders */}
      {stats.streakLeaders?.length > 0 && (
        <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f0ebe3] flex items-center gap-2">
            <span className="text-base">🔥</span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b5c4a]">Streak leaders</p>
          </div>
          <div className="divide-y divide-[#f4f1ec]">
            {stats.streakLeaders.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <span className="text-[11px] font-bold text-[#c8b89a] w-4 flex-shrink-0 tabular-nums">{i + 1}</span>
                <Avatar user={p.user} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#1a1a2e] truncate">{p.user?.username}</p>
                  <p className="text-[10px] text-[#9a8c7a] capitalize">{p.goalType?.toLowerCase()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-serif text-lg font-bold text-[#d4af37] tabular-nums">{p.currentStreak}</span>
                  <span className="text-[9px] text-[#9a8c7a] ml-0.5">days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's completions */}
      {stats.todayCompletions?.length > 0 && (
        <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f0ebe3] flex items-center gap-2">
            <span className="text-base">✓</span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b5c4a]">Completed today</p>
          </div>
          <div className="divide-y divide-[#f4f1ec]">
            {stats.todayCompletions.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <Avatar user={c.participation?.user} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#1a1a2e] truncate">{c.participation?.user?.username}</p>
                  <p className="text-[10px] text-[#9a8c7a]">
                    {goalLabel(c.participation?.goalType, c.countLogged)} {goalVerb(c.participation?.goalType)}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#059669] flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent joiners */}
      {stats.recentJoiners?.length > 0 && (
        <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f0ebe3] flex items-center gap-2">
            <span className="text-base">👋</span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b5c4a]">Recently joined</p>
          </div>
          <div className="divide-y divide-[#f4f1ec]">
            {stats.recentJoiners.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <Avatar user={p.user} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#1a1a2e] truncate">{p.user?.username}</p>
                  <p className="text-[10px] text-[#9a8c7a]">
                    {goalLabel(p.goalType, p.goalValue)} / day
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── quotes ──────────────────────────────────────────────────────────────────

const QUOTES = [
  { text: "Even 15 minutes every day adds up to a finished book.", attr: null },
  { text: "You don't have to write well today. You just have to write.", attr: null },
  { text: "A page a day is a book a year.", attr: null },
  { text: "The first draft is just you telling yourself the story.", attr: "Terry Pratchett" },
  { text: "Showing up is the whole discipline.", attr: null },
  { text: "Small sessions, written daily, beat one perfect weekend.", attr: null },
  { text: "Write a little. Then write a little more. That's it.", attr: null },
  { text: "Every word you write today is one your future self didn't have to.", attr: null },
];

function QuoteBanner() {
  const idx = useRef(Math.floor(Math.random() * QUOTES.length));
  const q   = QUOTES[idx.current];

  return (
    <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-[#fffdf4] border border-[#e8d88a]/50">
      <span className="text-[#d4af37] text-xl leading-none flex-shrink-0 mt-0.5" aria-hidden="true">"</span>
      <div className="min-w-0">
        <p className="text-[13px] text-[#5a4a2e] leading-relaxed font-medium italic">{q.text}</p>
        {q.attr && <p className="text-[11px] text-[#b8a070] mt-1 not-italic">— {q.attr}</p>}
      </div>
    </div>
  );
}

// ─── invite friends ───────────────────────────────────────────────────────────

function InviteCard() {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/challenge`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback — select a temp input
      const el = document.createElement("input");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl px-5 py-4 flex items-center gap-4">
      {/* Icon */}
      <div className="w-9 h-9 rounded-full bg-[#1a1a2e] flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6 3 3 0 000 6zM3 14a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-[#1a1a2e]">Invite a friend to the challenge</p>
        <p className="text-[11px] text-[#9a8c7a] mt-0.5">Writing alongside others keeps the streak alive.</p>
      </div>

      {/* Copy button */}
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex-shrink-0"
        style={copied
          ? { background: "#059669", color: "#fff" }
          : { background: "#1a1a2e", color: "#d4af37" }
        }
      >
        {copied ? (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy link
          </>
        )}
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function ChallengePage() {
  const { user }                            = useAuth();
  const navigate                            = useNavigate();
  const location                            = useLocation();
  const [participation, setParticipation]   = useState(null);
  const [stats, setStats]                   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [celebration, setCelebration]       = useState(null);
  const [showSprintModal, setShowSprintModal] = useState(false);

  // When navigating back from a sprint, auto-open the "yes, log progress" flow
  const sprintReturn = location.state?.returnReason === "log_challenge_progress";

  const loadParticipation = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`${API_URL}/challenge/my-participation`, { credentials: "include" });
      if (r.status === 404) { setParticipation(null); return; }
      if (r.ok) setParticipation(await r.json());
    } catch {}
  }, [user]);

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/challenge/stats`);
      if (r.ok) setStats(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([loadParticipation(), loadStats()]).finally(() => setLoading(false));
  }, [loadParticipation, loadStats]);

  function handleJoined(p) {
    setParticipation(p);
    loadStats();
  }

  function handleCheckIn(result) {
    setParticipation(prev => {
      if (!prev) return prev;
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const filtered = (prev.checkIns ?? []).filter(c => {
        const d = new Date(c.checkInDate);
        d.setUTCHours(0, 0, 0, 0);
        return d.getTime() !== today.getTime();
      });
      return {
        ...prev,
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
        totalLogged:   result.totalLogged,
        checkIns: [result.checkIn, ...filtered],
      };
    });

    if (result.metGoal) {
      setCelebration(result);
    }

    loadStats();
  }

  function handleLeave() {
    setParticipation(null);
    loadStats();
  }

  // Sprint modal — open modal, then navigate to workspace with returnTo so it comes back here on finish
  function handleStartSprint() {
    setShowSprintModal(true);
  }

  function handleSprintCreated(groupSprint, writeMode) {
    setShowSprintModal(false);
    navigate(`/group-sprint/${groupSprint.id}`, {
      state: {
        writingMode:  writeMode ? "inkwell" : "external",
        returnTo:     "/challenge",
        returnReason: "log_challenge_progress",
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Header />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-8">
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-48 bg-white border border-[#e8e0d0] rounded-2xl animate-pulse" />)}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-[#e8e0d0] rounded-xl animate-pulse" />)}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-8 items-start">

            {/* LEFT — user's zone */}
            <div className="space-y-4">
              {!user && (
                <div className="bg-white border border-[#e8e0d0] rounded-2xl p-8 text-center" style={{ borderTop: "4px solid #d4af37" }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-2">Daily Writing Challenge</p>
                  <h2 className="font-serif text-[#1a1a2e] text-2xl font-bold mb-2 leading-tight">Show up every day.</h2>
                  <p className="text-[13px] text-[#9a8c7a] mb-6 max-w-sm mx-auto leading-relaxed">
                    One daily goal. A streak that grows every time you show up.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => navigate("/signup")} className="px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-colors">
                      Create account
                    </button>
                    <button onClick={() => navigate("/login")} className="px-5 py-2.5 border border-[#1a1a2e] text-[#1a1a2e] text-sm font-semibold rounded-lg hover:bg-[#1a1a2e] hover:text-white transition-colors">
                      Sign in
                    </button>
                  </div>
                </div>
              )}

              {user && !participation && (
                <>
                  <JoinForm onJoined={handleJoined} />
                  <QuoteBanner />
                  <InviteCard />
                </>
              )}

              {user && participation && (
                <>
                  {/* Check-in + sprint */}
                  <CheckInPanel
                    participation={participation}
                    onCheckIn={handleCheckIn}
                    onStartSprint={handleStartSprint}
                    autoOpenLog={sprintReturn}
                  />

                  {/* Emotional streak + total output */}
                  <MyStats participation={participation} />

                  {/* Update goal / leave — compact action bar */}
                  <GoalActionsBar
                    participation={participation}
                    onUpdated={p => setParticipation(prev => ({ ...prev, ...p }))}
                    onLeave={handleLeave}
                  />

                  {/* Encouragement quote */}
                  <QuoteBanner />

                  {/* Invite a friend */}
                  <InviteCard />
                </>
              )}
            </div>

            {/* RIGHT — community */}
            <div>
              <CommunityStats stats={stats} />
            </div>

          </div>
        )}
      </div>

      {celebration && (
        <CelebrationModal
          result={celebration}
          onClose={() => setCelebration(null)}
        />
      )}

      {/* Sprint modal — opens inline; workspace navigates back here when timer ends */}
      {showSprintModal && (
        <StartGroupSprintModal
          isOpen={showSprintModal}
          onClose={() => setShowSprintModal(false)}
          onCreated={handleSprintCreated}
        />
      )}
    </div>
  );
}