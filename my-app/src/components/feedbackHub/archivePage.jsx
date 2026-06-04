// src/components/feedback/ArchivePage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API_URL from "@/config/api";
import Header from "../profile/header";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

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

// ─── ROW SKELETON ─────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl p-4 flex gap-5 animate-pulse">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex gap-2">
          <div className="h-4 w-14 bg-[#f4f1ec] rounded-full" />
          <div className="h-4 w-20 bg-[#f4f1ec] rounded-full" />
        </div>
        <div className="h-5 w-2/3 bg-[#f4f1ec] rounded" />
        <div className="h-3 w-full bg-[#f4f1ec] rounded" />
        <div className="h-2 w-40 bg-[#f4f1ec] rounded-full mt-2" />
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
        <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-[#e8e0d0] rounded-xl shadow-[0_8px_24px_rgba(26,26,46,0.1)] py-1.5 min-w-[160px]">
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

// ─── ARCHIVED ROW ─────────────────────────────────────────────────────────────

function ArchivedRow({ sub }) {
  const author = sub.user;
  const responses = sub._count?.responses ?? sub.critiqueCount ?? 0;
  const comments = sub._count?.paragraphComments ?? 0;
  // reputation lives on feedbackPoints (joined via userSelect in feedbackService)
  const reputation = author?.feedbackPoints?.reputation ?? null;

  return (
    <Link
      to={`/critique/${sub.id}`}
      className="group flex items-start gap-5 bg-white border border-[#e8e0d0] rounded-xl px-5 py-4 hover:border-[#b8a898] hover:shadow-[0_4px_20px_rgba(26,26,46,0.07)] transition-all duration-200"
    >
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Tags */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#9a8c7a] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
            {sub.genre}
          </span>
          <span className="text-[10px] text-[#9a8c7a] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
            {TIER_LABELS[sub.wordCountTier]}
          </span>
          <span className="text-[10px] text-[#9a8c7a] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
            {DRAFT_LABELS[sub.draftStage]}
          </span>
          {sub.feedbackWanted?.slice(0, 2).map((tag, i) => (
            <span key={i} className="text-[10px] text-[#9a8c7a] bg-[#f4f1ec] px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          {sub.feedbackWanted?.length > 2 && (
            <span className="text-[10px] text-[#9a8c7a]">+{sub.feedbackWanted.length - 2}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-serif text-[#1a1a2e] text-[1rem] leading-snug mb-1.5 group-hover:text-[#9a8c7a] transition-colors line-clamp-1">
          {sub.title}
        </h3>

        {/* Summary */}
        <p className="text-[13px] text-[#6b5c4a] leading-relaxed line-clamp-2 mb-3">
          {sub.summary}
        </p>

        {/* Critique tally — always full for archived */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 w-32">
            <div className="flex gap-1 flex-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full bg-[#b8a898]" />
              ))}
            </div>
            <span className="text-[10px] text-[#9a8c7a] tabular-nums flex-shrink-0">
              {responses} {responses === 1 ? "critique" : "critiques"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#b8a898]">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
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
        <div className="w-12 h-12 rounded-full bg-[#9a8c7a] flex items-center justify-center text-white text-sm font-semibold overflow-hidden ring-2 ring-[#e8e0d0] group-hover:ring-[#b8a898] transition-all">
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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ArchivePage() {
  const [submissions, setSubmissions]   = useState([]);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(false);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [genres, setGenres]             = useState([]);
  const [activeGenre, setActiveGenre]   = useState(null);

  const LIMIT = 12;

  useEffect(() => { fetchGenres(); }, []);
  useEffect(() => { fetchArchive(); }, [page, activeGenre]);

  async function fetchGenres() {
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/outdated/genres`, { credentials: "include" });
      if (res.ok) setGenres(await res.json());
    } catch (e) {}
  }

  function selectGenre(genre) {
    setActiveGenre(genre);
    setPage(1);
  }

  async function fetchArchive() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (activeGenre) params.set("genre", activeGenre);
      const res = await fetch(`${API_URL}/feedback/submissions/outdated?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSubmissions(data);
          setHasMore(false);
          setTotal(data.length);
        } else {
          setSubmissions(data.items ?? data);
          setTotal(data.total ?? (data.items?.length ?? 0));
          setHasMore(page < (data.pages ?? 1));
        }
      }
    } catch (e) {}
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Header />

      {/* ── Hero ── */}
      <div className="bg-[#1a1a2e] border-b border-white/10 relative overflow-hidden">
        {/* Gold shimmer bar at very top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-60" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <Link
            to="/critique"
            className="inline-flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors mb-4"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Spotlight
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4af37] mb-1.5">Critique Archive</p>
              <h1 className="font-serif text-white text-2xl sm:text-3xl leading-tight mb-1.5">Archive</h1>
              <p className="text-white/50 text-sm leading-relaxed max-w-md">
                Chapters that received 3 or more critiques. Still open for comments — half the points apply.
              </p>
            </div>
            {total > 0 && (
              <p className="text-[12px] text-white/40 flex-shrink-0">
                {total} {total === 1 ? "chapter" : "chapters"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8">

        {/* Toolbar: info + filter */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white border border-[#e8e0d0] rounded-lg px-3.5 py-2 flex-1 max-w-sm">
            <div className="w-px self-stretch bg-[#b8a898] flex-shrink-0" />
            <p className="text-[11px] text-[#6b5c4a] pl-1">
              Critiquing here earns <span className="font-semibold text-[#1a1a2e]">half the usual points</span> — good practice while the spotlight fills up.
            </p>
          </div>
          <GenreDropdown genres={genres} activeGenre={activeGenre} onSelect={selectGenre} />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)}
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 bg-white border border-[#e8e0d0] rounded-xl">
            <p className="font-serif text-[#1a1a2e] text-base mb-1">The archive is empty</p>
            <p className="text-sm text-[#9a8c7a]">Chapters appear here once they reach 3 critiques.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {submissions.map((sub) => (
                <ArchivedRow key={sub.id} sub={sub} />
              ))}
            </div>

            {(page > 1 || hasMore) && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-[#e8e0d0] bg-white text-[#6b5c4a] hover:border-[#1a1a2e] hover:text-[#1a1a2e] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <span className="text-sm text-[#9a8c7a]">Page {page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-[#e8e0d0] bg-white text-[#6b5c4a] hover:border-[#1a1a2e] hover:text-[#1a1a2e] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}