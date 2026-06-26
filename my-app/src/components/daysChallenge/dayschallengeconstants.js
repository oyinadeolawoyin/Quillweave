// src/components/daysChallenge/daysChallengeConstants.js
// Mirrors backend constants in daysChallengeService.js — keep in sync.

export const DURATION_OPTIONS = [
  { value: "SEVEN",   label: "7 days",  blurb: "A quick sprint to build momentum" },
  { value: "FIFTEEN", label: "15 days", blurb: "A deeper push for real progress" },
];

export const DURATION_DAYS = { SEVEN: 7, FIFTEEN: 15 };

export const FOCUS_OPTIONS = [
  { value: "OUTLINING",         label: "Outlining" },
  { value: "BRAINSTORMING",     label: "Brainstorming" },
  { value: "EDITING",           label: "Editing" },
  { value: "STORY_DEVELOPMENT", label: "Story Development" },
];

export const GOAL_TYPE_OPTIONS = [
  { value: "WORDS",    label: "Words" },
  { value: "DURATION", label: "Minutes" },
];

export function unitLabel(goalType, count) {
  if (goalType === "DURATION") return count === 1 ? "minute" : "minutes";
  return count === 1 ? "word" : "words";
}

// Lightweight client-side mirror of computeStats() in the backend service —
// used to render an immediate preview before the challenge is created.
// Keep in sync with daysChallengeService.js computeStats().
export function previewChallengeStats(duration, dailyGoal) {
  const totalDays = DURATION_DAYS[duration] ?? 0;
  const safeDailyGoal = dailyGoal > 0 ? dailyGoal : 0;
  const totalTarget = totalDays * safeDailyGoal;
  const endDate = totalDays > 0 ? new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000) : null;
  const endDateLabel = endDate
    ? endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  return { totalDays, totalTarget, endDateLabel };
}