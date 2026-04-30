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
import LastGroupSprintRecap from "./components/sprint/lastgroupsprintrecap";
import API_URL from "./config/api";

// ─── UPDATE THIS WEEKLY ────────────────────────────────────────
// Discord invite links expire. Replace this value each week.
const DISCORD_INVITE_LINK = "https://discord.gg/TntmfbkxB";
// ──────────────────────────────────────────────────────────────

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

// ─── Color constants ──────────────────────────────────────────
const OVERALL_BLUE    = "#2563eb";
const TODAY_ORANGE    = "#ea580c";
const TODAY_TRACK     = "#ffedd5";
const SESSION_PURPLE  = "#7c3aed";
const STREAK_GOLD     = "#d4af37";
const DONE_GREEN      = "#16a34a";

function overallColor(pct) { return pct >= 100 ? DONE_GREEN : OVERALL_BLUE; }

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

function CheckMark({ color = DONE_GREEN }) {
  return (
    <svg width="18" height="18" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── Today Goal Arc Row ───────────────────────────────────────
function TodayArcRow({ todayCount = 0, dailyTarget = 0, label = "words" }) {
  const pct = dailyTarget > 0 ? Math.min(Math.round((todayCount / dailyTarget) * 100), 100) : 0;
  const done = pct >= 100;
  const started = todayCount > 0;
  const remaining = Math.max(0, dailyTarget - todayCount);
  const arcColor = done ? DONE_GREEN : TODAY_ORANGE;
  const arcTrack = done ? "#dcfce7" : TODAY_TRACK;

  return (
    <div className="flex items-center gap-4">
      <ArcProgress percent={pct} size={72} color={arcColor} trackColor={arcTrack} strokeW={7}>
        {done
          ? <CheckMark />
          : <>
              <span className="font-serif font-bold leading-none text-[#2d3748]" style={{ fontSize: 14 }}>{fmt(todayCount)}</span>
              <span className="text-[#9a8c7a] leading-none mt-0.5" style={{ fontSize: 8 }}>of {fmt(dailyTarget)}</span>
            </>}
      </ArcProgress>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: arcColor }}>{label}</p>
        {done
          ? <p className="text-sm font-semibold text-[#2d3748]">Goal done</p>
          : started
          ? <>
              <p className="text-sm font-semibold text-[#2d3748]">{fmt(remaining)} to go</p>
              <p className="text-[11px] text-[#9a8c7a] mt-0.5">{pct}% of today's goal</p>
            </>
          : <>
              <p className="text-sm font-semibold text-[#2d3748]">Start writing</p>
              <p className="text-[11px] text-[#9a8c7a] mt-0.5">{fmt(dailyTarget)} {label} goal</p>
            </>}
      </div>
    </div>
  );
}

// ─── Session Arc Row ──────────────────────────────────────────
function SessionArcRow({ current = 0, target = 0, period = "WEEKLY", sessionsToday = 0 }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const done = pct >= 100;
  const remaining = Math.max(0, target - current);
  const arcColor = done ? DONE_GREEN : current > 0 ? SESSION_PURPLE : "#9a8c7a";
  const arcTrack = done ? "#dcfce7" : current > 0 ? "#ede9d8" : "#ede9e3";
  const periodLabel = period === "WEEKLY" ? "this week" : "this month";

  return (
    <div className="flex items-center gap-4">
      <ArcProgress percent={pct} size={72} color={arcColor} trackColor={arcTrack} strokeW={7}>
        {done
          ? <CheckMark color={DONE_GREEN} />
          : <>
              <span className="font-serif font-bold leading-none text-[#2d3748]" style={{ fontSize: 14 }}>{current}</span>
              <span className="text-[#9a8c7a] leading-none mt-0.5" style={{ fontSize: 8 }}>of {target}</span>
            </>}
      </ArcProgress>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: arcColor }}>
          Sessions · {period.toLowerCase()}
        </p>
        {done
          ? <p className="text-sm font-semibold text-[#2d3748]">Period goal complete</p>
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
          <p className="text-[11px] mt-0.5 font-semibold" style={{ color: SESSION_PURPLE }}>{sessionsToday} today</p>
        )}
      </div>
    </div>
  );
}

