// src/components/threads/forumPage.jsx
//
// Forum home — categories ONLY in a 2-column grid.
// Each card shows the category name (links to category page),
// description, and the 3 latest threads inside it.
// No hero. No Latest/Active sections. Lives inside the shared Layout.

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { AppMetaTags } from "../utilis/metatags";

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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ user, size = 30 }) {
  if (!user) return (
    <div
      className="rounded-full bg-[#e8e0d0] flex items-center justify-center flex-shrink-0 text-[#9a8c7a] font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >?</div>
  );
  return user.avatar
    ? <img src={user.avatar} alt={user.username} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
    : (
      <div
        className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, background: "#1a1a2e", fontSize: size * 0.38 }}
      >
        {user.username?.charAt(0).toUpperCase()}
      </div>
    );
}

// ─── Single thread row inside a category card ─────────────────────────────────
// The backend returns latestThreads with author + _count but no nested comments.
// We use thread.createdAt as the "last post" time — good enough for preview rows.

function ThreadRow({ thread }) {
  return (
    <Link
      to={`/threads/${thread.id}`}
      className="flex items-start gap-3 py-3 -mx-5 px-5 hover:bg-[#faf7f2] group transition-colors"
    >
      <Avatar user={thread.author} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1a1a2e] group-hover:text-[#b8860b] transition-colors leading-snug line-clamp-2">
          {thread.title}
        </p>
        <p className="text-[11px] text-[#9a8c7a] mt-0.5">
          <span className="italic text-[#c8b89a]">Last post</span>{" "}
          by{" "}
          <span className="font-semibold text-[#b8860b]">{thread.author?.username ?? "someone"}</span>{" "}
          {timeAgo(thread.createdAt)}
        </p>
      </div>
    </Link>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({ category }) {
  const threads = category.latestThreads ?? [];

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl overflow-hidden">

      {/* Header row */}
      <div className="px-5 pt-4 pb-3 border-b border-[#f0ebe3] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/forum/category/${category.id}`}
            className="font-serif text-[18px] font-bold text-[#1a1a2e] hover:text-[#b8860b] transition-colors leading-tight block"
          >
            {category.name}
          </Link>
          {category.description && (
            <p className="text-[12px] text-[#9a8c7a] mt-0.5 leading-snug">{category.description}</p>
          )}
        </div>
        <Link
          to={`/forum/category/${category.id}`}
          className="flex-shrink-0 text-[12px] font-semibold text-[#b8860b] hover:underline whitespace-nowrap mt-1"
        >
          Read more
        </Link>
      </div>

      {/* Thread list */}
      <div className="px-5 pb-2">
        {threads.length === 0 ? (
          <p className="text-[12px] text-[#c8b89a] py-5 text-center">No threads yet.</p>
        ) : (
          <div className="divide-y divide-[#f4f1ec]">
            {threads.map(t => (
              <ThreadRow key={t.id} thread={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-[#f0ebe3] flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-[#f0ebe3] rounded w-32" />
          <div className="h-3 bg-[#f0ebe3] rounded w-48" />
        </div>
        <div className="h-3 bg-[#f0ebe3] rounded w-16" />
      </div>
      <div className="px-5 py-2 divide-y divide-[#f4f1ec]">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 py-3">
            <div className="w-8 h-8 rounded-full bg-[#f0ebe3] flex-shrink-0" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <div className="h-3 bg-[#f0ebe3] rounded w-3/4" />
              <div className="h-2.5 bg-[#f0ebe3] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ForumPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/threads/categories`)
      .then(r => r.ok ? r.json() : { categories: [] })
      .then(d => setCategories(d.categories ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-[1200px] mx-auto">
      <AppMetaTags
        title="Community Forum"
        description="Talk with other writers on Quillweave, share your work, and keep each other writing."
      />

      {/* Page title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1a1a2e] leading-tight">
            Community Forum
          </h1>
          <p className="text-[13px] text-[#9a8c7a] mt-0.5">
            Talk with other writers, share your work, and keep each other writing.
          </p>
        </div>
        {user && (
          <button
            onClick={() => navigate("/threads/submit")}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-[13px] font-bold rounded-xl hover:bg-[#c9a42d] transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
            </svg>
            New thread
          </button>
        )}
      </div>

      {/* Categories 2-col grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-[#e8e0d0] rounded-xl py-16 text-center">
          <p className="font-serif text-[#1a1a2e] text-lg font-bold mb-1">Nothing here yet</p>
          <p className="text-[13px] text-[#9a8c7a] mb-5">No categories have been set up.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {categories.map(cat => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      )}
    </div>
  );
}