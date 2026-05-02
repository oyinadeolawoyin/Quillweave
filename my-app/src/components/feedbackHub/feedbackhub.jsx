// src/components/feedback/FeedbackHub.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "../profile/header";

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

  const isFreeEligible = !!(wallet?.freePostAvailable);
  const canPost = isFreeEligible || Object.entries(costs).some(([, cost]) => bal >= cost);
  const maxTier = Object.entries(costs)
    .filter(([, cost]) => bal >= cost)
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl shadow-soft px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm"
          style={{ backgroundColor: meta.color }}
        >
          {tier?.gem ?? "B"}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-0.5">Your rank</p>
          <p className="text-sm font-semibold text-ink-primary">
            {tier?.name ?? "Bronze"} · <span className="font-normal text-[#6b5c4a]">Rep {wallet.reputation}</span>
          </p>
        </div>
      </div>

      <div className="hidden sm:block w-px h-10 bg-[#e8e0d0]" />

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#fdf9ed] border border-[#f0d98a] flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-ink-gold">{bal}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-0.5">Posting balance</p>
          <p className="text-sm text-[#2d3748]">
            {isFreeEligible
              ? <span className="text-ink-gold font-semibold">Free post available</span>
              : canPost
              ? `Can post up to ${TIER_LABELS[maxTier[0]]}`
              : "Read a chapter to earn points"}
          </p>
        </div>
      </div>

      <Link
        to="/feedback/submit"
        className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          canPost
            ? "bg-ink-primary text-white hover:opacity-90 shadow-sm"
            : "bg-[#f4f1ec] text-[#b8a898] cursor-not-allowed pointer-events-none"
        }`}
      >
        Submit a chapter
      </Link>
    </div>
  );
}

// ─── CRITIQUE PROGRESS BAR ────────────────────────────────────────────────────

function CritiqueProgress({ count, max = 3 }) {
  const pct = Math.min((count / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-[#f0ebe3] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-ink-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-[#9a8c7a] tabular-nums flex-shrink-0">
        {count}/{max} critiques
      </span>
    </div>
  );
}

// ─── SUBMISSION CARD ──────────────────────────────────────────────────────────

function SubmissionCard({ sub }) {
  const author = sub.user;
  const responses = sub.critiqueCount ?? sub._count?.responses ?? 0;
  const comments = sub._count?.paragraphComments ?? 0;

  return (
    <Link
      to={`/feedback/${sub.id}`}
      className="group block bg-white border border-[#e8e0d0] rounded-2xl p-5 hover:border-ink-primary hover:shadow-[0_4px_20px_rgba(45,55,72,0.08)] transition-all duration-200"
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[11px] font-bold text-ink-primary bg-ink-primary/5 px-2.5 py-0.5 rounded-full">
          {sub.genre}
        </span>
        <span className="text-[11px] text-[#9a8c7a] bg-[#faf7f2] border border-[#e8e0d0] px-2.5 py-0.5 rounded-full">
          {TIER_LABELS[sub.wordCountTier]}
        </span>
        <span className="text-[11px] text-[#9a8c7a] bg-[#faf7f2] border border-[#e8e0d0] px-2.5 py-0.5 rounded-full ml-auto">
          {DRAFT_LABELS[sub.draftStage]}
        </span>
      </div>

      <h3 className="font-serif text-ink-primary text-lg leading-snug mb-2 group-hover:text-ink-gold transition-colors line-clamp-2">
        {sub.title}
      </h3>

      <p className="text-sm text-[#6b5c4a] leading-relaxed mb-4 line-clamp-2">
        {sub.summary}
      </p>

      {sub.feedbackWanted?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {sub.feedbackWanted.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[11px] text-[#6558d4] bg-[#f2f0fd] px-2.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          {sub.feedbackWanted.length > 3 && (
            <span className="text-[11px] text-[#9a8c7a] px-2 py-0.5">
              +{sub.feedbackWanted.length - 3} more
            </span>
          )}
        </div>
      )}

      {sub.contentWarnings?.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {sub.contentWarnings.map((w, i) => (
            <span key={i} className="text-[10px] text-[#c0392b] bg-[#fdf1f0] px-2 py-0.5 rounded-full border border-[#f5c6c3]">
              {w}
            </span>
          ))}
        </div>
      )}

      <div className="mb-3">
        <CritiqueProgress count={responses} max={3} />
      </div>

      <div className="pt-3 border-t border-[#f0ebe3]">
        {/* Author row */}
        <Link to={`/profile/${author?.id}`} className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-full bg-ink-primary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
            {author?.avatar
              ? <img src={author.avatar} alt={author.username} className="w-full h-full object-cover" />
              : <span>{author?.username?.charAt(0).toUpperCase() ?? "?"}</span>
            }
          </div>
          <span className="text-sm text-ink-primary font-medium">{author?.username}</span>
          {author?.feedbackPoints?.reputation != null && (
            <span className="text-xs text-[#9a8c7a]">Rep {author.feedbackPoints.reputation}</span>
          )}
        </Link>
        {/* Stats row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[#9a8c7a]">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
            </svg>
            <span className="text-xs font-semibold text-ink-primary">{responses}</span>
            <span className="text-xs">{responses === 1 ? "critique" : "critiques"}</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-[#e8e0d0] flex-shrink-0" />
          <div className="flex items-center gap-1.5 text-[#9a8c7a]">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="text-xs font-semibold text-ink-primary">{comments}</span>
            <span className="text-xs">comments</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl p-5 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 bg-[#f4f1ec] rounded-full" />
        <div className="h-5 w-24 bg-[#f4f1ec] rounded-full" />
      </div>
      <div className="h-6 w-3/4 bg-[#f4f1ec] rounded-lg mb-2" />
      <div className="h-4 w-full bg-[#f4f1ec] rounded mb-1" />
      <div className="h-4 w-2/3 bg-[#f4f1ec] rounded mb-4" />
      <div className="flex gap-1.5 mb-4">
        <div className="h-4 w-20 bg-[#f4f1ec] rounded-full" />
        <div className="h-4 w-28 bg-[#f4f1ec] rounded-full" />
      </div>
      <div className="flex justify-between pt-3 border-t border-[#f0ebe3]">
        <div className="h-4 w-24 bg-[#f4f1ec] rounded" />
        <div className="h-4 w-20 bg-[#f4f1ec] rounded" />
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function FeedbackHub() {
  const { user } = useAuth();
  const [spotlight, setSpotlight] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSpotlight(); }, []);
  useEffect(() => { if (user) fetchWallet(); }, [user]);

  async function fetchWallet() {
    try {
      const res = await fetch(`${API_URL}/feedback/points/me`, { credentials: "include" });
      if (res.ok) setWallet(await res.json());
    } catch (e) {}
  }

  async function fetchSpotlight() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/spotlight`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSpotlight(data);
      }
    } catch (e) {}
    setLoading(false);
  }

  const wallet_costs = wallet?.TIER_COSTS ?? {};
  const bal = wallet?.postingBalance ?? 0;
  const isFreeEligible = !!(wallet?.freePostAvailable);
  const canPost = isFreeEligible || Object.entries(wallet_costs).some(([, cost]) => bal >= cost);

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />

      {/* Hero banner */}
      <div className="bg-ink-primary relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-ink-gold/10 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 relative">
          <p className="text-ink-gold text-xs font-bold uppercase tracking-widest mb-3">Inkwell</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white leading-tight mb-4">
            Feedback Hub
          </h1>
          <p className="text-white/60 text-base sm:text-lg max-w-xl">
            Read a chapter, leave a critique, earn points to post your own work.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* How it works — shown to guests */}
        {!wallet && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              { step: "1", title: "Read", desc: "Open any chapter below and read it fully." },
              { step: "2", title: "Critique", desc: "Leave ratings, general feedback, and paragraph comments." },
              { step: "3", title: "Post", desc: "Use the points you earned to post your own chapter." },
            ].map((s) => (
              <div key={s.step} className="bg-white border border-[#e8e0d0] rounded-2xl p-5 shadow-soft">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-ink-primary flex items-center justify-center text-white text-xs font-bold">
                    {s.step}
                  </div>
                </div>
                <p className="font-semibold text-ink-primary text-sm mb-1">{s.title}</p>
                <p className="text-xs text-[#9a8c7a] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Wallet strip */}
        {user && <WalletStrip wallet={wallet} />}

        {/* Guest CTA */}
        {!user && (
          <div className="bg-ink-primary text-white rounded-2xl px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 shadow-soft relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-ink-gold/10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="relative">
              <p className="font-serif text-xl mb-1">Ready to get feedback on your writing?</p>
              <p className="text-sm text-white/60">Sign in to read, critique, and post chapters.</p>
            </div>
            <Link
              to="/signup"
              className="relative flex-shrink-0 bg-ink-gold text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#c9a42d] transition-colors shadow-sm"
            >
              Get started
            </Link>
          </div>
        )}

        {/* ── Spotlight section header — no action button ──────────────────── */}
        <div className="flex items-center gap-4 mb-3">
          <h2 className="text-sm font-bold text-ink-gray uppercase tracking-widest whitespace-nowrap">
            In the Spotlight
          </h2>
          <div className="flex-1 h-px bg-[#e8e0d0]" />
        </div>

        <p className="text-sm text-[#9a8c7a] mb-6">
          Six chapters at a time. Once a chapter receives 3 critiques, it moves out and a new one takes its place.
        </p>

        {/* Spotlight grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : spotlight.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-ink-primary/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#b8a898]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-serif text-ink-primary text-lg mb-1">Nothing here yet</p>
            <p className="text-sm text-[#9a8c7a]">Be the first to post a chapter for feedback.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spotlight.map((sub) => (
              <SubmissionCard key={sub.id} sub={sub} />
            ))}
          </div>
        )}

        {/* Queue notice if fewer than 6 */}
        {!loading && spotlight.length > 0 && spotlight.length < 6 && (
          <div className="mt-6 flex items-center gap-3 bg-[#faf7f2] border border-[#e8e0d0] rounded-xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-ink-gold flex-shrink-0" />
            <p className="text-sm text-[#6b5c4a]">
              {6 - spotlight.length} spotlight {6 - spotlight.length === 1 ? "slot is" : "slots are"} open.{" "}
              {user && canPost ? (
                <Link to="/feedback/submit" className="text-ink-primary font-semibold hover:underline">
                  Submit your chapter
                </Link>
              ) : user ? (
                "Critique a chapter to earn posting points."
              ) : (
                <Link to="/signup" className="text-ink-primary font-semibold hover:underline">Sign in</Link>
              )}{" "}
              to fill one.
            </p>
          </div>
        )}

        {/* ── Outdated section ─────────────────────────────────────────────── */}
        <div className="mt-16 pt-10 border-t border-[#e8e0d0]">
          <div className="flex items-center gap-4 mb-3">
            <h2 className="text-sm font-bold text-ink-gray uppercase tracking-widest whitespace-nowrap">
              Outdated
            </h2>
            <div className="flex-1 h-px bg-[#e8e0d0]" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-[#9a8c7a] max-w-lg">
              Chapters that have received 3 critiques and moved out of the spotlight. You can still read and comment — half the critique points apply here.
            </p>
            <Link
              to="/feedback/outdated"
              className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-[#e8e0d0] text-ink-primary hover:border-ink-primary hover:shadow-[0_2px_12px_rgba(45,55,72,0.08)] transition-all"
            >
              View outdated chapters
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}