// src/components/feedbackHub/mySubmissions.jsx
//
// Fetches the logged-in user's own critique submissions and their wallet/reputation.
// Supports edit, delete, and move-to-draft actions per submission via a dropdown.
// Add to main.jsx under the Layout as: { path: "mycritique", element: <MySubmissions /> }

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";

import API_URL from "@/config/api";

// ── Icons ─────────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="19" r="1" fill="currentColor" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

const DraftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const MessageIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const WordsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7V4h16v3" />
    <path d="M9 20h6" />
    <path d="M12 4v16" />
  </svg>
);

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CoinsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1110.34 18" />
    <path d="M7 6h1v4" />
    <path d="M16.71 13.88L17.7 14.5" />
  </svg>
);

const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" style={{ color: "#c2b8a8" }}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 15l3-3 3 3" />
    <path d="M12 12v6" />
  </svg>
);

// ── Tier config ───────────────────────────────────────────────────────────────

const TIER_COLORS = {
  Bronze:   { bg: "#fdf4ec", text: "#a0522d", border: "#f0c8a0" },
  Silver:   { bg: "#f4f5f6", text: "#6b7280", border: "#d1d5db" },
  Gold:     { bg: "#fefce8", text: "#92400e", border: "#fde68a" },
  Platinum: { bg: "#f3f0ff", text: "#5b21b6", border: "#c4b5fd" },
  Diamond:  { bg: "#fff1ee", text: "#b91c1c", border: "#fca5a5" },
};

