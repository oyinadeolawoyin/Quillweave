import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../profile/header";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";

// ── Helpers ────────────────────────────────────────────────────────────────────
function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getExcerpt(content = "", length = 160) {
  const text = stripHtml(content);
  return text.length > length ? text.slice(0, length) + "…" : text;
}

// Category badges (based on series title or post tags — shown as section labels)
const SECTION_COLORS = {
  "Community News":   { bg: "#1a1a2e", text: "#fff" },
  "Behind the Draft": { bg: "#d4af37", text: "#1a1a2e" },
  "Opinion":          { bg: "#1a1a2e", text: "#d4af37" },
  "Book Corner":      { bg: "#d4af37", text: "#1a1a2e" },
  "New Faces":        { bg: "#1a1a2e", text: "#fff" },
  "Weekly Roundup":   { bg: "#1a1a2e", text: "#d4af37" },
  "Fun Fact":         { bg: "#d4af37", text: "#1a1a2e" },
};

function SectionBadge({ label, onFilter, seriesSlug }) {
  const style = SECTION_COLORS[label] || { bg: "#1a1a2e", text: "#fff" };

  // If this badge represents a series (not a category), link to the series page
  // instead of applying it as a category filter.
  if (seriesSlug) {
    return (
      <Link
        to={`/blog/series/${seriesSlug}`}
        onClick={e => e.stopPropagation()}
        className="inline-block px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] rounded-sm hover:opacity-80 transition-opacity cursor-pointer"
        style={{ background: style.bg, color: style.text }}
      >
        {label}
      </Link>
    );
  }

  if (onFilter) {
    return (
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); onFilter(label); }}
        className="inline-block px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] rounded-sm hover:opacity-80 transition-opacity cursor-pointer"
        style={{ background: style.bg, color: style.text }}
      >
        {label}
      </button>
    );
  }
  return (
    <span
      className="inline-block px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] rounded-sm"
      style={{ background: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function SkeletonHero() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden bg-gray-200" style={{ height: "420px" }} />
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white border border-[#e8e0d0] rounded-xl overflow-hidden">
      <div className="h-40 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-2.5 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-4/5 bg-gray-200 rounded" />
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-3/4 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// ── TOP STORY (pinned) ────────────────────────────────────────────────────────
function TopStoryBanner({ post, onFilter }) {
  const excerpt = getExcerpt(post.content, 220);
  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const categoryLabel = post.category || post.series?.title;
  const seriesSlug = !post.category ? post.series?.slug : null;

  return (
    <Link
      to={`/blog/${post.id}`}
      className="group block relative rounded-2xl overflow-hidden"
      style={{ minHeight: "420px" }}
    >
      {/* Background */}
      {post.mediaUrl ? (
        <img
          src={post.mediaUrl}
          alt={post.title || "Top story"}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0d1320 0%, #1a2540 60%, #1e2d4a 100%)" }}
        />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: post.mediaUrl
          ? "linear-gradient(to top, rgba(10,10,20,0.97) 0%, rgba(10,10,20,0.7) 55%, rgba(10,10,20,0.25) 100%)"
          : "linear-gradient(to top, rgba(10,10,20,0.98) 0%, rgba(10,10,20,0.55) 100%)"
        }}
      />

      {/* Gold top rule */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "#d4af37" }} />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-7 sm:p-10">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="inline-block px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm"
            style={{ background: "#d4af37", color: "#1a1a2e" }}
          >
            Top Story
          </span>
          {categoryLabel && <SectionBadge label={categoryLabel} onFilter={onFilter} seriesSlug={seriesSlug} />}
        </div>

        {post.title && (
          <h2
            className="font-serif text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-3
                       group-hover:text-[#d4af37] transition-colors duration-300"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.5)" }}
          >
            {post.title}
          </h2>
        )}

        <p className="text-white/70 text-sm sm:text-base max-w-2xl leading-relaxed mb-4 line-clamp-2">
          {excerpt}
        </p>

        <div className="flex items-center gap-4 text-white/50 text-xs">
          <span>{date}</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span>{post._count?.likes ?? 0} likes</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span>{post._count?.comments ?? 0} comments</span>
        </div>
      </div>
    </Link>
  );
}

// ── STANDARD POST CARD (magazine grid) ────────────────────────────────────────
function PostCard({ post, size = "normal", onFilter }) {
  const excerpt = getExcerpt(post.content, size === "large" ? 160 : 100);
  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const categoryLabel = post.category || post.series?.title;
  const seriesSlug = !post.category ? post.series?.slug : null;

  if (size === "large") {
    return (
      <Link
        to={`/blog/${post.id}`}
        className="group bg-white border border-[#e8e0d0] rounded-xl overflow-hidden hover:border-[#d4af37]/60
                   transition-all duration-300 hover:shadow-[0_4px_24px_rgba(212,175,55,0.12)] flex flex-col"
      >
        <div className="relative overflow-hidden" style={{ height: "200px", background: "linear-gradient(135deg, #1a1a2e, #1e2d4a)" }}>
          {post.mediaUrl ? (
            <img src={post.mediaUrl} alt={post.title || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-10">
              <span className="font-serif text-white text-6xl">Q</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }} />
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2.5">
            {categoryLabel && <SectionBadge label={categoryLabel} onFilter={onFilter} seriesSlug={seriesSlug} />}
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#d4af37" }}>{date}</span>
          </div>
          {post.title && (
            <h3 className="font-serif text-lg text-[#1a1a2e] leading-snug mb-2 group-hover:text-[#d4af37] transition-colors line-clamp-2">
              {post.title}
            </h3>
          )}
          <p className="text-sm text-[#6b5c4a] leading-relaxed flex-1 line-clamp-3">{excerpt}</p>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#f0ebe3]">
            <span className="text-xs font-semibold text-[#1a1a2e] group-hover:text-[#d4af37] transition-colors flex items-center gap-1">
              Read more
              <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <div className="flex items-center gap-3 text-xs text-[#9a8c7a]">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {post._count?.likes ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  // Compact horizontal card
  return (
    <Link
      to={`/blog/${post.id}`}
      className="group flex gap-4 py-4 border-b border-[#e8e0d0] last:border-b-0 hover:bg-[#faf8f4] -mx-4 px-4 transition-colors"
    >
      {post.mediaUrl && (
        <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#f0ebe3]">
          <img src={post.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {categoryLabel && <SectionBadge label={categoryLabel} onFilter={onFilter} seriesSlug={seriesSlug} />}
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#d4af37" }}>{date}</span>
        </div>
        {post.title ? (
          <h3 className="font-serif text-sm text-[#1a1a2e] leading-snug group-hover:text-[#d4af37] transition-colors line-clamp-2">{post.title}</h3>
        ) : (
          <p className="text-sm text-[#6b5c4a] leading-snug line-clamp-2">{excerpt}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#9a8c7a]">
          <span>{post._count?.likes ?? 0} likes</span>
          <span>·</span>
          <span>{post._count?.comments ?? 0} comments</span>
        </div>
      </div>
    </Link>
  );
}

// ── Series card ───────────────────────────────────────────────────────────────
function SeriesCard({ series }) {
  const postCount = series._count?.posts ?? 0;
  return (
    <Link
      to={`/blog/series/${series.slug}`}
      className="group relative block rounded-xl overflow-hidden border border-[#e8e0d0] hover:border-[#d4af37]/60
                 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(212,175,55,0.12)]"
      style={{ minHeight: "160px" }}
    >
      {series.coverUrl ? (
        <img src={series.coverUrl} alt={series.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #1e2d4a 100%)" }} />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.4) 100%)" }} />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm text-[#1a1a2e]" style={{ background: "#d4af37" }}>
            Series
          </span>
          <span className="text-[10px] text-white/50">{postCount} {postCount === 1 ? "part" : "parts"}</span>
        </div>
        <h3 className="font-serif text-white text-base leading-snug group-hover:text-[#d4af37] transition-colors line-clamp-2">
          {series.title}
        </h3>
      </div>
    </Link>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-2 h-5 rounded-sm flex-shrink-0" style={{ background: "#d4af37" }} />
      <h2 className="text-xs font-black uppercase tracking-[0.22em] text-[#1a1a2e]">{title}</h2>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, #e8e0d0, transparent)" }} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [series, setSeries] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSeries, setIsLoadingSeries] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null); // null = All

  const CATEGORIES = [
    "Community News",
    "Behind the Draft",
    "Opinion",
    "Book Corner",
    "New Faces",
    "Weekly Roundup",
    "Series",
  ];

  useEffect(() => { setPage(1); }, [activeCategory]);
  useEffect(() => { fetchPosts(page); }, [page, activeCategory]);
  useEffect(() => { fetchSeries(); }, []);

  async function fetchPosts(p) {
    setIsLoading(true);
    setError(null);
    try {
      const catParam = activeCategory && activeCategory !== "Series" ? `&category=${encodeURIComponent(activeCategory)}` : "";
      const res = await fetch(`${API_URL}/blog?page=${p}&limit=12${catParam}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts(data.posts || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("Could not load posts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchSeries() {
    setIsLoadingSeries(true);
    try {
      const res = await fetch(`${API_URL}/blog/series`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSeries(data.series || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSeries(false);
    }
  }

  // Split: pinned (top story), rest
  const pinnedPost = posts.find(p => p.isPinned);
  const standalonePosts = posts.filter(p => !p.series && !p.isPinned);
  const seriesPosts = posts.filter(p => p.series && !p.isPinned);

  // Show series-only view when "Series" tab active
  const showSeriesOnly = activeCategory === "Series";

  // Layout: first 2 standalones go in the big card grid, rest in compact list
  const featuredPosts = standalonePosts.slice(0, 2);
  const listPosts = standalonePosts.slice(2);

  return (
    <div className="min-h-screen" style={{ background: "#f5f3ef" }}>
      <Header />
      <AppMetaTags
        title="Community News – Inkwell"
        description="Community highlights, behind the draft, member opinions, book picks, and more from Quillweave."
      />

      {/* ── Masthead ──────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden border-b"
        style={{
          background: "linear-gradient(135deg, #0d1320 0%, #141c2e 50%, #1a2540 100%)",
          borderColor: "rgba(212,175,55,0.3)"
        }}
      >
        {/* subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        {/* gold top rule */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "#d4af37" }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 relative">
          {/* date line */}
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40 mb-4">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>

          {/* Masthead title */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b pb-8" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <div>
              <p className="text-[10px] font-black tracking-[0.35em] uppercase mb-2" style={{ color: "#d4af37" }}>Inkwell</p>
              <h1 className="font-serif text-white text-4xl sm:text-5xl lg:text-6xl leading-none">
                Community<br className="hidden sm:block" /> News
              </h1>
            </div>
            <p className="text-white/50 text-sm max-w-sm leading-relaxed">
              Highlights, updates, opinions, and stories from the writers who make this community.
            </p>
          </div>

          {/* Category filter tabs */}
          <div className="flex items-center gap-1 flex-wrap pt-5 gap-y-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg transition-all ${
                !activeCategory
                  ? "text-[#1a1a2e] bg-[#d4af37]"
                  : "text-white/50 hover:text-white/80 hover:bg-white/10"
              }`}
            >
              All
            </button>
            {CATEGORIES.map(label => (
              <button
                key={label}
                onClick={() => setActiveCategory(c => c === label ? null : label)}
                className={`text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg transition-all ${
                  activeCategory === label
                    ? "text-[#1a1a2e] bg-[#d4af37]"
                    : "text-white/40 hover:text-white/80 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">{error}</div>
        )}

        {/* Active category banner */}
        {activeCategory && (
          <div className="flex items-center gap-3">
            <div className="w-2 h-5 rounded-sm flex-shrink-0" style={{ background: "#d4af37" }} />
            <h2 className="text-xs font-black uppercase tracking-[0.22em] text-[#1a1a2e]">{activeCategory}</h2>
            <div className="flex-1 h-px bg-[#e8e0d0]" />
            <button
              onClick={() => setActiveCategory(null)}
              className="text-xs text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors font-medium"
            >
              Clear filter ×
            </button>
          </div>
        )}

        {/* ── Series-only view ────────────────────────────────────────────── */}
        {showSeriesOnly && (
          <section>
            <SectionHeader title="Story Series" />
            {isLoadingSeries ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />)}
              </div>
            ) : series.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#e8e0d0]">
                <p className="text-[#9a8c7a] text-sm">No series yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {series.map(s => <SeriesCard key={s.id} series={s} />)}
              </div>
            )}
          </section>
        )}

        {/* ── Top Story (pinned) — hide when filtered ──────────────────────── */}
        {!showSeriesOnly && (isLoading ? (
          <SkeletonHero />
        ) : pinnedPost ? (
          <section>
            <TopStoryBanner post={pinnedPost} onFilter={setActiveCategory} />
          </section>
        ) : null)}

        {/* ── Featured + sidebar layout ───────────────────────────────────── */}
        {!showSeriesOnly && !isLoading && (featuredPosts.length > 0 || listPosts.length > 0 || series.length > 0) && (
          <section>
            <SectionHeader title={activeCategory ? activeCategory : "Latest"} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Left: featured cards grid */}
              <div className="lg:col-span-2 space-y-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[1,2].map(i => <SkeletonCard key={i} />)}
                  </div>
                ) : featuredPosts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {featuredPosts.map(post => <PostCard key={post.id} post={post} size="large" onFilter={setActiveCategory} />)}
                  </div>
                ) : null}

                {/* Inline compact list of additional posts */}
                {listPosts.length > 0 && (
                  <div className="bg-white border border-[#e8e0d0] rounded-xl px-4 pt-4 pb-0">
                    {listPosts.map(post => <PostCard key={post.id} post={post} onFilter={setActiveCategory} />)}
                  </div>
                )}
              </div>

              {/* Right: sidebar */}
              <aside className="space-y-8">
                {/* Series in sidebar */}
                {!activeCategory && (isLoadingSeries || series.length > 0) && (
                  <div>
                    <SectionHeader title="Story Series" />
                    {isLoadingSeries ? (
                      <div className="space-y-3">
                        {[1,2].map(i => <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />)}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {series.map(s => <SeriesCard key={s.id} series={s} />)}
                      </div>
                    )}
                  </div>
                )}

                {/* Recent series posts */}
                {seriesPosts.length > 0 && (
                  <div>
                    <SectionHeader title="From the Archives" />
                    <div className="bg-white border border-[#e8e0d0] rounded-xl px-4 pt-4 pb-0">
                      {seriesPosts.map(post => <PostCard key={post.id} post={post} onFilter={setActiveCategory} />)}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}

        {/* Empty state */}
        {!isLoading && posts.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border border-[#e8e0d0]">
            <p className="font-serif text-3xl text-[#1a1a2e] mb-2">No posts yet</p>
            <p className="text-[#9a8c7a] text-sm">The first edition is coming soon.</p>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-5 py-2.5 rounded-lg text-sm font-medium border border-[#e8e0d0] bg-white text-[#1a1a2e]
                         hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                    ${p === page ? "text-white" : "bg-white border border-[#e8e0d0] text-[#6b5c4a] hover:border-[#d4af37] hover:text-[#d4af37]"}`}
                  style={p === page ? { background: "#1a1a2e" } : {}}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-5 py-2.5 rounded-lg text-sm font-medium border border-[#e8e0d0] bg-white text-[#1a1a2e]
                         hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Footer rule */}
      <div className="border-t border-[#e8e0d0] mx-4 sm:mx-8 mb-8" />
    </div>
  );
}