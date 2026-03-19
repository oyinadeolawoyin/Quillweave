import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";

// ── Form ──────────────────────────────────────────────────────────────────────
function PostForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [link, setLink] = useState(initial?.link || "");
  const [mediaFile, setMediaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initial?.mediaUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  function wrapSelection(before, after) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const newContent = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(newContent);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length + selected.length);
    });
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) { setError("Content is required."); return; }
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      if (title.trim()) formData.append("title", title.trim());
      formData.append("content", content.trim());
      if (link.trim()) formData.append("link", link.trim());
      if (mediaFile) formData.append("media", mediaFile);

      const isEdit = !!initial?.id;
      const url = isEdit ? `${API_URL}/blog/${initial.id}` : `${API_URL}/blog`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        body: formData,
        // no Content-Type header — browser sets multipart boundary automatically
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong."); return; }
      onSave(data.post, isEdit);
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-ink-gray mb-1">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-primary/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-gray mb-1">Content <span className="text-red-500">*</span></label>
        <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-ink-primary/30">
          {/* Formatting toolbar */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); wrapSelection("**", "**"); }}
              title="Bold (select text first)"
              className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold text-ink-gray hover:bg-gray-200 transition-colors"
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); wrapSelection("*", "*"); }}
              title="Italic (select text first)"
              className="w-7 h-7 flex items-center justify-center rounded text-sm italic text-ink-gray hover:bg-gray-200 transition-colors"
            >
              I
            </button>
            <span className="ml-2 text-xs text-gray-400">Select text then click B or I</span>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post…"
            rows={8}
            required
            className="w-full px-4 py-2.5 text-sm focus:outline-none resize-y bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-gray mb-1">External link (optional)</label>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-primary/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-gray mb-1">Image (optional)</label>
        {previewUrl && (
          <div className="mb-2 relative inline-block">
            <img src={previewUrl} alt="Preview" className="h-32 rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => { setMediaFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute top-1 right-1 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow text-gray-500 hover:text-red-500 text-xs"
            >
              ✕
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                     file:text-sm file:font-medium file:bg-ink-primary file:text-white hover:file:opacity-90"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-ink-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60"
        >
          {submitting ? "Saving…" : initial?.id ? "Update Post" : "Publish Post"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-gray-200 text-ink-gray rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Post row ──────────────────────────────────────────────────────────────────
function PostRow({ post, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${post.title || "this post"}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/blog/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) onDelete(post.id);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-xl shadow-soft p-4 flex items-start gap-4">
      {post.mediaUrl && (
        <img
          src={post.mediaUrl}
          alt=""
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {post.title && (
              <h3 className="font-serif text-base text-ink-primary truncate">{post.title}</h3>
            )}
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {post.content.slice(0, 100)}{post.content.length > 100 ? "…" : ""}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
              <span>{date}</span>
              <span>{post._count?.likes ?? 0} likes</span>
              <span>{post._count?.comments ?? 0} comments</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to={`/blog/${post.id}`}
              target="_blank"
              className="p-1.5 text-gray-400 hover:text-ink-primary transition-colors rounded-lg hover:bg-gray-50"
              title="View post"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <button
              onClick={() => onEdit(post)}
              className="p-1.5 text-gray-400 hover:text-ink-primary transition-colors rounded-lg hover:bg-gray-50"
              title="Edit post"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
              title="Delete post"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminBlog() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [view, setView] = useState("list"); // "list" | "create" | "edit"
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchPosts(page);
  }, [page, user]);

  async function fetchPosts(p) {
    setLoadingPosts(true);
    try {
      const res = await fetch(`${API_URL}/blog?page=${p}&limit=10`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPosts(false);
    }
  }

  function handleSave(post, isEdit) {
    if (isEdit) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
    } else {
      setPosts((prev) => [post, ...prev]);
    }
    setView("list");
    setEditingPost(null);
  }

  function handleEdit(post) {
    setEditingPost(post);
    setView("edit");
  }

  function handleDelete(postId) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold mb-2">
              Admin Panel
            </div>
            <h1 className="text-3xl font-serif text-ink-primary">Blog Management</h1>
          </div>
          {view === "list" && (
            <button
              onClick={() => setView("create")}
              className="flex items-center gap-2 px-5 py-2.5 bg-ink-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-soft"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Post
            </button>
          )}
        </div>

        {/* Create / Edit form */}
        {(view === "create" || view === "edit") && (
          <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 mb-8">
            <h2 className="text-xl font-serif text-ink-primary mb-6">
              {view === "edit" ? "Edit Post" : "New Post"}
            </h2>
            <PostForm
              initial={editingPost}
              onSave={handleSave}
              onCancel={() => { setView("list"); setEditingPost(null); }}
            />
          </div>
        )}

        {/* Posts list */}
        {view === "list" && (
          <>
            {loadingPosts ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl">
                <div className="text-4xl mb-3">✍️</div>
                <p className="text-gray-400 text-sm">No posts yet. Create your first post!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-ink-gray hover:bg-white disabled:opacity-40 transition-all"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-ink-gray hover:bg-white disabled:opacity-40 transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
