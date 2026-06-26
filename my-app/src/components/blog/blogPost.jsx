import { useState, useEffect, useRef, Fragment } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";

// ── Content renderer ──────────────────────────────────────────────────────────
function isHtmlContent(content = "") {
  return /<[a-z][\s\S]*>/i.test(content);
}

function PostContent({ content }) {
  if (isHtmlContent(content)) {
    return (
      <div
        className="prose-news text-[#2d2620] leading-[1.9] text-[1.05rem] sm:text-[1.1rem]"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <FormattedContent text={content} />;
}

function FormattedContent({ text }) {
  function parseLine(line, lineKey) {
    const parts = [];
    let remaining = line;
    let i = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      const boldIdx = boldMatch ? boldMatch.index : Infinity;
      const italicIdx = italicMatch ? italicMatch.index : Infinity;
      if (boldMatch && boldIdx <= italicIdx) {
        if (boldIdx > 0) parts.push(remaining.slice(0, boldIdx));
        parts.push(<strong key={`${lineKey}-b${i++}`} className="font-semibold text-[#1a1a2e]">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldIdx + boldMatch[0].length);
      } else if (italicMatch && italicIdx < Infinity) {
        if (italicIdx > 0) parts.push(remaining.slice(0, italicIdx));
        parts.push(<em key={`${lineKey}-i${i++}`}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicIdx + italicMatch[0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }
    return parts;
  }
  const lines = text.split("\n");
  return (
    <div className="text-[#2d2620] leading-[1.9] text-[1.05rem] whitespace-pre-wrap">
      {lines.map((line, idx) => (
        <Fragment key={idx}>
          {parseLine(line, idx)}
          {idx < lines.length - 1 && "\n"}
        </Fragment>
      ))}
    </div>
  );
}

function MentionText({ content }) {
  const parts = content.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^@\w+$/.test(part)
          ? <span key={i} className="font-semibold" style={{ color: "#d4af37" }}>{part}</span>
          : part
      )}
    </>
  );
}

// ── Reply item ────────────────────────────────────────────────────────────────
function ReplyItem({ reply, postId, commentId, onDeleted, onReply }) {
  const { user } = useAuth();
  const canDelete = user && (user.id === reply.authorId || user.role === "ADMIN");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this reply?")) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_URL}/blog/${postId}/comments/${commentId}/replies/${reply.id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) onDeleted(reply.id);
    } catch (e) { console.error(e); } finally { setDeleting(false); }
  }

  return (
    <div className="flex gap-3 py-2.5 group/reply">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
           style={{ background: "#1a1a2e" }}>
        {reply.author?.username?.charAt(0).toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-[#1a1a2e]">{reply.author?.username}</span>
          <span className="text-xs text-[#9a8c7a]">
            {new Date(reply.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <p className="text-sm text-[#4a3f35] leading-relaxed">
          <MentionText content={reply.content} />
        </p>
        {user && (
          <button onClick={() => onReply({ username: reply.author?.username, userId: reply.authorId })}
                  className="mt-1 text-xs text-[#9a8c7a] hover:text-[#d4af37] font-medium transition-colors">
            Reply
          </button>
        )}
      </div>
      {canDelete && (
        <button onClick={handleDelete} disabled={deleting}
                className="text-xs text-red-300 hover:text-red-500 flex-shrink-0 self-start mt-0.5
                           disabled:opacity-50 transition-colors opacity-0 group-hover/reply:opacity-100">
          Delete
        </button>
      )}
    </div>
  );
}

// ── Comment item ──────────────────────────────────────────────────────────────
function CommentItem({ comment, postId, onDeleted }) {
  const { user } = useAuth();
  const canDelete = user && (user.id === comment.authorId || user.role === "ADMIN");

  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replyCount, setReplyCount] = useState(comment._count?.replies ?? 0);
  const inputRef = useRef(null);

  async function loadReplies() {
    setLoadingReplies(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}/comments/${comment.id}/replies?limit=50`, { credentials: "include" });
      if (res.ok) { const data = await res.json(); setReplies(data.replies || []); }
    } catch (e) { console.error(e); } finally { setLoadingReplies(false); }
  }

  function toggleReplies() {
    if (!showReplies && replies.length === 0) loadReplies();
    setShowReplies(v => !v);
  }

  function handleReplyToReply({ username, userId }) {
    setReplyingTo({ username, userId });
    setReplyText("");
    setShowReplyForm(true);
    setShowReplies(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function openCommentReplyForm() {
    setReplyingTo(null);
    setReplyText("");
    setShowReplyForm(v => !v);
  }

  function closeReplyForm() { setShowReplyForm(false); setReplyingTo(null); setReplyText(""); }

  async function submitReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const content = replyingTo ? `@${replyingTo.username} ${replyText.trim()}` : replyText.trim();
      const body = { content };
      if (replyingTo) body.mentionedUserId = replyingTo.userId;
      const res = await fetch(`${API_URL}/blog/${postId}/comments/${comment.id}/replies`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setReplies(prev => [...prev, data.reply]);
        setReplyCount(c => c + 1);
        setReplyText(""); setReplyingTo(null); setShowReplyForm(false); setShowReplies(true);
      }
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}/comments/${comment.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) onDeleted(comment.id);
    } catch (e) { console.error(e); } finally { setDeleting(false); }
  }

  function handleReplyDeleted(replyId) {
    setReplies(prev => prev.filter(r => r.id !== replyId));
    setReplyCount(c => Math.max(0, c - 1));
  }

  return (
    <div className="group py-5 border-b border-[#f0ebe3] last:border-b-0">
      <div className="flex gap-3.5">
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-sm"
             style={{ background: "#1a1a2e" }}>
          {comment.author?.username?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold text-[#1a1a2e]">{comment.author?.username}</span>
            <span className="text-xs text-[#9a8c7a]">
              {new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <p className="text-sm text-[#4a3f35] leading-relaxed">{comment.content}</p>

          <div className="flex items-center gap-4 mt-2.5">
            {replyCount > 0 && (
              <button onClick={toggleReplies}
                      className="flex items-center gap-1 text-xs font-medium transition-colors"
                      style={{ color: "#d4af37" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                {showReplies ? "Hide" : `${replyCount} repl${replyCount === 1 ? "y" : "ies"}`}
              </button>
            )}
            {user && (
              <button onClick={openCommentReplyForm}
                      className="text-xs text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors font-medium">
                Reply
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete} disabled={deleting}
                      className="text-xs text-red-300 hover:text-red-500 transition-colors ml-auto disabled:opacity-50">
                Delete
              </button>
            )}
          </div>

          {showReplyForm && (
            <form onSubmit={submitReply} className="mt-3 space-y-2">
              {replyingTo && (
                <div className="flex items-center gap-1.5 text-xs text-[#9a8c7a]">
                  <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Replying to <span className="font-semibold" style={{ color: "#d4af37" }}>@{replyingTo.username}</span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="ml-0.5 text-[#9a8c7a] hover:text-[#1a1a2e] text-sm">×</button>
                </div>
              )}
              <div className="flex gap-2">
                <input ref={inputRef} type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                       placeholder="Write a reply…" maxLength={500}
                       className="flex-1 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 bg-[#f5f3ef]"
                       style={{ borderColor: "#e8e0d0", "--tw-ring-color": "rgba(212,175,55,0.3)" }} />
                <button type="submit" disabled={submitting || !replyText.trim()}
                        className="px-4 py-2 text-white text-sm rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50"
                        style={{ background: "#1a1a2e" }}>
                  {submitting ? "…" : "Post"}
                </button>
                <button type="button" onClick={closeReplyForm} className="px-3 py-2 text-sm text-[#9a8c7a] hover:text-[#1a1a2e]">Cancel</button>
              </div>
            </form>
          )}

          {showReplies && (
            <div className="mt-3 pl-4 border-l-2 space-y-0.5" style={{ borderColor: "rgba(212,175,55,0.25)" }}>
              {loadingReplies ? (
                <div className="text-xs text-[#9a8c7a] py-2">Loading replies…</div>
              ) : (
                replies.map(reply => (
                  <ReplyItem key={reply.id} reply={reply} postId={postId} commentId={comment.id}
                             onDeleted={handleReplyDeleted} onReply={handleReplyToReply} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Share button ──────────────────────────────────────────────────────────────
function ShareButton({ title }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    const shareData = { title: title || "Check out this post on Quillweave", text: title ? `"${title}" — Quillweave Community` : "Read this on Quillweave", url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
      return;
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  return (
    <button onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all"
            style={{ borderColor: "#e8e0d0", color: "#6b5c4a", background: "white" }}>
      {copied ? (
        <><svg className="w-3.5 h-3.5" style={{ color: "#22c55e" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span style={{ color: "#22c55e" }}>Copied!</span></>
      ) : (
        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>Share</>
      )}
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="min-h-screen animate-pulse" style={{ background: "#f5f3ef" }}>
      <div className="w-full h-72 bg-gray-200" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <div className="h-3 w-28 bg-gray-200 rounded" />
        <div className="h-10 w-3/4 bg-gray-200 rounded" />
        <div className="h-10 w-1/2 bg-gray-200 rounded" />
        <div className="space-y-2.5 pt-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className={`h-4 bg-gray-100 rounded ${i % 3 === 0 ? "w-4/5" : "w-full"}`} />)}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BlogPost() {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likePending, setLikePending] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => { fetchPost(); fetchComments(1); }, [postId]);

  async function fetchPost() {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}`, { credentials: "include" });
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPost(data.post);
      setLikesCount(data.post._count?.likes ?? 0);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }

  async function fetchComments(p) {
    setLoadingComments(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}/comments?page=${p}&limit=10`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setCommentsTotalPages(data.totalPages || 1);
        setCommentsPage(p);
      }
    } catch (e) { console.error(e); } finally { setLoadingComments(false); }
  }

  async function handleLike() {
    if (!user) { navigate("/login"); return; }
    setLikePending(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}/like`, { method: "POST", credentials: "include" });
      if (res.ok) { const data = await res.json(); setLiked(data.liked); setLikesCount(data.likesCount); }
    } catch (e) { console.error(e); } finally { setLikePending(false); }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}/comments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) { const data = await res.json(); setComments(prev => [data.comment, ...prev]); setCommentText(""); }
    } catch (e) { console.error(e); } finally { setSubmittingComment(false); }
  }

  function handleCommentDeleted(id) { setComments(prev => prev.filter(c => c.id !== id)); }

  const pubDate = post ? new Date(post.createdAt).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }) : "";

  if (isLoading) return <PostSkeleton />;

  if (notFound) {
    return (
      <div className="min-h-screen" style={{ background: "#f5f3ef" }}>
        <main className="max-w-3xl mx-auto px-4 py-28 text-center">
          <p className="font-serif text-7xl text-gray-200 mb-4">404</p>
          <h1 className="text-2xl font-serif text-[#1a1a2e] mb-3">Post not found</h1>
          <Link to="/blog" className="text-sm hover:underline" style={{ color: "#d4af37" }}>← Back to Community</Link>
        </main>
      </div>
    );
  }

  const seriesLabel = post.series?.title;

  return (
    <div className="min-h-screen" style={{ background: "#f5f3ef" }}>
      {post && (
        <AppMetaTags
          title={post.title ? `${post.title} — Quillweave Community` : "Quillweave Community"}
          description={stripHtml(post.content).slice(0, 160)}
        />
      )}

      {/* ── Newspaper header bar ─────────────────────────────────────────── */}
      <div
        className="border-b"
        style={{ background: "#1a1a2e", borderColor: "rgba(212,175,55,0.25)" }}
      >
        {/* gold top rule */}
        <div className="h-[3px]" style={{ background: "#d4af37" }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link
            to="/community-update"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={e => e.currentTarget.style.color = "#d4af37"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Community
          </Link>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/30 hidden sm:block">Inkwell</p>
          <div className="flex items-center gap-2">
            {seriesLabel && (
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm text-[#1a1a2e]"
                    style={{ background: "#d4af37" }}>
                {seriesLabel}
              </span>
            )}
            {post.isPinned && (
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm text-white"
                    style={{ background: "rgba(255,255,255,0.15)" }}>
                Pinned
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero image ──────────────────────────────────────────────────────── */}
      {post.mediaUrl && (
        <div className="w-full overflow-hidden" style={{ maxHeight: "640px", background: "#1a1a2e" }}>
          <img
            src={post.mediaUrl}
            alt={post.title || ""}
            className="w-full h-auto max-h-[640px] object-contain mx-auto"
          />
        </div>
      )}

      {/* ── Article ─────────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">

        {/* Article header */}
        <header className="pt-10 pb-8 border-b" style={{ borderColor: "#e8e0d0" }}>
          {/* dateline */}
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: "#d4af37" }}>
            {pubDate}
          </p>

          {post.title && (
            <h1 className="font-serif text-[#1a1a2e] text-4xl sm:text-5xl leading-tight mb-5">
              {post.title}
            </h1>
          )}

          {/* Gold rule beneath headline */}
          <div className="flex items-center gap-2 mb-5">
            <div className="h-[2px] w-12 rounded-full" style={{ background: "#d4af37" }} />
            <div className="h-[2px] flex-1 rounded-full" style={{ background: "#e8e0d0" }} />
          </div>

          {/* Meta row */}
          <div className="flex items-center flex-wrap gap-4 text-xs text-[#9a8c7a]">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {likesCount} likes
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
              </svg>
              {post._count?.comments ?? 0} comments
            </span>
            <ShareButton title={post.title} />
          </div>
        </header>

        {/* Series banner */}
        {post.series && (
          <Link
            to={`/blog/series/${post.series.slug}`}
            className="flex items-center gap-3 mt-7 px-4 py-3 rounded-lg border transition-all group"
            style={{ background: "rgba(212,175,55,0.05)", borderColor: "rgba(212,175,55,0.25)" }}
          >
            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm text-white"
                  style={{ background: "#1a1a2e" }}>Series</span>
            <span className="text-sm text-[#1a1a2e] font-medium flex-1 truncate">
              Part of <span className="font-serif group-hover:text-[#d4af37] transition-colors">{post.series.title}</span>
            </span>
            <svg className="w-4 h-4 text-[#9a8c7a] group-hover:translate-x-1 group-hover:text-[#d4af37] transition-all flex-shrink-0"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {/* Body text — white paper card with newspaper-style drop cap */}
        <article className="mt-8 bg-white rounded-2xl shadow-sm border border-[#e8e0d0] px-6 sm:px-10 py-8 sm:py-10">
          <PostContent content={post.content} />
        </article>

        {/* External link */}
        {post.link && (
          <a href={post.link} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 mt-10 px-5 py-2.5 border-2 text-sm font-semibold rounded-lg transition-all duration-200"
             style={{ borderColor: "#d4af37", color: "#d4af37" }}
             onMouseEnter={e => { e.currentTarget.style.background = "#d4af37"; e.currentTarget.style.color = "#1a1a2e"; }}
             onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#d4af37"; }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Read full article
          </a>
        )}

        {/* Like + share footer */}
        <div className="mt-12 pt-8 border-t flex items-center gap-3 flex-wrap" style={{ borderColor: "#e8e0d0" }}>
          <button
            onClick={handleLike}
            disabled={likePending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all duration-200 disabled:opacity-60"
            style={liked
              ? { background: "rgba(220,38,38,0.06)", color: "#dc2626", borderColor: "rgba(220,38,38,0.3)" }
              : { background: "white", color: "#6b5c4a", borderColor: "#e8e0d0" }
            }
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${liked ? "scale-110" : ""}`}
                 fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {liked ? "Liked" : "Like"} · {likesCount}
          </button>
          <ShareButton title={post.title} />
        </div>

        {/* ── Series prev/next ─────────────────────────────────────────────── */}
        {post.series && (post.previousPost || post.nextPost) && (
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-4 rounded-sm" style={{ background: "#d4af37" }} />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#1a1a2e]">More in this series</span>
              <div className="flex-1 h-px bg-[#e8e0d0]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {post.previousPost ? (
                <Link to={`/blog/${post.previousPost.id}`}
                      className="group border border-[#e8e0d0] bg-white rounded-xl p-4 flex items-center gap-3 hover:border-[#d4af37]/50 transition-all">
                  <svg className="w-5 h-5 flex-shrink-0 text-[#9a8c7a] group-hover:-translate-x-1 group-hover:text-[#d4af37] transition-all"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#9a8c7a] mb-0.5">Previous</p>
                    <p className="font-serif text-sm text-[#1a1a2e] group-hover:text-[#d4af37] transition-colors truncate">
                      {post.previousPost.title || "Untitled post"}
                    </p>
                  </div>
                </Link>
              ) : <div className="hidden sm:block" />}

              {post.nextPost ? (
                <Link to={`/blog/${post.nextPost.id}`}
                      className="group border border-[#e8e0d0] bg-white rounded-xl p-4 flex items-center gap-3 justify-end text-right hover:border-[#d4af37]/50 transition-all">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#9a8c7a] mb-0.5">Next</p>
                    <p className="font-serif text-sm text-[#1a1a2e] group-hover:text-[#d4af37] transition-colors truncate">
                      {post.nextPost.title || "Untitled post"}
                    </p>
                  </div>
                  <svg className="w-5 h-5 flex-shrink-0 text-[#9a8c7a] group-hover:translate-x-1 group-hover:text-[#d4af37] transition-all"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : <div className="hidden sm:block" />}
            </div>
            <Link to={`/blog/series/${post.series.slug}`}
                  className="flex items-center justify-center gap-1.5 mt-4 text-xs font-semibold transition-colors"
                  style={{ color: "#9a8c7a" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#d4af37"}
                  onMouseLeave={e => e.currentTarget.style.color = "#9a8c7a"}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              View all posts in {post.series.title}
            </Link>
          </section>
        )}

        {/* ── Comments ─────────────────────────────────────────────────────── */}
        <section className="mt-14">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-2 h-5 rounded-sm" style={{ background: "#d4af37" }} />
            <h2 className="font-serif text-xl text-[#1a1a2e]">Discussion</h2>
            <div className="flex-1 h-px bg-[#e8e0d0]" />
            <span className="text-xs text-[#9a8c7a]">{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Comment form */}
          {user ? (
            <form onSubmit={submitComment} className="bg-white border border-[#e8e0d0] rounded-xl p-5 mb-6">
              <div className="flex gap-3.5">
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                     style={{ background: "#1a1a2e" }}>
                  {user.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Share your thoughts…"
                    rows={3}
                    maxLength={1000}
                    className="w-full text-sm border rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 resize-none"
                    style={{ borderColor: "#e8e0d0", background: "#f5f3ef", "--tw-ring-color": "rgba(212,175,55,0.3)" }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-[#9a8c7a]">{commentText.length}/1000</span>
                    <button type="submit" disabled={submittingComment || !commentText.trim()}
                            className="px-5 py-2 text-white text-sm rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50"
                            style={{ background: "#1a1a2e" }}>
                      {submittingComment ? "Posting…" : "Post Comment"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-white border border-[#e8e0d0] rounded-xl p-8 mb-6 text-center">
              <p className="text-sm text-[#9a8c7a] mb-4">Sign in to join the discussion</p>
              <Link to="/login" className="px-6 py-2.5 text-white text-sm rounded-lg font-medium hover:opacity-90 transition-all"
                    style={{ background: "#1a1a2e" }}>
                Sign In
              </Link>
            </div>
          )}

          {/* Comments list */}
          {loadingComments ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white border border-[#e8e0d0] rounded-xl p-5 animate-pulse">
                  <div className="flex gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-full bg-gray-100 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 bg-white border border-[#e8e0d0] rounded-xl">
              <p className="text-[#9a8c7a] text-sm font-medium">No comments yet</p>
              <p className="text-[#9a8c7a] text-xs mt-1">Be the first to share your thoughts.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#e8e0d0] rounded-xl px-5">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} postId={postId} onDeleted={handleCommentDeleted} />
              ))}
            </div>
          )}

          {commentsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button onClick={() => fetchComments(commentsPage - 1)} disabled={commentsPage === 1}
                      className="px-4 py-2 rounded-lg text-sm border bg-white text-[#6b5c4a]
                                 hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-40 transition-all"
                      style={{ borderColor: "#e8e0d0" }}>
                Previous
              </button>
              <span className="text-xs text-[#9a8c7a] px-2">{commentsPage} / {commentsTotalPages}</span>
              <button onClick={() => fetchComments(commentsPage + 1)} disabled={commentsPage === commentsTotalPages}
                      className="px-4 py-2 rounded-lg text-sm border bg-white text-[#6b5c4a]
                                 hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-40 transition-all"
                      style={{ borderColor: "#e8e0d0" }}>
                Next
              </button>
            </div>
          )}
        </section>
      </main>

      <style>{`
        .prose-news p { margin: 0 0 1.4em; }
        .prose-news p:first-child::first-letter {
          float: left;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 4.2em;
          line-height: 0.75;
          padding-right: 0.08em;
          padding-top: 0.06em;
          color: #1a1a2e;
          font-weight: 700;
        }
        .prose-news ul { list-style: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
        .prose-news ol { list-style: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
        .prose-news li { margin: 0.35rem 0; }
        .prose-news hr[data-divider] { border: none; border-top: 2px solid #e8e0d0; margin: 2em auto; width: 40%; display: block; }
        .prose-news b, .prose-news strong { font-weight: 700; color: #1a1a2e; }
        .prose-news i, .prose-news em { font-style: italic; color: #3d3530; }
        .prose-news u { text-decoration: underline; }
        .prose-news a { color: #d4af37; text-decoration: underline; }
        .prose-news blockquote { border-left: 3px solid #d4af37; margin: 1.5em 0; padding: 0.75em 1.25em; font-style: italic; color: #4a3f35; background: rgba(212,175,55,0.04); border-radius: 0 8px 8px 0; }
        .prose-news img[data-inline-image] { max-width: 100%; height: auto; display: block; margin: 1.5em auto; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .prose-news [data-editor-styles] { display: none; }
        .prose-news [data-upload-placeholder] { display: none; }
      `}</style>
    </div>
  );
}

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}