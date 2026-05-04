import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API_URL from "../../config/api";

// ─── Helpers ──────────────────────────────────────────────────
function fmt(n) { return (n ?? 0).toLocaleString(); }

function genreColor(genre) {
  const map = {
    fantasy:            { bg: "#f3f0ff", text: "#5b21b6", dot: "#7c3aed", accent: "#ede9fe" },
    romance:            { bg: "#fdf2f8", text: "#9d174d", dot: "#db2777", accent: "#fce7f3" },
    thriller:           { bg: "#fff7ed", text: "#9a3412", dot: "#ea580c", accent: "#ffedd5" },
    mystery:            { bg: "#fff7ed", text: "#9a3412", dot: "#ea580c", accent: "#ffedd5" },
    "sci-fi":           { bg: "#eff6ff", text: "#1e40af", dot: "#3b82f6", accent: "#dbeafe" },
    "science fiction":  { bg: "#eff6ff", text: "#1e40af", dot: "#3b82f6", accent: "#dbeafe" },
    horror:             { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444", accent: "#fee2e2" },
    literary:           { bg: "#f0fdf4", text: "#14532d", dot: "#16a34a", accent: "#dcfce7" },
    "literary fiction": { bg: "#f0fdf4", text: "#14532d", dot: "#16a34a", accent: "#dcfce7" },
    historical:         { bg: "#fefce8", text: "#713f12", dot: "#ca8a04", accent: "#fef9c3" },
    adventure:          { bg: "#ecfdf5", text: "#065f46", dot: "#10b981", accent: "#d1fae5" },
  };
  const key = (genre || "").toLowerCase().trim();
  return map[key] || { bg: "#f5f3ef", text: "#4b4540", dot: "#9a8c7a", accent: "#ede9e3" };
}

function initials(username) {
  return (username || "?").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#eeedfe", text: "#3c3489" },
  { bg: "#e1f5ee", text: "#085041" },
  { bg: "#faece7", text: "#712b13" },
  { bg: "#fbeaf0", text: "#72243e" },
  { bg: "#e6f1fb", text: "#0c447c" },
  { bg: "#faeeda", text: "#633806" },
];

function avatarColor(username) {
  let hash = 0;
  for (let i = 0; i < (username || "").length; i++) hash += username.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function trackingMode(project) {
  if (project.consecutiveDaysTarget > 0) return "days";
  if (project.sessionGoalCount > 0)      return "sessions";
  if (project.targetScenes > 0)          return "scenes";
  if (project.targetChapters > 0)        return "chapters";
  if (project.targetWordCount > 0)       return "words";
  return "none";
}

function getChallengeEntry(project) {
  if (!project.eventEntries?.length) return null;
  return project.eventEntries.find(e => e.event?.type === "DAYS_CHALLENGE") || null;
}

// ─── Progress bar ─────────────────────────────────────────────
function Bar({ current, target, color, trackColor = "#e8e3db" }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const done = pct >= 100;
  const barColor = color || (done ? "#16a34a" : "#2563eb");
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: trackColor }}>
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${pct}%`, background: barColor }}
      />
    </div>
  );
}

// ─── Streak dots ──────────────────────────────────────────────
function StreakDots({ streak, target, disqualified }) {
  const count = Math.min(target || 30, 20);
  const dots  = Array.from({ length: count }, (_, i) => i < streak);
  return (
    <div className="flex flex-wrap gap-[5px]">
      {dots.map((filled, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full transition-all"
          style={{
            background: disqualified
              ? (filled ? "#fca5a5" : "#fee2e2")
              : (filled ? "#be185d" : "#fce7f3"),
            transform: filled ? "scale(1)" : "scale(0.85)"
          }}
        />
      ))}
    </div>
  );
}

// ─── Streak totals ─────────────────────────────────────────────
function StreakTotals({ dayLogs }) {
  if (!dayLogs?.length) return null;
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
    totals.words    > 0 && { label: "words",    value: fmt(totals.words) },
    totals.chapters > 0 && { label: "chapters", value: totals.chapters },
    totals.scenes   > 0 && { label: "scenes",   value: totals.scenes },
    totals.minutes  > 0 && { label: "min",      value: fmt(totals.minutes) },
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      {items.map(item => (
        <div key={item.label} className="flex items-baseline gap-1">
          <span className="text-[12px] font-bold text-[#2d3748]">{item.value}</span>
          <span className="text-[10px] text-[#9a8c7a] uppercase tracking-wide">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── User row ──────────────────────────────────────────────────
function UserRow({ project, borderColor = "#f0ebe3" }) {
  const av = avatarColor(project.user?.username);
  return (
    <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${borderColor}` }}>
      <Link
        to={`/profile/${project.user?.id}`}
        className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden"
          style={{ background: av.bg, color: av.text }}
        >
          {project.user?.avatar
            ? <img src={project.user.avatar} alt={project.user.username} className="w-full h-full object-cover" />
            : initials(project.user?.username)
          }
        </div>
        <span className="text-[11px] text-[#9a8c7a] truncate font-medium">@{project.user?.username}</span>
      </Link>
      {project.status === "COMPLETED" && (
        <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-[#16a34a] bg-[#f0fdf4] px-2 py-0.5 rounded-full flex-shrink-0 border border-[#bbf7d0]">
          Complete
        </span>
      )}
    </div>
  );
}

