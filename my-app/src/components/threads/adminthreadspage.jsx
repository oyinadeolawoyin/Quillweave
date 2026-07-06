// src/components/admin/adminThreadsPage.jsx
// Admin-only page for moderating community threads and managing categories.
// Thread creation/editing now lives on the member-facing /threads/submit and
// /threads/:threadId/edit pages (threadFormPage.jsx) — any member can use those.
// This page keeps: category CRUD, pin/unpin, and delete-any-thread moderation.
// Route guard: redirects non-admins to "/" immediately.

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-xl text-[13px] font-semibold pointer-events-none"
      style={{
        background: type === "success" ? "#1a1a2e" : "#c0392b",
        color: type === "success" ? "#d4af37" : "#fff",
        animation: "toast-in 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {type === "success" ? (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
        </svg>
      )}
      {message}
      <style>{`
        @keyframes toast-in {
          0%   { transform: translateX(-50%) translateY(16px); opacity: 0; }
          100% { transform: translateX(-50%) translateY(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Category form (create + edit) ───────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function CategoryForm({ initial = null, onSave, onCancel }) {
  const [name,        setName]        = useState(initial?.name        ?? "");
  const [slug,        setSlug]        = useState(initial?.slug        ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial); // don't auto-slug when editing
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sortOrder,   setSortOrder]   = useState(initial?.sortOrder   ?? 0);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState("");

  const isEdit = !!initial;

  function handleNameChange(value) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit() {
    if (!name.trim()) { setErr("Name is required."); return; }
    if (!slug.trim()) { setErr("Slug is required."); return; }
    setErr("");
    setSaving(true);

    try {
      const url    = isEdit ? `${API_URL}/threads/categories/${initial.id}` : `${API_URL}/threads/categories`;
      const method = isEdit ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slugify(slug),
          description: description.trim() || null,
          sortOrder: Number(sortOrder) || 0,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.message ?? "Something went wrong."); return; }
      onSave(d.category);
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden"
      style={{ boxShadow: "0 4px 24px rgba(26,26,46,0.10)", borderTop: "4px solid #1a5fb4" }}
    >
      {/* Form header */}
      <div className="px-6 pt-5 pb-4 border-b border-[#f4f1ec] flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#1a5fb4] mb-0.5">
            {isEdit ? "Edit category" : "New category"}
          </p>
          <h2 className="font-serif text-[#1a1a2e] text-lg font-bold leading-tight">
            {isEdit ? "Update this category" : "Create a discussion category"}
          </h2>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors"
            aria-label="Cancel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Name */}
        <div>
          <label className="block text-[11px] font-bold text-[#6b5c4a] uppercase tracking-wide mb-1.5">
            Name <span className="text-[#c0392b]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="e.g. Writing Craft"
            className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-[14px] text-[#1a1a2e] placeholder-[#c8b89a] focus:outline-none focus:border-[#1a5fb4] bg-white transition-colors"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-[11px] font-bold text-[#6b5c4a] uppercase tracking-wide mb-1.5">
            Slug <span className="text-[#c0392b]">*</span>
            <span className="text-[#9a8c7a] font-normal normal-case tracking-normal"> — used in the forum URL</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={e => { setSlugTouched(true); setSlug(e.target.value); }}
            placeholder="writing-craft"
            className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-[14px] text-[#1a1a2e] placeholder-[#c8b89a] focus:outline-none focus:border-[#1a5fb4] bg-white transition-colors font-mono"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-bold text-[#6b5c4a] uppercase tracking-wide mb-1.5">
            Description <span className="text-[#9a8c7a] font-normal normal-case tracking-normal">— optional</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What kind of threads belong here?"
            rows={3}
            className="w-full px-4 py-3 border border-[#e8e0d0] rounded-xl text-[14px] text-[#1a1a2e] placeholder-[#c8b89a] focus:outline-none focus:border-[#1a5fb4] bg-white transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Sort order */}
        <div>
          <label className="block text-[11px] font-bold text-[#6b5c4a] uppercase tracking-wide mb-1.5">
            Sort order <span className="text-[#9a8c7a] font-normal normal-case tracking-normal">— lower shows first</span>
          </label>
          <input
            type="number"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className="w-full sm:w-32 px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-[14px] text-[#1a1a2e] focus:outline-none focus:border-[#1a5fb4] bg-white transition-colors"
          />
        </div>

        {err && (
          <p className="text-[12px] text-[#c0392b] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {err}
          </p>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 bg-[#1a5fb4] text-white text-sm font-bold rounded-xl hover:bg-[#164e94] transition-colors disabled:opacity-50"
          >
            {saving ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create category")}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] text-sm font-semibold rounded-xl hover:bg-[#faf7f2] transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Category list row ────────────────────────────────────────────────────────

function CategoryRow({ category, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(
      `Delete "${category.name}"? Threads in this category will be moved to Uncategorized.`
    )) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API_URL}/threads/categories/${category.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (r.ok) onDelete(category.id);
    } finally { setDeleting(false); }
  }

  return (
    <div
      className="flex items-start gap-4 px-5 py-4 bg-white rounded-xl border border-[#e8e0d0]"
      style={{ boxShadow: "0 1px 4px rgba(26,26,46,0.05)" }}
    >
      <div className="w-9 h-9 rounded-lg bg-[#e8f0fb] text-[#1a5fb4] flex items-center justify-center flex-shrink-0 font-serif font-bold text-[14px] mt-0.5">
        {category.name?.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-serif text-[14px] font-bold text-[#1a1a2e] leading-snug">{category.name}</p>
          <span className="text-[10px] font-mono text-[#9a8c7a] bg-[#f4f1ec] px-1.5 py-0.5 rounded">/{category.slug}</span>
        </div>

        {category.description && (
          <p className="text-[12px] text-[#9a8c7a] line-clamp-1 mb-2">{category.description}</p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] text-[#9a8c7a]">
            {category.totalPosts ?? 0} {category.totalPosts === 1 ? "post" : "posts"}
          </span>
          <span className="text-[11px] text-[#9a8c7a]">
            {category.activePosts ?? 0} active this month
          </span>
          <span className="text-[11px] text-[#c8b89a]">Sort order {category.sortOrder ?? 0}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onEdit(category)}
          title="Edit category"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:bg-[#faf7f2] hover:text-[#1a1a2e] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Delete category"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:bg-red-50 hover:text-[#c0392b] transition-all disabled:opacity-40"
        >
          {deleting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Thread list row ──────────────────────────────────────────────────────────

function ThreadRow({ thread, onDelete, onTogglePin }) {
  const [deleting,  setDeleting]  = useState(false);
  const [pinning,   setPinning]   = useState(false);
  const [deprioritizing, setDeprioritizing] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${thread.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API_URL}/threads/${thread.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (r.ok) onDelete(thread.id);
    } finally { setDeleting(false); }
  }

  async function handleTogglePin() {
    setPinning(true);
    try {
      const body = new FormData();
      body.append("title",    thread.title);
      body.append("context",  thread.context);
      body.append("isPinned", String(!thread.isPinned));
      const r = await fetch(`${API_URL}/threads/${thread.id}`, {
        method: "PUT", credentials: "include", body,
      });
      if (r.ok) {
        const d = await r.json();
        onTogglePin(d.thread);
      }
    } finally { setPinning(false); }
  }

  async function handleToggleDeprioritized() {
    setDeprioritizing(true);
    try {
      const body = new FormData();
      body.append("title",    thread.title);
      body.append("context",  thread.context);
      body.append("isDeprioritized", String(!thread.isDeprioritized));
      const r = await fetch(`${API_URL}/threads/${thread.id}`, {
        method: "PUT", credentials: "include", body,
      });
      if (r.ok) {
        const d = await r.json();
        onTogglePin(d.thread, "deprioritize");
      }
    } finally { setDeprioritizing(false); }
  }

  const commentCount = thread._count?.comments ?? 0;
  const likeCount    = thread._count?.likes    ?? 0;

  return (
    <div
      className={`flex items-start gap-4 px-5 py-4 bg-white rounded-xl border transition-all ${
        thread.isPinned ? "border-[#d4af37]/60 bg-[#fffdf9]" : "border-[#e8e0d0]"
      }`}
      style={{ boxShadow: "0 1px 4px rgba(26,26,46,0.05)" }}
    >
      {/* Pin indicator */}
      <div className="flex-shrink-0 mt-0.5">
        {thread.isPinned ? (
          <div className="w-7 h-7 rounded-full bg-[#d4af37] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[#1a1a2e]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#f4f1ec] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[#c8b89a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-0.5">
          <Link
            to={`/threads/${thread.id}`}
            className="font-serif text-[14px] font-bold text-[#1a1a2e] hover:text-[#b8860b] transition-colors leading-snug"
          >
            {thread.title}
          </Link>
          {thread.isPinned && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{ color: "#b8860b", background: "#fffdf0", borderColor: "#d4af37" }}>
              Pinned
            </span>
          )}
          {thread.isDeprioritized && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{ color: "#6b5c4a", background: "#f4f1ec", borderColor: "#c8b89a" }}>
              Deprioritized
            </span>
          )}
          {thread.category && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f4f1ec] text-[#6b5c4a]">
              {thread.category.name}
            </span>
          )}
        </div>

        <p className="text-[12px] text-[#9a8c7a] line-clamp-1 mb-2">{thread.context}</p>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-[#9a8c7a]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#9a8c7a]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </span>
          <span className="text-[11px] text-[#c8b89a]">Created {timeAgo(thread.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Pin/unpin */}
        <button
          onClick={handleTogglePin}
          disabled={pinning}
          title={thread.isPinned ? "Unpin thread" : "Pin thread"}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:bg-[#faf7f2] hover:text-[#d4af37] transition-all disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill={thread.isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
        </button>

        {/* Deprioritize/restore */}
        <button
          onClick={handleToggleDeprioritized}
          disabled={deprioritizing}
          title={thread.isDeprioritized ? "Restore thread to normal ranking" : "Deprioritize thread"}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:bg-[#faf7f2] hover:text-[#6b5c4a] transition-all disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={thread.isDeprioritized ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}/>
          </svg>
        </button>

        {/* Edit */}
        <Link
          to={`/threads/${thread.id}/edit`}
          title="Edit thread"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:bg-[#faf7f2] hover:text-[#1a1a2e] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </Link>

        {/* View */}
        <Link
          to={`/threads/${thread.id}`}
          title="View thread"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:bg-[#faf7f2] hover:text-[#1a5fb4] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </Link>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Delete thread"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:bg-red-50 hover:text-[#c0392b] transition-all disabled:opacity-40"
        >
          {deleting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

export default function AdminThreadsPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [threads,     setThreads]   = useState([]);
  const [categories,  setCategories] = useState([]);
  const [loading,     setLoading]   = useState(true);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editCatTarget, setEditCatTarget] = useState(null); // category being edited
  const [toast,       setToast]     = useState(null);  // { message, type }

  // ── Guard — redirect non-admins immediately ──────────────────────────────
  useEffect(() => {
    if (user === null) navigate("/");  // not logged in
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role !== "ADMIN") navigate("/");
  }, [user, navigate]);

  // ── Load categories ────────────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/threads/categories`);
      if (r.ok) {
        const d = await r.json();
        setCategories(d.categories ?? []);
      }
    } catch {}
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  // ── Load threads ──────────────────────────────────────────────────────────
  const loadThreads = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/threads?limit=100`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        // Sort pinned first, deprioritized last, then newest within each group
        const sorted = (d.threads ?? []).sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          if (a.isDeprioritized !== b.isDeprioritized) return a.isDeprioritized ? 1 : -1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setThreads(sorted);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadThreads().finally(() => setLoading(false));
  }, [loadThreads]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleUpdated(thread) {
    setThreads(prev =>
      prev.map(t => t.id === thread.id ? thread : t).sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.isDeprioritized !== b.isDeprioritized) return a.isDeprioritized ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
    );
    showToast("Thread updated.");
  }

  function handleDeleted(threadId) {
    setThreads(prev => prev.filter(t => t.id !== threadId));
    showToast("Thread deleted.");
  }

  function handlePinToggled(thread, action = "pin") {
    handleUpdated(thread);
    if (action === "deprioritize") {
      showToast(thread.isDeprioritized ? "Thread deprioritized." : "Thread restored to normal ranking.");
    } else {
      showToast(thread.isPinned ? "Thread pinned." : "Thread unpinned.");
    }
  }

  function handleCategoryCreated(category) {
    setCategories(prev => [...prev, category].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    setShowCatForm(false);
    showToast("Category created.");
  }

  function handleCategoryUpdated(category) {
    setCategories(prev =>
      prev.map(c => c.id === category.id ? { ...c, ...category } : c)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    );
    setEditCatTarget(null);
    showToast("Category updated.");
  }

  function handleCategoryDeleted(categoryId) {
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    // Threads that belonged to this category are now uncategorized — refresh
    // the thread list so the admin table reflects that immediately.
    loadThreads();
    showToast("Category deleted. Threads moved to Uncategorized.");
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  // ── Guard render ──────────────────────────────────────────────────────────
  if (!user || user.role !== "ADMIN") return null;

  const pinnedCount   = threads.filter(t => t.isPinned).length;
  const totalComments = threads.reduce((s, t) => s + (t._count?.comments ?? 0), 0);
  const totalLikes    = threads.reduce((s, t) => s + (t._count?.likes    ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#f5f3ef]">

      {/* ── Page header ── */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #212140 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-10">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-white/30 mb-5">
            <Link to="/" className="hover:text-[#d4af37] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/50">Admin</span>
            <span>/</span>
            <span className="text-[#d4af37]">Threads</span>
          </div>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]/70 mb-1">Admin</p>
              <h1 className="font-serif text-white text-2xl sm:text-3xl font-bold leading-tight">
                Manage Threads
              </h1>
              <p className="text-[13px] text-white/40 mt-1.5">
                Moderate threads and manage discussion categories.
              </p>
            </div>

            <Link
              to="/threads/submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              New thread
            </Link>
          </div>

          {/* Stats row */}
          {!loading && threads.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[
                { label: "Threads",  value: threads.length },
                { label: "Comments", value: totalComments  },
                { label: "Likes",    value: totalLikes     },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                  <div className="font-serif text-2xl font-bold text-[#d4af37] tabular-nums">{s.value}</div>
                  <div className="text-[10px] text-white/35 uppercase tracking-wide mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-6">


        {/* Categories management */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif text-[#1a1a2e] text-base font-bold">
                Discussion Categories {!loading && categories.length > 0 && `(${categories.length})`}
              </h2>
              <p className="text-[12px] text-[#9a8c7a] mt-0.5">
                These power the homepage list and the forum filter.
              </p>
            </div>
            <button
              onClick={() => { setShowCatForm(true); setEditCatTarget(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1a5fb4] text-white text-[12px] font-bold rounded-xl hover:bg-[#164e94] transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              New category
            </button>
          </div>

          {(showCatForm || editCatTarget) && (
            <div className="mb-4">
              <CategoryForm
                initial={editCatTarget}
                onSave={editCatTarget ? handleCategoryUpdated : handleCategoryCreated}
                onCancel={() => { setShowCatForm(false); setEditCatTarget(null); }}
              />
            </div>
          )}

          {categories.length === 0 && !showCatForm ? (
            <div
              className="bg-white rounded-xl border border-[#e8e0d0] py-10 text-center"
              style={{ borderTop: "3px solid #1a5fb4" }}
            >
              <p className="font-serif text-[#1a1a2e] text-base font-bold mb-1">No categories yet</p>
              <p className="text-[12px] text-[#9a8c7a] mb-4">Create one to start organizing threads on the homepage and forum.</p>
              <button
                onClick={() => setShowCatForm(true)}
                className="px-5 py-2.5 bg-[#1a5fb4] text-white text-sm font-bold rounded-xl hover:bg-[#164e94] transition-colors"
              >
                Create first category
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(category => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onEdit={c => { setEditCatTarget(c); setShowCatForm(false); }}
                  onDelete={handleCategoryDeleted}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#e8e0d0]" />

        {/* Thread list */}
        <div>
          {/* List header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-[#1a1a2e] text-base font-bold">
              {loading ? "Loading…" : threads.length === 0 ? "No threads yet" : `All threads (${threads.length})`}
            </h2>
            {pinnedCount > 0 && (
              <span className="text-[11px] text-[#b8860b] font-semibold">
                {pinnedCount} pinned
              </span>
            )}
          </div>

          {/* Skeleton */}
          {loading && (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-24 bg-white rounded-xl border border-[#e8e0d0] animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && threads.length === 0 && (
            <div
              className="bg-white rounded-xl border border-[#e8e0d0] py-12 text-center"
              style={{ borderTop: "3px solid #d4af37" }}
            >
              <div className="w-12 h-12 rounded-full bg-[#faf7f2] flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#c8b89a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <p className="font-serif text-[#1a1a2e] text-base font-bold mb-1">No threads yet</p>
              <p className="text-[12px] text-[#9a8c7a] mb-4">Start with an "Introduce yourself" thread to get the community going.</p>
              <Link
                to="/threads/submit"
                className="inline-block px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors"
              >
                Create first thread
              </Link>
            </div>
          )}

          {/* Thread rows */}
          {!loading && threads.length > 0 && (
            <div className="space-y-3">
              {threads.map(thread => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  onDelete={handleDeleted}
                  onTogglePin={handlePinToggled}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}