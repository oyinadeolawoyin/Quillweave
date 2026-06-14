// src/components/Homepage.jsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./components/auth/authContext";
import API_URL from "./config/api";
import Header from "./components/profile/header";
import { StartGroupSprintModal } from "./components/sprint/groupSprintModal";
import LastGroupSprintRecap from "./components/sprint/lastgroupsprintrecap";

const DISCORD_INVITE = "https://discord.gg/TntmfbkxB";

// Pinned thread keywords — threads whose titles contain these (case-insensitive)
// are surfaced first in the homepage preview, in this order.
const PINNED_THREAD_KEYWORDS = ["introduce yourself", "daily writing challenge"];

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

function spotlightDays(sub) {
  const since = sub.updatedAt ?? sub.createdAt;
  return since ? (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24) : 0;
}

function Bone({ w = "w-full", h = "h-3" }) {
  return <div className={`${h} ${w} bg-[#ece8e1] rounded animate-pulse`} />;
}

function CritBar({ count, max = 3 }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className="flex-1 h-1.5 rounded-sm"
            style={{ background: i < count ? "#1a1a2e" : "#e2ddd6" }} />
        ))}
      </div>
      <span className="text-[10px] text-[#9a8c7a] tabular-nums">{count}/{max}</span>
    </div>
  );
}