// ─── Standard progress card ────────────────────────────────────
function ProjectCard({ project }) {
  const gc = genreColor(project.genre);

  const hasWords    = project.targetWordCount > 0;
  const hasChapters = project.targetChapters  > 0;
  const hasScenes   = project.targetScenes    > 0;

  const wordPct    = hasWords    ? Math.min(Math.round((project.currentWordCount / project.targetWordCount) * 100), 100) : null;
  const chapterPct = hasChapters ? Math.min(Math.round((project.currentChapters  / project.targetChapters)  * 100), 100) : null;
  const scenePct   = hasScenes   ? Math.min(Math.round((project.currentScenes    / project.targetScenes)    * 100), 100) : null;

  const primary = hasWords
    ? { label: "words",    current: project.currentWordCount, target: project.targetWordCount, pct: wordPct }
    : hasChapters
    ? { label: "chapters", current: project.currentChapters,  target: project.targetChapters,  pct: chapterPct }
    : hasScenes
    ? { label: "scenes",   current: project.currentScenes,    target: project.targetScenes,    pct: scenePct }
    : null;

  const isNearDone = primary?.pct >= 75;

  return (
    <div
      className="relative bg-white rounded-2xl border border-[#e8e0d0] p-5 flex flex-col gap-4 hover:border-[#c8bfb0] hover:shadow-lg transition-all duration-200 group overflow-hidden"
      style={{ boxShadow: "0 2px 8px rgba(45,35,20,0.05), 0 1px 2px rgba(45,35,20,0.04)" }}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: "linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)" }} />

      {/* Genre + title */}
      <div className="space-y-1.5 pt-1">
        {project.genre && (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: gc.accent, color: gc.text }}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gc.dot }} />
            {project.genre}
          </div>
        )}
        <p className="font-serif text-[#2d3748] text-[16px] leading-snug line-clamp-2 group-hover:text-[#1a2535] transition-colors">
          {project.title}
        </p>
      </div>

      {/* Progress */}
      {primary && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9a8c7a] uppercase tracking-wider font-bold">{primary.label}</span>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{
                color: primary.pct >= 100 ? "#16a34a" : isNearDone ? "#d97706" : "#2563eb",
                background: primary.pct >= 100 ? "#f0fdf4" : isNearDone ? "#fffbeb" : "#eff6ff"
              }}
            >
              {primary.pct}%
            </span>
          </div>
          <Bar
            current={primary.current}
            target={primary.target}
            color={primary.pct >= 100 ? "#16a34a" : isNearDone ? "#d97706" : "#2563eb"}
            trackColor="#f0ebe3"
          />
          <p className="text-[11px] text-[#b8a898]">
            {fmt(primary.current)} <span className="text-[#d4ccc0]">/</span> {fmt(primary.target)} {primary.label}
          </p>
        </div>
      )}

      <UserRow project={project} />
    </div>
  );
}

