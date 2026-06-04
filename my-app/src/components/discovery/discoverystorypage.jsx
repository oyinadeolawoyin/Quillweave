// src/components/discovery/DiscoveryStoryPage.jsx
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_ICONS = {
  Wattpad:     "W",
  "Royal Road": "R",
  Kindle:      "K",
  "Amazon KU": "A",
  Webnovel:    "W",
  Scribble:    "S",
  "AO3":       "A",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Renders **bold** and *italic* stored as plain-text markdown
function FormattedContent({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="text-[#3a3028] leading-[1.95] text-[1.02rem] font-[Georgia,serif] whitespace-pre-wrap">
      {lines.map((line, idx) => {
        const parts = line.split(/(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*)/g);
        return (
          <span key={idx}>
            {parts.map((part, i) => {
              if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
                return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
              if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
                return <em key={i}>{part.slice(1, -1)}</em>;
              return <span key={i}>{part}</span>;
            })}
            {idx < lines.length - 1 && "\n"}
          </span>
        );
      })}
    </div>
  );
}

// ── Like Button ───────────────────────────────────────────────────────────────

function LikeButton({ liked, count, onToggle, pending }) {
  return (
    <button
      onClick={onToggle}
      disabled={pending}
      className={`flex items-center gap-2.5 px-8 py-3 rounded-2xl text-sm font-semibold
                  transition-all duration-200 disabled:opacity-60 shadow-[0_1px_4px_rgba(45,35,20,0.08)]
                  hover:shadow-[0_3px_12px_rgba(45,35,20,0.12)]
                  ${liked
                    ? "bg-[#fdf1f0] text-[#c0392b] border-2 border-[#f5c6c3]"
                    : "bg-white text-[#6b5c4a] border-2 border-[#e8e0d0] hover:border-[#f5c6c3] hover:text-[#c0392b]"
                  }`}
    >
      <svg
        className={`w-5 h-5 transition-transform duration-200 ${liked ? "scale-110" : ""}`}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {liked ? "Liked" : "Like this story"} · {count}
    </button>
  );
}

// ── Share Button ──────────────────────────────────────────────────────────────

function ShareButton({ title }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch (e) {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold
                 bg-white text-[#6b5c4a] border-2 border-[#e8e0d0] hover:border-[#2d3748]
                 hover:text-[#2d3748] transition-all duration-200 shadow-[0_1px_4px_rgba(45,35,20,0.08)]"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-[#6b8c6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DiscoveryStoryPage() {
  const { storyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [story, setStory]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [liked, setLiked]         = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likePending, setLikePending] = useState(false);

  useEffect(() => {
    fetchStory();
  }, [storyId]);

  async function fetchStory() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/discovery/${storyId}`, {
        credentials: "include",
      });
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) {
        // Surface the actual server error message in the console rather than
        // silently showing "Story not found" for things like 500s or auth errors.
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setStory(data.story);
      setLiked(data.story.likedByUser ?? false);
      setLikesCount(data.story._count?.likes ?? 0);
    } catch (e) {
      console.error("DiscoveryStoryPage fetch error:", e.message);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike() {
    if (!user) { navigate("/login"); return; }
    if (likePending) return;
    setLikePending(true);
    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => (wasLiked ? c - 1 : c + 1));
    try {
      const res = await fetch(`${API_URL}/discovery/${storyId}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount(data.likesCount);
      } else {
        // Revert
        setLiked(wasLiked);
        setLikesCount((c) => (wasLiked ? c + 1 : c - 1));
      }
    } catch {
      setLiked(wasLiked);
      setLikesCount((c) => (wasLiked ? c + 1 : c - 1));
    }
    setLikePending(false);
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2]">
        <Header />
        <div className="bg-[#2d3748] h-72 animate-pulse" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 -mt-10 relative z-10">
          <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(45,35,20,0.10)] overflow-hidden p-8 space-y-4 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-7 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-100 rounded" />
            <div className="space-y-2 pt-4">
              {[1,2,3,4,5].map(i => <div key={i} className="h-3.5 bg-gray-100 rounded w-full" />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#faf7f2]">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-28 text-center">
          <p className="text-7xl font-serif text-[#e8e0d0] mb-4">404</p>
          <h1 className="text-2xl font-serif text-[#2d3748] mb-3">Story not found</h1>
          <p className="text-sm text-[#9a8c7a] mb-6">It may have been removed or is awaiting approval.</p>
          <Link to="/discovery" className="text-[#b8860b] hover:underline text-sm">← Back to Discovery</Link>
        </main>
      </div>
    );
  }

  const date = new Date(story.createdAt).toLocaleDateString("en-US", {
    day: "numeric", month: "long", year: "numeric",
  });
  const platformInitial = PLATFORM_ICONS[story.platform] || story.platform?.charAt(0) || "P";

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Header />

      {/* ── Reedy-style Hero ─────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 220 }}>
        {/* Blurred background — book cover or dark gradient */}
        {story.coverUrl ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${story.coverUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(22px) brightness(0.55) saturate(1.3)",
              transform: "scale(1.08)",
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1e2235 0%, #2d3748 60%, #3b4a6b 100%)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)" }} />

        {/* Back link */}
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-5">
          <Link
            to="/stories"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Discovery
          </Link>
        </div>

        {/* Hero card row — book cover + title info */}
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8 flex items-center gap-6 sm:gap-8">
          {/* Book cover */}
          {story.coverUrl && (
            <div className="flex-shrink-0">
              <img
                src={story.coverUrl}
                alt={story.title}
                className="w-24 sm:w-32 rounded-xl object-cover shadow-2xl"
                style={{ aspectRatio: "2/3" }}
              />
            </div>
          )}

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#d4af37" }}>{story.genre}</p>
            <h1 className="font-serif text-white text-2xl sm:text-4xl leading-tight font-bold drop-shadow-lg mb-1">
              {story.title}
            </h1>
            <p className="text-white/70 text-sm font-medium mb-4">By {story.authorName}</p>

            {/* CTA button — Reedy style */}
            {story.platformLink && (
              <div className="flex items-center gap-2">
                <a
                  href={story.platformLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0 rounded-xl overflow-hidden text-sm font-semibold text-white shadow-lg"
                  style={{ background: "#c9940a" }}
                >
                  <span className="px-5 py-2.5">Read it now</span>
                  <span className="px-3 py-2.5 border-l border-white/25 flex items-center" style={{ background: "#b8860b" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Article card ─────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {/* Reedy-style card with light grey bg — no top margin overlap needed */}
        <article className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(45,35,20,0.10)] overflow-hidden mt-6">

          <div className="px-6 sm:px-12 pt-8 sm:pt-10 pb-10">

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="text-xs text-[#b8860b] font-bold uppercase tracking-widest">{date}</span>
              <span className="w-1 h-1 rounded-full bg-[#d6cfc4]" />
              <span className="text-xs text-[#9a8c7a]">{likesCount} like{likesCount !== 1 ? "s" : ""}</span>
              {story.recommendedBy && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#d6cfc4]" />
                  <span className="text-xs text-[#9a8c7a]">Recommended by {story.recommendedBy}</span>
                </>
              )}
            </div>

            {/* Divider ornament */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-0.5 bg-[#d4af37] rounded-full" />
              <div className="w-2 h-2 rounded-full bg-[#d4af37]/40" />
            </div>

            {/* Synopsis */}
            <div className="mb-8">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#b8a898] mb-3">Synopsis</p>
              <p className="text-[#6b5c4a] text-sm leading-relaxed italic border-l-2 border-[#f0d98a] pl-4">
                {story.synopsis}
              </p>
            </div>

            {/* First chapter label + chapter title */}
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#b8a898] mb-1">
                First chapter
              </p>
              {story.firstChapterTitle && (
                <p className="text-[#2d3748] font-serif text-lg font-semibold">
                  {story.firstChapterTitle}
                </p>
              )}
            </div>

            {/* Chapter text */}
            <FormattedContent text={story.firstChapter} />

            {/* ── Like + Share ───────────────────────────────────────────── */}
            <div className="mt-12 pt-8 border-t border-[#f0ebe3] flex flex-col items-center gap-3">
              <p className="text-sm text-[#9a8c7a]">Enjoyed this story?</p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <LikeButton
                  liked={liked}
                  count={likesCount}
                  onToggle={handleLike}
                  pending={likePending}
                />
                <ShareButton title={story.title} />
              </div>
              {!user && (
                <p className="text-xs text-[#b8a898] mt-1">
                  <Link to="/login" className="text-[#b8860b] hover:underline">Sign in</Link> to like this story
                </p>
              )}
            </div>
          </div>
        </article>

        {/* ── Reedy-style footer card — book + read CTA ────────────────────── */}
        {story.platformLink && (
          <section className="mt-6 mb-8">
            <div className="bg-[#e8e4de] rounded-2xl p-5 flex items-center gap-5">
              {story.coverUrl && (
                <img
                  src={story.coverUrl}
                  alt={story.title}
                  className="w-16 flex-shrink-0 rounded-lg shadow-md object-cover"
                  style={{ aspectRatio: "2/3" }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-1">{story.genre}</p>
                <p className="font-serif text-[#2d3748] font-bold text-base leading-tight">{story.title}</p>
                <p className="text-[#6b5c4a] text-xs mt-0.5">Written by {story.authorName}</p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <a
                    href={story.platformLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0 rounded-xl overflow-hidden text-sm font-semibold text-white shadow"
                    style={{ background: "#c9940a" }}
                  >
                    <span className="px-5 py-2">Read on {story.platform || "platform"}</span>
                    <span className="px-2.5 py-2 border-l border-white/25 flex items-center" style={{ background: "#b8860b" }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </a>
                  <ShareButton title={story.title} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Submitted-by card ────────────────────────────────────────────── */}
        <section className="mt-2">
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(45,35,20,0.06)] p-5 flex items-center gap-4">
            <Link to={`/profile/${story.user?.id}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-[#2d3748] flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                {story.user?.avatar
                  ? <img src={story.user.avatar} alt={story.user.username} className="w-full h-full object-cover" />
                  : <span>{story.user?.username?.charAt(0).toUpperCase() ?? "?"}</span>
                }
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#9a8c7a] mb-0.5">Submitted by</p>
              <Link to={`/profile/${story.user?.id}`} className="text-sm font-semibold text-[#2d3748] truncate hover:underline">
                {story.user?.username ?? "Unknown"}
              </Link>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-[#b8a898]">{date}</p>
              <div className="mt-1 inline-flex items-center gap-1.5 bg-[#f4f1ec] text-[#2d3748] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                <span className="w-4 h-4 rounded bg-[#2d3748] text-white flex items-center justify-center text-[9px]">
                  {platformInitial}
                </span>
                {story.platform}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}