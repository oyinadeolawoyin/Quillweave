// src/components/minichallenge/minichallengepage.jsx
//
// The "Weekly Challenge" page linked from the sidebar. Shows the live
// challenge, the signed-in writer's own progress, and a leaderboard of
// recently-active members' progress toward it. No joining — this is a
// read-only view of activity the system is already tracking.
//
// Wire it up in main.jsx as a child of the dashboard Layout, e.g.:
//   <Route path="/mini-challenges" element={<MiniChallengePage />} />

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_URL from "@/config/api";
import { useAuth } from "../auth/authContext";
import { AppMetaTags } from "../utilis/metatags";

const NAVY = "#1a1a2e";
const GOLD = "#d4af37";
const CREAM = "#f5f3ef";
const BORDER = "#e8e0d0";
const MUTED = "#9a8c7a";
const BODY = "#6b5c4a";

const TYPE_LABEL = {
  SESSION_COUNT: "days logged this week",
  WEEKLY_GOAL: "toward your weekly goal",
  SPRINT_COUNT: "sprints this week",
  CONSECUTIVE_DAYS: "day streak this week",
  CONSECUTIVE_SPRINT_DAYS: "day sprint streak this week",
};

// ─── Date helpers (client-side, UTC-based — good enough for a streak display) ─

