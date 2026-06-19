// src/components/threads/forumpage.jsx
// Public forum index — browse every thread, filter by discussion category.

import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "../profile/header";

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ user, size = 32 }) {
  if (!user) return (
    <div className="rounded-full bg-[#e8e0d0] flex items-center justify-center flex-shrink-0 text-[#9a8c7a] font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>?</div>
  );
  return user.avatar
    ? <img src={user.avatar} alt={user.username} className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    : (
      <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, background: "#1a1a2e", fontSize: size * 0.38 }}>
        {user.username?.charAt(0).toUpperCase()}
      </div>
    );
}

const CATEGORY_ACCENTS = ["#d4af37", "#b8860b", "#1a5fb4", "#b8622a", "#6b5c4a", "#c0392b"];

// ─── Category filter pills — horizontally scrollable, mobile-friendly ──────────

function CategoryFilter({ categories, selected, onSelect }) {
  const totalThreads = categories.reduce((s, c) => s + (c.totalPosts ?? 0), 0);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap"
      style={{ scrollbarWidth: "none" }}>
      <button
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold border transition-colors whitespace-nowrap ${
          selected === null
            ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
            : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#d4af37]"
        }`}
      >
        All categories
        <span className={`text-[10px] ${selected === null ? "text-white/50" : "text-[#c8b89a]"}`}>{totalThreads}</span>
      </button>

      {categories.map((c, i) => {
        const accent = CATEGORY_ACCENTS[i % CATEGORY_ACCENTS.length];
        const isSelected = selected === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold border transition-colors whitespace-nowrap"
            style={isSelected
              ? { background: accent, color: "#1a1a2e", borderColor: accent }
              : { background: "#fff", color: "#6b5c4a", borderColor: "#e8e0d0" }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isSelected ? "#1a1a2e" : accent }} />
            {c.name}
            <span className={isSelected ? "text-[10px] text-[#1a1a2e]/60" : "text-[10px] text-[#c8b89a]"}>{c.totalPosts}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Thread card ────────────────────────────────────────────────────────────

function ThreadCard({ thread, accentForCategory, user, onDeleted }) {
  const commentCount = thread._count?.comments ?? 0;
  const likeCount    = thread._count?.likes    ?? 0;
  const accent = thread.category ? accentForCategory(thread.category.id) : "#9a8c7a";

  const isOwner = user && (thread.author?.id === user.id || thread.authorId === user.id);
  const isAdmin = user?.role === "ADMIN";
  const canManage = isOwner || isAdmin;

  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${thread.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API_URL}/threads/${thread.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (r.ok) onDeleted?.(thread.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Link
      to={`/threads/${thread.id}`}
      className="block bg-white border border-[#e8e0d0] rounded-xl px-4 sm:px-5 py-4 hover:border-[#d4af37]/60 transition-colors group relative"
      style={{ boxShadow: "0 1px 4px rgba(26,26,46,0.04)" }}
    >
      <div className="flex items-start gap-3">
        <Avatar user={thread.author} size={36} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {thread.isPinned && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                style={{ color: "#b8860b", background: "#fffdf0", borderColor: "#d4af37" }}>
                Pinned
              </span>
            )}
            {thread.category ? (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: `${accent}1a`, color: accent }}>
                {thread.category.name}
              </span>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f4f1ec] text-[#9a8c7a]">
                General
              </span>
            )}
          </div>

          <p className="font-serif text-[15px] font-bold text-[#1a1a2e] leading-snug group-hover:text-[#b8860b] transition-colors">
            {thread.title}
          </p>

          <p className="text-[12px] text-[#9a8c7a] mt-1 line-clamp-2 leading-relaxed">
            {thread.context}
          </p>

          <div className="flex items-center gap-3 mt-2.5 flex-wrap text-[11px] text-[#9a8c7a]">
            <span className="font-medium text-[#6b5c4a]">{thread.author?.username ?? "Member"}</span>
            <span className="text-[#e8e0d0]">·</span>
            <span>{timeAgo(thread.createdAt)}</span>
            <span className="text-[#e8e0d0]">·</span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              {commentCount}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              {likeCount}
            </span>
          </div>
        </div>

        {/* Owner/admin controls */}
        {canManage && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Link
              to={`/threads/${thread.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              title="Edit thread"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8b89a] hover:bg-[#faf7f2] hover:text-[#1a1a2e] transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete thread"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8b89a] hover:bg-red-50 hover:text-[#c0392b] transition-all disabled:opacity-40"
            >
              {deleting ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              )}
            </button>
          </div>
        )}

        <svg className="w-3.5 h-3.5 text-[#c8b89a] group-hover:text-[#d4af37] transition-colors flex-shrink-0 mt-1 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </Link>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

