import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { WriteEditor } from "../drafts/writeeditorshared";

// ─── Shared color tokens (matches the Accountability page palette) ────────────
const NAVY = "#1a1a2e";
const GOLD = "#d4af37";
const CREAM = "#f5f3ef";
const BORDER = "#e8e0d0";
const MUTED = "#9a8c7a";
const BODY = "#6b5c4a";

// ─── Helpers ────────────────────────────────────────────────────────────────────
function isHtmlContent(content = "") {
  return /<[a-z][\s\S]*>/i.test(content);
}

// Upgrades old plain-text (markdown-ish) post content into HTML so it loads
// nicely into the rich-text editor.
function prepareInitialContent(content = "") {
  if (!content) return "";
  if (isHtmlContent(content)) return content;
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

function slugify(text = "") {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Post form (uses the shared rich-text WriteEditor) ──────────────────────────
function PostForm({ initial, seriesList, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [link, setLink] = useState(initial?.link || "");
  const [mediaFile, setMediaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initial?.mediaUrl || null);
  const [seriesId, setSeriesId] = useState(initial?.seriesId ? String(initial.seriesId) : "");
  const [seriesOrder, setSeriesOrder] = useState(initial?.seriesOrder ?? "");
  const [category, setCategory] = useState(initial?.category || "");
  const [tag, setTag] = useState(initial?.tag || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const contentRef = useRef(null);

  const POST_CATEGORIES = [
    "Stories from Writers",
    "Writing Tips",
    "Finished Drafts",
    "Opinion",
    "Community Update & News",
  ];

  const BLOG_TAGS = [
    { value: "writing-tips",        label: "Writing Tips" },
    { value: "drafting",            label: "Drafting" },
    { value: "outlining",           label: "Outlining" },
    { value: "editing",             label: "Editing" },
    { value: "brainstorming",       label: "Brainstorming" },
    { value: "story-development",   label: "Story Development" },
    { value: "successful-stories",  label: "Successful Stories" },
  ];

  // The WriteEditor auto-saves on an interval — for blog posts there's nothing
  // to persist between saves, so this is a deliberate no-op.
  async function noopAutoSave() {}

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const html = contentRef.current?.innerHTML?.trim() || "";
    const plainText = contentRef.current?.innerText?.trim() || "";
    if (!plainText) { setError("Content is required."); return; }

    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      if (title.trim()) formData.append("title", title.trim());
      formData.append("content", html);
      if (link.trim()) formData.append("link", link.trim());
      if (mediaFile) formData.append("media", mediaFile);
      if (category) formData.append("category", category);
      if (tag) formData.append("tag", tag);

      const isEdit = !!initial?.id;

      // Series assignment
      if (seriesId) {
        formData.append("seriesId", seriesId);
        if (seriesOrder !== "") formData.append("seriesOrder", String(seriesOrder));
      } else if (isEdit && initial?.seriesId) {
        // User cleared the series — explicitly remove this post from it
        formData.append("seriesId", "null");
      }

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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title…"
          className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Section / Category (optional)</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        >
          <option value="">No category — uncategorised</option>
          {POST_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <p className="text-xs mt-1.5" style={{ color: MUTED }}>
          Readers can browse posts by category on the Community page.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Craft Tag (optional)</label>
        <select
          value={tag}
          onChange={e => setTag(e.target.value)}
          className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        >
          <option value="">No tag</option>
          {BLOG_TAGS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <p className="text-xs mt-1.5" style={{ color: MUTED }}>
          Tagged articles surface automatically in Draft Plan and Days Challenge dashboards.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
          Content <span className="text-red-500">*</span>
        </label>
        <div className="border rounded-2xl overflow-hidden focus-within:ring-2 transition-all" style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}>
          <WriteEditor
            initialContent={prepareInitialContent(initial?.content)}
            contentRef={contentRef}
            onAutoSave={noopAutoSave}
            hideTitle
          />
        </div>
        <p className="text-xs mt-1.5" style={{ color: MUTED }}>
          Use the toolbar above to format your post — bold, italics, lists, fonts, colors, and more.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>External link (optional)</label>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…"
          className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Cover image (optional)</label>
        {previewUrl && (
          <div className="mb-3 relative inline-block">
            <img src={previewUrl} alt="Preview" className="h-36 w-auto rounded-xl object-cover border" style={{ borderColor: BORDER }} />
            <button
              type="button"
              onClick={() => { setMediaFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute top-1.5 right-1.5 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow text-gray-500 hover:text-red-500 text-xs font-bold border"
              style={{ borderColor: BORDER }}
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
          className="hidden"
          id="post-cover-upload"
        />
        <label
          htmlFor="post-cover-upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-all select-none"
          style={{ background: NAVY, color: "white" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {previewUrl ? "Change image" : "Upload image"}
        </label>
        {mediaFile && (
          <p className="text-xs mt-2" style={{ color: MUTED }}>{mediaFile.name}</p>
        )}
      </div>

      {/* Series assignment */}
      <div className="rounded-2xl p-4" style={{ background: `${GOLD}0d`, border: `1px solid ${GOLD}40` }}>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Part of a series? (optional)</label>
        <p className="text-xs mb-3" style={{ color: MUTED }}>
          Group this post with related posts (e.g. an event's story submissions) for "next / previous" navigation and a series landing page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
            className="flex-1 border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
          >
            <option value="">No series — standalone post</option>
            {seriesList.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          {seriesId && (
            <input
              type="number"
              min="1"
              value={seriesOrder}
              onChange={(e) => setSeriesOrder(e.target.value)}
              placeholder="Position (auto)"
              className="sm:w-40 border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 transition-all"
              style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
            />
          )}
        </div>
        {seriesList.length === 0 && (
          <p className="text-xs mt-2" style={{ color: MUTED }}>
            No series yet — create one from the "Series" tab first.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 shadow-soft"
          style={{ background: NAVY }}
        >
          {submitting ? "Saving…" : initial?.id ? "Update Post" : "Publish Post"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border rounded-xl text-sm font-medium hover:bg-white transition-all"
          style={{ borderColor: BORDER, color: BODY }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Post row ──────────────────────────────────────────────────────────────────
function PostRow({ post, onEdit, onDelete, onTogglePin }) {
  const [deleting, setDeleting] = useState(false);
  const [pinning, setPinning] = useState(false);

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

  async function handleTogglePin() {
    setPinning(true);
    try {
      const res = await fetch(`${API_URL}/blog/${post.id}/pin`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        onTogglePin(post.id, data.isPinned);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPinning(false);
    }
  }

  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-xl border p-4 flex items-start gap-4" style={{ borderColor: BORDER }}>
      {post.mediaUrl ? (
        <img
          src={post.mediaUrl}
          alt=""
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl"
             style={{ background: `${GOLD}15` }}>
          🖋️
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {post.isPinned && (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm text-white flex-shrink-0" style={{ background: GOLD }}>
                  Pinned
                </span>
              )}
              {post.title && (
                <h3 className="font-serif text-base truncate" style={{ color: NAVY }}>{post.title}</h3>
              )}
              {post.series && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full text-white flex-shrink-0" style={{ background: NAVY }}>
                  {post.series.title}{post.seriesOrder ? ` · #${post.seriesOrder}` : ""}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>
              {post.content.replace(/<[^>]*>/g, " ").slice(0, 100)}{post.content.length > 100 ? "…" : ""}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: MUTED }}>
              <span>{date}</span>
              <span>{post._count?.likes ?? 0} likes</span>
              <span>{post._count?.comments ?? 0} comments</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to={`/blog/${post.id}`}
              target="_blank"
              className="p-1.5 hover:bg-gray-50 transition-colors rounded-lg"
              style={{ color: MUTED }}
              title="View post"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <button
              onClick={handleTogglePin}
              disabled={pinning}
              className="p-1.5 hover:bg-gray-50 transition-colors rounded-lg disabled:opacity-50"
              style={{ color: post.isPinned ? GOLD : MUTED }}
              title={post.isPinned ? "Unpin post" : "Pin as Top Story"}
            >
              <svg className="w-4 h-4" fill={post.isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <button
              onClick={() => onEdit(post)}
              className="p-1.5 hover:bg-gray-50 transition-colors rounded-lg"
              style={{ color: MUTED }}
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

// ═══════════════════════════════════════════════════════════════════════════════
// SERIES
// ═══════════════════════════════════════════════════════════════════════════════

function SeriesForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [coverFile, setCoverFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initial?.coverUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const coverInputRef = useRef(null);

  function handleTitleChange(e) {
    const value = e.target.value;
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleCoverChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) { setError("Title and slug are required."); return; }
    setError(null);
    setSubmitting(true);

    try {
      const isEdit = !!initial?.id;
      const url = isEdit ? `${API_URL}/blog/series/${initial.id}` : `${API_URL}/blog/series`;
      const method = isEdit ? "PUT" : "POST";

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("slug", slug.trim());
      if (description.trim()) formData.append("description", description.trim());
      if (category) formData.append("category", category);
      if (coverFile) {
        formData.append("cover", coverFile);
      } else if (initial?.coverUrl && previewUrl) {
        // keep existing URL if no new file was chosen
        formData.append("coverUrl", initial.coverUrl);
      }

      const res = await fetch(url, {
        method,
        credentials: "include",
        body: formData,
        // no Content-Type — let browser set multipart boundary
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong."); return; }
      onSave(data.series, isEdit);
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
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
          Series title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="e.g. Summer Writing Jam 2026"
          required
          className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
          placeholder="summer-writing-jam-2026"
          required
          className="w-full border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        />
        <p className="text-xs mt-1.5" style={{ color: MUTED }}>
          Used in the URL: /blog/series/{slug || "your-slug"}
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short blurb shown on the series landing page…"
          rows={3}
          className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-y transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Cover image (optional)</label>
        {previewUrl && (
          <div className="mb-3 relative inline-block">
            <img src={previewUrl} alt="Cover preview" className="h-36 w-auto rounded-xl object-cover border" style={{ borderColor: BORDER }} />
            <button
              type="button"
              onClick={() => { setCoverFile(null); setPreviewUrl(null); if (coverInputRef.current) coverInputRef.current.value = ""; }}
              className="absolute top-1.5 right-1.5 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow text-gray-500 hover:text-red-500 text-xs font-bold border"
              style={{ borderColor: BORDER }}
            >
              ✕
            </button>
          </div>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverChange}
          className="hidden"
          id="series-cover-upload"
        />
        <label
          htmlFor="series-cover-upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-all select-none"
          style={{ background: NAVY, color: "white" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {previewUrl ? "Change cover" : "Upload cover"}
        </label>
        {coverFile && (
          <p className="text-xs mt-2" style={{ color: MUTED }}>{coverFile.name}</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 shadow-soft"
          style={{ background: NAVY }}
        >
          {submitting ? "Saving…" : initial?.id ? "Update Series" : "Create Series"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border rounded-xl text-sm font-medium hover:bg-white transition-all"
          style={{ borderColor: BORDER, color: BODY }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SeriesRow({ series, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete the series "${series.title}"? Its posts will remain published as standalone posts.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/blog/series/${series.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) onDelete(series.id);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-4 flex items-start gap-4" style={{ borderColor: BORDER }}>
      {series.coverUrl ? (
        <img src={series.coverUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: NAVY }}>
          📚
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-serif text-base truncate" style={{ color: NAVY }}>{series.title}</h3>
            <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>/blog/series/{series.slug}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: MUTED }}>
              <span>{series._count?.posts ?? 0} {series._count?.posts === 1 ? "post" : "posts"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to={`/blog/series/${series.slug}`}
              target="_blank"
              className="p-1.5 hover:bg-gray-50 transition-colors rounded-lg"
              style={{ color: MUTED }}
              title="View series"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <button
              onClick={() => onEdit(series)}
              className="p-1.5 hover:bg-gray-50 transition-colors rounded-lg"
              style={{ color: MUTED }}
              title="Edit series"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
              title="Delete series"
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

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminBlog() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("posts"); // "posts" | "series"

  // Posts
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postView, setPostView] = useState("list"); // "list" | "create" | "edit"
  const [editingPost, setEditingPost] = useState(null);

  // Series
  const [seriesList, setSeriesList] = useState([]);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [seriesView, setSeriesView] = useState("list"); // "list" | "create" | "edit"
  const [editingSeries, setEditingSeries] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchPosts(page);
  }, [page, user]);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchSeries();
  }, [user]);

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

  async function fetchSeries() {
    setLoadingSeries(true);
    try {
      const res = await fetch(`${API_URL}/blog/series`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSeriesList(data.series || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSeries(false);
    }
  }

  // ── Post handlers ─────────────────────────────────────────────────────────
  function handleSavePost(post, isEdit) {
    if (isEdit) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
    } else {
      setPosts((prev) => [post, ...prev]);
    }
    setPostView("list");
    setEditingPost(null);
    fetchSeries(); // post counts may have changed
  }

  function handleEditPost(post) {
    setEditingPost(post);
    setPostView("edit");
  }

  function handleDeletePost(postId) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    fetchSeries();
  }

  function handleTogglePin(postId, isPinned) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isPinned } : p));
  }

  // ── Series handlers ───────────────────────────────────────────────────────
  function handleSaveSeries(series, isEdit) {
    if (isEdit) {
      setSeriesList((prev) => prev.map((s) => (s.id === series.id ? { ...s, ...series } : s)));
    } else {
      setSeriesList((prev) => [{ ...series, _count: { posts: 0 } }, ...prev]);
    }
    setSeriesView("list");
    setEditingSeries(null);
  }

  function handleEditSeries(series) {
    setEditingSeries(series);
    setSeriesView("edit");
  }

  function handleDeleteSeries(seriesId) {
    setSeriesList((prev) => prev.filter((s) => s.id !== seriesId));
    fetchPosts(page);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <div className="text-sm" style={{ color: MUTED }}>Loading…</div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* ── Page title ───────────────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: GOLD }}>Admin Panel</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight mb-1" style={{ color: NAVY }}>Community</h1>
          <p className="text-sm" style={{ color: MUTED }}>
            Publish posts, pin a Top Story, organize series for ongoing stories and community events.
          </p>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-8 bg-white rounded-xl p-1.5 border w-fit" style={{ borderColor: BORDER }}>
          <button
            onClick={() => setTab("posts")}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === "posts" ? { background: NAVY, color: "white" } : { color: BODY }}
          >
            Posts
          </button>
          <button
            onClick={() => setTab("series")}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === "series" ? { background: NAVY, color: "white" } : { color: BODY }}
          >
            Series
          </button>
        </div>

        {/* ═══ POSTS TAB ═══════════════════════════════════════════════════ */}
        {tab === "posts" && (
          <>
            {postView === "list" && (
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif" style={{ color: NAVY }}>All Posts</h2>
                <button
                  onClick={() => setPostView("create")}
                  className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-soft"
                  style={{ background: NAVY }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Post
                </button>
              </div>
            )}

            {/* Create / Edit form */}
            {(postView === "create" || postView === "edit") && (
              <div className="bg-white rounded-2xl shadow-soft border p-6 sm:p-8 mb-8" style={{ borderColor: BORDER }}>
                <h2 className="text-xl font-serif mb-6" style={{ color: NAVY }}>
                  {postView === "edit" ? "Edit Post" : "New Post"}
                </h2>
                <PostForm
                  initial={editingPost}
                  seriesList={seriesList}
                  onSave={handleSavePost}
                  onCancel={() => { setPostView("list"); setEditingPost(null); }}
                />
              </div>
            )}

            {/* Posts list */}
            {postView === "list" && (
              <>
                {loadingPosts ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-white rounded-xl animate-pulse border" style={{ borderColor: BORDER }} />
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: BORDER }}>
                    <div className="text-4xl mb-3">✍️</div>
                    <p className="text-sm" style={{ color: MUTED }}>No posts yet. Create your first post!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <PostRow
                        key={post.id}
                        post={post}
                        onEdit={handleEditPost}
                        onDelete={handleDeletePost}
                        onTogglePin={handleTogglePin}
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
                      className="px-4 py-2 rounded-lg text-sm border hover:bg-white disabled:opacity-40 transition-all"
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
                      className="px-4 py-2 rounded-lg text-sm border hover:bg-white disabled:opacity-40 transition-all"
                      style={{ borderColor: BORDER, color: BODY }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ═══ SERIES TAB ══════════════════════════════════════════════════ */}
        {tab === "series" && (
          <>
            {seriesView === "list" && (
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-serif" style={{ color: NAVY }}>Series</h2>
                  <p className="text-sm mt-1" style={{ color: MUTED }}>
                    Group ongoing stories or community event submissions together.
                  </p>
                </div>
                <button
                  onClick={() => setSeriesView("create")}
                  className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-soft flex-shrink-0"
                  style={{ background: NAVY }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Series
                </button>
              </div>
            )}

            {(seriesView === "create" || seriesView === "edit") && (
              <div className="bg-white rounded-2xl shadow-soft border p-6 sm:p-8 mb-8" style={{ borderColor: BORDER }}>
                <h2 className="text-xl font-serif mb-6" style={{ color: NAVY }}>
                  {seriesView === "edit" ? "Edit Series" : "New Series"}
                </h2>
                <SeriesForm
                  initial={editingSeries}
                  onSave={handleSaveSeries}
                  onCancel={() => { setSeriesView("list"); setEditingSeries(null); }}
                />
              </div>
            )}

            {seriesView === "list" && (
              <>
                {loadingSeries ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-white rounded-xl animate-pulse border" style={{ borderColor: BORDER }} />
                    ))}
                  </div>
                ) : seriesList.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: BORDER }}>
                    <div className="text-4xl mb-3">📚</div>
                    <p className="text-sm" style={{ color: MUTED }}>No series yet. Create one to group related posts together.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {seriesList.map((s) => (
                      <SeriesRow
                        key={s.id}
                        series={s}
                        onEdit={handleEditSeries}
                        onDelete={handleDeleteSeries}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}