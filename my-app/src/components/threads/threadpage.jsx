// src/components/threads/threadpage.jsx
// Single thread page — beautiful, conversational, easy to engage with

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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

function Avatar({ user, size = 32 }) {
  if (!user) return (
    <div className="rounded-full bg-[#e8e0d0] flex items-center justify-center flex-shrink-0 text-[#9a8c7a] font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>?</div>
  );
  return user.avatar
    ? <img src={user.avatar} alt={user.username} className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    : (
      <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, background: "#1a1a2e", fontSize: size * 0.38 }}>
        {user.username?.charAt(0).toUpperCase()}
      </div>
    );
}

// ─── Like button ─────────────────────────────────────────────────────────────

function LikeButton({ count, liked, onToggle, disabled, small = false }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-1 transition-all rounded-md px-2 py-1 ${
        liked
          ? "text-[#d4af37]"
          : "text-[#9a8c7a] hover:text-[#d4af37]"
      } disabled:opacity-40`}
    >
      <svg
        className={small ? "w-3.5 h-3.5" : "w-4 h-4"}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={liked ? 0 : 2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      <span className={`tabular-nums font-medium ${small ? "text-[10px]" : "text-[11px]"}`}>{count}</span>
    </button>
  );
}

// ─── Compose box ─────────────────────────────────────────────────────────────
// The "white card" feel — elevated, clearly inviting input

function ComposeBox({ placeholder = "Write something…", onSubmit, onCancel, autoFocus = false, compact = false }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      // scroll into view gently
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [autoFocus]);

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSubmit(trimmed);
      setValue("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-xl border border-[#e8e0d0] bg-white shadow-sm overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(26,26,46,0.07)" }}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        className="w-full px-4 pt-3 pb-2 text-[13px] text-[#1a1a2e] placeholder-[#c8b89a] focus:outline-none resize-none bg-white leading-relaxed"
      />
      <div className="flex items-center justify-between px-4 pb-3 pt-1 bg-white border-t border-[#f4f1ec]">
        <span className="text-[10px] text-[#c8b89a]">Ctrl+Enter to post</span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || saving}
            className="px-4 py-1.5 bg-[#1a1a2e] text-white text-[12px] font-semibold rounded-lg hover:bg-[#252545] transition-colors disabled:opacity-40"
          >
            {saving ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reply row ────────────────────────────────────────────────────────────────

function ReplyRow({ reply, user, commentId, threadId, onLikeToggled, onReplyTo }) {
  const [liked, setLiked]       = useState(reply.likedByMe ?? false);
  const [likes, setLikes]       = useState(reply._count?.likes ?? 0);
  const [toggling, setToggling] = useState(false);

  async function toggleLike() {
    if (!user || toggling) return;
    setToggling(true);
    try {
      const r = await fetch(
        `${API_URL}/threads/${threadId}/comments/${commentId}/replies/${reply.id}/like`,
        { method: "POST", credentials: "include" }
      );
      if (r.ok) {
        const d = await r.json();
        setLiked(d.liked);
        setLikes(d.likesCount);
        onLikeToggled?.();
      }
    } finally { setToggling(false); }
  }

  return (
    <div className="flex gap-2.5">
      <Avatar user={reply.author} size={24} />
      <div className="flex-1 min-w-0">
        <div className="bg-[#faf7f2] rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[12px] font-semibold text-[#1a1a2e]">
              {reply.author?.username ?? "Deleted user"}
            </span>
            <span className="text-[10px] text-[#c8b89a]">{timeAgo(reply.createdAt)}</span>
          </div>
          <p className="text-[13px] text-[#4a3f35] leading-relaxed">{reply.content}</p>
        </div>
        <div className="flex items-center gap-1 mt-0.5 pl-1">
          <LikeButton count={likes} liked={liked} onToggle={toggleLike} disabled={!user || toggling} small />
          {user && (
            <button
              onClick={() => onReplyTo(reply.author?.username)}
              className="text-[10px] text-[#9a8c7a] hover:text-[#1a1a2e] font-medium px-2 py-1 transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comment card ─────────────────────────────────────────────────────────────

function CommentCard({ comment, user, threadId, isAdmin }) {
  const [liked, setLiked]           = useState(comment.likedByMe ?? false);
  const [likes, setLikes]           = useState(comment._count?.likes ?? 0);
  const [toggling, setToggling]     = useState(false);

  const [replies, setReplies]       = useState([]);
  const [repliesLoaded, setLoaded]  = useState(false);
  const [loadingReplies, setLR]     = useState(false);

  const [showCompose, setShowCompose] = useState(false);
  const [replyPrefix, setReplyPrefix] = useState("");

  const replyCount = comment._count?.replies ?? 0;

  async function toggleLike() {
    if (!user || toggling) return;
    setToggling(true);
    try {
      const r = await fetch(
        `${API_URL}/threads/${threadId}/comments/${comment.id}/like`,
        { method: "POST", credentials: "include" }
      );
      if (r.ok) {
        const d = await r.json();
        setLiked(d.liked);
        setLikes(d.likesCount);
      }
    } finally { setToggling(false); }
  }

  async function loadReplies() {
    if (repliesLoaded) { setLoaded(false); setReplies([]); return; }
    setLR(true);
    try {
      const r = await fetch(
        `${API_URL}/threads/${threadId}/comments/${comment.id}/replies?limit=50`
      );
      if (r.ok) {
        const d = await r.json();
        setReplies(d.replies ?? []);
        setLoaded(true);
      }
    } finally { setLR(false); }
  }

  async function submitReply(content) {
    const full = replyPrefix ? `@${replyPrefix} ${content}` : content;
    const r = await fetch(
      `${API_URL}/threads/${threadId}/comments/${comment.id}/replies`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: full }),
      }
    );
    if (!r.ok) throw new Error("Failed to post reply");
    const d = await r.json();
    setReplies(prev => [...prev, d.reply]);
    if (!repliesLoaded) setLoaded(true);
    setShowCompose(false);
    setReplyPrefix("");
  }

  function openReply(mentionUsername) {
    setReplyPrefix(mentionUsername ?? "");
    setShowCompose(true);
  }

  async function deleteComment() {
    if (!window.confirm("Delete this comment?")) return;
    await fetch(`${API_URL}/threads/${threadId}/comments/${comment.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    // Parent should refresh — for simplicity we hide
    window.location.reload();
  }

  const canDelete = user && (user.id === comment.authorId || isAdmin);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <Avatar user={comment.author} size={36} />
        {/* Vertical thread line if there are replies */}
        {(repliesLoaded && replies.length > 0) && (
          <div className="w-px flex-1 mt-2 bg-[#e8e0d0]" style={{ minHeight: 20 }} />
        )}
      </div>

      <div className="flex-1 min-w-0 pb-4">
        {/* Comment bubble */}
        <div className="bg-white rounded-xl border border-[#e8e0d0] px-4 py-3"
          style={{ boxShadow: "0 1px 4px rgba(26,26,46,0.05)" }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-[13px] font-bold text-[#1a1a2e]">
                {comment.author?.username ?? "Deleted user"}
              </span>
              <span className="text-[10px] text-[#c8b89a] ml-2">{timeAgo(comment.createdAt)}</span>
            </div>
            {canDelete && (
              <button
                onClick={deleteComment}
                className="text-[10px] text-[#c8b89a] hover:text-[#c0392b] transition-colors flex-shrink-0"
                title="Delete comment"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-[14px] text-[#2d2416] leading-relaxed">{comment.content}</p>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-1 mt-1.5 pl-1">
          <LikeButton count={likes} liked={liked} onToggle={toggleLike} disabled={!user || toggling} small />

          {replyCount > 0 && (
            <button
              onClick={loadReplies}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#9a8c7a] hover:text-[#1a1a2e] font-medium transition-colors"
            >
              {loadingReplies ? (
                <span>Loading…</span>
              ) : repliesLoaded ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/>
                  </svg>
                  Hide {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </>
              )}
            </button>
          )}

          {user && (
            <button
              onClick={() => openReply(null)}
              className="px-2 py-1 text-[10px] text-[#9a8c7a] hover:text-[#1a1a2e] font-medium transition-colors"
            >
              Reply
            </button>
          )}
        </div>

        {/* Replies list */}
        {repliesLoaded && replies.length > 0 && (
          <div className="mt-2 ml-2 space-y-3 pl-3 border-l-2 border-[#f0ebe3]">
            {replies.map(reply => (
              <ReplyRow
                key={reply.id}
                reply={reply}
                user={user}
                commentId={comment.id}
                threadId={threadId}
                onReplyTo={openReply}
              />
            ))}
          </div>
        )}

        {/* Compose reply */}
        {showCompose && user && (
          <div className="mt-3 ml-2">
            <ComposeBox
              placeholder={replyPrefix ? `Replying to @${replyPrefix}…` : "Write a reply…"}
              onSubmit={submitReply}
              onCancel={() => { setShowCompose(false); setReplyPrefix(""); }}
              autoFocus
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function ThreadPage() {
  const { threadId }         = useParams();
  const { user }             = useAuth();
  const navigate             = useNavigate();

  const [thread, setThread]         = useState(null);
  const [comments, setComments]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [threadLiked, setTL]        = useState(false);
  const [threadLikes, setTLikes]    = useState(0);
  const [toggling, setToggling]     = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  const load = useCallback(async () => {
    try {
      const [tRes, cRes] = await Promise.all([
        fetch(`${API_URL}/threads/${threadId}`),
        fetch(`${API_URL}/threads/${threadId}/comments?limit=100`),
      ]);
      if (!tRes.ok) { navigate("/threads"); return; }
      const tData = await tRes.json();
      const cData = cRes.ok ? await cRes.json() : { comments: [] };
      setThread(tData.thread);
      setTLikes(tData.thread._count?.likes ?? 0);
      setComments(cData.comments ?? []);
    } catch {}
  }, [threadId, navigate]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function toggleThreadLike() {
    if (!user || toggling) return;
    setToggling(true);
    try {
      const r = await fetch(`${API_URL}/threads/${threadId}/like`, {
        method: "POST", credentials: "include"
      });
      if (r.ok) {
        const d = await r.json();
        setTL(d.liked);
        setTLikes(d.likesCount);
      }
    } finally { setToggling(false); }
  }

  async function submitComment(content) {
    const r = await fetch(`${API_URL}/threads/${threadId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!r.ok) throw new Error("Failed to post");
    const d = await r.json();
    setComments(prev => [...prev, d.comment]);
    setShowCompose(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ef]">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 bg-white rounded-xl border border-[#e8e0d0] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!thread) return null;

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Header />

      {/* ── Hero strip ── */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #212140 100%)" }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-10">

          {/* Breadcrumb */}
          <Link
            to="/threads"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/40 hover:text-[#d4af37] transition-colors mb-5"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
            </svg>
            All threads
          </Link>

          {/* Thread label */}
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]/70 mb-2">
            {thread.isPinned ? "Pinned thread" : "Thread"}
          </p>

          {/* Title */}
          <h1 className="font-serif text-white text-2xl sm:text-3xl font-bold leading-tight mb-4">
            {thread.title}
          </h1>

          {/* Author + date */}
          <div className="flex items-center gap-2.5 mb-5">
            <Avatar user={thread.author} size={28} />
            <div>
              <span className="text-[12px] font-semibold text-white/80">
                {thread.author?.username ?? "Admin"}
              </span>
              <span className="text-[11px] text-white/35 ml-2">{timeAgo(thread.createdAt)}</span>
            </div>
          </div>

          {/* Like row */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleThreadLike}
              disabled={!user || toggling}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all border ${
                threadLiked
                  ? "bg-[#d4af37] text-[#1a1a2e] border-[#d4af37]"
                  : "border-white/20 text-white/60 hover:border-[#d4af37] hover:text-[#d4af37]"
              } disabled:opacity-40`}
            >
              <svg className="w-4 h-4" fill={threadLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={threadLiked ? 0 : 2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {threadLikes} {threadLikes === 1 ? "like" : "likes"}
            </button>
            <span className="text-[11px] text-white/30">
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content card ── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-4 mb-6">
        <div
          className="bg-white rounded-2xl border border-[#e8e0d0] px-6 py-5"
          style={{ boxShadow: "0 4px 20px rgba(26,26,46,0.08)" }}
        >
          {thread.mediaUrl && (
            <img
              src={thread.mediaUrl}
              alt=""
              className="w-full rounded-xl mb-5 object-cover max-h-72"
            />
          )}
          <p className="text-[15px] text-[#2d2416] leading-relaxed whitespace-pre-wrap">
            {thread.context}
          </p>

          {thread.link && (
            <a
              href={thread.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-[12px] font-semibold text-[#1a5fb4] hover:underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              {thread.link}
            </a>
          )}
        </div>
      </div>

      {/* ── Comments section ── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">

        {/* Section header + post button */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-[#1a1a2e] text-base font-bold">
            {comments.length > 0
              ? `${comments.length} ${comments.length === 1 ? "Comment" : "Comments"}`
              : "Be the first to comment"}
          </h2>
          {user && !showCompose && (
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#d4af37] text-[#1a1a2e] text-[12px] font-bold rounded-xl hover:bg-[#c9a42d] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              Leave a comment
            </button>
          )}
          {!user && (
            <Link
              to="/login"
              className="text-[12px] font-semibold text-[#1a5fb4] hover:underline"
            >
              Sign in to comment
            </Link>
          )}
        </div>

        {/* Compose box — appears when button clicked */}
        {showCompose && user && (
          <div className="mb-6">
            <ComposeBox
              placeholder="What do you think? Share your thoughts…"
              onSubmit={submitComment}
              onCancel={() => setShowCompose(false)}
              autoFocus
            />
          </div>
        )}

        {/* Empty state */}
        {comments.length === 0 && (
          <div className="bg-white border border-[#e8e0d0] rounded-xl py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-[#faf7f2] flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-[#c8b89a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p className="text-[13px] text-[#9a8c7a]">No comments yet.</p>
            {user && (
              <button
                onClick={() => setShowCompose(true)}
                className="mt-3 text-[12px] font-semibold text-[#1a5fb4] hover:underline"
              >
                Start the conversation
              </button>
            )}
          </div>
        )}

        {/* Comment list */}
        {comments.length > 0 && (
          <div className="space-y-1">
            {comments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                user={user}
                threadId={Number(threadId)}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA for guests */}
        {!user && comments.length > 0 && (
          <div
            className="mt-8 rounded-xl border border-[#e8e0d0] bg-white px-6 py-5 text-center"
            style={{ borderTop: "3px solid #d4af37" }}
          >
            <p className="font-serif text-[#1a1a2e] text-base font-bold mb-1">Join the conversation</p>
            <p className="text-[12px] text-[#9a8c7a] mb-4">Sign up to comment, reply, and connect with other writers.</p>
            <div className="flex gap-2 justify-center">
              <Link to="/signup"
                className="px-5 py-2 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-colors">
                Create account
              </Link>
              <Link to="/login"
                className="px-5 py-2 border border-[#1a1a2e] text-[#1a1a2e] text-sm font-semibold rounded-lg hover:bg-[#1a1a2e] hover:text-white transition-colors">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}