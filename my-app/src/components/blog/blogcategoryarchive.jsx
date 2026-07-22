// src/components/blog/blogCategoryArchive.jsx
//
// "See all" page for a single blog category — e.g. every Writing Tips post,
// paginated, instead of the homepage's capped preview. Add this route
// wherever the other /blog routes are registered:
//
//   <Route path="/blog/category/:category" element={<BlogCategoryArchive />} />
//
// Links to it should URL-encode the category name, e.g.:
//   <Link to={`/blog/category/${encodeURIComponent("Writing Tips")}`}>See all →</Link>

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";

const NAVY = "#1a1a2e";
const GOLD = "#d4af37";
const CREAM = "#f5f3ef";
const BORDER = "#e8e0d0";
const MUTED = "#9a8c7a";
const BODY = "#6b5c4a";

const PAGE_SIZE = 12;

// Matches TAG_LABELS in blog.jsx — kept in sync so badges read the same way
// here as they do on the homepage.
const TAG_LABELS = {
  "Behind the Draft": "Writer's Spotlight",
  "writing-tips": "Writing Tips",
  drafting: "Drafting",
  outlining: "Outlining",
  editing: "Editing",
  brainstorming: "Brainstorming",
  "story-development": "Story Development",
  "successful-stories": "Successful Stories",
  "finished-draft": "Finished Draft",
  "wins-struggles": "Wins & Struggles",
  resources: "Resources",
  announcement: "Announcement",
  event: "Event",
  milestone: "Milestone",
};

function tagLabel(post) {
  if (post?.tag && TAG_LABELS[post.tag]) return TAG_LABELS[post.tag];
  return post?.tag || post?.category || "";
}

function excerpt(html = "", len = 160) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > len ? text.slice(0, len).trim() + "…" : text;
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PostCard({ post }) {
  return (
    <Link to={`/blog/${post.id}`} className="block group">
      <div className="relative rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: "16/10" }}>
        {post.mediaUrl ? (
          <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: `${GOLD}12` }}>
            🖋️
          </div>
        )}
        {tagLabel(post) && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm"
            style={{ background: GOLD, color: NAVY }}
          >
            {tagLabel(post)}
          </span>
        )}
      </div>
      <h3
        className="font-serif text-lg mt-4 leading-snug transition-colors"
        style={{ color: NAVY }}
      >
        {post.title || "Untitled"}
      </h3>
      <p className="text-sm mt-1.5 leading-relaxed" style={{ color: BODY }}>
        {excerpt(post.content)}
      </p>
      <div className="flex items-center gap-2 mt-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
          style={{ background: NAVY }}
        >
          {post.author?.avatar ? (
            <img src={post.author.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            post.author?.username?.charAt(0).toUpperCase() || "?"
          )}
        </div>
        <span className="text-xs" style={{ color: MUTED }}>
          {post.author?.username || "Unknown"} · {formatDate(post.createdAt)}
        </span>
      </div>
    </Link>
  );
}

export default function BlogCategoryArchive() {
  const { category: rawCategory } = useParams();
  const category = decodeURIComponent(rawCategory || "");

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [category]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/blog?category=${encodeURIComponent(category)}&page=${page}&limit=${PAGE_SIZE}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (!cancelled) {
          setPosts(data.posts || []);
          setTotalPages(data.totalPages || 1);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (category) load();
    return () => { cancelled = true; };
  }, [category, page]);

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      <AppMetaTags
        title={`${category} | The Writers' Commons`}
        description={`All ${category} posts from the Writers' Commons.`}
      />

      <header style={{ background: NAVY }} className="text-white border-b" >
        <div className="h-[3px]" style={{ background: GOLD }} />
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-4 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Writer's Commons
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl">{category || "Category"}</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="rounded-lg bg-gray-100" style={{ aspectRatio: "16/10" }} />
                <div className="h-4 bg-gray-100 rounded mt-4 w-3/4" />
                <div className="h-3 bg-gray-100 rounded mt-2 w-full" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm py-16 text-center" style={{ color: MUTED }}>
            No posts in {category} yet.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50 disabled:opacity-40 transition-all"
              style={{ borderColor: BORDER, color: BODY }}
            >
              Previous
            </button>
            <span className="text-sm" style={{ color: MUTED }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50 disabled:opacity-40 transition-all"
              style={{ borderColor: BORDER, color: BODY }}
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}