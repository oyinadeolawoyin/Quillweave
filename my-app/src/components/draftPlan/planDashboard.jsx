// src/components/draftplan/planDashboard.jsx

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, SectionTitle, PrimaryButton, SecondaryButton,
  ProgressRing, LinearProgress, FieldLabel, TextInput, TextArea,
  ErrorText, PillMultiSelect,
} from "./draftPlanUI";
import { unitLabel } from "./draftPlanConstants";
import {
  fetchActiveDraftWriters, fetchWritersWhoLoggedToday, fetchWritersScheduledToday,
  updateDraftPlan, deleteDraftPlan, uploadMoodboardImage,
} from "./draftPlanApi";
import LogProgressModal from "./logProgressModal";
import API_URL from "../../config/api";
import { EventJoinBanner } from "../event/eventjoinbanner";
import { AppMetaTags } from "../utilis/metatags";
import { StartGroupSprintModal } from "../sprint/groupSprintModal";

const WEEKDAY_ORDER   = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const WEEKDAY_LABEL   = { MON: "M", TUE: "T", WED: "W", THU: "T", FRI: "F", SAT: "S", SUN: "S" };
const WEEKDAY_FULL    = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };
const JS_TO_KEY       = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_OPTIONS = WEEKDAY_ORDER.map((v) => ({ value: v, label: WEEKDAY_FULL[v] }));

