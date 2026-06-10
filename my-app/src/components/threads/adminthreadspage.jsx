// src/components/admin/adminThreadsPage.jsx
// Admin-only page for managing community threads.
// Route guard: redirects non-admins to "/" immediately.

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "../profile/header";

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

// ─── Thread form (create + edit) ─────────────────────────────────────────────

function ThreadForm({ initial = null, onSave, onCancel }) {
  const [title,     setTitle]     = useState(initial?.title    ?? "");
  const [context,   setContext]   = useState(initial?.context  ?? "");
  const [link,      setLink]      = useState(initial?.link     ?? "");
  const [isPinned,  setIsPinned]  = useState(initial?.isPinned ?? false);
  const [mediaFile, setMediaFile] = useState(null);
  const [preview,   setPreview]   = useState(initial?.mediaUrl ?? null);
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");
  const fileRef = useRef(null);

  const isEdit = !!initial;

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMediaFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!title.trim())   { setErr("Title is required."); return; }
    if (!context.trim()) { setErr("Context is required."); return; }
    setErr("");
    setSaving(true);

    try {
      const body = new FormData();
      body.append("title",    title.trim());
      body.append("context",  context.trim());
      body.append("isPinned", String(isPinned));
      if (link.trim())  body.append("link", link.trim());
      if (mediaFile)    body.append("media", mediaFile);

      const url    = isEdit ? `${API_URL}/threads/${initial.id}` : `${API_URL}/threads`;
      const method = isEdit ? "PUT" : "POST";

      const r = await fetch(url, { method, credentials: "include", body });
      const d = await r.json();
      if (!r.ok) { setErr(d.message ?? "Something went wrong."); return; }
      onSave(d.thread);
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden"
      style={{ boxShadow: "0 4px 24px rgba(26,26,46,0.10)", borderTop: "4px solid #d4af37" }}
    >
      {/* Form header */}
      <div className="px-6 pt-5 pb-4 border-b border-[#f4f1ec] flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-0.5">
            {isEdit ? "Edit thread" : "New thread"}
          </p>
          <h2 className="font-serif text-[#1a1a2e] text-lg font-bold leading-tight">
            {isEdit ? "Update this thread" : "Start a conversation"}
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

        {/* Title */}
        <div>
          <label className="block text-[11px] font-bold text-[#6b5c4a] uppercase tracking-wide mb-1.5">
            Title <span className="text-[#c0392b]">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Introduce yourself"
            className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-[14px] text-[#1a1a2e] placeholder-[#c8b89a] focus:outline-none focus:border-[#d4af37] bg-white transition-colors"
          />
        </div>

        {/* Context */}
        <div>
          <label className="block text-[11px] font-bold text-[#6b5c4a] uppercase tracking-wide mb-1.5">
            Context <span className="text-[#c0392b]">*</span>
          </label>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="What is this thread about? Give members enough to know how to engage…"
            rows={5}
            className="w-full px-4 py-3 border border-[#e8e0d0] rounded-xl text-[14px] text-[#1a1a2e] placeholder-[#c8b89a] focus:outline-none focus:border-[#d4af37] bg-white transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Optional link */}
        <div>
          <label className="block text-[11px] font-bold text-[#6b5c4a] uppercase tracking-wide mb-1.5">
            Link <span className="text-[#9a8c7a] font-normal normal-case tracking-normal">— optional</span>
          </label>
          <input
            type="url"
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://…"
            className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-[13px] text-[#1a1a2e] placeholder-[#c8b89a] focus:outline-none focus:border-[#d4af37] bg-white transition-colors"
          />
        </div>

        {/* Media upload */}
        <div>
          <label className="block text-[11px] font-bold text-[#6b5c4a] uppercase tracking-wide mb-1.5">
            Image <span className="text-[#9a8c7a] font-normal normal-case tracking-normal">— optional</span>
          </label>

          {preview ? (
            <div className="relative rounded-xl overflow-hidden border border-[#e8e0d0]">
              <img src={preview} alt="Preview" className="w-full max-h-48 object-cover" />
              <button
                onClick={() => { setPreview(null); setMediaFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#1a1a2e]/70 text-white flex items-center justify-center hover:bg-[#1a1a2e] transition-colors"
                title="Remove image"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-[#e8e0d0] rounded-xl text-[#9a8c7a] hover:border-[#d4af37] hover:text-[#b8860b] hover:bg-[#fffdf4] transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span className="text-[12px] font-medium">Click to upload an image</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {/* Pin toggle */}
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer ${
            isPinned
              ? "bg-[#fffdf0] border-[#d4af37]"
              : "bg-[#faf7f2] border-[#e8e0d0] hover:border-[#d4af37]/50"
          }`}
          onClick={() => setIsPinned(p => !p)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isPinned ? "bg-[#d4af37]" : "bg-[#e8e0d0]"}`}>
              <svg className={`w-4 h-4 ${isPinned ? "text-[#1a1a2e]" : "text-[#9a8c7a]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#1a1a2e]">Pin this thread</p>
              <p className="text-[11px] text-[#9a8c7a]">Pinned threads always appear at the top of the list</p>
            </div>
          </div>

          {/* Toggle pill */}
          <div
            className={`w-10 h-5.5 rounded-full transition-colors flex-shrink-0 relative ${isPinned ? "bg-[#d4af37]" : "bg-[#e8e0d0]"}`}
            style={{ width: 40, height: 22 }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
              style={{ transform: isPinned ? "translateX(20px)" : "translateX(2px)", margin: "1px 0" }}
            />
          </div>
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
            className="flex-1 py-3 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors disabled:opacity-50"
          >
            {saving ? (isEdit ? "Saving…" : "Publishing…") : (isEdit ? "Save changes" : "Publish thread")}
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

// ─── Thread list row ──────────────────────────────────────────────────────────

function ThreadRow({ thread, onEdit, onDelete, onTogglePin }) {
  const [deleting,  setDeleting]  = useState(false);
  const [pinning,   setPinning]   = useState(false);

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

        {/* Edit */}
        <button
          onClick={() => onEdit(thread)}
          title="Edit thread"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:bg-[#faf7f2] hover:text-[#1a1a2e] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </button>

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
  const [loading,     setLoading]   = useState(true);
  const [showForm,    setShowForm]  = useState(false);
  const [editTarget,  setEditTarget] = useState(null); // thread being edited
  const [toast,       setToast]     = useState(null);  // { message, type }

  // ── Guard — redirect non-admins immediately ──────────────────────────────
  useEffect(() => {
    if (user === null) navigate("/");  // not logged in
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role !== "ADMIN") navigate("/");
  }, [user, navigate]);

  // ── Load threads ──────────────────────────────────────────────────────────
  const loadThreads = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/threads?limit=100`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        // Sort pinned first, then newest
        const sorted = (d.threads ?? []).sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
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

  function handleCreated(thread) {
    setThreads(prev => {
      const updated = [thread, ...prev];
      return updated.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    });
    setShowForm(false);
    showToast("Thread published.");
  }

  function handleUpdated(thread) {
    setThreads(prev =>
      prev.map(t => t.id === thread.id ? thread : t).sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
    );
    setEditTarget(null);
    showToast("Thread updated.");
  }

  function handleDeleted(threadId) {
    setThreads(prev => prev.filter(t => t.id !== threadId));
    showToast("Thread deleted.");
  }

  function handlePinToggled(thread) {
    handleUpdated(thread);
    showToast(thread.isPinned ? "Thread pinned." : "Thread unpinned.");
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
      <Header />

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
                Create and manage community forum threads.
              </p>
            </div>

            <button
              onClick={() => { setShowForm(true); setEditTarget(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              New thread
            </button>
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

        {/* Create / edit form */}
        {(showForm || editTarget) && (
          <ThreadForm
            initial={editTarget}
            onSave={editTarget ? handleUpdated : handleCreated}
            onCancel={() => { setShowForm(false); setEditTarget(null); }}
          />
        )}

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
          {!loading && threads.length === 0 && !showForm && (
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
              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors"
              >
                Create first thread
              </button>
            </div>
          )}

          {/* Thread rows */}
          {!loading && threads.length > 0 && (
            <div className="space-y-3">
              {threads.map(thread => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  onEdit={t => { setEditTarget(t); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
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