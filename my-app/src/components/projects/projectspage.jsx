import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../profile/header";
import API_URL from "../../config/api";

const STATUS_LABEL = {
  IN_PROGRESS: { label: "In progress", color: "#2d6e5a", bg: "#f0fdf4", border: "#bbf7d0" },
  COMPLETED:   { label: "Completed",   color: "#b8962e", bg: "#fffbeb", border: "#fde68a" },
  ON_HOLD:     { label: "On hold",     color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" },
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24)));
}

// ─── Mini Arc Ring ────────────────────────────────────────────
function MiniRing({ percent, color, size = 44, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e0d0" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-[#2d3748]" style={{ fontSize: size * 0.24 }}>{percent}%</span>
      </div>
    </div>
  );
}

// ─── Thin bar ─────────────────────────────────────────────────
function ThinBar({ percent, color }) {
  return (
    <div className="w-full h-1 bg-[#ede9e3] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${percent}%`, background: color }} />
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────
function ProjectCard({ project }) {
  const navigate = useNavigate();
  const status = STATUS_LABEL[project.status] || STATUS_LABEL.IN_PROGRESS;
  const daysLeft = daysUntil(project.deadline);

  const wordPct = project.targetWordCount
    ? Math.min(Math.round((project.currentWordCount / project.targetWordCount) * 100), 100) : 0;
  const chPct = project.targetChapters
    ? Math.min(Math.round((project.currentChapters / project.targetChapters) * 100), 100) : 0;
  const scPct = project.targetScenes
    ? Math.min(Math.round((project.currentScenes / project.targetScenes) * 100), 100) : 0;

  const hasWords    = project.targetWordCount > 0;
  const hasChapters = project.targetChapters > 0;
  const hasScenes   = project.targetScenes > 0;
  const hasAnyGoal  = hasWords || hasChapters || hasScenes;

  // Deadline urgency
  const deadlineUrgent = daysLeft !== null && daysLeft <= 7;
  const deadlineColor  = daysLeft === 0 ? "#ef4444" : deadlineUrgent ? "#c47d1e" : "#6b5c4a";

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group cursor-pointer rounded-3xl border border-[#e8e0d0] bg-white overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 6px 20px rgba(45,35,20,0.06)" }}
    >
      {/* Gold top accent bar */}
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #d4af37 0%, #2d3748 100%)" }} />

      <div className="p-5">
        {/* Status + genre chips */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
            style={{ color: status.color, background: status.bg, borderColor: status.border }}>
            {status.label}
          </span>
          {project.genre && (
            <span className="text-[10px] text-[#9a8c7a] bg-[#faf7f2] border border-[#e8e0d0] px-2 py-0.5 rounded-full">
              {project.genre}
            </span>
          )}
          {project.visibility === "PUBLIC" && (
            <span className="text-[10px] text-[#9a8c7a] bg-[#faf7f2] border border-[#e8e0d0] px-2 py-0.5 rounded-full">
              Public
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-serif text-lg text-[#2d3748] leading-snug mb-1 group-hover:text-[#1a2535] transition-colors">
          {project.title}
        </h3>
        {project.description && (
          <p className="text-xs text-[#9a8c7a] leading-relaxed line-clamp-2 mb-4">{project.description}</p>
        )}

        {/* Progress rings — only for goals that exist */}
        {hasAnyGoal && (
          <div className="flex items-center gap-4 mb-4">
            {hasWords && (
              <div className="flex flex-col items-center gap-1">
                <MiniRing percent={wordPct} color="#2d6e5a" />
                <p className="text-[10px] text-[#9a8c7a]">words</p>
              </div>
            )}
            {hasChapters && (
              <div className="flex flex-col items-center gap-1">
                <MiniRing percent={chPct} color="#b8962e" />
                <p className="text-[10px] text-[#9a8c7a]">chapters</p>
              </div>
            )}
            {hasScenes && (
              <div className="flex flex-col items-center gap-1">
                <MiniRing percent={scPct} color="#6d28d9" />
                <p className="text-[10px] text-[#9a8c7a]">scenes</p>
              </div>
            )}
            {/* Primary word count on the right */}
            {hasWords && (
              <div className="ml-auto text-right">
                <p className="font-serif text-xl font-bold text-[#2d3748] leading-none">
                  {(project.currentWordCount || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-[#9a8c7a] mt-0.5">of {project.targetWordCount.toLocaleString()} words</p>
                <ThinBar percent={wordPct} color="#2d6e5a" />
              </div>
            )}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-3 border-t border-[#f0ebe3]">
          <div className="flex items-center gap-3">
            {daysLeft !== null && (
              <span className="text-xs font-semibold tabular-nums" style={{ color: deadlineColor }}>
                {daysLeft === 0 ? "Past due" : `${daysLeft}d left`}
              </span>
            )}
            {project.daysPerWeek && (
              <span className="text-[10px] text-[#b8a898]">{project.daysPerWeek}×/week</span>
            )}
          </div>
          <span className="text-[#c4bdb4] group-hover:text-[#d4af37] transition-colors text-sm font-semibold">
            View →
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/projects/myProjects`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setProjects(d.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? projects : projects.filter(p => p.status === filter);

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[#2d3748]">My projects</h1>
            <p className="text-sm text-[#9a8c7a] mt-0.5">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={() => navigate("/projects/create")}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all"
          >
            + New project
          </button>
        </div>

        {/* Filter tabs */}
        {projects.length > 0 && (
          <div className="flex gap-1 mb-7 p-1 bg-white border border-[#e8e0d0] rounded-2xl w-fit"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {["ALL", "IN_PROGRESS", "COMPLETED", "ON_HOLD"].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filter === s
                    ? "bg-[#2d3748] text-white"
                    : "text-[#6b5c4a] hover:text-[#2d3748]"
                }`}>
                {s === "ALL" ? "All" : STATUS_LABEL[s]?.label || s}
                {s !== "ALL" && (
                  <span className="ml-1.5 opacity-50">{projects.filter(p => p.status === s).length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="cozy-card animate-pulse">
                <div className="h-4 bg-[#e8e0d0] rounded w-2/3 mb-3" />
                <div className="h-10 bg-[#e8e0d0] rounded-2xl mb-3" />
                <div className="h-3 bg-[#e8e0d0] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#e8e0d0]"
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.06)" }}>
            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-[#e8e0d0] mx-auto mb-4 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#c4bdb4]" />
            </div>
            <h2 className="font-serif text-2xl text-[#2d3748] mb-2">
              {filter === "ALL" ? "No projects yet" : `No ${STATUS_LABEL[filter]?.label?.toLowerCase()} projects`}
            </h2>
            <p className="text-sm text-[#9a8c7a] max-w-xs mx-auto mb-8 leading-relaxed">
              {filter === "ALL"
                ? "Every great story starts somewhere. Add your first project and let Inkwell help you finish it."
                : "Try a different filter, or create a new project."}
            </p>
            {filter === "ALL" && (
              <button
                onClick={() => navigate("/projects/create")}
                className="relative inline-flex items-center gap-2 px-6 py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all">
                + Add your first project
                <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#d4af37] rounded-full animate-ping" />
                <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#d4af37] rounded-full" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </main>
    </div>
  );
}