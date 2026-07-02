// src/components/feedback/QueuePage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API_URL from "@/config/api";

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

// ─── QUEUE ROW ────────────────────────────────────────────────────────────────

function QueueRow({ sub, position }) {
  const author = sub.user;
  const comments = sub._count?.paragraphComments ?? 0;
  const critiqueCount = sub.critiqueCount ?? sub._count?.responses ?? 0;
  // reputation lives on feedbackPoints (joined via userSelect in feedbackService)
  const reputation = author?.feedbackPoints?.reputation ?? null;

  return (
    <Link
      to={`/critique/${sub.id}`}
      className="group relative flex items-start gap-5 bg-white border border-[#e8e0d0] rounded-xl px-5 py-4 hover:border-[#1a1a2e] hover:shadow-[0_4px_20px_rgba(26,26,46,0.08)] transition-all duration-200"
    >
      {/* Position badge — subtle left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl bg-[#e8e0d0] group-hover:bg-[#d4af37] transition-colors" />

      {/* Main content */}
      <div className="flex-1 min-w-0 pl-1">
        {/* Tags */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-[9px] font-bold text-[#9a8c7a] tabular-nums mr-0.5">#{position}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-[#1a1a2e] px-2.5 py-0.5 rounded-full">
            {sub.genre}
          </span>
          <span className="text-[10px] text-[#9a8c7a] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
            {TIER_LABELS[sub.wordCountTier]}
          </span>
          <span className="text-[10px] text-[#9a8c7a] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
            {DRAFT_LABELS[sub.draftStage]}
          </span>
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

        {/* Content warnings */}
        {sub.contentWarnings?.length > 0 && (
          <div className="flex gap-1 mb-2 flex-wrap">
            {sub.contentWarnings.map((w, i) => (
              <span key={i} className="text-[10px] text-[#c0392b] bg-[#fdf1f0] px-2 py-0.5 rounded-full border border-[#f5c6c3]">
                {w}
              </span>
            ))}
          </div>
        )}

        {/* Progress or first-critique callout */}
        {critiqueCount > 0 ? (
          <div className="flex items-center gap-4">
            <div className="w-32">
              <CritiqueProgress count={critiqueCount} max={2} />
            </div>
            <div className="flex items-center gap-1 text-[#b8a898]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="text-[11px]">{comments}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] flex-shrink-0" />
            <p className="text-[11px] text-[#6b5c4a]">
              Be the <span className="font-semibold text-[#1a1a2e]">first to critique</span> — earns you points
            </p>
          </div>
        )}
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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const [submissions, setSubmissions]   = useState([]);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(false);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [genres, setGenres]             = useState([]);
  const [activeGenre, setActiveGenre]   = useState(null);

  const LIMIT = 12;

  useEffect(() => { fetchGenres(); }, []);
  useEffect(() => { fetchQueue(); }, [page, activeGenre]);

  async function fetchGenres() {
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/queue/genres`, { credentials: "include" });
      if (res.ok) setGenres(await res.json());
    } catch (e) {}
  }

  async function fetchQueue() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (activeGenre) params.set("genre", activeGenre);
      const res = await fetch(`${API_URL}/feedback/submissions/queue?${params}`, { credentials: "include" });
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

  function selectGenre(genre) {
    setActiveGenre(genre);
    setPage(1);
  }

  const offset = (page - 1) * LIMIT;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-7 sm:py-8">

      {/* ── Page header — fits inside the sidebar/topbar layout, no dark hero ── */}
      <Link
        to="/critique"
        className="inline-flex items-center gap-1.5 text-[11px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors mb-4"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Critique Hub
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b8860b] mb-1.5">Critique Queue</p>
          <h1 className="font-serif text-[#1a1a2e] text-2xl sm:text-[28px] leading-tight mb-1.5">Queue</h1>
          <p className="text-[#6b5c4a] text-sm leading-relaxed max-w-md">
            Waiting for a spotlight slot. First-in, first-out — oldest chapter moves up when a slot opens.
          </p>
        </div>
        {total > 0 && (
          <p className="text-[12px] text-[#9a8c7a] flex-shrink-0">
            {total} {total === 1 ? "chapter" : "chapters"} waiting
          </p>
        )}
      </div>

      {/* Toolbar: info + filter */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 bg-[#fffdf0] border border-[#d4af37]/40 rounded-lg px-3.5 py-2 flex-1 max-w-sm">
          <div className="w-1 h-1 rounded-full bg-[#d4af37] flex-shrink-0" />
          <p className="text-[11px] text-[#6b5c4a]">
            Critiquing earns <span className="font-semibold text-[#1a1a2e]">base-tier points - 2</span> for the chapter's length.
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
          <p className="font-serif text-[#1a1a2e] text-base mb-1">The queue is empty</p>
          <p className="text-sm text-[#9a8c7a]">
            {activeGenre ? `No ${activeGenre} chapters waiting right now.` : "All chapters are in the spotlight or archive."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {submissions.map((sub, i) => (
              <QueueRow key={sub.id} sub={sub} position={offset + i + 1} />
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
  );
}