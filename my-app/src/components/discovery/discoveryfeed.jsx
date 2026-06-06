import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function StoryCard({ story }) {
  const [liked, setLiked] = useState(story.likedByUser || false);
  const [likesCount, setLikesCount] = useState(story._count?.likes ?? 0);
  const [liking, setLiking] = useState(false);
  const { user } = useAuth();

  async function handleLike(e) {
    e.preventDefault();
    if (!user || liking) return;
    setLiking(true);
    const prev = { liked, likesCount };
    setLiked(!liked);
    setLikesCount((c) => (liked ? c - 1 : c + 1));
    try {
      const res = await fetch(`${API_URL}/discovery/${story.id}/like`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLiked(data.liked);
      setLikesCount(data.likesCount);
    } catch {
      setLiked(prev.liked);
      setLikesCount(prev.likesCount);
    } finally {
      setLiking(false);
    }
  }

  return (
    <Link
      to={`/discovery/${story.id}`}
      className="group block bg-white rounded-2xl shadow-soft hover:shadow-soft-lg overflow-hidden transition-all duration-300 flex flex-col sm:flex-row"
    >
      {/* Cover — bigger, left side */}
      <div className="sm:w-[140px] sm:flex-shrink-0 h-48 sm:h-auto overflow-hidden bg-gradient-to-br from-ink-primary/5 to-ink-gold/5 relative">
        {story.coverUrl ? (
          <img
            src={story.coverUrl}
            alt={story.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-10 select-none">📖</span>
          </div>
        )}
        {/* Gold accent bar on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left sm:hidden" />
        <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-ink-gold scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top hidden sm:block" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 p-5 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-[10px] font-bold tracking-widest text-ink-gold uppercase">{story.genre}</p>
          {/* Heart tab — top right */}
          <button
            onClick={handleLike}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all flex-shrink-0 ${
              liked
                ? "text-rose-500 border-rose-200 bg-rose-50"
                : "text-[#9a8c7a] border-[#e8e0d0] hover:text-rose-400 hover:border-rose-200"
            } ${!user ? "cursor-default" : "cursor-pointer"}`}
          >
            <HeartIcon filled={liked} />
            <span>{likesCount}</span>
          </button>
        </div>

        <h3 className="font-serif text-ink-primary text-lg font-bold leading-snug mb-0.5 group-hover:text-ink-gold transition-colors duration-200 line-clamp-2">
          {story.title}
        </h3>
        <p className="text-sm text-[#6b5c4a] mb-2">
          {story.authorName}
          {story.recommendedBy && (
            <span className="text-[#9a8c7a]"> · recommended by {story.recommendedBy}</span>
          )}
        </p>
        <p className="text-sm text-[#6b5c4a] leading-relaxed line-clamp-2 flex-1 mb-3">{story.synopsis}</p>

        {/* Content warnings */}
        {story.contentWarnings?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {story.contentWarnings.map((w) => (
              <span
                key={w}
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border"
                style={{ color: "#7c2020", borderColor: "#f5c6c3", background: "#fdf1f0" }}
              >
                <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {w}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xs font-medium text-ink-primary group-hover:text-ink-gold transition-colors flex items-center gap-1">
            Read on {story.platform}
            <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <span className="text-xs text-[#9a8c7a] bg-[#f5f1eb] px-2.5 py-1 rounded-full border border-[#e8e0d0]">
            {story.platform}
          </span>
        </div>
      </div>
    </Link>
  );
}

function StorySkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden animate-pulse flex flex-col sm:flex-row">
      <div className="sm:w-[140px] h-48 sm:h-auto bg-gray-200 flex-shrink-0" />
      <div className="flex-1 p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-2.5 w-16 bg-gray-200 rounded-full" />
          <div className="h-6 w-12 bg-gray-200 rounded-full" />
        </div>
        <div className="h-5 w-3/4 bg-gray-200 rounded" />
        <div className="h-3.5 w-1/3 bg-gray-200 rounded" />
        <div className="h-3.5 w-full bg-gray-100 rounded" />
        <div className="h-3.5 w-5/6 bg-gray-100 rounded" />
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <div className="h-3.5 w-24 bg-gray-200 rounded" />
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function DiscoveryFeed() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();
  const location = useLocation();
  const justSubmitted = location.state?.submitted;

  useEffect(() => { fetchStories(); }, [page]);

  async function fetchStories() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/discovery?page=${page}&limit=12`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStories(data.stories);
      setTotalPages(data.totalPages);
    } catch {
      setStories([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />

      {/* Hero banner — matches new Inkwell brand */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d1320 0%, #141c2e 40%, #1a2540 70%, #1e2d4a 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent 5%, #d4af37 35%, #d4af37 65%, transparent 95%)" }} />
        <div className="absolute pointer-events-none" style={{ top: "-80px", right: "-60px", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 65%)" }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 relative">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-3" style={{ color: "#d4af37" }}>Inkwell</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white leading-tight mb-4">
                Discovery
              </h1>
              <p className="text-white text-base sm:text-lg max-w-xl" style={{ opacity: 0.65 }}>
                Stories written by our community — find your next favourite read.
              </p>
            </div>
            {user && (
              <Link
                to="/stories/submit"
                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors shadow-sm text-[#12181f]"
                style={{ background: "linear-gradient(135deg, #d4af37 0%, #c09a28 100%)", boxShadow: "0 4px 16px rgba(212,175,55,0.35)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Promote your story
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Submitted banner */}
        {justSubmitted && (
          <div className="mb-8 px-5 py-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl text-sm text-emerald-700 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your story was submitted and is pending review. We'll make it live once approved.
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <StorySkeleton key={i} />)}
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-20 h-20 rounded-full bg-ink-primary/5 flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">📖</span>
            </div>
            <h2 className="text-2xl font-serif text-ink-primary mb-2">No stories yet</h2>
            <p className="text-gray-500 text-sm mb-4">Be the first to share a story with the community.</p>
            {user && (
              <Link
                to="/discovery/submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Promote your story
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Section label */}
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-sm font-bold text-ink-gray uppercase tracking-widest">Community Stories</h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-4">
              {stories.map((story) => <StoryCard key={story.id} story={story} />)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-14">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-ink-gray hover:border-ink-primary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-soft"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                        p === page
                          ? "bg-ink-primary text-white shadow-soft"
                          : "bg-white border border-gray-200 text-ink-gray hover:border-ink-primary hover:text-ink-primary"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-ink-gray hover:border-ink-primary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-soft"
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

        {!user && (
          <p className="text-center text-sm text-[#9a8c7a] mt-10">
            <Link to="/login" className="text-ink-gold underline underline-offset-2">Sign in</Link> to like stories or promote your own.
          </p>
        )}
      </main>
    </div>
  );
}