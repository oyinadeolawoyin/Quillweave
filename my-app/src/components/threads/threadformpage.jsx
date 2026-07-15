// src/components/threads/threadFormPage.jsx
// Member-facing thread create/edit page.
// Route: /threads/submit (create), /threads/:threadId/edit (edit existing).
//
// Any authenticated member can create a thread and edit/delete their own.
// Admins can additionally edit/delete any thread and pin threads.

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
// ─── Thread form (create + edit) ──────────────────────────────────────────────

function ThreadForm({ initial, tags, isAdmin, onSave, onDelete }) {
  const [title,      setTitle]      = useState(initial?.title      ?? "");
  const [context,    setContext]    = useState(initial?.context    ?? "");
  const [link,       setLink]       = useState(initial?.link       ?? "");
  const [isPinned,   setIsPinned]   = useState(initial?.isPinned   ?? false);
  const [isDeprioritized, setIsDeprioritized] = useState(initial?.isDeprioritized ?? false);
  const [tag,        setTag]        = useState(initial?.tag ?? "");
  // Multi-image support, same MAX_IMAGES=5 pattern comments/replies already use.
  // existingUrls = images already saved on the thread (edit mode) that the
  // writer hasn't removed yet. newFiles = freshly picked File objects to upload.
  const [existingUrls, setExistingUrls] = useState(() => {
    if (!initial) return [];
    if (Array.isArray(initial.mediaUrls) && initial.mediaUrls.length > 0) return initial.mediaUrls;
    return initial.mediaUrl ? [initial.mediaUrl] : [];
  });
  const [newFiles,    setNewFiles]    = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [err,        setErr]        = useState("");
  const fileRef = useRef(null);

  const isEdit = !!initial;
  const MAX_IMAGES = 5;
  const totalImages = existingUrls.length + newFiles.length;

  function handleFiles(e) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;
    setNewFiles(prev => [...prev, ...picked].slice(0, MAX_IMAGES - existingUrls.length));
  }

  function removeExisting(url) {
    setExistingUrls(prev => prev.filter(u => u !== url));
  }

  function removeNewFile(i) {
    setNewFiles(prev => prev.filter((_, idx) => idx !== i));
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
      if (isAdmin) {
        body.append("isPinned", String(isPinned));
        body.append("isDeprioritized", String(isDeprioritized));
      }
      body.append("tag", tag === "" ? "" : tag);
      if (link.trim())  body.append("link", link.trim());
      newFiles.forEach((f, i) => body.append(`media_${i}`, f));
      if (isEdit) body.append("existingMediaUrls", JSON.stringify(existingUrls));

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

  async function handleDelete() {
    if (!window.confirm(`Delete "${initial.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API_URL}/threads/${initial.id}`, {
        method: "DELETE", credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.message ?? "Could not delete this thread."); return; }
      onDelete();
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setDeleting(false);
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
        <Link
          to={isEdit ? `/threads/${initial.id}` : "/forum"}
          className="text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors"
          aria-label="Cancel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </Link>
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

        {/* Tag */}
        <div>
          <label className="block text-[11px] font-bold text-[#6b5c4a] uppercase tracking-wide mb-1.5">
            Tag <span className="text-[#9a8c7a] font-normal normal-case tracking-normal">— optional</span>
          </label>
          <select
            value={tag}
            onChange={e => setTag(e.target.value)}
            className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-[14px] text-[#1a1a2e] focus:outline-none focus:border-[#d4af37] bg-white transition-colors"
          >
            <option value="">Untagged</option>
            {tags.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="text-[11px] text-[#9a8c7a] mt-1.5">
            Pick the tag that best fits — it helps other members find your thread.
          </p>
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
            Images <span className="text-[#9a8c7a] font-normal normal-case tracking-normal">— optional, up to {MAX_IMAGES}</span>
          </label>

          {totalImages > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
              {existingUrls.map(url => (
                <div key={url} className="relative rounded-lg overflow-hidden border border-[#e8e0d0] aspect-square group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExisting(url)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#1a1a2e]/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden border border-[#e8e0d0] aspect-square group">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#1a1a2e]/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalImages < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-[#e8e0d0] rounded-xl text-[#9a8c7a] hover:border-[#d4af37] hover:text-[#b8860b] hover:bg-[#fffdf4] transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span className="text-[12px] font-medium">
                {totalImages > 0 ? `Add another image (${totalImages}/${MAX_IMAGES})` : "Click to upload images"}
              </span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        </div>

        {/* Pin toggle — admin only */}
        {isAdmin && (
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

            <div
              className="rounded-full transition-colors flex-shrink-0 relative"
              style={{ width: 40, height: 22, background: isPinned ? "#d4af37" : "#e8e0d0" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: isPinned ? "translateX(20px)" : "translateX(2px)", margin: "1px 0" }}
              />
            </div>
          </div>
        )}

        {/* Deprioritize toggle — admin only */}
        {isAdmin && (
          <div
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer ${
              isDeprioritized
                ? "bg-[#faf7f2] border-[#9a8c7a]"
                : "bg-[#faf7f2] border-[#e8e0d0] hover:border-[#9a8c7a]/50"
            }`}
            onClick={() => setIsDeprioritized(p => !p)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDeprioritized ? "bg-[#9a8c7a]" : "bg-[#e8e0d0]"}`}>
                <svg className={`w-4 h-4 ${isDeprioritized ? "text-white" : "text-[#9a8c7a]"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#1a1a2e]">Deprioritize this thread</p>
                <p className="text-[11px] text-[#9a8c7a]">Hidden from Active, Latest, and Pinned &amp; Today — still shows at the bottom of the full thread list</p>
              </div>
            </div>

            <div
              className="rounded-full transition-colors flex-shrink-0 relative"
              style={{ width: 40, height: 22, background: isDeprioritized ? "#9a8c7a" : "#e8e0d0" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: isDeprioritized ? "translateX(20px)" : "translateX(2px)", margin: "1px 0" }}
              />
            </div>
          </div>
        )}

        {err && (
          <p className="text-[12px] text-[#c0392b] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {err}
          </p>
        )}

        {/* Submit row */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSubmit}
            disabled={saving || deleting}
            className="flex-1 py-3 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors disabled:opacity-50"
          >
            {saving ? (isEdit ? "Saving…" : "Publishing…") : (isEdit ? "Save changes" : "Publish thread")}
          </button>
          <Link
            to={isEdit ? `/threads/${initial.id}` : "/forum"}
            className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] text-sm font-semibold rounded-xl hover:bg-[#faf7f2] transition-colors flex items-center"
          >
            Cancel
          </Link>
        </div>

        {/* Delete — edit mode only, own thread or admin */}
        {isEdit && (
          <div className="pt-3 border-t border-[#f4f1ec]">
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              className="w-full py-2.5 text-[#c0392b] text-[13px] font-semibold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
              {deleting ? "Deleting…" : "Delete thread"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN — guards, data loading, routing back out
// ═════════════════════════════════════════════════════════════════════════════

export default function ThreadFormPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { threadId } = useParams();

  const isEdit = !!threadId;

  const [tags,       setTags]      = useState([]);
  const [thread,      setThread]    = useState(null);
  const [loading,     setLoading]   = useState(isEdit);
  const [notFound,    setNotFound]  = useState(false);
  const [forbidden,   setForbidden] = useState(false);

  // ── Guard — must be signed in to create or edit ───────────────────────────
  useEffect(() => {
    if (user === null) navigate("/login");
  }, [user, navigate]);

  // ── Load the fixed tag list ────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/threads/tags`)
      .then(r => r.ok ? r.json() : { tags: [] })
      .then(d => setTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  // ── If editing, load the thread and verify ownership ──────────────────────
  useEffect(() => {
    if (!isEdit || !user) return;
    setLoading(true);
    fetch(`${API_URL}/threads/${threadId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const t = d.thread;
        if (!t) { setNotFound(true); return; }
        const isOwner = t.author?.id === user.id || t.authorId === user.id;
        const isAdmin = user.role === "ADMIN";
        if (!isOwner && !isAdmin) { setForbidden(true); return; }
        setThread(t);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [isEdit, threadId, user]);

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";

  function handleSaved(savedThread) {
    navigate(`/threads/${savedThread.id}`);
  }

  function handleDeleted() {
    navigate("/forum");
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-2xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[#9a8c7a] mb-5">
        <Link to="/forum" className="hover:text-[#b8860b] transition-colors">Forum</Link>
        <span>/</span>
        <span className="text-[#1a1a2e] font-semibold">{isEdit ? "Edit thread" : "New thread"}</span>
      </div>

      <h1 className="font-serif text-2xl font-bold text-[#1a1a2e] mb-1">
        {isEdit ? "Edit your thread" : "Start a thread"}
      </h1>
      <p className="text-[13px] text-[#9a8c7a] mb-6">
        {isEdit
          ? "Update the details below — changes are visible to everyone immediately."
          : "Ask a question, share something you're working on, or kick off a conversation."}
      </p>

      {/* ── Main content ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] p-10 text-center">
            <svg className="w-6 h-6 text-[#d4af37] animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : notFound ? (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] p-10 text-center" style={{ borderTop: "3px solid #c0392b" }}>
            <p className="font-serif text-[#1a1a2e] text-base font-bold mb-1">Thread not found</p>
            <p className="text-[12px] text-[#9a8c7a] mb-4">It may have been deleted.</p>
            <Link to="/forum" className="text-[13px] font-semibold text-[#1a1a2e] hover:text-[#b8860b]">
              Back to forum
            </Link>
          </div>
        ) : forbidden ? (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] p-10 text-center" style={{ borderTop: "3px solid #c0392b" }}>
            <p className="font-serif text-[#1a1a2e] text-base font-bold mb-1">You can't edit this thread</p>
            <p className="text-[12px] text-[#9a8c7a] mb-4">Only the original author or an admin can make changes.</p>
            <Link to="/forum" className="text-[13px] font-semibold text-[#1a1a2e] hover:text-[#b8860b]">
              Back to forum
            </Link>
          </div>
        ) : (
          <ThreadForm
            initial={isEdit ? thread : null}
            tags={tags}
            isAdmin={isAdmin}
            onSave={handleSaved}
            onDelete={handleDeleted}
          />
        )}
    </div>
  );
}