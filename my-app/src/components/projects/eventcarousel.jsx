import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "@/config/api";

// ─── Helpers ──────────────────────────────────────────────────

function fmt(n) { return (n ?? 0).toLocaleString(); }

function daysLeft(endDate) {
  return Math.max(0, Math.ceil((new Date(endDate) - Date.now()) / 86400000));
}

function genreColor(genre) {
  const map = {
    fantasy: "#7c3aed", romance: "#db2777", thriller: "#ea580c",
    mystery: "#ea580c", "sci-fi": "#3b82f6", horror: "#ef4444",
    literary: "#16a34a", historical: "#ca8a04", adventure: "#10b981",
  };
  return map[(genre || "").toLowerCase().trim()] || "#9a8c7a";
}

function initials(username) { return (username || "?").slice(0, 2).toUpperCase(); }

const AVATAR_COLORS = [
  { bg: "#eeedfe", text: "#3c3489" }, { bg: "#e1f5ee", text: "#085041" },
  { bg: "#faece7", text: "#712b13" }, { bg: "#fbeaf0", text: "#72243e" },
  { bg: "#e6f1fb", text: "#0c447c" }, { bg: "#faeeda", text: "#633806" },
];

function avatarColor(username) {
  let hash = 0;
  for (let i = 0; i < (username || "").length; i++) hash += username.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ─── Streak flame display ─────────────────────────────────────
function StreakFlame({ streak, goal }) {
  const pct = goal > 0 ? Math.min((streak / goal) * 100, 100) : 0;
  const done = streak >= goal;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-base" title={done ? "Goal reached!" : `${streak}/${goal} days`}>
        {done ? "🏆" : "🔥"}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-bold text-[#2d3748]">
          {streak} day{streak !== 1 ? "s" : ""} {done ? "— Complete!" : "streak"}
        </span>
        <div className="w-16 h-1 bg-[#e8e0d0] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: done ? "#16a34a" : "#f59e0b" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Participant card inside event ───────────────────────────
function ParticipantCard({ participation }) {
  const { project, currentStreak, completed } = participation;
  const av = avatarColor(project.user?.username);

  const tracker = project.trackerType;
  let progressText = "";
  if (tracker === "WORD_COUNT" && project.targetWordCount) {
    progressText = `${fmt(project.currentWordCount)} / ${fmt(project.targetWordCount)} words`;
  } else if (tracker === "CHAPTERS" && project.targetChapters) {
    progressText = `${project.currentChapters} / ${project.targetChapters} chapters`;
  } else if (tracker === "SCENES" && project.targetScenes) {
    progressText = `${project.currentScenes} / ${project.targetScenes} scenes`;
  }

  return (
    <div className={`flex-shrink-0 w-52 rounded-2xl border p-3 space-y-2 transition-all ${
      completed
        ? "border-[#fde68a] bg-[#fffbeb]"
        : "border-[#e8e0d0] bg-white"
    }`}
      style={{ boxShadow: "0 1px 4px rgba(45,35,20,0.06)" }}
    >
      {/* Genre dot + title */}
      {project.genre && (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: genreColor(project.genre) }} />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#9a8c7a]">{project.genre}</span>
        </div>
      )}
      <p className="font-serif text-[13px] text-[#2d3748] leading-snug line-clamp-2">{project.title}</p>

      {/* Streak */}
      <StreakFlame streak={currentStreak} goal={participation.event?.durationDays || 7} />

      {/* Progress text */}
      {progressText && (
        <p className="text-[10px] text-[#9a8c7a]">{progressText}</p>
      )}

      {/* Author */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#f0ebe3]">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
          style={{ background: av.bg, color: av.text }}>
          {initials(project.user?.username)}
        </div>
        <span className="text-[10px] text-[#9a8c7a] truncate">@{project.user?.username}</span>
        {completed && (
          <span className="ml-auto text-[8px] font-bold text-[#16a34a] bg-[#f0fdf4] px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider">
            Done!
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Single event slide ───────────────────────────────────────
function EventSlide({ event, navigate }) {
  const scrollRef = useRef(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const participations = event.participations || [];
  const completed   = participations.filter(p => p.completed);
  const inProgress  = participations.filter(p => !p.completed);
  const sorted      = [...inProgress.sort((a, b) => b.currentStreak - a.currentStreak), ...completed];

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => { checkScroll(); }, [participations]);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  const remaining = daysLeft(event.endDate);

  return (
    <div className="rounded-3xl border border-[#e8e0d0] bg-white overflow-hidden"
      style={{ boxShadow: "0 2px 16px rgba(45,35,20,0.08)" }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#f0ebe3]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-[#b8962e] bg-[#fffbeb] border border-[#fde68a] px-2 py-0.5 rounded-full uppercase tracking-wider">
                🔥 Live event
              </span>
              <span className="text-[10px] text-[#9a8c7a]">{event.durationDays}-day challenge</span>
            </div>
            <h3 className="font-serif text-lg text-[#2d3748] leading-snug">{event.title}</h3>
            {event.description && (
              <p className="text-xs text-[#9a8c7a] mt-0.5 leading-relaxed">{event.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold font-serif text-[#2d3748]">{remaining}</p>
            <p className="text-[10px] text-[#9a8c7a]">day{remaining !== 1 ? "s" : ""} left</p>
          </div>
        </div>

        {/* Community streak bar */}
        {participations.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex -space-x-1.5">
              {participations.slice(0, 5).map((p, i) => {
                const av = avatarColor(p.project?.user?.username);
                return (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{ background: av.bg, color: av.text }}>
                    {initials(p.project?.user?.username)}
                  </div>
                );
              })}
              {participations.length > 5 && (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-[#e8e0d0] flex items-center justify-center text-[9px] font-bold text-[#6b5c4a]">
                  +{participations.length - 5}
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#6b5c4a] font-semibold">
              {participations.length} writer{participations.length !== 1 ? "s" : ""} participating
              {completed.length > 0 && ` · ${completed.length} finished!`}
            </p>
          </div>
        )}
      </div>

      {/* Participants */}
      {sorted.length > 0 ? (
        <div className="relative px-5 py-4">
          {/* Scroll arrows */}
          {canScrollLeft && (
            <button onClick={() => scroll(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-[#e8e0d0] rounded-full flex items-center justify-center shadow-sm hover:border-[#c4bdb4] transition-all">
              ‹
            </button>
          )}
          {canScrollRight && (
            <button onClick={() => scroll(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-[#e8e0d0] rounded-full flex items-center justify-center shadow-sm hover:border-[#c4bdb4] transition-all">
              ›
            </button>
          )}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {sorted.map((p, i) => (
              <ParticipantCard key={i} participation={{ ...p, event }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-[#9a8c7a]">No participants yet. Be the first!</p>
        </div>
      )}

      {/* CTA */}
      <div className="px-5 pb-5">
        <button
          onClick={() => navigate("/projects")}
          className="w-full py-2.5 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all"
        >
          Make your project public to join →
        </button>
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────
export default function EventCarousel() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/projects/events/active`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setEvents(d?.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && events.length === 0) return null;

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-[#e8e0d0]" />
        <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold">
          Community writing event
        </p>
        <div className="h-px flex-1 bg-[#e8e0d0]" />
      </div>

      {loading ? (
        <div className="rounded-3xl border border-[#e8e0d0] bg-white p-6 animate-pulse">
          <div className="h-4 bg-[#e8e0d0] rounded w-1/3 mb-3" />
          <div className="h-6 bg-[#e8e0d0] rounded w-2/3 mb-4" />
          <div className="flex gap-3">
            {[1,2,3].map(i => <div key={i} className="w-52 h-32 bg-[#e8e0d0] rounded-2xl flex-shrink-0" />)}
          </div>
        </div>
      ) : (
        <>
          {events.map((event, i) => (
            <div key={event.id} className={i !== current ? "hidden" : ""}>
              <EventSlide event={event} navigate={navigate} />
            </div>
          ))}

          {/* Dot navigation if multiple events */}
          {events.length > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              {events.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === current ? "bg-[#2d3748] w-4" : "bg-[#c4bdb4]"
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}