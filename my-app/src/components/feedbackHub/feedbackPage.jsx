// src/components/feedback/FeedbackPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "../profile/header";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TIER_LABELS = {
  TIER_1000: "≤ 1,000 words",
  TIER_2000: "≤ 2,000 words",
  TIER_3000: "≤ 3,000 words",
  TIER_4000: "≤ 4,000 words",
  TIER_5000: "≤ 5,000 words",
};

const DRAFT_LABELS = {
  ROUGH:      "Rough draft",
  POLISHING:  "Polishing",
  FINAL_EDIT: "Final edit",
};

const TIER_META = {
  Bronze:   { color: "#C87533", bg: "#fdf6ef" },
  Silver:   { color: "#7a8290", bg: "#f4f5f6" },
  Gold:     { color: "#b8860b", bg: "#fdf9ed" },
  Platinum: { color: "#6558d4", bg: "#f2f0fd" },
  Diamond:  { color: "#c0392b", bg: "#fdf1f0" },
};

const CRITIQUE_PLACEHOLDER = `
[THE HOOK & PACING] 
Did the opening grab you? Mention if any parts felt too slow or fast (e.g., the 400-word breakfast rule!).

[CLARITY & IMAGERY] 
Was the action easy to follow? Note if any imagery felt confusing or if the "theme" of the scene shifted too much.

[STORY THEORY (The Heart)] 
Does the protagonist's internal struggle come through? Is there a clear "point" to this scene?

[WHAT TO KEEP] 
What was the most vivid or strongest part of the writing? (Be specific!)

[ONE SUGGESTION] 
If you could change one thing to make the next chapter hit harder, what would it be?`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getTier(rep) {
  if (rep >= 1500) return { name: "Diamond", gem: "D", color: "#c0392b" };
  if (rep >= 700)  return { name: "Platinum", gem: "P", color: "#6558d4" };
  if (rep >= 300)  return { name: "Gold",     gem: "G", color: "#b8860b" };
  if (rep >= 100)  return { name: "Silver",   gem: "S", color: "#7a8290" };
  return              { name: "Bronze",   gem: "B", color: "#C87533" };
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function renderInline(text, keyPrefix) {
  if (!text) return null;
  // Split on **bold** and *italic* markers
  const parts = text.split(/(\*\*(?:[^*]|\*(?!\*))+\*\*|\*(?:[^*])+\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*(.+)\*\*$/.test(part))
      return <strong key={`${keyPrefix}-b${i}`}>{part.slice(2, -2)}</strong>;
    if (/^\*([^*]+)\*$/.test(part))
      return <em key={`${keyPrefix}-i${i}`}>{part.slice(1, -1)}</em>;
    return <span key={`${keyPrefix}-s${i}`}>{part}</span>;
  });
}

