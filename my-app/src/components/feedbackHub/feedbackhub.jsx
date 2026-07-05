// src/components/feedback/FeedbackHub.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { AppMetaTags } from "../utilis/metatags";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TIER_META = {
  Bronze:   { color: "#C87533", bg: "#fdf6ef" },
  Silver:   { color: "#7a8290", bg: "#f4f5f6" },
  Gold:     { color: "#b8860b", bg: "#fdf9ed" },
  Platinum: { color: "#6558d4", bg: "#f2f0fd" },
  Diamond:  { color: "#c0392b", bg: "#fdf1f0" },
};

const TIER_LABELS = {
  TIER_1000: "≤ 1,000 words",
  TIER_2000: "≤ 2,000 words",
  TIER_3000: "≤ 3,000 words",
  TIER_4000: "≤ 4,000 words",
  TIER_5000: "≤ 5,000 words",
};

const DRAFT_LABELS = {
  ROUGH:      "Rough draft",
  POLISHING:  "Polishing",
  FINAL_EDIT: "Final edit",
};

// ─── WALLET STRIP ─────────────────────────────────────────────────────────────

function WalletStrip({ wallet }) {
  if (!wallet) return null;
  const tier = wallet.tier;
  const meta = TIER_META[tier?.name] ?? TIER_META.Bronze;
  const costs = wallet.TIER_COSTS ?? {};
  const bal = wallet.postingBalance ?? 0;
  const activeChapterCount = wallet.activeChapterCount ?? 0;
  const surcharge = wallet.MULTI_CHAPTER_SURCHARGE ?? 2;
  const isFreeEligible = !!(wallet?.freePostAvailable);
  const cheapestTierWithSurcharge = Math.min(...Object.values(costs)) + (activeChapterCount * surcharge);
  const canPost = isFreeEligible || bal >= cheapestTierWithSurcharge;
  const maxTier = Object.entries(costs)
    .filter(([, cost]) => bal >= cost + (activeChapterCount * surcharge))
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ backgroundColor: meta.color }}
        >
          {tier?.gem ?? "B"}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-0.5">Rank</p>
          <p className="text-sm font-semibold text-[#1a1a2e]">
            {tier?.name ?? "Bronze"} <span className="font-normal text-[#9a8c7a]">· Rep {wallet.reputation}</span>
          </p>
        </div>
      </div>

      <div className="hidden sm:block w-px h-8 bg-[#e8e0d0]" />

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-[#fffdf0] border border-[#d4af37]/40 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-[#b8860b]">{bal}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-0.5">Balance</p>
          <p className="text-sm text-[#2d3748]">
            {isFreeEligible ? (
              <span className="text-[#b8860b] font-semibold">Free post available</span>
            ) : canPost ? (
              <>Can post up to {TIER_LABELS[maxTier?.[0]]}</>
            ) : (
              "Critique to earn posting points"
            )}
          </p>
        </div>
      </div>

      <Link
        to="/critique/submit"
        className={`flex-shrink-0 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
          canPost
            ? "bg-[#1a1a2e] text-white hover:bg-[#2d3748]"
            : "bg-[#f4f1ec] text-[#b8a898] cursor-not-allowed pointer-events-none"
        }`}
      >
        Submit chapter
      </Link>
    </div>
  );
}

// ─── CRITIQUE PROGRESS ────────────────────────────────────────────────────────

function CritiqueProgress({ count, max = 2 }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < count ? "#1a1a2e" : "#e8e0d0" }}
          />
        ))}
      </div>
      <span className="text-[10px] text-[#9a8c7a] tabular-nums flex-shrink-0">
        {count}/{max}
      </span>
    </div>
  );
}

