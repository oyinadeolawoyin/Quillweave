import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";

// ─── STORY ROW ────────────────────────────────────────────────────────────────

function StoryRow({ story, onApprove, onDelete }) {
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`${API_URL}/discovery/${story.id}/approve`, {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) onApprove(story.id);
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${story.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/discovery/${story.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) onDelete(story.id);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  const date = new Date(story.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-[#e8e0d0] overflow-hidden">
      {/* Main row */}
      <div className="flex items-start gap-4 p-5">
        {/* Cover */}
        <div className="shrink-0 w-[52px] aspect-[2/3] rounded-xl overflow-hidden bg-[#f4f1ec] border border-[#e8e0d0] flex items-center justify-center">
          {story.coverUrl ? (
            <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">📖</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink-gold">{story.genre}</span>
                <span className="text-[10px] text-[#9a8c7a] bg-[#faf7f2] border border-[#e8e0d0] px-2 py-0.5 rounded-full">{story.platform}</span>
              </div>
              <h3 className="font-serif text-ink-primary font-bold text-base leading-tight truncate">{story.title}</h3>
              <p className="text-xs text-[#9a8c7a] mt-0.5">
                by {story.authorName}
                {story.recommendedBy && <span> · Recommended by <strong>{story.recommendedBy}</strong></span>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View on site */}
              <Link
                to={`/discovery/${story.id}`}
                target="_blank"
                className="p-2 text-[#9a8c7a] hover:text-ink-primary transition-colors rounded-lg hover:bg-[#f4f1ec]"
                title="Preview"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
              {/* Expand */}
              <button
                onClick={() => setExpanded((e) => !e)}
                className="p-2 text-[#9a8c7a] hover:text-ink-primary transition-colors rounded-lg hover:bg-[#f4f1ec]"
                title={expanded ? "Collapse" : "Read content"}
              >
                <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {/* Delete */}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 text-[#9a8c7a] hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-[#9a8c7a]">
            <span>Submitted {date}</span>
            <span>by @{story.user?.username ?? "unknown"}</span>
          </div>
        </div>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div className="border-t border-[#f0ebe3] px-5 pb-5 pt-4">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-gold mb-2">Synopsis</p>
            <p className="text-sm text-[#4a4a4a] leading-relaxed">{story.synopsis}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-gold mb-2">First chapter (excerpt)</p>
            <p className="text-sm text-[#4a4a4a] leading-relaxed font-[Georgia,serif] line-clamp-6">
              {story.firstChapter?.slice(0, 600)}{story.firstChapter?.length > 600 ? "…" : ""}
            </p>
          </div>
          {story.platformLink && (
            <div className="mt-3">
              <a
                href={story.platformLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-ink-gold underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                View on {story.platform}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Approve footer */}
      {!story.isApproved && (
        <div className="border-t border-[#f0ebe3] bg-[#faf7f2] px-5 py-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending review
          </span>
          <button
            onClick={handleApprove}
            disabled={approving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {approving ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Approving…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Approve & Publish
              </>
            )}
          </button>
        </div>
      )}

      {story.isApproved && (
        <div className="border-t border-[#f0ebe3] bg-[#f0fdf4] px-5 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-semibold text-emerald-700">Published and live</span>
        </div>
      )}
    </div>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-[#e8e0d0] p-5 animate-pulse flex gap-4">
      <div className="w-[52px] aspect-[2/3] bg-gray-200 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-16 bg-gray-200 rounded-full" />
        <div className="h-5 w-1/2 bg-gray-200 rounded" />
        <div className="h-3 w-1/3 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "pending", label: "Pending", icon: "⏳" },
  { key: "approved", label: "Approved", icon: "✅" },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdminDiscovery() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [stories, setStories] = useState([]);
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchStories();
  }, [tab, page, user]);

  async function fetchStories() {
    setLoading(true);
    try {
      let url;
      if (tab === "pending") {
        url = `${API_URL}/discovery/pending?page=${page}&limit=10`;
      } else {
        url = `${API_URL}/discovery?page=${page}&limit=10`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleApprove(storyId) {
    // Remove from pending list or mark as approved in approved list
    if (tab === "pending") {
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      setTotal((t) => Math.max(0, t - 1));
    } else {
      setStories((prev) => prev.map((s) => s.id === storyId ? { ...s, isApproved: true } : s));
    }
  }

  function handleDelete(storyId) {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
    setTotal((t) => Math.max(0, t - 1));
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-ink-cream flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />

      {/* Hero banner — admin style */}
      <div className="bg-ink-primary relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-ink-gold/10 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 relative">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold mb-3 uppercase tracking-widest border border-amber-400/20">
                Admin Panel
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif text-white leading-tight mb-1">
                Discovery Management
              </h1>
              <p className="text-white/60 text-sm">Review and approve community story submissions.</p>
            </div>
            <Link
              to="/discovery"
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white border border-white/20 rounded-xl transition-colors hover:bg-white/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Discovery
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { label: "Pending approval", value: tab === "pending" ? total : "—", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "Total in view", value: total, color: "text-ink-primary", bg: "bg-white border-[#e8e0d0]" },
            { label: "Current page", value: `${page} / ${totalPages}`, color: "text-[#9a8c7a]", bg: "bg-white border-[#e8e0d0]" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border rounded-2xl p-4 shadow-soft`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-1">{s.label}</p>
              <p className={`text-2xl font-serif font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key
                  ? "bg-ink-primary text-white shadow-soft"
                  : "bg-white border border-[#e8e0d0] text-[#6b5c4a] hover:border-ink-primary hover:text-ink-primary"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Section label */}
        {!loading && stories.length > 0 && (
          <div className="flex items-center gap-4 mb-5">
            <h2 className="text-sm font-bold text-ink-gray uppercase tracking-widest">
              {tab === "pending" ? "Awaiting Approval" : "Published Stories"}
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <RowSkeleton key={i} />)}
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-soft border border-[#e8e0d0]">
            <div className="w-16 h-16 rounded-2xl bg-ink-primary/5 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">{tab === "pending" ? "🎉" : "📖"}</span>
            </div>
            <p className="font-serif text-ink-primary text-lg mb-1">
              {tab === "pending" ? "All caught up!" : "No stories yet"}
            </p>
            <p className="text-sm text-[#9a8c7a]">
              {tab === "pending"
                ? "No stories waiting for review."
                : "Stories will appear here once submitted."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => (
              <StoryRow
                key={story.id}
                story={story}
                onApprove={handleApprove}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-ink-gray hover:border-ink-primary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-soft"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <span className="text-sm text-[#9a8c7a] px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-ink-gray hover:border-ink-primary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-soft"
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