function renderMarkdown(text) {
  if (!text) return null;

  // Normalise line endings, split into blocks on blank lines
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return blocks.map((block, bi) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    const lines = trimmed.split("\n");

    // ### Heading  (standard markdown h3)
    if (/^#{1,3}\s+/.test(lines[0])) {
      const headingText = lines[0].replace(/^#{1,3}\s+/, "").trim();
      const rest = lines.slice(1).join("\n").trim();
      return (
        <div key={bi} className="mt-5 first:mt-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-1.5">
            {renderInline(headingText, `${bi}-h`)}
          </p>
          {rest && (
            <p className="text-sm text-[#4a4a4a] leading-[1.85]">
              {rest.split("\n").map((line, li, arr) => (
                <span key={li}>
                  {renderInline(line.replace(/^\s*[-*]\s*/, ""), `${bi}-rl${li}`)}
                  {li < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          )}
        </div>
      );
    }

    // [SECTION HEADING]  (custom bracket style used in the critique template)
    const bracketMatch = trimmed.match(/^\[([^\]]+)\]([\s\S]*)/);
    if (bracketMatch) {
      const heading = bracketMatch[1].trim();
      const rest    = bracketMatch[2].trim();
      return (
        <div key={bi} className="mt-5 first:mt-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-1.5">
            {heading}
          </p>
          {rest && (
            <p className="text-sm text-[#4a4a4a] leading-[1.85]">
              {rest.split("\n").map((line, li, arr) => (
                <span key={li}>
                  {renderInline(line, `${bi}-bl${li}`)}
                  {li < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          )}
        </div>
      );
    }

    // Bullet list lines starting with - or *
    const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
    if (isList) {
      return (
        <ul key={bi} className="mt-4 first:mt-0 space-y-1 pl-4">
          {lines.map((line, li) => (
            <li key={li} className="text-sm text-[#4a4a4a] leading-[1.85] list-disc">
              {renderInline(line.replace(/^\s*[-*]\s+/, ""), `${bi}-li${li}`)}
            </li>
          ))}
        </ul>
      );
    }

    // --- horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      return <hr key={bi} className="my-4 border-[#e8e0d0]" />;
    }

    // Regular paragraph
    return (
      <p key={bi} className="text-sm text-[#4a4a4a] leading-[1.85] mt-4 first:mt-0">
        {lines.map((line, li) => (
          <span key={li}>
            {renderInline(line, `${bi}-p${li}`)}
            {li < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

// ─── AUTHOR CHIP ─────────────────────────────────────────────────────────────

function AuthorChip({ user, size = "md" }) {
  const rep  = user?.feedbackPoints?.reputation ?? 0;
  const tier = getTier(rep);
  const sz   = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-xs";

  return (
    <Link to={`/profile/${user?.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <div
        className={`${sz} rounded-full bg-[#2d3748] flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden`}
      >
        {user?.avatar
          ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
          : <span>{user?.username?.charAt(0).toUpperCase() ?? "?"}</span>
        }
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold text-[#2d3748] truncate ${size === "sm" ? "text-xs" : "text-sm"}`}>
            {user?.username ?? "Unknown"}
          </span>
          <span
            className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: tier.color, backgroundColor: TIER_META[tier.name]?.bg }}
          >
            {tier.gem}
          </span>
          {rep > 0 && (
            <span className="text-[11px] text-[#b8a898]">Rep {rep}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── THUMB UPVOTE BUTTON ──────────────────────────────────────────────────────

function ThumbUpButton({ count, upvoted, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={disabled ? "You cannot upvote your own critique" : upvoted ? "Remove upvote" : "Upvote this critique"}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
        upvoted
          ? "bg-[#2d3748] text-white border-[#2d3748]"
          : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#2d3748] hover:text-[#2d3748]"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {/* Thumbs up icon */}
      <svg className="w-3.5 h-3.5" fill={upvoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
      </svg>
      {count}
    </button>
  );
}

// ─── SMALL UPVOTE BUTTON (for paragraph comments) ────────────────────────────

function CommentUpvoteButton({ count, upvoted, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={disabled ? "You cannot upvote your own comment" : upvoted ? "Remove upvote" : "Upvote"}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-all ${
        upvoted
          ? "bg-[#2d3748] text-white border-[#2d3748]"
          : "bg-white text-[#9a8c7a] border-[#e8e0d0] hover:border-[#2d3748] hover:text-[#2d3748]"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <svg className="w-3 h-3" fill={upvoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
      </svg>
      {count}
    </button>
  );
}

// ─── PARAGRAPH COMMENT SIDEBAR ───────────────────────────────────────────────

function CommentSidebar({
  submissionId,
  paragraphIndex,
  paragraphPreview,
  comments,
  onClose,
  onNewComment,
  onUpvoteComment,
  onEditComment,
  onDeleteComment,
  isAuthor,
  user,
}) {
  const [replyOpen, setReplyOpen]       = useState(null); // commentId or `reply-${replyId}`
  const [replyText, setReplyText]       = useState("");
  const [replyingTo, setReplyingTo]     = useState(null); // { username } for @mention prefix
  const [commentText, setCommentText]   = useState("");
  const [posting, setPosting]           = useState(false);
  const [replyPosting, setReplyPosting] = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [editText, setEditText]         = useState("");
  const [editSaving, setEditSaving]     = useState(false);
  const [deletingId, setDeletingId]     = useState(null);

  function openReply(commentId, mention = null) {
    if (replyOpen === commentId && !mention) { setReplyOpen(null); setReplyText(""); setReplyingTo(null); return; }
    setReplyOpen(commentId);
    setReplyingTo(mention);
    setReplyText(mention ? `@${mention.username} ` : "");
  }

  async function submitComment() {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/${submissionId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraphIndex, content: commentText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        onNewComment(data);
        setCommentText("");
      }
    } catch (e) {}
    setPosting(false);
  }

  async function submitReply(commentId) {
    if (!replyText.trim()) return;
    setReplyPosting(true);
    try {
      const res = await fetch(`${API_URL}/feedback/comments/${commentId}/replies`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        // Append reply locally so it shows instantly (no refresh needed)
        onNewComment({ type: "reply", commentId, reply: data });
        setReplyText("");
        setReplyOpen(null);
      }
    } catch (e) {}
    setReplyPosting(false);
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditText(c.content);
  }

  async function saveEdit(commentId) {
    if (!editText.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`${API_URL}/feedback/comments/${commentId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        onEditComment(commentId, data.content ?? editText.trim());
        setEditingId(null);
        setEditText("");
      }
    } catch (e) {}
    setEditSaving(false);
  }

  async function deleteComment(commentId) {
    if (!window.confirm("Delete this comment?")) return;
    setDeletingId(commentId);
    try {
      const res = await fetch(`${API_URL}/feedback/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        onDeleteComment(commentId);
      }
    } catch (e) {}
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0ebe3] flex-shrink-0">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-xs font-semibold text-[#9a8c7a] uppercase tracking-wide mb-0.5">
            Paragraph {paragraphIndex + 1}
          </p>
          <p className="text-xs text-[#6b5c4a] line-clamp-2 leading-relaxed italic">
            "{paragraphPreview}"
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-7 h-7 rounded-lg hover:bg-[#f4f1ec] flex items-center justify-center text-[#9a8c7a] hover:text-[#2d3748] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {comments.length === 0 && (
          <p className="text-sm text-[#b8a898] text-center py-8">
            No comments on this paragraph yet.
          </p>
        )}

        {comments.map((c) => {
          const upvoted   = (c.upvotes?.length ?? 0) > 0;
          const upvCount  = c._count?.upvotes ?? 0;
          const isOwn     = user?.id === c.author?.id;
          const isEditing = editingId === c.id;

          return (
            <div key={c.id} className="group">
              <div className="flex items-start gap-3">
                <Link to={`/profile/${c.author?.id}`} className="w-7 h-7 rounded-full bg-[#2d3748] flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 mt-0.5 overflow-hidden hover:opacity-80 transition-opacity">
                  {c.author?.avatar
                    ? <img src={c.author.avatar} alt={c.author.username} className="w-full h-full object-cover" />
                    : <span>{c.author?.username?.charAt(0).toUpperCase() ?? "?"}</span>
                  }
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/profile/${c.author?.id}`} className="text-xs font-semibold text-[#2d3748] hover:underline">{c.author?.username}</Link>
                      <span className="text-[10px] text-[#b8a898]">{timeAgo(c.createdAt)}</span>
                    </div>
                    {/* Edit / Delete — only for the comment author */}
                    {isOwn && !isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-[10px] text-[#9a8c7a] hover:text-[#2d3748] px-1.5 py-0.5 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteComment(c.id)}
                          disabled={deletingId === c.id}
                          className="text-[10px] text-[#c0392b] hover:text-[#9b1c1c] px-1.5 py-0.5 rounded transition-colors disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        autoFocus
                        className="w-full border border-[#2d3748] rounded-lg px-3 py-2 text-xs text-[#2d3748] bg-white focus:outline-none resize-none leading-relaxed"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => { setEditingId(null); setEditText(""); }}
                          className="text-[11px] text-[#9a8c7a] hover:text-[#2d3748] px-2 py-1 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(c.id)}
                          disabled={editSaving || !editText.trim()}
                          className="px-3 py-1 bg-[#2d3748] text-white text-[11px] font-semibold rounded-lg disabled:opacity-40 hover:opacity-90 transition-all"
                        >
                          {editSaving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#4a4a4a] leading-relaxed">{renderMarkdown(c.content)}</p>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-2 mt-2.5">
                      <CommentUpvoteButton
                        count={upvCount}
                        upvoted={upvoted}
                        onToggle={() => onUpvoteComment(c.id)}
                        disabled={!user || isOwn}
                      />
                      {user && (
                        <button
                          onClick={() => openReply(c.id)}
                          className="text-[11px] text-[#9a8c7a] hover:text-[#2d3748] transition-colors font-medium"
                        >
                          {replyOpen === c.id && !replyingTo ? "Cancel" : "Reply"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Replies */}
                  {c.replies?.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-[#f0ebe3] space-y-3">
                      {c.replies.map((r) => (
                        <div key={r.id} className="group/reply">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Link to={`/profile/${r.author?.id}`} className="w-5 h-5 rounded-full bg-[#6b5c4a] flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity">
                              {r.author?.avatar
                                ? <img src={r.author.avatar} alt={r.author.username} className="w-full h-full object-cover" />
                                : <span>{r.author?.username?.charAt(0).toUpperCase() ?? "?"}</span>
                              }
                            </Link>
                            <Link to={`/profile/${r.author?.id}`} className="text-[11px] font-semibold text-[#2d3748] hover:underline">{r.author?.username}</Link>
                            <span className="text-[10px] text-[#b8a898]">{timeAgo(r.createdAt)}</span>
                          </div>
                          <p className="text-xs text-[#6b5c4a] leading-relaxed pl-7">
                            {r.content?.split(/(@\w+)/g).map((seg, si) =>
                              /^@\w+$/.test(seg)
                                ? <span key={si} className="text-[#6558d4] font-semibold">{seg}</span>
                                : seg
                            )}
                          </p>
                          {user && (
                            <button
                              onClick={() => openReply(c.id, { username: r.author?.username })}
                              className="ml-7 mt-1 text-[10px] text-[#b8a898] hover:text-[#2d3748] transition-colors font-medium"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply box — shown for both direct replies and reply-to-reply */}
                  {replyOpen === c.id && (
                    <div className="mt-3 pl-3 border-l-2 border-[#e8e0d0]">
                      {replyingTo && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[10px] text-[#9a8c7a]">Replying to</span>
                          <span className="text-[10px] font-semibold text-[#6558d4]">@{replyingTo.username}</span>
                          <button
                            onClick={() => { setReplyingTo(null); setReplyText(""); }}
                            className="text-[10px] text-[#b8a898] hover:text-[#c0392b] ml-1 transition-colors"
                          >✕</button>
                        </div>
                      )}
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Write a reply..."}
                        className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2 text-xs text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] resize-none transition-all"
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <button
                          onClick={() => { setReplyOpen(null); setReplyText(""); setReplyingTo(null); }}
                          className="text-[11px] text-[#9a8c7a] hover:text-[#2d3748] transition-colors"
                        >Cancel</button>
                        <button
                          onClick={() => submitReply(c.id)}
                          disabled={replyPosting || !replyText.trim()}
                          className="px-3 py-1.5 bg-[#2d3748] text-white text-xs rounded-lg disabled:opacity-40 hover:opacity-90 transition-all font-medium"
                        >
                          {replyPosting ? "Posting..." : "Reply"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New comment input */}
      {user && (
        <div className="px-5 py-4 border-t border-[#f0ebe3] flex-shrink-0 bg-white">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            placeholder="Add a comment on this paragraph..."
            className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 resize-none transition-all"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={submitComment}
              disabled={posting || !commentText.trim()}
              className="px-4 py-2 bg-[#2d3748] text-white text-sm rounded-xl disabled:opacity-40 hover:opacity-90 transition-all font-semibold"
            >
              {posting ? "Posting..." : "Comment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CRITIQUE FORM ────────────────────────────────────────────────────────────

function CritiqueForm({ submissionId, onSuccess }) {
  const [feedback, setFeedback]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  const wordCount = countWords(feedback);

  async function handleSubmit() {
    if (wordCount < 150) {
      setError(`Critique must be at least 150 words (currently ${wordCount}).`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/${submissionId}/responses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generalFeedback: feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit critique.");
      onSuccess(data);
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(45,35,20,0.04)]">

      {/* AI / bad critique warning banner */}
      <div className="bg-[#fdf9ed] border-b border-[#f0d98a] px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-[#b8860b]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-[#b8860b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#92680a] mb-1">AI critiques and low-effort feedback are not permitted</p>
            <p className="text-xs text-[#7a5c1e] leading-relaxed">
              Submitting AI-generated critique that does not engage with the actual work is a violation of community standards.
              Poor critiques can be reported to the Inkwell admin — find them on the{" "}
              <a
                href="https://discord.gg/KsZjEjjsh"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2 hover:text-[#92680a] transition-colors"
              >
                Discord server
              </a>.
            </p>
            <ul className="mt-2 space-y-0.5 text-xs text-[#7a5c1e]">
              <li className="flex items-start gap-1.5">
                <span className="text-[#b8860b] mt-0.5 flex-shrink-0">—</span>
                Identifies strengths clearly and specifically
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#b8860b] mt-0.5 flex-shrink-0">—</span>
                Points out areas for improvement with concrete examples
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#b8860b] mt-0.5 flex-shrink-0">—</span>
                Engages genuinely with the actual writing — not a generic summary
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="font-serif text-xl text-[#2d3748] mb-1">Leave a critique</h3>
        <p className="text-sm text-[#9a8c7a] mb-7">
          Write your feedback (minimum 150 words). You will earn points for a complete critique.
        </p>

        {/* General feedback */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-[#2d3748]">Your critique</label>
            <span className={`text-xs font-semibold transition-colors ${
              wordCount >= 150 ? "text-[#6b8c6b]" : wordCount > 0 ? "text-[#b8860b]" : "text-[#b8a898]"
            }`}>
              {wordCount} / 150 words min
            </span>
          </div>
          <div className="h-1 bg-[#f0ebe3] rounded-full mb-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                wordCount >= 150 ? "bg-[#6b8c6b]" : "bg-[#d4af37]"
              }`}
              style={{ width: `${Math.min((wordCount / 150) * 100, 100)}%` }}
            />
          </div>
          <textarea
            value={feedback}
            onChange={(e) => { setFeedback(e.target.value); setError(""); }}
            rows={12}
            placeholder={CRITIQUE_PLACEHOLDER}
            className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3.5 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 transition-all resize-none leading-relaxed"
          />
        </div>

        {error && (
          <div className="bg-[#fdf1f0] border border-[#f5c6c3] rounded-xl px-4 py-3 text-sm text-[#c0392b] mb-5">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-[#2d3748] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Submitting...
            </>
          ) : "Submit critique"}
        </button>
      </div>
    </div>
  );
}

// ─── CRITIQUE CARD ────────────────────────────────────────────────────────────
// - The critique AUTHOR can edit and delete their own critique
// - Any other logged-in user (including the submission author) can upvote
// - The critique author cannot upvote their own critique

function CritiqueCard({ response, submissionAuthorId, user, onUpvote, onEdit, onDelete }) {
  const isCritiqueAuthor = user?.id === response.criticId;
  const isSubmissionAuthor = user?.id === submissionAuthorId;
  const canUpvote    = user && !isCritiqueAuthor;
  const upvoted      = (response.upvotes?.length ?? 0) > 0;
  const upvCount     = response._count?.upvotes ?? 0;

  const [editing, setEditing]       = useState(false);
  const [editFeedback, setEditFeedback] = useState(response.generalFeedback ?? "");
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState("");
  const [deleting, setDeleting]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editWordCount = countWords(editFeedback);

  async function saveEdit() {
    if (editWordCount < 150) {
      setEditError(`Critique must be at least 150 words (currently ${editWordCount}).`);
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`${API_URL}/feedback/responses/${response.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generalFeedback: editFeedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update critique.");
      onEdit(response.id, { generalFeedback: editFeedback });
      setEditing(false);
    } catch (e) {
      setEditError(e.message);
    }
    setEditSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/feedback/responses/${response.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        onDelete(response.id);
      }
    } catch (e) {}
    setDeleting(false);
    setConfirmDelete(false);
  }

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(45,35,20,0.04)]">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-[#f0ebe3]">
        <AuthorChip user={response.critic} />
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[#b8a898]">{timeAgo(response.createdAt)}</span>

          {/* Upvote — visible to everyone except the critique author */}
          {canUpvote && (
            <ThumbUpButton
              count={upvCount}
              upvoted={upvoted}
              onToggle={() => onUpvote(response.id)}
              disabled={!user}
            />
          )}

          {/* Upvote count display when current user is the critique author and can't upvote */}
          {isCritiqueAuthor && upvCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-[#9a8c7a] border border-[#e8e0d0] bg-[#faf7f2] px-2.5 py-1 rounded-lg">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
              </svg>
              {upvCount}
            </span>
          )}

          {/* Edit / Delete — only for the critique author */}
          {isCritiqueAuthor && !editing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-[#9a8c7a] hover:text-[#2d3748] border border-[#e8e0d0] px-2.5 py-1 rounded-lg hover:border-[#2d3748] transition-all"
              >
                Edit
              </button>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-[#c0392b] hover:text-[#9b1c1c] border border-[#f5c6c3] px-2.5 py-1 rounded-lg hover:border-[#c0392b] transition-all"
                >
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs text-white bg-[#c0392b] px-2.5 py-1 rounded-lg hover:bg-[#9b1c1c] transition-all disabled:opacity-50"
                  >
                    {deleting ? "..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-[#9a8c7a] px-2 py-1 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {isCritiqueAuthor && editing && (
            <button
              onClick={() => { setEditing(false); setEditError(""); }}
              className="text-xs text-[#9a8c7a] border border-[#e8e0d0] px-2.5 py-1 rounded-lg transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* General feedback */}
        {editing ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-[#2d3748]">Your critique</label>
              <span className={`text-xs font-semibold ${editWordCount >= 150 ? "text-[#6b8c6b]" : "text-[#b8860b]"}`}>
                {editWordCount} / 150 min
              </span>
            </div>
            <div className="h-1 bg-[#f0ebe3] rounded-full mb-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${editWordCount >= 150 ? "bg-[#6b8c6b]" : "bg-[#d4af37]"}`}
                style={{ width: `${Math.min((editWordCount / 150) * 100, 100)}%` }}
              />
            </div>
            <textarea
              value={editFeedback}
              onChange={(e) => { setEditFeedback(e.target.value); setEditError(""); }}
              rows={10}
              className="w-full border border-[#2d3748] rounded-xl px-4 py-3 text-sm text-[#2d3748] bg-[#faf7f2] focus:outline-none resize-none leading-relaxed"
            />
          </div>
        ) : (
          <div className="text-sm text-[#4a4a4a] leading-[1.85]">
            {renderMarkdown(response.generalFeedback)}
          </div>
        )}

        {editError && (
          <div className="bg-[#fdf1f0] border border-[#f5c6c3] rounded-xl px-4 py-3 text-sm text-[#c0392b]">
            {editError}
          </div>
        )}

        {editing && (
          <button
            onClick={saveEdit}
            disabled={editSaving}
            className="w-full py-2.5 bg-[#2d3748] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {editSaving ? "Saving..." : "Save changes"}
          </button>
        )}

        {/* Points earned note */}
        {!editing && response.pointsEarned > 0 && (
          <p className="text-xs text-[#9a8c7a] pt-3 border-t border-[#f0ebe3]">
            Earned {response.pointsEarned} pts for this critique
            {upvCount > 0 && ` · +${upvCount * 2} pts from upvotes`}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [submission, setSubmission]     = useState(null);
  const [comments, setComments]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [activePara, setActivePara]     = useState(null);
  const [hasResponded, setHasResponded] = useState(false);

  const paragraphRefs = useRef([]);
  const responseRefs  = useRef([]);

  useEffect(() => { fetchSubmission(); }, [id]);

  useEffect(() => {
    if (!submission || !location.hash) return;
    const hash = location.hash;
    const paraMatch    = hash.match(/^#paragraph-(\d+)$/);
    const critiqueMatch = hash.match(/^#critique-(\d+)$/);

    if (paraMatch) {
      const idx = Number(paraMatch[1]) - 1;
      const el = paragraphRefs.current[idx];
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          openSidebar(idx);
        }, 300);
      }
    } else if (critiqueMatch) {
      const critiqueId = Number(critiqueMatch[1]);
      const idx = (submission.responses ?? []).findIndex((r) => r.id === critiqueId);
      if (idx !== -1 && responseRefs.current[idx]) {
        setTimeout(() => {
          responseRefs.current[idx].scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    }
  }, [submission, location.hash]);

  async function fetchSubmission() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/${id}`, {
        credentials: "include",
      });
      if (!res.ok) { navigate("/feedback"); return; }
      const data = await res.json();
      setSubmission(data);
      setComments(data.paragraphComments ?? []);
      if (user) {
        const already = (data.responses ?? []).some((r) => r.criticId === user.id);
        setHasResponded(already);
      }
    } catch (e) {}
    setLoading(false);
  }

  const paragraphs = (submission?.content ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\n([^\n])/g, "$1\n\n$2")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  function getParaComments(index) {
    return comments.filter((c) => c.paragraphIndex === index);
  }

  function openSidebar(index) {
    const preview = paragraphs[index]?.slice(0, 80) ?? "";
    setActivePara({ index, preview });
    setSidebarOpen(true);
  }

  function handleNewComment(data) {
    if (data.type === "reply") {
      setComments((prev) =>
        prev.map((c) =>
          c.id === data.commentId
            ? { ...c, replies: [...(c.replies ?? []), data.reply] }
            : c
        )
      );
    } else {
      setComments((prev) => [...prev, data]);
    }
  }

  function handleEditComment(commentId, newContent) {
    setComments((prev) =>
      prev.map((c) => c.id === commentId ? { ...c, content: newContent } : c)
    );
  }

  function handleDeleteComment(commentId) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function handleUpvoteComment(commentId) {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/feedback/comments/${commentId}/upvote`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const { upvoted } = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  upvotes: upvoted ? [{ id: 1 }] : [],
                  _count: { ...c._count, upvotes: (c._count?.upvotes ?? 0) + (upvoted ? 1 : -1) },
                }
              : c
          )
        );
      }
    } catch (e) {}
  }

  async function handleUpvoteResponse(responseId) {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/feedback/responses/${responseId}/upvote`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const { upvoted } = await res.json();
        setSubmission((prev) => ({
          ...prev,
          responses: prev.responses.map((r) =>
            r.id === responseId
              ? {
                  ...r,
                  upvotes: upvoted ? [{ id: 1 }] : [],
                  _count: { ...r._count, upvotes: (r._count?.upvotes ?? 0) + (upvoted ? 1 : -1) },
                }
              : r
          ),
        }));
      }
    } catch (e) {}
  }

  function handleCritiqueEdit(responseId, updatedFields) {
    setSubmission((prev) => ({
      ...prev,
      responses: prev.responses.map((r) =>
        r.id === responseId ? { ...r, ...updatedFields } : r
      ),
    }));
  }

  function handleCritiqueDelete(responseId) {
    setSubmission((prev) => ({
      ...prev,
      responses: (prev.responses ?? []).filter((r) => r.id !== responseId),
    }));
    // If the deleted critique was the current user's, allow them to submit again
    if (submission?.responses?.find((r) => r.id === responseId)?.criticId === user?.id) {
      setHasResponded(false);
    }
  }

  function handleCritiqueSuccess(response) {
    setSubmission((prev) => ({
      ...prev,
      responses: [...(prev.responses ?? []), response],
    }));
    setHasResponded(true);
  }

  const isAuthor    = user?.id === submission?.userId;
  // Archived (isOutdated) posts still accept critiques at half points.
  // Only manually-closed (isOpen=false AND NOT isOutdated) posts block new critiques.
  const isAcceptingCritiques = submission?.isOpen || submission?.isOutdated;
  const canCritique = user && !isAuthor && !hasResponded && isAcceptingCritiques;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2]">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-[#f0ebe3] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!submission) return null;

  const activeComments = activePara !== null ? getParaComments(activePara.index) : [];

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Back */}
        <Link
          to="/feedback"
          className="inline-flex items-center gap-1.5 text-sm text-[#9a8c7a] hover:text-[#2d3748] transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to hub
        </Link>

        {/* Two-column layout */}
        <div className="flex gap-7 transition-all duration-300">

          {/* ── Left: Chapter + critiques ─────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Submission meta card */}
            <div className="bg-white border border-[#e8e0d0] rounded-2xl p-6 mb-6 shadow-[0_2px_8px_rgba(45,35,20,0.04)]">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-[11px] font-semibold text-[#2d3748] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
                  {submission.genre}
                </span>
                <span className="text-[11px] text-[#9a8c7a] border border-[#e8e0d0] px-2.5 py-0.5 rounded-full">
                  {TIER_LABELS[submission.wordCountTier]}
                </span>
                <span className="text-[11px] text-[#9a8c7a] border border-[#e8e0d0] px-2.5 py-0.5 rounded-full">
                  {DRAFT_LABELS[submission.draftStage]}
                </span>
                {!submission.isOpen && !submission.isOutdated && (
                  <span className="text-[11px] text-[#c0392b] bg-[#fdf1f0] border border-[#f5c6c3] px-2.5 py-0.5 rounded-full">
                    Closed
                  </span>
                )}
                {submission.isOutdated && (
                  <span className="text-[11px] text-[#9a8c7a] bg-[#f4f1ec] border border-[#e8e0d0] px-2.5 py-0.5 rounded-full">
                    Archive · half points
                  </span>
                )}
              </div>

              <h1 className="font-serif text-2xl text-[#2d3748] mb-4 leading-snug">
                {submission.title}
              </h1>

              <AuthorChip user={submission.user} />
              <p className="text-xs text-[#b8a898] mt-2">
                {new Date(submission.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
              </p>

              <p className="text-sm text-[#6b5c4a] mt-5 leading-relaxed border-t border-[#f0ebe3] pt-5">
                {submission.summary}
              </p>

              {/* Feedback wanted */}
              {submission.feedbackWanted?.length > 0 && (
                <div className="mt-5 pt-5 border-t border-[#f0ebe3]">
                  <p className="text-xs font-semibold text-[#9a8c7a] uppercase tracking-wide mb-2">
                    Feedback requested
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {submission.feedbackWanted.map((tag, i) => (
                      <span key={i} className="text-xs text-[#6558d4] bg-[#f2f0fd] px-3 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Content warnings */}
              {submission.contentWarnings?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {submission.contentWarnings.map((w, i) => (
                    <span key={i} className="text-[10px] text-[#c0392b] bg-[#fdf1f0] px-2.5 py-0.5 rounded-full border border-[#f5c6c3]">
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reading instruction */}
            <div className="flex items-center gap-2 bg-[#fdf9ed] border border-[#f0d98a] rounded-xl px-4 py-3 mb-6 text-sm text-[#6b5c4a]">
              <svg className="w-4 h-4 text-[#b8860b] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Click any paragraph to leave a comment on it. Comments appear in the side panel.
            </div>

            {/* Chapter text */}
            <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden mb-10 shadow-[0_2px_8px_rgba(45,35,20,0.04)]">
              <div className="px-6 sm:px-10 py-8 sm:py-10">
                {paragraphs.map((para, i) => {
                  const paraComments = getParaComments(i);
                  const isActive     = sidebarOpen && activePara?.index === i;

                  return (
                    <div
                      key={i}
                      ref={(el) => (paragraphRefs.current[i] = el)}
                      className={`group relative cursor-pointer transition-all duration-150 rounded-lg -mx-2 px-2 py-1 mb-6 last:mb-0 ${
                        isActive ? "bg-[#fdf9ed]" : "hover:bg-[#fafaf7]"
                      }`}
                      onClick={() => openSidebar(i)}
                    >
                      <div
                        className={`absolute -left-1 top-0 w-0.5 rounded-full transition-all h-full ${
                          isActive ? "bg-[#d4af37] opacity-100" : "opacity-0 group-hover:opacity-100 bg-[#d6cfc4]"
                        }`}
                      />
                      <span className={`block text-[10px] font-semibold tracking-widest uppercase mb-1 select-none transition-opacity ${
                        isActive ? "text-[#d4af37] opacity-100" : "text-[#c4b9ab] opacity-0 group-hover:opacity-100"
                      }`}>
                        P {i + 1}
                      </span>
                      <p className="font-[Georgia,serif] text-[#2d3748] text-[15.5px] leading-[1.95] tracking-[0.01em]">
                        {renderMarkdown(para)}
                      </p>
                      {paraComments.length > 0 && (
                        <span className="absolute -right-1 top-1 bg-[#2d3748] text-white text-[9px] font-bold min-w-[18px] px-1 h-[18px] rounded-full flex items-center justify-center">
                          {paraComments.length}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Critiques section ──────────────────────────────────────────── */}
            <div className="mb-10">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="font-serif text-xl text-[#2d3748]">Critiques</h2>
                <span className="text-sm text-[#b8a898]">{submission.responses?.length ?? 0}</span>
                <div className="flex-1 h-px bg-[#e8e0d0]" />
              </div>

              {(submission.responses?.length ?? 0) === 0 ? (
                <div className="bg-white border border-[#e8e0d0] rounded-2xl px-6 py-12 text-center mb-8">
                  <p className="font-serif text-[#2d3748] mb-1">No critiques yet</p>
                  <p className="text-sm text-[#9a8c7a]">
                    {canCritique
                      ? "Be the first to leave a full critique below."
                      : "Check back later for community feedback."}
                  </p>
                </div>
              ) : (
                <div className="space-y-5 mb-8">
                  {submission.responses.map((r, rIdx) => (
                    <div key={r.id} ref={(el) => (responseRefs.current[rIdx] = el)}>
                      <CritiqueCard
                        response={r}
                        submissionAuthorId={submission.userId}
                        user={user}
                        onUpvote={handleUpvoteResponse}
                        onEdit={handleCritiqueEdit}
                        onDelete={handleCritiqueDelete}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Critique form */}
              {canCritique && (
                <CritiqueForm
                  submissionId={submission.id}
                  onSuccess={handleCritiqueSuccess}
                />
              )}

              {/* Already responded */}
              {hasResponded && (
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl px-5 py-4 text-sm text-[#166534]">
                  You have already submitted a critique for this chapter.
                </div>
              )}

              {/* Not logged in */}
              {!user && (
                <div className="bg-white border border-[#e8e0d0] rounded-2xl px-6 py-8 text-center">
                  <p className="font-serif text-[#2d3748] mb-1">Want to leave a critique?</p>
                  <p className="text-sm text-[#9a8c7a] mb-5">Sign in to give feedback and earn posting points.</p>
                  <Link
                    to="/login"
                    className="inline-block px-5 py-2.5 bg-[#2d3748] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all"
                  >
                    Sign in
                  </Link>
                </div>
              )}

              {/* Submission closed — only for manually closed, non-outdated posts */}
              {user && !isAuthor && !submission.isOpen && !submission.isOutdated && !hasResponded && (
                <div className="bg-[#faf7f2] border border-[#e8e0d0] rounded-2xl px-5 py-4 text-sm text-[#9a8c7a]">
                  This submission is closed and no longer accepting critiques.
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Comment sidebar ──────────────────────────────────────── */}
          {sidebarOpen && (
            <div className="hidden sm:flex flex-col w-80 flex-shrink-0 bg-white border border-[#e8e0d0] rounded-2xl shadow-[0_4px_20px_rgba(45,35,20,0.08)] sticky top-20 h-[calc(100vh-6rem)] overflow-hidden">
              <CommentSidebar
                submissionId={submission.id}
                paragraphIndex={activePara?.index ?? 0}
                paragraphPreview={activePara?.preview ?? ""}
                comments={activeComments}
                onClose={() => setSidebarOpen(false)}
                onNewComment={handleNewComment}
                onUpvoteComment={handleUpvoteComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                isAuthor={isAuthor}
                user={user}
              />
            </div>
          )}
        </div>

        {/* Mobile comment drawer */}
        {sidebarOpen && (
          <div className="sm:hidden fixed inset-0 z-50 flex flex-col bg-[#faf7f2]">
            <div className="flex-1 overflow-hidden bg-white flex flex-col">
              <CommentSidebar
                submissionId={submission.id}
                paragraphIndex={activePara?.index ?? 0}
                paragraphPreview={activePara?.preview ?? ""}
                comments={activeComments}
                onClose={() => setSidebarOpen(false)}
                onNewComment={handleNewComment}
                onUpvoteComment={handleUpvoteComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                isAuthor={isAuthor}
                user={user}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}