import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./components/auth/authContext";
import Header from "./components/profile/header";
import { AppMetaTags } from "./components/utilis/metatags";
import { StartGroupSprintModal, JoinGroupSprintModal } from "./components/sprint/groupSprintModal";
import DailyQuote from "./components/quote/dailyQuote";
import NotificationsSetup from "./components/notification/notificationSetup";
import WeeklySchedule from "./components/sprint/weeklyschedule";
import ContributeSoundscape from "./components/sprint/Contributesoundscape";
import CommunityProjects from "./components/projects/communityprojects";
import API_URL from "./config/api";

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24)));
}
function fmt(n) { return (n ?? 0).toLocaleString(); }

// ─── Progress color: blue in-progress, green when done ────────
function progressColor(percent) {
  return percent >= 100 ? "#16a34a" : "#2563eb";
}

// ─── Daily Target Ring ────────────────────────────────────────
function DailyTargetRing({ todayCount = 0, dailyTarget = 0, size = 90, label = "words", daysLeft = null }) {
  const pct = dailyTarget > 0 ? Math.min(Math.round((todayCount / dailyTarget) * 100), 100) : 0;
  const done = pct >= 100;
  const started = todayCount > 0;
  const strokeW = 7;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const ringColor = done ? "#16a34a" : started ? "#ea580c" : "#d6d0c8";
  const remaining = Math.max(0, dailyTarget - todayCount);
  const weeklyNeeded = daysLeft && dailyTarget
    ? `~${((dailyTarget * 7) / (label === "words" ? 1000 : 1)).toFixed(label === "words" ? 1 : 0)}${label === "words" ? "k" : ""} ${label}/week`
    : null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ede9e3" strokeWidth={strokeW} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={strokeW}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              transform={`rotate(-90 ${size/2} ${size/2})`}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1), stroke 0.5s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
            {done ? (
              <svg className="w-6 h-6" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <>
                <span className="font-serif font-bold leading-none text-[#2d3748]" style={{ fontSize: size * 0.2 }}>{fmt(todayCount)}</span>
                <span className="text-[#9a8c7a] leading-none mt-0.5" style={{ fontSize: 10 }}>of {fmt(dailyTarget)}</span>
                <span className="text-[#9a8c7a] leading-none" style={{ fontSize: 10 }}>{label}</span>
              </>
            )}
          </div>
        </div>
        {daysLeft !== null && (
          <>
            <div className="hidden sm:block flex-shrink-0" style={{ width: "0.5px", height: 52, background: "#e8e0d0" }} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold">Deadline</span>
              <span className="font-serif text-[#2d3748] leading-none" style={{ fontSize: 24, fontWeight: 500 }}>
                {daysLeft === 0 ? "Today" : daysLeft}
              </span>
              {daysLeft > 0 && <span className="text-[11px] text-[#9a8c7a] uppercase tracking-wider">days left</span>}
              {weeklyNeeded && <span className="text-[11px] text-[#b8a898] mt-1">{weeklyNeeded}</span>}
            </div>
          </>
        )}
      </div>
      <div className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3" style={{ background: "#faf7f2" }}>
        <p className="text-[13px] text-[#6b5c4a] leading-relaxed m-0">
          {done
            ? <><strong style={{ color: "#2d3748" }}>Goal complete!</strong> You showed up today. That's what it takes.</>
            : started
            ? <><strong style={{ color: "#2d3748" }}>{fmt(remaining)} {label}</strong> to go — you're already in motion.</>
            : <>You haven't written today. <strong style={{ color: "#2d3748" }}>{fmt(dailyTarget)} {label}</strong> is today's goal.</>
          }
        </p>
      </div>
    </div>
  );
}

