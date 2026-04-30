import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../../config/api";

// ─── Helpers ──────────────────────────────────────────────────
function fmt(n) { return (n ?? 0).toLocaleString(); }

function genreColor(genre) {
  const map = {
    fantasy:           { bg: "#f3f0ff", text: "#5b21b6", dot: "#7c3aed" },
    romance:           { bg: "#fdf2f8", text: "#9d174d", dot: "#db2777" },
    thriller:          { bg: "#fff7ed", text: "#9a3412", dot: "#ea580c" },
    mystery:           { bg: "#fff7ed", text: "#9a3412", dot: "#ea580c" },
    "sci-fi":          { bg: "#eff6ff", text: "#1e40af", dot: "#3b82f6" },
    "science fiction": { bg: "#eff6ff", text: "#1e40af", dot: "#3b82f6" },
    horror:            { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444" },
    literary:          { bg: "#f0fdf4", text: "#14532d", dot: "#16a34a" },
    "literary fiction":{ bg: "#f0fdf4", text: "#14532d", dot: "#16a34a" },
    historical:        { bg: "#fefce8", text: "#713f12", dot: "#ca8a04" },
    adventure:         { bg: "#ecfdf5", text: "#065f46", dot: "#10b981" },
  };
  const key = (genre || "").toLowerCase().trim();
  return map[key] || { bg: "#f5f3ef", text: "#4b4540", dot: "#9a8c7a" };
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

// ─── Thin progress bar ────────────────────────────────────────
function Bar({ current, target, color }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const done = pct >= 100;
  const barColor = color || (done ? "#16a34a" : "#2563eb");
  return (
    <div className="w-full h-1 bg-[#e8e3db] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${pct}%`, background: barColor }}
      />
    </div>
  );
}

// ─── Streak dot grid ──────────────────────────────────────────
function StreakDots({ streak, target }) {
  const count = Math.min(target || 30, 20);
  const dots  = Array.from({ length: count }, (_, i) => i < streak);
  return (
    <div className="flex flex-wrap gap-1">
      {dots.map((filled, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: filled ? "#be185d" : "#fce7f3" }}
        />
      ))}
    </div>
  );
}

// ─── Section divider ─────────────────────────────────────────
function SubSectionLabel({ children, color = "#9a8c7a", lineColor = "#e8e0d0" }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 rounded-full" style={{ background: lineColor }} />
      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color }}>
        {children}
      </p>
      <div className="h-px flex-1 rounded-full" style={{ background: lineColor }} />
    </div>
  );
}

