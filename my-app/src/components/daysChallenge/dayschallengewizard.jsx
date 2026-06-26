// src/components/daysChallenge/daysChallengeWizard.jsx
// Single-flow conversational wizard for joining a Days Challenge — lighter
// weight than the Draft Plan wizard (one step, not three) since the
// challenge itself is a short-term commitment, not a full project plan.
//
// Guest flow: same idea as the Draft Plan wizard — a logged-out visitor
// answers every question normally. Only at the final SUMMARY step, right
// before "Start my challenge" would actually create it, do we check for an
// account. If there isn't one, we open a signup modal instead of submitting;
// once signup succeeds we immediately create the challenge with the answers
// already collected, then navigate as usual.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, FieldLabel, TextInput, TextArea, ErrorText, PrimaryButton,
  PillSelect, StepDots,
} from "../draftPlan/draftPlanUI";
import SignupGateModal from "../auth/signupgatemodal";
import {
  DURATION_OPTIONS, FOCUS_OPTIONS, GOAL_TYPE_OPTIONS, unitLabel,
  previewChallengeStats,
} from "./dayschallengeconstants.js";
import { createChallenge } from "./dayschallengeapi.js";
import { useAuth } from "../auth/authContext";

const SUB_STEPS = [
  "DURATION",     // 7 or 15 days
  "FOCUS",        // up to 2 focuses
  "WORKING_GOAL", // what they want to accomplish
  "WHY_NOW",      // why this matters now
  "GOAL_TYPE",    // words or minutes
  "DAILY_GOAL",   // the daily number
  "REMINDER_TIME",// daily check-in reminder time
  "STORY_TITLE",  // optional
  "SUMMARY",      // preview + submit
];

const MAX_FOCUSES = 2;