export default function ForumPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories,    setCategories]    = useState([]);
  const [catsLoaded,    setCatsLoaded]    = useState(false);
  const [selectedCatId, setSelectedCatId] = useState(null); // null = all

  const [threads,    setThreads]    = useState([]);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Load categories once, then resolve ?category=slug from the URL ───────
  useEffect(() => {
    fetch(`${API_URL}/threads/categories`)
      .then(r => r.ok ? r.json() : { categories: [] })
      .then(d => {
        const cats = d.categories ?? [];
        setCategories(cats);
        const slug = searchParams.get("category");
        if (slug) {
          const match = cats.find(c => c.slug === slug);
          if (match) setSelectedCatId(match.id);
        }
      })
      .catch(() => {})
      .finally(() => setCatsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load threads whenever the category filter changes ────────────────────
  const loadThreads = useCallback((pageNum, categoryId, append = false) => {
    const setBusy = append ? setLoadingMore : setLoading;
    setBusy(true);
    const qs = new URLSearchParams({ page: String(pageNum), limit: "10" });
    if (categoryId) qs.set("categoryId", String(categoryId));

    fetch(`${API_URL}/threads?${qs.toString()}`)
      .then(r => r.ok ? r.json() : { threads: [], totalPages: 1, total: 0 })
      .then(d => {
        setThreads(prev => append ? [...prev, ...(d.threads ?? [])] : (d.threads ?? []));
        setTotalPages(d.totalPages ?? 1);
        setTotal(d.total ?? 0);
        setPage(pageNum);
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    if (!catsLoaded) return;
    loadThreads(1, selectedCatId, false);
  }, [catsLoaded, selectedCatId, loadThreads]);

  function handleSelectCategory(catId) {
    setSelectedCatId(catId);
    const next = categories.find(c => c.id === catId);
    setSearchParams(next ? { category: next.slug } : {}, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function accentForCategory(catId) {
    const idx = categories.findIndex(c => c.id === catId);
    return CATEGORY_ACCENTS[idx >= 0 ? idx % CATEGORY_ACCENTS.length : 0];
  }

  const selectedCategory = categories.find(c => c.id === selectedCatId) ?? null;

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Header />

      {/* ── Page header ── */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #212140 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-white/30 mb-5">
            <Link to="/" className="hover:text-[#d4af37] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[#d4af37]">Forum</span>
          </div>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]/70 mb-1">Community</p>
              <h1 className="font-serif text-white text-2xl sm:text-3xl font-bold leading-tight">
                Forum
              </h1>
              <p className="text-[13px] text-white/40 mt-1.5 max-w-md">
                Every conversation happening across the community, sorted by category. Jump in — someone's probably already talking about it.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {user?.role === "ADMIN" && (
                <Link
                  to="/admin/threads"
                  className="px-4 py-2 rounded-xl border border-white/15 text-white/60 text-[12px] font-semibold hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  Manage threads
                </Link>
              )}
              {user ? (
                <Link
                  to="/threads/submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d4af37] text-[#1a1a2e] text-[12px] font-bold hover:bg-[#c9a42d] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                  </svg>
                  Start a thread
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#1a1a2e] text-[12px] font-bold hover:bg-[#c9a42d] transition-colors"
                >
                  Sign in to post
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Category filter */}
        <div>
          {!catsLoaded ? (
            <div className="flex gap-2">
              {[1,2,3,4].map(i => <div key={i} className="h-9 w-24 bg-white rounded-full border border-[#e8e0d0] animate-pulse" />)}
            </div>
          ) : (
            <CategoryFilter categories={categories} selected={selectedCatId} onSelect={handleSelectCategory} />
          )}
        </div>

        {/* Section heading */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-serif text-[#1a1a2e] text-base font-bold">
            {selectedCategory ? selectedCategory.name : "All threads"}
            {!loading && <span className="text-[#9a8c7a] font-normal text-[13px]"> · {total}</span>}
          </h2>
        </div>

        {selectedCategory?.description && (
          <p className="text-[12px] text-[#9a8c7a] -mt-3">{selectedCategory.description}</p>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-28 bg-white rounded-xl border border-[#e8e0d0] animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && threads.length === 0 && (
          <div className="bg-white rounded-xl border border-[#e8e0d0] py-12 text-center" style={{ borderTop: "3px solid #d4af37" }}>
            <div className="w-12 h-12 rounded-full bg-[#faf7f2] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#c8b89a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p className="font-serif text-[#1a1a2e] text-base font-bold mb-1">
              {selectedCategory ? `Nothing in ${selectedCategory.name} yet` : "No threads yet"}
            </p>
            <p className="text-[12px] text-[#9a8c7a] mb-4">Be the first to start a conversation here.</p>
            {user ? (
              <Link
                to="/threads/submit"
                className="inline-block px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors"
              >
                Start a thread
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-block px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors"
              >
                Sign in to post
              </Link>
            )}
          </div>
        )}

        {/* Thread list */}
        {!loading && threads.length > 0 && (
          <div className="space-y-3">
            {threads.map(thread => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                accentForCategory={accentForCategory}
                user={user}
                onDeleted={(id) => setThreads(prev => prev.filter(t => t.id !== id))}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && page < totalPages && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => loadThreads(page + 1, selectedCatId, true)}
              disabled={loadingMore}
              className="px-5 py-2.5 border border-[#e8e0d0] text-[#6b5c4a] text-sm font-semibold rounded-xl hover:border-[#d4af37] hover:text-[#b8860b] transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}