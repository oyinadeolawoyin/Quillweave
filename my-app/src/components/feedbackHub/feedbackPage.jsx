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
// ─── INLINE MARKDOWN RENDERER ────────────────────────────────────────────────
// Renders **bold** and *italic* stored as plain-text markdown syntax.
function renderMarkdown(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}



// ─── STAR RATING ─────────────────────────────────────────────────────────────

function StarRating({ value, onChange, readOnly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={`transition-all ${readOnly ? "cursor-default" : "cursor-pointer"}`}
        >
          <svg
            className="w-5 h-5 transition-colors"
            fill={(hover || value) >= star ? "#d4af37" : "none"}
            stroke={(hover || value) >= star ? "#d4af37" : "#d6cfc4"}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── AUTHOR CHIP ─────────────────────────────────────────────────────────────

function AuthorChip({ user, size = "md" }) {
  const rep  = user?.feedbackPoints?.reputation ?? 0;
  const tier = getTier(rep);
  const sz   = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-xs";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sz} rounded-full bg-[#2d3748] flex items-center justify-center text-white font-semibold flex-shrink-0`}
      >
        {user?.username?.charAt(0).toUpperCase() ?? "?"}
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
    </div>
  );
}

// ─── UPVOTE BUTTON ────────────────────────────────────────────────────────────

function UpvoteButton({ count, upvoted, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
        upvoted
          ? "bg-[#2d3748] text-white border-[#2d3748]"
          : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#2d3748] hover:text-[#2d3748]"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <svg className="w-3.5 h-3.5" fill={upvoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
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
  isAuthor,
  user,
}) {
  const [replyOpen, setReplyOpen] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting]    = useState(false);
  const [replyPosting, setReplyPosting] = useState(false);

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
        onNewComment({ type: "reply", commentId, reply: data });
        setReplyText("");
        setReplyOpen(null);
      }
    } catch (e) {}
    setReplyPosting(false);
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {comments.length === 0 && (
          <p className="text-sm text-[#b8a898] text-center py-6">
            No comments on this paragraph yet.
          </p>
        )}

        {comments.map((c) => {
          const upvoted   = (c.upvotes?.length ?? 0) > 0;
          const upvCount  = c._count?.upvotes ?? 0;
          const isOwn     = user?.id === c.author?.id;

          return (
            <div key={c.id} className="group">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#2d3748] flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0 mt-0.5">
                  {c.author?.username?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-[#2d3748]">{c.author?.username}</span>
                    <span className="text-[10px] text-[#b8a898]">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-[#4a4a4a] leading-relaxed">{renderMarkdown(c.content)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <UpvoteButton
                      count={upvCount}
                      upvoted={upvoted}
                      onToggle={() => onUpvoteComment(c.id)}
                      disabled={!user || isOwn}
                    />
                    {user && (
                      <button
                        onClick={() => setReplyOpen(replyOpen === c.id ? null : c.id)}
                        className="text-[11px] text-[#9a8c7a] hover:text-[#2d3748] transition-colors font-medium"
                      >
                        {replyOpen === c.id ? "Cancel" : "Reply"}
                      </button>
                    )}
                  </div>

                  {/* Replies */}
                  {c.replies?.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-[#f0ebe3] space-y-3">
                      {c.replies.map((r) => (
                        <div key={r.id}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11px] font-semibold text-[#2d3748]">{r.author?.username}</span>
                            <span className="text-[10px] text-[#b8a898]">{timeAgo(r.createdAt)}</span>
                          </div>
                          <p className="text-xs text-[#6b5c4a] leading-relaxed">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply box */}
                  {replyOpen === c.id && (
                    <div className="mt-3 pl-3 border-l-2 border-[#e8e0d0]">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        placeholder="Write a reply..."
                        className="w-full border border-[#e8e0d0] rounded-xl sm:rounded-none px-3 py-2 text-xs text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] resize-none transition-all"
                      />
                      <div className="flex justify-end mt-1.5">
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
        <div className="px-5 py-4 border-t border-[#f0ebe3] flex-shrink-0">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            placeholder="Add a comment on this paragraph..."
            className="w-full border border-[#e8e0d0] rounded-xl sm:rounded-none px-3 py-2.5 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 resize-none transition-all"
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
  const [ratings, setRatings] = useState({
    overallRating: 0, clarityRating: 0, pacingRating: 0, believabilityRating: 0,
  });
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  const wordCount = countWords(feedback);
  const ratingLabels = [
    { key: "overallRating",       label: "Overall" },
    { key: "clarityRating",       label: "Clarity" },
    { key: "pacingRating",        label: "Pacing" },
    { key: "believabilityRating", label: "Believability" },
  ];

  async function handleSubmit() {
    for (const r of ratingLabels) {
      if (!ratings[r.key]) { setError(`Please rate ${r.label}.`); return; }
    }
    if (wordCount < 100) {
      setError(`General feedback must be at least 100 words (currently ${wordCount}).`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/${submissionId}/responses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ratings, generalFeedback: feedback }),
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
    <div className="bg-white border border-[#e8e0d0] rounded-2xl p-6 shadow-[0_2px_12px_rgba(45,35,20,0.04)]">
      <h3 className="font-serif text-xl text-[#2d3748] mb-1">Leave a critique</h3>
      <p className="text-sm text-[#9a8c7a] mb-6">
        Rate each dimension, then write your general feedback (minimum 100 words).
        You'll earn points for a complete critique.
      </p>

      {/* Ratings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6 pb-6 border-b border-[#f0ebe3]">
        {ratingLabels.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-[#6b5c4a] w-24 flex-shrink-0">{r.label}</span>
            <StarRating
              value={ratings[r.key]}
              onChange={(v) => setRatings((prev) => ({ ...prev, [r.key]: v }))}
            />
          </div>
        ))}
      </div>

      {/* General feedback */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-[#2d3748]">General feedback</label>
          <span className={`text-xs font-semibold transition-colors ${
            wordCount >= 100 ? "text-[#6b8c6b]" : wordCount > 0 ? "text-[#b8860b]" : "text-[#b8a898]"
          }`}>
            {wordCount} / 100 words min
          </span>
        </div>
        {/* Progress bar to 100 words */}
        <div className="h-1 bg-[#f0ebe3] rounded-full mb-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              wordCount >= 100 ? "bg-[#6b8c6b]" : "bg-[#d4af37]"
            }`}
            style={{ width: `${Math.min((wordCount / 100) * 100, 100)}%` }}
          />
        </div>
        <textarea
          value={feedback}
          onChange={(e) => { setFeedback(e.target.value); setError(""); }}
          rows={10}
          placeholder="Share your overall impression — what's working well, what isn't, and the one thing you think the writer should focus on next. Be specific and constructive."
          className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 transition-all resize-none leading-relaxed"
        />
      </div>

      {error && (
        <div className="bg-[#fdf1f0] border border-[#f5c6c3] rounded-xl px-4 py-3 text-sm text-[#c0392b] mb-4">
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
  );
}

// ─── CRITIQUE CARD ────────────────────────────────────────────────────────────

function CritiqueCard({ response, submissionAuthorId, user, onUpvote }) {
  const isAuthor   = user?.id === submissionAuthorId;
  const upvoted    = (response.upvotes?.length ?? 0) > 0;
  const upvCount   = response._count?.upvotes ?? 0;

  const ratingItems = [
    { label: "Overall",        value: response.overallRating },
    { label: "Clarity",        value: response.clarityRating },
    { label: "Pacing",         value: response.pacingRating },
    { label: "Believability",  value: response.believabilityRating },
  ];

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl p-5 shadow-[0_1px_4px_rgba(45,35,20,0.04)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-[#f0ebe3]">
        <AuthorChip user={response.critic} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#b8a898]">{timeAgo(response.createdAt)}</span>
          {isAuthor && (
            <UpvoteButton
              count={upvCount}
              upvoted={upvoted}
              onToggle={() => onUpvote(response.id)}
              disabled={!user}
            />
          )}
          {!isAuthor && upvCount > 0 && (
            <span className="text-xs text-[#b8a898]">
              {upvCount} upvote{upvCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Ratings row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {ratingItems.map((r) => (
          <div key={r.label} className="text-center">
            <p className="text-[10px] font-medium text-[#9a8c7a] mb-1">{r.label}</p>
            <p className="text-sm font-semibold text-[#2d3748]">
              {r.value}<span className="text-[#d6cfc4] font-normal">/5</span>
            </p>
          </div>
        ))}
      </div>

      {/* General feedback */}
      <p className="text-sm text-[#4a4a4a] leading-[1.8] whitespace-pre-wrap">
        {renderMarkdown(response.generalFeedback)}
      </p>

      {/* Points earned note */}
      {response.pointsEarned > 0 && (
        <p className="text-xs text-[#9a8c7a] mt-4 pt-3 border-t border-[#f0ebe3]">
          Earned {response.pointsEarned} pts for this critique
          {upvCount > 0 && ` · +${upvCount * 3} pts from upvotes`}
        </p>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [submission, setSubmission]   = useState(null);
  const [comments, setComments]       = useState([]); // all paragraph comments
  const [loading, setLoading]         = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePara, setActivePara]   = useState(null); // { index, preview }
  const [hasResponded, setHasResponded] = useState(false);

  const paragraphRefs = useRef([]);
  const responseRefs  = useRef([]);

  useEffect(() => { fetchSubmission(); }, [id]);

  // Scroll to paragraph or critique referenced in URL hash (from notification links)
  useEffect(() => {
    if (!submission || !location.hash) return;
    const hash = location.hash; // e.g. #paragraph-5  or  #critique-12  or  #comment-34

    const paraMatch = hash.match(/^#paragraph-(\d+)$/);
    const critiqueMatch = hash.match(/^#critique-(\d+)$/);

    if (paraMatch) {
      const idx = Number(paraMatch[1]) - 1; // convert 1-based to 0-based
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
    .split(/\n\n+/)
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

  function handleCritiqueSuccess(response) {
    setSubmission((prev) => ({
      ...prev,
      responses: [...(prev.responses ?? []), response],
    }));
    setHasResponded(true);
  }

  const isAuthor    = user?.id === submission?.userId;
  const canCritique = user && !isAuthor && !hasResponded && submission?.isOpen;

  // ─── Loading ────────────────────────────────────────────────────────────────

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

        {/* Two-column layout: chapter + sidebar */}
        <div className={`flex gap-6 transition-all duration-300 ${sidebarOpen ? "" : ""}`}>

          {/* ── Left: Chapter + critiques ────────────────────────────────────── */}
          <div className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? "sm:pr-0" : ""}`}>

            {/* Submission meta card */}
            <div className="bg-white border border-[#e8e0d0] rounded-2xl p-6 mb-6 shadow-[0_2px_8px_rgba(45,35,20,0.04)]">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[11px] font-semibold text-[#2d3748] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
                  {submission.genre}
                </span>
                <span className="text-[11px] text-[#9a8c7a] border border-[#e8e0d0] px-2.5 py-0.5 rounded-full">
                  {TIER_LABELS[submission.wordCountTier]}
                </span>
                <span className="text-[11px] text-[#9a8c7a] border border-[#e8e0d0] px-2.5 py-0.5 rounded-full">
                  {DRAFT_LABELS[submission.draftStage]}
                </span>
                {!submission.isOpen && (
                  <span className="text-[11px] text-[#c0392b] bg-[#fdf1f0] border border-[#f5c6c3] px-2.5 py-0.5 rounded-full">
                    Closed
                  </span>
                )}
              </div>

              <h1 className="font-serif text-2xl text-[#2d3748] mb-3 leading-snug">
                {submission.title}
              </h1>

              <AuthorChip user={submission.user} />

              <p className="text-sm text-[#6b5c4a] mt-4 leading-relaxed border-t border-[#f0ebe3] pt-4">
                {submission.summary}
              </p>

              {/* Feedback wanted */}
              {submission.feedbackWanted?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#f0ebe3]">
                  <p className="text-xs font-semibold text-[#9a8c7a] uppercase tracking-wide mb-2">
                    Feedback requested
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {submission.feedbackWanted.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs text-[#6558d4] bg-[#f2f0fd] px-3 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Content warnings */}
              {submission.contentWarnings?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {submission.contentWarnings.map((w, i) => (
                    <span key={i} className="text-[10px] text-[#c0392b] bg-[#fdf1f0] px-2.5 py-0.5 rounded-full border border-[#f5c6c3]">
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reading instruction */}
            <div className="flex items-center gap-2 bg-[#fdf9ed] border border-[#f0d98a] rounded-xl px-4 py-2.5 mb-5 text-sm text-[#6b5c4a]">
              <svg className="w-4 h-4 text-[#b8860b] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Click any paragraph to leave a comment on it. Comments appear in the side panel.
            </div>

            {/* Chapter text */}
            <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden mb-8 shadow-[0_2px_8px_rgba(45,35,20,0.04)]">
              <div className="px-6 sm:px-10 py-8 sm:py-10">
                {paragraphs.map((para, i) => {
                  const paraComments = getParaComments(i);
                  const isActive     = sidebarOpen && activePara?.index === i;

                  return (
                    <div
                      key={i}
                      ref={(el) => (paragraphRefs.current[i] = el)}
                      className={`group relative cursor-pointer transition-all duration-150 rounded-lg -mx-2 px-2 py-1 mb-5 last:mb-0 ${
                        isActive
                          ? "bg-[#fdf9ed]"
                          : "hover:bg-[#fafaf7]"
                      }`}
                      onClick={() => openSidebar(i)}
                    >
                      {/* Paragraph marker */}
                      <div className="absolute -left-5 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <div
                          className={`w-1 h-full min-h-[1rem] rounded-full transition-all ${
                            isActive ? "bg-[#d4af37]" : "bg-[#e8e0d0]"
                          }`}
                        />
                      </div>
                      <div
                        className={`absolute -left-1 top-0 w-0.5 rounded-full transition-all h-full ${
                          isActive ? "bg-[#d4af37] opacity-100" : "opacity-0 group-hover:opacity-100 bg-[#d6cfc4]"
                        }`}
                      />

                      {/* Paragraph number — visible on hover or when active */}
                      <span className={`block text-[10px] font-semibold tracking-widest uppercase mb-1 select-none transition-opacity ${ isActive ? "text-[#d4af37] opacity-100" : "text-[#c4b9ab] opacity-0 group-hover:opacity-100" }`}>
                        ¶ {i + 1}
                      </span>
                      <p className="font-[Georgia,serif] text-[#2d3748] text-[15.5px] leading-[1.95] tracking-[0.01em]">
                        {renderMarkdown(para)}
                      </p>

                      {/* Comment count badge */}
                      {paraComments.length > 0 && (
                        <span className="absolute -right-1 top-1 bg-[#2d3748] text-white text-[9px] font-bold w-4.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center">
                          {paraComments.length}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Critiques section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-xl text-[#2d3748]">
                  Critiques
                  <span className="text-[#b8a898] font-sans text-sm font-normal ml-2">
                    {submission.responses?.length ?? 0}
                  </span>
                </h2>
              </div>

              {(submission.responses?.length ?? 0) === 0 ? (
                <div className="bg-white border border-[#e8e0d0] rounded-2xl px-6 py-10 text-center mb-6">
                  <p className="font-serif text-[#2d3748] mb-1">No critiques yet</p>
                  <p className="text-sm text-[#9a8c7a]">
                    {canCritique
                      ? "Be the first to leave a full critique below."
                      : "Check back later for community feedback."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {submission.responses.map((r, rIdx) => (
                    <div key={r.id} ref={(el) => (responseRefs.current[rIdx] = el)}>
                      <CritiqueCard
                        response={r}
                        submissionAuthorId={submission.userId}
                        user={user}
                        onUpvote={handleUpvoteResponse}
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
                <div className="bg-white border border-[#e8e0d0] rounded-2xl px-6 py-6 text-center">
                  <p className="font-serif text-[#2d3748] mb-1">Want to leave a critique?</p>
                  <p className="text-sm text-[#9a8c7a] mb-4">Sign in to give feedback and earn posting points.</p>
                  <Link
                    to="/login"
                    className="inline-block px-5 py-2.5 bg-[#2d3748] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all"
                  >
                    Sign in
                  </Link>
                </div>
              )}

              {/* Submission closed */}
              {user && !isAuthor && !submission.isOpen && !hasResponded && (
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