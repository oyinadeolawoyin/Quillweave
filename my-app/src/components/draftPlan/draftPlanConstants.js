// src/components/draftplan/draftPlanConstants.js

export const GOAL_TYPE_OPTIONS = [
  { value: "WORDS",    label: "Words" },
  { value: "CHAPTERS", label: "Chapters" },
  { value: "SCENES",   label: "Scenes" },
];

export const GOAL_TYPE_UNIT = {
  WORDS:    { singular: "word",    plural: "words" },
  CHAPTERS: { singular: "chapter", plural: "chapters" },
  SCENES:   { singular: "scene",   plural: "scenes" },
};

export function unitLabel(goalType, count) {
  const meta = GOAL_TYPE_UNIT[goalType] ?? GOAL_TYPE_UNIT.WORDS;
  return count === 1 ? meta.singular : meta.plural;
}

export const WEEKDAY_OPTIONS = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
];

// Mirrors backend calcDerivedFields() in draftPlanService.js so the wizard
// can preview goal math live, before the plan is created. The wizard surfaces
// estimatedSessions/estimatedWeeks (concrete: "X writing sessions, ~Y weeks"
// based on the days you actually picked) rather than estimatedDays, since a
// raw calendar-day count implies a precision the estimate doesn't have.
// estimatedDays is kept here too since the plan dashboard still displays it
// post-creation. Keep in sync with the backend — this is a preview only.
export function previewDerivedFields(targetLength, wordsWrittenSoFar, dailyGoal, writingDaysCount) {
  const remaining = Math.max((targetLength || 0) - (wordsWrittenSoFar || 0), 0);
  const safeDailyGoal = dailyGoal > 0 ? dailyGoal : 0;
  const estimatedSessions = safeDailyGoal > 0 ? Math.ceil(remaining / safeDailyGoal) : 0;
  const safeWritingDays = writingDaysCount > 0 ? writingDaysCount : 1;
  const estimatedWeeks = Math.ceil(estimatedSessions / safeWritingDays);
  const estimatedDays = estimatedWeeks * 7;
  const weeklyGoal = safeDailyGoal * safeWritingDays;

  // Rough projected finish date — today + estimatedDays. This is a calendar
  // estimate (not a guarantee), so we surface it as a month/year, not an
  // exact date, to avoid implying false precision.
  const estimatedFinishDate = estimatedDays > 0
    ? new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000)
    : null;
  const estimatedFinishLabel = estimatedFinishDate
    ? estimatedFinishDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return {
    estimatedSessions, estimatedWeeks, estimatedDays, weeklyGoal, remaining,
    estimatedFinishDate, estimatedFinishLabel,
  };
}

// A gentle "reduce the expectation" suggestion — offered after the writer
// states what they believe they can write per day, nudged down ~20% and
// rounded to a friendly number, never below 1.
export function suggestReducedGoal(believedDailyAmount, goalType) {
  if (!believedDailyAmount || believedDailyAmount < 1) return 1;
  const reduced = Math.round(believedDailyAmount * 0.8);
  if (goalType === "WORDS") {
    // round words to nearest 25 for a cleaner number
    return Math.max(25, Math.round(reduced / 25) * 25);
  }
  return Math.max(1, reduced);
}