export default function DaysChallengeWizard({ initialDuration, onCreated, onExit }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sub, setSub] = useState(() => {
    // If arriving from a deep link with a duration preset (e.g. the
    // outline-check stub in the draft plan wizard), skip straight past it.
    return 0;
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showSignupGate, setShowSignupGate] = useState(false);
  const [data, setData] = useState({
    duration: initialDuration ?? "",
    focuses: [],
    storyTitle: "",
    workingGoal: "",
    whyNow: "",
    goalType: "WORDS",
    dailyGoal: "",
    reminderTime: "09:00",
  });

  const step = SUB_STEPS[sub];

  function go(delta) {
    setError("");
    setSub((s) => Math.max(0, Math.min(SUB_STEPS.length - 1, s + delta)));
  }

  function update(patch) {
    setData((d) => ({ ...d, ...patch }));
  }

  function next(validate) {
    if (validate) {
      const err = validate();
      if (err) { setError(err); return; }
    }
    setError("");
    go(1);
  }

  function toggleFocus(value) {
    setData((d) => {
      const has = d.focuses.includes(value);
      if (has) return { ...d, focuses: d.focuses.filter((f) => f !== value) };
      if (d.focuses.length >= MAX_FOCUSES) return d;
      return { ...d, focuses: [...d.focuses, value] };
    });
  }

  function buildPayload() {
    return {
      duration:     data.duration,
      focuses:      data.focuses,
      storyTitle:   data.storyTitle?.trim() || undefined,
      workingGoal:  data.workingGoal.trim(),
      whyNow:       data.whyNow.trim(),
      goalType:     data.goalType,
      dailyGoal:    Number(data.dailyGoal),
      reminderTime: data.reminderTime,
    };
  }

  // Runs the real "create the challenge" call. Used both for already
  // logged-in writers (called directly from handleSubmit) and for guests
  // right after they finish signing up in the modal (handleSignedUp).
  async function createTheChallenge() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await createChallenge(buildPayload());
      onCreated?.(result.challenge);
      navigate("/days-challenge");
    } catch (err) {
      setSubmitError(err.message ?? "Something went wrong starting your challenge.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    if (!user) {
      // Don't lose their answers — gate on having an account, then create
      // the challenge automatically once they're signed up.
      setShowSignupGate(true);
      return;
    }
    createTheChallenge();
  }

  // Called by the modal once /auth/signup succeeds and the session cookie
  // is set, so the challenge we create right after lands on the new account.
  function handleSignedUp() {
    setShowSignupGate(false);
    createTheChallenge();
  }

  const preview = previewChallengeStats(data.duration, Number(data.dailyGoal) || 0);

  return (
    <div className="max-w-[560px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={onExit}
          className="text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Exit
        </button>
        <StepDots total={SUB_STEPS.length} current={sub} />
      </div>

      <p className="text-[11px] font-semibold text-[#9a8c7a] text-center mb-5 uppercase tracking-wide">
        Question {sub + 1} of {SUB_STEPS.length}
      </p>

      {step === "DURATION" && (
        <QuestionCard eyebrow="Question 1" title="How many days do you want to commit to?">
          <div className="grid grid-cols-2 gap-2">
            {DURATION_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { update({ duration: o.value }); go(1); }}
                className="text-left p-4 rounded-lg border transition-all"
                style={
                  data.duration === o.value
                    ? { background: "#1a1a2e", borderColor: "#1a1a2e" }
                    : { background: "#faf7f2", borderColor: "#e8e0d0" }
                }
              >
                <p className="text-[16px] font-bold mb-0.5" style={{ color: data.duration === o.value ? "#fff" : "#1a1a2e" }}>
                  {o.label}
                </p>
                <p className="text-[11px] leading-snug" style={{ color: data.duration === o.value ? "#c2b8a8" : "#9a8c7a" }}>
                  {o.blurb}
                </p>
              </button>
            ))}
          </div>
          <ErrorText>{error}</ErrorText>
          <NavRow hideNext />
        </QuestionCard>
      )}

      {step === "FOCUS" && (
        <QuestionCard eyebrow="Question 2" title="What do you want to focus on?" hint={`Pick up to ${MAX_FOCUSES}.`}>
          <div className="grid grid-cols-2 gap-1.5">
            {FOCUS_OPTIONS.map((o) => {
              const active = data.focuses.includes(o.value);
              const disabled = !active && data.focuses.length >= MAX_FOCUSES;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggleFocus(o.value)}
                  disabled={disabled}
                  className="py-2.5 text-[12px] font-semibold rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={
                    active
                      ? { background: "#d4af37", color: "#1a1a2e", borderColor: "#d4af37" }
                      : { background: "#faf7f2", color: "#6b5c4a", borderColor: "#e8e0d0" }
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(() => (data.focuses.length === 0 ? "Pick at least one focus." : null))} />
        </QuestionCard>
      )}

      {step === "WORKING_GOAL" && (
        <QuestionCard eyebrow="Question 3" title="What do you want to accomplish in these days?">
          <TextArea
            value={data.workingGoal}
            onChange={(e) => update({ workingGoal: e.target.value })}
            placeholder="e.g. Get a full outline down for my fantasy novel"
            rows={3}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(() => (!data.workingGoal.trim() ? "Tell us your goal for this challenge." : null))} />
        </QuestionCard>
      )}

      {step === "WHY_NOW" && (
        <QuestionCard eyebrow="Question 4" title="Why does this matter right now?">
          <TextArea
            value={data.whyNow}
            onChange={(e) => update({ whyNow: e.target.value })}
            placeholder="e.g. I keep putting this off and I want to build momentum before next month"
            rows={3}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(() => (!data.whyNow.trim() ? "Tell us why this matters now." : null))} />
        </QuestionCard>
      )}

      {step === "GOAL_TYPE" && (
        <QuestionCard eyebrow="Question 5" title="Will you track this in words or minutes?">
          <PillSelect options={GOAL_TYPE_OPTIONS} value={data.goalType} onChange={(v) => update({ goalType: v })} columns={2} />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => go(1)} />
        </QuestionCard>
      )}

      {step === "DAILY_GOAL" && (
        <QuestionCard eyebrow="Question 6" title={`What's your daily goal, in ${unitLabel(data.goalType, 2)}?`}>
          <TextInput
            type="number" min="1"
            value={data.dailyGoal}
            onChange={(e) => update({ dailyGoal: e.target.value })}
            placeholder={data.goalType === "WORDS" ? "e.g. 500" : "e.g. 20"}
            onKeyDown={(e) => e.key === "Enter" && next(validateDailyGoal)}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(validateDailyGoal)} />
        </QuestionCard>
      )}

      {step === "REMINDER_TIME" && (
        <QuestionCard
          eyebrow="Question 7"
          title="When should we remind you to check in?"
          hint="We'll send a daily nudge at this time, in your local timezone, for every day of the challenge."
        >
          <input
            type="time"
            value={data.reminderTime}
            onChange={(e) => update({ reminderTime: e.target.value })}
            className="w-full px-3.5 py-2.5 text-[14px] rounded-lg border border-[#e8e0d0] bg-[#faf7f2] text-[#1a1a2e] focus:outline-none focus:border-[#d4af37] transition-colors"
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => go(1)} />
        </QuestionCard>
      )}

      {step === "STORY_TITLE" && (
        <QuestionCard eyebrow="Optional" title="What story or project is this for?" hint="You can skip this if you're brainstorming something untitled.">
          <TextInput
            value={data.storyTitle}
            onChange={(e) => update({ storyTitle: e.target.value })}
            placeholder="e.g. The Lantern Archive"
            onKeyDown={(e) => e.key === "Enter" && go(1)}
          />
          <NavRow onBack={() => go(-1)} onNext={() => go(1)} nextLabel={data.storyTitle.trim() ? "Continue" : "Skip"} />
        </QuestionCard>
      )}

      {step === "SUMMARY" && (
        <QuestionCard eyebrow="Last step" title="Here's your challenge">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <StatBlock label="Duration" value={DURATION_OPTIONS.find((o) => o.value === data.duration)?.label ?? "—"} />
            <StatBlock label="Daily goal" value={`${data.dailyGoal || 0} ${unitLabel(data.goalType, Number(data.dailyGoal) || 0)}`} />
            <StatBlock label="Total target" value={`${preview.totalTarget.toLocaleString()} ${unitLabel(data.goalType, preview.totalTarget)}`} />
            <StatBlock label="Ends around" value={preview.endDateLabel ?? "—"} />
            <StatBlock label="Daily reminder" value={formatTimeLabel(data.reminderTime)} />
          </div>
          <p className="text-[12px] text-[#6b5c4a] leading-relaxed mb-1">
            <span className="font-semibold text-[#1a1a2e]">Focus:</span>{" "}
            {data.focuses.map((f) => FOCUS_OPTIONS.find((o) => o.value === f)?.label).join(", ")}
          </p>
          <p className="text-[12px] text-[#6b5c4a] leading-relaxed">
            <span className="font-semibold text-[#1a1a2e]">Goal:</span> {data.workingGoal}
          </p>
          <ErrorText>{submitError}</ErrorText>
          <div className="flex items-center justify-between mt-5">
            <button type="button" onClick={() => go(-1)} disabled={submitting} className="text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors px-1 py-1 disabled:opacity-50">
              ← Back
            </button>
            <PrimaryButton onClick={handleSubmit} disabled={submitting} className="px-6 py-2.5">
              {submitting ? "Starting your challenge…" : "Start my challenge"}
            </PrimaryButton>
          </div>
        </QuestionCard>
      )}

      {showSignupGate && (
        <SignupGateModal
          title="Create your free account"
          message="Your challenge is ready to go — just create an account so we know where to save it."
          onClose={() => setShowSignupGate(false)}
          onSignedUp={handleSignedUp}
        />
      )}
    </div>
  );

  function validateDailyGoal() {
    if (!data.dailyGoal || Number(data.dailyGoal) < 1) return "Enter a daily goal of at least 1.";
    return null;
  }
}