function StatusPill({ status }) {
  const cfg = {
    SPOTLIGHT: { label: "Spotlight", color: "#b8860b", bg: "#fdf9ed", border: "#f0d98a" },
    QUEUE:     { label: "Queue",     color: "#1a5fb4", bg: "#e8f0fb", border: "#b5d4f4" },
    ARCHIVE:   { label: "Archive",   color: "#9a8c7a", bg: "#f4f1ec", border: "#e2ddd6" },
  }[status] ?? { label: status, color: "#9a8c7a", bg: "#f4f1ec", border: "#e2ddd6" };
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="font-serif text-[#1a1a2e] text-base font-semibold uppercase tracking-wider mb-3 pb-2 border-b border-[#e8e0d0] pl-3"
      style={{ letterSpacing: "0.06em", borderLeft: "3px solid #d4af37" }}>
      {children}
    </h2>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PROFILE BAR
// ═════════════════════════════════════════════════════════════════════════════
function ProfileBar({ user, wallet, streaks, discussionCount = 0 }) {
  if (!user) return null;
  const tier    = wallet?.tier;
  const meta    = TIER_META[tier?.name] ?? TIER_META.Bronze;
  const bal     = wallet?.postingBalance ?? 0;
  const rep     = wallet?.reputation ?? 0;
  const given   = wallet?.critiqueGiven ?? wallet?.critiqueCount ?? 0;
  const active  = wallet?.activeChapterCount ?? 0;
  const currentStreak = streaks?.current ?? 0;
  const longestStreak = streaks?.longest ?? 0;
  const missedDaysInRow = streaks?.missed ?? 0;
  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    : null;

  return (
    <div className="bg-white border-b-2 border-[#d4af37]/30" style={{ borderTop: "3px solid #d4af37" }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-7">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-2xl ring-2 ring-[#d4af37]/60"
            style={{ backgroundColor: "#1a1a2e" }}>
            {user.avatar
              ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              : <span>{user.username?.charAt(0).toUpperCase()}</span>}
          </div>

          {/* Info block */}
          <div className="flex-1 min-w-0">
            {/* Name + tier */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-serif text-[#1a1a2e] text-xl sm:text-2xl font-bold leading-tight">{user.username}</span>
              {tier && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ color: meta.color, background: meta.bg, borderColor: meta.color + "40" }}>
                  {tier.name}
                </span>
              )}
            </div>

            {/* Email / join date */}
            <p className="text-[12px] text-[#9a8c7a] mb-4">
              {user.email ?? "writer"}
              {joinDate && <span className="mx-1.5">·</span>}
              {joinDate && <span>Joined {joinDate}</span>}
            </p>

            {/* Stats grid — wraps gracefully on small screens */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-3">

              {/* Points */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#fdf9ed" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#1a1a2e] leading-none">{bal}</p>
                  <p className="text-[10px] text-[#9a8c7a] mt-0.5">Points</p>
                </div>
              </div>

              {/* Reputation */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#e8f0fb" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a5fb4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#1a1a2e] leading-none">{rep}</p>
                  <p className="text-[10px] text-[#9a8c7a] mt-0.5">Reputation</p>
                </div>
              </div>

              {/* Critiques given */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#f4f1ec" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a8c7a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#1a1a2e] leading-none">{given}</p>
                  <p className="text-[10px] text-[#9a8c7a] mt-0.5">Critiques given</p>
                </div>
              </div>

              {/* Active chapters */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#f4f1ec" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a8c7a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#1a1a2e] leading-none">{active}</p>
                  <p className="text-[10px] text-[#9a8c7a] mt-0.5">Active chapters</p>
                </div>
              </div>

              {/* Discussions — comments posted across threads */}
              <Link to="/threads" className="flex items-center gap-2 group">
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#fdf9ed" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#1a1a2e] leading-none group-hover:text-[#b8860b] transition-colors">{discussionCount}</p>
                  <p className="text-[10px] text-[#9a8c7a] mt-0.5 group-hover:text-[#b8860b] transition-colors">Discussions</p>
                </div>
              </Link>

              {/* Current streak — only shown if participating */}
              {streaks && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#fff7ed" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#1a1a2e] leading-none">{currentStreak}<span className="text-[10px] font-normal text-[#9a8c7a] ml-0.5">d</span></p>
                    <p className="text-[10px] text-[#9a8c7a] mt-0.5">Current streak</p>
                  </div>
                </div>
              )}

              {/* Longest streak — only shown if participating */}
              {streaks && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#fdf9ed" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#1a1a2e] leading-none">{longestStreak}<span className="text-[10px] font-normal text-[#9a8c7a] ml-0.5">d</span></p>
                    <p className="text-[10px] text-[#9a8c7a] mt-0.5">Longest streak</p>
                  </div>
                </div>
              )}

              {/* Missed days in a row — warns before streak reset at 3 */}
              {streaks && missedDaysInRow > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "#fdf6f0" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c2703d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 9v3.75m0 3.75h.008M10.34 3.94l-8.2 14.2A1.5 1.5 0 003.5 20.4h17a1.5 1.5 0 001.3-2.26l-8.2-14.2a1.5 1.5 0 00-2.6 0z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#a8552c] leading-none">{missedDaysInRow}<span className="text-[10px] font-normal text-[#9a8c7a] ml-0.5">d</span></p>
                    <p className="text-[10px] text-[#9a8c7a] mt-0.5">Missed in a row</p>
                  </div>
                </div>
              )}

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
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-2">Inkwell</p>
          <h1 className="font-serif text-white text-2xl sm:text-3xl leading-tight mb-2">Write more. Together.</h1>
          <p className="text-white/55 text-sm leading-relaxed max-w-md">
            Sprint alongside writers, get feedback on your chapters, and show up every week until the draft is done.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button onClick={() => navigate("/signup")}
            className="px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-all">
            Get started free
          </button>
          <button onClick={() => navigate("/login")}
            className="px-5 py-2.5 border border-white/20 text-white/70 text-sm font-medium rounded-lg hover:border-white/40 transition-all">
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RIGHT — MY SUBMISSIONS
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
          </div>
        </>
      )}

      {user && loading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="space-y-2 py-2 border-b border-[#f4f1ec] last:border-0">
              <Bone w="w-2/3" h="h-3" /><Bone w="w-1/2" h="h-2.5" />
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
          <div className="divide-y divide-[#f4f1ec]">
            {subs.map(sub => {
              const critiqueCount = sub.critiqueCount ?? sub._count?.responses ?? 0;
              const commentCount  = sub._count?.paragraphComments ?? 0;
              return (
                <div key={sub.id} className="py-2.5 first:pt-0 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Link to={`/critique/${sub.id}`}
                        className="font-semibold text-[13px] text-[#1a1a2e] hover:text-[#b8860b] transition-colors leading-snug truncate">
                        {sub.title}
                      </Link>
                      <StatusPill status={sub.status} />
                    </div>
                    <p className="text-[11px] text-[#9a8c7a]">
                      {sub.genre}<span className="mx-1">·</span>{TIER_WORD_LABELS[sub.wordCountTier]}
                      {commentCount > 0 && <><span className="mx-1">·</span>{commentCount} discussion{commentCount !== 1 ? "s" : ""}</>}
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
            <Link to="/critique/submit"
              className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-all ${
                canPost ? "bg-[#d4af37] text-[#1a1a2e] hover:bg-[#c9a42d]" : "text-[#9a8c7a] border border-[#e8e0d0]"
              }`}>
              {isFree ? "Free post" : canPost ? "Submit chapter" : `Need ${cheapest} pts`}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// LEFT — DAILY WRITING CHALLENGE BANNER
// Sits directly under the header. Once a writer has joined, the streak count
// is hidden on this card — instead we surface their accumulated progress
// (total words/chapters/minutes logged so far) to keep motivation focused on
// "how much have I done" rather than "don't break the chain".
function goalUnitLabel(goalType, value) {
  const plural = value !== 1;
  switch (goalType) {
    case "CHAPTERS": return plural ? "chapters" : "chapter";
    case "SCENES":   return plural ? "scenes" : "scene";
    case "DURATION": return plural ? "minutes" : "minute";
    default:         return plural ? "words" : "word";
  }
}

function DailyChallengeBanner({ onJoin, isParticipating, progress }) {
  const [totalActive, setTotalActive] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/challenge/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTotalActive(d.totalActive ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalLogged = progress?.totalLogged ?? 0;

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl overflow-hidden mb-6">
      {/* Gold-accent header — distinct from the dark Spotlight header */}
      <div className="px-5 pt-4 pb-3 border-b border-[#f0ebe3]" style={{ borderLeft: "3px solid #d4af37" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-0.5">Every day</p>
        <h2 className="font-serif text-[#1a1a2e] text-base font-semibold">Daily Writing Challenge</h2>
      </div>

      <div className="px-5 py-4">
        <p className="text-[12px] text-[#6b5c4a] leading-relaxed mb-3">
          Set a daily goal — words, chapters, minutes — and keep a streak going. Even 15 words or 15 minutes a day is progress. One commitment, every day.
        </p>

        {/* Writer count row */}
        <div className="flex items-center gap-2.5 mb-4 bg-[#faf7f2] border border-[#e8e0d0] rounded-lg px-3 py-2">
          <div className="flex -space-x-1.5 flex-shrink-0">
            {[...Array(4)].map((_, i) => (
              <div key={i}
                className="w-5 h-5 rounded-full border-2 border-white"
                style={{ background: ["#1a1a2e","#b8860b","#6b7280","#1a5fb4"][i], zIndex: 4 - i }}
              />
            ))}
          </div>
          <span className="text-[12px] text-[#6b5c4a]">
            {loading ? (
              <span className="inline-block w-20 h-3 bg-[#ece8e1] rounded animate-pulse" />
            ) : (
              <><span className="font-semibold text-[#1a1a2e]">{totalActive ?? 0}</span> writers currently in the challenge</>
            )}
          </span>
        </div>

        {/* Join button — only if not already in the challenge */}
        {!isParticipating && (
          <button
            onClick={onJoin}
            className="w-full py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-colors"
          >
            Join the challenge
          </button>
        )}

        {/* Accumulated progress — only once joined. Streak is intentionally
            hidden here so the focus stays on cumulative output. */}
        {isParticipating && (
          <>
            {progress?.missed > 0 && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg border border-[#f3ddc9]" style={{ background: "#fdf6f0" }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#c2703d" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94l-8.2 14.2A1.5 1.5 0 003.5 20.4h17a1.5 1.5 0 001.3-2.26l-8.2-14.2a1.5 1.5 0 00-2.6 0z" />
                </svg>
                <p className="text-[11px] text-[#a8552c]">
                  {progress.missed} day{progress.missed === 1 ? "" : "s"} missed in a row.{" "}
                  {progress.missed >= 3 ? "Streak reset." : `${3 - progress.missed} more and your streak resets.`}
                </p>
              </div>
            )}
            <Link
              to="/challenge"
              className="flex items-center justify-between gap-3 w-full px-4 py-3 rounded-lg border border-[#e8e0d0] bg-[#faf7f2] hover:border-[#d4af37] hover:bg-[#fdf9ed] transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a8c7a] mb-0.5">Your progress so far</p>
                <p className="text-[18px] font-bold text-[#1a1a2e] leading-none">
                  {totalLogged.toLocaleString()}
                  <span className="text-[11px] font-normal text-[#9a8c7a] ml-1.5">
                    {goalUnitLabel(progress?.goalType, totalLogged)} written
                  </span>
                </p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#b8860b] group-hover:text-[#1a1a2e] flex-shrink-0 whitespace-nowrap">
                View details
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// JOIN CHALLENGE MODAL
// Shown inline on Homepage; reuses the same logic as JoinForm on ChallengePage
// ═════════════════════════════════════════════════════════════════════════════
function JoinChallengeModal({ onClose, onJoined }) {
  const navigate                      = useNavigate();
  const { user }                      = useAuth();
  const [goalValue, setGoalValue]     = useState("");
  const [goalType, setGoalType]       = useState("WORDS");
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState("");

  const typeOptions = [
    { value: "WORDS",    label: "Words" },
    { value: "CHAPTERS", label: "Chapters" },
    { value: "SCENES",   label: "Scenes" },
    { value: "DURATION", label: "Minutes" },
  ];

  async function submit() {
    if (!goalValue || isNaN(goalValue) || Number(goalValue) < 1) {
      setErr("Enter a positive number for your daily goal."); return;
    }
    setSaving(true); setErr("");
    try {
      const r = await fetch(`${API_URL}/challenge/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalValue: Number(goalValue), goalType }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.message ?? "Something went wrong."); return; }
      onJoined?.();
      navigate("/challenge");
    } catch { setErr("Network error — please try again."); }
    finally { setSaving(false); }
  }

  const unitLabel = goalType === "WORDS" ? "words/day"
    : goalType === "DURATION" ? "min/day"
    : goalType === "CHAPTERS" ? "chapters/day"
    : "scenes/day";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-[#e8e0d0] overflow-hidden"
        style={{ borderTop: "4px solid #d4af37" }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-1">Daily Challenge</p>
            <h3 className="font-serif text-[#1a1a2e] text-lg font-bold leading-tight">Set your daily goal</h3>
            <p className="text-[12px] text-[#9a8c7a] mt-1 leading-relaxed">
              Choose what you'll commit to each day. You can adjust it anytime.
            </p>
          </div>
          <button onClick={onClose} className="text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors ml-3 flex-shrink-0 mt-1" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Guest state */}
          {!user && (
            <div className="text-center py-2">
              <p className="text-[13px] text-[#6b5c4a] mb-4 leading-relaxed">
                Sign in to start your streak.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate("/signup")}
                  className="w-full py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-colors">
                  Create a free account
                </button>
                <button onClick={() => navigate("/login")}
                  className="w-full py-2.5 border border-[#1a1a2e] text-[#1a1a2e] text-sm font-semibold rounded-lg hover:bg-[#1a1a2e] hover:text-white transition-colors">
                  Sign in
                </button>
              </div>
            </div>
          )}

          {/* Logged-in join form */}
          {user && (
            <>
              {/* Goal type selector */}
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {typeOptions.map(o => (
                  <button key={o.value} onClick={() => setGoalType(o.value)}
                    className="py-2 text-[11px] font-semibold rounded-lg border transition-all"
                    style={goalType === o.value
                      ? { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" }
                      : { background: "#faf7f2", color: "#6b5c4a", borderColor: "#e8e0d0" }}>
                    {o.label}
                  </button>
                ))}
              </div>

              {/* Goal value input */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-[#6b5c4a] uppercase tracking-wide block mb-1.5">
                  Daily target
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="1" value={goalValue}
                    onChange={e => setGoalValue(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submit()}
                    placeholder={goalType === "WORDS" ? "500" : goalType === "DURATION" ? "30" : "2"}
                    className="flex-1 px-3 py-2.5 border border-[#e8e0d0] rounded-lg text-[13px] text-[#1a1a2e] focus:outline-none focus:border-[#d4af37] bg-white"
                  />
                  <span className="text-[11px] text-[#9a8c7a] flex-shrink-0">{unitLabel}</span>
                </div>
                {err && <p className="text-[11px] text-[#c0392b] mt-1.5">{err}</p>}
              </div>

              <button onClick={submit} disabled={saving}
                className="w-full py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-colors disabled:opacity-60">
                {saving ? "Joining…" : "Join the challenge"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEFT — ALARM CLOCK SPRINT STARTER
// ═════════════════════════════════════════════════════════════════════════════
function AlarmClockSprintCard({ onStartSprint }) {
  return (
    <div className="flex flex-col items-center py-3 px-4">
      <button onClick={onStartSprint}
        className="group relative flex flex-col items-center gap-0 focus:outline-none"
        aria-label="Tap to start sprint">
        <svg width="120" height="120" viewBox="0 0 120 120"
          className="mb-3 transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
          aria-hidden="true">
          <ellipse cx="38" cy="108" rx="8" ry="5" fill="#d4af37" opacity="0.85" />
          <ellipse cx="82" cy="108" rx="8" ry="5" fill="#d4af37" opacity="0.85" />
          <circle cx="60" cy="60" r="46" fill="#fffdf7" stroke="#d4af37" strokeWidth="3" />
          <circle cx="60" cy="60" r="40" fill="#fffdf7" stroke="#e8e0d0" strokeWidth="1" />
          <circle cx="60" cy="16" r="7" fill="#d4af37" />
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
            const r1 = i % 3 === 0 ? 30 : 33;
            const r2 = 36;
            const rad = (deg - 90) * Math.PI / 180;
            return (
              <line key={deg}
                x1={60 + r1 * Math.cos(rad)} y1={60 + r1 * Math.sin(rad)}
                x2={60 + r2 * Math.cos(rad)} y2={60 + r2 * Math.sin(rad)}
                stroke="#c8b89a" strokeWidth={i % 3 === 0 ? 2 : 1} />
            );
          })}
          <line x1="60" y1="60" x2="44" y2="38" stroke="#1a1a2e" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="60" y1="60" x2="60" y2="30" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="60" r="3" fill="#d4af37" />
          <text x="60" y="55" textAnchor="middle" fontSize="7" fill="#9a8c7a" fontFamily="serif" letterSpacing="1">TAP TO</text>
        </svg>
        <span className="font-serif text-[#1a1a2e] text-lg font-bold leading-tight">Start Sprint</span>
        <span className="text-[11px] text-[#9a8c7a] mt-1">Focused session to hit your goal</span>
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEFT — ACTIVE SPRINT BANNER
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
        <Link key={sprint.id} to={`/group-sprint/${sprint.id}`}
          className="flex items-center gap-3 bg-[#fffdf0] border border-[#d4af37] rounded-lg px-4 py-3 mb-2 hover:bg-[#fff9e0] transition-colors">
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

// ─── time helper ─────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ═════════════════════════════════════════════════════════════════════════════
// LEFT — THREADS PREVIEW
// ═════════════════════════════════════════════════════════════════════════════
function ThreadsPreview() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/threads?limit=20`)
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => {
        const all = d.threads ?? [];

        // Separate pinned-keyword threads (in defined order) from the rest
        const pinned = [];
        PINNED_THREAD_KEYWORDS.forEach(kw => {
          const found = all.find(t =>
            t.title?.toLowerCase().includes(kw.toLowerCase()) && !pinned.includes(t)
          );
          if (found) pinned.push(found);
        });

        // Remaining threads sorted by most recent comment activity
        const rest = all
          .filter(t => !pinned.includes(t))
          .sort((a, b) => {
            const aTime = new Date(a.lastCommentAt ?? a.updatedAt ?? a.createdAt).getTime();
            const bTime = new Date(b.lastCommentAt ?? b.updatedAt ?? b.createdAt).getTime();
            return bTime - aTime;
          });

        setThreads([...pinned, ...rest].slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl overflow-hidden mb-6">
      <div className="px-5 pt-4 pb-3 border-b border-[#f0ebe3]">
        <h2 className="font-serif text-[#1a1a2e] text-base font-semibold">Threads</h2>
        <p className="text-[11px] text-[#9a8c7a] mt-0.5">Recent conversations from the community</p>
      </div>

      <div className="divide-y divide-[#f4f1ec]">
        {loading && [1,2,3].map(i => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 bg-[#ece8e1] rounded animate-pulse" />
              <div className="h-2.5 w-1/2 bg-[#ece8e1] rounded animate-pulse" />
            </div>
          </div>
        ))}

        {!loading && threads.length === 0 && (
          <div className="px-5 py-6 text-center">
            <p className="text-[12px] text-[#9a8c7a]">No threads yet — check back soon.</p>
          </div>
        )}

        {!loading && threads.map((thread, i) => {
          const isPinnedSlot = i < PINNED_THREAD_KEYWORDS.length &&
            PINNED_THREAD_KEYWORDS.some(kw => thread.title?.toLowerCase().includes(kw.toLowerCase()));
          const commentCount   = thread._count?.comments ?? 0;
          const newCount       = thread.newCommentCount ?? 0;

          return (
            <Link
              key={thread.id}
              to={`/threads/${thread.id}`}
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-[#faf7f2] transition-colors group"
            >
              <div className="flex-shrink-0 mt-1">
                {isPinnedSlot ? (
                  <div className="w-2 h-2 rounded-full" style={{ background: "#d4af37" }} />
                ) : newCount > 0 ? (
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-60 animate-ping" />
                    <span className="relative inline-flex rounded-full w-2 h-2 bg-[#d4af37]" />
                  </span>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-[#e8e0d0]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1a1a2e] leading-snug truncate group-hover:text-[#b8860b] transition-colors">
                  {thread.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-[#9a8c7a]">
                    {commentCount} {commentCount === 1 ? "comment" : "comments"}
                  </span>
                  {thread.lastCommentAt && (
                    <>
                      <span className="text-[#e8e0d0]">·</span>
                      <span className="text-[10px] text-[#b8a070]">active {timeAgo(thread.lastCommentAt)}</span>
                    </>
                  )}
                  {newCount > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "#fffdf0", color: "#b8860b", border: "1px solid #d4af37" }}>
                      +{newCount} new
                    </span>
                  )}
                </div>
              </div>

              <svg className="w-3 h-3 text-[#c8b89a] group-hover:text-[#d4af37] transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          );
        })}
      </div>

    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEFT — RECENT BLOG POSTS (tucked inside Community Sprints)
// ═════════════════════════════════════════════════════════════════════════════
function RecentBlogPosts() {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/blog?limit=2`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setPosts(d?.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-[#f0ebe3]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-2">Latest Community News</p>

      {loading && (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="space-y-1.5">
              <Bone w="w-2/3" h="h-3" /><Bone w="w-1/3" h="h-2.5" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-2.5">
          {posts.map(post => (
            <Link key={post.id} to={`/blog/${post.id}`} className="block group">
              <p className="text-[13px] font-semibold text-[#1a1a2e] group-hover:text-[#b8860b] transition-colors leading-snug truncate">
                {post.title || "Untitled post"}
              </p>
              <p className="text-[10px] text-[#9a8c7a] mt-0.5">
                {timeAgo(post.createdAt)}
                <span className="mx-1">·</span>{post._count?.likes ?? 0} like{(post._count?.likes ?? 0) !== 1 ? "s" : ""}
                <span className="mx-1">·</span>{post._count?.comments ?? 0} comment{(post._count?.comments ?? 0) !== 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
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
        <h2 className="font-serif text-[#1a1a2e] text-base font-semibold pl-3"
          style={{ borderLeft: "3px solid #d4af37" }}>
          Community Sprints
        </h2>
        <Link to="/accountability"
          className="text-[11px] text-[#9a8c7a] hover:text-[#d4af37] transition-colors flex items-center gap-1 whitespace-nowrap">
          How our sprints work
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>

      <LastGroupSprintRecap />
      <ActiveSprintBanner />
      <AlarmClockSprintCard onStartSprint={onStartSprint} />
      <RecentBlogPosts />

      <div className="mt-3 pt-3 border-t border-[#f0ebe3] flex items-center justify-center">
        <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-[12px] text-[#5865f2] hover:underline font-semibold">
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
// GUEST PROMPT MODAL (sprint)
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
          <button onClick={() => navigate("/signup")}
            className="w-full py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-all">
            Create a free account
          </button>
          <button onClick={() => navigate("/login")}
            className="w-full py-2.5 border border-[#1a1a2e] text-[#1a1a2e] text-sm font-semibold rounded-lg hover:bg-[#1a1a2e] hover:text-white transition-all">
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
  const { user }                          = useAuth();
  const navigate                          = useNavigate();
  const [wallet, setWallet]               = useState(null);
  const [streaks, setStreaks]             = useState(null);
  const [discussionCount, setDiscussionCount] = useState(0);
  const [showSprint, setShowSprint]       = useState(false);
  const [showGuest, setShowGuest]         = useState(false);
  const [showJoinChallenge, setShowJoinChallenge] = useState(false);
  const [isParticipating, setIsParticipating]     = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/feedback/points/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => setWallet(d))
      .catch(() => {});
    // Total comments posted across all threads — shown on the profile bar
    // to nudge writers toward joining community discussions.
    fetch(`${API_URL}/threads/stats/mine`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDiscussionCount(d.discussionCount ?? 0); })
      .catch(() => {});

    // Fetch participation — gives us streak data + participation flag
    fetch(`${API_URL}/challenge/my-participation`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setIsParticipating(true);
          setStreaks({
            current: d.currentStreak ?? 0,
            longest: d.longestStreak ?? 0,
            missed: d.missedDaysInRow ?? 0,
            // Accumulated progress so far (e.g. total words/chapters/minutes logged)
            totalLogged: d.totalLogged ?? d.totalProgress ?? 0,
            goalValue: d.goalValue ?? 0,
            goalType: d.goalType ?? "WORDS",
          });
        }
      })
      .catch(() => {});
  }, [user]);

  function handleStartSprint() {
    if (!user) { setShowGuest(true); return; }
    setShowSprint(true);
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Header />

      {user ? <ProfileBar user={user} wallet={wallet} streaks={streaks} discussionCount={discussionCount} /> : <GuestHero />}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-7 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div>
            <DailyChallengeBanner
              onJoin={() => setShowJoinChallenge(true)}
              isParticipating={isParticipating}
              progress={streaks}
            />
            <ThreadsPreview />
            <AccountabilitySection user={user} onStartSprint={handleStartSprint} />
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div>
            <MySubmissions user={user} wallet={wallet} />
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
      {showJoinChallenge && (
        <JoinChallengeModal
          onClose={() => setShowJoinChallenge(false)}
          onJoined={() => { setShowJoinChallenge(false); setIsParticipating(true); }}
        />
      )}
    </div>
  );
}