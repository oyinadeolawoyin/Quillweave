// src/components/blog/community.jsx
//
// Community page — renders inside the shared Layout's <Outlet/>, so it owns
// no header, sidebar, or hero of its own (Layout already provides TopBar +
// Sidebar chrome). Shows each of the site's content categories with its
// three most recent posts; clicking a category title filters the page down
// to every post in that category.

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";

// ── Categories ───────────────────────────────────────────────────────────────
// The five content types the site publishes. `label` is what's stored on each
// post; `name` / `tag` are the display copy for the category card.
const CATEGORIES = [
  {
    label: "Stories from Writers",
    name: "Stories from Writers",
    tag: "Stories, lessons, and experiences from writers working toward finished drafts.",
  },
  {
    label: "Writing Tips",
    name: "Writing Tips",
    tag: "Craft advice and technique",
  },
  {
    label: "Finished Drafts",
    name: "Finished Drafts",
    tag: "Members who crossed the finish line",
  },
  {
    label: "Opinion",
    name: "Opinion",
    tag: "Takes and perspectives from the community",
  },
  {
    label: "Community Update & News",
    name: "Community Update & News",
    tag: "What's happening around here",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getExcerpt(content = "", length = 100) {
  const text = stripHtml(content);
  return text.length > length ? text.slice(0, length) + "…" : text;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Post card (used inside category rows + filtered grid) ───────────────────
function PostCard({ post }) {
  const excerpt = getExcerpt(post.content, 100);

  return (
    <Link
      to={`/blog/${post.id}`}
      className="group bg-white border border-[#e8e0d0] rounded-xl overflow-hidden hover:border-[#d4af37]/60
                 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(212,175,55,0.10)] flex flex-col"
    >
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{ height: "140px", background: "linear-gradient(135deg, #1a1a2e, #1e2d4a)" }}
      >
        {post.mediaUrl ? (
          <img
            src={post.mediaUrl}
            alt={post.title || ""}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-10">
            <span className="font-serif text-white text-5xl">Q</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <span className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#d4af37" }}>
          {formatDate(post.createdAt)}
        </span>

        {post.title && (
          <h3 className="font-serif text-base text-[#1a1a2e] leading-snug mb-1.5 line-clamp-2 group-hover:text-[#b8860b] transition-colors">
            {post.title}
          </h3>
        )}

        <p className="text-[13px] text-[#6b5c4a] leading-relaxed flex-1 line-clamp-2">{excerpt}</p>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#f0ebe3] text-[11px] text-[#9a8c7a]">
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
    </Link>
  );
}

// ── Compact row card (used in the filtered single-category list) ────────────
function PostRow({ post }) {
  const excerpt = getExcerpt(post.content, 140);
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
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#d4af37" }}>
          {formatDate(post.createdAt)}
        </span>
        {post.title ? (
          <h3 className="font-serif text-sm text-[#1a1a2e] leading-snug mt-0.5 group-hover:text-[#b8860b] transition-colors line-clamp-2">
            {post.title}
          </h3>
        ) : (
          <p className="text-sm text-[#6b5c4a] leading-snug mt-0.5 line-clamp-2">{excerpt}</p>
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

// ── Skeletons ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white border border-[#e8e0d0] rounded-xl overflow-hidden">
      <div className="h-[140px] bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-2.5 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-4/5 bg-gray-200 rounded" />
        <div className="h-3 w-full bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// ── Category section: title (clickable) + latest 3 posts ────────────────────
function CategorySection({ category, posts, isLoading, onSelect }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <button
          type="button"
          onClick={() => onSelect(category.label)}
          className="group flex items-center gap-3 text-left"
        >
          <div className="w-2 h-6 rounded-sm flex-shrink-0" style={{ background: "#d4af37" }} />
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-[#1a1a2e] leading-tight group-hover:text-[#b8860b] transition-colors">
              {category.name}
            </h2>
            <p className="text-[12px] text-[#9a8c7a]">{category.tag}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect(category.label)}
          className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a8c7a] hover:text-[#b8860b] transition-colors flex-shrink-0"
        >
          See all
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Community() {
  // Overview mode: latest 3 posts per category, keyed by category label
  const [postsByCategory, setPostsByCategory] = useState({});
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [error, setError] = useState(null);

  // Filtered mode: full paginated list for a single category
  const [activeCategory, setActiveCategory] = useState(null); // null = overview
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingFiltered, setIsLoadingFiltered] = useState(false);

  // ── Load the 3-latest-per-category overview ──
  useEffect(() => {
    let cancelled = false;

    async function fetchOverview() {
      setIsLoadingOverview(true);
      setError(null);
      try {
        const results = await Promise.all(
          CATEGORIES.map(cat =>
            fetch(`${API_URL}/blog?page=1&limit=3&category=${encodeURIComponent(cat.label)}`, { credentials: "include" })
              .then(res => (res.ok ? res.json() : { posts: [] }))
              .catch(() => ({ posts: [] }))
          )
        );
        if (cancelled) return;
        const map = {};
        CATEGORIES.forEach((cat, i) => { map[cat.label] = results[i].posts || []; });
        setPostsByCategory(map);
      } catch {
        if (!cancelled) setError("Could not load the community page. Please try again.");
      } finally {
        if (!cancelled) setIsLoadingOverview(false);
      }
    }

    fetchOverview();
    return () => { cancelled = true; };
  }, []);

  // ── Load a full filtered list when a category is selected ──
  useEffect(() => {
    if (!activeCategory) return;

    async function fetchFiltered() {
      setIsLoadingFiltered(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/blog?page=${page}&limit=12&category=${encodeURIComponent(activeCategory)}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setFilteredPosts(data.posts || []);
        setTotalPages(data.totalPages || 1);
      } catch {
        setError("Could not load posts. Please try again.");
      } finally {
        setIsLoadingFiltered(false);
      }
    }

    fetchFiltered();
  }, [activeCategory, page]);

  function selectCategory(label) {
    setActiveCategory(label);
    setPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearCategory() {
    setActiveCategory(null);
    setFilteredPosts([]);
    setPage(1);
  }

  const activeCategoryMeta = useMemo(
    () => CATEGORIES.find(c => c.label === activeCategory),
    [activeCategory]
  );

  return (
    <div className="min-h-screen" style={{ background: "#f5f3ef" }}>
      <AppMetaTags
        title="Community – Inkwell"
        description="Stories from writers, writing tips, finished drafts, opinion pieces, and community news from Quillweave."
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">

        {/* Page title — replaces the old hero masthead */}
        {!activeCategory && (
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1a1a2e] leading-tight mb-1">
              Community
            </h1>
            <p className="text-[14px] text-[#9a8c7a]">
              Stories, craft tips, finished drafts, opinions, and news from the writers here.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">{error}</div>
        )}

        {/* ── Filtered single-category view ───────────────────────────────── */}
        {activeCategory ? (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={clearCategory}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                All categories
              </button>
              <div className="w-px h-4 bg-[#e8e0d0]" />
              <div>
                <h2 className="font-serif text-xl text-[#1a1a2e] leading-tight">{activeCategoryMeta?.name ?? activeCategory}</h2>
              </div>
            </div>

            {isLoadingFiltered ? (
              <div className="bg-white border border-[#e8e0d0] rounded-xl px-4 pt-4 pb-0">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-4 py-4 border-b border-[#e8e0d0] last:border-b-0 animate-pulse">
                    <div className="w-20 h-16 rounded-lg bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 w-16 bg-gray-200 rounded" />
                      <div className="h-4 w-3/4 bg-gray-200 rounded" />
                      <div className="h-3 w-1/2 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-[#e8e0d0]">
                <p className="font-serif text-2xl text-[#1a1a2e] mb-2">No posts yet</p>
                <p className="text-[#9a8c7a] text-sm">Check back soon for new {activeCategoryMeta?.name.toLowerCase() ?? "posts"}.</p>
              </div>
            ) : (
              <div className="bg-white border border-[#e8e0d0] rounded-xl px-4 pt-4 pb-0">
                {filteredPosts.map(post => <PostRow key={post.id} post={post} />)}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-8">
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
          </section>
        ) : (
          /* ── Overview: every category with its latest 3 ──────────────────── */
          <div className="space-y-12">
            {CATEGORIES.map(cat => {
              const posts = postsByCategory[cat.label] || [];
              // Once loading is done, a category with zero posts is hidden
              // entirely rather than rendering an empty-state placeholder.
              if (!isLoadingOverview && posts.length === 0) return null;

              return (
                <CategorySection
                  key={cat.label}
                  category={cat}
                  posts={posts}
                  isLoading={isLoadingOverview}
                  onSelect={selectCategory}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}