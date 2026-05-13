// src/pages/EventsListPage.jsx
// Route: /events
// Shows all active and past platform events. Uses the app's dark-blue theme.

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../profile/header";
import API_URL from "@/config/api";

// ─── Helpers ──────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24)));
}

// ─── Type config ──────────────────────────────────────────────
const TYPE_CONFIG = {
  DAYS_CHALLENGE: { label: "Days Challenge", emoji: "🔥", color: "#d4af37",  bg: "rgba(212,175,55,0.12)",  border: "rgba(212,175,55,0.35)" },
  WORKSHOP:       { label: "Workshop",        emoji: "🎓", color: "#6ee7b7",  bg: "rgba(110,231,183,0.10)", border: "rgba(110,231,183,0.30)" },
  ANNOUNCEMENT:   { label: "Announcement",    emoji: "📣", color: "#93c5fd",  bg: "rgba(147,197,253,0.10)", border: "rgba(147,197,253,0.30)" },
  OTHER:          { label: "Event",           emoji: "✨", color: "#c4b5fd",  bg: "rgba(196,181,253,0.10)", border: "rgba(196,181,253,0.30)" },
};
function typeOf(type) { return TYPE_CONFIG[type] || TYPE_CONFIG.OTHER; }

// ─── Fade-in wrapper ──────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={className} style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(18px)",
      transition: "opacity 0.55s ease, transform 0.55s ease",
    }}>
      {children}
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────
function EventCard({ event, index }) {
  const cfg      = typeOf(event.type);
  const isActive = event.isActive && new Date(event.endDate) > new Date();
  const dLeft    = isActive ? daysUntil(event.endDate) : null;

  return (
    <FadeIn delay={80 + index * 50}>
      <Link
        to={`/events/${event.id}`}
        className="group block relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
        style={{
          background:   "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
          border:       "1px solid rgba(255,255,255,0.08)",
          boxShadow:    "0 2px 12px rgba(0,0,0,0.2)",
        }}
      >
        {/* Hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${cfg.color}12 0%, transparent 70%)` }}
        />

        {/* Color top bar */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

        {/* Banner image (if any) */}
        {event.bannerUrl && (
          <div className="relative h-28 overflow-hidden">
            <img src={event.bannerUrl} alt="" className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(13,19,32,0.9) 100%)" }} />
          </div>
        )}

        <div className="relative p-5">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
              style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
            >
              {cfg.emoji} {cfg.label}
            </span>

            {isActive ? (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
                style={{ color: "#6ee7b7", background: "rgba(110,231,183,0.1)", borderColor: "rgba(110,231,183,0.25)" }}>
                ● Live
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-2.5 py-1 rounded-full border"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}>
                Ended
              </span>
            )}

            {isActive && dLeft !== null && (
              <span className="text-[10px] text-white/40 font-semibold">
                {dLeft === 0 ? "Last day!" : `${dLeft}d left`}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-serif text-lg font-bold text-white leading-snug mb-2 group-hover:text-white transition-colors">
            {event.title}
          </h3>

          {/* Description excerpt */}
          {event.description && (
            <p className="text-sm text-white/45 leading-relaxed line-clamp-2 mb-4">
              {event.description.replace(/[#*_`>]/g, "").slice(0, 130)}
              {event.description.length > 130 ? "…" : ""}
            </p>
          )}

          {/* Date row + CTA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-white/35">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {fmtDate(event.startDate)} – {fmtDate(event.endDate)}
              </div>
              {event.type === "DAYS_CHALLENGE" && event.daysTarget && (
                <span className="text-[11px] font-semibold" style={{ color: "rgba(212,175,55,0.6)" }}>
                  🎯 {event.daysTarget}d
                </span>
              )}
            </div>

            <span
              className="flex items-center gap-1 text-xs font-semibold transition-all group-hover:gap-2"
              style={{ color: cfg.color }}
            >
              View
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </FadeIn>
  );
}

// ─── Empty state ──────────────────────────────────────────────
function EmptyState({ filter }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">
        {filter === "active" ? "🌙" : filter === "ended" ? "📜" : "✨"}
      </div>
      <p className="font-serif text-xl font-bold text-white mb-2">
        {filter === "active" ? "No active events right now" : filter === "ended" ? "No past events yet" : "No events yet"}
      </p>
      <p className="text-sm text-white/40">
        {filter === "active" ? "Check back soon — something's always brewing." : "Past events will appear here once they end."}
      </p>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="h-0.5 w-full bg-white/10" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-white/10 rounded-full" />
          <div className="h-5 w-14 bg-white/10 rounded-full" />
        </div>
        <div className="h-6 bg-white/10 rounded w-3/4" />
        <div className="h-4 bg-white/10 rounded w-full" />
        <div className="h-4 bg-white/10 rounded w-2/3" />
        <div className="h-4 bg-white/10 rounded w-1/2 mt-2" />
      </div>
    </div>
  );
}

// ─── Filter tab ───────────────────────────────────────────────
function FilterTab({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
      style={active
        ? { background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }
        : { background: "transparent", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.06)" }
      }
    >
      {label}
      {count !== undefined && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={active
            ? { background: "rgba(212,175,55,0.2)", color: "#d4af37" }
            : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function EventsListPage() {
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("all"); // "all" | "active" | "ended"

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      // Try the admin/all endpoint first; fall back to active-only if unauthorised
      const res = await fetch(`${API_URL}/events/admin/all`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAllEvents(data.events || []);
      } else {
        // Not admin — just show active events
        const pubRes = await fetch(`${API_URL}/events/active`);
        if (pubRes.ok) {
          const data = await pubRes.json();
          setAllEvents(data.events || []);
        }
      }
    } catch {
      // Try public fallback silently
      try {
        const pubRes = await fetch(`${API_URL}/events/active`);
        if (pubRes.ok) {
          const data = await pubRes.json();
          setAllEvents(data.events || []);
        }
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const activeEvents = allEvents.filter(e => e.isActive && new Date(e.endDate) > now);
  const endedEvents  = allEvents.filter(e => !e.isActive || new Date(e.endDate) <= now);

  const displayed =
    filter === "active" ? activeEvents :
    filter === "ended"  ? endedEvents  :
    allEvents;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #0d1320 0%, #141c2e 35%, #1a2540 65%, #1e2d4a 100%)" }}
    >
      <Header />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 15% 60%, rgba(37,99,235,0.12) 0%, transparent 55%),
              radial-gradient(ellipse at 85% 20%, rgba(212,175,55,0.07) 0%, transparent 50%)
            `,
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize:  "24px 24px",
          }}
        />
        {/* Gold top line */}
        <div
          className="absolute top-0 left-8 right-8 h-px"
          style={{ background: "linear-gradient(90deg, transparent, #d4af37 40%, #d4af37 60%, transparent)" }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-10">
          <FadeIn delay={0}>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#d4af37] mb-2">
              Inkwell Events
            </p>
          </FadeIn>
          <FadeIn delay={60}>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
              Challenges &amp; Community Events
            </h1>
          </FadeIn>
          <FadeIn delay={100}>
            <p className="text-sm text-white/50 max-w-xl leading-relaxed">
              Join writing challenges, workshops, and community events. Track your streak, compete with other writers, and earn badges.
            </p>
          </FadeIn>

          {/* Filter tabs */}
          {!loading && (
            <FadeIn delay={140}>
              <div className="flex items-center gap-2 mt-7 flex-wrap">
                <FilterTab label="All"    count={allEvents.length}  active={filter === "all"}    onClick={() => setFilter("all")}    />
                <FilterTab label="Active" count={activeEvents.length} active={filter === "active"} onClick={() => setFilter("active")} />
                <FilterTab label="Ended"  count={endedEvents.length}  active={filter === "ended"}  onClick={() => setFilter("ended")}  />
              </div>
            </FadeIn>
          )}
        </div>
      </div>

      {/* ── Gold divider ─────────────────────────────────────── */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.18), transparent)" }} />

      {/* ── Events grid ──────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <>
            {/* Active section header (when showing all) */}
            {filter === "all" && activeEvents.length > 0 && (
              <FadeIn delay={60}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6ee7b7]">● Live Now</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(110,231,183,0.15)" }} />
                </div>
              </FadeIn>
            )}

            {filter === "all" ? (
              <>
                {/* Active events first */}
                {activeEvents.length > 0 && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                    {activeEvents.map((ev, i) => <EventCard key={ev.id} event={ev} index={i} />)}
                  </div>
                )}

                {/* Past events */}
                {endedEvents.length > 0 && (
                  <>
                    <FadeIn delay={200}>
                      <div className="flex items-center gap-3 mb-5">
                        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Past Events</span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                      </div>
                    </FadeIn>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {endedEvents.map((ev, i) => <EventCard key={ev.id} event={ev} index={activeEvents.length + i} />)}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayed.map((ev, i) => <EventCard key={ev.id} event={ev} index={i} />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer spacer */}
      <div className="pb-16" />
    </div>
  );
}