// ─── ROW SKELETON ─────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl p-4 flex gap-4 animate-pulse">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex gap-2">
          <div className="h-4 w-14 bg-[#f4f1ec] rounded-full" />
          <div className="h-4 w-20 bg-[#f4f1ec] rounded-full" />
        </div>
        <div className="h-5 w-2/3 bg-[#f4f1ec] rounded" />
        <div className="h-3 w-full bg-[#f4f1ec] rounded" />
        <div className="h-2 w-48 bg-[#f4f1ec] rounded-full mt-2" />
      </div>
      {/* Bigger skeleton avatar */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-16">
        <div className="w-12 h-12 rounded-full bg-[#f4f1ec]" />
        <div className="h-2.5 w-14 bg-[#f4f1ec] rounded" />
        <div className="h-2 w-10 bg-[#f4f1ec] rounded" />
      </div>
    </div>
  );
}

// ─── SPOTLIGHT ROW ────────────────────────────────────────────────────────────

function SpotlightRow({ sub }) {
  const author = sub.user;
  const responses = sub.critiqueCount ?? sub._count?.responses ?? 0;
  const comments = sub._count?.paragraphComments ?? 0;
  // reputation lives on feedbackPoints (joined via userSelect in feedbackService)
  const reputation = author?.feedbackPoints?.reputation ?? null;

  return (
    <Link
      to={`/critique/${sub.id}`}
      className="group relative flex items-start gap-5 bg-white border border-[#e8e0d0] rounded-xl px-5 py-4 hover:border-[#1a1a2e] hover:shadow-[0_4px_20px_rgba(26,26,46,0.08)] transition-all duration-200"
    >
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Tags */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-[#1a1a2e] px-2.5 py-0.5 rounded-full">
            {sub.genre}
          </span>
          <span className="text-[10px] text-[#9a8c7a] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
            {TIER_LABELS[sub.wordCountTier]}
          </span>
          <span className="text-[10px] text-[#9a8c7a] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
            {DRAFT_LABELS[sub.draftStage]}
          </span>
          {sub.isLongStay && (
            <span className="text-[10px] font-bold text-[#b8860b] bg-[#fffdf0] border border-[#d4af37]/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              10+ days · +2 pts
            </span>
          )}
          {sub.feedbackWanted?.slice(0, 2).map((tag, i) => (
            <span key={i} className="text-[10px] text-[#6558d4] bg-[#f2f0fd] px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          {sub.feedbackWanted?.length > 2 && (
            <span className="text-[10px] text-[#9a8c7a]">+{sub.feedbackWanted.length - 2}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-serif text-[#1a1a2e] text-[1rem] leading-snug mb-1.5 group-hover:text-[#b8860b] transition-colors line-clamp-1">
          {sub.title}
        </h3>

        {/* Summary */}
        <p className="text-[13px] text-[#6b5c4a] leading-relaxed line-clamp-2 mb-3">
          {sub.summary}
        </p>

        {/* Progress + comments */}
        <div className="flex items-center gap-4">
          <div className="w-32">
            <CritiqueProgress count={responses} max={2} />
          </div>
          <div className="flex items-center gap-1 text-[#b8a898]">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="text-[11px]">{comments}</span>
          </div>
        </div>
      </div>

      {/* Author avatar — right side (bigger, with reputation) */}
      <Link
        to={`/profile/${author?.id}`}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-1 flex-shrink-0 hover:opacity-75 transition-opacity"
      >
        {/* Avatar: w-12 h-12 (was w-10 h-10) */}
        <div className="w-12 h-12 rounded-full bg-[#1a1a2e] flex items-center justify-center text-white text-sm font-semibold overflow-hidden ring-2 ring-[#e8e0d0] group-hover:ring-[#d4af37] transition-all">
          {author?.avatar
            ? <img src={author.avatar} alt={author.username} className="w-full h-full object-cover" />
            : <span>{author?.username?.charAt(0).toUpperCase() ?? "?"}</span>
          }
        </div>
        <span className="text-[10px] text-[#9a8c7a] font-medium text-center leading-tight max-w-[56px] truncate">
          {author?.username}
        </span>
        {reputation !== null && (
          <span className="text-[9px] text-[#b8a898] tabular-nums leading-none">
            {reputation} rep
          </span>
        )}
      </Link>
    </Link>
  );
}

// ─── GENRE DROPDOWN ───────────────────────────────────────────────────────────

function GenreDropdown({ genres, activeGenre, onSelect }) {
  const [open, setOpen] = useState(false);
  if (!genres.length) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-semibold border border-[#e8e0d0] bg-white text-[#6b5c4a] hover:border-[#1a1a2e] transition-all"
      >
        <svg className="w-3.5 h-3.5 text-[#9a8c7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6" />
        </svg>
        {activeGenre ?? "All genres"}
        <svg className={`w-3 h-3 text-[#9a8c7a] transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-20 bg-white border border-[#e8e0d0] rounded-xl shadow-[0_8px_24px_rgba(26,26,46,0.1)] py-1.5 min-w-[160px]">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`w-full text-left px-4 py-2 text-[12px] font-semibold transition-colors ${
              activeGenre === null ? "text-[#1a1a2e] bg-[#f4f1ec]" : "text-[#6b5c4a] hover:bg-[#faf8f5]"
            }`}
          >
            All genres
          </button>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => { onSelect(g); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-[12px] font-semibold transition-colors ${
                activeGenre === g ? "text-[#1a1a2e] bg-[#f4f1ec]" : "text-[#6b5c4a] hover:bg-[#faf8f5]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function FeedbackHub() {
  const { user } = useAuth();
  const [spotlight, setSpotlight]         = useState([]);
  const [wallet, setWallet]               = useState(null);
  const [loading, setLoading]             = useState(true);
  const [spotlightGenres, setSpotlightGenres] = useState([]);
  const [queueGenres, setQueueGenres]     = useState([]);
  const [archiveGenres, setArchiveGenres] = useState([]);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const waitingSpotlight = spotlight.filter((s) => s.isLongStay);
  const freshSpotlight   = spotlight.filter((s) => !s.isLongStay);

  const canPost =
    wallet?.freePostAvailable ||
    (wallet?.postingBalance ?? 0) >=
      Math.min(...Object.values(wallet?.TIER_COSTS ?? { t: 1 })) +
      (wallet?.activeChapterCount ?? 0) * (wallet?.MULTI_CHAPTER_SURCHARGE ?? 2);

  useEffect(() => {
    Promise.all([
      fetchSpotlight(),
      user ? fetchWallet() : Promise.resolve(),
      fetchQueueGenres(),
      fetchArchiveGenres(),
    ]);
  }, [user]);

  async function fetchSpotlight() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/spotlight`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items ?? [];
        setSpotlight(items);
        setSpotlightGenres([...new Set(items.map((s) => s.genre).filter(Boolean))]);
      }
    } catch (e) {}
    setLoading(false);
  }

  async function fetchWallet() {
    try {
      const res = await fetch(`${API_URL}/feedback/points/me`, { credentials: "include" });
      if (res.ok) setWallet(await res.json());
    } catch (e) {}
  }

  async function fetchQueueGenres() {
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/queue/genres`, { credentials: "include" });
      if (res.ok) setQueueGenres(await res.json());
    } catch (e) {}
  }

  async function fetchArchiveGenres() {
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/outdated/genres`, { credentials: "include" });
      if (res.ok) setArchiveGenres(await res.json());
    } catch (e) {}
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-7 sm:py-8">
      <AppMetaTags
        title="Critique Hub"
        description="Share a chapter for feedback and critique others' work on Quillweave — everyone here is building something, one chapter at a time."
      />

      {/* ── Page header — fits inside the sidebar/topbar layout, no dark hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b8860b] mb-1.5">Critique Hub</p>
          <h1 className="font-serif text-[#1a1a2e] text-2xl sm:text-[28px] leading-tight mb-2">
            Post here, grow here
          </h1>
          <p className="text-[#6b5c4a] text-sm leading-relaxed max-w-lg">
            Share a chapter to learn what's working and what needs another pass — and return the
            favor for another writer also trying to finish their draft. Everyone here is building
            something, one chapter at a time.
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowHowItWorks((v) => !v)}
            className="text-[11px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors flex-shrink-0 underline underline-offset-2"
          >
            How it works
          </button>
        )}
      </div>

      <div className="flex items-center justify-end mb-6">
        <Link
          to="/critique/submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-[#d4af37] text-[#1a1a2e] hover:bg-[#c9a42d] transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Submit your first chapter
        </Link>
      </div>

      {/* How it works — collapsible */}
      {showHowItWorks && (
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { n: "01", title: "Critique to earn", desc: "Every critique earns you points based on chapter length." },
            { n: "02", title: "Spend to post", desc: "Use your points to post your chapter into the spotlight." },
            { n: "03", title: "Receive feedback", desc: "Your chapter collects critiques until it reaches 2." },
          ].map((s) => (
            <div key={s.n} className="bg-white border border-[#e8e0d0] rounded-xl p-4">
              <p className="text-[10px] font-bold text-[#d4af37] tracking-widest mb-2">{s.n}</p>
              <p className="font-semibold text-[#1a1a2e] text-sm mb-1">{s.title}</p>
              <p className="text-[12px] text-[#9a8c7a] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Wallet strip */}
      {user && <WalletStrip wallet={wallet} />}

      {/* Guest CTA */}
      {!user && (
        <div className="bg-[#1a1a2e] text-white rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-10"
            style={{ backgroundImage: "radial-gradient(circle, rgba(212,175,55,0.3) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          <div className="relative">
            <p className="font-serif text-lg mb-1">Ready to grow your writing with others?</p>
            <p className="text-sm text-white/50">Sign in to read, critique, and share your own chapters.</p>
          </div>
          <Link
            to="/signup"
            className="relative flex-shrink-0 bg-[#d4af37] text-[#1a1a2e] px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#c9a42d] transition-colors"
          >
            Get started
          </Link>
        </div>
      )}

      {/* ── Waiting for critique — chapters in spotlight 10+ days ── */}
      {!loading && waitingSpotlight.length > 0 && (
        <div className="mb-10">
          <div className="bg-[#fffdf0] border border-[#d4af37]/40 rounded-xl px-5 py-4 mb-4 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#d4af37] flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5 text-[#1a1a2e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#1a1a2e] text-sm mb-0.5">These writers have been waiting a little longer</p>
              <p className="text-[12px] text-[#6b5c4a] leading-relaxed">
                A few chapters here for 10+ days, still hoping for a read. Critiquing one earns a{" "}
                <span className="font-semibold text-[#b8860b]">+2 bonus</span> — and might be exactly
                what someone needs to keep going.
              </p>
            </div>
          </div>
          <div className="space-y-2.5">
            {waitingSpotlight.map((sub) => (
              <SpotlightRow key={sub.id} sub={sub} />
            ))}
          </div>
        </div>
      )}

      {/* Spotlight header */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a8c7a]">
            {waitingSpotlight.length > 0 ? "Recently Posted" : "In the Spotlight"}
          </h2>
          <span className="text-[10px] text-[#b8a898]">{spotlight.length}/6</span>
        </div>
        {!loading && spotlightGenres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {spotlightGenres.map((g) => (
              <span key={g} className="text-[10px] font-semibold text-[#1a1a2e] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="text-[12px] text-[#9a8c7a] mb-5">
        Read a chapter, leave honest feedback, help someone else's draft move forward.
      </p>

      {/* Spotlight list */}
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      ) : spotlight.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#e8e0d0] rounded-xl">
          <p className="font-serif text-[#1a1a2e] text-base mb-1">Nothing here yet</p>
          <p className="text-sm text-[#9a8c7a] mb-4">Be the first to post a chapter — someone will read it.</p>
          <Link
            to="/critique/submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-[#1a1a2e] text-white hover:bg-[#2d3748] transition-colors"
          >
            Submit your first chapter
          </Link>
        </div>
      ) : freshSpotlight.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#e8e0d0] rounded-xl">
          <p className="text-sm text-[#9a8c7a]">No other chapters posted recently — check back soon.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {freshSpotlight.map((sub) => (
            <SpotlightRow key={sub.id} sub={sub} />
          ))}
        </div>
      )}

      {/* Open slot notice */}
      {!loading && spotlight.length > 0 && spotlight.length < 6 && (
        <div className="mt-4 flex items-center gap-3 bg-[#fffdf0] border border-[#d4af37]/40 rounded-xl px-4 py-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] flex-shrink-0" />
          <p className="text-[12px] text-[#6b5c4a]">
            {6 - spotlight.length} spotlight {6 - spotlight.length === 1 ? "slot is" : "slots are"} open.{" "}
            {user && canPost ? (
              <Link to="/critique/submit" className="text-[#1a1a2e] font-semibold hover:underline">Submit your chapter</Link>
            ) : user ? (
              "Critique a chapter to earn posting points."
            ) : (
              <Link to="/signup" className="text-[#1a1a2e] font-semibold hover:underline">Sign in</Link>
            )}{" "}
            to fill one.
          </p>
        </div>
      )}

      {/* Queue + Archive nav */}
      <div className="mt-12 pt-8 border-t border-[#e8e0d0] grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/critique/queue"
          className="group flex items-start gap-4 bg-white border border-[#e8e0d0] rounded-xl p-5 hover:border-[#1a1a2e] hover:shadow-[0_4px_16px_rgba(26,26,46,0.07)] transition-all duration-200"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1a1a2e] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h10" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#1a1a2e] text-sm mb-1">Queue</p>
            <p className="text-[12px] text-[#9a8c7a] leading-relaxed mb-2">
              Chapters waiting for a spotlight slot. Earn base-tier points for critiquing.
            </p>
            {queueGenres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {queueGenres.slice(0, 5).map((g) => (
                  <span key={g} className="text-[10px] font-semibold text-[#1a1a2e] bg-[#f4f1ec] px-2 py-0.5 rounded-full">{g}</span>
                ))}
                {queueGenres.length > 5 && <span className="text-[10px] text-[#9a8c7a] px-1">{queueGenres.length - 5} more</span>}
              </div>
            )}
          </div>
          <svg className="w-4 h-4 text-[#b8a898] flex-shrink-0 mt-0.5 group-hover:text-[#1a1a2e] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          to="/critique/archive"
          className="group flex items-start gap-4 bg-white border border-[#e8e0d0] rounded-xl p-5 hover:border-[#b8a898] hover:shadow-[0_4px_16px_rgba(26,26,46,0.07)] transition-all duration-200"
        >
          <div className="w-8 h-8 rounded-lg bg-[#f4f1ec] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-[#9a8c7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#1a1a2e] text-sm mb-1">Archive</p>
            <p className="text-[12px] text-[#9a8c7a] leading-relaxed mb-2">
              Chapters with 2+ critiques. Still open — half points apply.
            </p>
            {archiveGenres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {archiveGenres.slice(0, 5).map((g) => (
                  <span key={g} className="text-[10px] font-semibold text-[#9a8c7a] bg-[#f4f1ec] px-2 py-0.5 rounded-full">{g}</span>
                ))}
                {archiveGenres.length > 5 && <span className="text-[10px] text-[#9a8c7a] px-1">{archiveGenres.length - 5} more</span>}
              </div>
            )}
          </div>
          <svg className="w-4 h-4 text-[#b8a898] flex-shrink-0 mt-0.5 group-hover:text-[#9a8c7a] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}