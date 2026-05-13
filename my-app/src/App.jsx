import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./components/auth/authContext";
import Header from "./components/profile/header";
import { AppMetaTags } from "./components/utilis/metatags";
import { StartGroupSprintModal, JoinGroupSprintModal } from "./components/sprint/groupSprintModal";
import DailyEmotion from "./components/emotioncues/dailyemotion";
import NotificationsSetup from "./components/notification/notificationSetup";
import ContributeSoundscape from "./components/sprint/Contributesoundscape";
import CommunityLeaderboard from "./components/leaderBoard/communityLeaderboard";
import ChallengeBlock from "./components/leaderBoard/challengeblock";
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

// ─── Tiny markdown renderer (no deps) ─────────────────────────
function renderMarkdownHTML(text) {
  if (!text) return "";
  const mdInline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.12);padding:1px 4px;border-radius:3px;font-size:0.88em">$1</code>');
  const lines = text.split("\n");
  const out = [];
  let inList = false;
  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<strong style="display:block;margin-bottom:3px">${mdInline(line.replace(/^#+\s/, ""))}</strong>`);
    } else if (/^[-*]\s/.test(line)) {
      if (!inList) { out.push('<ul style="margin:4px 0;padding-left:18px;list-style:disc">'); inList = true; }
      out.push(`<li style="margin-bottom:2px">${mdInline(line.replace(/^[-*]\s/, ""))}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (line.trim() === "") out.push('<br style="display:block;height:4px">');
      else out.push(`<span style="display:block">${mdInline(line)}</span>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

// ─── Hero Carousel ────────────────────────────────────────────
function HeroCarousel() {
  const [events, setEvents] = useState([]);
  const [slide, setSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const totalSlides = 1 + events.length; // mission slide + one per event

  // Fetch live/upcoming events
  useEffect(() => {
    fetch(`${API_URL}/events/active`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const evs = (d?.events || []).slice(0, 3);
        setEvents(evs);
      })
      .catch(() => {});
  }, []);

  // Auto-advance
  useEffect(() => {
    if (totalSlides <= 1) return;
    const t = setInterval(() => goTo((slide + 1) % totalSlides), 6000);
    return () => clearInterval(t);
  }, [slide, totalSlides]);

  function goTo(idx) {
    if (idx === slide || animating) return;
    setAnimating(true);
    setTimeout(() => { setSlide(idx); setAnimating(false); }, 350);
  }

  const typeLabels = {
    DAYS_CHALLENGE: "Writing Challenge",
    WORKSHOP: "Workshop",
    ANNOUNCEMENT: "Announcement",
    OTHER: "Community Event",
  };
  const typeColors = {
    DAYS_CHALLENGE: "#a78bfa",
    WORKSHOP: "#34d399",
    ANNOUNCEMENT: "#60a5fa",
    OTHER: "#d4af37",
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(300px, 46vw, 540px)" }}
    >
      {/* ── Slide 0: Inkwell Mission ── */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: slide === 0 ? 1 : 0, pointerEvents: slide === 0 ? "auto" : "none" }}
      >
        {/* Rich dark background matching homepage dark components */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #0d1320 0%, #141c2e 35%, #1a2540 65%, #1e2d4a 100%)",
          }}
        />
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />
        {/* Warm glow top-left */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-80px", left: "-60px",
            width: "420px", height: "420px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 65%)",
          }}
        />
        {/* Bottom fade to page bg */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(13,19,32,0.55))" }}
        />
        {/* Gold top-border line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent 5%, #d4af37 35%, #d4af37 65%, transparent 95%)" }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p
            className="font-bold uppercase tracking-[0.25em] mb-4"
            style={{ fontSize: 10, color: "#d4af37", letterSpacing: "0.28em" }}
          >
            A Writing Community
          </p>

          <h1
            className="font-serif text-white leading-[1.08] mb-5"
            style={{
              fontSize: "clamp(2rem, 5.5vw, 3.6rem)",
              letterSpacing: "-0.025em",
              maxWidth: 640,
              textShadow: "0 2px 24px rgba(0,0,0,0.5)",
            }}
          >
            Write Together.<br />
            <span style={{ color: "#d4af37" }}>Grow Together.</span>
          </h1>

          <p
            className="text-white leading-relaxed mb-8"
            style={{
              fontSize: "clamp(0.88rem, 1.8vw, 1.05rem)",
              maxWidth: 480,
              opacity: 0.78,
            }}
          >
            Inkwell is where writers trade the isolated journey for a shared one — sprint together, sharpen your craft, and never face a blank page alone again.
          </p>

          {/* Three pillars */}
          <div className="flex items-center gap-6 sm:gap-10 flex-wrap justify-center">
            {[
              { icon: "✦", label: "Write together" },
              { icon: "✦", label: "Improve your craft" },
              { icon: "✦", label: "Finish your draft" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span style={{ color: "#d4af37", fontSize: 8 }}>{icon}</span>
                <span className="text-white font-medium" style={{ fontSize: 12, opacity: 0.85, letterSpacing: "0.01em" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Event Slides ── */}
      {events.map((ev, i) => {
        const idx = i + 1;
        const now = new Date();
        const start = new Date(ev.startDate);
        const end = new Date(ev.endDate);
        const isLive = now >= start && now <= end;
        const isUpcoming = now < start;
        const statusLabel = isLive ? "Happening now" : isUpcoming ? "Coming soon" : "Recently ended";
        const statusColor = isLive ? "#4ade80" : isUpcoming ? "#a78bfa" : "#9a8c7a";
        const tagColor = typeColors[ev.type] || "#d4af37";
        const tagLabel = typeLabels[ev.type] || "Event";

        const formatRange = (s, e) => {
          const opts = { month: "short", day: "numeric" };
          return `${new Date(s).toLocaleDateString("en-US", opts)} – ${new Date(e).toLocaleDateString("en-US", opts)}`;
        };

        return (
          <div
            key={ev.id}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: slide === idx ? 1 : 0, pointerEvents: slide === idx ? "auto" : "none" }}
          >
            {/* Background */}
            <div
              className="absolute inset-0"
              style={{
                background: ev.type === "DAYS_CHALLENGE"
                  ? "linear-gradient(135deg, #1a1225 0%, #2d2048 60%, #1e2d4a 100%)"
                  : ev.type === "WORKSHOP"
                  ? "linear-gradient(135deg, #0d2018 0%, #1a3a2a 60%, #1e2d4a 100%)"
                  : "linear-gradient(135deg, #0f1e35 0%, #1a2e50 60%, #1e2d4a 100%)",
              }}
            />
            {ev.bannerUrl && (
              <div className="absolute inset-0 opacity-15">
                <img src={ev.bannerUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "26px 26px",
              }}
            />
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent 5%, ${tagColor} 35%, ${tagColor} 65%, transparent 95%)` }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(10,14,25,0.6))" }}
            />

            {/* Event content — centered like the mission slide */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div style={{ maxWidth: 640, width: "100%" }}>
              {/* Status pill */}
              <div className="flex items-center justify-center gap-2.5 mb-4">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
                />
                <span
                  className="font-bold uppercase tracking-[0.2em]"
                  style={{ fontSize: 10, color: tagColor }}
                >
                  {tagLabel}
                </span>
                <span
                  className="font-semibold uppercase tracking-widest"
                  style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}
                >
                  · {statusLabel}
                </span>
              </div>

              <h2
                className="font-serif text-white leading-[1.1] mb-4"
                style={{
                  fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
                  letterSpacing: "-0.02em",
                  textShadow: "0 2px 20px rgba(0,0,0,0.5)",
                }}
              >
                {ev.title}
              </h2>

              {ev.description && (
                <div
                  className="text-white leading-relaxed mb-5 mx-auto"
                  style={{ fontSize: "clamp(0.82rem, 1.6vw, 0.95rem)", opacity: 0.75, maxWidth: 480, textAlign: "left" }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownHTML(
                    ev.description.length > 200 ? ev.description.slice(0, 197) + "…" : ev.description
                  ) }}
                />
              )}

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span
                  className="text-white font-medium"
                  style={{ fontSize: 12, opacity: 0.55 }}
                >
                  {formatRange(ev.startDate, ev.endDate)}
                </span>
                {ev.daysTarget && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/25" />
                    <span className="text-white font-medium" style={{ fontSize: 12, opacity: 0.55 }}>
                      {ev.daysTarget} consecutive days
                    </span>
                  </>
                )}
              </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Dots nav (only if > 1 slide) ── */}
      {totalSlides > 1 && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 z-20">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              className="focus:outline-none transition-all"
              style={{
                width: i === slide ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === slide ? "#d4af37" : "rgba(255,255,255,0.25)",
                transition: "all 0.35s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Community Events Carousel (fetches from backend) ──────────
// Converts a PlatformEvent into display metadata
function eventToCarouselItem(ev) {
  const typeStyles = {
    DAYS_CHALLENGE: {
      tagColor: "#a78bfa",
      bg: "linear-gradient(135deg, #1a1225 0%, #2d2048 60%, #2d3748 100%)",
    },
    WORKSHOP: {
      tagColor: "#34d399",
      bg: "linear-gradient(135deg, #0d2018 0%, #1a3a2a 50%, #2d3748 100%)",
    },
    ANNOUNCEMENT: {
      tagColor: "#60a5fa",
      bg: "linear-gradient(135deg, #0f1e35 0%, #1a2e50 50%, #2d3748 100%)",
    },
    OTHER: {
      tagColor: "#d4af37",
      bg: "linear-gradient(135deg, #1a2218 0%, #1e3a2e 50%, #2d3748 100%)",
    },
  };

  const typeLabels = {
    DAYS_CHALLENGE: "Writing Challenge",
    WORKSHOP:       "Workshop",
    ANNOUNCEMENT:   "Announcement",
    OTHER:          "Community Event",
  };

  const style = typeStyles[ev.type] || typeStyles.OTHER;
  const now   = new Date();
  const start = new Date(ev.startDate);
  const end   = new Date(ev.endDate);

  const isLive    = now >= start && now <= end;
  const isUpcoming = now < start;
  const status      = isLive ? "Happening now" : isUpcoming ? "Coming soon" : "Ended";
  const statusColor = isLive ? "#4ade80" : isUpcoming ? "#a78bfa" : "#9a8c7a";

  const formatDateRange = (s, e) => {
    const opts = { month: "short", day: "numeric" };
    const sStr = new Date(s).toLocaleDateString("en-US", opts);
    const eStr = new Date(e).toLocaleDateString("en-US", opts);
    return `${sStr} – ${eStr}`;
  };

  return {
    id:          ev.id,
    tag:         typeLabels[ev.type] || "Event",
    tagColor:    style.tagColor,
    title:       ev.title,
    dates:       formatDateRange(ev.startDate, ev.endDate),
    schedule:    ev.daysTarget ? `${ev.daysTarget} consecutive days` : "Check Discord for schedule",
    status,
    statusColor,
    description: ev.description,
    bg:          style.bg,
    bannerUrl:   ev.bannerUrl || null,
  };
}

function CommunityEventsCarousel() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive]   = useState(0);
  const [paused, setPaused]   = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/events/active`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const items = (d?.events || []).map(eventToCarouselItem);
        setEvents(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (paused || events.length <= 1) return;
    const t = setInterval(() => setActive(i => (i + 1) % events.length), 6000);
    return () => clearInterval(t);
  }, [paused, events.length]);

  // Nothing to show
  if (!loading && events.length === 0) return null;

  const ev = events[active] || null;

  return (
    <section className="mb-12">
      <SectionLabel>Community events</SectionLabel>
      {loading ? (
        <div className="rounded-3xl overflow-hidden animate-pulse" style={{ minHeight: 200, background: "#2d3748" }}>
          <div className="px-8 py-10 space-y-4">
            <div className="h-3 bg-white/10 rounded w-1/4" />
            <div className="h-8 bg-white/10 rounded w-1/2" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-2/3" />
          </div>
        </div>
      ) : ev && (
        <div
          className="relative rounded-3xl overflow-hidden cursor-pointer"
          style={{ background: ev.bg, transition: "background 0.7s ease", minHeight: 200 }}
          onClick={() => setPaused(p => !p)}
          title={paused ? "Click to resume" : "Click to pause"}
        >
          {/* Banner image overlay */}
          {ev.bannerUrl && (
            <div className="absolute inset-0 opacity-20">
              <img src={ev.bannerUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {/* Texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 14px)" }} />

          <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
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

            {events.length > 1 && (
              <div className="flex-shrink-0 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  {events.map((e, i) => (
                    <button
                      key={e.id}
                      onClick={(evt) => { evt.stopPropagation(); setActive(i); setPaused(true); }}
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
            )}
          </div>
        </div>
      )}
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
  { day: "Wednesday", utcHour: 16, label: "Reading Sprint",     note: "Read Story Genius together to improve your craft" },
  { day: "Friday",    utcHour: 16, label: "Writing Sprint",     note: "Come together and write using the Inkwell quiet sprint room" },
  { day: "Saturday",  utcHour: 16, label: "Feedback Session",   note: "Share your work and give thoughtful feedback to fellow writers" },
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
// Shown to ALL users — guests get signup/login CTAs, members get a reminder
function DiscordBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section
      className="rounded-3xl overflow-hidden mb-12"
      style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 16px 48px rgba(10,15,30,0.18)" }}
    >
      <div
        className="relative px-6 sm:px-10 py-8 sm:py-10"
        style={{ background: "linear-gradient(135deg, #0d1320 0%, #141c2e 40%, #1a2540 70%, #1e2d4a 100%)" }}
      >
        {/* Gold top line */}
        <div
          className="absolute top-0 left-8 right-8 h-px"
          style={{ background: "linear-gradient(90deg, transparent, #d4af37 40%, #d4af37 60%, transparent)" }}
        />
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-white font-bold tracking-[0.22em] uppercase mb-2" style={{ opacity: 0.45 }}>
              Join on Discord
            </p>
            <h2 className="font-serif text-white text-xl sm:text-2xl leading-snug mb-3">
              Writing is solitary.<br />
              Accountability doesn't have to be.
            </h2>
            <p className="text-white text-sm leading-relaxed max-w-md" style={{ opacity: 0.72 }}>
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
                  <span className="text-white text-[12px] leading-relaxed" style={{ opacity: 0.78 }}>{item}</span>
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
            <p className="text-white text-[10px] text-center" style={{ opacity: 0.35 }}>Free to join · Writers only</p>
            {!user && (
              <div className="mt-1 flex flex-col gap-2 w-full">
                <button
                  onClick={() => navigate("/signup")}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-all border border-white/10"
                >
                  Create a free account
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-2.5 text-sm transition-colors text-white"
                  style={{ opacity: 0.4 }}
                >
                  Sign in
                </button>
              </div>
            )}
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
      <HeroCarousel />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <section className="mb-10"><DailyEmotion /></section>
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

        {/* Community sprint times + Discord link */}
        <CommunitySchedule discordInviteLink={DISCORD_INVITE_LINK} />

        {/* 5-day writing challenge — active participants or winners */}
        <section className="mb-10"><ChallengeBlock /></section>

        {/* Community honours board — top critiquers, sprinters, sentence crafters */}
        <section className="mb-12"><CommunityLeaderboard /></section>

        <section className="mb-12"><ContributeSoundscape /></section>

        {/* Discord community banner — always visible for both guests and logged-in users */}
        <DiscordBanner />

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