// Orange progress ring — matches ProgressRing API but styled orange
function OrangeRing({ percent, size = 110, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(Math.max(percent, 0), 100) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0ebe3" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#e07b39"
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

// Square version of OrangeRing — used on non-writing days, when there's no
// scheduled daily goal but the writer might still log a bonus session.
// Uses pathLength=100 so strokeDasharray/Offset work the same as the circle.
function OrangeSquareProgress({ percent, size = 110, stroke = 10 }) {
  const inset = stroke / 2;
  const pct = Math.min(Math.max(percent, 0), 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <rect
        x={inset} y={inset} width={size - stroke} height={size - stroke}
        rx={size * 0.16}
        fill="none" stroke="#f0ebe3" strokeWidth={stroke}
        pathLength={100}
      />
      <rect
        x={inset} y={inset} width={size - stroke} height={size - stroke}
        rx={size * 0.16}
        fill="none" stroke="#e07b39" strokeWidth={stroke} strokeLinecap="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 - pct}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

export default function PlanDashboard({ plan: initialPlan, onPlanUpdated, onPlanDeleted }) {
  const navigate = useNavigate();
  const [plan, setPlan]                   = useState(initialPlan);
  const [activeTab, setActiveTab]         = useState("plan"); // "plan" | "journey"
  const [showLogModal, setShowLogModal]   = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [tadaResult, setTadaResult]       = useState(null);
  const [loggedToday, setLoggedToday]     = useState([]);
  // Writers who share today as a writing day but haven't necessarily logged
  // yet — only ever populated when the current user's own plan also has
  // today picked, so this stays a same-day-peers view. Each entry carries
  // hasLoggedToday so the peer still shows up (marked done) after logging,
  // instead of disappearing from the list.
  const [scheduledToday, setScheduledToday] = useState([]);
  const [activeWriters, setActiveWriters] = useState([]);
  const [communityError, setCommunityError] = useState(false);
  // localSessions holds every individual add/remove action the writer does
  // in this browser session — these are the extra entries shown in My Draft
  // Journey on top of the server-side daily log rows. The backend upserts
  // one row per day (accumulating), so without this a second "add 300 words"
  // on the same day would just silently update the day's total with no trace
  // of the individual session. Each entry records the DELTA (what was typed
  // this action), not the running total, so the writer can see "wrote 500,
  // then wrote 300 more" rather than a single "800" entry.
  const [localSessions, setLocalSessions] = useState([]);
  // Character lists in the community "Writers & Their Characters" panel are
  // hidden by default (blurred) and only shown per-writer once the viewer
  // taps "Reveal" — some writers consider character names/details spoilers
  // or just prefer not to have them visible at a glance to every visitor.
  // Community "Writers & Their Characters" panel — each writer's extra detail
  // (writing days, sessions, favourite characters) is collapsed by default and
  // takes up no space until the viewer taps "Show details". Characters in
  // particular can be story spoilers, so they're fully hidden, not just
  // blurred, until expanded.
  const [expandedWriters, setExpandedWriters] = useState(new Set());
  // Pagination for the "Writers & Their Characters" panel — the community
  // list can be longer than one screenful, so we page through it
  // WRITERS_PER_PAGE at a time instead of hard-cutting at 8 with no way to
  // see the rest.
  const [writersPage, setWritersPage] = useState(0);
  const WRITERS_PER_PAGE = 8;

  function toggleWriterExpanded(planId) {
    setExpandedWriters((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  }

  useEffect(() => { setPlan(initialPlan); }, [initialPlan]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetchWritersWhoLoggedToday(),
      fetchActiveDraftWriters(),
      fetchWritersScheduledToday(),
    ])
      .then(([loggedRes, activeRes, scheduledRes]) => {
        if (cancelled) return;
        if (loggedRes.status === "fulfilled") setLoggedToday(loggedRes.value);
        if (activeRes.status === "fulfilled") { setActiveWriters(activeRes.value); setWritersPage(0); }
        if (scheduledRes.status === "fulfilled") setScheduledToday(scheduledRes.value);
        if (loggedRes.status === "rejected" && activeRes.status === "rejected") setCommunityError(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (!plan) return null;

  const stats         = computeStats(plan);
  const todayKey      = JS_TO_KEY[new Date().getDay()];
  const pickedDaySet  = new Set((plan.writingDays ?? []).map((d) => d.day));
  const todayIsPicked = pickedDaySet.has(todayKey);

  // Compare by calendar date string (YYYY-MM-DD) so UTC-midnight logDates
  // always match "today" regardless of the local timezone offset — avoids the
  // bug where a UTC-midnight date parses to "yesterday" in timezones behind UTC.
  const todayDateStr = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD"
  function isTodayLog(l) {
    return new Date(l.logDate).toISOString().slice(0, 10) === todayDateStr;
  }

  const loggedPickedToday = (plan.progressLogs ?? []).some(
    (l) => l.isPickedDay && isTodayLog(l)
  );

  // Today's logged count — for the daily ring
  const todayLog     = (plan.progressLogs ?? []).find(isTodayLog);
  const todayCount   = todayLog?.countLogged ?? 0;
  const dailyPercent = plan.dailyGoal > 0 ? Math.min((todayCount / plan.dailyGoal) * 100, 100) : 0;
  const weeklyPercent = plan.weeklyGoal > 0 ? Math.min((stats.weekTotal / plan.weeklyGoal) * 100, 100) : 0;

  function handleLogged(result) {
    const newAccumulatedCount = result.log?.countLogged ?? 0;
    const direction           = result.direction;

    // Capture the delta (this session's individual contribution) BEFORE
    // updating plan state, so we still have access to the old today count.
    // delta = new accumulated total − previous accumulated total for today.
    const prevTodayLog   = (plan.progressLogs ?? []).find(isTodayLog);
    const prevTodayCount = prevTodayLog?.countLogged ?? 0;
    const sessionDelta   = newAccumulatedCount - prevTodayCount;

    // Update the plan's single per-day log row with the new accumulated total.
    // We match by date string (not >= midnight) so timezone offsets never
    // cause a false "not found" that would push a duplicate row.
    setPlan((p) => {
      const logs = p.progressLogs ?? [];
      const newLog = {
        logDate:      result.log?.logDate ?? new Date().toISOString(),
        countLogged:  newAccumulatedCount,
        isPickedDay:  result.isPickedDay,
        metDailyGoal: result.metDailyGoal,
        note:         result.log?.note ?? null,
        totalSoFar:   result.log?.totalSoFar ?? null,
      };
      const newLogs = prevTodayLog
        ? logs.map((l) => (isTodayLog(l) ? newLog : l))
        : [newLog, ...logs];
      return { ...p, progressLogs: newLogs, isCompleted: result.isDraftDone || p.isCompleted };
    });

    // Append this individual action to the local session history so the
    // journey tab can show "wrote 500, then wrote 300 more" rather than one
    // merged "800" entry. sessionDelta is the amount typed THIS action.
    if (sessionDelta !== 0) {
      setLocalSessions((prev) => [
        {
          id:             `session-${Date.now()}`,
          logDate:        new Date().toISOString(),
          delta:          sessionDelta,
          direction,
          isPickedDay:    result.isPickedDay,
          metDailyGoal:   result.metDailyGoal,
          note:           result.log?.note ?? null,
          runningTotal:   newAccumulatedCount,
        },
        ...prev,
      ]);
    }

    setShowLogModal(false);
    if (result.metDailyGoal) setTadaResult(result);
    // Do NOT call onPlanUpdated here — that triggers a server re-fetch in the
    // parent which overwrites our local optimistic update with whatever the
    // server returns, causing a race where the UI snaps back to the old count.
    // The local setPlan above is the source of truth for progress logging;
    // the server has already persisted the correct value.
  }

  function handlePlanUpdated(updatedPlan) {
    setPlan(updatedPlan);
    setShowEditModal(false);
    onPlanUpdated?.();
  }

  async function handleDelete() {
    try {
      await deleteDraftPlan();
      onPlanDeleted?.();
      navigate("/draftplan");
    } catch { /* error surfaced inside confirm modal */ }
  }

  function handleSprintCreated(groupSprint, openEditor) {
    navigate(`/group-sprint/${groupSprint.id}`, { state: { writingMode: openEditor ? "quillweave" : null } });
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-16">
      <AppMetaTags
        title={plan.storyTitle ? `Draft Plan · ${plan.storyTitle}` : "My Draft Plan"}
        description="Track your progress toward finishing your draft."
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-1">My Project Plan</p>
          <h1 className="font-serif text-[#1a1a2e] text-2xl sm:text-[28px] font-bold leading-tight truncate">
            {plan.storyTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto sm:flex-wrap pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[12px] text-[#9a8c7a] hover:text-[#c0392b] transition-colors px-2 py-2 flex-shrink-0"
          >
            Delete project
          </button>
          <SecondaryButton onClick={() => setShowEditModal(true)} className="px-4 py-2.5 text-[13px] flex-shrink-0">
            Edit project
          </SecondaryButton>
          <SecondaryButton onClick={() => setShowSprintModal(true)} className="px-4 py-2.5 text-[13px] flex-shrink-0">
            Start a sprint
          </SecondaryButton>
          <PrimaryButton onClick={() => setShowLogModal(true)} className="px-5 py-2.5 flex-shrink-0">
            Log Progress
          </PrimaryButton>
        </div>
      </div>

      <EventJoinBanner />
      
      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex gap-0 mb-6 border-b border-[#e8e0d0]">
        {[
          { key: "plan",    label: "My Plan" },
          { key: "journey", label: "My Draft Journey" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className="px-5 py-2.5 text-[13px] font-semibold transition-colors relative"
            style={{
              color:        activeTab === t.key ? "#1a1a2e" : "#9a8c7a",
              borderBottom: activeTab === t.key ? "2px solid #d4af37" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Plan Tab ───────────────────────────────────────────────── */}
      {activeTab === "plan" && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* LEFT COLUMN */}
          <div className="space-y-5 min-w-0">

            {/* Premise */}
            <Card>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a8c7a] mb-1.5">The Premise</p>
              <p className="text-[14px] text-[#1a1a2e] leading-relaxed">{plan.premise}</p>
            </Card>

            {/* My Favourite Characters */}
            {plan.characters?.length > 0 && (
              <Card>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a8c7a] mb-3">Favourite Characters</p>
                <div className="space-y-3">
                  {plan.characters.map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      {/* <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-serif font-bold text-[#1a1a2e] text-[13px]"
                        style={{ background: "#fdf9ed", border: "1.5px solid #f0d98a" }}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </div> */}
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#1a1a2e] leading-tight">{c.name}</p>
                        {c.description && (
                          <p className="text-[12px] text-[#6b5c4a] leading-relaxed mt-0.5">{c.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Breakdown + Goals row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Project Breakdown — gold ring + sessions + calendar days */}
              <Card className="flex flex-col">
                <p className="text-[14px] font-bold text-[#1a1a2e] mb-4">Project Breakdown</p>
                <div className="flex items-center gap-5 mb-4">
                  <div className="relative flex-shrink-0">
                    <ProgressRing percent={stats.percentComplete} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[20px] font-bold text-[#1a1a2e] leading-none">{stats.percentComplete}%</span>
                    </div>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <MiniStat label="Writing Sessions Done"        value={stats.sessionsDone} />
                    <MiniStat label="Writing Sessions Left"        value={stats.sessionsLeft != null ? `~${stats.sessionsLeft}` : "—"} />
                    <MiniStat label="Weeks to go"           value={stats.sessionsLeft != null ? `~${stats.weeksLeft}` : "—"} />
                    <MiniStat label="Calendar Days Left" value={`~${stats.calendarDaysLeft}`} />
                    <MiniStat label="Estimated finish"     value={stats.estimatedFinishLabel ?? "—"} />
                  </div>
                </div>
                <p className="text-[10.5px] text-[#9a8c7a] leading-relaxed mb-3">
                  <span className="font-semibold text-[#6b5c4a]">Writing Sessions</span> are the number of times you'll need to sit down and write to finish your draft. <span className="font-semibold text-[#6b5c4a]">Weeks and
                  calendar days left</span> show how many days remain until your projected finish date based on your writing schedule.
                </p>
                <div className="pt-3 border-t border-[#f0ebe3] flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[#9a8c7a]">Total {unitLabel(plan.goalType, 2)} written</p>
                    <p className="text-[15px] font-bold text-[#1a1a2e]">
                      {stats.totalSoFar.toLocaleString()} <span className="font-normal text-[#9a8c7a]">/ {plan.targetLength.toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#9a8c7a]">{unitLabel(plan.goalType, 2)} left</p>
                    <p className="text-[15px] font-bold text-[#1a1a2e]">{stats.remaining.toLocaleString()}</p>
                  </div>
                </div>
              </Card>

              {/* Writing Goals — daily orange ring + weekly orange ring + days + treat */}
              <Card>
                <p className="text-[14px] font-bold text-[#1a1a2e] mb-4">Your Writing Goals</p>

                {/* Two rings side by side */}
                <div className="flex items-start justify-around mb-4 gap-2">

                  {/* Daily goal ring — circle on a writing day, square on a non-writing day */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      {todayIsPicked ? (
                        <OrangeRing percent={dailyPercent} size={100} stroke={9} />
                      ) : (
                        <OrangeSquareProgress percent={dailyPercent} size={100} stroke={9} />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[15px] font-bold text-[#1a1a2e] leading-none">
                          {todayCount > 0 ? todayCount.toLocaleString() : plan.dailyGoal.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-[#9a8c7a] mt-0.5">{unitLabel(plan.goalType, 2)}</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a8c7a] text-center">
                      {todayCount > 0 ? "Today" : "Daily goal"}
                    </p>
                    {todayCount > 0 && (
                      <p className="text-[10px] font-semibold text-center" style={{ color: "#e07b39" }}>
                        {todayIsPicked
                          ? (todayCount >= plan.dailyGoal
                              ? "Done!"
                              : `${(plan.dailyGoal - todayCount).toLocaleString()} to go`)
                          : "Bonus session!"}
                      </p>
                    )}
                  </div>

                  {/* Weekly target ring */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <OrangeRing percent={weeklyPercent} size={100} stroke={9} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[15px] font-bold text-[#1a1a2e] leading-none">
                          {Math.round(weeklyPercent)}%
                        </span>
                        <span className="text-[9px] text-[#9a8c7a] mt-0.5">weekly</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a8c7a] text-center">Weekly target</p>
                    <p className="text-[10px] text-[#6b5c4a] text-center">
                      {stats.weekTotal.toLocaleString()} / {plan.weeklyGoal.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Writing day circles */}
                <div className="mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a8c7a] mb-2">Writing days</p>
                  <div className="flex gap-1.5">
                    {WEEKDAY_ORDER.map((day) => {
                      const isPicked    = pickedDaySet.has(day);
                      const isToday     = day === todayKey;
                      const isDoneToday = isToday && isPicked && loggedPickedToday;
                      const isBonusDay  = isToday && !isPicked && todayCount > 0;

                      let bg        = "#f0ebe3";
                      let border    = "2px solid transparent";
                      let showCheck = false;
                      let showPulse = false;
                      let labelColor = "#9a8c7a";

                      if (isPicked && isToday) {
                        bg         = isDoneToday ? "#d4af37" : "#fff";
                        border     = "2px solid #d4af37";
                        showCheck  = isDoneToday;
                        showPulse  = !isDoneToday;
                        labelColor = "#d4af37";
                      } else if (isPicked) {
                        bg         = "#d4af37";
                        showCheck  = true;
                        labelColor = "#b8860b";
                      } else if (isBonusDay) {
                        bg         = "#fff3e0";
                        border     = "2px solid #e07b39";
                        labelColor = "#e07b39";
                      }

                      return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] font-bold" style={{ color: labelColor }}>
                            {WEEKDAY_LABEL[day]}
                          </span>
                          <div
                            className="w-full aspect-square rounded-full flex items-center justify-center transition-all relative"
                            style={{ background: bg, border, maxWidth: 28 }}
                            title={
                              isBonusDay ? "Bonus session today!" :
                              (isPicked && isToday
                                ? (isDoneToday ? "Goal done today!" : `Daily goal: ${plan.dailyGoal} ${unitLabel(plan.goalType, plan.dailyGoal)}`)
                                : undefined)
                            }
                          >
                            {showPulse && (
                              <span className="absolute inset-0 rounded-full animate-ping"
                                style={{ background: "#d4af3740" }} />
                            )}
                            {showCheck && (
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                                stroke={isPicked && isToday && !isDoneToday ? "#d4af37" : "#1a1a2e"}
                                strokeWidth="3" strokeLinecap="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                            {isBonusDay && (
                              <span className="text-[9px] font-bold" style={{ color: "#e07b39" }}>+</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {todayIsPicked && (
                    <p className="text-[11px] mt-2" style={{ color: loggedPickedToday ? "#b8860b" : "#9a8c7a" }}>
                      {loggedPickedToday
                        ? `Today's goal done — enjoy your ${plan.dailyTreat}`
                        : `Today: ${plan.dailyGoal} ${unitLabel(plan.goalType, plan.dailyGoal)} to write`}
                    </p>
                  )}
                  {!todayIsPicked && todayCount > 0 && (
                    <p className="text-[11px] mt-2 font-semibold" style={{ color: "#e07b39" }}>
                      Bonus session today — {todayCount.toLocaleString()} {unitLabel(plan.goalType, todayCount)} extra!
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-[#f0ebe3]">
                  <div className="bg-[#fdf9ed] border border-[#f0d98a] rounded-lg p-3">
                    <p className="text-[11px] font-bold text-[#b8860b] mb-2">Treat yourself</p>
                    <p className="text-[12px] text-[#1a1a2e] mb-1"><span className="font-semibold">Daily:</span> {plan.dailyTreat}</p>
                    <p className="text-[12px] text-[#1a1a2e]"><span className="font-semibold">Weekly:</span> {plan.weeklyTreat}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Motivation & Inspiration */}
            <div>
              <SectionTitle>My Inspirations &amp; Motivations</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Card>
                  <p className="text-[12px] font-bold text-[#1a1a2e] mb-2">My "Why"</p>
                  <p className="text-[11px] font-semibold text-[#9a8c7a] uppercase tracking-wide mb-1">What finishing means to me</p>
                  <p className="text-[13px] text-[#6b5c4a] leading-relaxed mb-3">{plan.whatItMeans}</p>
                  <p className="text-[11px] font-semibold text-[#9a8c7a] uppercase tracking-wide mb-1">Why I want to finish</p>
                  <p className="text-[13px] text-[#6b5c4a] leading-relaxed">{plan.whyFinish}</p>
                </Card>
                <InspirationGalleryCard plan={plan} onPlanUpdated={handlePlanUpdated} />
              </div>
            </div>

            {/* Related blog posts — kept inside the left column on purpose:
                the right sidebar (Writers & Their Characters, Writing with
                you today) can grow much taller than the left column as more
                writers/details show up, and this used to sit below the whole
                two-column grid, so it got pushed further and further down
                whenever the sidebar grew. Living in the left column now, its
                position only tracks the left column's own height. */}
            <div>
              <RelatedArticles tags={["drafting", "successful-stories"]} />
            </div>
          </div>

          {/* RIGHT COLUMN — Writer's Room */}
          <div className="space-y-5">
            <Card className="p-6">
              <p className="font-serif text-[#1a1a2e] text-lg font-bold mb-4">In the Zone Today</p>

              <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a8c7a] mb-3">Writers who logged today's progress</p>
              <div className="space-y-3 mb-6">
                {loggedToday.length === 0 && !communityError && (
                  <p className="text-[12px] text-[#c2b8a8] italic">No one has logged yet today — be the first.</p>
                )}
                {loggedToday.map((w) => (
                  <div key={w.userId} className="flex items-center gap-3">
                    <Avatar username={w.username} avatar={w.avatar} size={34} />
                    <span className="text-[13px] font-semibold text-[#1a1a2e] flex-1 truncate">{w.username}</span>
                    <span
                      className="flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0"
                      style={{ color: w.isPickedDay ? "#b8860b" : "#e07b39" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: w.isPickedDay ? "#d4af37" : "#e07b39" }} />
                      {w.isPickedDay ? "Logged today" : "Bonus session"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Same-day writing peers — only ever populated when the viewer's
                  own plan has today picked too, so this section only appears
                  for people it's actually relevant to. Each peer is marked
                  logged (green check) or still getting ready (grey check),
                  rather than dropping off the list once they've logged. */}
              {scheduledToday.length > 0 && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#9a8c7a] mb-3">Writing with you today</p>
                  <div className="space-y-3">
                    {scheduledToday.map((w) => (
                      <div key={w.userId} className="flex items-center gap-3">
                        <Avatar username={w.username} avatar={w.avatar} size={34} />
                        <span className="text-[13px] font-semibold text-[#1a1a2e] flex-1 truncate">{w.username}</span>
                        <span
                          className="flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0"
                          style={{ color: w.hasLoggedToday ? "#2f9e44" : "#9a8c7a" }}
                        >
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: w.hasLoggedToday ? "#2f9e44" : "#e8e0d0" }}
                          >
                            {w.hasLoggedToday ? (
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            ) : (
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9a8c7a" strokeWidth="4" strokeLinecap="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </span>
                          {w.hasLoggedToday ? "Logged progress today" : "Getting ready"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {communityError && loggedToday.length === 0 && activeWriters.length === 0 && (
                <p className="text-[12px] text-[#c2b8a8] italic">Couldn't load community activity right now.</p>
              )}
            </Card>

            {activeWriters.length > 0 && (
              <Card className="p-6">
                <p className="font-serif text-[#1a1a2e] text-base font-bold mb-4">Writers &amp; Their Characters</p>
                <div className="space-y-4">
                  {activeWriters.slice(writersPage * WRITERS_PER_PAGE, writersPage * WRITERS_PER_PAGE + WRITERS_PER_PAGE).map((w) => {
                    const isExpanded = expandedWriters.has(w.planId);
                    return (
                      <div key={w.planId} className="pb-4 border-b border-[#f0ebe3] last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <Avatar username={w.username} avatar={w.avatar} size={38} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-[#1a1a2e] truncate">{w.username}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <LinearProgress percent={w.percentComplete} height={5} />
                              <span className="text-[11px] text-[#9a8c7a] flex-shrink-0">{w.percentComplete}%</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleWriterExpanded(w.planId)}
                            className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#b8860b] hover:text-[#9a6f00] transition-colors"
                          >
                            {isExpanded ? "Hide" : "Details"}
                            <svg
                              width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                              strokeLinecap="round" strokeLinejoin="round"
                              style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-3.5 pl-[50px] space-y-3.5">
                            {/* Writing days */}
                            <div>
                              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#c2b8a8] mb-1.5">
                                Writing days
                              </p>
                              <WriterDayCircles writingDays={w.writingDays} lastLogDate={w.lastLogDate} />
                            </div>

                            {/* Sessions done / left */}
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#c2b8a8]">Sessions done</p>
                                <p className="text-[13px] font-semibold text-[#1a1a2e]">{w.sessionsDone ?? 0}</p>
                              </div>
                              <div>
                                <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#c2b8a8]">Sessions to go</p>
                                <p className="text-[13px] font-semibold text-[#1a1a2e]">{w.sessionsLeft ?? "—"}</p>
                              </div>
                            </div>

                            {/* Favourite characters */}
                            {w.characters?.length > 0 && (
                              <div>
                                <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#c2b8a8] mb-1.5">
                                  Favourite characters
                                </p>
                                <div className="space-y-2">
                                  {w.characters.slice(0, 3).map((c) => (
                                    <div key={c.id} className="min-w-0">
                                      <p className="text-[13px] font-semibold text-[#1a1a2e] leading-tight">{c.name}</p>
                                      {c.description && (
                                        <p className="text-[12px] text-[#9a8c7a] leading-snug mt-0.5">{c.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {activeWriters.length > WRITERS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f0ebe3]">
                    <button
                      type="button"
                      onClick={() => setWritersPage((p) => Math.max(p - 1, 0))}
                      disabled={writersPage === 0}
                      className="text-[11px] font-semibold text-[#b8860b] hover:text-[#9a6f00] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    <span className="text-[11px] text-[#9a8c7a]">
                      Page {writersPage + 1} of {Math.ceil(activeWriters.length / WRITERS_PER_PAGE)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setWritersPage((p) =>
                          Math.min(p + 1, Math.ceil(activeWriters.length / WRITERS_PER_PAGE) - 1)
                        )
                      }
                      disabled={writersPage >= Math.ceil(activeWriters.length / WRITERS_PER_PAGE) - 1}
                      className="text-[11px] font-semibold text-[#b8860b] hover:text-[#9a6f00] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
        </>
      )}

      {/* ── Draft Journey Tab ──────────────────────────────────────── */}
      {activeTab === "journey" && (
        <DraftJourney plan={plan} stats={stats} localSessions={localSessions} />
      )}

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showLogModal && (
        <LogProgressModal
          plan={plan}
          onClose={() => setShowLogModal(false)}
          onLogged={handleLogged}
        />
      )}
      {tadaResult && (
        <TadaModal result={tadaResult} plan={plan} onClose={() => setTadaResult(null)} />
      )}
      {showEditModal && (
        <EditProjectModal
          plan={plan}
          onClose={() => setShowEditModal(false)}
          onSaved={handlePlanUpdated}
        />
      )}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          storyTitle={plan.storyTitle}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}
      <StartGroupSprintModal
        isOpen={showSprintModal}
        onClose={() => setShowSprintModal(false)}
        onCreated={handleSprintCreated}
      />
    </div>
  );
}

// ── Draft Journey Tab ──────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function DraftJourney({ plan, stats, localSessions = [] }) {
  // Server-side logs: one row per day (the backend upserts/accumulates).
  // localSessions: every individual add/remove action done this browser session,
  // each with the delta (amount typed that action), shown at the top so the
  // writer can see "wrote 500, then wrote 300 more" within a single day.
  const serverLogs = [...(plan.progressLogs ?? [])].sort(
    (a, b) => new Date(b.logDate) - new Date(a.logDate)
  );

  // For summary stats: count server log rows (one per day) + any local sessions
  // logged today that aren't reflected in a server row yet (first action of day).
  const todayDateStr     = new Date().toLocaleDateString("en-CA");
  const hasTodayServer   = serverLogs.some(
    (l) => new Date(l.logDate).toISOString().slice(0, 10) === todayDateStr
  );
  const totalEntries     = serverLogs.length + (hasTodayServer ? 0 : localSessions.length > 0 ? 1 : 0);
  const bonusSessions    = serverLogs.filter((l) => !l.isPickedDay).length;
  const goalHitCount     = serverLogs.filter((l) => l.metDailyGoal).length;

  // Group server logs by month for the historical timeline
  const grouped = {};
  serverLogs.forEach((l) => {
    const d   = new Date(l.logDate);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (!grouped[key]) {
      grouped[key] = {
        label: `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        logs:  [],
      };
    }
    grouped[key].logs.push(l);
  });

  const isEmpty = serverLogs.length === 0 && localSessions.length === 0;

  if (isEmpty) {
    return (
      <div className="max-w-[640px] mx-auto">
        <Card className="text-center py-12">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "#fdf9ed" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 className="font-serif text-[#1a1a2e] text-lg font-bold mb-2">Your journey starts here</h3>
          <p className="text-[13px] text-[#9a8c7a] leading-relaxed max-w-sm mx-auto">
            Every time you log progress, it gets recorded here — your complete writing history for this draft, including your notes.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[760px]">

      {/* Journey summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Sessions logged",  value: totalEntries },
          { label: "Goal days hit",    value: goalHitCount },
          { label: "Bonus sessions",   value: bonusSessions },
          {
            label: "Total written",
            value: `${stats.totalSoFar.toLocaleString()} ${unitLabel(plan.goalType, stats.totalSoFar)}`,
          },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e8e0d0] rounded-xl p-4 text-center">
            <p className="text-[18px] font-bold text-[#1a1a2e] leading-tight">{s.value}</p>
            <p className="text-[10px] text-[#9a8c7a] mt-0.5 uppercase tracking-wide font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Today's individual sessions (this browser session only) ── */}
      {localSessions.length > 0 && (
        <div className="mb-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9a8c7a] mb-3 pl-1 flex items-center gap-2">
            Today
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: "#fdf9ed", color: "#b8860b" }}
            >
              This session
            </span>
          </p>
          <div className="space-y-2">
            {localSessions.map((s) => {
              const isRemoval  = s.direction === "remove";
              const isBonus    = !s.isPickedDay;
              const metGoal    = s.metDailyGoal;
              const absDelta   = Math.abs(s.delta);
              const d          = new Date(s.logDate);
              const timeStr    = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

              return (
                <div
                  key={s.id}
                  className="bg-white border border-[#e8e0d0] rounded-xl p-4 flex gap-4"
                  style={
                    isRemoval ? { borderLeft: "3px solid #c0392b" } :
                    isBonus   ? { borderLeft: "3px solid #e07b39" } :
                    metGoal   ? { borderLeft: "3px solid #d4af37" } :
                    { borderLeft: "3px solid #e8e0d0" }
                  }
                >
                  {/* Time column */}
                  <div className="flex-shrink-0 w-[64px] text-right">
                    <p className="text-[11px] font-bold text-[#1a1a2e]">{timeStr}</p>
                    <p className="text-[10px] text-[#9a8c7a] mt-0.5">Today</p>
                  </div>

                  <div className="w-px bg-[#f0ebe3] flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold" style={{ color: isRemoval ? "#c0392b" : "#1a1a2e" }}>
                        {isRemoval ? "−" : "+"}{absDelta.toLocaleString()} {unitLabel(plan.goalType, absDelta)}{" "}
                        <span className="font-normal text-[#9a8c7a]">
                          ({isRemoval ? "removed" : "written"} · {s.runningTotal.toLocaleString()} total today)
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isBonus && !isRemoval && (
                          <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "#fff3e0", color: "#e07b39" }}>
                            Bonus
                          </span>
                        )}
                        {metGoal && !isBonus && !isRemoval && (
                          <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "#fdf9ed", color: "#b8860b" }}>
                            Goal hit
                          </span>
                        )}
                      </div>
                    </div>
                    {s.note && (
                      <p className="text-[12px] text-[#6b5c4a] mt-1.5 leading-relaxed italic border-l-2 border-[#f0d98a] pl-2">
                        {s.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Historical timeline (one entry per day from server) ── */}
      {Object.values(grouped).length > 0 && (
        <div className="space-y-7">
          {Object.values(grouped).map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9a8c7a] mb-3 pl-1">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.logs.map((l, i) => {
                  const d        = new Date(l.logDate);
                  const dayName  = DAY_NAMES[d.getUTCDay()];
                  const dateStr  = `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
                  const isBonus  = !l.isPickedDay;
                  const metGoal  = l.metDailyGoal;
                  // Flag if this is today's server row — already shown individually above
                  const isToday  = new Date(l.logDate).toISOString().slice(0, 10) === todayDateStr;

                  return (
                    <div
                      key={i}
                      className="bg-white border border-[#e8e0d0] rounded-xl p-4 flex gap-4"
                      style={
                        isBonus   ? { borderLeft: "3px solid #e07b39" } :
                        metGoal   ? { borderLeft: "3px solid #d4af37" } :
                        {}
                      }
                    >
                      {/* Date column */}
                      <div className="flex-shrink-0 w-[64px] text-right">
                        <p className="text-[11px] font-bold text-[#1a1a2e]">{isToday ? "Today" : dayName.slice(0, 3)}</p>
                        <p className="text-[11px] text-[#9a8c7a]">{dateStr}</p>
                      </div>

                      <div className="w-px bg-[#f0ebe3] flex-shrink-0" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold text-[#1a1a2e]">
                            {l.countLogged.toLocaleString()} {unitLabel(plan.goalType, l.countLogged)} written
                            {isToday && localSessions.length > 1 && (
                              <span className="font-normal text-[#9a8c7a] text-[11px]"> · day total</span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isBonus && (
                              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "#fff3e0", color: "#e07b39" }}>
                                Bonus
                              </span>
                            )}
                            {metGoal && !isBonus && (
                              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "#fdf9ed", color: "#b8860b" }}>
                                Goal hit
                              </span>
                            )}
                          </div>
                        </div>
                        {l.note ? (
                          <p className="text-[12px] text-[#6b5c4a] mt-1.5 leading-relaxed italic border-l-2 border-[#f0d98a] pl-2">
                            {l.note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Running total footer */}
      <div className="mt-8 pt-5 border-t border-[#e8e0d0] text-center">
        <p className="text-[12px] text-[#9a8c7a]">
          {stats.totalSoFar.toLocaleString()} {unitLabel(plan.goalType, stats.totalSoFar)} of{" "}
          {plan.targetLength.toLocaleString()} — {stats.percentComplete}% of this draft written
        </p>
        {plan.isCompleted && (
          <p className="text-[13px] font-bold text-[#d4af37] mt-1">Draft complete.</p>
        )}
      </div>
    </div>
  );
}

// ── Tada modal ─────────────────────────────────────────────────────────────

function TadaModal({ result, plan, onClose }) {
  const isBonus = result.isPickedDay === false;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-[#e8e0d0] overflow-hidden text-center"
        style={{ borderTop: "4px solid #d4af37" }}
      >
        <div className="px-6 pt-8 pb-6">
          <div className="text-5xl mb-4 select-none">{isBonus ? "✨" : "🎉"}</div>
          <h3 className="font-serif text-[#1a1a2e] text-xl font-bold mb-2 leading-tight">
            {isBonus ? "Bonus session, goal hit!" : "Daily goal done!"}
          </h3>
          <p className="text-[13px] text-[#6b5c4a] leading-relaxed mb-5">
            {isBonus ? (
              <>
                Not even a scheduled day, and you still hit{" "}
                <span className="font-bold text-[#1a1a2e]">
                  {plan.dailyGoal} {unitLabel(plan.goalType, plan.dailyGoal)}
                </span>
                . Go treat yourself with your daily treat.
              </>
            ) : (
              <>
                You hit your goal of{" "}
                <span className="font-bold text-[#1a1a2e]">
                  {plan.dailyGoal} {unitLabel(plan.goalType, plan.dailyGoal)}
                </span>{" "}
                today. Now go treat yourself.
              </>
            )}
          </p>
          <div className="bg-[#fdf9ed] border border-[#f0d98a] rounded-lg px-4 py-3 mb-5">
            <p className="text-[11px] font-bold text-[#b8860b] uppercase tracking-wide mb-1">Your treat</p>
            <p className="text-[15px] font-bold text-[#1a1a2e]">{result.dailyTreat ?? plan.dailyTreat}</p>
          </div>
          {result.metWeeklyGoal && result.weeklyTreat && (
            <div className="bg-[#fdf9ed] border border-[#f0d98a] rounded-lg px-4 py-3 mb-5">
              <p className="text-[11px] font-bold text-[#b8860b] uppercase tracking-wide mb-1">Weekly goal hit too!</p>
              <p className="text-[15px] font-bold text-[#1a1a2e]">{result.weeklyTreat}</p>
            </div>
          )}
          <PrimaryButton onClick={onClose} className="w-full py-3">Enjoy it</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ── Inspiration Gallery ────────────────────────────────────────────────────

function InspirationGalleryCard({ plan, onPlanUpdated }) {
  const [images, setImages]       = useState(plan.moodboardImages ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(null); // index into images, or null when closed
  const fileRef   = useRef();
  const scrollRef = useRef();
  const MAX_IMAGES = 5;

  function scrollByCard(direction) {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector("[data-gallery-card]");
    const step = card ? card.offsetWidth + 8 /* gap-2 */ : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || images.length >= MAX_IMAGES) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadMoodboardImage(file);
      if (!url) throw new Error("No URL returned.");
      const newImages = [...images, url];
      setImages(newImages);
      const updated = await updateDraftPlan({ moodboardImages: newImages });
      onPlanUpdated?.(updated ?? { ...plan, moodboardImages: newImages });
    } catch (err) {
      setError(err.message ?? "Couldn't upload that image.");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(i) {
    const prev = images;
    const newImages = images.filter((_, idx) => idx !== i);
    setImages(newImages);
    try {
      const updated = await updateDraftPlan({ moodboardImages: newImages });
      onPlanUpdated?.(updated ?? { ...plan, moodboardImages: newImages });
    } catch {
      setImages(prev);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-1">
        <p className="text-[12px] font-bold text-[#1a1a2e]">Inspiration Gallery</p>
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-[11px] text-[#b8860b] font-semibold hover:underline disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "+ Add image"}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {plan.inspirationSource && (
        <p className="text-[12px] text-[#9a8c7a] mb-3 leading-relaxed">{plan.inspirationSource}</p>
      )}
      {error && <p className="text-[11px] text-[#c0392b] mb-2">{error}</p>}
      {images.length > 0 ? (
        <div className="relative -mx-4 px-4">
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {images.map((url, i) => (
              <div
                key={i}
                data-gallery-card
                onClick={() => setLightboxIndex(i)}
                className="flex-shrink-0 w-[42%] min-w-[140px] aspect-[4/3] rounded-lg overflow-hidden bg-[#faf7f2] relative group snap-start cursor-pointer"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 text-white items-center justify-center hidden group-hover:flex hover:bg-black/70 transition-colors"
                  aria-label="Remove image"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow-md border border-[#e8e0d0] flex items-center justify-center hover:bg-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="border border-dashed border-[#e8e0d0] rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-[#fdf9ed] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c2b8a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <p className="text-[11px] text-[#9a8c7a] mt-2">Add inspiration images</p>
        </div>
      )}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </Card>
  );
}

// ── Image Lightbox ──────────────────────────────────────────────────────────

function ImageLightbox({ images, index, onClose, onNavigate }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") onNavigate((i) => (i - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [images.length, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate((index - 1 + images.length) % images.length); }}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate((index + 1) % images.length); }}
            aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </>
      )}

      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
      />

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

// ── Edit Project Modal ─────────────────────────────────────────────────────

function EditProjectModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState({
    storyTitle:        plan.storyTitle ?? "",
    premise:           plan.premise ?? "",
    targetLength:      plan.targetLength ?? "",
    wordsWrittenSoFar: plan.wordsWrittenSoFar ?? "",
    dailyGoal:         plan.dailyGoal ?? "",
    dailyTreat:        plan.dailyTreat ?? "",
    weeklyTreat:       plan.weeklyTreat ?? "",
    whyFinish:         plan.whyFinish ?? "",
    whatItMeans:       plan.whatItMeans ?? "",
    inspirationSource: plan.inspirationSource ?? "",
    writingDays:       plan.writingDays ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function update(patch) { setForm((f) => ({ ...f, ...patch })); }

  function toggleDay(day) {
    const exists = form.writingDays.find((d) => d.day === day);
    if (exists) {
      update({ writingDays: form.writingDays.filter((d) => d.day !== day) });
    } else {
      update({ writingDays: [...form.writingDays, { day, reminderTime: "20:00" }] });
    }
  }

  async function save() {
    if (!form.storyTitle.trim())                       { setError("Story title is required."); return; }
    if (!form.premise.trim())                          { setError("Premise is required."); return; }
    if (!form.targetLength || Number(form.targetLength) < 1) {
      setError(`Total ${unitLabel(plan.goalType, 2)} goal must be at least 1.`); return;
    }
    if (form.wordsWrittenSoFar === "" || Number(form.wordsWrittenSoFar) < 0) {
      setError(`${unitLabel(plan.goalType, 2)} written so far can't be negative.`); return;
    }
    if (!form.dailyGoal || Number(form.dailyGoal) < 1) { setError("Daily goal must be at least 1."); return; }
    if (form.writingDays.length === 0)                 { setError("Pick at least one writing day."); return; }
    setSaving(true);
    setError("");
    try {
      const updated = await updateDraftPlan({
        storyTitle:        form.storyTitle.trim(),
        premise:           form.premise.trim(),
        targetLength:      Number(form.targetLength),
        wordsWrittenSoFar: Number(form.wordsWrittenSoFar),
        dailyGoal:         Number(form.dailyGoal),
        dailyTreat:        form.dailyTreat.trim(),
        weeklyTreat:       form.weeklyTreat.trim(),
        whyFinish:         form.whyFinish.trim(),
        whatItMeans:       form.whatItMeans.trim(),
        inspirationSource: form.inspirationSource.trim(),
        writingDays:       form.writingDays,
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message ?? "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  const selectedDays = form.writingDays.map((d) => d.day);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e8e0d0] overflow-hidden max-h-[90vh] flex flex-col"
        style={{ borderTop: "4px solid #d4af37" }}
      >
        <div className="px-6 pt-6 pb-3 flex items-start justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-1">Edit project</p>
            <h3 className="font-serif text-[#1a1a2e] text-lg font-bold leading-tight">Update your plan</h3>
          </div>
          <button onClick={onClose} className="text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors ml-3 flex-shrink-0 mt-1" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-2 overflow-y-auto space-y-3 flex-1">
          <div><FieldLabel>Story title</FieldLabel><TextInput value={form.storyTitle} onChange={(e) => update({ storyTitle: e.target.value })} /></div>
          <div><FieldLabel>Premise</FieldLabel><TextArea value={form.premise} onChange={(e) => update({ premise: e.target.value })} rows={3} /></div>
          <div>
            <FieldLabel>Total {unitLabel(plan.goalType, 2)} goal</FieldLabel>
            <TextInput type="number" min="1" value={form.targetLength} onChange={(e) => update({ targetLength: e.target.value })} />
          </div>
          {/* <div>
            <FieldLabel
              hint={`This is your starting point — adjust it if you under- or over-counted. It's separate from logging today's session.`}
            >
              {unitLabel(plan.goalType, 2)} written so far (before today's logs)
            </FieldLabel>
            <TextInput type="number" min="0" value={form.wordsWrittenSoFar} onChange={(e) => update({ wordsWrittenSoFar: e.target.value })} />
          </div> */}
          <div><FieldLabel>Daily goal ({unitLabel(plan.goalType, 2)})</FieldLabel><TextInput type="number" min="1" value={form.dailyGoal} onChange={(e) => update({ dailyGoal: e.target.value })} /></div>
          <div>
            <FieldLabel>Writing days</FieldLabel>
            <PillMultiSelect options={WEEKDAY_OPTIONS} values={selectedDays} onToggle={toggleDay} columns={7} />
            <p className="text-[11px] text-[#9a8c7a] mt-1.5">{selectedDays.length} day{selectedDays.length !== 1 ? "s" : ""} selected</p>
          </div>
          <div><FieldLabel>Daily treat</FieldLabel><TextInput value={form.dailyTreat} onChange={(e) => update({ dailyTreat: e.target.value })} /></div>
          <div><FieldLabel>Weekly treat</FieldLabel><TextInput value={form.weeklyTreat} onChange={(e) => update({ weeklyTreat: e.target.value })} /></div>
          <div><FieldLabel>Why I want to finish</FieldLabel><TextArea value={form.whyFinish} onChange={(e) => update({ whyFinish: e.target.value })} rows={2} /></div>
          <div><FieldLabel>What finishing means to me</FieldLabel><TextArea value={form.whatItMeans} onChange={(e) => update({ whatItMeans: e.target.value })} rows={2} /></div>
          <div><FieldLabel>Inspiration source</FieldLabel><TextArea value={form.inspirationSource} onChange={(e) => update({ inspirationSource: e.target.value })} rows={2} /></div>
          <ErrorText>{error}</ErrorText>
        </div>
        <div className="px-6 pb-6 pt-3 flex gap-2 flex-shrink-0 border-t border-[#f0ebe3]">
          <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
          <PrimaryButton onClick={save} disabled={saving} className="flex-1">{saving ? "Saving…" : "Save changes"}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────

function DeleteConfirmModal({ storyTitle, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");

  async function confirm() {
    setDeleting(true);
    setError("");
    try { await onConfirm(); }
    catch (err) { setError(err.message ?? "Couldn't delete this project."); setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-[#e8e0d0] overflow-hidden"
        style={{ borderTop: "4px solid #c0392b" }}
      >
        <div className="px-6 pt-6 pb-6">
          <h3 className="font-serif text-[#1a1a2e] text-lg font-bold mb-2">Delete this project?</h3>
          <p className="text-[13px] text-[#6b5c4a] leading-relaxed mb-1">
            This will permanently delete your plan for{" "}
            <span className="font-semibold">{storyTitle}</span>, including all your logged progress.
          </p>
          <p className="text-[13px] text-[#6b5c4a] leading-relaxed mb-5">This can't be undone.</p>
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2">
            <SecondaryButton onClick={onClose} disabled={deleting} className="flex-1">Cancel</SecondaryButton>
            <button
              type="button" onClick={confirm} disabled={deleting}
              className="flex-1 py-2.5 px-5 bg-[#c0392b] text-white text-sm font-bold rounded-lg hover:bg-[#a93226] transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, delete it"}
            </button>
          </div>
        </div>
      </div>
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
      <p className="font-serif text-[#1a1a2e] text-lg font-bold mb-4">Read While You Draft</p>
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

// ── Small helpers ──────────────────────────────────────────────────────────

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
      style={{ width: size, height: size, background: "#fdf9ed", fontSize: size * 0.4 }}
    >
      {username?.charAt(0).toUpperCase() ?? "?"}
    </div>
  );
}

// Compact read-only version of the "Writing days" circles used on the
// viewer's own plan — for another writer we only know which weekdays they
// picked and whether their most recent log was today, not the live
// in-progress state of today's goal, so this stays simpler (no pulse/partial
// states, just picked vs. not, with today ringed and checked if they've
// already logged something today).
function WriterDayCircles({ writingDays, lastLogDate }) {
  const pickedSet     = new Set((writingDays ?? []).map((d) => d.day));
  const todayKey      = JS_TO_KEY[new Date().getDay()];
  const todayDateStr  = new Date().toLocaleDateString("en-CA");
  const loggedToday   = lastLogDate && new Date(lastLogDate).toISOString().slice(0, 10) === todayDateStr;

  return (
    <div className="flex gap-1">
      {WEEKDAY_ORDER.map((day) => {
        const isPicked = pickedSet.has(day);
        const isToday  = day === todayKey;
        const isDone   = isToday && isPicked && loggedToday;

        let bg     = "#f0ebe3";
        let border = "2px solid transparent";
        if (isPicked && isToday) {
          bg     = isDone ? "#d4af37" : "#fff";
          border = "2px solid #d4af37";
        } else if (isPicked) {
          bg = "#d4af37";
        }

        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-[8px] font-bold" style={{ color: isPicked ? "#b8860b" : "#c2b8a8" }}>
              {WEEKDAY_LABEL[day]}
            </span>
            <div
              className="w-full aspect-square rounded-full flex items-center justify-center"
              style={{ background: bg, border, maxWidth: 20 }}
            >
              {(isPicked && (isDone || !isToday)) && (
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function computeStats(plan) {
  const logs = plan.progressLogs ?? [];

  // Deduplicate by calendar date — the backend should have one row per day
  // (upsert), but if any duplicate rows exist from a prior frontend bug,
  // summing them all would inflate totalLogged and make sessionsLeft read as
  // 0 (draft looks "done" when it isn't). We keep the highest countLogged
  // per date, which is what the server's accumulated value should be.
  const byDate = new Map();
  for (const l of logs) {
    const dateKey = new Date(l.logDate).toISOString().slice(0, 10);
    const existing = byDate.get(dateKey);
    if (!existing || (l.countLogged ?? 0) > (existing.countLogged ?? 0)) {
      byDate.set(dateKey, l);
    }
  }
  const dedupedLogs = Array.from(byDate.values());

  const totalLogged   = dedupedLogs.reduce((acc, l) => acc + (l.countLogged ?? 0), 0);
  const totalSoFar    = (plan.wordsWrittenSoFar ?? 0) + totalLogged;
  const remaining     = Math.max((plan.targetLength ?? 0) - totalSoFar, 0);
  // sessionsDone = any picked writing day where the writer logged something.
  // We no longer require metDailyGoal=true because old log rows created before
  // the metDailyGoal flag was reliable may be false even when the writer did
  // hit their goal. A simpler, always-correct count: picked days with any log.
  const sessionsDone  = dedupedLogs.filter((l) => l.isPickedDay && (l.countLogged ?? 0) > 0).length;
  const daysLogged    = dedupedLogs.length; // total days with any entry (picked + bonus)
  const sessionsLeft  = plan.dailyGoal > 0 ? Math.ceil(remaining / plan.dailyGoal) : null;
  const writingDaysCount = plan.writingDays?.length || 1;
  const weeksLeft     = Math.ceil((sessionsLeft ?? 0) / writingDaysCount);
  const percentComplete = plan.targetLength > 0
    ? Math.min(Math.round((totalSoFar / plan.targetLength) * 100), 100)
    : 0;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const weekTotal = dedupedLogs
    .filter((l) => new Date(l.logDate) >= weekStart)
    .reduce((acc, l) => acc + (l.countLogged ?? 0), 0);

  const sortedLogs = [...dedupedLogs].sort((a, b) => new Date(a.logDate) - new Date(b.logDate));
  const firstLogDate = sortedLogs[0] ? new Date(sortedLogs[0].logDate) : null;
  const calendarDaysCompleted = firstLogDate
    ? Math.floor((now - firstLogDate) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const calendarDaysLeft = weeksLeft * 7;

  const estimatedFinishLabel = calendarDaysLeft > 0
    ? new Date(now.getTime() + calendarDaysLeft * 24 * 60 * 60 * 1000)
        .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : (remaining === 0 ? "Done!" : null);

  return {
    totalSoFar, remaining, daysLogged, sessionsDone, sessionsLeft,
    weeksLeft, weeksLeftDays: weeksLeft * 7, percentComplete, weekTotal,
    calendarDaysCompleted, calendarDaysLeft, estimatedFinishLabel,
  };
}