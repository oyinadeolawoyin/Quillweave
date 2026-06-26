// src/components/threads/categoryPage.jsx
//
// Shows all threads for a single category.
// Route: /forum/category/:categoryId
// Lives inside the shared Layout (no header, no hero).

import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";

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

// ─── Thread row ───────────────────────────────────────────────────────────────

function ThreadRow({ thread }) {
  const lastPost = thread.lastComment ?? thread.comments?.[0];
  const lastAuthor = lastPost?.author ?? thread.author;
  const lastAt = lastPost?.createdAt ?? thread.updatedAt ?? thread.createdAt;
  const replyCount = thread._count?.comments ?? 0;

  return (
    <Link
      to={`/threads/${thread.id}`}
      className="flex items-start gap-4 py-4 -mx-4 px-4 hover:bg-[#faf7f2] group transition-colors rounded-lg"
    >
      <Avatar user={thread.author} size={38} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#1a1a2e] group-hover:text-[#b8860b] transition-colors leading-snug line-clamp-2">
          {thread.isPinned && (
            <svg className="w-3.5 h-3.5 inline-block mr-1.5 mb-0.5 text-[#d4af37]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4a1 1 0 00-1-1H9a1 1 0 00-1 1v8l-2 2h12l-2-2z"/>
              <path d="M12 22v-6"/>
            </svg>
          )}
          {thread.title}
        </p>
        <p className="text-[12px] text-[#9a8c7a] mt-1">
          by{" "}
          <span className="font-semibold text-[#6b5c4a]">{thread.author?.username ?? "someone"}</span>
          {" · "}
          {timeAgo(thread.createdAt)}
          {lastPost && (
            <>
              {" · "}
              <span className="italic text-[#c8b89a]">last post</span>{" "}
              by{" "}
              <span className="font-semibold text-[#b8860b]">{lastAuthor?.username}</span>{" "}
              {timeAgo(lastAt)}
            </>
          )}
        </p>
      </div>
      <span className="flex-shrink-0 text-[12px] text-[#9a8c7a] tabular-nums mt-0.5 whitespace-nowrap">
        {replyCount} {replyCount === 1 ? "reply" : "replies"}
      </span>
    </Link>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS = ["latest", "active"];

export default function CategoryPage() {
  const { categoryId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [threads,  setThreads]  = useState([]);
  const [tab,      setTab]      = useState("latest");
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Load category info from the categories list
        const catRes = await fetch(`${API_URL}/threads/categories`);
        if (catRes.ok) {
          const d = await catRes.json();
          const found = (d.categories ?? []).find(c => String(c.id) === String(categoryId));
          if (found) setCategory(found);
          else { setNotFound(true); setLoading(false); return; }
        }

        // Load threads for this category
        const sort = tab === "active" ? "active" : "latest";
        const tRes = await fetch(`${API_URL}/threads?categoryId=${categoryId}&sort=${sort}&limit=50`);
        if (tRes.ok) {
          const d = await tRes.json();
          setThreads(d.threads ?? []);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [categoryId, tab]);

  if (notFound) {
    return (
      <div className="px-4 sm:px-8 py-12 max-w-3xl mx-auto text-center">
        <p className="font-serif text-[#1a1a2e] text-lg font-bold mb-1">Category not found</p>
        <p className="text-[13px] text-[#9a8c7a] mb-4">It may have been removed.</p>
        <Link to="/forum" className="text-[13px] font-semibold text-[#b8860b] hover:underline">Back to forum</Link>
      </div>
    );
  }

  // Pinned threads always float to top
  const sorted = [...threads].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-[900px] mx-auto">

      {/* Breadcrumb */}
      <Link
        to="/forum"
        className="inline-flex items-center gap-1.5 text-[12px] text-[#9a8c7a] hover:text-[#b8860b] transition-colors mb-5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
        </svg>
        All categories
      </Link>

      {/* Category title + new thread */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="font-serif text-2xl sm:text-[28px] font-bold text-[#1a1a2e] leading-tight">
            {loading ? <span className="inline-block h-7 w-40 bg-[#e8e0d0] rounded animate-pulse" /> : category?.name}
          </h1>
          {category?.description && (
            <p className="text-[13px] text-[#9a8c7a] mt-1 leading-snug">{category.description}</p>
          )}
        </div>
        {user && (
          <button
            onClick={() => navigate("/threads/submit")}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-[13px] font-bold rounded-xl hover:bg-[#c9a42d] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
            </svg>
            New thread
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[#e8e0d0] mb-5" />

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors capitalize ${
              tab === t
                ? "bg-[#1a1a2e] text-white"
                : "text-[#6b5c4a] hover:bg-[#f0ebe3]"
            }`}
          >
            {t === "latest" ? "Latest" : "Most active"}
          </button>
        ))}
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="bg-white border border-[#e8e0d0] rounded-xl px-4 py-2 space-y-1 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-4 py-4">
              <div className="w-9 h-9 rounded-full bg-[#f0ebe3] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-[#f0ebe3] rounded w-2/3" />
                <div className="h-2.5 bg-[#f0ebe3] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white border border-[#e8e0d0] rounded-xl py-14 text-center">
          <p className="font-serif text-[#1a1a2e] text-base font-bold mb-1">No threads yet</p>
          <p className="text-[13px] text-[#9a8c7a] mb-4">Be the first to post in this category.</p>
          {user && (
            <button
              onClick={() => navigate("/threads/submit")}
              className="px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-[13px] font-bold rounded-xl hover:bg-[#c9a42d] transition-colors"
            >
              Start a thread
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#e8e0d0] rounded-xl px-4 py-1">
          <div className="divide-y divide-[#f4f1ec]">
            {sorted.map(t => (
              <ThreadRow key={t.id} thread={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}