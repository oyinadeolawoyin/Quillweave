// src/components/profile/profilepage.jsx
//
// Visited via /profile/:userId
// Public data fetched from GET /api/profile/:userId (single endpoint).
// Owner-only extras: posting balance, blocked users list.

import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { openConversation } from "../message/directmessageapi";
import { AppMetaTags } from "../utilis/metatags";


// ── Icons ──────────────────────────────────────────────────────────────────────

const UserIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const CritiqueIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    <line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="13" y2="13" />
  </svg>
);
const BookIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);
const ThreadIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const CoinsIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1110.34 18" /><path d="M7 6h1v4" /><path d="M16.71 13.88l.7.71-2.82 2.82" />
  </svg>
);
const PlanIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);
const ChallengeIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 22V4a1 1 0 011-1h13.5a.5.5 0 01.4.8L16 9l2.9 5.2a.5.5 0 01-.4.8H5" />
  </svg>
);
const BlockIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);
const ChecklistIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <polyline points="3 6 4 7 6 5" /><polyline points="3 12 4 13 6 11" /><polyline points="3 18 4 19 6 17" />
  </svg>
);
const CheckIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CalendarIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const CharacterIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const ExternalIcon = (p) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const MessageIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const ReplyIcon = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 00-4-4H4" />
  </svg>
);

const TrophyIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 21h8" /><path d="M12 17v4" />
    <path d="M7 4h10v6a5 5 0 01-10 0z" />
    <path d="M17 5h3a2 2 0 01-2 4h-1" /><path d="M7 5H4a2 2 0 002 4h1" />
  </svg>
);

// ── Tier config (mirrors pointService.js) ──────────────────────────────────────

const TIER_CONFIG = {
  Bronze:   { color: "#C87533", bg: "#fdf5ee", border: "#e8c9a0", gem: "B" },
  Silver:   { color: "#7a8187", bg: "#f4f5f6", border: "#c8cdd2", gem: "S" },
  Gold:     { color: "#b8860b", bg: "#fdf9ed", border: "#e8d568", gem: "G" },
  Platinum: { color: "#5c56b0", bg: "#f0effc", border: "#b8b4e8", gem: "P" },
  Diamond:  { color: "#c0411c", bg: "#fdf0eb", border: "#e8a88a", gem: "D" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function daysSince(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso)) / 86400000);
}

function focusLabel(f) {
  const map = {
    OUTLINING: "Outlining",
    BRAINSTORMING: "Brainstorming",
    EDITING: "Editing",
    STORY_DEVELOPMENT: "Story Development",
  };
  return map[f] ?? f;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[#b8860b]"><Icon /></span>
      <h2 className="font-serif text-base font-semibold text-[#1a1a2e]">{title}</h2>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-[#e8e0d0] p-5 ${className}`}>
      {children}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fdf9ed] border border-[#e8d988] text-[#8a6e00]">
      {children}
    </span>
  );
}

function StatBadge({ value, label }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 rounded-lg bg-[#fafaf7] border border-[#e8e0d0]">
      <span className="text-xl font-serif font-bold text-[#1a1a2e]">{value ?? 0}</span>
      <span className="text-[11px] text-[#9a8c7a] mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

/**
 * Reputation tier badge — shown on ALL profiles (not owner-only).
 * Displays the tier name and a gem letter in the tier's colour.
 */
function TierBadge({ tierName }) {
  const cfg = TIER_CONFIG[tierName] ?? TIER_CONFIG.Bronze;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold border"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      <span
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ backgroundColor: cfg.color }}
      >
        {cfg.gem}
      </span>
      {tierName}
    </span>
  );
}

// ── Getting-started checklist ──────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { key: "profile",    label: "Update your profile — add a photo and bio so writers know who you are" },
  { key: "intro",      label: "Introduce yourself — post a thread in New to Inkwell" },
  { key: "comment",    label: "Leave your first comment on a thread in the forum" },
  { key: "critique",   label: "Give your first critique to another writer" },
  { key: "chapter",    label: "Post your first chapter for feedback" },
  { key: "sprint",     label: "Start your first sprint in the Sprint Room" },
  { key: "draftplan",  label: "Create your Draft Plan for your current project" },
  { key: "challenge",  label: "Join a Days Challenge to build a writing streak" },
];

