import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../profile/header";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";

// ── Skeletons ─────────────────────────────────────────────────────────────────
function FeaturedSkeleton() {
  return (
    <div className="bg-white rounded-3xl shadow-soft overflow-hidden animate-pulse">
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-3/5 h-72 lg:h-96 bg-gray-200" />
        <div className="lg:w-2/5 p-8 lg:p-10 flex flex-col justify-center space-y-4">
          <div className="h-3 w-24 bg-gray-200 rounded-full" />
          <div className="h-8 w-full bg-gray-200 rounded" />
          <div className="h-8 w-4/5 bg-gray-200 rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-5/6 bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-xl mt-4" />
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden animate-pulse flex flex-col">
      <div className="h-48 bg-gray-200" />
      <div className="p-5 space-y-3 flex-1">
        <div className="h-3 w-16 bg-gray-200 rounded-full" />
        <div className="h-5 w-full bg-gray-200 rounded" />
        <div className="h-5 w-4/5 bg-gray-200 rounded" />
        <div className="space-y-1.5 pt-1">
          <div className="h-3.5 w-full bg-gray-100 rounded" />
          <div className="h-3.5 w-5/6 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

// ── Featured post (first post, full width) ────────────────────────────────────
function FeaturedCard({ post }) {
  const excerpt = post.content.length > 220 ? post.content.slice(0, 220) + "…" : post.content;
  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      to={`/blog/${post.id}`}
      className="group block bg-white rounded-3xl shadow-soft hover:shadow-soft-lg overflow-hidden transition-all duration-300"
    >
      <div className="flex flex-col lg:flex-row">
        {/* Image */}
        <div className="lg:w-3/5 h-72 lg:h-auto overflow-hidden bg-gradient-to-br from-ink-primary/10 to-ink-gold/10 relative flex-shrink-0">
          {post.mediaUrl ? (
            <img
              src={post.mediaUrl}
              alt={post.title || "Featured post"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full min-h-[18rem] flex items-center justify-center">
              <span className="text-7xl opacity-20 select-none">🖋️</span>
            </div>
          )}
          {/* Featured badge */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-ink-gold text-white text-xs font-bold rounded-full shadow-sm tracking-wide uppercase">
              Featured
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="lg:w-2/5 p-8 lg:p-10 flex flex-col justify-center">
          <p className="text-xs text-ink-gold font-semibold uppercase tracking-widest mb-3">{date}</p>
          {post.title ? (
            <h2 className="font-serif text-2xl lg:text-3xl text-ink-primary leading-tight mb-4
                           group-hover:text-ink-gold transition-colors duration-200">
              {post.title}
            </h2>
          ) : (
            <h2 className="font-serif text-2xl lg:text-3xl text-ink-primary leading-tight mb-4
                           group-hover:text-ink-gold transition-colors duration-200">
              {excerpt.slice(0, 80)}…
            </h2>
          )}
          <p className="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-3">{excerpt}</p>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink-primary text-white text-sm
                             font-medium rounded-xl group-hover:bg-ink-gold transition-colors duration-200">
              Read Article
              <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {post._count?.likes ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                </svg>
                {post._count?.comments ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Regular post card ─────────────────────────────────────────────────────────
function PostCard({ post }) {
  const excerpt = post.content.length > 120 ? post.content.slice(0, 120) + "…" : post.content;
  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      to={`/blog/${post.id}`}
      className="group bg-white rounded-2xl shadow-soft hover:shadow-soft-lg overflow-hidden transition-all duration-300 flex flex-col"
    >
      {/* Image area */}
      <div className="h-52 overflow-hidden bg-gradient-to-br from-ink-primary/5 to-ink-gold/5 relative flex-shrink-0">
        {post.mediaUrl ? (
          <img
            src={post.mediaUrl}
            alt={post.title || "Blog post"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-10 select-none">🖋️</span>
          </div>
        )}
        {/* Gold bar on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-[10px] text-ink-gold font-bold uppercase tracking-widest mb-2">{date}</p>
        {post.title && (
          <h2 className="font-serif text-lg text-ink-primary mb-2 leading-snug
                         group-hover:text-ink-gold transition-colors duration-200 line-clamp-2">
            {post.title}
          </h2>
        )}
        <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3">{excerpt}</p>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs font-medium text-ink-primary group-hover:text-ink-gold transition-colors flex items-center gap-1">
            Read more
            <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {post._count?.likes ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
              </svg>
              {post._count?.comments ?? 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  async function fetchPosts(p) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/blog?page=${p}&limit=9`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts(data.posts || []);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error(e);
      setError("Could not load posts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const featured = posts[0] || null;
  const rest = posts.slice(1);

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />
      <AppMetaTags
        title="Blog – Inkwell"
        description="Writing tips, inspiration, and updates from the Inkwell team."
      />

      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d1320 0%, #141c2e 40%, #1a2540 70%, #1e2d4a 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent 5%, #d4af37 35%, #d4af37 65%, transparent 95%)" }} />
        <div className="absolute pointer-events-none" style={{ top: "-80px", right: "-60px", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 65%)" }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 relative">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-3" style={{ color: "#d4af37" }}>Inkwell</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white leading-tight mb-4">
            Stories &amp; Insights
          </h1>
          <p className="text-white text-base sm:text-lg max-w-xl" style={{ opacity: 0.65 }}>
            Writing tips, craft deep-dives, and inspiration to keep your words flowing.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-8 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-8">
            <FeaturedSkeleton />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-20 h-20 rounded-full bg-ink-primary/5 flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">🖋️</span>
            </div>
            <h2 className="text-2xl font-serif text-ink-primary mb-2">No posts yet</h2>
            <p className="text-gray-500 text-sm">Check back soon for writing tips and updates.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Featured post */}
            {featured && <FeaturedCard post={featured} />}

            {/* Rest of posts */}
            {rest.length > 0 && (
              <>
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-bold text-ink-gray uppercase tracking-widest">More Articles</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((post) => <PostCard key={post.id} post={post} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-14">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200
                         bg-white text-ink-gray hover:border-ink-primary hover:text-ink-primary
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-soft"
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
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                    ${p === page
                      ? "bg-ink-primary text-white shadow-soft"
                      : "bg-white border border-gray-200 text-ink-gray hover:border-ink-primary hover:text-ink-primary"
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200
                         bg-white text-ink-gray hover:border-ink-primary hover:text-ink-primary
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-soft"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}