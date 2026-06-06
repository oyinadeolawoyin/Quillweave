// src/components/Homepage.jsx
// Layout mirrors Critique Circle proportions:
//   - Top: profile/stats bar (logged-in) or guest hero
//   - Two columns: Left (wider) | Right (narrower)
//     LEFT:  DailyEmotion → LastGroupSprintRecap → AccountabilitySection
//     RIGHT: MySubmissions → SpotlightList → EventsSection

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./components/auth/authContext";
import API_URL from "./config/api";
import Header from "./components/profile/header";
import DailyEmotion from "./components/emotioncues/dailyemotion";
import { StartGroupSprintModal } from "./components/sprint/groupSprintModal";
import LastGroupSprintRecap from "./components/sprint/lastgroupsprintrecap";

// ─── Update weekly ────────────────────────────────────────────────────────────
const DISCORD_INVITE = "https://discord.gg/TntmfbkxB";

// ─── Constants ────────────────────────────────────────────────────────────────
const TIER_META = {
  Bronze:   { color: "#b8622a", bg: "#fdf3e8" },
  Silver:   { color: "#6b7280", bg: "#f3f4f6" },
  Gold:     { color: "#b8860b", bg: "#fdf9ed" },
  Platinum: { color: "#1a5fb4", bg: "#e8f0fb" },
  Diamond:  { color: "#c0392b", bg: "#fdf1f0" },
};

const TIER_COSTS = [
  { tier: "TIER_1000", label: "≤ 1,000 words", pts: 10 },
  { tier: "TIER_2000", label: "≤ 2,000 words", pts: 20 },
  { tier: "TIER_3000", label: "≤ 3,000 words", pts: 30 },
  { tier: "TIER_4000", label: "≤ 4,000 words", pts: 40 },
  { tier: "TIER_5000", label: "≤ 5,000 words", pts: 50 },
];

const TIER_WORD_LABELS = {
  TIER_1000: "≤ 1,000 words",
  TIER_2000: "≤ 2,000 words",
  TIER_3000: "≤ 3,000 words",
  TIER_4000: "≤ 4,000 words",
  TIER_5000: "≤ 5,000 words",
};

const EVENT_TYPE_LABELS = {
  DAYS_CHALLENGE: "Writing Challenge",
  WORKSHOP:       "Workshop",
  ANNOUNCEMENT:   "Announcement",
  OTHER:          "Community Event",
};
const EVENT_TYPE_COLORS = {
  DAYS_CHALLENGE: "#1a5fb4",
  WORKSHOP:       "#059669",
  ANNOUNCEMENT:   "#d4af37",
  OTHER:          "#b8860b",
};

function spotlightDays(sub) {
  const since = sub.updatedAt ?? sub.createdAt;
  return since ? (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24) : 0;
}

// ─── Skeleton pulse line ──────────────────────────────────────────────────────
function Bone({ w = "w-full", h = "h-3" }) {
  return <div className={`${h} ${w} bg-[#ece8e1] rounded animate-pulse`} />;
}

// ─── Critique progress (3 segments) ──────────────────────────────────────────
function CritBar({ count, max = 3 }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-sm"
            style={{ background: i < count ? "#1a1a2e" : "#e2ddd6" }}
          />
        ))}
      </div>
      <span className="text-[10px] text-[#9a8c7a] tabular-nums">{count}/{max}</span>
    </div>
  );
}

// ─── STATUS PILL ─────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cfg = {
    SPOTLIGHT: { label: "Spotlight", color: "#b8860b", bg: "#fdf9ed", border: "#f0d98a" },
    QUEUE:     { label: "Queue",     color: "#1a5fb4", bg: "#e8f0fb", border: "#b5d4f4" },
    ARCHIVE:   { label: "Archive",   color: "#9a8c7a", bg: "#f4f1ec", border: "#e2ddd6" },
  }[status] ?? { label: status, color: "#9a8c7a", bg: "#f4f1ec", border: "#e2ddd6" };

  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <h2
      className="font-serif text-[#1a1a2e] text-base font-semibold uppercase tracking-wider mb-3 pb-2 border-b border-[#e8e0d0] pl-3"
      style={{ letterSpacing: "0.06em", borderLeft: "3px solid #d4af37" }}
    >
      {children}
    </h2>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TOP PROFILE BAR — mirrors Critique Circle's profile header exactly