// ─── Streak card ──────────────────────────────────────────────
function StreakCard({ project }) {
  const gc = genreColor(project.genre);
  const streak = project.currentStreak || 0;
  const target = project.consecutiveDaysTarget || 0;
  const pct    = target > 0 ? Math.min(Math.round((streak / target) * 100), 100) : 0;

  return (
    <div
      className="relative bg-white rounded-2xl border p-5 flex flex-col gap-4 hover:shadow-lg transition-all duration-200 group overflow-hidden"
      style={{
        borderColor: "#f9a8d4",
        boxShadow: "0 2px 8px rgba(190,24,93,0.06), 0 1px 2px rgba(190,24,93,0.04)"
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: "linear-gradient(90deg, #9d174d 0%, #f472b6 100%)" }} />

      <div className="space-y-1.5 pt-1">
        {project.genre && (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: gc.accent, color: gc.text }}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gc.dot }} />
            {project.genre}
          </div>
        )}
        <p className="font-serif text-[#2d3748] text-[16px] leading-snug line-clamp-2 group-hover:text-[#1a2535] transition-colors">
          {project.title}
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#be185d] uppercase tracking-wider font-bold">streak</span>
          <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "#be185d" }}>
            {streak} / {target > 0 ? target : "—"} days
          </span>
        </div>
        {target > 0 && <Bar current={streak} target={target} color="#be185d" trackColor="#fce7f3" />}
        <StreakDots streak={streak} target={target} />
      </div>

      <UserRow project={project} borderColor="#fce7f3" />
    </div>
  );
}

// ─── Session card ──────────────────────────────────────────────
function SessionCard({ project }) {
  const gc = genreColor(project.genre);
  const goalCount = project.sessionGoalCount || 0;
  const current   = project.currentSessionCount || 0;
  const pct       = goalCount > 0 ? Math.min(Math.round((current / goalCount) * 100), 100) : 0;
  const periodLabel = project.sessionGoalType
    ? { DAILY: "daily", WEEKLY: "weekly", MONTHLY: "monthly" }[project.sessionGoalType] || ""
    : "";

  return (
    <div
      className="relative bg-white rounded-2xl border p-5 flex flex-col gap-4 hover:shadow-lg transition-all duration-200 group overflow-hidden"
      style={{
        borderColor: "#f9a8d4",
        boxShadow: "0 2px 8px rgba(190,24,93,0.06), 0 1px 2px rgba(190,24,93,0.04)"
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: "linear-gradient(90deg, #f472b6 0%, #9d174d 100%)" }} />

      <div className="space-y-1.5 pt-1">
        {project.genre && (
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: gc.accent, color: gc.text }}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gc.dot }} />
            {project.genre}
          </div>
        )}
        <p className="font-serif text-[#2d3748] text-[16px] leading-snug line-clamp-2 group-hover:text-[#1a2535] transition-colors">
          {project.title}
        </p>
      </div>

      {goalCount > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#be185d] uppercase tracking-wider font-bold">
              sessions {periodLabel && `· ${periodLabel}`}
            </span>
            <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "#be185d" }}>
              {pct}%
            </span>
          </div>
          <Bar current={current} target={goalCount} color="#be185d" trackColor="#fce7f3" />
          <p className="text-[11px] text-[#b8a898]">
            {current} <span className="text-[#d4ccc0]">/</span> {goalCount} sessions
          </p>
        </div>
      )}

      <UserRow project={project} borderColor="#fce7f3" />
    </div>
  );
}

