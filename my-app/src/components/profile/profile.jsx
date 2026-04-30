import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TIER_LABELS = {
  TIER_1000: "1,000 words",
  TIER_2000: "2,000 words",
  TIER_3000: "3,000 words",
  TIER_4000: "4,000 words",
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
      {/* Tier badge */}
      <div className="flex items-center justify-between">
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
      </div>

      {/* Stats row */}
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

// ─── SUBMISSION ROW ───────────────────────────────────────────────────────────

function SubmissionRow({ sub, isOwner, onDelete, onClose }) {
  const responses = sub._count?.responses ?? 0;
  const comments = sub._count?.paragraphComments ?? 0;

  return (
    <div className="group bg-white border border-[#e8e0d0] rounded-2xl p-5 transition-all hover:border-[#c4b8a8] hover:shadow-sm">
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
            sub.isOpen
              ? "text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0]"
              : "text-[#9a8c7a] bg-[#f4f1ec] border border-[#e0d8cc]"
          }`}
        >
          {sub.isOpen ? "Open" : "Closed"}
        </span>
      </div>

      <Link
        to={`/feedback/${sub.id}`}
        className="block font-serif text-[#1e2a38] text-base leading-snug mb-1.5 hover:text-[#2d3748] transition-colors line-clamp-1"
      >
        {sub.title}
      </Link>

      <p className="text-xs text-[#9a8c7a] leading-relaxed mb-4 line-clamp-2">{sub.summary}</p>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#f0ebe3]">
        <div className="flex items-center gap-3 text-xs text-[#b0a090]">
          <span>{responses} {responses === 1 ? "critique" : "critiques"}</span>
          <span className="w-1 h-1 rounded-full bg-[#e0d8cc] inline-block" />
          <span>{comments} comments</span>
          <span className="w-1 h-1 rounded-full bg-[#e0d8cc] inline-block" />
          <span>{timeAgo(sub.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/feedback/${sub.id}`}
            className="px-3 py-1.5 rounded-lg border border-[#e8e0d0] text-xs text-[#6b5c4a] hover:border-[#2d3748] hover:text-[#2d3748] transition-all font-medium"
          >
            View
          </Link>
          {isOwner && sub.isOpen && (
            <button
              onClick={() => onClose(sub)}
              className="px-3 py-1.5 rounded-lg border border-[#e8e0d0] text-xs text-[#6b5c4a] hover:border-[#2d3748] hover:text-[#2d3748] transition-all font-medium"
            >
              Close
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => onDelete(sub)}
              className="px-3 py-1.5 rounded-lg border border-[#f5c6c3] text-xs text-[#c0392b] bg-[#fdf1f0] hover:bg-[#fbe8e6] transition-all font-medium"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DISCOVERY CARD ───────────────────────────────────────────────────────────

function DiscoveryCard({ story, isOwner }) {
  const isPending = !story.isApproved;

  return (
    <div className={`group bg-white border rounded-2xl overflow-hidden transition-all hover:shadow-sm ${
      isPending ? "border-[#f0d98a] bg-[#fdfbea]" : "border-[#e8e0d0] hover:border-[#c4b8a8]"
    }`}>
      {/* Cover image */}
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
        {/* Badges */}
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

        <div className="flex items-center justify-between pt-2.5 border-t border-[#f0ebe3]">
          <span className="text-[11px] text-[#b0a090]">{formatDate(story.createdAt)}</span>
          <span className="text-[11px] text-[#9a8c7a]">
            {story._count?.likes ?? 0} {story._count?.likes === 1 ? "like" : "likes"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────

function Section({ title, action, children }) {
  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-xl text-[#1e2a38]">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

function EmptyState({ message, cta, ctaTo }) {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl px-6 py-12 text-center">
      <div className="w-10 h-10 rounded-xl bg-[#f4f1ec] border border-[#e8e0d0] flex items-center justify-center mx-auto mb-4">
        <svg className="w-4.5 h-4.5 text-[#b8a898]" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user: currentUser } = useAuth();
  const { userId } = useParams();

  const profileUserId = Number(userId);
  const isOwner = currentUser && currentUser.id === profileUserId;

  // ── State ──
  const [profileUser, setProfileUser]   = useState(null);
  const [wallet, setWallet]             = useState(null);
  const [userLoading, setUserLoading]   = useState(true);
  const [walletLoading, setWalletLoading] = useState(true);

  // Submissions
  const [submissions, setSubmissions]   = useState([]);
  const [subLoading, setSubLoading]     = useState(true);
  const [subPage, setSubPage]           = useState(1);
  const [subTotalPages, setSubTotalPages] = useState(1);

  // Discovery stories
  const [stories, setStories]           = useState([]);
  const [storyLoading, setStoryLoading] = useState(true);
  const [storyPage, setStoryPage]       = useState(1);
  const [storyTotalPages, setStoryTotalPages] = useState(1);
  const [pendingStories, setPendingStories]   = useState([]);

  // Modal / feedback
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [closeTarget, setCloseTarget]   = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]               = useState(null);

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

  // ── Fetch wallet ──
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

  // ── Fetch submissions ──
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

  // ── Fetch discovery stories ──
  useEffect(() => {
    async function fetchStories() {
      setStoryLoading(true);
      try {
        // Approved stories — public endpoint filtered by userId (add userId param if your API supports it)
        const res = await fetch(
          `${API_URL}/discovery?userId=${profileUserId}&page=${storyPage}&limit=9`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setStories(data.stories ?? []);
          setStoryTotalPages(data.totalPages ?? 1);
        }

        // Pending stories — only fetch for the owner
        if (isOwner) {
          const pendingRes = await fetch(
            `${API_URL}/discovery/pending?limit=50`,
            { credentials: "include" }
          );
          if (pendingRes.ok) {
            const pendingData = await pendingRes.json();
            // Filter to only this user's own pending stories
            const myPending = (pendingData.stories ?? []).filter(
              (s) => s.userId === profileUserId
            );
            setPendingStories(myPending);
          }
        }
      } catch {}
      setStoryLoading(false);
    }
    fetchStories();
  }, [profileUserId, isOwner, storyPage]);

  // ── Delete submission ──
  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete.");
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setToast({
        type: "success",
        message: data.refunded
          ? `Submission deleted. ${data.pointsRefunded} pts refunded.`
          : "Submission deleted.",
      });
    } catch (e) {
      setToast({ type: "error", message: e.message });
    }
    setDeleteTarget(null);
    setActionLoading(false);
  }

  // ── Close submission ──
  async function confirmClose() {
    if (!closeTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/feedback/submissions/${closeTarget.id}/close`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to close.");
      setSubmissions((prev) =>
        prev.map((s) => (s.id === closeTarget.id ? { ...s, isOpen: false } : s))
      );
      setToast({ type: "success", message: "Submission closed." });
    } catch (e) {
      setToast({ type: "error", message: e.message });
    }
    setCloseTarget(null);
    setActionLoading(false);
  }

  // ── Derived ──
  const approvedStories = stories.filter((s) => s.isApproved);
  const joinedDate = profileUser?.createdAt ? formatDate(profileUser.createdAt) : null;

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f9f6f1]">
      {/* ── Top background strip ─────────────────────────────────── */}
      <div className="h-40 bg-gradient-to-br from-[#2d3748] via-[#3d4f6a] to-[#4a5568] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,.06) 40px, rgba(255,255,255,.06) 80px)",
          }}
        />
      </div>

      {/* ── Main layout ──────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">

        {/* ── Profile header card ───────────────────────────────── */}
        <div className="bg-white border border-[#e8e0d0] rounded-2xl shadow-sm -mt-16 mb-8 p-6 sm:p-8 relative">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar */}
            {userLoading ? (
              <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-[#e8e0d0] bg-[#f4f1ec] flex-shrink-0">
                {profileUser?.avatar ? (
                  <img
                    src={profileUser.avatar}
                    alt={profileUser.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-serif text-3xl text-[#c4b8a8]">
                      {profileUser?.username?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              {userLoading ? (
                <div className="space-y-2 mt-1">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-full max-w-xs mt-3" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h1 className="font-serif text-2xl sm:text-3xl text-[#1e2a38] leading-tight">
                      {profileUser?.username}
                    </h1>
                    {profileUser?.role === "FOUNDING_WRITER" && (
                      <span className="text-[11px] font-semibold text-[#5248a8] bg-[#f2f0fc] border border-[#c4bef0] px-2.5 py-0.5 rounded-full">
                        Founding Writer
                      </span>
                    )}
                    {profileUser?.role === "ADMIN" && (
                      <span className="text-[11px] font-semibold text-[#1e2a38] bg-[#f4f1ec] border border-[#ddd5c8] px-2.5 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  {joinedDate && (
                    <p className="text-xs text-[#b0a090] mb-3">Member since {joinedDate}</p>
                  )}
                  {profileUser?.bio && (
                    <p className="text-sm text-[#6b5c4a] leading-relaxed max-w-2xl">
                      {profileUser.bio}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Edit button (owner) */}
            {isOwner && !userLoading && (
              <Link
                to="/settings"
                className="flex-shrink-0 self-start px-4 py-2 rounded-xl border border-[#ddd5c8] text-sm text-[#6b5c4a] hover:border-[#2d3748] hover:text-[#2d3748] transition-all font-medium"
              >
                Edit profile
              </Link>
            )}
          </div>
        </div>

        {/* ── Two-column layout ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── Left sidebar ─────────────────────────────────────── */}
          <aside className="lg:col-span-1 space-y-6">

            {/* Wallet */}
            <div>
              <h2 className="font-serif text-lg text-[#1e2a38] mb-3">Feedback Standing</h2>
              {walletLoading ? (
                <Skeleton className="h-36 w-full rounded-2xl" />
              ) : wallet ? (
                <WalletCard wallet={wallet} isOwner={isOwner} />
              ) : (
                <div className="bg-white border border-[#e8e0d0] rounded-2xl p-5 text-center">
                  <p className="text-sm text-[#9a8c7a]">No activity yet</p>
                </div>
              )}
            </div>

            {/* Quick stats */}
            {!userLoading && (
              <div className="bg-white border border-[#e8e0d0] rounded-2xl p-5 space-y-3">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-[#b0a090]">Activity</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#7a6e62]">Submissions</span>
                  <span className="font-semibold text-[#1e2a38] tabular-nums">{submissions.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-[#f0ebe3] pt-3">
                  <span className="text-[#7a6e62]">Stories shared</span>
                  <span className="font-semibold text-[#1e2a38] tabular-nums">
                    {approvedStories.length + (isOwner ? pendingStories.length : 0)}
                  </span>
                </div>
                {isOwner && pendingStories.length > 0 && (
                  <div className="flex items-center justify-between text-sm border-t border-[#f0ebe3] pt-3">
                    <span className="text-[#8a6c00]">Awaiting approval</span>
                    <span className="font-semibold text-[#8a6c00] tabular-nums">
                      {pendingStories.length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* ── Right main content ───────────────────────────────── */}
          <main className="lg:col-span-2 space-y-0">

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

            {/* ── FEEDBACK SUBMISSIONS ─────────────────────────── */}
            <Section
              title={isOwner ? "My Submissions" : "Feedback Submissions"}
              action={
                <Link
                  to="/feedback"
                  className="text-sm text-[#9a8c7a] hover:text-[#2d3748] transition-colors"
                >
                  Feedback hub
                </Link>
              }
            >
              {subLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white border border-[#e8e0d0] rounded-2xl p-5">
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
                  ctaTo={isOwner ? "/feedback/submit" : undefined}
                />
              ) : (
                <>
                  <div className="space-y-3">
                    {submissions.map((sub) => (
                      <SubmissionRow
                        key={sub.id}
                        sub={sub}
                        isOwner={isOwner}
                        onDelete={setDeleteTarget}
                        onClose={setCloseTarget}
                      />
                    ))}
                  </div>
                  <Pagination page={subPage} totalPages={subTotalPages} onChange={setSubPage} />
                </>
              )}
            </Section>

            {/* ── DISCOVERY STORIES — APPROVED ─────────────────── */}
            <Section
              title="Discovery Stories"
              action={
                <Link
                  to="/discovery"
                  className="text-sm text-[#9a8c7a] hover:text-[#2d3748] transition-colors"
                >
                  Discovery page
                </Link>
              }
            >
              {storyLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
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
                  ctaTo={isOwner ? "/discovery/submit" : undefined}
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {approvedStories.map((s) => (
                      <DiscoveryCard key={s.id} story={s} isOwner={isOwner} />
                    ))}
                  </div>
                  <Pagination page={storyPage} totalPages={storyTotalPages} onChange={setStoryPage} />
                </>
              )}
            </Section>

            {/* ── PENDING STORIES — owner only ─────────────────── */}
            {isOwner && !storyLoading && pendingStories.length > 0 && (
              <Section title="Awaiting Approval">
                <p className="text-sm text-[#9a8c7a] mb-4 leading-relaxed">
                  These stories are under review and not yet visible to others. You will be notified once they go live.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pendingStories.map((s) => (
                    <DiscoveryCard key={s.id} story={s} isOwner={true} />
                  ))}
                </div>
              </Section>
            )}

          </main>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {isOwner && deleteTarget && (
        <ConfirmModal
          title="Delete submission?"
          body={
            (deleteTarget._count?.responses ?? 0) === 0 &&
            !deleteTarget.wasFreePost &&
            deleteTarget.pointsCost > 0
              ? `This will permanently delete "${deleteTarget.title}" and refund ${deleteTarget.pointsCost} pts (no critiques yet).`
              : `This will permanently delete "${deleteTarget.title}". Points will not be refunded since critiques have been received.`
          }
          confirmLabel={actionLoading ? "Deleting..." : "Delete"}
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {isOwner && closeTarget && (
        <ConfirmModal
          title="Close submission?"
          body={`Closing "${closeTarget.title}" will stop it from accepting new critiques. Existing feedback remains visible.`}
          confirmLabel={actionLoading ? "Closing..." : "Close submission"}
          danger={false}
          onConfirm={confirmClose}
          onCancel={() => setCloseTarget(null)}
        />
      )}
    </div>
  );
}