function QuestionCard({ eyebrow, title, hint, children }) {
  return (
    <Card accent>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-2">{eyebrow}</p>
      <h3 className="font-serif text-[#1a1a2e] text-lg sm:text-xl font-bold leading-snug mb-1.5">{title}</h3>
      {hint && <p className="text-[12px] text-[#9a8c7a] leading-relaxed">{hint}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function NavRow({ onBack, onNext, nextLabel = "Continue", hideNext = false }) {
  return (
    <div className="flex items-center justify-between mt-5">
      {onBack ? (
        <button type="button" onClick={onBack} className="text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors px-1 py-1">
          ← Back
        </button>
      ) : <span />}
      {!hideNext && (
        <PrimaryButton onClick={onNext} className="px-5 py-2">
          {nextLabel}
        </PrimaryButton>
      )}
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="bg-[#faf7f2] border border-[#e8e0d0] rounded-lg px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a8c7a] mb-1">{label}</p>
      <p className="text-[16px] font-bold text-[#1a1a2e] leading-none">{value}</p>
    </div>
  );
}

// Renders a 24-hour "HH:MM" string (as stored by <input type="time">) as a
// friendly local label, e.g. "09:00" -> "9:00 AM". Display only — the raw
// HH:MM string is still what's sent to the backend, which converts it to
// reminderTimeUTC using the writer's User.timezone.
export function formatTimeLabel(timeStr) {
  if (!timeStr) return "—";
  const [hh, mm] = timeStr.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return "—";
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, "0")} ${period}`;
}