const STATUS_CONFIG = {
  SPOTLIGHT: { label: "Spotlight",  bg: "#fdf9ed", text: "#b8860b", border: "#f0d98c", dot: "#d4af37" },
  QUEUE:     { label: "Queue",      bg: "#f0f7ff", text: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6" },
  ARCHIVE:   { label: "Archive",    bg: "#f5f5f5", text: "#737373", border: "#e5e5e5", dot: "#a3a3a3" },
  DRAFT:     { label: "Draft",      bg: "#fdf4ec", text: "#a0522d", border: "#f0c8a0", dot: "#d97706" },
};

const TIER_WORD_LABELS = {
  TIER_1000: "≤1,000 words",
  TIER_2000: "≤2,000 words",
  TIER_3000: "≤3,000 words",
  TIER_4000: "≤4,000 words",
  TIER_5000: "≤5,000 words",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Dropdown menu ──────────────────────────────────────────────────────────────

function ActionMenu({ submission, onEdit, onDelete, onMoveToDraft }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const canMoveToDraft = submission.status === "QUEUE" || submission.status === "SPOTLIGHT";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[#f5f0e8] text-[#9a8c7a]"
        aria-label="Actions"
      >
        <DotsIcon />
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 z-50 w-44 bg-white rounded-xl border border-[#e8e0d0] shadow-lg py-1 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setOpen(false); onEdit(submission); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[#3d3730] hover:bg-[#faf7f2] transition-colors"
          >
            <span className="text-[#b8860b]"><EditIcon /></span>
            Edit submission
          </button>

          {canMoveToDraft && (
            <button
              onClick={() => { setOpen(false); onMoveToDraft(submission); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-[#3d3730] hover:bg-[#faf7f2] transition-colors"
            >
              <span className="text-[#9a8c7a]"><DraftIcon /></span>
              Move to drafts
            </button>
          )}

          <div className="border-t border-[#f0ebe3] my-1" />

          <button
            onClick={() => { setOpen(false); onDelete(submission); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
          >
            <TrashIcon />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Confirm modal ──────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, danger = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl border border-[#e8e0d0] shadow-2xl w-full max-w-md p-6">
        <h3 className="font-serif text-[17px] font-bold text-[#1a1a2e] mb-2">{title}</h3>
        <p className="text-[14px] text-[#737373] leading-relaxed mb-6">{message}</p>
        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#737373] hover:bg-[#f5f0e8] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              danger
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-[#d4af37] text-white hover:bg-[#b8960f]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ── Wallet bar ─────────────────────────────────────────────────────────────────

function WalletBar({ wallet, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[#e8e0d0] rounded-xl p-4 animate-pulse">
            <div className="h-3 w-16 bg-[#f0ebe3] rounded mb-2" />
            <div className="h-6 w-10 bg-[#f0ebe3] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!wallet) return null;

  const tierCfg = TIER_COLORS[wallet.tier?.name] ?? TIER_COLORS.Bronze;

  const stats = [
    {
      label: "Posting balance",
      value: wallet.postingBalance ?? 0,
      icon: <CoinsIcon />,
      iconColor: "#b8860b",
      suffix: "pts",
    },
    {
      label: "Reputation",
      value: wallet.reputation ?? 0,
      icon: <StarIcon />,
      iconColor: "#d4af37",
      suffix: "pts",
    },
    {
      label: "Critiques given",
      value: wallet.critiqueGiven ?? 0,
      icon: <MessageIcon />,
      iconColor: "#6b7280",
      suffix: "",
    },
    {
      label: "Tier",
      value: wallet.tier?.name ?? "Bronze",
      icon: null,
      iconColor: tierCfg.text,
      suffix: "",
      isTier: true,
      tierCfg,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white border border-[#e8e0d0] rounded-xl p-4"
          style={s.isTier ? { borderColor: s.tierCfg.border, background: s.tierCfg.bg } : {}}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2b8a8] mb-1.5">{s.label}</p>
          <div className="flex items-center gap-1.5">
            {s.icon && <span style={{ color: s.iconColor }}>{s.icon}</span>}
            <span
              className="text-[20px] font-bold leading-none"
              style={{ color: s.isTier ? s.tierCfg.text : "#1a1a2e" }}
            >
              {s.value}
            </span>
            {s.suffix && <span className="text-[11px] text-[#9a8c7a] mt-0.5">{s.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Submission card ────────────────────────────────────────────────────────────

function SubmissionCard({ submission, onEdit, onDelete, onMoveToDraft }) {
  const navigate = useNavigate();
  const critiques = submission._count?.responses ?? 0;
  const comments  = submission._count?.paragraphComments ?? 0;

  return (
    <div
      className="group bg-white border border-[#e8e0d0] rounded-xl p-5 hover:border-[#d4af37] hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(`/critique/${submission.id}`)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge status={submission.status} />
            <span className="text-[11px] text-[#c2b8a8]">{timeAgo(submission.createdAt)}</span>
          </div>
          <h3 className="font-serif text-[16px] font-bold text-[#1a1a2e] leading-snug truncate group-hover:text-[#b8860b] transition-colors">
            {submission.title}
          </h3>
          <p className="text-[12px] text-[#9a8c7a] mt-0.5">{submission.genre}</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            submission={submission}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveToDraft={onMoveToDraft}
          />
        </div>
      </div>

      {/* Summary */}
      {submission.summary && (
        <p className="text-[13px] text-[#4a4a4a] leading-relaxed mb-4 line-clamp-2">
          {submission.summary}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-4 text-[12px] text-[#9a8c7a] flex-wrap">
        <span className="flex items-center gap-1.5">
          <WordsIcon />
          {TIER_WORD_LABELS[submission.wordCountTier] ?? submission.wordCountTier}
          {submission.actualWordCount ? ` · ${submission.actualWordCount.toLocaleString()} actual` : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageIcon />
          {critiques} {critiques === 1 ? "critique" : "critiques"}
        </span>
        {comments > 0 && (
          <span className="flex items-center gap-1.5 text-[#b8860b]">
            <MessageIcon />
            {comments} inline
          </span>
        )}
        {submission.pointsCost !== undefined && (
          <span className="flex items-center gap-1.5 ml-auto text-[#b8860b] font-medium">
            <CoinsIcon />
            {submission.pointsCost === 0 ? "Free post" : `${submission.pointsCost} pts`}
          </span>
        )}
      </div>

      {/* Feedback wanted tags */}
      {submission.feedbackWanted?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#f5f0e8]">
          {submission.feedbackWanted.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#fdf9ed] text-[#b8860b] border border-[#f0d98c]"
            >
              {tag}
            </span>
          ))}
          {submission.feedbackWanted.length > 3 && (
            <span className="px-2 py-0.5 rounded-md text-[11px] text-[#9a8c7a] bg-[#f5f0e8]">
              +{submission.feedbackWanted.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <EmptyIcon />
      <h3 className="mt-4 font-serif text-[18px] font-bold text-[#1a1a2e]">No submissions yet</h3>
      <p className="mt-2 text-[14px] text-[#9a8c7a] max-w-xs leading-relaxed">
        Share a chapter with the community and start collecting feedback that sharpens your writing.
      </p>
      <Link
        to="/critique/submit"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4af37] text-white text-[13px] font-semibold hover:bg-[#b8960f] transition-colors"
      >
        <PlusIcon />
        Submit a chapter
      </Link>
    </div>
  );
}

// ── Filter tabs ────────────────────────────────────────────────────────────────

const FILTERS = [
  { value: "ALL",       label: "All" },
  { value: "SPOTLIGHT", label: "Spotlight" },
  { value: "QUEUE",     label: "Queue" },
  { value: "ARCHIVE",   label: "Archive" },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MySubmissions() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [wallet, setWallet]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [walletLoading, setWalletLoading] = useState(true);
  const [error, setError]             = useState(null);
  const [filter, setFilter]           = useState("ALL");

  // Modals
  const [deleteTarget, setDeleteTarget]         = useState(null);
  const [draftTarget, setDraftTarget]           = useState(null);
  const [actionLoading, setActionLoading]       = useState(false);
  const [toast, setToast]                       = useState(null);

  // ── Fetch ──

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/feedback/submissions/mine`, {
          credentials: "include",
        });
        if (!res.ok) {
          const text = await res.text();
          let msg = `Failed to load submissions (${res.status}).`;
          try { msg = JSON.parse(text).message ?? msg; } catch {}
          throw new Error(msg);
        }
        const data = await res.json();
        setSubmissions(Array.isArray(data) ? data : data.submissions ?? data.items ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadWallet() {
      setWalletLoading(true);
      try {
        const res = await fetch(`${API_URL}/feedback/points/me`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setWallet(data);
      } catch {
        // wallet is non-critical; silently skip
      } finally {
        setWalletLoading(false);
      }
    }
    loadWallet();
  }, []);

  // ── Toast ──

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Actions ──

  function handleEdit(submission) {
    navigate(`/critique/${submission.id}/edit`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Delete failed.");
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToast("Submission deleted.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  }

  async function handleMoveToDraft() {
    if (!draftTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/${draftTarget.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Could not move to draft.");
      }
      const updated = await res.json();
      setSubmissions((prev) =>
        prev.map((s) => (s.id === draftTarget.id ? { ...s, status: updated.status ?? "DRAFT" } : s))
      );
      showToast("Moved to drafts.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
      setDraftTarget(null);
    }
  }

  // ── Filtered view ──

  const filtered = filter === "ALL"
    ? submissions
    : submissions.filter((s) => s.status === filter);

  const counts = {
    ALL:       submissions.length,
    SPOTLIGHT: submissions.filter((s) => s.status === "SPOTLIGHT").length,
    QUEUE:     submissions.filter((s) => s.status === "QUEUE").length,
    ARCHIVE:   submissions.filter((s) => s.status === "ARCHIVE").length,
  };

  // ── Skeleton ──

  if (loading) {
    return (
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-[860px] mx-auto">
        <div className="h-8 w-48 bg-[#f0ebe3] rounded animate-pulse mb-1" />
        <div className="h-4 w-64 bg-[#f0ebe3] rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-20 bg-[#f0ebe3] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-44 bg-[#f0ebe3] rounded-xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-[860px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1a1a2e] leading-tight">
            My Submissions
          </h1>
          <p className="text-[14px] text-[#9a8c7a] mt-0.5">
            {submissions.length === 0
              ? "You haven't submitted any chapters yet."
              : `${submissions.length} chapter${submissions.length === 1 ? "" : "s"} submitted for critique`}
          </p>
        </div>
        <Link
          to="/critique/submit"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d4af37] text-white text-[13px] font-semibold hover:bg-[#b8960f] transition-colors shadow-sm"
        >
          <PlusIcon />
          <span className="hidden sm:inline">Submit</span>
        </Link>
      </div>

      {/* ── Wallet bar ── */}
      <div className="mt-5">
        <WalletBar wallet={wallet} loading={walletLoading} />
      </div>

      {/* ── Filter tabs ── */}
      {submissions.length > 0 && (
        <div className="flex gap-1 p-1 bg-[#f5f0e8] rounded-xl mb-5 w-fit">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                filter === value
                  ? "bg-white text-[#1a1a2e] shadow-sm"
                  : "text-[#9a8c7a] hover:text-[#3d3730]"
              }`}
            >
              {label}
              {counts[value] > 0 && (
                <span className={`ml-1.5 text-[10px] ${filter === value ? "text-[#b8860b]" : "text-[#c2b8a8]"}`}>
                  {counts[value]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-600 mb-5">
          {error}
        </div>
      )}

      {/* ── List ── */}
      {submissions.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-[14px] text-[#9a8c7a]">
          No {filter.toLowerCase()} submissions.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((sub) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
              onMoveToDraft={setDraftTarget}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete this submission?"
          message={`"${deleteTarget.title}" and all its critiques will be permanently removed. This cannot be undone.`}
          confirmLabel={actionLoading ? "Deleting…" : "Delete"}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}

      {draftTarget && (
        <ConfirmModal
          title="Move to drafts?"
          message={`"${draftTarget.title}" will be withdrawn from the critique queue. Critiques already written will remain visible to you, but no new ones can be added.`}
          confirmLabel={actionLoading ? "Moving…" : "Move to drafts"}
          onConfirm={handleMoveToDraft}
          onCancel={() => setDraftTarget(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-[13px] font-medium shadow-lg z-50 transition-all ${
            toast.type === "error"
              ? "bg-red-500 text-white"
              : "bg-[#1a1a2e] text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </main>
  );
}