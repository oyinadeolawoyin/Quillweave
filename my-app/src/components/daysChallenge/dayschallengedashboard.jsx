// src/components/daysChallenge/daysChallengeDashboard.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, SectionTitle, PrimaryButton, SecondaryButton,
  ProgressRing, LinearProgress, ErrorText,
} from "../draftPlan/draftPlanUI";
import { unitLabel, FOCUS_OPTIONS, DURATION_DAYS } from "./dayschallengeconstants.js";
import { formatTimeLabel } from "./dayschallengewizard.jsx";
import {
  fetchActiveChallengeWriters, fetchWritersWhoLoggedToday,
  completeChallenge, uncompleteChallenge, leaveChallenge,
} from "./dayschallengeapi.js";
import LogChallengeProgressModal from "./logchallengeprogressmodal.jsx";
import EditChallengeModal from "./editchallengemodal";
import API_URL from "@/config/api";
import { AppMetaTags } from "../utilis/metatags";
import { StartGroupSprintModal } from "../sprint/groupSprintModal";

// Orange ring — this feature's accent color, distinct from the gold used
// by the Draft Plan, so the two trackers stay visually distinguishable.
function OrangeRing({ percent, size = 110, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(Math.max(percent, 0), 100) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0ebe3" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#e07b39" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function focusLabel(value) {
  return FOCUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

// Mirrors backend computeStats() in daysChallengeService.js
function computeStats(challenge) {
  const totalDays = DURATION_DAYS[challenge.duration] ?? 0;
  const checkIns = challenge.checkIns ?? [];
  const daysCompleted = checkIns.filter((c) => c.metDailyGoal).length;
  const daysLogged = checkIns.length;
  const daysLeft = Math.max(totalDays - daysCompleted, 0);
  const totalLogged = checkIns.reduce((acc, c) => acc + (c.countLogged ?? 0), 0);
  const percentComplete = totalDays > 0 ? Math.min(Math.round((daysCompleted / totalDays) * 100), 100) : 0;
  const now = new Date();
  const calendarDaysLeft = Math.max(Math.ceil((new Date(challenge.endDate) - now) / (1000 * 60 * 60 * 24)), 0);
  return { totalDays, daysCompleted, daysLogged, daysLeft, totalLogged, percentComplete, calendarDaysLeft };
}

export default function DaysChallengeDashboard({ initialChallenge, initialStats, onChallengeUpdated, onChallengeEnded }) {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(initialChallenge);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [uncompleting, setUncompleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [tadaResult, setTadaResult] = useState(null);
  const [loggedToday, setLoggedToday] = useState([]);
  const [activeWriters, setActiveWriters] = useState([]);
  const [communityError, setCommunityError] = useState(false);

  useEffect(() => { setChallenge(initialChallenge); }, [initialChallenge]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([fetchWritersWhoLoggedToday(), fetchActiveChallengeWriters()])
      .then(([loggedRes, activeRes]) => {
        if (cancelled) return;
        if (loggedRes.status === "fulfilled") setLoggedToday(loggedRes.value);
        if (activeRes.status === "fulfilled") setActiveWriters(activeRes.value);
        if (loggedRes.status === "rejected" && activeRes.status === "rejected") setCommunityError(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (!challenge) return null;

  const stats = initialStats ?? computeStats(challenge);

  const todayDateStr = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD"
  function isTodayCheckIn(c) {
    return new Date(c.checkInDate).toISOString().slice(0, 10) === todayDateStr;
  }
  const todayCheckIn = (challenge.checkIns ?? []).find(isTodayCheckIn);
  const todayCount = todayCheckIn?.countLogged ?? 0;
  const todayMetGoal = todayCheckIn?.metDailyGoal ?? false;
  const dailyPercent = challenge.dailyGoal > 0 ? Math.min((todayCount / challenge.dailyGoal) * 100, 100) : 0;

  const isActive = challenge.status === "ACTIVE";
  const isCompleted = challenge.status === "COMPLETED";
  const isExpired = challenge.status === "EXPIRED";

  // Only show undo if: manually completed AND endDate is still in the future
  // (if endDate passed, resuming would immediately dead-end — logProgress rejects expired challenges)
  const canUndo = isCompleted && new Date(challenge.endDate) > new Date();

  function handleLogged(result) {
    setChallenge((c) => {
      const checkIns = c.checkIns ?? [];
      const newCheckIn = result.checkIn;
      const newCheckIns = todayCheckIn
        ? checkIns.map((ci) => (isTodayCheckIn(ci) ? newCheckIn : ci))
        : [...checkIns, newCheckIn];
      return {
        ...c,
        checkIns: newCheckIns,
        status: result.isAllDone ? "COMPLETED" : c.status,
        completedAt: result.isAllDone ? new Date().toISOString() : c.completedAt,
      };
    });
    setShowLogModal(false);
    // Only celebrate on an actual addition — a "remove" entry is a
    // correction, not a writing session worth a tada moment.
    if (result.direction !== "remove" && result.metDailyGoal) setTadaResult(result);
  }

  function handleSaved(updatedChallenge) {
    setChallenge(updatedChallenge);
    setShowEditModal(false);
    onChallengeUpdated?.();
  }

  async function handleComplete() {
    setCompleting(true);
    setActionError("");
    try {
      const result = await completeChallenge();
      setChallenge(result.challenge);
    } catch (err) {
      setActionError(err.message ?? "Couldn't mark this challenge complete.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleUncomplete() {
    setUncompleting(true);
    setActionError("");
    try {
      const result = await uncompleteChallenge();
      setChallenge(result.challenge);
    } catch (err) {
      setActionError(err.message ?? "Couldn't resume this challenge.");
    } finally {
      setUncompleting(false);
    }
  }

  async function handleLeave() {
    await leaveChallenge();
    onChallengeEnded?.();
    navigate("/days-challenge");
  }

  function handleSprintCreated(groupSprint, openEditor) {
    navigate(`/group-sprint/${groupSprint.id}`, { state: { writingMode: openEditor ? "quillweave" : null } });
  }

  const totalDays = DURATION_DAYS[challenge.duration] ?? stats.totalDays;
  const dayCircles = Array.from({ length: totalDays }, (_, i) => i);
  const sortedCheckIns = [...(challenge.checkIns ?? [])].sort((a, b) => new Date(a.checkInDate) - new Date(b.checkInDate));

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-16">
      <AppMetaTags
        title={challenge.storyTitle ? `${totalDays}-Day Challenge · ${challenge.storyTitle}` : `${totalDays}-Day Challenge`}
        description="Track your daily progress on your writing challenge."
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: "#e07b39" }}>
              {totalDays}-Day Challenge
            </p>
            <h1 className="font-serif text-[#1a1a2e] text-xl sm:text-[28px] font-bold leading-tight line-clamp-2">
              {challenge.storyTitle || challenge.workingGoal}
            </h1>
          </div>

          {/* Leave button — always visible, separate from the action buttons */}
          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            className="text-[12px] text-[#9a8c7a] hover:text-[#c0392b] transition-colors px-2 py-2 flex-shrink-0 mt-0.5"
          >
            {isActive ? "Leave challenge" : "Clear challenge"}
          </button>
        </div>

        {/* Action buttons row — wraps naturally on small screens */}
        {(isActive || canUndo) && (
          <div className="flex items-center gap-2 flex-wrap">
            {isActive && (
              <SecondaryButton onClick={() => setShowEditModal(true)} className="px-4 py-2.5 text-[13px]">
                Edit challenge
              </SecondaryButton>
            )}
            {isActive && (
              <SecondaryButton onClick={handleComplete} disabled={completing} className="px-4 py-2.5 text-[13px]">
                {completing ? "Marking done…" : "Mark done early"}
              </SecondaryButton>
            )}
            {canUndo && (
              <SecondaryButton onClick={handleUncomplete} disabled={uncompleting} className="px-4 py-2.5 text-[13px]">
                {uncompleting ? "Resuming…" : "Undo — continue challenge"}
              </SecondaryButton>
            )}
            {isActive && (
              <SecondaryButton onClick={() => setShowSprintModal(true)} className="px-4 py-2.5 text-[13px]">
                Start a sprint
              </SecondaryButton>
            )}
            {isActive && (
              <PrimaryButton onClick={() => setShowLogModal(true)} className="px-5 py-2.5">
                Log Progress
              </PrimaryButton>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <div className="mb-4"><ErrorText>{actionError}</ErrorText></div>
      )}

      {/* Status banner — completed or expired */}
      {!isActive && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-[13px] font-semibold"
          style={
            isCompleted
              ? { background: "#fdf9ed", color: "#b8860b", border: "1px solid #f0d98a" }
              : { background: "#fdf2f0", color: "#c0392b", border: "1px solid #f5c6c0" }
          }
        >
          {isCompleted
            ? canUndo
              ? "You marked this challenge as done — hit \"Undo\" above to keep going."
              : "🎉 You completed this challenge!"
            : "This challenge has expired."}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-5 min-w-0">

          {/* Working goal + why now */}
          <Card>
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a8c7a]">My Goal For This Challenge</p>
              {challenge.reminderTime && (
                <span className="text-[11px] font-semibold text-[#e07b39] whitespace-nowrap flex-shrink-0">
                  🔔 {formatTimeLabel(challenge.reminderTime)}
                </span>
              )}
            </div>
            <p className="text-[14px] text-[#1a1a2e] leading-relaxed mb-3">{challenge.workingGoal}</p>
            <p className="text-[11px] font-semibold text-[#9a8c7a] uppercase tracking-wide mb-1">Why now</p>
            <p className="text-[13px] text-[#6b5c4a] leading-relaxed">{challenge.whyNow}</p>
          </Card>

          {/* Focus tags */}
          {challenge.focuses?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {challenge.focuses.map((f) => (
                <span
                  key={f.id ?? f.focus}
                  className="text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full"
                  style={{ background: "#fff3e0", color: "#e07b39" }}
                >
                  {focusLabel(f.focus)}
                </span>
              ))}
            </div>
          )}

          {/* Breakdown + Today's goal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Challenge Breakdown */}
            <Card className="flex flex-col">
              <p className="text-[14px] font-bold text-[#1a1a2e] mb-4">Challenge Breakdown</p>
              <div className="flex items-center gap-5 mb-4">
                <div className="relative flex-shrink-0">
                  <ProgressRing percent={stats.percentComplete} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-bold text-[#1a1a2e] leading-none">{stats.percentComplete}%</span>
                  </div>
                </div>
                <div className="space-y-2 min-w-0">
                  <MiniStat label="Days completed" value={`${stats.daysCompleted} / ${totalDays}`} />
                  <MiniStat label="Days left"       value={stats.daysLeft} />
                  <MiniStat label="Days logged"     value={stats.daysLogged} />
                  <MiniStat label="Calendar days left" value={stats.calendarDaysLeft} />
                </div>
              </div>
              <div className="pt-3 border-t border-[#f0ebe3] flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-[#9a8c7a]">Total {unitLabel(challenge.goalType, 2)} logged</p>
                  <p className="text-[15px] font-bold text-[#1a1a2e]">
                    {stats.totalLogged.toLocaleString()} {unitLabel(challenge.goalType, stats.totalLogged)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Today's goal ring */}
            <Card className="flex flex-col items-center justify-center">
              <p className="text-[14px] font-bold text-[#1a1a2e] mb-4 self-start">Today</p>
              <div className="relative">
                <OrangeRing percent={dailyPercent} size={110} stroke={10} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[20px] font-bold text-[#1a1a2e] leading-none">
                    {todayCount > 0 ? todayCount.toLocaleString() : challenge.dailyGoal.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-[#9a8c7a] mt-0.5">{unitLabel(challenge.goalType, 2)}</span>
                </div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a8c7a] text-center mt-2">
                {todayCount > 0 ? "Logged today" : "Daily goal"}
              </p>
              {todayCount > 0 && (
                <p className="text-[10px] font-semibold text-center mt-0.5" style={{ color: "#e07b39" }}>
                  {todayMetGoal ? "Done!" : `${(challenge.dailyGoal - todayCount).toLocaleString()} to go`}
                </p>
              )}
            </Card>
          </div>

          {/* Day tracker */}
          <Card>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a8c7a] mb-3">Day by day</p>
            <div className="flex gap-1.5 flex-wrap">
              {dayCircles.map((i) => {
                const checkIn = sortedCheckIns[i];
                const done = checkIn?.metDailyGoal;
                const logged = !!checkIn && !done;
                return (
                  <div key={i} className="flex flex-col items-center gap-1" style={{ width: 32 }}>
                    <span className="text-[9px] font-bold text-[#9a8c7a]">{i + 1}</span>
                    <div
                      className="w-full aspect-square rounded-full flex items-center justify-center"
                      style={{
                        background: done ? "#e07b39" : logged ? "#fff3e0" : "#f0ebe3",
                        border: logged && !done ? "2px solid #e07b39" : "2px solid transparent",
                      }}
                      title={checkIn ? `${checkIn.countLogged} ${unitLabel(challenge.goalType, checkIn.countLogged)}` : "Not logged yet"}
                    >
                      {done && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent log notes */}
          {sortedCheckIns.some((c) => c.note) && (
            <div>
              <SectionTitle>Notes From This Challenge</SectionTitle>
              <div className="space-y-2">
                {sortedCheckIns.filter((c) => c.note).reverse().map((c) => (
                  <Card key={c.id ?? c.checkInDate} className="py-3">
                    <p className="text-[10px] text-[#9a8c7a] mb-1">
                      {new Date(c.checkInDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-[13px] text-[#1a1a2e] leading-relaxed">{c.note}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Community */}
        <div className="space-y-5">
          <Card className="p-6">
            <p className="font-serif text-[#1a1a2e] text-lg font-bold mb-4">Challenge Room</p>

            <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a8c7a] mb-3">Logged progress today</p>
            <div className="space-y-3 mb-6">
              {loggedToday.length === 0 && !communityError && (
                <p className="text-[12px] text-[#c2b8a8] italic">No one has logged yet today — be the first.</p>
              )}
              {loggedToday.map((w) => (
                <div key={w.userId} className="flex items-center gap-3">
                  <Avatar username={w.username} avatar={w.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-[#1a1a2e] truncate">{w.username}</p>
                    <p className="text-[11px] text-[#9a8c7a] truncate">
                      {w.countLogged} {unitLabel(w.goalType, w.countLogged)}
                      {w.storyTitle ? ` · ${w.storyTitle}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[#e07b39] flex-shrink-0">
                    {w.daysCompleted}/{w.totalDays}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a8c7a] mb-3">Currently challenging themselves</p>
            <div className="space-y-3">
              {activeWriters.length === 0 && !communityError && (
                <p className="text-[12px] text-[#c2b8a8] italic">No other active challenges right now.</p>
              )}
              {activeWriters.filter((w) => !w.isCurrentUser).map((w) => (
                <div key={w.challengeId} className="flex items-center gap-3">
                  <Avatar username={w.username} avatar={w.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-[#1a1a2e] truncate">{w.username}</p>
                    <p className="text-[11px] text-[#9a8c7a] truncate">
                      {w.totalDays}-day · {(w.focuses ?? []).map(focusLabel).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
              {communityError && (
                <p className="text-[12px] text-[#c2b8a8] italic">Couldn't load the community feed.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <RelatedArticles tags={["editing", "outlining", "brainstorming", "story-development"]} />
      </div>

      {showLogModal && (
        <LogChallengeProgressModal
          challenge={challenge}
          onClose={() => setShowLogModal(false)}
          onLogged={handleLogged}
        />
      )}

      {showEditModal && (
        <EditChallengeModal
          challenge={challenge}
          onClose={() => setShowEditModal(false)}
          onSaved={handleSaved}
        />
      )}

      {showLeaveConfirm && (
        <LeaveConfirmModal
          isActive={isActive}
          onClose={() => setShowLeaveConfirm(false)}
          onConfirm={handleLeave}
        />
      )}

      {tadaResult && (
        <TadaModal result={tadaResult} onClose={() => setTadaResult(null)} />
      )}

      <StartGroupSprintModal
        isOpen={showSprintModal}
        onClose={() => setShowSprintModal(false)}
        onCreated={handleSprintCreated}
      />
    </div>
  );
}

// ── Related Articles ────────────────────────────────────────────────────────

// Post content is stored as rich-text HTML with no separate excerpt field,
// so we strip tags and trim it down to a short plain-text teaser.
function excerptFromContent(html, maxLen = 90) {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > maxLen ? `${text.slice(0, maxLen).trimEnd()}…` : text;
}

function RelatedArticles({ tags }) {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    Promise.all(
      tags.map((tag) =>
        fetch(`${API_URL}/blog?tag=${tag}&limit=3`, { credentials: "include" })
          .then((r) => (r.ok ? r.json() : { posts: [] }))
          .then((d) => d.posts ?? [])
          .catch(() => [])
      )
    ).then((results) => {
      const seen = new Set();
      const merged = results.flat().filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
      setArticles(merged.slice(0, 4));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (articles.length === 0) return null;

  return (
    <div>
      <p className="font-serif text-[#1a1a2e] text-lg font-bold mb-4">Read While You Work</p>
      <div className="flex flex-wrap gap-4">
        {articles.map((a) => {
          const description = excerptFromContent(a.content);
          return (
            <a
              key={a.id}
              href={`/blog/${a.id}`}
              className="group block w-full sm:w-[240px] bg-white border border-[#e8e0d0] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[16/10] w-full bg-[#f0ebe3] overflow-hidden">
                {a.mediaUrl ? (
                  <img
                    src={a.mediaUrl}
                    alt={a.title || "Untitled"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-serif text-[#c2b8a8] text-2xl">Aa</span>
                  </div>
                )}
              </div>
              <div className="p-3.5">
                {a.tag && (
                  <p className="text-[10px] font-semibold text-[#b8860b] uppercase tracking-wide mb-1">
                    {a.tag.replace(/-/g, " ")}
                  </p>
                )}
                <p className="text-[13px] font-semibold text-[#1a1a2e] group-hover:text-[#b8860b] transition-colors leading-snug line-clamp-2 mb-1">
                  {a.title || "Untitled"}
                </p>
                {description && (
                  <p className="text-[12px] text-[#9a8c7a] leading-snug line-clamp-2">{description}</p>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── Leave confirm modal ─────────────────────────────────────────────────

function LeaveConfirmModal({ isActive, onClose, onConfirm }) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setLeaving(true);
    setError("");
    try { await onConfirm(); }
    catch (err) { setError(err.message ?? "Couldn't leave this challenge."); setLeaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-[#e8e0d0] overflow-hidden" style={{ borderTop: "4px solid #c0392b" }}>
        <div className="px-6 pt-6 pb-6">
          <h3 className="font-serif text-[#1a1a2e] text-lg font-bold mb-2">
            {isActive ? "Leave this challenge?" : "Clear this challenge?"}
          </h3>
          <p className="text-[13px] text-[#6b5c4a] leading-relaxed mb-5">
            {isActive
              ? "This will permanently delete your progress for this challenge. This can't be undone."
              : "This will remove it from your dashboard and permanently delete its history. This can't be undone — you'll be free to start a new challenge."}
          </p>
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2">
            <SecondaryButton onClick={onClose} disabled={leaving} className="flex-1">Cancel</SecondaryButton>
            <button
              type="button" onClick={confirm} disabled={leaving}
              className="flex-1 py-2.5 px-5 bg-[#c0392b] text-white text-sm font-bold rounded-lg hover:bg-[#a93226] transition-colors disabled:opacity-50"
            >
              {leaving ? "Clearing…" : (isActive ? "Yes, leave it" : "Yes, clear it")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tada modal — shown when daily goal is hit ──────────────────────────

function TadaModal({ result, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-xs border border-[#e8e0d0] overflow-hidden text-center p-6"
        style={{ borderTop: "4px solid #e07b39" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-3xl mb-2">🎉</p>
        <h3 className="font-serif text-[#1a1a2e] text-lg font-bold mb-1">Daily goal hit!</h3>
        <p className="text-[13px] text-[#6b5c4a] leading-relaxed mb-4">
          {result.isAllDone ? "And that's all the days — challenge complete!" : "Nice work — see you tomorrow."}
        </p>
        <PrimaryButton onClick={onClose} className="w-full">Nice</PrimaryButton>
      </div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-[#9a8c7a] leading-tight">{label}</p>
      <p className="text-[13px] font-bold text-[#1a1a2e] leading-tight">{value}</p>
    </div>
  );
}

function Avatar({ username, avatar, size = 28 }) {
  if (avatar) {
    return <img src={avatar} alt={username} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-serif font-bold text-[#1a1a2e]"
      style={{ width: size, height: size, background: "#fff3e0", fontSize: size * 0.4 }}
    >
      {username?.charAt(0).toUpperCase() ?? "?"}
    </div>
  );
}