// ─── Challenge card ────────────────────────────────────────────
function ChallengeCard({ project, communityStreak, eventDaysTarget }) {
  const gc = genreColor(project.genre);
  const entry     = getChallengeEntry(project);
  const disq      = entry ? false : true;
  const streak    = project.currentStreak  || 0;
  const target    = project.consecutiveDaysTarget || (entry?.event?.daysTarget) || eventDaysTarget || 5;
  const pct       = target > 0 ? Math.min(Math.round((streak / target) * 100), 100) : 0;
  const eventTitle = entry?.event?.title || "Days Challenge";
  const endDate    = entry?.event?.endDate;
  const daysLeft = endDate ? (() => {
    const end   = new Date(new Date(endDate).toDateString());
    const today = new Date(new Date().toDateString());
    const diff  = Math.round((end - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  })() : null;

  const dayLabel = communityStreak != null && target > 0
    ? `Community on Day ${communityStreak} of ${target}`
    : null;

  const dayLogs = project.dayLogs || [];

  return (
    <div
      className="relative bg-white rounded-2xl border p-5 flex flex-col gap-4 hover:shadow-lg transition-all duration-200 group overflow-hidden"
      style={{
        borderColor: disq ? "#fecaca" : "#fde68a",
        boxShadow: disq
          ? "0 2px 8px rgba(239,68,68,0.06)"
          : "0 2px 8px rgba(180,130,20,0.08)",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{
        background: disq
          ? "linear-gradient(90deg, #f87171 0%, #fca5a5 100%)"
          : "linear-gradient(90deg, #d97706 0%, #fbbf24 60%, #be185d 100%)"
      }} />

      {/* Title + badge */}
      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="space-y-1 min-w-0 flex-1">
          {project.genre && (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: gc.accent, color: gc.text }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gc.dot }} />
              {project.genre}
            </div>
          )}
          <p className="font-serif text-[#2d3748] text-[16px] leading-snug line-clamp-2 group-hover:text-[#1a2535] transition-colors">
            {project.title}
          </p>
        </div>
        {disq ? (
          <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-red-500 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
            Disqualified
          </span>
        ) : (
          <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-[#92680a] bg-[#fefce8] border border-[#fde68a] px-2 py-1 rounded-full">
            In Challenge
          </span>
        )}
      </div>

      {/* Event name + days left */}
      {!disq && (
        <div className="flex items-center gap-2 -mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#d97706] flex-shrink-0" />
          <span className="text-[10px] text-[#92680a] font-semibold truncate">{eventTitle}</span>
          {daysLeft !== null && (
            <span className="ml-auto text-[10px] text-[#9a8c7a] flex-shrink-0 bg-[#f5f3ef] px-2 py-0.5 rounded-full">
              {daysLeft === 0 ? "Last day" : `${daysLeft}d left`}
            </span>
          )}
        </div>
      )}

      {/* Community day banner */}
      {!disq && dayLabel && (
        <div className="flex items-center gap-2 bg-[#fffbeb] border border-[#fef3c7] rounded-xl px-3 py-2">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
          </svg>
          <span className="text-[10px] font-bold text-[#92680a]">{dayLabel}</span>
        </div>
      )}

      {/* Streak */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: disq ? "#f87171" : "#be185d" }}>
            {disq ? "chain broken" : "streak"}
          </span>
          <span
            className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full"
            style={{ background: disq ? "#f87171" : "#be185d" }}
          >
            {streak} / {target} days
          </span>
        </div>
        <Bar current={streak} target={target} color={disq ? "#f87171" : "#be185d"} trackColor={disq ? "#fee2e2" : "#fce7f3"} />
        <StreakDots streak={streak} target={target} disqualified={disq} />
      </div>

      {/* Streak totals */}
      {dayLogs.length > 0 && !disq && (
        <div className="border-t border-[#fde68a] pt-3 space-y-1.5">
          <p className="text-[9px] uppercase tracking-widest text-[#9a8c7a] font-bold">Written through the streak</p>
          <StreakTotals dayLogs={dayLogs} />
        </div>
      )}

      {/* Disqualified message */}
      {disq && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          <p className="text-[10px] text-red-500 leading-relaxed">
            This project missed a day and was removed from the challenge. The chain is broken.
          </p>
        </div>
      )}

      <UserRow project={project} borderColor={disq ? "#fecaca" : "#fde68a"} />
    </div>
  );
}

// ─── Winner card ──────────────────────────────────────────────
const ROLE_META = {
  IRON_PEN:      { label: "Iron Pen",      color: "#1e3a5f", bg: "#eff6ff", border: "#bfdbfe", accent: "#dbeafe" },
  CHAMPION:      { label: "Champion",      color: "#7c2d12", bg: "#fff7ed", border: "#fed7aa", accent: "#ffedd5" },
  STREAK_KEEPER: { label: "Streak Keeper", color: "#701a75", bg: "#fdf4ff", border: "#e9d5ff", accent: "#f3e8ff" },
};