function toDateStr(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function mondayOfWeekUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function addDaysUTC(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Consecutive *closed* weeks with an earned MINI_CHALLENGE badge, counting
// back from last week (this week's badge, if any, doesn't exist yet — it's
// only recorded once the week wraps up). Earning counts toward the streak
// even before the badge is claimed.
function computeMiniChallengeStreak(allBadges) {
  const weekStarts = new Set(
    allBadges
      .filter((b) => b.sourceType === "MINI_CHALLENGE" && b.weekStart)
      .map((b) => toDateStr(b.weekStart))
  );
  let cursor = addDaysUTC(mondayOfWeekUTC(new Date()), -7);
  let streak = 0;
  while (weekStarts.has(toDateStr(cursor))) {
    streak++;
    cursor = addDaysUTC(cursor, -7);
  }
  return streak;
}

function ProgressBar({ achieved, target }) {
  const pct = target ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  return (
    <div className="h-2.5 rounded-full bg-[#f0ebe3] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: GOLD }} />
    </div>
  );
}

function LeaderRow({ entry }) {
  const u = entry.user;
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: "#f0ebe3" }}>
      {u.avatar ? (
        <img src={u.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${GOLD}25`, color: NAVY }}>
          {(u.username || "?")[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <Link to={`/profile/${u.id}`} className="text-[13px] font-semibold hover:underline truncate block" style={{ color: NAVY }}>
          {u.username}
        </Link>
        <div className="mt-1"><ProgressBar achieved={entry.achievedValue} target={entry.targetValue} /></div>
      </div>
      <div className="text-right flex-shrink-0 w-24">
        {entry.completed ? (
          <span className="text-[11px] font-bold" style={{ color: "#1a7a4c" }}>Complete ✓</span>
        ) : entry.targetValue != null ? (
          <span className="text-[11px]" style={{ color: MUTED }}>{entry.remaining} to go</span>
        ) : (
          <span className="text-[11px]" style={{ color: MUTED }}>{entry.achievedValue}</span>
        )}
      </div>
    </div>
  );
}

// The actual "you did it" moment — shown when a badge is sitting there
// unclaimed. This only appears once a week has actually closed and been
// recorded (see minichallengeservice.evaluateAndRecordWeek), which is why
// it's a separate banner from the live "you've hit it" progress note below.
function CelebrationBanner({ badge, onClaim, claiming }) {
  return (
    <div
      className="rounded-2xl p-6 sm:p-7 mb-6 text-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
    >
      <div className="relative">
        <p className="text-3xl mb-2">🎉</p>
        <p className="font-serif text-xl mb-1" style={{ color: NAVY }}>Challenge Complete!</p>
        <p className="text-sm mb-5" style={{ color: "#4a3f2a" }}>
          You earned <strong>{badge.icon} {badge.name}</strong> — nice work.
        </p>
        <button
          onClick={() => onClaim(badge.id)}
          disabled={claiming}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
          style={{ background: NAVY }}
        >
          {claiming ? "Claiming…" : "Claim your badge →"}
        </button>
      </div>
    </div>
  );
}

export default function MiniChallengePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myProgress, setMyProgress] = useState(null);
  const [leaderboard, setLeaderboard] = useState({ template: null, entries: [] });
  const [badges, setBadges] = useState({ unclaimed: [], claimed: [] });
  const [claimingId, setClaimingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [lbRes, myRes, badgesRes] = await Promise.all([
          fetch(`${API_URL}/mini-challenges/leaderboard`),
          user ? fetch(`${API_URL}/mini-challenges/my-progress`, { credentials: "include" }) : Promise.resolve(null),
          user ? fetch(`${API_URL}/mini-challenges/badges/my`, { credentials: "include" }) : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setLeaderboard(lbRes.ok ? await lbRes.json() : { template: null, entries: [] });
          if (myRes && myRes.ok) setMyProgress(await myRes.json());
          if (badgesRes && badgesRes.ok) setBadges(await badgesRes.json());
        }
      } catch {
        // sections just show their empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  async function handleClaim(badgeId) {
    setClaimingId(badgeId);
    try {
      const res = await fetch(`${API_URL}/mini-challenges/badges/${badgeId}/claim`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setBadges((prev) => ({
          unclaimed: prev.unclaimed.filter((b) => b.id !== badgeId),
          claimed: [data.badge, ...prev.claimed],
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClaimingId(null);
    }
  }

  const template = myProgress?.template || leaderboard.template;

  // Most recently earned unclaimed weekly badge — this is the real
  // celebration moment, separate from the live "you're at target" note
  // below (which shows before the badge has actually been recorded).
  const unclaimedMiniChallengeBadge = badges.unclaimed
    .filter((b) => b.sourceType === "MINI_CHALLENGE")
    .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))[0];

  const streak = computeMiniChallengeStreak([...badges.unclaimed, ...badges.claimed]);

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <AppMetaTags
        title="Weekly Challenge"
        description="Every week brings a new writing challenge on Quillweave — keep writing and we'll track your progress automatically."
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: GOLD }}>Community</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight mb-1" style={{ color: NAVY }}>Weekly Challenge</h1>
          <p className="text-sm" style={{ color: MUTED }}>
            Every week brings a new writing challenge. Just keep writing — we'll track your progress automatically.
          </p>
        </div>

        {loading ? (
          <div className="h-40 bg-white rounded-2xl animate-pulse border" style={{ borderColor: BORDER }} />
        ) : !template ? (
          <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: BORDER }}>
            <div className="text-4xl mb-3">🏅</div>
            <p className="text-sm" style={{ color: MUTED }}>No active challenge right now — check back soon.</p>
          </div>
        ) : (
          <>
            {user && unclaimedMiniChallengeBadge && (
              <CelebrationBanner
                badge={unclaimedMiniChallengeBadge}
                onClaim={handleClaim}
                claiming={claimingId === unclaimedMiniChallengeBadge.id}
              />
            )}

            {/* Challenge header + my progress */}
            <div className="bg-white rounded-2xl border shadow-soft p-6 mb-6" style={{ borderColor: BORDER }}>
              <div className="flex items-start gap-4">
                <span className="text-4xl flex-shrink-0">{template.badgeIcon}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-serif text-xl mb-1" style={{ color: NAVY }}>{template.title}</h2>
                  {template.description && <p className="text-sm mb-2" style={{ color: BODY }}>{template.description}</p>}
                  <p className="text-xs" style={{ color: MUTED }}>
                    Clear it and earn: <strong style={{ color: NAVY }}>{template.badgeName}</strong>
                  </p>
                </div>
              </div>

              {user ? (
                myProgress && (
                  <div className="mt-5 pt-5 border-t" style={{ borderColor: BORDER }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold" style={{ color: NAVY }}>Your progress</span>
                        {streak > 0 && (
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: `${GOLD}20`, color: "#8a6d1f" }}
                            title="Consecutive weeks you've earned a mini-challenge badge"
                          >
                            🔥 {streak}-week streak
                          </span>
                        )}
                      </div>
                      <span className="text-[13px]" style={{ color: MUTED }}>
                        {myProgress.targetValue != null
                          ? `${myProgress.achievedValue}/${myProgress.targetValue} ${TYPE_LABEL[myProgress.template?.type] || ""}`
                          : `${myProgress.achievedValue} ${TYPE_LABEL[myProgress.template?.type] || ""}`}
                      </span>
                    </div>
                    <ProgressBar achieved={myProgress.achievedValue} target={myProgress.targetValue} />
                    <p className="text-xs mt-2" style={{ color: MUTED }}>
                      {myProgress.completed
                        ? "🎉 You've hit this week's goal! Your badge will be waiting for you to claim once the week wraps up."
                        : myProgress.targetValue != null
                          ? `${myProgress.remaining} more to go this week — you're close!`
                          : "Keep going!"}
                    </p>
                  </div>
                )
              ) : (
                <div className="mt-5 pt-5 border-t text-center" style={{ borderColor: BORDER }}>
                  <button
                    onClick={() => navigate("/signup")}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
                    style={{ background: NAVY }}
                  >
                    Sign up to track your progress →
                  </button>
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-2xl border shadow-soft p-6" style={{ borderColor: BORDER }}>
              <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: MUTED }}>
                Writers on the Journey
              </h3>
              {leaderboard.entries.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: MUTED }}>
                  No one's logged activity toward this yet — be the first!
                </p>
              ) : (
                <div>
                  {leaderboard.entries.map((entry) => (
                    <LeaderRow key={entry.user.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}