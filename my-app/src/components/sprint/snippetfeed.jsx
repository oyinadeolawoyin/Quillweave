import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const sourceTypeConfig = {
  POST_SPRINT: {
    label: "Sprint",
    className: "bg-ink-primary/10 text-ink-primary",
  },
  STANDALONE: {
    label: "Solo",
    className: "bg-ink-gold/10 text-[#b8962e]",
  },
  DAYS_CHALLENGE: {
    label: "Day Challenge",
    className: "bg-pink-100 text-pink-600",
  },
};


function Avatar({ username, avatar, size = "md" }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
  if (avatar) return <img src={avatar} alt={username} className={`${sizes[size]} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sizes[size]} rounded-full bg-ink-primary flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {username?.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

// Image Lightbox
function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" aria-label="Close">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img src={src} alt={alt} className="max-w-full max-h-[90vh] w-auto h-auto rounded-2xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
    </div>
  );
}

// Three-dot menu
function ThreeDotMenu({ onDelete, deleting }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all" aria-label="More options">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-30 overflow-hidden">
          <button onClick={() => { setOpen(false); onDelete(); }} disabled={deleting} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

function MentionText({ content }) {
  const parts = content.split(/(@\w+)/g);
  return <>{parts.map((part, i) => /^@\w+$/.test(part) ? <span key={i} className="text-blue-500 font-semibold">{part}</span> : part)}</>;
}

// ─── Reusable like button for comments and replies ────────────
function LikeButton({ count = 0, liked = false, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${liked ? "text-red-500" : "text-gray-400 hover:text-red-400"}`}
    >
      <svg className="w-3.5 h-3.5" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

function CardSkeleton() {
  return (
    <div className="px-5 sm:px-7 py-6 flex gap-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 w-28 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-4/5 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// Threads-style compose bar
function ComposeBar({ user, onOpenCreate }) {
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100 cursor-text hover:bg-gray-50/50 transition-colors" onClick={onOpenCreate}>
      <Avatar username={user?.username} avatar={user?.avatar} size="sm" />
      <span className="flex-1 text-sm text-gray-400 select-none">How is your writing today?</span>
      <button onClick={e => { e.stopPropagation(); onOpenCreate(); }} className="px-4 py-1.5 text-xs font-semibold text-white bg-ink-primary rounded-xl hover:opacity-90 transition-all flex-shrink-0">Share</button>
    </div>
  );
}

// Create modal
function CreateSnippetModal({ onClose, onCreated, defaultSourceType = "STANDALONE" }) {
  const { user } = useAuth();
  const [context, setContext] = useState("");
  const [tags, setTags] = useState("");
  const [sourceType, setSourceType] = useState(defaultSourceType);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  function handleMediaChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/"), isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { setError("Only images and videos are supported."); return; }
    setMediaFile(file); setMediaType(isImage ? "image" : "video");
    setMediaPreview(URL.createObjectURL(file)); setError("");
  }

  function removeMedia() {
    setMediaFile(null); setMediaPreview(null); setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true); setError("");
    try {
      const formData = new FormData();
      if (context.trim()) formData.append("context", context.trim());
      if (tags.trim()) formData.append("tags", tags.trim());
      formData.append("sourceType", sourceType);
      if (mediaFile) formData.append("media", mediaFile);
      const res = await fetch(`${API_URL}/snippets`, { method: "POST", credentials: "include", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong.");
      onCreated(data.snippet);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <Avatar username={user?.username} avatar={user?.avatar} />
            <div>
              <p className="text-sm font-semibold text-ink-primary">{user?.username}</p>
              <p className="text-xs text-gray-400">Sharing a snippet</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-5 space-y-5">
          <textarea value={context} onChange={e => setContext(e.target.value)}
            placeholder="How is your writing today? Any wins or struggles worth sharing with the community?"
            rows={6} autoFocus
            className="w-full text-ink-primary text-sm leading-relaxed placeholder-gray-300 resize-none border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-ink-gold/30 focus:border-ink-gold transition-all bg-ink-cream" />
          <div className="flex gap-3">
            {[{ value: "STANDALONE", label: "Standalone" }, { value: "POST_SPRINT", label: "Post-Sprint" }].map(opt => (
              <button key={opt.value} type="button" onClick={() => setSourceType(opt.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${sourceType === opt.value ? "bg-ink-primary text-white border-ink-primary" : "bg-white text-ink-gray border-gray-200 hover:border-ink-primary"}`}>
                {opt.label}
              </button>
            ))}
          </div>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)}
            placeholder="Tags: pacing, dialogue, worldbuilding (optional)"
            className="w-full text-sm text-ink-primary placeholder-gray-300 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ink-gold/30 focus:border-ink-gold transition-all bg-white" />
          <div>
            {mediaPreview ? (
              <div className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                {mediaType === "image" ? <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-cover" /> : <video src={mediaPreview} controls className="w-full max-h-64 rounded-xl" />}
                <button type="button" onClick={removeMedia} className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-5 flex items-center justify-center gap-3 text-gray-400 hover:border-ink-gold hover:text-ink-gold transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-sm">Attach an image or video (optional)</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleMediaChange} className="hidden" />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 pb-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-200 text-ink-gray text-sm font-medium rounded-xl hover:border-ink-primary transition-all">
              {defaultSourceType === "POST_SPRINT" ? "Skip for now" : "Cancel"}
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-3 bg-ink-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReplyItem({ reply, snippetId, commentId, currentUser, onDeleted, onReplyTo }) {
  const canDelete = currentUser && (currentUser.id === reply.user?.id || currentUser.role === "ADMIN");
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reply._count?.likes ?? 0);
  const [liking, setLiking] = useState(false);

  async function toggleLike() {
    if (!currentUser || liking) return;
    setLiking(true);
    try {
      const res = await fetch(`${API_URL}/snippets/${snippetId}/comments/${commentId}/replies/${reply.id}/like`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) { setLiked(data.liked); setLikesCount(data.likesCount); }
    } catch (e) { console.error(e); } finally { setLiking(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this reply?")) return; setDeleting(true);
    try { const res = await fetch(`${API_URL}/snippets/${snippetId}/comments/${commentId}/replies/${reply.id}`, { method: "DELETE", credentials: "include" }); if (res.ok) onDeleted(reply.id); } catch (e) { console.error(e); } finally { setDeleting(false); }
  }
  return (
    <div className="flex gap-2.5 group/reply">
      <Link to={`/profile/${reply.user?.id}`}><Avatar username={reply.user?.username} avatar={reply.user?.avatar} size="sm" /></Link>
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-gray-100 rounded-2xl px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <Link to={`/profile/${reply.user?.id}`} className="text-xs font-semibold text-ink-primary truncate hover:underline">@{reply.user?.username}</Link>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(reply.createdAt)}</span>
            </div>
            {canDelete && <ThreeDotMenu onDelete={handleDelete} deleting={deleting} />}
          </div>
          <p className="text-sm text-ink-gray leading-relaxed"><MentionText content={reply.content} /></p>
        </div>
        <div className="flex items-center gap-3 mt-1 ml-1">
          <LikeButton count={likesCount} liked={liked} onToggle={toggleLike} disabled={!currentUser || liking} />
          {currentUser && <button onClick={() => onReplyTo({ username: reply.user?.username, userId: reply.user?.id })} className="text-xs text-gray-400 hover:text-ink-primary font-medium transition-colors">Reply</button>}
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, snippetId, currentUser, onDeleted }) {
  const canDelete = currentUser && (currentUser.id === comment.user?.id || currentUser.role === "ADMIN");
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment._count?.likes ?? 0);
  const [liking, setLiking] = useState(false);
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(comment._count?.replies ?? 0);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  async function toggleLike() {
    if (!currentUser || liking) return;
    setLiking(true);
    try {
      const res = await fetch(`${API_URL}/snippets/${snippetId}/comments/${comment.id}/like`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) { setLiked(data.liked); setLikesCount(data.likesCount); }
    } catch (e) { console.error(e); } finally { setLiking(false); }
  }

  async function loadReplies() {
    setLoadingReplies(true);
    try { const res = await fetch(`${API_URL}/snippets/${snippetId}/comments/${comment.id}/replies?limit=50`, { credentials: "include" }); if (res.ok) { const data = await res.json(); setReplies(data.replies || []); } } catch (e) { console.error(e); } finally { setLoadingReplies(false); }
  }

  function toggleReplies() { if (!showReplies && replies.length === 0) loadReplies(); setShowReplies(v => !v); }
  function openReplyForm() { setReplyingTo(null); setReplyText(""); setShowReplyForm(v => !v); if (!showReplies) { setShowReplies(true); if (replies.length === 0) loadReplies(); } setTimeout(() => inputRef.current?.focus(), 50); }
  function handleReplyToReply({ username, userId }) { setReplyingTo({ username, userId }); setReplyText(""); setShowReplyForm(true); setShowReplies(true); if (replies.length === 0) loadReplies(); setTimeout(() => inputRef.current?.focus(), 50); }

  async function submitReply(e) {
    e.preventDefault(); if (!replyText.trim()) return; setSubmitting(true);
    try {
      const content = replyingTo ? `@${replyingTo.username} ${replyText.trim()}` : replyText.trim();
      const body = { content }; if (replyingTo) body.mentionedUserId = replyingTo.userId;
      const res = await fetch(`${API_URL}/snippets/${snippetId}/comments/${comment.id}/replies`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { const data = await res.json(); setReplies(prev => [...prev, data.reply]); setReplyCount(c => c + 1); setReplyText(""); setReplyingTo(null); setShowReplyForm(false); setShowReplies(true); }
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return; setDeleting(true);
    try { const res = await fetch(`${API_URL}/snippets/${snippetId}/comments/${comment.id}`, { method: "DELETE", credentials: "include" }); if (res.ok) onDeleted(comment.id); } catch (e) { console.error(e); } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2.5">
        <Link to={`/profile/${comment.user?.id}`}><Avatar username={comment.user?.username} avatar={comment.user?.avatar} size="sm" /></Link>
        <div className="flex-1 min-w-0">
          <div className="bg-ink-cream rounded-2xl px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <Link to={`/profile/${comment.user?.id}`} className="text-xs font-semibold text-ink-primary truncate hover:underline">@{comment.user?.username}</Link>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(comment.createdAt)}</span>
              </div>
              {canDelete && <ThreeDotMenu onDelete={handleDelete} deleting={deleting} />}
            </div>
            <p className="text-sm text-ink-gray leading-relaxed">{comment.content}</p>
          </div>
          <div className="flex items-center gap-4 mt-1.5 ml-1">
            <LikeButton count={likesCount} liked={liked} onToggle={toggleLike} disabled={!currentUser || liking} />
            {currentUser && <button onClick={openReplyForm} className="text-xs text-gray-400 hover:text-ink-primary font-medium transition-colors">Reply</button>}
            {replyCount > 0 && (
              <button onClick={toggleReplies} className="flex items-center gap-1 text-xs text-ink-gold hover:text-amber-600 font-medium transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                {showReplies ? "Hide replies" : `${replyCount} repl${replyCount === 1 ? "y" : "ies"}`}
              </button>
            )}
          </div>
          {showReplyForm && (
            <form onSubmit={submitReply} className="mt-2 space-y-1.5">
              {replyingTo && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-1">
                  <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  Replying to <span className="font-semibold text-blue-500">@{replyingTo.username}</span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="ml-0.5 text-gray-300 hover:text-gray-500 text-sm leading-none">×</button>
                </div>
              )}
              <div className="flex gap-2">
                <input ref={inputRef} type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                  placeholder={replyingTo ? `Reply to @${replyingTo.username}…` : "Write a reply…"} maxLength={500}
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink-primary/20 bg-white min-w-0" />
                <button type="submit" disabled={submitting || !replyText.trim()} className="px-4 py-2 bg-ink-primary text-white text-xs font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex-shrink-0">{submitting ? "…" : "Post"}</button>
                <button type="button" onClick={() => { setShowReplyForm(false); setReplyingTo(null); setReplyText(""); }} className="px-2 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">Cancel</button>
              </div>
            </form>
          )}
          {showReplies && (
            <div className="mt-2 pl-3 border-l-2 border-ink-gold/20 space-y-2">
              {loadingReplies ? <div className="text-xs text-gray-400 py-2">Loading replies…</div>
                : replies.map(reply => (
                  <ReplyItem key={reply.id} reply={reply} snippetId={snippetId} commentId={comment.id}
                    currentUser={currentUser} onDeleted={id => { setReplies(prev => prev.filter(r => r.id !== id)); setReplyCount(c => Math.max(0, c - 1)); }}
                    onReplyTo={handleReplyToReply} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentSection({ snippetId, user }) {
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  useEffect(() => { loadComments(1, true); }, [snippetId]);
  async function loadComments(p = 1, reset = false) {
    setLoading(true);
    try { const res = await fetch(`${API_URL}/snippets/${snippetId}/comments?page=${p}&limit=10`, { credentials: "include" }); const data = await res.json(); setComments(prev => reset ? (data.comments || []) : [...prev, ...(data.comments || [])]); setTotal(data.total || 0); setPage(p); } finally { setLoading(false); }
  }
  async function postComment(e) {
    e.preventDefault(); if (!text.trim()) return; setPosting(true);
    try { const res = await fetch(`${API_URL}/snippets/${snippetId}/comments`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text.trim() }) }); const data = await res.json(); if (res.ok) { setComments(prev => [data.comment, ...prev]); setTotal(t => t + 1); setText(""); } } finally { setPosting(false); }
  }
  return (
    <div className="mt-4 space-y-4">
      {user && (
        <form onSubmit={postComment} className="flex gap-2.5 items-start">
          <Avatar username={user.username} avatar={user.avatar} size="sm" />
          <div className="flex-1 flex gap-2 min-w-0">
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..."
              className="flex-1 text-sm text-ink-primary placeholder-gray-300 border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink-gold/30 focus:border-ink-gold transition-all bg-white min-w-0" />
            <button type="submit" disabled={posting || !text.trim()} className="px-4 py-2 bg-ink-primary text-white text-xs font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-40 flex-shrink-0">{posting ? "…" : "Post"}</button>
          </div>
        </form>
      )}
      {loading && comments.length === 0 ? <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        : <div className="space-y-3">
            {comments.map(comment => <CommentItem key={comment.id} comment={comment} snippetId={snippetId} currentUser={user} onDeleted={id => { setComments(prev => prev.filter(c => c.id !== id)); setTotal(t => Math.max(0, t - 1)); }} />)}
            {comments.length < total && <button onClick={() => loadComments(page + 1)} className="w-full text-xs text-gray-400 hover:text-ink-primary py-2 transition-colors">Load more comments</button>}
          </div>
      }
    </div>
  );
}

function SnippetCard({ snippet, currentUser, onDeleted }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(snippet._count?.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [liking, setLiking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const tagList = snippet.tags ? snippet.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  const commentCount = snippet._count?.comments || 0;
  const sourceConfig = sourceTypeConfig[snippet.sourceType] || sourceTypeConfig.STANDALONE;
  const canDelete = currentUser && (currentUser.id === snippet.user?.id || currentUser.role === "ADMIN");
  const isImage = snippet.mediaUrl && !snippet.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i);

  async function toggleLike() {
    if (!currentUser || liking) return; setLiking(true);
    try { const res = await fetch(`${API_URL}/snippets/${snippet.id}/like`, { method: "POST", credentials: "include" }); const data = await res.json(); if (res.ok) { setLiked(data.liked); setLikesCount(data.likesCount); } } finally { setLiking(false); }
  }
  async function handleShare() {
    const url = `${window.location.origin}/snippets/${snippet.id}`;
    if (navigator.share) { try { await navigator.share({ title: "Writing snippet on Inkwell", url }); } catch {} return; }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  async function handleDelete() {
    if (!confirm("Delete this snippet?")) return; setDeleting(true);
    try { const res = await fetch(`${API_URL}/snippets/${snippet.id}`, { method: "DELETE", credentials: "include" }); if (res.ok) onDeleted(snippet.id); } catch (e) { console.error(e); } finally { setDeleting(false); }
  }

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} alt="Snippet image" onClose={() => setLightboxSrc(null)} />}
      <article className="px-4 sm:px-7 py-5 sm:py-6 hover:bg-gray-50/60 transition-colors duration-150">
        <div className="flex gap-3 sm:gap-4">
          <div className="flex flex-col items-center flex-shrink-0">
            <Link to={`/profile/${snippet.user?.id}`}><Avatar username={snippet.user?.username} avatar={snippet.user?.avatar} size="md" /></Link>
            {showComments && <div className="w-0.5 bg-gray-200 flex-1 mt-2 rounded-full min-h-[24px]" />}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <Link to={`/profile/${snippet.user?.id}`} className="text-sm font-bold text-ink-primary hover:underline truncate">{snippet.user?.username}</Link>
                <Link to={`/snippets/${snippet.id}`} className="text-xs text-gray-400 flex-shrink-0 hover:text-ink-primary transition-colors">· {timeAgo(snippet.createdAt)}</Link>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${sourceConfig.className}`}
                >
                  {sourceConfig.label}
                </span>
              </div>
              {canDelete && <ThreeDotMenu onDelete={handleDelete} deleting={deleting} />}
            </div>
            {snippet.context && <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-line mb-3 break-words">{snippet.context}</p>}
            {snippet.mediaUrl && (
              <div className="mb-3 rounded-2xl overflow-hidden border border-gray-100">
                {isImage
                  ? <img src={snippet.mediaUrl} alt="Snippet media" className="w-full max-h-80 object-cover cursor-zoom-in hover:opacity-95 transition-opacity" onClick={() => setLightboxSrc(snippet.mediaUrl)} />
                  : <video src={snippet.mediaUrl} controls className="w-full max-h-80 object-cover" />}
              </div>
            )}
            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tagList.map(tag => <span key={tag} className="text-[11px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">#{tag}</span>)}
              </div>
            )}
            <div className="flex items-center gap-4 sm:gap-5 mt-2">
              <button onClick={toggleLike} disabled={!currentUser || liking} className={`flex items-center gap-1.5 transition-colors group/like disabled:cursor-not-allowed ${liked ? "text-red-500" : "text-gray-400 hover:text-red-400"}`}>
                <svg className="w-[18px] h-[18px] group-hover/like:scale-110 transition-transform" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
              </button>
              <button onClick={() => setShowComments(s => !s)} className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors group/comment">
                <svg className="w-[18px] h-[18px] group-hover/comment:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
              </button>
              <button onClick={handleShare} className="flex items-center gap-1.5 text-gray-400 hover:text-ink-primary transition-colors group/share">
                {copied ? <svg className="w-[18px] h-[18px] text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-[18px] h-[18px] group-hover/share:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>}
                {copied && <span className="text-xs text-green-500">Copied!</span>}
              </button>
              <Link to={`/snippets/${snippet.id}`} className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 hover:text-ink-primary transition-colors font-medium">
                Full page
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
            {showComments && <div className="mt-4"><CommentSection snippetId={snippet.id} user={currentUser} /></div>}
          </div>
        </div>
      </article>
    </>
  );
}

export default function SnippetFeed() {
  const { user } = useAuth();
  const [snippets, setSnippets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchSnippets(1); }, []);

  async function fetchSnippets(p) {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/snippets?page=${p}&limit=9`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSnippets(data.snippets || []); setTotalPages(data.totalPages || 1); setTotal(data.total || 0); setPage(p);
    } catch { setError("Could not load snippets. Please try again."); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <AppMetaTags title="Writer Snippets – Inkwell" description="What writers are proud of, struggling with, and learning — shared from the Inkwell community." />
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d1320 0%, #141c2e 40%, #1a2540 70%, #1e2d4a 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent 5%, #d4af37 35%, #d4af37 65%, transparent 95%)" }} />
        <div className="absolute pointer-events-none" style={{ top: "-80px", right: "-60px", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 65%)" }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-3" style={{ color: "#d4af37" }}>Inkwell Community</p>
          <h1 className="text-2xl sm:text-5xl font-serif text-white leading-tight mb-4">
            How is your writing today?<br className="hidden sm:block" /> Any wins or struggles?
          </h1>
          <p className="text-white text-sm sm:text-lg max-w-xl mb-7" style={{ opacity: 0.65 }}>Writing tips, honest reflections, and lessons from writers in the community.</p>
          {user
            ? <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold rounded-xl transition-all" style={{ background: "linear-gradient(135deg, #d4af37 0%, #c09a28 100%)", color: "#12181f", boxShadow: "0 4px 16px rgba(212,175,55,0.35)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Share yours
              </button>
            : <Link to="/signup" className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold rounded-xl transition-all" style={{ background: "linear-gradient(135deg, #d4af37 0%, #c09a28 100%)", color: "#12181f", boxShadow: "0 4px 16px rgba(212,175,55,0.35)" }}>Join to share</Link>
          }
        </div>
      </div>

      {showCreate && <CreateSnippetModal onClose={() => setShowCreate(false)} onCreated={s => { setShowCreate(false); setSnippets(prev => [s, ...prev]); setTotal(t => t + 1); }} defaultSourceType="STANDALONE" />}

      <main className="max-w-2xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 text-sm">{error}</div>}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden divide-y divide-gray-100">{[1,2,3,4].map(i => <CardSkeleton key={i} />)}</div>
        ) : snippets.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-ink-primary/5 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-ink-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </div>
            <h2 className="text-2xl font-serif text-ink-primary mb-2">No snippets yet</h2>
            <p className="text-gray-500 text-sm mb-6">Be the first to share a reflection from your writing.</p>
            {user ? <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-ink-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all">Share a Snippet</button>
              : <Link to="/signup" className="px-6 py-3 bg-ink-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all">Create an account</Link>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            {/* Threads-style compose bar */}
            <ComposeBar user={user} onOpenCreate={() => setShowCreate(true)} />
            <div className="divide-y divide-gray-100">
              {snippets.map(snippet => (
                <SnippetCard key={snippet.id} snippet={snippet} currentUser={user} onDeleted={id => { setSnippets(prev => prev.filter(s => s.id !== id)); setTotal(t => Math.max(0, t - 1)); }} />
              ))}
            </div>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-8 sm:mt-10 flex-wrap">
            <button onClick={() => fetchSnippets(page - 1)} disabled={page === 1} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-ink-gray hover:border-ink-primary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-soft">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => fetchSnippets(p)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === page ? "bg-ink-primary text-white shadow-soft" : "bg-white border border-gray-200 text-ink-gray hover:border-ink-primary hover:text-ink-primary"}`}>{p}</button>
              ))}
            </div>
            <button onClick={() => fetchSnippets(page + 1)} disabled={page === totalPages} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-ink-gray hover:border-ink-primary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-soft">
              <span className="hidden sm:inline">Next</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export function ShareSprintPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [context, setContext] = useState("");
  const [tags, setTags] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recentShares, setRecentShares] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/snippets?page=1&limit=6`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(d => setRecentShares(d?.snippets || [])).catch(() => {}).finally(() => setLoadingFeed(false));
  }, []);

  function handleMediaChange(e) {
    const file = e.target.files[0]; if (!file) return;
    const isImage = file.type.startsWith("image/"), isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { setError("Only images and videos are supported."); return; }
    setMediaFile(file); setMediaType(isImage ? "image" : "video"); setMediaPreview(URL.createObjectURL(file)); setError("");
  }
  function removeMedia() { setMediaFile(null); setMediaPreview(null); setMediaType(null); if (fileInputRef.current) fileInputRef.current.value = ""; }

  async function handleShare(e) {
    e.preventDefault(); setSubmitting(true); setError("");
    try {
      const formData = new FormData();
      if (context.trim()) formData.append("context", context.trim());
      if (tags.trim()) formData.append("tags", tags.trim());
      formData.append("sourceType", "POST_SPRINT");
      if (mediaFile) formData.append("media", mediaFile);
      const res = await fetch(`${API_URL}/snippets`, { method: "POST", credentials: "include", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong.");
      navigate("/snippets", { state: { shared: true } });
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <AppMetaTags title="Share Your Sprint – Inkwell" description="How was your writing today? Share a win, a struggle, or a reflection." />
      <Header />
      <div className="bg-emerald-700 text-white text-center py-3 px-4"><p className="text-sm font-medium">Sprint complete — how did it go?</p></div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <p className="text-ink-gold text-xs font-bold uppercase tracking-widest mb-2">Post-sprint reflection</p>
          <h1 className="text-2xl sm:text-4xl font-serif text-ink-primary leading-snug mb-2">How is your writing today?</h1>
          <p className="text-gray-500 text-sm">Any wins or struggles? Share with the community.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden mb-8">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Avatar username={user?.username} avatar={user?.avatar} />
              <div><p className="text-sm font-semibold text-ink-primary">{user?.username}</p><p className="text-xs text-gray-400">New share</p></div>
            </div>
            <button onClick={() => navigate("/snippets")} className="text-xs text-gray-400 hover:text-ink-primary transition-colors font-medium">Skip</button>
          </div>
          <form onSubmit={handleShare} className="px-4 sm:px-5 py-5 space-y-4">
            <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="How is your writing today? Any wins or struggles worth sharing with the community?" rows={5}
              className="w-full text-ink-primary text-sm leading-relaxed placeholder-gray-300 resize-none border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-ink-gold/30 focus:border-ink-gold transition-all bg-ink-cream" />
            <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags: pacing, dialogue, worldbuilding (optional)"
              className="w-full text-sm text-ink-primary placeholder-gray-300 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ink-gold/30 focus:border-ink-gold transition-all bg-white" />
            <div>
              {mediaPreview ? (
                <div className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                  {mediaType === "image" ? <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-cover" /> : <video src={mediaPreview} controls className="w-full max-h-64 rounded-xl" />}
                  <button type="button" onClick={removeMedia} className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex items-center justify-center gap-3 text-gray-400 hover:border-ink-gold hover:text-ink-gold transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-sm">Attach an image or video (optional)</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleMediaChange} className="hidden" />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-400">Post-sprint · visible to all</p>
              <button type="submit" disabled={submitting || !context.trim()} className="px-5 sm:px-6 py-2.5 bg-ink-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? "Sharing..." : "Share"}
              </button>
            </div>
          </form>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-primary">Recent from the community</h2>
          <button onClick={() => navigate("/snippets")} className="text-xs text-gray-400 hover:text-ink-primary transition-colors">See all →</button>
        </div>
        {loadingFeed
          ? <div className="bg-white rounded-2xl shadow-soft overflow-hidden divide-y divide-gray-100">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
          : recentShares.length > 0
            ? <div className="bg-white rounded-2xl shadow-soft overflow-hidden divide-y divide-gray-100">{recentShares.map(s => <SnippetCard key={s.id} snippet={s} currentUser={user} onDeleted={id => setRecentShares(prev => prev.filter(x => x.id !== id))} />)}</div>
            : <div className="text-center py-14 text-gray-400 text-sm">No shares yet — be the first!</div>
        }
      </div>
    </div>
  );
}