import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { AppMetaTags } from "../utilis/metatags";
import Header from "../profile/header";
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

function Avatar({ username, avatar, size = "md" }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
  if (avatar) return <img src={avatar} alt={username} className={`${sizes[size]} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sizes[size]} rounded-full bg-ink-primary flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {username?.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function MentionText({ content }) {
  const parts = content.split(/(@\w+)/g);
  return <>{parts.map((part, i) => /^@\w+$/.test(part) ? <span key={i} className="text-blue-500 font-semibold">{part}</span> : part)}</>;
}

// ─── Like button — used for comments and replies ──────────────
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

// ─── Reply item with like ─────────────────────────────────────
function ReplyItem({ reply, snippetId, commentId, currentUser, onDeleted, onReplyTo }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reply._count?.likes ?? 0);
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = currentUser && (currentUser.id === reply.user?.id || currentUser.role === "ADMIN");

  async function toggleLike() {
    if (!currentUser || liking) return;
    setLiking(true);
    try {
      const res = await fetch(
        `${API_URL}/snippets/${snippetId}/comments/${commentId}/replies/${reply.id}/like`,
        { method: "POST", credentials: "include" }
      );
      const data = await res.json();
      if (res.ok) { setLiked(data.liked); setLikesCount(data.likesCount); }
    } catch (e) { console.error(e); } finally { setLiking(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this reply?")) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_URL}/snippets/${snippetId}/comments/${commentId}/replies/${reply.id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) onDeleted(reply.id);
    } catch (e) { console.error(e); } finally { setDeleting(false); }
  }

  return (
    <div className="flex gap-2.5">
      <Link to={`/profile/${reply.user?.id}`}><Avatar username={reply.user?.username} avatar={reply.user?.avatar} size="sm" /></Link>
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-gray-100 rounded-2xl px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <Link to={`/profile/${reply.user?.id}`} className="text-xs font-semibold text-ink-primary truncate hover:underline">@{reply.user?.username}</Link>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(reply.createdAt)}</span>
            </div>
            {canDelete && (
              <button onClick={handleDelete} disabled={deleting} className="text-[10px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
                {deleting ? "…" : "Delete"}
              </button>
            )}
          </div>
          <p className="text-sm text-ink-gray leading-relaxed"><MentionText content={reply.content} /></p>
        </div>
        <div className="flex items-center gap-3 mt-1.5 ml-1">
          <LikeButton count={likesCount} liked={liked} onToggle={toggleLike} disabled={!currentUser || liking} />
          {currentUser && (
            <button onClick={() => onReplyTo({ username: reply.user?.username, userId: reply.user?.id })} className="text-xs text-gray-400 hover:text-ink-primary font-medium transition-colors">
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comment item with like ───────────────────────────────────
function CommentItem({ comment, snippetId, currentUser, onDeleted }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment._count?.likes ?? 0);
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(comment._count?.replies ?? 0);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const canDelete = currentUser && (currentUser.id === comment.user?.id || currentUser.role === "ADMIN");

  async function toggleLike() {
    if (!currentUser || liking) return;
    setLiking(true);
    try {
      const res = await fetch(
        `${API_URL}/snippets/${snippetId}/comments/${comment.id}/like`,
        { method: "POST", credentials: "include" }
      );
      const data = await res.json();
      if (res.ok) { setLiked(data.liked); setLikesCount(data.likesCount); }
    } catch (e) { console.error(e); } finally { setLiking(false); }
  }

  async function loadReplies() {
    setLoadingReplies(true);
    try {
      const res = await fetch(`${API_URL}/snippets/${snippetId}/comments/${comment.id}/replies?limit=50`, { credentials: "include" });
      if (res.ok) { const data = await res.json(); setReplies(data.replies || []); }
    } catch (e) { console.error(e); } finally { setLoadingReplies(false); }
  }

  function toggleReplies() {
    if (!showReplies && replies.length === 0) loadReplies();
    setShowReplies(v => !v);
  }

  function openReplyForm() {
    setReplyingTo(null); setReplyText(""); setShowReplyForm(v => !v);
    if (!showReplies) { setShowReplies(true); if (replies.length === 0) loadReplies(); }
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleReplyToReply({ username, userId }) {
    setReplyingTo({ username, userId }); setReplyText(""); setShowReplyForm(true); setShowReplies(true);
    if (replies.length === 0) loadReplies();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function submitReply(e) {
    e.preventDefault(); if (!replyText.trim()) return; setSubmitting(true);
    try {
      const content = replyingTo ? `@${replyingTo.username} ${replyText.trim()}` : replyText.trim();
      const body = { content }; if (replyingTo) body.mentionedUserId = replyingTo.userId;
      const res = await fetch(`${API_URL}/snippets/${snippetId}/comments/${comment.id}/replies`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        setReplies(prev => [...prev, data.reply]); setReplyCount(c => c + 1);
        setReplyText(""); setReplyingTo(null); setShowReplyForm(false); setShowReplies(true);
      }
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return; setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/snippets/${snippetId}/comments/${comment.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) onDeleted(comment.id);
    } catch (e) { console.error(e); } finally { setDeleting(false); }
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
              {canDelete && (
                <button onClick={handleDelete} disabled={deleting} className="text-[10px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
                  {deleting ? "…" : "Delete"}
                </button>
              )}
            </div>
            <p className="text-sm text-ink-gray leading-relaxed">{comment.content}</p>
          </div>

          {/* Comment actions — like + reply + show replies */}
          <div className="flex items-center gap-4 mt-1.5 ml-1">
            <LikeButton count={likesCount} liked={liked} onToggle={toggleLike} disabled={!currentUser || liking} />
            {currentUser && (
              <button onClick={openReplyForm} className="text-xs text-gray-400 hover:text-ink-primary font-medium transition-colors">
                Reply
              </button>
            )}
            {replyCount > 0 && (
              <button onClick={toggleReplies} className="flex items-center gap-1 text-xs text-ink-gold hover:text-amber-600 font-medium transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                {showReplies ? "Hide replies" : `${replyCount} repl${replyCount === 1 ? "y" : "ies"}`}
              </button>
            )}
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <form onSubmit={submitReply} className="mt-2 space-y-1.5">
              {replyingTo && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-1">
                  <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Replying to <span className="font-semibold text-blue-500">@{replyingTo.username}</span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="ml-0.5 text-gray-300 hover:text-gray-500 text-sm leading-none">×</button>
                </div>
              )}
              <div className="flex gap-2">
                <input ref={inputRef} type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                  placeholder={replyingTo ? `Reply to @${replyingTo.username}…` : "Write a reply…"} maxLength={500}
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink-primary/20 bg-white min-w-0" />
                <button type="submit" disabled={submitting || !replyText.trim()} className="px-4 py-2 bg-ink-primary text-white text-xs font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex-shrink-0">
                  {submitting ? "…" : "Post"}
                </button>
                <button type="button" onClick={() => { setShowReplyForm(false); setReplyingTo(null); setReplyText(""); }} className="px-2 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Replies list */}
          {showReplies && (
            <div className="mt-2 pl-3 border-l-2 border-ink-gold/20 space-y-2">
              {loadingReplies
                ? <div className="text-xs text-gray-400 py-2">Loading replies…</div>
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

// ─── Main snippet page ────────────────────────────────────────
export default function SnippetPage() {
  const { snippetId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [snippet, setSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/snippets/${snippetId}`, { credentials: "include" });
        if (res.status === 404) { setNotFound(true); return; }
        const data = await res.json();
        setSnippet(data.snippet);
        setLikesCount(data.snippet._count?.likes || 0);
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    }
    load();
    loadComments(1, true);
  }, [snippetId]);

  async function loadComments(p = 1, reset = false) {
    setLoadingComments(true);
    try {
      const res = await fetch(`${API_URL}/snippets/${snippetId}/comments?page=${p}&limit=20`, { credentials: "include" });
      const data = await res.json();
      setComments(prev => reset ? (data.comments || []) : [...prev, ...(data.comments || [])]);
      setCommentsTotal(data.total || 0);
      setCommentsPage(p);
    } finally { setLoadingComments(false); }
  }

  async function toggleLike() {
    if (!user || liking) return;
    setLiking(true);
    try {
      const res = await fetch(`${API_URL}/snippets/${snippetId}/like`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) { setLiked(data.liked); setLikesCount(data.likesCount); }
    } finally { setLiking(false); }
  }

  async function postComment(e) {
    e.preventDefault(); if (!commentText.trim()) return; setPosting(true);
    try {
      const res = await fetch(`${API_URL}/snippets/${snippetId}/comments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() })
      });
      const data = await res.json();
      if (res.ok) { setComments(prev => [data.comment, ...prev]); setCommentsTotal(t => t + 1); setCommentText(""); }
    } finally { setPosting(false); }
  }

  async function handleShare() {
    const url = `${window.location.origin}/snippets/${snippetId}`;
    if (navigator.share) { try { await navigator.share({ title: "Writing snippet on Inkwell", url }); } catch {} return; }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  if (loading) return (
    <div className="min-h-screen bg-ink-cream">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="h-4 w-1/3 bg-gray-200 rounded" />
        <div className="h-24 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-ink-cream">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-2xl font-serif text-ink-primary mb-2">Snippet not found</p>
        <p className="text-gray-400 text-sm mb-6">It may have been deleted by the author.</p>
        <button onClick={() => navigate("/snippets")} className="px-5 py-2.5 bg-ink-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all">
          Back to snippets
        </button>
      </div>
    </div>
  );

  const isImage = snippet.mediaUrl && !snippet.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i);
  const tagList = snippet.tags ? snippet.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-ink-cream">
      <AppMetaTags title={`${snippet.user?.username}'s snippet — Inkwell`} description={snippet.context?.slice(0, 120) || "A writing snippet from Inkwell"} />
      <Header />

      {lightboxSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="Snippet" className="max-w-full max-h-[90vh] rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSrc(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        {/* Back link */}
        <button onClick={() => navigate("/snippets")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-ink-primary mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to snippets
        </button>

        <div className="bg-white rounded-2xl shadow-soft overflow-hidden border border-gray-100">
          {/* Snippet */}
          <article className="px-5 sm:px-7 py-6">
            <div className="flex gap-3 sm:gap-4">
              <Link to={`/profile/${snippet.user?.id}`}>
                <Avatar username={snippet.user?.username} avatar={snippet.user?.avatar} size="md" />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <Link to={`/profile/${snippet.user?.id}`} className="text-sm font-bold text-ink-primary hover:underline">
                    {snippet.user?.username}
                  </Link>
                  <span className="text-xs text-gray-400">· {timeAgo(snippet.createdAt)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${snippet.sourceType === "POST_SPRINT" ? "bg-ink-primary/10 text-ink-primary" : "bg-ink-gold/10 text-[#b8962e]"}`}>
                    {snippet.sourceType === "POST_SPRINT" ? "Sprint" : "Solo"}
                  </span>
                </div>

                {snippet.context && (
                  <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-line mb-4 break-words">{snippet.context}</p>
                )}

                {snippet.mediaUrl && (
                  <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100">
                    {isImage
                      ? <img src={snippet.mediaUrl} alt="Snippet media" className="w-full max-h-96 object-cover cursor-zoom-in hover:opacity-95 transition-opacity" onClick={() => setLightboxSrc(snippet.mediaUrl)} />
                      : <video src={snippet.mediaUrl} controls className="w-full max-h-96 rounded-xl" />}
                  </div>
                )}

                {tagList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tagList.map(tag => <span key={tag} className="text-[11px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">#{tag}</span>)}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-5 pt-2 border-t border-gray-50">
                  <button onClick={toggleLike} disabled={!user || liking} className={`flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed ${liked ? "text-red-500" : "text-gray-400 hover:text-red-400"}`}>
                    <svg className="w-[18px] h-[18px]" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
                  </button>

                  <div className="flex items-center gap-1.5 text-gray-400">
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {commentsTotal > 0 && <span className="text-xs">{commentsTotal}</span>}
                  </div>

                  <button onClick={handleShare} className="flex items-center gap-1.5 text-gray-400 hover:text-ink-primary transition-colors ml-auto">
                    {copied
                      ? <><svg className="w-[18px] h-[18px] text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-xs text-green-500">Copied!</span></>
                      : <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    }
                  </button>
                </div>
              </div>
            </div>
          </article>

          {/* Comments */}
          <div className="border-t border-gray-100 px-5 sm:px-7 py-5">
            {user && (
              <form onSubmit={postComment} className="flex gap-2.5 items-start mb-5">
                <Avatar username={user.username} avatar={user.avatar} size="sm" />
                <div className="flex-1 flex gap-2 min-w-0">
                  <input value={commentText} onChange={e => setCommentText(e.target.value)}
                    placeholder="Add a comment…"
                    className="flex-1 text-sm text-ink-primary placeholder-gray-300 border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink-gold/30 focus:border-ink-gold transition-all bg-white min-w-0" />
                  <button type="submit" disabled={posting || !commentText.trim()} className="px-4 py-2 bg-ink-primary text-white text-xs font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-40 flex-shrink-0">
                    {posting ? "…" : "Post"}
                  </button>
                </div>
              </form>
            )}

            {loadingComments && comments.length === 0
              ? <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
              : (
                <div className="space-y-4">
                  {comments.map(comment => (
                    <CommentItem key={comment.id} comment={comment} snippetId={Number(snippetId)} currentUser={user}
                      onDeleted={id => { setComments(prev => prev.filter(c => c.id !== id)); setCommentsTotal(t => Math.max(0, t - 1)); }} />
                  ))}
                  {comments.length < commentsTotal && (
                    <button onClick={() => loadComments(commentsPage + 1)} className="w-full text-xs text-gray-400 hover:text-ink-primary py-2 transition-colors">
                      Load more comments
                    </button>
                  )}
                  {comments.length === 0 && !loadingComments && (
                    <p className="text-center text-sm text-gray-400 py-4">No comments yet. Be the first to respond.</p>
                  )}
                </div>
              )
            }
          </div>
        </div>
      </main>
    </div>
  );
}