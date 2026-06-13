import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "./header";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TIER_LABELS = {
  TIER_1000: "1,000 words",
  TIER_2000: "2,000 words",
  TIER_3000: "3,000 words",
  TIER_4000: "4,000 words",
  TIER_5000: "5,000 words",
};

const DRAFT_LABELS = {
  ROUGH: "Rough draft",
  POLISHING: "Polishing",
  FINAL_EDIT: "Final edit",
};

const TIER_STYLES = {
  Bronze:   { bg: "#fdf6ee", color: "#a0522d", border: "#e8c99a" },
  Silver:   { bg: "#f5f6f7", color: "#5a6272", border: "#c8cdd6" },
  Gold:     { bg: "#fdfbea", color: "#8a6c00", border: "#e8d87a" },
  Platinum: { bg: "#f2f0fc", color: "#5248a8", border: "#c4bef0" },
  Diamond:  { bg: "#fff3ef", color: "#b83a1a", border: "#f0b8a8" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────

function ConfirmModal({ title, body, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm border border-[#e8e0d0]">
        <h3 className="font-serif text-lg text-[#1e2a38] mb-2">{title}</h3>
        <p className="text-sm text-[#7a6e62] mb-7 leading-relaxed">{body}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-[#ddd5c8] text-sm text-[#7a6e62] hover:border-[#2d3748] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              danger
                ? "bg-[#c0392b] text-white hover:bg-[#a93226]"
                : "bg-[#2d3748] text-white hover:bg-[#1e2a38]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-[#f0ebe3] rounded-lg ${className}`} />;
}

// ─── WALLET CARD ─────────────────────────────────────────────────────────────

function WalletCard({ wallet, isOwner }) {
  if (!wallet) return null;

  const tier = wallet.tier;
  const style = TIER_STYLES[tier?.name] ?? TIER_STYLES.Bronze;

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-4"
      style={{ background: style.bg, borderColor: style.border }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold"
          style={{ background: style.border, color: style.color }}
        >
          {tier?.gem}
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: style.color }}>
            {tier?.name} Tier
          </p>
          <p className="text-[11px] text-[#9a8c7a] mt-0.5">Feedback reputation</p>
        </div>
      </div>

      <div className={`grid gap-3 ${isOwner ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="bg-white/70 rounded-xl px-4 py-3 border border-white/80">
          <p className="text-[11px] uppercase tracking-widest text-[#9a8c7a] font-semibold mb-0.5">Reputation</p>
          <p className="text-2xl font-serif font-bold" style={{ color: style.color }}>
            {wallet.reputation ?? 0}
          </p>
        </div>
        {isOwner && (
          <div className="bg-white/70 rounded-xl px-4 py-3 border border-white/80">
            <p className="text-[11px] uppercase tracking-widest text-[#9a8c7a] font-semibold mb-0.5">Posting Balance</p>
            <p className="text-2xl font-serif font-bold text-[#2d3748]">
              {wallet.postingBalance ?? 0}
              <span className="text-sm font-normal text-[#9a8c7a] ml-1">pts</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUBMISSION ACTION DROPDOWN ───────────────────────────────────────────────

function SubmissionActions({ sub, onDelete, onMoveToDraft }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg hover:bg-[#f4f1ec] text-[#9a8c7a] hover:text-[#2d3748] transition-colors"
        title="More actions"
      >
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-[#e8e0d0] rounded-xl shadow-xl overflow-hidden z-20">
          <div className="py-1">
            <Link
              to={`/critique/${sub.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#4a4a4a] hover:bg-[#f7f4ee] transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </Link>

            {!sub.isDraft && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onMoveToDraft(sub); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#4a4a4a] hover:bg-[#f7f4ee] transition-colors"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Move to draft
              </button>
            )}

            <div className="h-px bg-[#f0ebe3] my-1" />

            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(sub); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SUBMISSION ROW ───────────────────────────────────────────────────────────

function SubmissionRow({ sub, isOwner, onDelete, onMoveToDraft }) {
  const navigate = useNavigate();
  const responses = sub._count?.responses ?? 0;
  const comments = sub._count?.paragraphComments ?? 0;

  return (
    <div
      className="group bg-white border border-[#e8e0d0] rounded-2xl p-4 sm:p-5 transition-all hover:border-[#c4b8a8] hover:shadow-sm cursor-pointer"
      onClick={() => navigate(`/critique/${sub.id}`)}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] font-semibold text-[#2d3748] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
          {sub.genre}
        </span>
        <span className="text-[11px] text-[#9a8c7a] border border-[#e8e0d0] px-2.5 py-0.5 rounded-full">
          {TIER_LABELS[sub.wordCountTier]}
        </span>
        <span className="text-[11px] text-[#9a8c7a] border border-[#e8e0d0] px-2.5 py-0.5 rounded-full">
          {DRAFT_LABELS[sub.draftStage]}
        </span>
        {sub.wasFreePost && (
          <span className="text-[11px] font-semibold text-[#8a6c00] bg-[#fdfbea] border border-[#e8d87a] px-2.5 py-0.5 rounded-full">
            Free post
          </span>
        )}
        <span
          className={`ml-auto text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
            sub.status === "SPOTLIGHT"
              ? "text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0]"
              : sub.status === "ARCHIVE"
              ? "text-[#9a8c7a] bg-[#f4f1ec] border border-[#e0d8cc]"
              : "text-[#2d3748] bg-[#f4f1ec] border border-[#e0d8cc]"
          }`}
        >
          {sub.status === "SPOTLIGHT" ? "Spotlight" : sub.status === "ARCHIVE" ? "Archive" : "Queue"}
        </span>
        {isOwner && (
          <SubmissionActions
            sub={sub}
            onDelete={onDelete}
            onMoveToDraft={onMoveToDraft}
          />
        )}
      </div>

      <p className="font-serif text-[#1e2a38] text-base leading-snug mb-1.5 line-clamp-1">
        {sub.title}
      </p>

      <p className="text-xs text-[#9a8c7a] leading-relaxed mb-4 line-clamp-2">{sub.summary}</p>

      <div className="flex items-center gap-2 text-xs text-[#b0a090] pt-3 border-t border-[#f0ebe3]">
        <span>{responses} {responses === 1 ? "critique" : "critiques"}</span>
        <span className="w-1 h-1 rounded-full bg-[#e0d8cc] inline-block" />
        <span>{comments} comments</span>
        <span className="w-1 h-1 rounded-full bg-[#e0d8cc] inline-block" />
        <span>{timeAgo(sub.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── DISCOVERY CARD ───────────────────────────────────────────────────────────

function DiscoveryCard({ story, isOwner, onDeleteStory }) {
  const isPending = !story.isApproved;

  return (
    <div className={`group bg-white border rounded-2xl overflow-hidden transition-all hover:shadow-sm ${
      isPending ? "border-[#f0d98a] bg-[#fdfbea]" : "border-[#e8e0d0] hover:border-[#c4b8a8]"
    }`}>
      {story.coverUrl && (
        <div className="h-36 overflow-hidden">
          <img
            src={story.coverUrl}
            alt={story.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-2.5">
          <span className="text-[11px] font-semibold text-[#2d3748] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
            {story.genre}
          </span>
          {isPending ? (
            <span className="text-[11px] font-semibold text-[#8a6c00] bg-[#fdfbea] border border-[#e8d87a] px-2.5 py-0.5 rounded-full">
              Pending approval
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 rounded-full">
              Live
            </span>
          )}
        </div>

        <Link
          to={isPending ? "#" : `/discovery/${story.id}`}
          className={`block font-serif text-[#1e2a38] text-sm leading-snug mb-1 line-clamp-1 ${
            !isPending ? "hover:text-[#2d3748] transition-colors" : "pointer-events-none"
          }`}
        >
          {story.title}
        </Link>

        <p className="text-[11px] text-[#9a8c7a] mb-1">by {story.authorName}</p>

        <p className="text-xs text-[#b0a090] line-clamp-2 leading-relaxed mb-3">
          {story.synopsis}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#f0ebe3]">
          <div className="flex items-center gap-3 text-[11px] text-[#b0a090]">
            <span>{formatDate(story.createdAt)}</span>
            <span>{story._count?.likes ?? 0} {story._count?.likes === 1 ? "like" : "likes"}</span>
          </div>

          {isOwner && (
            <div className="flex items-center gap-1.5">
              <Link
                to={`/stories/${story.id}/edit`}
                className="px-2.5 py-1 rounded-lg border border-[#c4bef0] text-[11px] text-[#5248a8] bg-[#f2f0fc] hover:bg-[#eae7fa] transition-all font-medium"
              >
                Edit
              </Link>
              {onDeleteStory && (
                <button
                  onClick={() => onDeleteStory(story)}
                  className="px-2.5 py-1 rounded-lg border border-[#f5c6c3] text-[11px] text-[#c0392b] bg-[#fdf1f0] hover:bg-[#fbe8e6] transition-all font-medium"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CRITIQUE ROW ─────────────────────────────────────────────────────────────

function CritiqueRow({ response }) {
  const upvotes = response.upvotes ?? response._count?.upvotes ?? 0;

  return (
    <div className="group bg-white border border-[#e8e0d0] rounded-2xl p-4 sm:p-5 transition-all hover:border-[#c4b8a8] hover:shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        {response.submission?.genre && (
          <span className="text-[11px] font-semibold text-[#2d3748] bg-[#f4f1ec] px-2.5 py-0.5 rounded-full">
            {response.submission.genre}
          </span>
        )}
        <span className="text-[11px] text-[#9a8c7a] border border-[#e8e0d0] px-2.5 py-0.5 rounded-full">
          Critique
        </span>
        {upvotes > 0 && (
          <span className="text-[11px] font-semibold text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 rounded-full ml-auto">
            ▲ {upvotes} {upvotes === 1 ? "upvote" : "upvotes"}
          </span>
        )}
      </div>

      {response.submission?.title && (
        <Link
          to={`/critique/${response.submission.id}#critique-${response.id}`}
          className="block font-serif text-[#1e2a38] text-sm leading-snug mb-1.5 hover:text-[#2d3748] transition-colors line-clamp-1"
        >
          On: {response.submission.title}
        </Link>
      )}

      <p className="text-xs text-[#9a8c7a] leading-relaxed mb-3 line-clamp-3">
        {response.content}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-[#f0ebe3]">
        <span className="text-xs text-[#b0a090]">{timeAgo(response.createdAt)}</span>
        <Link
          to={`/feedback/${response.submission?.id}#critique-${response.id}`}
          className="px-3 py-1.5 rounded-lg border border-[#e8e0d0] text-xs text-[#6b5c4a] hover:border-[#2d3748] hover:text-[#2d3748] transition-all font-medium"
        >
          View
        </Link>
      </div>
    </div>
  );
}

// ─── SNIPPET CARD ─────────────────────────────────────────────────────────────

function SnippetCard({ snippet }) {
  const likes = snippet._count?.likes ?? 0;
  const comments = snippet._count?.comments ?? 0;

  return (
    <Link
      to={`/snippets/${snippet.id}`}
      className="group block bg-white border border-[#e8e0d0] rounded-2xl p-4 transition-all hover:border-[#c4b8a8] hover:shadow-sm"
    >
      {snippet.mediaUrl && (
        <div className="h-28 overflow-hidden rounded-xl mb-3">
          <img
            src={snippet.mediaUrl}
            alt="Snippet media"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      {snippet.sourceType && (
        <span className="inline-block text-[11px] font-semibold text-[#5248a8] bg-[#f2f0fc] border border-[#c4bef0] px-2.5 py-0.5 rounded-full mb-2.5">
          {snippet.sourceType === "STANDALONE" ? "Standalone" : snippet.sourceType}
        </span>
      )}

      {snippet.context && (
        <p className="text-sm text-[#1e2a38] leading-relaxed line-clamp-4 font-serif mb-3">
          {snippet.context}
        </p>
      )}

      <div className="flex items-center gap-3 text-[11px] text-[#b0a090] pt-2.5 border-t border-[#f0ebe3]">
        <span>♥ {likes}</span>
        <span>💬 {comments}</span>
        <span className="ml-auto">{timeAgo(snippet.createdAt)}</span>
      </div>
    </Link>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

function EmptyState({ message, cta, ctaTo }) {
  return (
    <div className="py-10 text-center">
      <div className="w-10 h-10 rounded-xl bg-[#f4f1ec] border border-[#e8e0d0] flex items-center justify-center mx-auto mb-4">
        <svg className="text-[#b8a898]" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="font-serif text-[#2d3748] mb-1">{message}</p>
      {cta && ctaTo && (
        <Link
          to={ctaTo}
          className="inline-block mt-3 px-5 py-2 bg-[#2d3748] text-white text-sm font-semibold rounded-xl hover:bg-[#1e2a38] transition-all"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-4 py-2 rounded-xl border border-[#e8e0d0] text-sm text-[#6b5c4a] disabled:opacity-40 hover:border-[#2d3748] transition-colors"
      >
        Previous
      </button>
      <span className="text-sm text-[#9a8c7a] tabular-nums">{page} / {totalPages}</span>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-4 py-2 rounded-xl border border-[#e8e0d0] text-sm text-[#6b5c4a] disabled:opacity-40 hover:border-[#2d3748] transition-colors"
      >
        Next
      </button>
    </div>
  );
}

// ─── TAB NAV ──────────────────────────────────────────────────────────────────

const TAB_DEFS = (isOwner, username) => [
  { id: "submissions", label: "Submissions" },
  { id: "critiques",   label: "Critiques Given" },
  { id: "snippets",    label: "Snippets" },
  { id: "stories",     label: "Stories" },
  ...(isOwner ? [{ id: "standing", label: "Feedback Standing" }] : [{ id: "standing", label: "Standing" }]),
  ...(isOwner ? [{ id: "blocked",  label: "Blocked Users" }] : []),
];

function TabNav({ tabs, active, onChange }) {
  return (
    /* Scrollable on small screens, horizontal flex on large */
    <div className="border-b border-[#e8e0d0] bg-white sticky top-[4.5rem] z-30 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex-shrink-0 px-4 sm:px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${active === tab.id
                  ? "border-[#2d3748] text-[#1e2a38]"
                  : "border-transparent text-[#9a8c7a] hover:text-[#2d3748] hover:border-[#c4b8a8]"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user: currentUser } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();

  const profileUserId = Number(userId);
  const isOwner = currentUser && currentUser.id === profileUserId;

  const [activeTab, setActiveTab] = useState("submissions");

  // ── State ──
  const [profileUser, setProfileUser]     = useState(null);
  const [wallet, setWallet]               = useState(null);
  const [userLoading, setUserLoading]     = useState(true);
  const [walletLoading, setWalletLoading] = useState(true);

  // Submissions
  const [submissions, setSubmissions]         = useState([]);
  const [subLoading, setSubLoading]           = useState(true);
  const [subPage, setSubPage]                 = useState(1);
  const [subTotalPages, setSubTotalPages]     = useState(1);

  // Critiques given
  const [critiquesGiven, setCritiquesGiven]         = useState([]);
  const [critiqueLoading, setCritiqueLoading]       = useState(true);
  const [critiquePage, setCritiquePage]             = useState(1);
  const [critiqueTotalPages, setCritiqueTotalPages] = useState(1);

  // Discovery stories
  const [approvedStories, setApprovedStories]   = useState([]);
  const [pendingStories, setPendingStories]     = useState([]);
  const [storyLoading, setStoryLoading]         = useState(true);
  const [storyPage, setStoryPage]               = useState(1);
  const [storyTotalPages, setStoryTotalPages]   = useState(1);

  // Snippets
  const [snippets, setSnippets]             = useState([]);
  const [snippetLoading, setSnippetLoading] = useState(true);
  const [snippetPage, setSnippetPage]       = useState(1);
  const [snippetTotalPages, setSnippetTotalPages] = useState(1);

  // Modal / feedback
  const [deleteTarget, setDeleteTarget]           = useState(null);
  const [moveToDraftTarget, setMoveToDraftTarget] = useState(null);
  const [deleteStoryTarget, setDeleteStoryTarget] = useState(null);
  const [actionLoading, setActionLoading]   = useState(false);
  const [toast, setToast]                   = useState(null);

  // Block
  const [isBlockedByMe, setIsBlockedByMe]     = useState(false);
  const [blockLoading, setBlockLoading]       = useState(false);
  const [blockConfirm, setBlockConfirm]       = useState(false);

  // Blocked users list (owner only)
  const [blockedUsers, setBlockedUsers]               = useState([]);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(false);
  const [unblockTarget, setUnblockTarget]             = useState(null);
  const [unblockLoading, setUnblockLoading]           = useState(false);

  // ── Fetch user ──
  useEffect(() => {
    async function fetchUser() {
      setUserLoading(true);
      try {
        const res = await fetch(`${API_URL}/users/${profileUserId}/user`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setProfileUser(data.user ?? data);
        }
      } catch {}
      setUserLoading(false);
    }
    fetchUser();
  }, [profileUserId]);

  useEffect(() => {
    if (!currentUser || isOwner) return;
    async function fetchBlockStatus() {
      try {
        const res = await fetch(`${API_URL}/users/blocked`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const blocked = (data.users ?? []).some(u => u.id === profileUserId);
          setIsBlockedByMe(blocked);
        }
      } catch {}
    }
    fetchBlockStatus();
  }, [currentUser, isOwner, profileUserId]);

  useEffect(() => {
    if (!isOwner) return;
    async function fetchBlockedUsers() {
      setBlockedUsersLoading(true);
      try {
        const res = await fetch(`${API_URL}/users/blocked`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setBlockedUsers(data.users ?? []);
        }
      } catch {}
      setBlockedUsersLoading(false);
    }
    fetchBlockedUsers();
  }, [isOwner]);

  useEffect(() => {
    async function fetchWallet() {
      setWalletLoading(true);
      try {
        const url = isOwner
          ? `${API_URL}/feedback/points/me`
          : `${API_URL}/feedback/points/${profileUserId}`;
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) setWallet(await res.json());
      } catch {}
      setWalletLoading(false);
    }
    fetchWallet();
  }, [profileUserId, isOwner]);

  useEffect(() => {
    async function fetchSubmissions() {
      setSubLoading(true);
      try {
        const url = isOwner
          ? `${API_URL}/feedback/submissions/mine?page=${subPage}&limit=10`
          : `${API_URL}/feedback/submissions?userId=${profileUserId}&page=${subPage}&limit=10`;
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.items ?? []);
          setSubTotalPages(data.pages ?? 1);
        }
      } catch {}
      setSubLoading(false);
    }
    fetchSubmissions();
  }, [profileUserId, isOwner, subPage]);

  useEffect(() => {
    async function fetchCritiques() {
      setCritiqueLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/feedback/responses/by-user/${profileUserId}?page=${critiquePage}&limit=10`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setCritiquesGiven(data.items ?? data.responses ?? []);
          setCritiqueTotalPages(data.pages ?? data.totalPages ?? 1);
        }
      } catch {}
      setCritiqueLoading(false);
    }
    fetchCritiques();
  }, [profileUserId, critiquePage]);

  useEffect(() => {
    async function fetchStories() {
      setStoryLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/discovery?userId=${profileUserId}&page=${storyPage}&limit=9`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          const userStories = (data.stories ?? []).filter(s => s.userId === profileUserId || s.user?.id === profileUserId);
          setApprovedStories(userStories);
          setStoryTotalPages(data.totalPages ?? 1);
        }
        if (isOwner) {
          const pendingRes = await fetch(`${API_URL}/discovery/pending?limit=50`, { credentials: "include" });
          if (pendingRes.ok) {
            const pendingData = await pendingRes.json();
            setPendingStories((pendingData.stories ?? []).filter(s => s.userId === profileUserId));
          }
        }
      } catch {}
      setStoryLoading(false);
    }
    fetchStories();
  }, [profileUserId, isOwner, storyPage]);

  useEffect(() => {
    async function fetchSnippets() {
      setSnippetLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/snippets/user/${profileUserId}?page=${snippetPage}&limit=6`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setSnippets(data.snippets ?? []);
          setSnippetTotalPages(data.totalPages ?? 1);
        }
      } catch {}
      setSnippetLoading(false);
    }
    fetchSnippets();
  }, [profileUserId, snippetPage]);

  // ── Actions ──
  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/${deleteTarget.id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete.");
      setSubmissions(prev => prev.filter(s => s.id !== deleteTarget.id));
      setToast({ type: "success", message: data.refunded ? `Submission deleted. ${data.pointsRefunded} pts refunded.` : "Submission deleted." });
    } catch (e) { setToast({ type: "error", message: e.message }); }
    setDeleteTarget(null);
    setActionLoading(false);
  }

  async function confirmMoveToDraft() {
    if (!moveToDraftTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/drafts/unpublish/${moveToDraftTarget.id}`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to move to draft.");
      setSubmissions(prev => prev.filter(s => s.id !== moveToDraftTarget.id));
      setToast({ type: "success", message: `"${moveToDraftTarget.title}" moved to your drafts.` });
    } catch (e) { setToast({ type: "error", message: e.message }); }
    setMoveToDraftTarget(null);
    setActionLoading(false);
  }

  async function confirmDeleteStory() {
    if (!deleteStoryTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/discovery/${deleteStoryTarget.id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete story.");
      setApprovedStories(prev => prev.filter(s => s.id !== deleteStoryTarget.id));
      setPendingStories(prev => prev.filter(s => s.id !== deleteStoryTarget.id));
      setToast({ type: "success", message: "Story deleted successfully." });
    } catch (e) { setToast({ type: "error", message: e.message }); }
    setDeleteStoryTarget(null);
    setActionLoading(false);
  }

  async function handleBlock() {
    setBlockLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${profileUserId}/block`, { method: "POST", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed to block."); }
      setIsBlockedByMe(true);
      setBlockConfirm(false);
      setToast({ type: "success", message: `${profileUser?.username} has been blocked.` });
    } catch (e) { setToast({ type: "error", message: e.message }); }
    setBlockLoading(false);
  }

  async function handleUnblock() {
    setBlockLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${profileUserId}/block`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed to unblock."); }
      setIsBlockedByMe(false);
      setToast({ type: "success", message: `${profileUser?.username} has been unblocked.` });
    } catch (e) { setToast({ type: "error", message: e.message }); }
    setBlockLoading(false);
  }

  async function handleOwnerUnblock() {
    if (!unblockTarget) return;
    setUnblockLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${unblockTarget.id}/block`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed to unblock."); }
      setBlockedUsers(prev => prev.filter(u => u.id !== unblockTarget.id));
      setToast({ type: "success", message: `${unblockTarget.username} has been unblocked.` });
    } catch (e) { setToast({ type: "error", message: e.message }); }
    setUnblockTarget(null);
    setUnblockLoading(false);
  }

  const joinedDate = profileUser?.createdAt ? formatDate(profileUser.createdAt) : null;
  const tabs = TAB_DEFS(isOwner, profileUser?.username);

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f9f6f1]">
      <Header />

      {/* ── PROFILE HERO ──────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 220 }}>
        {profileUser?.avatar && !userLoading ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${profileUser.avatar})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              filter: "blur(24px) brightness(0.45) saturate(1.2)",
              transform: "scale(1.1)",
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #1e2235 0%, #2d3748 60%, #3b4a6b 100%)" }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.60) 100%)" }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-end">

            {/* Avatar */}
            <div className="flex-shrink-0">
              {userLoading ? (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/10 animate-pulse" />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white/30 bg-white/10 shadow-2xl ring-1 ring-white/10">
                  {profileUser?.avatar ? (
                    <img src={profileUser.avatar} alt={profileUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-serif text-4xl text-white/70">
                        {profileUser?.username?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {userLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-40 bg-white/10 rounded-lg animate-pulse" />
                  <div className="h-4 w-28 bg-white/10 rounded-lg animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="font-serif text-2xl sm:text-3xl text-white leading-tight drop-shadow-lg">
                      {profileUser?.username}
                    </h1>
                    {profileUser?.role === "FOUNDING_WRITER" && (
                      <span className="text-[11px] font-semibold text-white bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                        Founding Writer
                      </span>
                    )}
                    {profileUser?.role === "ADMIN" && (
                      <span className="text-[11px] font-semibold text-white bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                        Admin
                      </span>
                    )}
                  </div>
                  {joinedDate && (
                    <p className="text-sm text-white/60 mb-2">Member since {joinedDate}</p>
                  )}
                  {profileUser?.bio && (
                    <p className="text-sm text-white/80 leading-relaxed max-w-xl">
                      {profileUser.bio}
                    </p>
                  )}
                  {/* Social links */}
                  {(() => {
                    const links = (() => {
                      const raw = profileUser?.socialLinks;
                      if (!raw) return [];
                      try {
                        const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
                        return Array.isArray(arr) ? arr.filter(l => l.platform && l.url) : [];
                      } catch { return []; }
                    })();
                    if (links.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {links.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/70 hover:text-[#d4af37] transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            {link.platform}
                          </a>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">
              {isOwner && !userLoading && (
                <Link
                  to="/settings"
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/25 text-sm text-white hover:bg-white/20 transition-all font-medium backdrop-blur-sm"
                >
                  Edit profile
                </Link>
              )}
              {!isOwner && currentUser && !userLoading && (
                isBlockedByMe ? (
                  <button
                    onClick={handleUnblock}
                    disabled={blockLoading}
                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/25 text-sm text-white/80 hover:bg-white/20 transition-all font-medium backdrop-blur-sm disabled:opacity-50"
                  >
                    {blockLoading ? "Unblocking…" : "Unblock"}
                  </button>
                ) : (
                  <button
                    onClick={() => setBlockConfirm(true)}
                    disabled={blockLoading}
                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/25 text-sm text-white/80 hover:bg-red-500/60 hover:border-red-400/50 transition-all font-medium backdrop-blur-sm disabled:opacity-50"
                  >
                    Block
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB NAV ───────────────────────────────────────────────────────── */}
      <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-20">

        {/* Toast */}
        {toast && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl text-sm border flex items-center justify-between ${
              toast.type === "success"
                ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]"
                : "bg-[#fdf1f0] border-[#f5c6c3] text-[#c0392b]"
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-4 opacity-60 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── SUBMISSIONS TAB ─────────────────────────────────────────── */}
        {activeTab === "submissions" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <h2 className="font-serif text-xl text-[#1e2a38]">
                  {isOwner ? "My Submissions" : "Feedback Submissions"}
                </h2>
                {!subLoading && (
                  <span className="text-[11px] font-semibold text-[#9a8c7a] bg-[#f4f1ec] border border-[#e8e0d0] px-2 py-0.5 rounded-full tabular-nums">
                    {submissions.length}
                  </span>
                )}
              </div>
              <Link to="/critique" className="text-sm text-[#9a8c7a] hover:text-[#2d3748] transition-colors">
                Feedback Hub →
              </Link>
            </div>

            {subLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="border border-[#e8e0d0] rounded-2xl p-5">
                    <div className="flex gap-2 mb-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-2/3 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : submissions.length === 0 ? (
              <EmptyState
                message="No submissions yet"
                cta={isOwner ? "Submit a chapter" : undefined}
                ctaTo={isOwner ? "/critique/submit" : undefined}
              />
            ) : (
              <>
                <div className="space-y-3">
                  {submissions.map(sub => (
                    <SubmissionRow
                      key={sub.id}
                      sub={sub}
                      isOwner={isOwner}
                      onDelete={setDeleteTarget}
                      onMoveToDraft={setMoveToDraftTarget}
                    />
                  ))}
                </div>
                <Pagination page={subPage} totalPages={subTotalPages} onChange={setSubPage} />
              </>
            )}
          </div>
        )}

        {/* ── CRITIQUES TAB ───────────────────────────────────────────── */}
        {activeTab === "critiques" && (
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <h2 className="font-serif text-xl text-[#1e2a38]">
                {isOwner ? "Critiques I've Given" : "Critiques Given"}
              </h2>
              {!critiqueLoading && (
                <span className="text-[11px] font-semibold text-[#9a8c7a] bg-[#f4f1ec] border border-[#e8e0d0] px-2 py-0.5 rounded-full tabular-nums">
                  {critiquesGiven.length}
                </span>
              )}
            </div>

            {critiqueLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="border border-[#e8e0d0] rounded-2xl p-5">
                    <div className="flex gap-2 mb-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            ) : critiquesGiven.length === 0 ? (
              <EmptyState
                message="No critiques given yet"
                cta={isOwner ? "Browse submissions" : undefined}
                ctaTo={isOwner ? "/feedback" : undefined}
              />
            ) : (
              <>
                <div className="space-y-3">
                  {critiquesGiven.map(r => (
                    <CritiqueRow key={r.id} response={r} />
                  ))}
                </div>
                <Pagination page={critiquePage} totalPages={critiqueTotalPages} onChange={setCritiquePage} />
              </>
            )}
          </div>
        )}

        {/* ── SNIPPETS TAB ────────────────────────────────────────────── */}
        {activeTab === "snippets" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <h2 className="font-serif text-xl text-[#1e2a38]">Writing Snippets</h2>
                {!snippetLoading && (
                  <span className="text-[11px] font-semibold text-[#9a8c7a] bg-[#f4f1ec] border border-[#e8e0d0] px-2 py-0.5 rounded-full tabular-nums">
                    {snippets.length}
                  </span>
                )}
              </div>
              <Link to="/snippets" className="text-sm text-[#9a8c7a] hover:text-[#2d3748] transition-colors">
                All snippets →
              </Link>
            </div>
            <p className="text-sm text-[#9a8c7a] mb-5 leading-relaxed">
              {isOwner
                ? "Your daily writing shared with the community."
                : `Writing ${profileUser?.username ?? "this writer"} has shared with the community.`}
            </p>

            {snippetLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-[#e8e0d0] rounded-2xl p-4">
                    <Skeleton className="h-28 w-full rounded-xl mb-3" />
                    <Skeleton className="h-4 w-2/3 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : snippets.length === 0 ? (
              <EmptyState
                message="No writing snippets shared yet"
                cta={isOwner ? "Share a snippet" : undefined}
                ctaTo={isOwner ? "/snippets/new" : undefined}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {snippets.map(s => <SnippetCard key={s.id} snippet={s} />)}
                </div>
                <Pagination page={snippetPage} totalPages={snippetTotalPages} onChange={setSnippetPage} />
              </>
            )}
          </div>
        )}

        {/* ── STORIES TAB ─────────────────────────────────────────────── */}
        {activeTab === "stories" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <h2 className="font-serif text-xl text-[#1e2a38]">Discovery Stories</h2>
                {!storyLoading && (
                  <span className="text-[11px] font-semibold text-[#9a8c7a] bg-[#f4f1ec] border border-[#e8e0d0] px-2 py-0.5 rounded-full tabular-nums">
                    {approvedStories.length}
                  </span>
                )}
              </div>
              <Link to="/stories" className="text-sm text-[#9a8c7a] hover:text-[#2d3748] transition-colors">
                Discovery page →
              </Link>
            </div>

            {storyLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-[#e8e0d0] rounded-2xl overflow-hidden">
                    <Skeleton className="h-36 w-full rounded-none" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : approvedStories.length === 0 ? (
              <EmptyState
                message="No approved stories yet"
                cta={isOwner ? "Share a story" : undefined}
                ctaTo={isOwner ? "/stories/submit" : undefined}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {approvedStories.map(s => (
                    <DiscoveryCard
                      key={s.id}
                      story={s}
                      isOwner={isOwner}
                      onDeleteStory={isOwner ? setDeleteStoryTarget : null}
                    />
                  ))}
                </div>
                <Pagination page={storyPage} totalPages={storyTotalPages} onChange={setStoryPage} />
              </>
            )}

            {/* Pending stories — owner only */}
            {isOwner && !storyLoading && pendingStories.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2.5 mb-4">
                  <h3 className="font-serif text-lg text-[#1e2a38]">Awaiting Approval</h3>
                  <span className="text-[11px] font-semibold text-[#9a8c7a] bg-[#f4f1ec] border border-[#e8e0d0] px-2 py-0.5 rounded-full">
                    {pendingStories.length}
                  </span>
                </div>
                <p className="text-sm text-[#9a8c7a] mb-4 leading-relaxed">
                  These stories are under review and not yet visible to others.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingStories.map(s => (
                    <DiscoveryCard
                      key={s.id}
                      story={s}
                      isOwner={true}
                      onDeleteStory={setDeleteStoryTarget}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STANDING TAB ────────────────────────────────────────────── */}
        {activeTab === "standing" && (
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <h2 className="font-serif text-xl text-[#1e2a38]">Feedback Standing</h2>
              {wallet?.tier?.name && (
                <span className="text-[11px] font-semibold text-[#9a8c7a] bg-[#f4f1ec] border border-[#e8e0d0] px-2 py-0.5 rounded-full">
                  {wallet.tier.name}
                </span>
              )}
            </div>
            {walletLoading ? (
              <Skeleton className="h-28 w-full rounded-2xl" />
            ) : (
              <WalletCard wallet={wallet} isOwner={isOwner} />
            )}
          </div>
        )}

        {/* ── BLOCKED USERS TAB — owner only ──────────────────────────── */}
        {activeTab === "blocked" && isOwner && (
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <h2 className="font-serif text-xl text-[#1e2a38]">Blocked Users</h2>
              {!blockedUsersLoading && (
                <span className="text-[11px] font-semibold text-[#9a8c7a] bg-[#f4f1ec] border border-[#e8e0d0] px-2 py-0.5 rounded-full tabular-nums">
                  {blockedUsers.length}
                </span>
              )}
            </div>
            <p className="text-sm text-[#9a8c7a] mb-5 leading-relaxed">
              These writers cannot leave critiques or paragraph comments on your submissions. Only you can see this list.
            </p>

            {blockedUsersLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[#e8e0d0]">
                    <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-7 w-20 ml-auto rounded-lg" />
                  </div>
                ))}
              </div>
            ) : blockedUsers.length === 0 ? (
              <EmptyState message="No blocked users" />
            ) : (
              <div className="space-y-2">
                {blockedUsers.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#e8e0d0] bg-[#faf8f5] hover:border-[#c4b8a8] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-[#e8e0d0] flex-shrink-0 border border-[#ddd5c8]">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-serif text-sm text-[#9a8c7a]">
                            {u.username?.[0]?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/profile/${u.id}`}
                      className="flex-1 min-w-0 text-sm font-medium text-[#2d3748] hover:text-[#1e2a38] truncate transition-colors"
                    >
                      {u.username}
                    </Link>
                    <button
                      onClick={() => setUnblockTarget(u)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[#e8e0d0] text-xs font-medium text-[#7a6e62] hover:border-[#2d3748] hover:text-[#2d3748] transition-all"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {isOwner && deleteTarget && (
        <ConfirmModal
          title="Delete submission?"
          body={
            (deleteTarget._count?.responses ?? 0) === 0 && !deleteTarget.wasFreePost && deleteTarget.pointsCost > 0
              ? `This will permanently delete "${deleteTarget.title}" and refund ${deleteTarget.pointsCost} pts (no critiques yet).`
              : `This will permanently delete "${deleteTarget.title}". Points will not be refunded since critiques have been received.`
          }
          confirmLabel={actionLoading ? "Deleting..." : "Delete"}
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {isOwner && moveToDraftTarget && (
        <ConfirmModal
          title="Move to drafts?"
          body={`"${moveToDraftTarget.title}" will be removed from the Critique Hub and moved to your drafts. All critiques and comments are preserved — you can edit and republish it any time.`}
          confirmLabel={actionLoading ? "Moving..." : "Move to draft"}
          danger={false}
          onConfirm={confirmMoveToDraft}
          onCancel={() => setMoveToDraftTarget(null)}
        />
      )}
      {isOwner && deleteStoryTarget && (
        <ConfirmModal
          title="Delete story?"
          body={`This will permanently delete "${deleteStoryTarget.title}" from the Discovery page.`}
          confirmLabel={actionLoading ? "Deleting..." : "Delete story"}
          danger
          onConfirm={confirmDeleteStory}
          onCancel={() => setDeleteStoryTarget(null)}
        />
      )}
      {!isOwner && blockConfirm && (
        <ConfirmModal
          title={`Block ${profileUser?.username}?`}
          body={`${profileUser?.username} won't be able to leave critiques or paragraph comments on your submissions, and you won't be able to comment on theirs.`}
          confirmLabel={blockLoading ? "Blocking…" : "Block"}
          danger
          onConfirm={handleBlock}
          onCancel={() => setBlockConfirm(false)}
        />
      )}
      {isOwner && unblockTarget && (
        <ConfirmModal
          title={`Unblock ${unblockTarget.username}?`}
          body={`${unblockTarget.username} will be able to leave critiques and paragraph comments on your submissions again.`}
          confirmLabel={unblockLoading ? "Unblocking…" : "Unblock"}
          danger={false}
          onConfirm={handleOwnerUnblock}
          onCancel={() => setUnblockTarget(null)}
        />
      )}
    </div>
  );
}