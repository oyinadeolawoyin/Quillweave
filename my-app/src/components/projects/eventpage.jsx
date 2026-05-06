import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "../profile/header";
import API_URL from "../../config/api";

// ─── Helpers ──────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtDateShort(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24)));
}
function fmt(n) { return (n ?? 0).toLocaleString(); }

// ─── Arc Progress ─────────────────────────────────────────────
function ArcProgress({ percent = 0, size = 80, color = "#d4af37", trackColor = "rgba(212,175,55,0.15)", strokeW = 7, children }) {
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeW} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
        {children}
      </div>
    </div>
  );
}

// ─── Fade-in wrapper ──────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.6s ease, transform 0.6s ease",
    }}>
      {children}
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────
const ROLE_CONFIG = {
  IRON_PEN:      { label: "Iron Pen",      emoji: "⚔️",  color: "#c4b5fd", bg: "rgba(109,40,217,0.12)", border: "rgba(196,181,253,0.4)" },
  CHAMPION:      { label: "Champion",      emoji: "🏆",  color: "#d4af37", bg: "rgba(212,175,55,0.12)", border: "rgba(212,175,55,0.4)" },
  STREAK_KEEPER: { label: "Streak Keeper", emoji: "🔥",  color: "#6ee7b7", bg: "rgba(16,185,129,0.12)", border: "rgba(110,231,183,0.4)" },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.STREAK_KEEPER;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      <span>{cfg.emoji}</span> {cfg.label}
    </span>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────
function LeaderboardRow({ entry, index, daysTarget }) {
  const pct = daysTarget > 0 ? Math.min(Math.round((entry.streak / daysTarget) * 100), 100) : 0;
  const isTop3 = index < 3;
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <FadeIn delay={60 + index * 40}>
      <div className={`flex items-center gap-3 py-3 px-4 rounded-2xl transition-all ${
        isTop3
          ? "bg-white/5 border border-white/10"
          : "hover:bg-white/5"
      }`}>
        <div className="w-7 text-center flex-shrink-0">
          {index < 3
            ? <span className="text-base">{medals[index]}</span>
            : <span className="text-xs font-bold text-white/40">{index + 1}</span>}
        </div>

        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden border-2"
          style={{ borderColor: isTop3 ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.1)" }}>
          {entry.avatar
            ? <img src={entry.avatar} alt={entry.username} className="w-full h-full object-cover" />
            : <span className="text-white">{(entry.username || "?").charAt(0).toUpperCase()}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">@{entry.username}</p>
          <p className="text-xs text-white/50 truncate">{entry.projectTitle}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:block">
            <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg, #d4af37, #f0c040)" }} />
            </div>
            <p className="text-[10px] text-white/40 mt-0.5 text-right">{pct}%</p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold" style={{ color: "#d4af37" }}>{entry.streak}</p>
            <p className="text-[10px] text-white/40">days</p>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ─── Winner card ──────────────────────────────────────────────
function WinnerCard({ winner, index }) {
  const isChampion = winner.challengeRole === "CHAMPION";
  const isIronPen  = winner.challengeRole === "IRON_PEN";

  return (
    <FadeIn delay={80 + index * 60}>
      <div className={`relative rounded-2xl p-5 border transition-all ${
        isIronPen
          ? "bg-gradient-to-br from-purple-900/30 to-purple-800/10 border-purple-500/20"
          : isChampion
          ? "bg-gradient-to-br from-[#d4af37]/15 to-[#d4af37]/5 border-[#d4af37]/25"
          : "bg-white/5 border-white/10"
      }`}>
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{
              background: index === 0 ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.08)",
              color: index === 0 ? "#d4af37" : "rgba(255,255,255,0.4)",
              border: `1px solid ${index === 0 ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)"}`,
            }}>
            {index + 1}
          </div>

          {/* Avatar */}
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden border-2"
            style={{ borderColor: isIronPen ? "rgba(196,181,253,0.5)" : isChampion ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.1)" }}>
            {winner.user?.avatar
              ? <img src={winner.user.avatar} alt={winner.username} className="w-full h-full object-cover" />
              : <span>{(winner.username || "?").charAt(0).toUpperCase()}</span>}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">@{winner.username}</p>
            <p className="text-xs text-white/50 truncate">{winner.projectTitle}</p>
          </div>

          {/* Stats + badge */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <RoleBadge role={winner.challengeRole} />
            <div className="flex items-center gap-3">
              {winner.finalStreak > 0 && (
                <span className="text-xs font-bold" style={{ color: "#d4af37" }}>🔥 {winner.finalStreak}d</span>
              )}
              {winner.totalWords > 0 && (
                <span className="text-xs text-white/40">{fmt(winner.totalWords)}w</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ─── Community Progress Ring ──────────────────────────────────
function CommunityRing({ communityStreak, daysTarget, participantCount }) {
  const pct = daysTarget > 0 ? Math.min(Math.round((communityStreak / daysTarget) * 100), 100) : 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <div className="relative">
        <ArcProgress percent={pct} size={120} color="#d4af37" trackColor="rgba(212,175,55,0.15)" strokeW={9}>
          <span className="font-serif font-bold text-white leading-none" style={{ fontSize: 26 }}>{communityStreak}</span>
          <span className="text-white/50 leading-none" style={{ fontSize: 10 }}>of {daysTarget}</span>
        </ArcProgress>
        {/* Glow behind ring */}
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: "0 0 32px rgba(212,175,55,0.25)" }} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: "#d4af37" }}>Community Progress</p>
        <p className="font-serif text-3xl font-bold text-white">Day {communityStreak}</p>
        <p className="text-sm text-white/60 mt-1">
          of {daysTarget} · {participantCount} writer{participantCount !== 1 ? "s" : ""} in sync · {pct}% done
        </p>
      </div>
    </div>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────
function StatPill({ label, value, emoji }) {
  return (
    <div className="flex flex-col items-center gap-1 px-5 py-4 rounded-2xl border"
      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
      <span className="text-xl">{emoji}</span>
      <p className="font-serif font-bold text-2xl text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{label}</p>
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────
function MarkdownBody({ content }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none
      prose-headings:font-serif prose-headings:text-white prose-headings:font-bold
      prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
      prose-p:text-white/60 prose-p:leading-relaxed
      prose-strong:text-white/90 prose-em:text-white/70
      prose-li:text-white/60 prose-li:leading-relaxed
      prose-ul:list-disc prose-ol:list-decimal
      prose-blockquote:border-l-2 prose-blockquote:border-[#d4af37]/50
      prose-blockquote:text-white/50 prose-blockquote:pl-4 prose-blockquote:italic
      prose-code:text-[#d4af37] prose-code:bg-white/5
      prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
      prose-hr:border-white/10
      prose-a:text-[#d4af37] prose-a:no-underline hover:prose-a:underline">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Main Event Page ──────────────────────────────────────────
export default function EventPage() {
  const { eventId } = useParams();
  const navigate    = useNavigate();

  const [event,         setEvent]         = useState(null);
  const [communityData, setCommunityData] = useState(null);
  const [winnersData,   setWinnersData]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");

  useEffect(() => {
    if (!eventId) return;
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    setLoading(true);
    setError("");
    try {
      // 10-second timeout so the page never spins forever
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_URL}/events/${eventId}`, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) { setError("Event not found."); setLoading(false); return; }

      const data = await res.json();
      // Handle both { event: {...} } and flat { id, title, ... } response shapes
      const ev = data.event ?? data;

      if (!ev || !ev.id) { setError("Event not found."); setLoading(false); return; }
      setEvent(ev);

      if (ev.type === "DAYS_CHALLENGE") {
        const [streakRes, winnersRes] = await Promise.allSettled([
          fetch(`${API_URL}/events/${eventId}/communityStreak`),
          fetch(`${API_URL}/events/${eventId}/winners`),
        ]);
        if (streakRes.status === "fulfilled" && streakRes.value.ok)
          setCommunityData(await streakRes.value.json());
        if (winnersRes.status === "fulfilled" && winnersRes.value.ok)
          setWinnersData(await winnersRes.value.json());
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Request timed out. Please check your connection and try again.");
      } else {
        setError("Something went wrong loading this event.");
      }
    } finally {
      setLoading(false);
    }
  }

  const isChallenge    = event?.type === "DAYS_CHALLENGE";
  const isActive       = event?.isActive && new Date(event.endDate) > new Date();
  const isEnded        = !isActive && event;
  const daysLeft       = event ? daysUntil(event.endDate) : null;
  const hasWinners     = winnersData?.winners?.length > 0;
  const hasLeaderboard = communityData?.leaderboard?.length > 0;

  function getTypeInfo(type) {
    if (type === "DAYS_CHALLENGE") return { label: "Days Challenge", emoji: "🔥", color: "#d4af37" };
    if (type === "WORKSHOP")       return { label: "Workshop",        emoji: "🎓", color: "#6ee7b7" };
    if (type === "ANNOUNCEMENT")   return { label: "Announcement",    emoji: "📣", color: "#93c5fd" };
    return                                { label: "Event",           emoji: "✨", color: "#c4b5fd" };
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #1a202c 100%)" }}>
      <Header />
      <div className="flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
          <p className="text-sm text-white/50">Loading event...</p>
        </div>
      </div>
    </div>
  );

  if (error || !event) return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #1a202c 100%)" }}>
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-32 text-center">
        <p className="text-4xl mb-4">🌙</p>
        <p className="text-white/60 mb-6">{error || "Event not found."}</p>
        <button onClick={() => navigate("/snippets")}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-[#1a202c] transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #d4af37, #f0c040)" }}>
          Back to Community
        </button>
      </div>
    </div>
  );

  const typeInfo = getTypeInfo(event.type);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #1a202c 0%, #243048 40%, #1e2a3a 100%)" }}>
      <Header />

      {/* ── HERO SECTION ───────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(212,175,55,0.08) 0%, transparent 60%),
                              radial-gradient(ellipse at 80% 20%, rgba(45,55,72,0.6) 0%, transparent 60%)`,
          }} />

        {/* Banner image overlay */}
        {event.bannerUrl && (
          <div className="absolute inset-0">
            <img src={event.bannerUrl} alt="" className="w-full h-full object-cover opacity-10" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(26,32,44,0.3), rgba(26,32,44,0.95))" }} />
          </div>
        )}

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
          {/* Back link */}
          <FadeIn delay={0}>
            <Link to="/snippets"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors mb-8">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Community
            </Link>
          </FadeIn>

          <div className="grid lg:grid-cols-[1fr_360px] gap-10 lg:gap-16 items-start">
            {/* Left — Title & meta */}
            <div>
              <FadeIn delay={60}>
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {/* Type badge */}
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border"
                    style={{ color: typeInfo.color, background: `${typeInfo.color}18`, borderColor: `${typeInfo.color}35` }}>
                    <span>{typeInfo.emoji}</span> {typeInfo.label}
                  </span>
                  {/* Status */}
                  <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border"
                    style={isActive
                      ? { color: "#6ee7b7", background: "rgba(110,231,183,0.1)", borderColor: "rgba(110,231,183,0.25)" }
                      : { color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
                    {isActive ? "● Live" : "Ended"}
                  </span>
                  {/* Days left */}
                  {isActive && daysLeft !== null && (
                    <span className="text-[11px] font-semibold text-white/50">
                      {daysLeft === 0 ? "Last day!" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
                    </span>
                  )}
                </div>
              </FadeIn>

              <FadeIn delay={100}>
                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                  {event.title}
                </h1>
              </FadeIn>

              <FadeIn delay={140}>
                <div className="max-w-xl mb-8">
                  <MarkdownBody content={event.description || ""} />
                </div>
              </FadeIn>

              {/* Date pills */}
              <FadeIn delay={160}>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                    <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest font-semibold">Start</p>
                      <p className="text-xs font-semibold text-white/80">{fmtDate(event.startDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                    <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest font-semibold">End</p>
                      <p className="text-xs font-semibold text-white/80">{fmtDate(event.endDate)}</p>
                    </div>
                  </div>
                  {isChallenge && event.daysTarget && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border"
                      style={{ background: "rgba(212,175,55,0.06)", borderColor: "rgba(212,175,55,0.2)" }}>
                      <span className="text-sm">🎯</span>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "rgba(212,175,55,0.6)" }}>Target</p>
                        <p className="text-xs font-semibold" style={{ color: "#d4af37" }}>{event.daysTarget} consecutive days</p>
                      </div>
                    </div>
                  )}
                </div>
              </FadeIn>
            </div>

            {/* Right — Live stats card */}
            {isChallenge && isActive && communityData && communityData.participantCount > 0 && (
              <FadeIn delay={200}>
                <div className="rounded-3xl border overflow-hidden"
                  style={{ background: "rgba(212,175,55,0.05)", borderColor: "rgba(212,175,55,0.2)", boxShadow: "0 0 40px rgba(212,175,55,0.08)" }}>
                  {/* Gold top bar */}
                  <div className="h-1 w-full"
                    style={{ background: "linear-gradient(90deg, #b8962e, #d4af37, #f0c040, #d4af37, #b8962e)" }} />
                  <div className="p-6">
                    <p className="text-[10px] uppercase tracking-widest font-bold mb-5" style={{ color: "#d4af37" }}>Live Community Progress</p>
                    <CommunityRing
                      communityStreak={communityData.communityStreak}
                      daysTarget={communityData.daysTarget}
                      participantCount={communityData.participantCount}
                    />
                  </div>
                </div>
              </FadeIn>
            )}

            {/* Right — Ended summary */}
            {isChallenge && isEnded && hasWinners && (
              <FadeIn delay={200}>
                <div className="rounded-3xl border overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }}>
                  <div className="h-1 w-full"
                    style={{ background: "linear-gradient(90deg, #6d28d9, #d4af37, #be185d)" }} />
                  <div className="p-6">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-3">Challenge Summary</p>
                    <div className="grid grid-cols-3 gap-3">
                      <StatPill label="Finishers" value={winnersData.winners.length} emoji="🏅" />
                      <StatPill label="Days" value={winnersData.daysTarget ?? "—"} emoji="📅" />
                      <StatPill
                        label="Top Words"
                        value={fmt(Math.max(...winnersData.winners.map(w => w.totalWords || 0)))}
                        emoji="✍️"
                      />
                    </div>
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        </div>
      </div>

      {/* ── DIVIDER ────────────────────────────────────────── */}
      <div className="relative">
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)" }} />
      </div>

      {/* ── CONTENT SECTION ────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-10">

        {/* ── Winners shoutout ─── */}
        {isChallenge && isEnded && hasWinners && (
          <FadeIn delay={60}>
            <section>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: "#d4af37" }}>
                    Challenge Complete
                  </p>
                  <h2 className="font-serif text-2xl font-bold text-white">Hall of Fame</h2>
                  <p className="text-sm text-white/50 mt-1">Writers who kept the chain alive</p>
                </div>
                {/* Role legend */}
                <div className="hidden sm:flex items-center gap-4">
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className="text-sm">{cfg.emoji}</span>
                      <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile legend */}
              <div className="sm:hidden flex flex-wrap gap-3 mb-5">
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span>{cfg.emoji}</span>
                    <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>{cfg.label}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {winnersData.winners.map((winner, i) => (
                  <WinnerCard key={winner.userId || i} winner={winner} index={i} />
                ))}
              </div>
            </section>
          </FadeIn>
        )}

        {/* ── Live leaderboard ─── */}
        {isChallenge && isActive && hasLeaderboard && (
          <FadeIn delay={80}>
            <section>
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: "#d4af37" }}>
                  Live Leaderboard
                </p>
                <h2 className="font-serif text-2xl font-bold text-white">Writers in this challenge</h2>
                <p className="text-sm text-white/50 mt-1">Ranked by streak — miss a day and the chain breaks</p>
              </div>

              <div className="rounded-3xl border overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="p-2">
                  {communityData.leaderboard.map((entry, i) => (
                    <LeaderboardRow key={entry.projectId} entry={entry} index={i} daysTarget={communityData.daysTarget} />
                  ))}
                </div>
              </div>
            </section>
          </FadeIn>
        )}

        {/* Empty — active but no participants yet */}
        {isChallenge && isActive && !hasLeaderboard && (
          <FadeIn delay={60}>
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔥</div>
              <p className="font-serif text-xl font-bold text-white mb-2">The challenge has begun</p>
              <p className="text-sm text-white/50 mb-6">No participants yet — be the first to join from your project page</p>
              <Link to="/projects"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-[#1a202c] hover:scale-105 transition-transform"
                style={{ background: "linear-gradient(135deg, #d4af37, #f0c040)" }}>
                Go to my projects
              </Link>
            </div>
          </FadeIn>
        )}

        {/* Ended — no winners recorded yet */}
        {isChallenge && isEnded && !hasWinners && (
          <FadeIn delay={60}>
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📜</div>
              <p className="font-serif text-xl font-bold text-white mb-2">Challenge complete</p>
              <p className="text-sm text-white/50">Results are being tallied and will appear here soon</p>
            </div>
          </FadeIn>
        )}

        {/* Non-challenge event */}
        {!isChallenge && (
          <FadeIn delay={60}>
            <div className="text-center py-20">
              <div className="text-5xl mb-4">{typeInfo.emoji}</div>
              <p className="font-serif text-xl font-bold text-white mb-2">Check the community for updates</p>
              <p className="text-sm text-white/50 mb-6">Follow along in the community feed for the latest on this event</p>
              <Link to="/snippets"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-[#1a202c] hover:scale-105 transition-transform"
                style={{ background: "linear-gradient(135deg, #d4af37, #f0c040)" }}>
                Go to Community
              </Link>
            </div>
          </FadeIn>
        )}
      </div>

      {/* ── FOOTER GLOW ────────────────────────────────────── */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)" }} />
      <div className="pb-16" />
    </div>
  );
}