// Large avatar left, name + role below, stats row inline right
// ═════════════════════════════════════════════════════════════════════════════
function ProfileBar({ user, wallet }) {
  if (!user) return null;

  const tier   = wallet?.tier;
  const meta   = TIER_META[tier?.name] ?? TIER_META.Bronze;
  const bal    = wallet?.postingBalance ?? 0;
  const rep    = wallet?.reputation ?? 0;
  const given  = wallet?.critiqueCount ?? 0;
  const active = wallet?.activeChapterCount ?? 0;

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    : null;

  return (
    <div className="bg-white border-b-2 border-[#d4af37]/30" style={{ borderTop: "3px solid #d4af37" }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-5">
        {/* ── Row: avatar + name block + stats ── */}
        <div className="flex items-start gap-5">

          {/* Large avatar — gold ring */}
          <div
            className="w-20 h-20 rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-2xl ring-2 ring-[#d4af37]/60"
            style={{ backgroundColor: "#1a1a2e" }}
          >
            {user.avatar
              ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              : <span>{user.username?.charAt(0).toUpperCase()}</span>}
          </div>

          {/* Name block + stats */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-serif text-[#1a1a2e] text-xl font-bold leading-tight">{user.username}</span>
              {tier && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ color: meta.color, background: meta.bg, borderColor: meta.color + "40" }}
                >
                  {tier.name}
                </span>
              )}
            </div>

            {/* Username + join date — same line as CC's "oyinade olawoyin · Basic membership" */}
            <p className="text-[12px] text-[#9a8c7a] mb-3">
              {user.email ?? "writer"}
              {joinDate && <span className="mx-1.5">·</span>}
              {joinDate && <span>Joined {joinDate}</span>}
            </p>

            {/* Stats row with icons */}
            <div className="flex items-center gap-5 flex-wrap">
              {/* Points — gold */}
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span className="text-[13px] font-bold text-[#1a1a2e]">{bal}</span>
                <span className="text-[11px] text-[#9a8c7a]">Points</span>
              </div>
              {/* Reputation — blue */}
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a5fb4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                </svg>
                <span className="text-[13px] font-bold text-[#1a1a2e]">{rep}</span>
                <span className="text-[11px] text-[#9a8c7a]">Reputation</span>
              </div>
              {/* Critiques given — message square */}
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a8c7a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span className="text-[13px] font-bold text-[#1a1a2e]">{given}</span>
                <span className="text-[11px] text-[#9a8c7a]">Critiques given</span>
              </div>
              {/* Active chapters — book open */}
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a8c7a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                <span className="text-[13px] font-bold text-[#1a1a2e]">{active}</span>
                <span className="text-[11px] text-[#9a8c7a]">Active chapters</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// GUEST HERO
// ═════════════════════════════════════════════════════════════════════════════
function GuestHero() {
  const navigate = useNavigate();
  return (
    <div className="bg-[#1a1a2e] mb-0">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-10">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-2">Inkwell</p>          <h1 className="font-serif text-white text-2xl sm:text-3xl leading-tight mb-2">
            Write more. Together.
          </h1>
          <p className="text-white/55 text-sm leading-relaxed max-w-md">
            Sprint alongside writers, get feedback on your chapters, and show up every week until the draft is done.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={() => navigate("/signup")}
            className="px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-all"
          >
            Get started free
          </button>
          <button
            onClick={() => navigate("/login")}
            className="px-5 py-2.5 border border-white/20 text-white/70 text-sm font-medium rounded-lg hover:border-white/40 transition-all"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RIGHT — MY SUBMISSIONS  (top-right, mirrors CC's "My stories" section)
// ═════════════════════════════════════════════════════════════════════════════
function MySubmissions({ user, wallet }) {
  const [subs, setSubs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch(`${API_URL}/feedback/submissions/mine?limit=6`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setSubs(d?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const costs     = wallet?.TIER_COSTS ?? {};
  const bal       = wallet?.postingBalance ?? 0;
  const surcharge = wallet?.MULTI_CHAPTER_SURCHARGE ?? 2;
  const active    = wallet?.activeChapterCount ?? 0;
  const isFree    = !!(wallet?.freePostAvailable);
  const cheapest  = Math.min(...Object.values(costs).map(Number), Infinity) + active * surcharge;
  const canPost   = isFree || (Object.keys(costs).length > 0 && bal >= cheapest);

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl p-5 mb-5">
      <SectionTitle>My submissions</SectionTitle>

      {/* ── Guest: cost table + sign-up ── */}
      {!user && (
        <>
          <p className="text-sm text-[#6b5c4a] mb-3">
            Critique a chapter to earn points, then use those points to post your own work.
          </p>
          <div className="border border-[#e8e0d0] rounded-lg overflow-hidden mb-4 text-sm">
            <div className="grid grid-cols-2 bg-[#1a1a2e] px-3 py-2 border-b border-[#e8e0d0] text-[10px] font-semibold text-white/70 uppercase tracking-wide">
              <span>Chapter length</span>
              <span className="text-right">Cost to post</span>
            </div>
            {TIER_COSTS.map(({ tier, label, pts }) => (
              <div key={tier} className="grid grid-cols-2 px-3 py-2 border-b border-[#f0ebe3] last:border-0 text-sm">
                <span className="text-[#4a3f35] text-[12px]">{label}</span>
                <span className="text-right font-semibold text-[#1a1a2e] text-[12px]">{pts} pts</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/signup" className="flex-1 text-center py-2 bg-[#d4af37] text-[#1a1a2e] text-xs font-bold rounded-lg hover:bg-[#c9a42d] transition-all">
              Get started — it's free
            </Link>
            <Link to="/critique" className="flex-1 text-center py-2 border border-[#1a1a2e] text-[#1a1a2e] text-xs font-semibold rounded-lg hover:bg-[#1a1a2e] hover:text-white transition-all">
              Browse chapters
            </Link>
          </div>
        </>
      )}

      {user && loading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="space-y-2 py-2 border-b border-[#f4f1ec] last:border-0">
              <Bone w="w-2/3" h="h-3" />
              <Bone w="w-1/2" h="h-2.5" />
            </div>
          ))}
        </div>
      )}

      {user && !loading && subs.length === 0 && (
        <>
          <p className="text-xs text-[#6b5c4a] mb-3">
            {canPost
              ? "You have enough points to submit a chapter."
              : `You need ${cheapest} pts to post. Critique a chapter to earn points.`}
          </p>
          <Link to="/critique/submit" className="block text-center py-2 bg-[#d4af37] text-[#1a1a2e] text-xs font-bold rounded-lg hover:bg-[#c9a42d] transition-all">
            Submit a chapter
          </Link>
        </>
      )}

      {user && !loading && subs.length > 0 && (
        <>
          {/* Submission list — tight rows matching CC's "Stories to Crit" density */}
          <div className="divide-y divide-[#f4f1ec]">
            {subs.map(sub => {
              const critiqueCount = sub.critiqueCount ?? sub._count?.responses ?? 0;
              const commentCount  = sub._count?.paragraphComments ?? 0;
              return (
                <div key={sub.id} className="py-2.5 first:pt-0 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Link
                        to={`/critique/${sub.id}`}
                        className="font-semibold text-[13px] text-[#1a1a2e] hover:text-[#b8860b] transition-colors leading-snug truncate"
                      >
                        {sub.title}
                      </Link>
                      <StatusPill status={sub.status} />
                    </div>
                    <p className="text-[11px] text-[#9a8c7a]">
                      {sub.genre}
                      <span className="mx-1">·</span>
                      {TIER_WORD_LABELS[sub.wordCountTier]}
                      {commentCount > 0 && <><span className="mx-1">·</span>{commentCount} comment{commentCount !== 1 ? "s" : ""}</>}
                    </p>
                    {sub.status !== "ARCHIVE" ? <CritBar count={critiqueCount} /> : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#f4f1ec] flex items-center justify-between">
            <Link to={`/profile/${user?.id}`} className="text-[11px] text-[#1a5fb4] hover:underline font-semibold">
              View all my submissions
            </Link>
            <Link
              to="/critique/submit"
              className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-all ${
                canPost ? "bg-[#d4af37] text-[#1a1a2e] hover:bg-[#c9a42d]" : "text-[#9a8c7a] border border-[#e8e0d0]"
              }`}
            >
              {isFree ? "Free post" : canPost ? "Submit chapter" : `Need ${cheapest} pts`}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RIGHT — SPOTLIGHT LIST  (mirrors CC's "Stories to Crit" list exactly)
// ═════════════════════════════════════════════════════════════════════════════
function SpotlightList() {
  const [spotlight, setSpotlight] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/feedback/submissions/spotlight`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setSpotlight(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl overflow-hidden mb-5">
      <div className="bg-[#1a1a2e] px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Community</p>
          <h2 className="font-serif text-white text-base font-bold">In the Spotlight</h2>
        </div>
        {!loading && (
          <span className="text-[10px] font-bold text-[#d4af37]">{spotlight.length}/6</span>
        )}
      </div>
      <div className="p-5">
      <p className="text-[11px] text-[#9a8c7a] mb-3">
        3 critiques to graduate · works over 10 days earn critics +2 pts
      </p>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="pb-3 border-b border-[#f4f1ec] last:border-0 space-y-1.5">
              <Bone w="w-2/3" h="h-3" />
              <Bone w="w-1/2" h="h-2.5" />
            </div>
          ))}
        </div>
      )}

      {!loading && spotlight.length === 0 && (
        <div className="py-4 text-center">
          <p className="text-xs text-[#9a8c7a] mb-1">No chapters in the spotlight yet.</p>
          <Link to="/critique/submit" className="text-xs text-[#1a5fb4] hover:underline font-semibold">
            Be the first to submit
          </Link>
        </div>
      )}

      {!loading && spotlight.length > 0 && (
        <div className="divide-y divide-[#f4f1ec]">
          {spotlight.map(sub => {
            const author     = sub.user;
            const responses  = sub.critiqueCount ?? sub._count?.responses ?? 0;
            const comments   = sub._count?.paragraphComments ?? 0;
            const days       = spotlightDays(sub);
            const isLongStay = days > 10;

            return (
              <div key={sub.id} className="py-2.5 first:pt-0 flex items-center gap-2">
                {/* Gray clap icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M9 11L7 9l1.5-1.5 2 2M9 11l4.5-4.5L15 8l-4.5 4.5M9 11l-3 3a4 4 0 0 0 6 5.3L17 14a1.5 1.5 0 0 0-2.1-2.1l-1.4 1.4"/>
                  <path d="M12.5 6.5L14 5l1.5 1.5-1.5 1.5M14 5l1.5-1.5L17 5l-1.5 1.5"/>
                </svg>

                {/* Text block */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <Link
                      to={`/critique/${sub.id}`}
                      className="font-semibold text-[13px] text-[#1a1a2e] hover:text-[#b8860b] transition-colors leading-snug truncate"
                    >
                      {sub.title}
                    </Link>
                    {isLongStay && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                        style={{ color: "#b8860b", background: "#fffdf0", borderColor: "#d4af37", opacity: 0.9 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 15 15"/>
                        </svg>
                        {Math.floor(days)}d · +2 pts
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9a8c7a]">
                    <span className="font-medium uppercase tracking-wide text-[10px] text-[#2d3748]">{sub.genre}</span>
                    <span className="mx-1">·</span>
                    {TIER_WORD_LABELS[sub.wordCountTier]}
                    <span className="mx-1">·</span>
                    by{" "}
                    <Link to={`/profile/${author?.id}`} className="text-[#1a5fb4] hover:underline">
                      {author?.username}
                    </Link>
                    {comments > 0 && <><span className="mx-1">·</span>{comments} comment{comments !== 1 ? "s" : ""}</>}
                  </p>
                </div>

                {/* Critique button — exact CC "Crit Story" style */}
                <Link
                  to={`/critique/${sub.id}`}
                  className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 border border-[#1a1a2e] text-[#1a1a2e] rounded hover:bg-[#1a1a2e] hover:text-white transition-all whitespace-nowrap"
                >
                  Critique
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-[#f4f1ec] flex items-center justify-between">
        <Link to="/critique" className="text-[11px] text-[#1a5fb4] hover:underline font-semibold">
          Browse all chapters
        </Link>
        <Link to="/critique/queue" className="text-[11px] text-[#1a5fb4] hover:underline font-semibold">
          View queue
        </Link>
      </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RIGHT — EVENTS
// ═════════════════════════════════════════════════════════════════════════════
function EventsSection() {
  const [events,      setEvents]      = useState([]);
  const [lastWinners, setLastWinners] = useState(null); // { eventTitle, eventId, winners }
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`${API_URL}/events/active`);
        const data = res.ok ? await res.json() : null;
        const active = (data?.events ?? []).slice(0, 5);
        setEvents(active);

        // If no active events, fetch all events and get winners from the most recent ended one
        if (active.length === 0) {
          try {
            const allRes  = await fetch(`${API_URL}/events/all`);
            if (allRes.ok) {
              const allData  = await allRes.json();
              const ended    = (allData?.events ?? [])
                .filter(e => e.type === "DAYS_CHALLENGE" && !e.isActive)
                .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
              if (ended.length > 0) {
                const wRes = await fetch(`${API_URL}/events/${ended[0].id}/winners`);
                if (wRes.ok) {
                  const wData = await wRes.json();
                  if (wData?.winners?.length > 0) {
                    setLastWinners({ eventId: ended[0].id, eventTitle: wData.eventTitle, winners: wData.winners.slice(0, 3) });
                  }
                }
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const ROLE_EMOJI = { IRON_PEN: "⚔️", CHAMPION: "🏆", STREAK_KEEPER: "🔥" };

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl overflow-hidden">
      <div className="bg-[#d4af37] px-5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a2e]/70 mb-0.5">
          {!loading && events.length === 0 && lastWinners ? "Last challenge" : "Active now"}
        </p>
        <h2 className="font-serif text-[#1a1a2e] text-base font-bold">Community events</h2>
      </div>
      <div className="p-5">

      {loading && (
        <div className="space-y-3">
          {[1,2].map(i => <Bone key={i} w="w-full" h="h-4" />)}
        </div>
      )}

      {/* ── No active events + last winners ── */}
      {!loading && events.length === 0 && lastWinners && (
        <div>
          <Link
            to={`/events/${lastWinners.eventId}`}
            className="block text-[12px] font-semibold text-[#1a1a2e] hover:text-[#b8860b] transition-colors mb-2 truncate"
          >
            {lastWinners.eventTitle}
          </Link>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-2">
            Hall of fame
          </p>
          <div className="space-y-2">
            {lastWinners.winners.map((w, i) => (
              <div key={w.userId ?? i} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-[#faf7f2] border border-[#e8e0d0]">
                {w.avatar ? (
                  <img src={w.avatar} alt={w.username} className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-[#e8e0d0]" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-[#d4af37]">{(w.username || "?").charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#1a1a2e] truncate">@{w.username}</p>
                  <p className="text-[10px] text-[#9a8c7a] truncate">{w.projectTitle}</p>
                </div>
                <span className="text-sm flex-shrink-0" title={w.challengeRole}>
                  {ROLE_EMOJI[w.challengeRole] ?? "🔥"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── No active events, no past winners ── */}
      {!loading && events.length === 0 && !lastWinners && (
        <div className="bg-[#faf7f2] border border-[#e8e0d0] rounded px-3 py-2.5 text-[12px] text-[#9a8c7a]">
          No active challenges right now. Check back soon.
        </div>
      )}

      {/* ── Active events list ── */}
      {!loading && events.length > 0 && (
        <div className="divide-y divide-[#f4f1ec]">
          {events.map(ev => {
            const tagColor = EVENT_TYPE_COLORS[ev.type] ?? "#b8860b";
            const tagLabel = EVENT_TYPE_LABELS[ev.type] ?? "Event";
            const now      = new Date();
            const end      = new Date(ev.endDate);
            const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

            return (
              <div key={ev.id} className="py-2.5 first:pt-0 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/events/${ev.id}`}
                    className="text-[13px] font-semibold text-[#1a1a2e] hover:text-[#b8860b] transition-colors truncate block"
                  >
                    {ev.title}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: tagColor }}>{tagLabel}</span>
                    <span className="text-[10px] text-[#9a8c7a]">·</span>
                    <span className="text-[10px] text-[#9a8c7a]">
                      {daysLeft === 0 ? "Ends today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/events/${ev.id}`}
                  className="flex-shrink-0 text-[11px] font-semibold px-2 py-1 border border-[#1a1a2e] text-[#1a1a2e] rounded hover:bg-[#1a1a2e] hover:text-white transition-all"
                >
                  View
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-[#f4f1ec]">
        <Link to="/events" className="text-[11px] text-[#1a5fb4] hover:underline font-semibold">All events</Link>
      </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEFT — ALARM CLOCK SPRINT STARTER  (replaces plain "Start a sprint" button)
// ═════════════════════════════════════════════════════════════════════════════
function AlarmClockSprintCard({ onStartSprint }) {
  return (
    <div className="flex flex-col items-center py-6 px-4">
      {/* Alarm clock SVG — warm parchment style */}
      <button
        onClick={onStartSprint}
        className="group relative flex flex-col items-center gap-0 focus:outline-none"
        aria-label="Tap to start sprint"
      >
        <svg
          width="120" height="120" viewBox="0 0 120 120"
          className="mb-3 transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
          aria-hidden="true"
        >
          {/* Alarm feet */}
          <ellipse cx="38" cy="108" rx="8" ry="5" fill="#d4af37" opacity="0.85" />
          <ellipse cx="82" cy="108" rx="8" ry="5" fill="#d4af37" opacity="0.85" />
          {/* Clock body */}
          <circle cx="60" cy="60" r="46" fill="#fffdf7" stroke="#d4af37" strokeWidth="3" />
          <circle cx="60" cy="60" r="40" fill="#fffdf7" stroke="#e8e0d0" strokeWidth="1" />
          {/* Bell bumps */}
          <circle cx="60" cy="16" r="7" fill="#d4af37" />
          {/* Tick marks */}
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
            const r1 = i % 3 === 0 ? 30 : 33;
            const r2 = 36;
            const rad = (deg - 90) * Math.PI / 180;
            return (
              <line
                key={deg}
                x1={60 + r1 * Math.cos(rad)}
                y1={60 + r1 * Math.sin(rad)}
                x2={60 + r2 * Math.cos(rad)}
                y2={60 + r2 * Math.sin(rad)}
                stroke="#c8b89a"
                strokeWidth={i % 3 === 0 ? 2 : 1}
              />
            );
          })}
          {/* Hour hand — pointing ~10 o'clock */}
          <line x1="60" y1="60" x2="44" y2="38" stroke="#1a1a2e" strokeWidth="3.5" strokeLinecap="round" />
          {/* Minute hand — pointing ~12 */}
          <line x1="60" y1="60" x2="60" y2="30" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
          {/* Center dot */}
          <circle cx="60" cy="60" r="3" fill="#d4af37" />
          {/* "TAP TO" label inside clock */}
          <text x="60" y="55" textAnchor="middle" fontSize="7" fill="#9a8c7a" fontFamily="serif" letterSpacing="1">TAP TO</text>
        </svg>

        <span className="font-serif text-[#1a1a2e] text-lg font-bold leading-tight">Start Sprint</span>
        <span className="text-[11px] text-[#9a8c7a] mt-1">Focused session to hit your goal</span>
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEFT — ACTIVE SPRINT BANNER (shown when there's a live sprint)
// ═════════════════════════════════════════════════════════════════════════════
function ActiveSprintBanner() {
  const [activeSprints, setActiveSprints] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/sprint/activeGroupSprints`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setActiveSprints(d?.groupSprints ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || activeSprints.length === 0) return null;

  return (
    <div className="mb-4">
      {activeSprints.map(sprint => (
        <Link
          key={sprint.id}
          to={`/group-sprint/${sprint.id}`}
          className="flex items-center gap-3 bg-[#fffdf0] border border-[#d4af37] rounded-lg px-4 py-3 mb-2 hover:bg-[#fff9e0] transition-colors"
        >
          {/* Pulsing live dot */}
          <span className="relative flex-shrink-0">
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-[#d4af37] opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#d4af37]" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[#1a1a2e] leading-tight">
              Sprint live now · {sprint.duration} min ·{" "}
              {sprint._count?.sprints ?? 0} writer{(sprint._count?.sprints ?? 0) !== 1 ? "s" : ""} inside
            </p>
            <p className="text-[10px] text-[#9a8c7a]">hosted by @{sprint.user?.username}</p>
          </div>
          <span className="text-[11px] font-semibold text-[#d4af37] whitespace-nowrap">Join →</span>
        </Link>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEFT — ACCOUNTABILITY / SPRINT SECTION
// ═════════════════════════════════════════════════════════════════════════════
function AccountabilitySection({ user, onStartSprint }) {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl p-6">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e8e0d0]">
        <h2
          className="font-serif text-[#1a1a2e] text-base font-semibold uppercase tracking-wider pl-3"
          style={{ letterSpacing: "0.06em", borderLeft: "3px solid #d4af37" }}
        >
          Community Sprints
        </h2>
        <Link
          to="/accountability"
          className="text-[11px] font-semibold text-[#9a8c7a] hover:text-[#d4af37] transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          How our sprint sessions work
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>

      {/* Last group sprint recap */}
      <LastGroupSprintRecap />

      {/* Active sprint banner — between recap and start clock */}
      <ActiveSprintBanner />

      {/* Alarm clock — tap to start */}
      <AlarmClockSprintCard onStartSprint={onStartSprint} />

      {/* Discord link */}
      <div className="mt-3 pt-3 border-t border-[#f0ebe3] flex items-center justify-center">
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[12px] text-[#5865f2] hover:underline font-semibold"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#5865f2" aria-hidden="true">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Join writers on Discord
        </a>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// GUEST PROMPT MODAL
// ═════════════════════════════════════════════════════════════════════════════
function GuestModal({ onClose }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-7 text-center border border-[#e8e0d0]">
        <h3 className="font-serif text-[#1a1a2e] text-lg mb-2">Join Quillweave first</h3>
        <p className="text-sm text-[#6b5c4a] mb-5 leading-relaxed">
          Sign up to start a solo sprint or sprint with other writers.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={() => navigate("/signup")} className="w-full py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-all">
            Create a free account
          </button>
          <button onClick={() => navigate("/login")} className="w-full py-2.5 border border-[#1a1a2e] text-[#1a1a2e] text-sm font-semibold rounded-lg hover:bg-[#1a1a2e] hover:text-white transition-all">
            Sign in
          </button>
        </div>
        <button onClick={onClose} className="mt-4 text-xs text-[#9a8c7a] hover:text-[#6b5c4a]">
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
export default function Homepage() {
  const { user }                    = useAuth();
  const navigate                    = useNavigate();
  const [wallet, setWallet]         = useState(null);
  const [showSprint, setShowSprint] = useState(false);
  const [showGuest, setShowGuest]   = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/feedback/points/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setWallet(d))
      .catch(() => {});
  }, [user]);

  function handleStartSprint() {
    if (!user) { setShowGuest(true); return; }
    setShowSprint(true);
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Header />

      {/* Profile bar or guest hero */}
      {user ? <ProfileBar user={user} wallet={wallet} /> : <GuestHero />}

      {/* Two-column layout
          Left: ~58% (longer content)
          Right: ~42% (shorter sidebar-like)
          matches CC's left-heavier split */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-7 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-6 items-start">

          {/* ── LEFT COLUMN ── wider, longer content */}
          <div>
            {/* DailyEmotion — full width, not shrinking */}
            <div className="mb-6">
              <DailyEmotion />
            </div>

            {/* Accountability + sprints */}
            <AccountabilitySection user={user} onStartSprint={handleStartSprint} />
          </div>

          {/* ── RIGHT COLUMN ── narrower sidebar */}
          <div>
            <MySubmissions user={user} wallet={wallet} />
            <SpotlightList />
            <EventsSection />
          </div>

        </div>
      </div>

      {showSprint && (
        <StartGroupSprintModal
          isOpen={showSprint}
          onClose={() => setShowSprint(false)}
          onCreated={s => navigate(`/group-sprint/${s.id}`)}
        />
      )}
      {showGuest && <GuestModal onClose={() => setShowGuest(false)} />}
    </div>
  );
}