// ─── Thin Progress Bar — blue, turns green when full ──────────
function ThinBar({ current, target, color: overrideColor }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const color = overrideColor ?? progressColor(pct);
  return (
    <div className="w-full h-1.5 bg-[#ede9e3] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── Dot Grid — blue squares, turn green when complete ────────
function DotGrid({ current, target, label, color: overrideColor }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const color = overrideColor ?? progressColor(pct);
  const cols = 10; const rows = 3; const total = cols * rows;
  const filled = Math.round((pct / 100) * total);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#6b5c4a] uppercase tracking-wider">{label}</span>
        <span className="text-[11px] text-[#9a8c7a]">{fmt(current)} / {fmt(target)}</span>
      </div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            aspectRatio: "1", borderRadius: 3,
            backgroundColor: i < filled ? color : "#e8e3dc",
            opacity: i < filled ? 1 : 0.5,
            transition: `background-color 0.3s ease ${i * 8}ms`,
          }} />
        ))}
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] font-medium" style={{ color }}>{pct}% done</span>
        <span className="text-[10px] text-[#b8a898]">{fmt(Math.max(0, target - current))} left</span>
      </div>
    </div>
  );
}

// ─── Session Ring — period goal on the homepage card ──────────
function SessionRing({ current = 0, target = 0, period = "WEEKLY", sessionsToday = 0, size = 90 }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const done = pct >= 100;
  const strokeW = 7;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const ringColor = done ? "#16a34a" : current > 0 ? "#7c3aed" : "#d6d0c8";
  const remaining = Math.max(0, target - current);
  const periodLabel = period === "WEEKLY" ? "this week" : "this month";

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ede9e3" strokeWidth={strokeW} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={strokeW}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              transform={`rotate(-90 ${size/2} ${size/2})`}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1), stroke 0.5s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
            {done ? (
              <svg className="w-6 h-6" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <>
                <span className="font-serif font-bold leading-none text-[#2d3748]" style={{ fontSize: size * 0.2 }}>{current}</span>
                <span className="text-[#9a8c7a] leading-none mt-0.5" style={{ fontSize: 10 }}>of {target}</span>
                <span className="text-[#9a8c7a] leading-none" style={{ fontSize: 10 }}>sessions</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold">{period === "WEEKLY" ? "Weekly" : "Monthly"} goal</span>
          <span className="font-serif text-[#2d3748] leading-none" style={{ fontSize: 24, fontWeight: 500 }}>{pct}%</span>
          <span className="text-[11px] text-[#9a8c7a] uppercase tracking-wider">complete</span>
          {sessionsToday > 0 && (
            <span className="text-[11px] mt-1 font-semibold" style={{ color: "#7c3aed" }}>{sessionsToday} today</span>
          )}
        </div>
      </div>
      <div className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3" style={{ background: "#faf7f2" }}>
        <p className="text-[13px] text-[#6b5c4a] leading-relaxed m-0">
          {done
            ? <><strong style={{ color: "#2d3748" }}>Period goal complete!</strong> You showed up. That's what it takes.</>
            : remaining > 0
            ? <><strong style={{ color: "#2d3748" }}>{remaining} session{remaining !== 1 ? "s" : ""}</strong> to go {periodLabel} — keep going.</>
            : <>No sessions logged yet. <strong style={{ color: "#2d3748" }}>{target} sessions</strong> is the {periodLabel} goal.</>
          }
        </p>
      </div>
    </div>
  );
}

// ─── Alarm Clock ──────────────────────────────────────────────
function AlarmClockSprint({ onClick }) {
  const [tick, setTick] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setTick(p => !p), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-3 focus:outline-none" aria-label="Start a sprint">
      <div className="relative">
        <div className="absolute -top-2.5 left-1/2 flex gap-2.5"
          style={{ transform: `translateX(-50%) rotate(${tick ? -10 : 10}deg)`, transition: "transform 0.45s ease" }}>
          <div className="w-2 h-2 bg-[#d4af37] rounded-full" />
          <div className="w-2 h-2 bg-[#d4af37] rounded-full" />
        </div>
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-[3.5px] border-[#2d3748] bg-[#fffdf8] flex items-center justify-center"
          style={{
            boxShadow: tick
              ? "0 0 0 0 rgba(212,175,55,0), 0 6px 20px rgba(45,55,72,0.15)"
              : "0 0 0 8px rgba(212,175,55,0.13), 0 6px 20px rgba(45,55,72,0.2)",
            transition: "box-shadow 0.9s ease"
          }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute" style={{
              width: i % 3 === 0 ? 2.5 : 1.5, height: i % 3 === 0 ? 9 : 5,
              background: i % 3 === 0 ? "#2d3748" : "#c4bcb0", borderRadius: 1,
              top: "6%", left: "50%",
              transformOrigin: `50% ${0.94 * 64}px`,
              transform: `translateX(-50%) rotate(${i * 30}deg)`,
            }} />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-[2px] h-7 bg-[#2d3748] rounded-full origin-bottom" style={{ bottom: "50%", left: "calc(50% - 1px)", transform: "rotate(-30deg)" }} />
            <div className="absolute w-[1.5px] h-[33px] bg-[#2d3748] rounded-full origin-bottom" style={{ bottom: "50%", left: "calc(50% - 0.75px)", transform: "rotate(60deg)" }} />
            <div className="absolute w-2.5 h-2.5 bg-[#d4af37] rounded-full z-10" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="mt-7 text-center">
              <p className="text-[8px] text-[#9a8c7a] uppercase tracking-widest">tap to</p>
              <p className="font-serif font-bold text-[#2d3748] text-[13px] leading-tight">Start Sprint</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between px-5 -mt-0.5">
          <div className="w-3.5 h-2 bg-[#2d3748] rounded-b-full" />
          <div className="w-3.5 h-2 bg-[#2d3748] rounded-b-full" />
        </div>
      </div>
      <p className="text-[11px] text-[#9a8c7a] text-center leading-relaxed">Focused session<br/>to hit your goal</p>
    </button>
  );
}

// ─── Inline Project Stats ──────────────────────────────────────
function RecentProjectCardInline() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/projects/recentProject`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="animate-pulse space-y-3 w-full">
      <div className="h-4 bg-[#e8e0d0] rounded w-1/2" />
      <div className="h-16 bg-[#e8e0d0] rounded-2xl" />
      <div className="h-3 bg-[#e8e0d0] rounded w-2/3" />
    </div>
  );

  if (!data?.project) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-4 py-2 w-full">
        <div>
          <p className="font-serif text-[17px] text-[#2d3748] mb-1">What are you writing?</p>
          <p className="text-xs text-[#9a8c7a] leading-relaxed max-w-[220px] mx-auto">Add a project to get a clear daily writing goal and watch your progress grow.</p>
        </div>
        <button onClick={() => navigate("/projects/create")}
          className="relative inline-flex items-center gap-2 px-5 py-2.5 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all">
          Add your project
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#d4af37] rounded-full animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#d4af37] rounded-full" />
        </button>
      </div>
    );
  }

  const { project, trackerSummary, todayTotals } = data;
  const wc = trackerSummary?.wordCount;
  const ch = trackerSummary?.chapters;
  const sc = trackerSummary?.scenes;
  const ss = trackerSummary?.sessions;
  const daysLeft = daysUntil(project.deadline);

  return (
    <div className="w-full space-y-5">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-0.5">Writing now</p>
          <h3 className="font-serif text-lg text-[#2d3748] leading-snug truncate">{project.title}</h3>
          {project.genre && <p className="text-[11px] text-[#9a8c7a]">{project.genre}</p>}
        </div>
        <button onClick={() => navigate(`/projects/${project.id}`)}
          className="text-[11px] text-[#2563eb] hover:text-[#1d4ed8] font-semibold transition-colors whitespace-nowrap flex-shrink-0 mt-1 underline-offset-2 hover:underline">
          Full stats →
        </button>
      </div>

      {/* Daily target rings — writing goals */}
      {(wc?.dailyTarget || ch?.dailyTarget || sc?.dailyTarget) && (
        <div>
          <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-4">Today's goal</p>
          <div className="flex flex-col gap-6">
            {wc?.dailyTarget && <DailyTargetRing todayCount={todayTotals?.wordsToday || 0} dailyTarget={wc.dailyTarget} label="words" daysLeft={daysLeft} />}
            {ch?.dailyTarget && <DailyTargetRing todayCount={todayTotals?.chaptersToday || 0} dailyTarget={ch.dailyTarget} label="chapters" daysLeft={daysLeft} />}
            {sc?.dailyTarget && <DailyTargetRing todayCount={todayTotals?.scenesToday || 0} dailyTarget={sc.dailyTarget} label="scenes" daysLeft={daysLeft} />}
          </div>
        </div>
      )}

      {/* Session goal ring — shown when writer tracks sessions */}
      {ss && (
        <div>
          <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-4">Session goal</p>
          <SessionRing
            current={ss.current}
            target={ss.target}
            period={ss.period}
            sessionsToday={todayTotals?.sessionsToday || 0}
          />
        </div>
      )}

      {/* Long-term progress bars */}
      {(wc || ch || sc || ss) && (
        <div className="space-y-3">
          <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold">Long-term progress</p>
          {wc && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[11px] font-semibold text-[#6b5c4a] uppercase tracking-wider">Words</span>
                <span className="text-[11px] text-[#9a8c7a]">{fmt(wc.current)} / {fmt(wc.target)}</span>
              </div>
              <ThinBar current={wc.current} target={wc.target} />
              <p className="text-[10px]" style={{ color: progressColor(wc.percent) }}>{wc.percent}% · {fmt(wc.remaining)} remaining</p>
            </div>
          )}
          {ch && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[11px] font-semibold text-[#6b5c4a] uppercase tracking-wider">Chapters</span>
                <span className="text-[11px] text-[#9a8c7a]">{ch.current} / {ch.target}</span>
              </div>
              <ThinBar current={ch.current} target={ch.target} />
              <p className="text-[10px]" style={{ color: progressColor(ch.percent) }}>{ch.percent}% · {ch.remaining} remaining</p>
            </div>
          )}
          {sc && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[11px] font-semibold text-[#6b5c4a] uppercase tracking-wider">Scenes</span>
                <span className="text-[11px] text-[#9a8c7a]">{sc.current} / {sc.target}</span>
              </div>
              <ThinBar current={sc.current} target={sc.target} />
              <p className="text-[10px]" style={{ color: progressColor(sc.percent) }}>{sc.percent}% · {sc.remaining} remaining</p>
            </div>
          )}
          {ss && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[11px] font-semibold text-[#6b5c4a] uppercase tracking-wider" style={{ color: "#7c3aed" }}>
                  Sessions <span className="font-normal text-[#9a8c7a] normal-case">({ss.period.toLowerCase()})</span>
                </span>
                <span className="text-[11px] text-[#9a8c7a]">{ss.current} / {ss.target}</span>
              </div>
              <ThinBar current={ss.current} target={ss.target} color="#7c3aed" />
              <p className="text-[10px]" style={{ color: "#7c3aed" }}>{ss.percent}% · {ss.remaining} remaining</p>
            </div>
          )}
        </div>
      )}

      {/* Dot grids */}
      {(wc || ch || sc || ss) && (
        <div className="space-y-4 pt-1 border-t border-[#f0ebe3]">
          {wc && <DotGrid current={wc.current} target={wc.target} label="Words" />}
          {ch && <DotGrid current={ch.current} target={ch.target} label="Chapters" />}
          {sc && <DotGrid current={sc.current} target={sc.target} label="Scenes" />}
          {ss && <DotGrid current={ss.current} target={ss.target} label={`Sessions (${ss.period.toLowerCase()})`} color="#7c3aed" />}
        </div>
      )}
    </div>
  );
}

// ─── Active Sprints Banner ─────────────────────────────────────
function ActiveSprintsBanner({ onJoinClick }) {
  const [sprints, setSprints] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/sprint/activeGroupSprints?limit=5`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setSprints(d?.groupSprints || []))
      .catch(() => {});
  }, []);

  if (!sprints.length) return null;

  function handleJoinClick(sprint) {
    if (!user) { onJoinClick?.(null); return; }
    const alreadyJoined = sprint.sprints?.some(
      (s) => Number(s.userId) === Number(user.id) && s.isActive !== false
    );
    if (alreadyJoined) { navigate(`/group-sprint/${sprint.id}`); return; }
    onJoinClick?.(sprint);
  }

  return (
    <div className="bg-[#2d3748] rounded-2xl px-4 sm:px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]" />
        </span>
        <p className="text-[11px] text-white/60 font-semibold uppercase tracking-widest">Sprints happening now</p>
      </div>
      <div className="space-y-2">
        {sprints.slice(0, 3).map(sprint => {
          const alreadyJoined = user && sprint.sprints?.some(
            (s) => Number(s.userId) === Number(user.id) && s.isActive !== false
          );
          const typeLabel = sprint.sprintType === "READING" ? "Reading" : "Writing";
          const writerCount = sprint._count?.sprints || 1;
          return (
            <div key={sprint.id}
              className="flex items-center justify-between bg-white/[0.07] hover:bg-white/[0.12] rounded-xl px-3.5 py-2.5 cursor-pointer transition-all"
              onClick={() => handleJoinClick(sprint)}>
              <div className="min-w-0 flex-1 mr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-white font-medium truncate">@{sprint.user?.username}'s sprint</p>
                  <span className="text-[10px] text-white/40 bg-white/10 px-1.5 py-0.5 rounded-full flex-shrink-0">{typeLabel}</span>
                </div>
                <p className="text-[11px] text-white/45 mt-0.5">
                  {writerCount} writer{writerCount !== 1 ? "s" : ""} · {sprint.duration} min
                </p>
              </div>
              <span className={`text-xs border px-2.5 py-1 rounded-full transition-all flex-shrink-0 ${
                alreadyJoined
                  ? "text-emerald-400 border-emerald-400/30"
                  : "text-[#d4af37] border-[#d4af37]/30 hover:bg-[#d4af37]/10"
              }`}>
                {alreadyJoined ? "Continue" : "Join"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Guest Prompt ──────────────────────────────────────────────
function GuestPrompt({ message, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d3748]/50 backdrop-blur-sm">
      <div className="bg-[#fffdf8] rounded-3xl shadow-2xl w-full max-w-sm p-7 sm:p-8 text-center border border-[#e8e0d0]">
        <div className="w-14 h-14 bg-[#fdf3d8] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[#b8962e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <h3 className="font-serif text-[#2d3748] text-xl mb-2">Join Inkwell first</h3>
        <p className="text-sm text-[#6b5c4a] mb-6 leading-relaxed">{message}</p>
        <div className="flex flex-col gap-2.5">
          <button onClick={() => navigate("/signup")} className="w-full py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all">Create a free account</button>
          <button onClick={() => navigate("/login")} className="w-full py-3 border border-[#e8e0d0] text-[#4a4a4a] text-sm font-medium rounded-2xl hover:border-[#2d3748] transition-all bg-white">Sign in</button>
        </div>
        <button onClick={onClose} className="mt-4 text-xs text-[#9a8c7a] hover:text-[#6b5c4a] transition-colors">Maybe later</button>
      </div>
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────
function HeroImage() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: "clamp(280px, 45vw, 520px)" }}>
      <img src="/Gemini_Generated_Image_d6p43ed6p43ed6p4.png" alt="Writers at Inkwell" className="w-full h-full object-cover block" style={{ objectPosition: "center center" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(26,35,51,0.88) 0%, rgba(26,35,51,0.2) 50%, transparent 100%)" }} />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-10 sm:pb-14 px-6 text-center">
        <h1 className="font-serif text-white text-3xl sm:text-5xl leading-tight" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}>
          The Coffee Shop<br />for Writers
        </h1>
        <p className="text-white/75 text-sm sm:text-base mt-3 max-w-sm leading-relaxed" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>
          Pull up a seat. Put on some rain. Write alongside others who show up just like you do.
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-px flex-1 bg-[#e8e0d0]" />
      <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold">{children}</p>
      <div className="h-px flex-1 bg-[#e8e0d0]" />
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────
export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showStartModal, setShowStartModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [guestMessage, setGuestMessage] = useState(null);

  function handleStartClick() {
    if (!user) { setGuestMessage("Sign up to start a sprint — solo or with others."); return; }
    setShowStartModal(true);
  }
  function handleBannerJoinClick() {
    if (!user) { setGuestMessage("Sign up to join a sprint with other writers."); return; }
    setShowJoinModal(true);
  }

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <AppMetaTags title="Inkwell Coffee Shop — Write Together" description="A cosy writing space where writers show up, sprint together and get words on the page." />
      <Header />
      <NotificationsSetup user={user} />
      <HeroImage />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <section className="mb-10"><DailyQuote /></section>
        <div className="mb-10"><ActiveSprintsBanner onJoinClick={handleBannerJoinClick} /></div>

        <section className="mb-12">
          <SectionLabel>Your writing desk</SectionLabel>
          <div className="bg-white rounded-3xl border border-[#e8e0d0] overflow-hidden"
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 10px 30px rgba(45,35,20,0.07)" }}>
            <div className="flex flex-col sm:flex-row min-h-0">
              <div className="sm:w-56 flex-shrink-0 flex flex-col items-center justify-center gap-0 px-6 sm:px-8 py-8 sm:py-9 bg-[#faf7f2] border-b sm:border-b-0 sm:border-r border-[#e8e0d0]">
                <AlarmClockSprint onClick={handleStartClick} />
              </div>
              <div className="flex-1 px-5 py-7 sm:px-8 sm:py-8 min-w-0 overflow-hidden">
                {user
                  ? <RecentProjectCardInline />
                  : (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-4">
                      <p className="font-serif text-lg text-[#2d3748]">Ready to write?</p>
                      <p className="text-sm text-[#9a8c7a] leading-relaxed max-w-xs">Sign up to track your project, get a daily word goal, and never lose momentum again.</p>
                      <button onClick={() => navigate("/signup")} className="px-6 py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all">
                        Start writing with Inkwell
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10"><WeeklySchedule /></section>
        <section className="mb-12"><CommunityProjects /></section> 
        <section className="mb-12"><ContributeSoundscape /></section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-10 lg:items-start">
          <div className="space-y-10">
            {!user && (
              <section className="bg-white rounded-3xl border border-[#e8e0d0] p-6 sm:p-8"
                style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
                <div className="text-center mb-7">
                  <h2 className="font-serif text-2xl text-[#2d3748]">How it works</h2>
                  <div className="w-10 h-[2px] bg-[#d4af37] mx-auto mt-3 rounded-full" />
                </div>
                <div className="space-y-6">
                  {[
                    { title: "Start a room or write solo", desc: "Open a sprint for yourself. No pressure — just set your timer and get words down." },
                    { title: "Track your project", desc: "Add your novel, memoir or script. Get a daily word goal and watch your progress grow." },
                    { title: "Pick your soundscape", desc: "Rain, café hum, birdsong — each writer picks their own ambient sound." },
                    { title: "Log your words, share a snippet", desc: "When the timer ends, record what you wrote and share a line with the community." },
                  ].map((step, idx) => (
                    <div key={step.title} className="flex items-start gap-4">
                      <div className="w-7 h-7 rounded-full bg-[#2d3748] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">{idx + 1}</div>
                      <div>
                        <p className="font-semibold text-[#2d3748] text-sm">{step.title}</p>
                        <p className="text-xs text-[#9a8c7a] mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#f0ebe3]">
                  <button onClick={() => navigate("/signup")} className="flex-1 py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all">Create a free account</button>
                  <button onClick={() => navigate("/login")} className="flex-1 py-3 border border-[#e8e0d0] text-[#4a4a4a] text-sm font-medium rounded-2xl hover:border-[#2d3748] transition-all">Sign in</button>
                </div>
              </section>
            )}
          </div>
          <div className="space-y-6" />
        </div>

        <p className="text-center text-[10px] text-[#c4bdb4] pt-12 tracking-widest uppercase">
          A quiet space for writers · Inkwell
        </p>
      </main>

      <StartGroupSprintModal isOpen={showStartModal} onClose={() => setShowStartModal(false)} onCreated={(s) => navigate(`/group-sprint/${s.id}`)} />
      {showJoinModal && <JoinGroupSprintModal onClose={() => setShowJoinModal(false)} />}
      {guestMessage && <GuestPrompt message={guestMessage} onClose={() => setGuestMessage(null)} />}
    </div>
  );
}