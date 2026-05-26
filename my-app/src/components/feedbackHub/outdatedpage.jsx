// src/components/feedback/OutdatedPage.jsx
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
      <div className="flex justify-between pt-3 border-t border-[#f0ebe3]">
        <div className="h-4 w-24 bg-[#f4f1ec] rounded" />
        <div className="h-4 w-20 bg-[#f4f1ec] rounded" />
      </div>
    </div>
  );
}

// ─── ARCHIVED CARD ────────────────────────────────────────────────────────────

function ArchivedCard({ sub }) {
  const author = sub.user;
  const responses = sub._count?.responses ?? sub.critiqueCount ?? 0;
  const comments = sub._count?.paragraphComments ?? 0;

  return (
    <Link
      to={`/feedback/${sub.id}`}
      className="group block bg-white border border-[#e8e0d0] rounded-2xl p-5 hover:border-[#b8a898] hover:shadow-[0_4px_16px_rgba(45,55,72,0.06)] transition-all duration-200"
    >
      {/* Archive ribbon */}
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

      {/* Title */}
      <h3 className="font-serif text-ink-primary text-lg leading-snug mb-2 group-hover:text-[#9a8c7a] transition-colors line-clamp-2">
        {sub.title}
      </h3>

      {/* Summary */}
      <p className="text-sm text-[#6b5c4a] leading-relaxed mb-4 line-clamp-2">
        {sub.summary}
      </p>

      {/* Feedback wanted tags */}
      {sub.feedbackWanted?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {sub.feedbackWanted.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[11px] text-[#9a8c7a] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
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

      {/* Critique tally */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1 h-1 bg-[#f0ebe3] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#b8a898]" style={{ width: "100%" }} />
        </div>
        <span className="text-[11px] text-[#9a8c7a] tabular-nums flex-shrink-0">
          {responses} {responses === 1 ? "critique" : "critiques"}
        </span>
      </div>

      {/* Bottom — author + stats */}
      <div className="flex items-center justify-between pt-3 border-t border-[#f0ebe3]">
        <Link
          to={`/profile/${author?.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-full bg-[#9a8c7a] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
            {author?.avatar
              ? <img src={author.avatar} alt={author.username} className="w-full h-full object-cover" />
              : <span>{author?.username?.charAt(0).toUpperCase() ?? "?"}</span>
            }
          </div>
          <span className="text-sm text-[#6b5c4a] font-medium hover:underline">{author?.username}</span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-[#b8a898]">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
            </svg>
            {comments} comments
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function OutdatedPage() {
  const [submissions, setSubmissions] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);

  const LIMIT = 10;

  useEffect(() => { fetchGenres(); }, []);
  useEffect(() => { fetchArchive(); }, [page, activeGenre]);

  async function fetchGenres() {
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/outdated/genres`, {
        credentials: "include",
      });
      if (res.ok) setGenres(await res.json());
    } catch (e) {}
  }

  function selectGenre(genre) {
    setActiveGenre(prev => prev === genre ? null : genre);
    setPage(1);
  }

  async function fetchArchive() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (activeGenre) params.set("genre", activeGenre);
      const res = await fetch(`${API_URL}/feedback/submissions/outdated?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        // Handle both array and paginated object responses
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
    <div className="min-h-screen bg-ink-cream">
      <Header />

      {/* Page header */}
      <div className="bg-white border-b border-[#e8e0d0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Back link */}
          <Link
            to="/feedback"
            className="inline-flex items-center gap-1.5 text-sm text-[#9a8c7a] hover:text-ink-primary transition-colors mb-5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Spotlight
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#9a8c7a] mb-2">Inkwell</p>
              <h1 className="text-3xl sm:text-4xl font-serif text-ink-primary leading-tight">
                Archive
              </h1>
              <p className="text-sm text-[#9a8c7a] mt-2 max-w-lg">
                Chapters that have received 3 or more critiques. They still accept comments — half the critique points apply here.
              </p>
            </div>
            {total > 0 && (
              <p className="text-sm text-[#9a8c7a] flex-shrink-0">
                {total} {total === 1 ? "chapter" : "chapters"}
              </p>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        {/* Genre filter tabs */}
        {genres.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <button
              onClick={() => selectGenre(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeGenre === null
                  ? "bg-[#2d3748] text-white border-[#2d3748]"
                  : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#9a8c7a]"
              }`}
            >
              All
            </button>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => selectGenre(g)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeGenre === g
                    ? "bg-[#2d3748] text-white border-[#2d3748]"
                    : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#9a8c7a]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Info banner */}
        <div className="bg-[#faf7f2] border border-[#e8e0d0] rounded-xl px-4 py-3 flex items-start gap-3 mb-8">
          <div className="w-1 self-stretch rounded-full bg-[#b8a898] flex-shrink-0" />
          <p className="text-sm text-[#6b5c4a] leading-relaxed">
            Critiquing archived chapters earns <span className="font-semibold text-ink-primary">half the usual points</span> — a good way to keep practising while the spotlight fills up.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-[#f4f1ec] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#b8a898]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
              </svg>
            </div>
            <p className="font-serif text-ink-primary text-lg mb-1">The archive is empty</p>
            <p className="text-sm text-[#9a8c7a]">
              Chapters appear here once they reach 3 critiques.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {submissions.map((sub) => (
                <ArchivedCard key={sub.id} sub={sub} />
              ))}
            </div>

            {/* Pagination */}
            {(page > 1 || hasMore) && (
              <div className="flex items-center justify-center gap-3 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-ink-gray hover:border-ink-primary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <span className="text-sm text-[#9a8c7a] px-2">Page {page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-ink-gray hover:border-ink-primary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
      </main>
    </div>
  );
}