function GettingStartedChecklist({ profileData, userId }) {
  function isDone(key) {
    const p = profileData;
    switch (key) {
      case "profile":   return !!(p.user?.avatar && p.user?.bio);
      case "intro":     return (p.threads ?? []).length > 0;
      case "comment":   return (p.threadCommentCount ?? 0) > 0;
      case "critique":  return (p.critiquesGiven ?? 0) > 0;
      case "chapter":   return (p.submissions ?? []).length > 0;
      case "sprint":    return (p.sprintCount ?? 0) > 0;
      case "draftplan": return !!p.draftPlan;
      case "challenge": return !!(p.daysChallenge);
      default:          return false;
    }
  }

  const allDone = CHECKLIST_ITEMS.every(({ key }) => isDone(key));
  if (allDone) return null;

  return (
    <Card className="border-l-4 border-l-[#d4af37]">
      <SectionHeader icon={ChecklistIcon} title="Getting Started" />
      <p className="text-[13px] text-[#6b6359] mb-4">Here's your welcome checklist — keep going!</p>
      <div className="space-y-2.5">
        {CHECKLIST_ITEMS.map(({ key, label }) => {
          const done = isDone(key);
          return (
            <div key={key} className={`flex items-start gap-3 transition-opacity ${done ? "opacity-50" : ""}`}>
              <div className={`mt-0.5 w-[18px] h-[18px] flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                done ? "bg-[#d4af37] border-[#d4af37]" : "border-[#d4af37] bg-white"
              }`}>
                {done && <CheckIcon className="text-white" />}
              </div>
              <span className={`text-[13px] leading-snug ${done ? "line-through text-[#9a8c7a]" : "text-[#2d3748]"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Block list (owner only) ───────────────────────────────────────────────────

function BlockedUsers({ blockedUsers, onUnblock }) {
  if (!blockedUsers || blockedUsers.length === 0) {
    return (
      <Card>
        <SectionHeader icon={BlockIcon} title="Blocked Writers" />
        <p className="text-[13px] text-[#9a8c7a]">You haven't blocked anyone.</p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader icon={BlockIcon} title="Blocked Writers" />
      <div className="space-y-2">
        {blockedUsers.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#f5f2ec] last:border-0">
            <div className="flex items-center gap-2.5">
              {u.avatar
                ? <img src={u.avatar} alt={u.username} className="w-8 h-8 rounded-full object-cover" />
                : <div className="w-8 h-8 rounded-full bg-[#e8e0d0] flex items-center justify-center"><UserIcon className="text-[#9a8c7a]" style={{ width: 14, height: 14 }} /></div>
              }
              <span className="text-[13px] font-medium text-[#2d3748]">{u.username}</span>
            </div>
            <button
              onClick={() => onUnblock(u.id)}
              className="text-[12px] text-red-400 hover:text-red-600 font-medium transition-colors"
            >
              Unblock
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Draft Plan card (public) ───────────────────────────────────────────────────

function DraftPlanCard({ draftPlan, isOwner }) {
  if (!draftPlan) {
    if (!isOwner) return null;
    return (
      <Card className="text-center">
        <PlanIcon className="mx-auto mb-2 text-[#d4d0ca]" style={{ width: 28, height: 28 }} />
        <p className="text-[13px] font-medium text-[#2d3748] mb-1">No draft plan yet</p>
        <p className="text-[12px] text-[#9a8c7a] mb-3">Create a plan and track your progress toward finishing your first draft.</p>
        <Link to="/draftplan" className="inline-block text-[13px] font-semibold text-[#b8860b] hover:underline">
          Create your plan →
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader icon={PlanIcon} title="Current Draft Plan" />
      <div className="mb-3">
        <p className="font-serif text-[15px] font-semibold text-[#1a1a2e] mb-0.5">{draftPlan.storyTitle}</p>
        {draftPlan.isCompleted && (
          <span className="inline-block mb-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Draft complete</span>
        )}
      </div>

      {draftPlan.premise && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a8c7a] mb-1">Premise</p>
          <p className="text-[13px] text-[#4a4a4a] leading-relaxed line-clamp-4">{draftPlan.premise}</p>
        </div>
      )}

      {draftPlan.characters && draftPlan.characters.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a8c7a] mb-2">Key Characters</p>
          <div className="space-y-1.5">
            {draftPlan.characters.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <CharacterIcon className="flex-shrink-0 mt-0.5 text-[#c0b8b0]" />
                <div>
                  <span className="text-[13px] font-medium text-[#2d3748]">{c.name}</span>
                  {c.description && <span className="text-[12px] text-[#9a8c7a]"> — {c.description}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwner && (
        <Link to="/draftplan" className="inline-block text-[12px] text-[#b8860b] font-semibold hover:underline mt-1">
          Open my plan →
        </Link>
      )}
    </Card>
  );
}

// ── Days Challenge card (public) ───────────────────────────────────────────────

function DaysChallengeCard({ daysChallenge, isOwner }) {
  const challengeTotalDays = daysChallenge?.duration === "FIFTEEN" ? 15 : 7;
  const challengeDaysIn = daysChallenge
    ? Math.max(1, Math.floor((Date.now() - new Date(daysChallenge.startDate)) / 86400000) + 1)
    : 0;

  if (!daysChallenge) {
    if (!isOwner) return null;
    return (
      <Card className="text-center">
        <ChallengeIcon className="mx-auto mb-2 text-[#d4d0ca]" style={{ width: 28, height: 28 }} />
        <p className="text-[13px] font-medium text-[#2d3748] mb-1">Not in a challenge</p>
        <p className="text-[12px] text-[#9a8c7a] mb-3">Join a 7- or 15-day challenge to build a focused writing streak.</p>
        <Link to="/days-challenge" className="inline-block text-[13px] font-semibold text-[#b8860b] hover:underline">
          Join a challenge →
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader icon={ChallengeIcon} title="Days Challenge" />
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-medium text-[#2d3748]">
            Day {Math.min(challengeDaysIn, challengeTotalDays)} of {challengeTotalDays}
          </span>
          <span className="text-[12px] text-[#9a8c7a]">
            {Math.round((Math.min(challengeDaysIn, challengeTotalDays) / challengeTotalDays) * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#f0ebe3] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#d4af37] transition-all"
            style={{ width: `${Math.min(100, (challengeDaysIn / challengeTotalDays) * 100)}%` }}
          />
        </div>
      </div>

      {daysChallenge.storyTitle && (
        <p className="text-[12px] text-[#9a8c7a] mb-2">
          <span className="font-medium text-[#2d3748]">{daysChallenge.storyTitle}</span>
        </p>
      )}

      <p className="text-[12px] text-[#9a8c7a] mb-1">
        Daily goal: <span className="text-[#2d3748] font-medium">{daysChallenge.dailyGoal} {daysChallenge.goalType === "DURATION" ? "min" : "words"}</span>
      </p>

      {daysChallenge.focuses && daysChallenge.focuses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {daysChallenge.focuses.map((f) => (
            <Pill key={f.focus ?? f}>{focusLabel(f.focus ?? f)}</Pill>
          ))}
        </div>
      )}

      {isOwner && (
        <Link to="/days-challenge" className="inline-block text-[12px] text-[#b8860b] font-semibold hover:underline mt-3">
          Open challenge →
        </Link>
      )}
    </Card>
  );
}

// ── Badges card (public — claimed badges visible to everyone; owner sees
//    unclaimed ones too, with a "claim" button) ───────────────────────────────

const SOURCE_LABEL = { EVENT: "Event", MINI_CHALLENGE: "Weekly Challenge", MILESTONE: "Milestone" };

function BadgeTile({ badge, isOwner, onClaim, claiming }) {
  const unclaimed = isOwner && !badge.claimedAt;
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${unclaimed ? "bg-[#fdf9ed]" : "bg-[#fafaf7]"}`}
      style={{ borderColor: unclaimed ? "#e8d988" : "#e8e0d0" }}
    >
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl bg-white border" style={{ borderColor: unclaimed ? "#e8d988" : "#e8e0d0" }}>
          {badge.icon}
        </div>
        {unclaimed && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse" style={{ background: "#d4af37" }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold truncate" style={{ color: "#1a1a2e" }}>{badge.name}</p>
        <p className="text-[11px] text-[#9a8c7a]">
          {SOURCE_LABEL[badge.sourceType] ?? badge.sourceType}
          {badge.claimedAt ? ` · ${formatDate(badge.earnedAt)}` : ""}
        </p>
      </div>
      {unclaimed && (
        <button
          onClick={() => onClaim(badge.id)}
          disabled={claiming}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)", color: "#1a1a2e" }}
        >
          {claiming ? "…" : "Claim"}
        </button>
      )}
    </div>
  );
}

function BadgesCard({ userId, isOwner }) {
  const [loading, setLoading] = useState(true);
  const [publicBadges, setPublicBadges] = useState([]); // visitor view
  const [myBadges, setMyBadges] = useState(null);        // owner view: { unclaimed, claimed }
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (isOwner) {
          const res = await fetch(`${API_URL}/mini-challenges/badges/my`, { credentials: "include" });
          if (res.ok && !cancelled) setMyBadges(await res.json());
        } else {
          const res = await fetch(`${API_URL}/mini-challenges/badges/user/${userId}`);
          if (res.ok && !cancelled) setPublicBadges((await res.json()).badges || []);
        }
      } catch {
        // fail quietly — badges are a nice-to-have, not critical page content
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, isOwner]);

  async function handleClaim(badgeId) {
    setClaimingId(badgeId);
    try {
      const res = await fetch(`${API_URL}/mini-challenges/badges/${badgeId}/claim`, { method: "POST", credentials: "include" });
      if (res.ok) {
        setMyBadges((prev) => {
          if (!prev) return prev;
          const badge = prev.unclaimed.find((b) => b.id === badgeId);
          if (!badge) return prev;
          return {
            unclaimed: prev.unclaimed.filter((b) => b.id !== badgeId),
            claimed: [{ ...badge, claimedAt: new Date().toISOString() }, ...prev.claimed],
          };
        });
      }
    } catch {
      // no-op — button just stays clickable again
    } finally {
      setClaimingId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <SectionHeader icon={TrophyIcon} title="Badges" />
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-[#f0ebe3] animate-pulse" />)}
        </div>
      </Card>
    );
  }

  const allBadges = isOwner ? [...(myBadges?.unclaimed ?? []), ...(myBadges?.claimed ?? [])] : publicBadges;
  const unclaimedCount = isOwner ? (myBadges?.unclaimed?.length ?? 0) : 0;

  if (allBadges.length === 0) {
    if (!isOwner) return null; // don't clutter a visitor's view of an empty trophy case
    return (
      <Card className="text-center">
        <TrophyIcon className="mx-auto mb-2 text-[#d4d0ca]" style={{ width: 28, height: 28 }} />
        <p className="text-[13px] font-medium text-[#2d3748] mb-1">No badges yet</p>
        <p className="text-[12px] text-[#9a8c7a]">
          Finish an event or clear a weekly challenge — badges show up here automatically, no signing up required.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[#b8860b]"><TrophyIcon /></span>
          <h2 className="font-serif text-base font-semibold text-[#1a1a2e]">Badges</h2>
        </div>
        {unclaimedCount > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#d4af37" }}>
            {unclaimedCount} to claim
          </span>
        )}
      </div>
      <div className="space-y-2">
        {allBadges.map((badge) => (
          <BadgeTile key={badge.id} badge={badge} isOwner={isOwner} onClaim={handleClaim} claiming={claimingId === badge.id} />
        ))}
      </div>
    </Card>
  );
}

// ── Main Profile Page ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const isOwner = authUser && String(authUser.id) === String(userId);

  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [points, setPoints]           = useState(null);       // owner-only (posting balance)
  const [blockedUsers, setBlockedUsers] = useState([]);

  // ── Fetch public profile (single endpoint) ─────────────────────────────────

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/profile/${userId}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Writer not found");
      }
      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Owner-only extras ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOwner) return;

    // Posting balance (reputation already comes from the public endpoint)
    fetch(`${API_URL}/feedback/points/me`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setPoints(d.points ?? d.wallet ?? (d?.reputation != null ? d : null));
      })
      .catch(() => {});

    // Blocked users list
    fetch(`${API_URL}/users/blocked`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : { users: [] })
      .then((d) => setBlockedUsers(d.users ?? []))
      .catch(() => {});
  }, [isOwner]);

  async function handleUnblock(blockedId) {
    try {
      await fetch(`${API_URL}/users/${blockedId}/block`, { method: "DELETE", credentials: "include" });
      setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedId));
    } catch {}
  }

  async function handleBlock() {
    if (!authUser || isOwner) return;
    try {
      await fetch(`${API_URL}/users/${userId}/block`, { method: "POST", credentials: "include" });
      alert(`${profileData?.user?.username} has been blocked.`);
    } catch {}
  }

  async function handleMessage() {
    if (!authUser || isOwner) return;
    try {
      const conversation = await openConversation(parseInt(userId, 10));
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      alert(err.message ?? "Couldn't open conversation.");
    }
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-[#9a8c7a]">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-[15px] font-medium text-[#1a1a2e] mb-2">Writer not found</p>
          <p className="text-[13px] text-[#9a8c7a]">{error ?? "Something went wrong."}</p>
        </div>
      </div>
    );
  }

  const {
    user,
    submissions,
    critiquesGiven,
    recentCritiques,
    reputation,
    reputationTier,
    threads,
    threadsCommentedOn,
    threadCommentCount,
    draftPlan,
    daysChallenge,
  } = profileData;

  const submissionCount = submissions?.length ?? 0;
  const joinDate        = formatDate(user.createdAt);

  return (
    <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-[1100px] mx-auto">
      <AppMetaTags
        title={`${user.username}'s Profile`}
        description={`See ${user.username}'s writing progress, critiques, and activity on Quillweave.`}
      />

      {/* ── Hero / avatar card ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.avatar
              ? <img src={user.avatar} alt={user.username} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-[#e8e0d0]" />
              : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#f0ebe3] border-2 border-[#e8e0d0] flex items-center justify-center">
                  <UserIcon className="text-[#c0b8b0]" style={{ width: 36, height: 36 }} />
                </div>
              )
            }
          </div>

          {/* Name + bio + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h1 className="font-serif text-2xl font-bold text-[#1a1a2e]">{user.username}</h1>
              {user.role === "FOUNDING_WRITER" && <Pill>Founding Writer</Pill>}
              {user.role === "ADMIN" && <Pill>Admin</Pill>}
              {/* Reputation tier — visible to everyone */}
              {reputationTier && <TierBadge tierName={reputationTier.name} />}
            </div>

            {user.bio
              ? <p className="text-[14px] text-[#4a4a4a] leading-relaxed mb-3 max-w-xl">{user.bio}</p>
              : <p className="text-[13px] text-[#9a8c7a] italic mb-3">No bio yet.</p>
            }

            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-[12px] text-[#9a8c7a]">
                <CalendarIcon />
                Member since {joinDate}
              </span>
              {user.socialLinks && Array.isArray(user.socialLinks) && user.socialLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[12px] text-[#b8860b] hover:underline"
                >
                  {link.platform} <ExternalIcon />
                </a>
              ))}
            </div>
          </div>

          {/* Action buttons (visitor only) */}
          {!isOwner && authUser && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleMessage}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium bg-[#1a1a2e] text-white hover:bg-[#2d3748] transition-colors"
              >
                <MessageIcon />
                Message
              </button>
              <button
                onClick={handleBlock}
                className="px-3 py-2 rounded-lg text-[13px] font-medium border border-[#e8e0d0] text-[#9a8c7a] hover:border-red-300 hover:text-red-400 transition-colors"
              >
                Block
              </button>
            </div>
          )}

          {/* Edit link (owner) */}
          {isOwner && (
            <Link
              to="/settings"
              className="flex-shrink-0 px-3 py-2 rounded-lg text-[13px] font-medium border border-[#e8e0d0] text-[#9a8c7a] hover:border-[#d4af37] hover:text-[#b8860b] transition-colors"
            >
              Edit profile
            </Link>
          )}
        </div>
      </Card>

      {/* ── Getting started (owner + not fully done) ──────────────────────── */}
      {isOwner && (
        <div className="mb-6">
          <GettingStartedChecklist profileData={{ ...profileData, threadComments: threadCommentCount }} userId={userId} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT column ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Critique stats ────────────────────────────────────────────── */}
          <Card>
            <SectionHeader icon={CritiqueIcon} title="Critique Reputation" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <StatBadge value={critiquesGiven}  label="Critiques given" />
              <StatBadge value={submissionCount} label="Chapters posted" />
              {/* Reputation pts visible to everyone */}
              <StatBadge value={reputation ?? 0} label="Reputation pts" />
              {/* Posting balance is private — owner only */}
              {isOwner && <StatBadge value={points?.postingBalance ?? "—"} label="Posting balance" />}
            </div>

            {/* Recent critiques given */}
            {recentCritiques && recentCritiques.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#9a8c7a] mb-2.5">Recent critiques given</p>
                <div className="space-y-2">
                  {recentCritiques.slice(0, 5).map((r) => (
                    <Link
                      key={r.id}
                      to={`/critique/${r.submission?.id}`}
                      className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-[#fafaf7] transition-colors group"
                    >
                      <CritiqueIcon className="flex-shrink-0 mt-0.5 text-[#c0b8b0] group-hover:text-[#b8860b] transition-colors" style={{ width: 14, height: 14 }} />
                      <div className="min-w-0">
                        <p className="text-[13px] text-[#2d3748] truncate group-hover:text-[#b8860b] transition-colors">
                          {r.submission?.title ?? "Untitled chapter"}
                        </p>
                        <p className="text-[11px] text-[#9a8c7a]">
                          {r.pointsEarned} pt{r.pointsEarned !== 1 ? "s" : ""} earned · {formatDate(r.createdAt)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* ── Chapters submitted ───────────────────────────────────────── */}
          <Card>
            <SectionHeader icon={BookIcon} title="Chapters Posted" />
            {submissions.length === 0
              ? <p className="text-[13px] text-[#9a8c7a]">No chapters posted yet.</p>
              : (
                <div className="space-y-2">
                  {submissions.slice(0, 6).map((s) => (
                    <Link
                      key={s.id}
                      to={`/critique/${s.id}`}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-[#fafaf7] transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#2d3748] truncate group-hover:text-[#b8860b] transition-colors">{s.title}</p>
                        <p className="text-[11px] text-[#9a8c7a]">{s.genre} · {s.critiqueCount} critique{s.critiqueCount !== 1 ? "s" : ""}</p>
                      </div>
                      <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        s.status === "SPOTLIGHT" ? "bg-[#fdf9ed] text-[#8a6e00]" :
                        s.status === "ARCHIVE"   ? "bg-[#f5f2ec] text-[#9a8c7a]"  :
                        "bg-blue-50 text-blue-600"
                      }`}>
                        {s.status}
                      </span>
                    </Link>
                  ))}
                  {submissions.length > 6 && (
                    <p className="text-[12px] text-[#9a8c7a] pt-1 text-right">
                      +{submissions.length - 6} more
                    </p>
                  )}
                </div>
              )
            }
          </Card>

          {/* ── Threads posted ───────────────────────────────────────────── */}
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#b8860b]"><ThreadIcon /></span>
              <h2 className="font-serif text-base font-semibold text-[#1a1a2e]">Threads Posted</h2>
            </div>
            <p className="text-[12px] text-[#9a8c7a] mb-4">Threads {isOwner ? "you've" : "they've"} started</p>

            {threads.length === 0
              ? <p className="text-[13px] text-[#9a8c7a]">No threads posted yet.</p>
              : (
                <div className="space-y-2">
                  {threads.slice(0, 5).map((t) => (
                    <Link
                      key={t.id}
                      to={`/threads/${t.id}`}
                      className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-[#fafaf7] transition-colors group"
                    >
                      <ThreadIcon className="flex-shrink-0 mt-0.5 text-[#c0b8b0] group-hover:text-[#b8860b] transition-colors" style={{ width: 14, height: 14 }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#2d3748] truncate group-hover:text-[#b8860b] transition-colors">{t.title}</p>
                        <p className="text-[11px] text-[#9a8c7a]">
                          {t.category?.name ?? "General"} · {t._count?.comments ?? 0} comment{(t._count?.comments ?? 0) !== 1 ? "s" : ""} · {formatDate(t.createdAt)}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {threads.length > 5 && (
                    <Link to={`/forum?author=${userId}`} className="block text-[12px] text-[#b8860b] hover:underline pt-1 text-right">
                      View all {threads.length} threads
                    </Link>
                  )}
                </div>
              )
            }
          </Card>

          {/* ── Threads commented on ─────────────────────────────────────── */}
          {(threadsCommentedOn && threadsCommentedOn.length > 0) && (
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#b8860b]"><ReplyIcon /></span>
                <h2 className="font-serif text-base font-semibold text-[#1a1a2e]">Threads Joined</h2>
              </div>
              <p className="text-[12px] text-[#9a8c7a] mb-4">
                Threads {isOwner ? "you've" : "they've"} commented in
                {threadCommentCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#fafaf7] border border-[#e8e0d0] text-[10px] font-semibold text-[#6b6359]">
                    {threadCommentCount} comment{threadCommentCount !== 1 ? "s" : ""} total
                  </span>
                )}
              </p>

              <div className="space-y-2">
                {threadsCommentedOn.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    to={`/threads/${t.id}`}
                    className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-[#fafaf7] transition-colors group"
                  >
                    <ReplyIcon className="flex-shrink-0 mt-0.5 text-[#c0b8b0] group-hover:text-[#b8860b] transition-colors" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[#2d3748] truncate group-hover:text-[#b8860b] transition-colors">{t.title}</p>
                      <p className="text-[11px] text-[#9a8c7a]">
                        {t.category?.name ?? "General"}
                        {t.author && ` · by ${t.author.username}`}
                        {" · "}commented {formatDate(t.lastCommentAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

        </div>

        {/* ── RIGHT column ──────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* ── Badges — trophy case, visible to everyone; claim button owner-only ── */}
          <BadgesCard userId={userId} isOwner={isOwner} />

          {/* ── Draft plan — visible to everyone ──────────────────────────── */}
          <DraftPlanCard draftPlan={draftPlan} isOwner={isOwner} />

          {/* ── Days challenge — visible to everyone ──────────────────────── */}
          <DaysChallengeCard daysChallenge={daysChallenge} isOwner={isOwner} />

          {/* ── Posting balance (owner only) ───────────────────────────────── */}
          {isOwner && points && (
            <Card>
              <SectionHeader icon={CoinsIcon} title="My Points" />
              <div className="grid grid-cols-2 gap-3">
                <StatBadge value={reputation ?? 0}        label="Reputation" />
                <StatBadge value={points.postingBalance}  label="Posting balance" />
              </div>
              <p className="text-[12px] text-[#9a8c7a] mt-3 leading-snug">
                Earn points by giving critiques. Spend them to post chapters for feedback.
              </p>
            </Card>
          )}

          {/* ── Blocked writers (owner only) ──────────────────────────────── */}
          {isOwner && (
            <BlockedUsers blockedUsers={blockedUsers} onUnblock={handleUnblock} />
          )}

        </div>
      </div>
    </main>
  );
}