// ─── Overall Arc Row (blue) ───────────────────────────────────
function OverallArcRow({ percent, label, line1, line2, color }) {
  const arcColor = color ?? overallColor(percent);
  return (
    <div className="flex items-center gap-4">
      <ArcProgress percent={percent} size={72} color={arcColor} trackColor={percent >= 100 ? "#dcfce7" : "#ede9e3"} strokeW={7}>
        {percent >= 100
          ? <CheckMark color={DONE_GREEN} />
          : <span className="font-serif font-bold text-[#2d3748]" style={{ fontSize: 14 }}>{percent}%</span>}
      </ArcProgress>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: arcColor }}>{label}</p>
        <p className="text-sm font-semibold text-[#2d3748]">{line1}</p>
        {line2 && <p className="text-[11px] text-[#9a8c7a] mt-0.5">{line2}</p>}
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

// ─── Inline Project Stats ─────────────────────────────────────
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
  const hasDaysTarget = !!project.consecutiveDaysTarget;
  const currentStreak = project.currentStreak ?? 0;
  const daysTarget    = project.consecutiveDaysTarget ?? 0;

  const hasTodayGoals = wc?.dailyTarget || ch?.dailyTarget || sc?.dailyTarget || ss || hasDaysTarget;
  const hasOverall    = wc || ch || sc || ss || hasDaysTarget;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-0.5">Writing now</p>
          <h3 className="font-serif text-lg text-[#2d3748] leading-snug truncate">{project.title}</h3>
          {project.genre && <p className="text-[11px] text-[#9a8c7a]">{project.genre}</p>}
        </div>
        <button onClick={() => navigate(`/projects/${project.id}`)}
          className="text-[11px] text-[#2563eb] hover:text-[#1d4ed8] font-semibold transition-colors whitespace-nowrap flex-shrink-0 mt-1 underline-offset-2 hover:underline">
          Full stats
        </button>
      </div>

      {hasTodayGoals && (
        <div>
          <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-4">Today's goal</p>
          <div className="flex flex-col gap-4">
            {wc?.dailyTarget && (
              <TodayArcRow todayCount={todayTotals?.wordsToday || 0} dailyTarget={wc.dailyTarget} label="words" />
            )}
            {ch?.dailyTarget && (
              <TodayArcRow todayCount={todayTotals?.chaptersToday || 0} dailyTarget={ch.dailyTarget} label="chapters" />
            )}
            {sc?.dailyTarget && (
              <TodayArcRow todayCount={todayTotals?.scenesToday || 0} dailyTarget={sc.dailyTarget} label="scenes" />
            )}
            {ss && (
              <SessionArcRow
                current={ss.current}
                target={ss.target}
                period={ss.period}
                sessionsToday={todayTotals?.sessionsToday || 0}
              />
            )}
          </div>
        </div>
      )}

      {hasOverall && (
        <div>
          <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-4">Overall progress</p>
          <div className="flex flex-col gap-4">
            {wc && (
              <OverallArcRow
                percent={wc.percent}
                label="Words"
                line1={`${fmt(wc.current)} written`}
                line2={`${fmt(wc.remaining)} to go`}
              />
            )}
            {ch && (
              <OverallArcRow
                percent={ch.percent}
                label="Chapters"
                line1={`${ch.current} of ${ch.target} done`}
                line2={`${ch.remaining} left`}
              />
            )}
            {sc && (
              <OverallArcRow
                percent={sc.percent}
                label="Scenes"
                line1={`${sc.current} of ${sc.target} done`}
                line2={`${sc.remaining} left`}
              />
            )}
            {hasDaysTarget && (
              <OverallArcRow
                percent={daysTarget > 0 ? Math.min(Math.round((currentStreak / daysTarget) * 100), 100) : 0}
                label="Day Streak"
                line1={`${currentStreak} / ${daysTarget} days`}
                line2={`${Math.max(0, daysTarget - currentStreak)} to go`}
                color={STREAK_GOLD}
              />
            )}
            {daysLeft !== null && (
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-[72px] flex items-center justify-center">
                  <div className="text-center">
                    <p className="font-serif font-bold leading-none text-[#2d3748]" style={{ fontSize: 22 }}>
                      {daysLeft === 0 ? "Due!" : daysLeft}
                    </p>
                    {daysLeft > 0 && <p className="text-[9px] text-[#9a8c7a] uppercase tracking-wider mt-0.5">days left</p>}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: daysLeft === 0 ? "#ef4444" : daysLeft <= 7 ? "#c47d1e" : "#9a8c7a" }}>
                    Deadline
                  </p>
                  <p className="text-sm font-semibold text-[#2d3748]">
                    {daysLeft === 0 ? "Past due" : `${daysLeft} days left`}
                  </p>
                  {project.deadline && (
                    <p className="text-[11px] text-[#9a8c7a] mt-0.5">
                      {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
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

// ─── Community Events Carousel ─────────────────────────────────
const COMMUNITY_EVENTS = [
  {
    id: "reading-sprint",
    tag: "Reading Sprint",
    tagColor: "#d4af37",
    title: "Story Genius",
    dates: "April 22 – May 20",
    schedule: "Every Wednesday on Discord",
    status: "Happening now",
    statusColor: "#4ade80",
    description: "Every Wednesday we read Story Genius together — a craft book that teaches writers how to build stories from the inside out. Read alongside the community, share reflections, and sharpen your instincts as a writer.",
    bg: "linear-gradient(135deg, #1a2218 0%, #1e3a2e 50%, #2d3748 100%)",
  },
  {
    id: "5day-sprint",
    tag: "Writing Challenge",
    tagColor: "#a78bfa",
    title: "Five Days of Writing",
    dates: "Date coming soon",
    schedule: "5 consecutive days on Discord",
    status: "Coming soon",
    statusColor: "#a78bfa",
    description: "Five days straight. We show up together and write using the Inkwell quiet sprint room. A challenge for writers who want to break through resistance and build real momentum.",
    bg: "linear-gradient(135deg, #1a1225 0%, #2d2048 60%, #2d3748 100%)",
  },
];

function CommunityEventsCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive(i => (i + 1) % COMMUNITY_EVENTS.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  const ev = COMMUNITY_EVENTS[active];

  return (
    <section className="mb-12">
      <SectionLabel>Community events</SectionLabel>
      <div
        className="relative rounded-3xl overflow-hidden cursor-pointer"
        style={{ background: ev.bg, transition: "background 0.7s ease", minHeight: 200 }}
        onClick={() => setPaused(p => !p)}
        title={paused ? "Click to resume" : "Click to pause"}
      >
        {/* texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 14px)" }} />

        <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ev.statusColor, boxShadow: `0 0 7px ${ev.statusColor}` }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: ev.tagColor }}>{ev.tag}</span>
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">{ev.status}</span>
            </div>
            <h3 className="font-serif text-white text-2xl sm:text-3xl leading-tight mb-2">{ev.title}</h3>
            <p className="text-white/65 text-sm leading-relaxed max-w-lg mb-4">{ev.description}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[12px] text-white/45">{ev.dates}</span>
              <span className="w-1 h-1 rounded-full bg-white/25 flex-shrink-0" />
              <span className="text-[12px] text-white/45">{ev.schedule}</span>
            </div>
          </div>

          {/* Dots + pause hint */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              {COMMUNITY_EVENTS.map((e, i) => (
                <button
                  key={e.id}
                  onClick={(ev) => { ev.stopPropagation(); setActive(i); setPaused(true); }}
                  aria-label={`Go to event ${i + 1}`}
                  className="focus:outline-none transition-all"
                  style={{
                    width: i === active ? 22 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === active ? ev.tagColor : "rgba(255,255,255,0.2)",
                    transition: "all 0.35s ease",
                  }}
                />
              ))}
            </div>
            <p className="text-[10px] text-white/25 uppercase tracking-widest">
              {paused ? "Paused — click to resume" : "Click card to pause"}
            </p>
          </div>
        </div>
      </div>
    </section>
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

// ─────────────────────────────────────────────────────────────────
// UPDATED CommunitySchedule — shows 4pm UTC + user's local time
// Replace the existing CommunitySchedule function in App.jsx
// ─────────────────────────────────────────────────────────────────

// Helper: build a display string like "4:00 PM UTC  ·  5:00 PM WAT"
function buildTimeLabel(utcHour24) {
  // UTC label
  const pad = (n) => String(n).padStart(2, "0");
  const utcAmPm = utcHour24 >= 12 ? "PM" : "AM";
  const utcH = utcHour24 % 12 || 12;
  const utcLabel = `${utcH}:00 ${utcAmPm} UTC`;

  // Local label
  const now = new Date();
  const localDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour24)
  );
  const localLabel = localDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  if (localLabel === utcLabel) return utcLabel;
  return `${utcLabel}  ·  ${localLabel}`;
}

const COMMUNITY_SCHEDULE_DATA = [
  { day: "Wednesday", utcHour: 16, label: "Reading Sprint",  note: "Read Story Genius together to improve your craft" },
  { day: "Friday",    utcHour: 16, label: "Writing Sprint",  note: "Come together and write using the Inkwell quiet sprint room" },
  { day: "Saturday",  utcHour: 16, label: "Writing Sprint",  note: "Come together and write using the Inkwell quiet sprint room" },
];

export function CommunitySchedule({ discordInviteLink }) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const today = days[new Date().getDay()];

  return (
    <section
      className="rounded-3xl border border-[#e8e0d0] overflow-hidden mb-12"
      style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 10px 30px rgba(45,35,20,0.06)" }}
    >
      {/* Header */}
      <div className="bg-[#2d3748] px-6 sm:px-8 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold mb-1">
              Weekly sessions
            </p>
            <h2 className="font-serif text-white text-lg leading-snug">When we write together</h2>
          </div>
          <a
            href={discordInviteLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-[12px] font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ boxShadow: "0 2px 8px rgba(88,101,242,0.4)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            Join Discord
          </a>
        </div>
      </div>

      {/* Schedule rows */}
      <div className="bg-white divide-y divide-[#f0ebe3]">
        {COMMUNITY_SCHEDULE_DATA.map((session) => {
          const isToday = session.day === today;
          const timeLabel = buildTimeLabel(session.utcHour);

          return (
            <div
              key={session.day}
              className="flex items-center gap-4 px-6 sm:px-8 py-4 transition-colors"
              style={{ background: isToday ? "#fffdf8" : "transparent" }}
            >
              {/* Day */}
              <div className="flex-shrink-0 w-28">
                <p className="text-[11px] font-semibold text-[#2d3748]">{session.day}</p>
                {isToday && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#be185d]">
                    Today
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#2d3748] leading-tight">
                  {session.label}
                </p>
                <p className="text-[11px] text-[#9a8c7a] mt-0.5">{session.note}</p>
                {/* Time — UTC + local side by side */}
                <p className="text-[10px] text-[#b8a898] mt-1 font-medium tracking-wide">
                  {timeLabel}
                </p>
              </div>

              {/* Today pulse */}
              {isToday && (
                <div className="flex-shrink-0">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#be185d] animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-[#faf7f2] border-t border-[#e8e0d0] px-6 sm:px-8 py-5">
        <p className="text-[12px] text-[#6b5c4a] leading-relaxed text-center max-w-md mx-auto">
          All sessions are held in our Discord server. Writers gather, sprint together, and hold each other accountable in real time.
        </p>
        <div className="mt-3 flex justify-center">
          <a
            href={discordInviteLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-[#5865f2] hover:text-[#4752c4] transition-colors underline underline-offset-2"
          >
            Meet the writers — join Discord
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Discord Community Banner ──────────────────────────────────
// Shown on the homepage to invite guests and members to join
function DiscordBanner() {
  return (
    <section
      className="rounded-3xl border border-[#e8e0d0] overflow-hidden mb-12"
      style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}
    >
      <div
        className="relative px-6 sm:px-10 py-8 sm:py-10"
        style={{ background: "linear-gradient(135deg, #1e2235 0%, #2d3748 60%, #3b4a6b 100%)" }}
      >
        {/* Subtle texture lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 12px)"
        }} />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-2">Writing community</p>
            <h2 className="font-serif text-white text-xl sm:text-2xl leading-snug mb-3">
              Writing is solitary.<br />Accountability doesn't have to be.
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-md">
              Join writers on Discord who show up every week, share their word counts, cheer each other on, and refuse to give up on their stories.
            </p>
            <ul className="mt-4 space-y-1.5">
              {[
                "Weekly group sprints with real writers",
                "Daily check-ins to keep your streak alive",
                "A place to share wins and stay honest",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#d4af37] mt-1.5 flex-shrink-0" />
                  <span className="text-[12px] text-white/65 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            {/* UPDATE THIS LINK WEEKLY — Discord links expire */}
            <a
              href={DISCORD_INVITE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold text-sm px-6 py-3 rounded-2xl transition-all"
              style={{ boxShadow: "0 4px 16px rgba(88,101,242,0.5)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Join the community
            </a>
            <p className="text-[10px] text-white/30 text-center">Free to join · Writers only</p>
          </div>
        </div>
      </div>
    </section>
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
        <LastGroupSprintRecap /> 
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

        {/* Weekly schedule — when community sprints happen */}
        <section className="mb-10"><WeeklySchedule /></section>

        {/* Community sprint times + Discord link */}
        <CommunitySchedule />

        {/* Community projects — habit tracking and progress tracking separated */}
        <section className="mb-12"><CommunityProjects /></section>

        <section className="mb-12"><ContributeSoundscape /></section>

        {/* Discord community banner */}
        <DiscordBanner />

        {/* Community events — reading & writing challenges */}
        <CommunityEventsCarousel />

        {!user && (
          <section
            className="rounded-3xl border border-[#e8e0d0] overflow-hidden mb-12"
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}
          >
            <div
              className="relative px-6 sm:px-10 py-8 sm:py-10"
              style={{ background: "linear-gradient(135deg, #1e2235 0%, #2d3748 60%, #3b4a6b 100%)" }}
            >
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 12px)"
              }} />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-8">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-2">Writing community</p>
                  <h2 className="font-serif text-white text-xl sm:text-2xl leading-snug mb-3">
                    Writing is solitary.<br />Accountability doesn't have to be.
                  </h2>
                  <p className="text-white/60 text-sm leading-relaxed max-w-md">
                    Join writers on Discord who show up every week, share their word counts, cheer each other on, and refuse to give up on their stories.
                  </p>
                  <ul className="mt-4 space-y-1.5">
                    {[
                      "Weekly reading and writing sprints with real writers",
                      "Daily check-ins to keep your streak alive",
                      "A place to share wins and stay honest",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-[#d4af37] mt-1.5 flex-shrink-0" />
                        <span className="text-[12px] text-white/65 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-shrink-0 flex flex-col items-center gap-3 w-full sm:w-auto">
                  <a
                    href={DISCORD_INVITE_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold text-sm px-7 py-3 rounded-2xl transition-all"
                    style={{ boxShadow: "0 4px 16px rgba(88,101,242,0.5)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                    Join the community
                  </a>
                  <p className="text-[10px] text-white/30 text-center">Free to join · Writers only</p>
                  <div className="mt-1 flex flex-col gap-2 w-full">
                    <button
                      onClick={() => navigate("/signup")}
                      className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-all border border-white/10"
                    >
                      Create a free account
                    </button>
                    <button
                      onClick={() => navigate("/login")}
                      className="w-full py-2.5 text-white/40 hover:text-white/60 text-sm transition-colors"
                    >
                      Sign in
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

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