function WinnerCard({ winner }) {
  const av   = avatarColor(winner.username);
  const role = ROLE_META[winner.challengeRole] || ROLE_META.STREAK_KEEPER;

  const stats = [
    winner.totalWords    > 0 && { label: "words",    value: fmt(winner.totalWords) },
    winner.totalChapters > 0 && { label: "chapters", value: winner.totalChapters },
    winner.totalScenes   > 0 && { label: "scenes",   value: winner.totalScenes },
    winner.totalMinutes  > 0 && { label: "min",      value: fmt(winner.totalMinutes) },
  ].filter(Boolean);

  return (
    <div
      className="bg-white rounded-2xl border p-5 flex flex-col gap-4 hover:shadow-md transition-all"
      style={{ borderColor: role.border }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
          style={{ color: role.color, background: role.bg, borderColor: role.border }}
        >
          {role.label}
        </span>
        <span className="ml-auto text-[10px] text-[#9a8c7a] bg-[#f5f3ef] px-2 py-0.5 rounded-full">{winner.finalStreak}d streak</span>
      </div>

      <p className="font-serif text-[#2d3748] text-[15px] leading-snug line-clamp-2">{winner.projectTitle}</p>

      {stats.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {stats.map(s => (
            <div key={s.label} className="flex items-baseline gap-1">
              <span className="text-[12px] font-bold text-[#2d3748]">{s.value}</span>
              <span className="text-[9px] text-[#9a8c7a] uppercase tracking-wide">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: role.border }}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 overflow-hidden"
          style={{ background: av.bg, color: av.text }}
        >
          {winner.user?.avatar
            ? <img src={winner.user.avatar} alt={winner.username} className="w-full h-full object-cover" />
            : initials(winner.username)
          }
        </div>
        <span className="text-[11px] text-[#9a8c7a] truncate">@{winner.username}</span>
      </div>
    </div>
  );
}

// ─── Challenge Shoutout ────────────────────────────────────────
function ChallengeShoutout({ eventId, eventTitle }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    fetch(`${API_URL}/events/${eventId}/winners`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading || !data?.winners?.length) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 rounded-full bg-[#fde68a]" />
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#fde68a] bg-[#fefce8]">
          <div className="w-2 h-2 rounded-full bg-[#d97706]" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#92680a]">
            {eventTitle || "Challenge"} — Hall of Fame
          </p>
        </div>
        <div className="h-px flex-1 rounded-full bg-[#fde68a]" />
      </div>
      <p className="text-[11px] text-[#9a8c7a] mb-5 text-center leading-relaxed">
        These writers made it through. Hats off to them.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.winners.map(w => (
          <WinnerCard key={w.id} winner={w} />
        ))}
      </div>
    </div>
  );
}

// ─── Community Streak Banner ──────────────────────────────────
function CommunityStreakBanner({ communityData }) {
  if (!communityData || communityData.participantCount === 0) return null;
  const { communityStreak, daysTarget, participantCount, eventTitle } = communityData;
  const pct = daysTarget > 0 ? Math.min(Math.round((communityStreak / daysTarget) * 100), 100) : 0;

  return (
    <div
      className="rounded-2xl border border-[#fde68a] bg-gradient-to-r from-[#fffbeb] to-[#fff7ed] px-5 py-4 mb-5 flex items-center gap-4"
      style={{ boxShadow: "0 2px 12px rgba(180,130,20,0.1)" }}
    >
      <div className="flex-shrink-0 relative" style={{ width: 56, height: 56 }}>
        <svg width="56" height="56" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="28" cy="28" r="22" fill="none" stroke="#fef3c7" strokeWidth="5.5" />
          <circle cx="28" cy="28" r="22" fill="none" stroke="#d97706" strokeWidth="5.5"
            strokeDasharray={`${2 * Math.PI * 22}`}
            strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
            strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[14px] font-bold text-[#92680a] leading-none">{communityStreak}</span>
          <span className="text-[8px] text-[#b45309] leading-none">/ {daysTarget}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-[#92680a] leading-snug">
          The community is on Day {communityStreak}
        </p>
        <p className="text-[11px] text-[#9a8c7a] mt-0.5">
          {participantCount} {participantCount === 1 ? "writer" : "writers"} running the streak in{" "}
          <span className="font-semibold text-[#92680a]">{eventTitle}</span>
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-[11px] text-[#b45309] font-bold">{pct}%</p>
        <p className="text-[9px] text-[#9a8c7a]">of goal</p>
      </div>
    </div>
  );
}

// ─── Section divider label ─────────────────────────────────────
function SubSectionLabel({ children, color = "#9a8c7a", lineColor = "#e8e0d0", icon }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-px flex-1 rounded-full" style={{ background: lineColor }} />
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${lineColor}80`, border: `1px solid ${lineColor}` }}>
        {icon && <span>{icon}</span>}
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>
          {children}
        </p>
      </div>
      <div className="h-px flex-1 rounded-full" style={{ background: lineColor }} />
    </div>
  );
}

// ─── Skeleton loader ───────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e0d0] p-5 space-y-4 animate-pulse">
      <div className="h-[3px] bg-[#e8e0d0] rounded w-full -mt-5 mx-0 absolute top-0 left-0 right-0 rounded-t-2xl" />
      <div className="h-4 bg-[#f0ebe3] rounded w-1/4 mt-1" />
      <div className="h-5 bg-[#f0ebe3] rounded w-4/5" />
      <div className="h-4 bg-[#f0ebe3] rounded w-3/5" />
      <div className="space-y-1.5">
        <div className="h-1.5 bg-[#f0ebe3] rounded w-full" />
        <div className="h-3 bg-[#f0ebe3] rounded w-1/3" />
      </div>
      <div className="h-px bg-[#f0ebe3] w-full" />
      <div className="h-4 bg-[#f0ebe3] rounded w-1/2" />
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────
function EmptyState({ navigate }) {
  return (
    <div className="text-center py-12 px-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#e8e0d0]"
        style={{ background: "linear-gradient(135deg, #faf7f2, #f0ebe3)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9a8c7a" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <p className="font-serif text-[#2d3748] text-lg mb-2">Be the first to write publicly</p>
      <p className="text-sm text-[#9a8c7a] mb-5 leading-relaxed max-w-xs mx-auto">
        Share your project and inspire other writers in the community.
      </p>
      <button
        onClick={() => navigate("/projects")}
        className="inline-flex items-center gap-2 text-sm font-semibold bg-[#2d3748] text-white px-5 py-2.5 rounded-2xl hover:bg-[#1a2535] transition-all"
      >
        Share your project
      </button>
    </div>
  );
}

// ─── Main exported component ───────────────────────────────────
export default function CommunityProjects() {
  const [projects, setProjects]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [communityData, setCommunityData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/projects/public/all`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setProjects(d?.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!projects.length) return;
    const anyEntry = projects
      .flatMap(p => p.eventEntries || [])
      .find(e => e.event?.type === "DAYS_CHALLENGE" && !e.disqualified);
    const eventId = anyEntry?.event?.id;
    if (!eventId) return;

    fetch(`${API_URL}/events/${eventId}/communityStreak`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCommunityData(d); })
      .catch(() => {});
  }, [projects]);

  // ── Buckets ───────────────────────────────────────────────────
  const challengeProjects = projects.filter(p =>
    p.eventEntries?.some(e => e.event?.type === "DAYS_CHALLENGE")
  ).slice(0, 6);

  const activeChallengeEntry = challengeProjects
    .flatMap(p => p.eventEntries || [])
    .find(e => e.event?.type === "DAYS_CHALLENGE" && !e.disqualified);

  const challengeEventTitle  = activeChallengeEntry?.event?.title || "Days Challenge";
  const challengeEventId     = activeChallengeEntry?.event?.id;
  const challengeDaysTarget  = activeChallengeEntry?.event?.daysTarget;
  const challengeIsOver      = activeChallengeEntry?.event?.endDate
    ? new Date(activeChallengeEntry.event.endDate) < new Date()
    : false;

  const challengeIds = new Set(challengeProjects.map(p => p.id));
  const habitProjects = projects.filter(p =>
    !challengeIds.has(p.id) && ["days", "sessions"].includes(trackingMode(p))
  ).slice(0, 6);

  const progressProjects = projects.filter(p =>
    !challengeIds.has(p.id) && !["days", "sessions"].includes(trackingMode(p))
  ).slice(0, 6);

  const hasContent = challengeProjects.length > 0 || habitProjects.length > 0 || progressProjects.length > 0;

  return (
    <section
      className="rounded-3xl overflow-hidden mb-12"
      style={{
        background: "linear-gradient(160deg, #f7f3ed 0%, #faf7f2 40%, #f4f0eb 100%)",
        border: "1px solid #e8e0d0",
        boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 10px 30px rgba(45,35,20,0.06)"
      }}
    >
      {/* Section header */}
      <div className="px-6 sm:px-8 pt-7 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px flex-1 bg-[#ddd5c8]" />
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#be185d] opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#be185d]" />
            </span>
            <p className="text-[10px] text-[#7a6e62] uppercase tracking-widest font-bold">
              Members writing now
            </p>
          </div>
          <div className="h-px flex-1 bg-[#ddd5c8]" />
        </div>
        <p className="text-center text-[11px] text-[#b8a898] pb-4">
          Public projects from the Inkwell community
        </p>
      </div>

      <div className="px-6 sm:px-8 pb-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : !hasContent ? (
          <EmptyState navigate={navigate} />
        ) : (
          <div className="space-y-10">

            {/* Days Challenge */}
            {challengeProjects.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 rounded-full bg-[#fde68a]" />
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#fde68a] bg-[#fefce8]">
                    {challengeIsOver
                      ? <div className="w-2 h-2 rounded-full bg-[#d97706]" />
                      : <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d97706] opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d97706]" />
                        </span>
                    }
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#92680a]">
                      {challengeEventTitle} — {challengeIsOver ? "Ended" : "Live"}
                    </p>
                  </div>
                  <div className="h-px flex-1 rounded-full bg-[#fde68a]" />
                </div>

                {!challengeIsOver && (
                  <>
                    <CommunityStreakBanner communityData={communityData} />
                    <p className="text-[11px] text-[#9a8c7a] mb-5 text-center leading-relaxed">
                      These writers are running a consecutive-days streak. Miss a day and the chain breaks.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {challengeProjects.map(project => (
                        <ChallengeCard
                          key={project.id}
                          project={project}
                          communityStreak={communityData?.communityStreak ?? null}
                          eventDaysTarget={challengeDaysTarget}
                        />
                      ))}
                    </div>
                  </>
                )}

                {challengeIsOver && challengeEventId && (
                  <ChallengeShoutout eventId={challengeEventId} eventTitle={challengeEventTitle} />
                )}
              </div>
            )}

            {/* Habit tracking */}
            {habitProjects.length > 0 && (
              <div>
                <SubSectionLabel color="#9d174d" lineColor="#fbcfe8">
                  Habit Tracking
                </SubSectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {habitProjects.map(project =>
                    trackingMode(project) === "days"
                      ? <StreakCard key={project.id} project={project} />
                      : <SessionCard key={project.id} project={project} />
                  )}
                </div>
              </div>
            )}

            {/* Progress tracking */}
            {progressProjects.length > 0 && (
              <div>
                <SubSectionLabel color="#1d4ed8" lineColor="#dbeafe">
                  Progress Tracking
                </SubSectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {progressProjects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </div>
            )}

            {/* Footer CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-[#e0d8cc]">
              <p className="text-[12px] text-[#7a6e62] leading-relaxed text-center sm:text-left">
                Projects are private by default. Writers choose what to share.
              </p>
              <button
                onClick={() => navigate("/projects")}
                className="flex-shrink-0 text-[12px] font-bold text-white bg-[#2d3748] border border-[#2d3748] rounded-full px-5 py-2 hover:bg-[#1a2535] transition-all"
              >
                Share your project
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}