import { useState, useEffect, useRef, Fragment } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";

// ── Markdown renderer (bold + italic only) ───────────────────────────────────
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
        parts.push(<strong key={`${lineKey}-b${i++}`} className="font-semibold text-ink-primary">{boldMatch[1]}</strong>);
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
    <div className="text-gray-700 leading-8 text-[1.05rem] whitespace-pre-wrap font-sans">
      {lines.map((line, idx) => (
        <Fragment key={idx}>
          {parseLine(line, idx)}
          {idx < lines.length - 1 && "\n"}
        </Fragment>
      ))}
    </div>
  );
}

// ── @mention highlighter ──────────────────────────────────────────────────────
// Splits on @word tokens and renders them in blue
function MentionText({ content }) {
  const parts = content.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^@\w+$/.test(part)
          ? <span key={i} className="text-blue-500 font-semibold">{part}</span>
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
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex gap-3 py-2.5 group/reply">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ink-primary to-ink-primary/70 flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold">
        {reply.author?.username?.charAt(0).toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-ink-primary">{reply.author?.username}</span>
          <span className="text-xs text-gray-400">
            {new Date(reply.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        {/* @mentions render in blue */}
        <p className="text-sm text-gray-600 leading-relaxed">
          <MentionText content={reply.content} />
        </p>
        {user && (
          <button
            onClick={() => onReply({ username: reply.author?.username, userId: reply.authorId })}
            className="mt-1 text-xs text-gray-400 hover:text-ink-primary font-medium transition-colors"
          >
            Reply
          </button>
        )}
      </div>
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-300 hover:text-red-500 flex-shrink-0 self-start mt-0.5
                     disabled:opacity-50 transition-colors opacity-0 group-hover/reply:opacity-100"
        >
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
  // null = replying to the comment; { username, userId } = replying to a specific reply
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replyCount, setReplyCount] = useState(comment._count?.replies ?? 0);
  const inputRef = useRef(null);

  async function loadReplies() {
    setLoadingReplies(true);
    try {
      const res = await fetch(
        `${API_URL}/blog/${postId}/comments/${comment.id}/replies?limit=50`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setReplies(data.replies || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReplies(false);
    }
  }

  function toggleReplies() {
    if (!showReplies && replies.length === 0) loadReplies();
    setShowReplies((v) => !v);
  }

  // Clicking "Reply" on a ReplyItem — open form and set the target
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
    setShowReplyForm((v) => !v);
  }

  function closeReplyForm() {
    setShowReplyForm(false);
    setReplyingTo(null);
    setReplyText("");
  }

  async function submitReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      // Automatically prepend @username when replying to a reply
      const content = replyingTo
        ? `@${replyingTo.username} ${replyText.trim()}`
        : replyText.trim();

      const body = { content };
      if (replyingTo) body.mentionedUserId = replyingTo.userId;

      const res = await fetch(
        `${API_URL}/blog/${postId}/comments/${comment.id}/replies`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setReplies((prev) => [...prev, data.reply]);
        setReplyCount((c) => c + 1);
        setReplyText("");
        setReplyingTo(null);
        setShowReplyForm(false);
        setShowReplies(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}/comments/${comment.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) onDeleted(comment.id);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  function handleReplyDeleted(replyId) {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    setReplyCount((c) => Math.max(0, c - 1));
  }

  return (
    <div className="group bg-white rounded-2xl p-5 shadow-soft hover:shadow-soft-lg transition-shadow duration-200">
      <div className="flex gap-3.5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ink-primary to-ink-primary/70 flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
          {comment.author?.username?.charAt(0).toUpperCase() || "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold text-ink-primary">{comment.author?.username}</span>
            <span className="text-xs text-gray-400">
              {new Date(comment.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{comment.content}</p>

          {/* Actions row */}
          <div className="flex items-center gap-4 mt-3">
            {replyCount > 0 && (
              <button
                onClick={toggleReplies}
                className="flex items-center gap-1 text-xs text-ink-gold hover:text-amber-600 font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                {showReplies ? "Hide replies" : `${replyCount} repl${replyCount === 1 ? "y" : "ies"}`}
              </button>
            )}
            {user && (
              <button
                onClick={openCommentReplyForm}
                className="text-xs text-gray-400 hover:text-ink-primary transition-colors font-medium"
              >
                Reply
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-300 hover:text-red-500 transition-colors ml-auto disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <form onSubmit={submitReply} className="mt-3 space-y-2">
              {/* "Replying to @username" chip — only shown when replying to a reply */}
              {replyingTo && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Replying to
                  <span className="font-semibold text-blue-500">@{replyingTo.username}</span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="ml-0.5 text-gray-300 hover:text-gray-500 transition-colors leading-none text-sm"
                    aria-label="Clear mention"
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply…"
                  maxLength={500}
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none
                             focus:ring-2 focus:ring-ink-primary/20 bg-ink-cream"
                />
                <button
                  type="submit"
                  disabled={submitting || !replyText.trim()}
                  className="px-4 py-2 bg-ink-primary text-white text-sm rounded-xl font-medium
                             hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {submitting ? "…" : "Post"}
                </button>
                <button
                  type="button"
                  onClick={closeReplyForm}
                  className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Replies — all flat, one visual level */}
          {showReplies && (
            <div className="mt-3 pl-4 border-l-2 border-ink-gold/20 space-y-0.5">
              {loadingReplies ? (
                <div className="text-xs text-gray-400 py-2">Loading replies…</div>
              ) : (
                replies.map((reply) => (
                  <ReplyItem
                    key={reply.id}
                    reply={reply}
                    postId={postId}
                    commentId={comment.id}
                    onDeleted={handleReplyDeleted}
                    onReply={handleReplyToReply}
                  />
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
    const shareData = {
      title: title || "Check out this post on Inkwell",
      text: title ? `"${title}" — read it on Inkwell` : "Read this on Inkwell",
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled or share failed — silently ignore
      }
      return;
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2.5 px-8 py-3 rounded-2xl text-sm font-semibold
                 bg-white text-gray-500 border-2 border-gray-200 hover:border-ink-primary
                 hover:text-ink-primary transition-all duration-200 shadow-soft hover:shadow-soft-lg"
    >
      {copied ? (
        <>
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-500">Link copied!</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="min-h-screen bg-ink-cream animate-pulse">
      <div className="w-full h-[28rem] bg-gray-200" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl shadow-soft-lg p-8 sm:p-12 space-y-5">
          <div className="h-3 w-24 bg-gray-200 rounded-full" />
          <div className="h-9 w-3/4 bg-gray-200 rounded" />
          <div className="h-9 w-1/2 bg-gray-200 rounded" />
          <div className="space-y-2.5 pt-4">
            {[1,2,3,4,5,6].map((i) => <div key={i} className={`h-4 bg-gray-100 rounded ${i % 3 === 0 ? "w-4/5" : "w-full"}`} />)}
          </div>
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

  useEffect(() => {
    fetchPost();
    fetchComments(1);
  }, [postId]);

  async function fetchPost() {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}`, { credentials: "include" });
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPost(data.post);
      setLikesCount(data.post._count?.likes ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchComments(p) {
    setLoadingComments(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}/comments?page=${p}&limit=10`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setCommentsTotalPages(data.totalPages || 1);
        setCommentsPage(p);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleLike() {
    if (!user) { navigate("/login"); return; }
    setLikePending(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount(data.likesCount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLikePending(false);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/blog/${postId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setCommentText("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingComment(false);
    }
  }

  function handleCommentDeleted(id) {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  const date = post
    ? new Date(post.createdAt).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    : "";

  if (isLoading) return <><Header /><PostSkeleton /></>;

  if (notFound) {
    return (
      <div className="min-h-screen bg-ink-cream">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-28 text-center">
          <p className="text-7xl font-serif text-gray-200 mb-4">404</p>
          <h1 className="text-2xl font-serif text-ink-primary mb-3">Post not found</h1>
          <Link to="/blog" className="text-ink-gold hover:underline text-sm">← Back to Blog</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />
      {post && (
        <AppMetaTags
          title={post.title ? `${post.title} – Inkwell Blog` : "Inkwell Blog"}
          description={post.content.slice(0, 160)}
        />
      )}

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      {post.mediaUrl ? (
        <div className="relative w-full h-[32rem] overflow-hidden">
          <img src={post.mediaUrl} alt={post.title || "Blog post"} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute top-6 left-0 right-0 max-w-3xl mx-auto px-4 sm:px-6">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-lg backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All posts
            </Link>
          </div>
          {post.title && (
            <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto px-4 sm:px-6 pb-10">
              <p className="text-xs text-ink-gold font-bold uppercase tracking-widest mb-3">Inkwell Blog</p>
              <h1 className="text-3xl sm:text-5xl font-serif text-white leading-tight drop-shadow-lg">{post.title}</h1>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-ink-primary relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-ink-gold/10 pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 relative">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors mb-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All posts
            </Link>
            <p className="text-xs text-ink-gold font-bold uppercase tracking-widest mb-3">Inkwell Blog</p>
            {post.title && (
              <h1 className="text-3xl sm:text-5xl font-serif text-white leading-tight">{post.title}</h1>
            )}
          </div>
        </div>
      )}

      {/* ── Article card ────────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <article className={`bg-white rounded-3xl shadow-soft-lg overflow-hidden ${post.mediaUrl ? "-mt-10 relative z-10" : "mt-0 rounded-t-none"}`}>
          {!post.mediaUrl && <div className="px-8 sm:px-12 pt-8" />}

          <div className="px-6 sm:px-12 pt-8 sm:pt-10 pb-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs text-ink-gold font-bold uppercase tracking-widest">{date}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="text-xs text-gray-400">{post._count?.comments ?? 0} comments</span>
            </div>
            {post.title && !post.mediaUrl && (
              <h1 className="text-3xl sm:text-4xl font-serif text-ink-primary leading-tight mb-8">{post.title}</h1>
            )}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-0.5 bg-ink-gold rounded-full" />
              <div className="w-2 h-2 rounded-full bg-ink-gold/40" />
            </div>
            <FormattedContent text={post.content} />
            {post.link && (
              <a
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 border-2 border-ink-gold
                           text-ink-gold rounded-xl text-sm font-semibold hover:bg-ink-gold hover:text-white
                           transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Read full article
              </a>
            )}

            {/* ── Like + Share section ──────────────────────────────────────── */}
            <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col items-center gap-3">
              <p className="text-sm text-gray-400">Enjoyed this post?</p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <button
                  onClick={handleLike}
                  disabled={likePending}
                  className={`flex items-center gap-2.5 px-8 py-3 rounded-2xl text-sm font-semibold
                              transition-all duration-200 disabled:opacity-60 shadow-soft hover:shadow-soft-lg
                              ${liked
                                ? "bg-red-50 text-red-500 border-2 border-red-200"
                                : "bg-white text-gray-500 border-2 border-gray-200 hover:border-red-200 hover:text-red-400"
                              }`}
                >
                  <svg
                    className={`w-5 h-5 transition-transform duration-200 ${liked ? "scale-110" : ""}`}
                    fill={liked ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {liked ? "Liked" : "Like this post"} · {likesCount}
                </button>
                <ShareButton title={post.title} />
              </div>
            </div>
          </div>
        </article>

        {/* ── Comments ─────────────────────────────────────────────────────── */}
        <section className="mt-10">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-serif text-ink-primary">Discussion</h2>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400">{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Comment form */}
          {user ? (
            <form onSubmit={submitComment} className="bg-white rounded-2xl shadow-soft p-5 mb-6">
              <div className="flex gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ink-primary to-ink-primary/70 flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                  {user.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts…"
                    rows={3}
                    maxLength={1000}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none
                               focus:ring-2 focus:ring-ink-primary/20 bg-ink-cream resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{commentText.length}/1000</span>
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="px-5 py-2 bg-ink-primary text-white text-sm rounded-xl font-medium
                                 hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {submittingComment ? "Posting…" : "Post Comment"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl shadow-soft p-8 mb-6 text-center">
              <div className="w-12 h-12 rounded-full bg-ink-cream flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 mb-4">Sign in to join the discussion</p>
              <Link
                to="/login"
                className="px-6 py-2.5 bg-ink-primary text-white text-sm rounded-xl font-medium hover:opacity-90 transition-all"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Comments list */}
          {loadingComments ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                  <div className="flex gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-full bg-gray-100 rounded" />
                      <div className="h-3 w-4/5 bg-gray-100 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl">
              <div className="text-3xl mb-3">💬</div>
              <p className="text-gray-400 text-sm font-medium">No comments yet</p>
              <p className="text-gray-400 text-xs mt-1">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  postId={postId}
                  onDeleted={handleCommentDeleted}
                />
              ))}
            </div>
          )}

          {/* Comments pagination */}
          {commentsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => fetchComments(commentsPage - 1)}
                disabled={commentsPage === 1}
                className="px-4 py-2 rounded-xl text-sm border border-gray-200 bg-white text-ink-gray
                           hover:border-ink-primary hover:text-ink-primary disabled:opacity-40 transition-all"
              >
                Previous
              </button>
              <span className="text-xs text-gray-400 px-2">{commentsPage} / {commentsTotalPages}</span>
              <button
                onClick={() => fetchComments(commentsPage + 1)}
                disabled={commentsPage === commentsTotalPages}
                className="px-4 py-2 rounded-xl text-sm border border-gray-200 bg-white text-ink-gray
                           hover:border-ink-primary hover:text-ink-primary disabled:opacity-40 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