// ─── Standard progress card ───────────────────────────────────
function ProjectCard({ project }) {
  const av = avatarColor(project.user?.username);
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

  return (
    <div
      className="bg-white rounded-2xl border border-[#e8e0d0] p-4 flex flex-col gap-3"
      style={{ boxShadow: "0 1px 3px rgba(45,35,20,0.04), 0 4px 12px rgba(45,35,20,0.05)" }}
    >
      {/* Teal/blue top rule for progress */}
      <div className="h-[2px] w-full rounded-full" style={{ background: "linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)" }} />

      <div className="space-y-1.5">
        {project.genre && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gc.dot }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: gc.text }}>
              {project.genre}
            </span>
          </div>
        )}
        <p className="font-serif text-[#2d3748] text-[15px] leading-snug line-clamp-2">{project.title}</p>
      </div>

      {primary && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9a8c7a] uppercase tracking-wider font-semibold">{primary.label}</span>
            <span className="text-[10px] font-semibold" style={{ color: primary.pct >= 100 ? "#16a34a" : "#2563eb" }}>
              {primary.pct}%
            </span>
          </div>
          <Bar current={primary.current} target={primary.target} />
          <p className="text-[10px] text-[#b8a898]">
            {fmt(primary.current)} of {fmt(primary.target)} {primary.label}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-[#f0ebe3]">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
          style={{ background: av.bg, color: av.text }}
        >
          {initials(project.user?.username)}
        </div>
        <span className="text-[11px] text-[#9a8c7a] truncate">@{project.user?.username}</span>
        {project.status === "COMPLETED" && (
          <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-[#16a34a] bg-[#f0fdf4] px-1.5 py-0.5 rounded-full flex-shrink-0">
            Complete
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Streak card (pink) ───────────────────────────────────────
function StreakCard({ project }) {
  const av = avatarColor(project.user?.username);
  const gc = genreColor(project.genre);
  const streak = project.currentStreak || 0;
  const target = project.consecutiveDaysTarget || 0;
  const pct    = target > 0 ? Math.min(Math.round((streak / target) * 100), 100) : 0;

  return (
    <div
      className="bg-white rounded-2xl border p-4 flex flex-col gap-3"
      style={{
        borderColor: "#fbcfe8",
        boxShadow: "0 1px 3px rgba(190,24,93,0.04), 0 4px 12px rgba(190,24,93,0.06)",
      }}
    >
      <div className="h-[2px] w-full rounded-full" style={{ background: "linear-gradient(90deg, #9d174d 0%, #f472b6 100%)" }} />

      <div className="space-y-1.5">
        {project.genre && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gc.dot }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: gc.text }}>
              {project.genre}
            </span>
          </div>
        )}
        <p className="font-serif text-[#2d3748] text-[15px] leading-snug line-clamp-2">{project.title}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#be185d] uppercase tracking-wider font-semibold">streak</span>
          <span className="text-[10px] font-semibold text-[#9d174d]">
            {streak} / {target > 0 ? target : "—"} days
            {target > 0 && ` · ${pct}%`}
          </span>
        </div>
        {target > 0 && <Bar current={streak} target={target} color="#be185d" />}
        <StreakDots streak={streak} target={target} />
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-[#fce7f3]">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
          style={{ background: av.bg, color: av.text }}
        >
          {initials(project.user?.username)}
        </div>
        <span className="text-[11px] text-[#9a8c7a] truncate">@{project.user?.username}</span>
        {project.status === "COMPLETED" && (
          <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-[#16a34a] bg-[#f0fdf4] px-1.5 py-0.5 rounded-full flex-shrink-0">
            Complete
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Session card (pink) ──────────────────────────────────────
function SessionCard({ project }) {
  const av = avatarColor(project.user?.username);
  const gc = genreColor(project.genre);
  const goalCount = project.sessionGoalCount || 0;
  const current   = project.currentSessionCount || 0;
  const pct       = goalCount > 0 ? Math.min(Math.round((current / goalCount) * 100), 100) : 0;
  const periodLabel = project.sessionGoalType
    ? { DAILY: "daily", WEEKLY: "weekly", MONTHLY: "monthly" }[project.sessionGoalType] || ""
    : "";

  return (
    <div
      className="bg-white rounded-2xl border p-4 flex flex-col gap-3"
      style={{
        borderColor: "#fbcfe8",
        boxShadow: "0 1px 3px rgba(190,24,93,0.04), 0 4px 12px rgba(190,24,93,0.06)",
      }}
    >
      <div className="h-[2px] w-full rounded-full" style={{ background: "linear-gradient(90deg, #f472b6 0%, #9d174d 100%)" }} />

      <div className="space-y-1.5">
        {project.genre && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gc.dot }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: gc.text }}>
              {project.genre}
            </span>
          </div>
        )}
        <p className="font-serif text-[#2d3748] text-[15px] leading-snug line-clamp-2">{project.title}</p>
      </div>

      {goalCount > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#be185d] uppercase tracking-wider font-semibold">
              sessions {periodLabel && `· ${periodLabel}`}
            </span>
            <span className="text-[10px] font-semibold text-[#9d174d]">{pct}%</span>
          </div>
          <Bar current={current} target={goalCount} color="#be185d" />
          <p className="text-[10px] text-[#f472b6]">
            {current} of {goalCount} sessions
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-[#fce7f3]">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
          style={{ background: av.bg, color: av.text }}
        >
          {initials(project.user?.username)}
        </div>
        <span className="text-[11px] text-[#9a8c7a] truncate">@{project.user?.username}</span>
        {project.status === "COMPLETED" && (
          <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-[#16a34a] bg-[#f0fdf4] px-1.5 py-0.5 rounded-full flex-shrink-0">
            Complete
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────
export default function CommunityProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/projects/public/all`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setProjects(d?.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && projects.length === 0) return null;

  const habitProjects    = projects.filter(p => ["days", "sessions"].includes(trackingMode(p))).slice(0, 6);
  const progressProjects = projects.filter(p => !["days", "sessions"].includes(trackingMode(p))).slice(0, 6);

  return (
    <section className="mb-12">
      {/* Top label */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-px flex-1 bg-[#e8e0d0]" />
        <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold">
          Members writing now
        </p>
        <div className="h-px flex-1 bg-[#e8e0d0]" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#e8e0d0] p-4 space-y-3 animate-pulse">
              <div className="h-1 bg-[#e8e0d0] rounded w-full" />
              <div className="h-3 bg-[#e8e0d0] rounded w-1/3" />
              <div className="h-4 bg-[#e8e0d0] rounded w-3/4" />
              <div className="h-2 bg-[#e8e0d0] rounded w-full mt-4" />
              <div className="h-3 bg-[#e8e0d0] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* ── Habit Tracking ── */}
          {habitProjects.length > 0 && (
            <div>
              <SubSectionLabel color="#be185d" lineColor="#fbcfe8">
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

          {/* ── Progress Tracking ── */}
          {progressProjects.length > 0 && (
            <div>
              <SubSectionLabel color="#2563eb" lineColor="#dbeafe">
                Progress Tracking
              </SubSectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {progressProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#e8e0d0]">
            <p className="text-[12px] font-bold text-[#6b5c4a] leading-relaxed text-center sm:text-left">
              Projects are private by default — writers choose what to share.
            </p>
            <button
              onClick={() => navigate("/projects")}
              className="flex-shrink-0 text-[12px] font-bold text-[#2d3748] border border-[#c8bfb0] rounded-full px-4 py-1.5 hover:border-[#2d3748] transition-all"
            >
              Share your project
            </button>
          </div>
        </div>
      )}
    </section>
  );
}