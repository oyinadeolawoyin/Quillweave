// src/components/draftplan/wizardStep1Math.jsx
// Step 1 — "The Math Layer": project size, goal type, daily goal (with a
// gentle reduce-the-expectation nudge), writing days + reminder times, and
// an outline check that branches to a 7/15-day outline challenge stub.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, FieldLabel, TextInput, ErrorText, PrimaryButton, SecondaryButton,
  PillSelect, PillMultiSelect,
} from "./draftPlanUI";
import {
  GOAL_TYPE_OPTIONS, WEEKDAY_OPTIONS, unitLabel,
  previewDerivedFields, suggestReducedGoal,
} from "./draftPlanConstants";

// One question unlocks the next — each sub-step renders only once the
// previous answer is valid, so the form reads like a conversation rather
// than a wall of fields.
const SUB_STEPS = [
  "PROJECT",      // what are you working on
  "GOAL_TYPE",    // words / scenes / chapters — asked early so every later question can show the right unit
  "STARTING",     // how much written so far, in their chosen unit
  "OUTLINE_CHECK",// do you have an outline?
  "TARGET",       // overall goal length, in their chosen unit
  "DAILY_BELIEF", // what they believe they can do
  "DAILY_REDUCED",// the reduced, realistic version
  "WRITING_DAYS", // which days + reminder times
  "SUMMARY",      // the calculated breakdown
];

export default function WizardStep1Math({ data, onChange, onNext }) {
  const [sub, setSub] = useState(0);
  const [error, setError] = useState("");
  const [showOutlineHelp, setShowOutlineHelp] = useState(false);

  const step = SUB_STEPS[sub];

  function go(delta) {
    setError("");
    setSub((s) => Math.max(0, Math.min(SUB_STEPS.length - 1, s + delta)));
  }

  function update(patch) {
    onChange((d) => ({ ...d, ...patch }));
  }

  function next(validate) {
    if (validate) {
      const err = validate();
      if (err) { setError(err); return; }
    }
    setError("");
    go(1);
  }

  const preview = previewDerivedFields(
    Number(data.targetLength) || 0,
    Number(data.wordsWrittenSoFar) || 0,
    Number(data.dailyGoal) || 0,
    (data.writingDays ?? []).length
  );

  return (
    <div>
      {/* ── What draft are you working on ───────────────────────────── */}
      {step === "PROJECT" && (
        <QuestionCard
          eyebrow="Question 1 of 8"
          title="What draft are you currently working on and want to finish?"
        >
          <TextInput
            value={data.workingTitle ?? ""}
            onChange={(e) => update({ workingTitle: e.target.value })}
            placeholder="e.g. The Lantern Archive"
            onKeyDown={(e) => e.key === "Enter" && next(() => (!data.workingTitle?.trim() ? "Tell us what you're working on." : null))}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onNext={() => next(() => (!data.workingTitle?.trim() ? "Tell us what you're working on." : null))} nextLabel="Continue" />
        </QuestionCard>
      )}

      {/* ── Goal type — asked early so every later question can show units ── */}
      {step === "GOAL_TYPE" && (
        <QuestionCard
          eyebrow="Question 2 of 8"
          title="Do you write in words, scenes, or chapters?"
        >
          <PillSelect
            options={GOAL_TYPE_OPTIONS}
            value={data.goalType}
            onChange={(v) => { update({ goalType: v }); }}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow
            onBack={() => go(-1)}
            onNext={() => next(() => (!data.goalType ? "Pick one to continue." : null))}
          />
        </QuestionCard>
      )}

      {/* ── How much have you written so far ────────────────────────── */}
      {step === "STARTING" && (
        <QuestionCard
          eyebrow="Question 3 of 8"
          title={`How many ${unitLabel(data.goalType, 2)} have you written so far?`}
        >
          <TextInput
            type="number" min="0"
            value={data.wordsWrittenSoFar ?? ""}
            onChange={(e) => update({ wordsWrittenSoFar: e.target.value === "" ? "" : Number(e.target.value) })}
            placeholder={data.goalType === "WORDS" ? "e.g. 12000" : "e.g. 4"}
            onKeyDown={(e) => e.key === "Enter" && next(validateStarting)}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(validateStarting)} />
        </QuestionCard>
      )}

      {/* ── Outline check — branches to a challenge stub ────────────── */}
      {step === "OUTLINE_CHECK" && (
        <QuestionCard
          eyebrow="Quick check"
          title="Do you have an outline for this draft?"
        >
          <div className="grid grid-cols-2 gap-2 mb-2">
            <SecondaryButton onClick={() => { update({ hasOutline: true }); go(1); }} className="py-3">
              Yes, I have one
            </SecondaryButton>
            <PrimaryButton onClick={() => setShowOutlineHelp(true)} className="py-3">
              Not yet
            </PrimaryButton>
          </div>

          {showOutlineHelp && (
            <div className="mt-4 bg-[#faf7f2] border border-[#e8e0d0] rounded-lg p-4">
              <p className="text-[13px] text-[#1a1a2e] font-semibold mb-1.5">
                An outline makes this estimate much more reliable
              </p>
              <p className="text-[12px] text-[#6b5c4a] leading-relaxed mb-3">
                Without one, your target length is more of a guess. If you'd rather get your
                shape down first, our outlining challenges are built for exactly that —
                outlining, brainstorming, character development, and editing. Not drafting.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <ChallengeStubCard days={7} label="Quick shape" />
                <ChallengeStubCard days={15} label="Deep outline" />
              </div>
              <button
                type="button"
                onClick={() => { update({ hasOutline: false }); go(1); }}
                className="w-full text-center text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors py-1"
              >
                I'll estimate anyway — continue to the test
              </button>
            </div>
          )}

          {!showOutlineHelp && <NavRow onBack={() => go(-1)} hideNext />}
        </QuestionCard>
      )}

      {/* ── Overall goal length ──────────────────────────────────────── */}
      {step === "TARGET" && (
        <QuestionCard
          eyebrow="Question 4 of 8"
          title={`How many ${unitLabel(data.goalType, 2)} do you think your draft will be?`}
        >
          <TextInput
            type="number" min="1"
            value={data.targetLength ?? ""}
            onChange={(e) => update({ targetLength: e.target.value === "" ? "" : Number(e.target.value) })}
            placeholder={data.goalType === "WORDS" ? "e.g. 80000" : "e.g. 24"}
            onKeyDown={(e) => e.key === "Enter" && next(validateTarget)}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(validateTarget)} />
        </QuestionCard>
      )}

      {/* ── What they believe they can do daily ─────────────────────── */}
      {step === "DAILY_BELIEF" && (
        <QuestionCard
          eyebrow="Question 5 of 8"
          title={`How many ${unitLabel(data.goalType, 2)} do you believe you can write in a day?`}
        >
          <TextInput
            type="number" min="1"
            value={data.dailyBelief ?? ""}
            onChange={(e) => update({ dailyBelief: e.target.value === "" ? "" : Number(e.target.value) })}
            placeholder={data.goalType === "WORDS" ? "e.g. 800" : "e.g. 2"}
            onKeyDown={(e) => e.key === "Enter" && next(validateBelief)}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow
            onBack={() => go(-1)}
            onNext={() => next(validateBelief)}
          />
        </QuestionCard>
      )}

      {/* ── Reduced, realistic daily goal ───────────────────────────── */}
      {step === "DAILY_REDUCED" && (
        <DailyReducedQuestion data={data} update={update} error={error} setError={setError} onBack={() => go(-1)} onNext={() => go(1)} />
      )}

      {/* ── Writing days + reminder time ─────────────────────────────── */}
      {step === "WRITING_DAYS" && (
        <WritingDaysQuestion data={data} update={update} error={error} setError={setError} onBack={() => go(-1)} onNext={() => go(1)} />
      )}

      {/* ── Calculated summary ───────────────────────────────────────── */}
      {step === "SUMMARY" && (
        <QuestionCard
          eyebrow="Here's the math"
          title="Your daily and weekly breakdown"
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatBlock label="Daily goal" value={`${data.dailyGoal} ${unitLabel(data.goalType, data.dailyGoal)}`} />
            <StatBlock label="Weekly target" value={`${preview.weeklyGoal} ${unitLabel(data.goalType, preview.weeklyGoal)}`} />
            <StatBlock label="Writing sessions to finish" value={`${preview.estimatedSessions} sessions`} />
            <StatBlock label={`${unitLabel(data.goalType, 2)} left to write`} value={preview.remaining.toLocaleString()} />
            <StatBlock label="Estimated finish" value={preview.estimatedFinishLabel ?? "—"} />
            <StatBlock label="Calendar days from today" value={`~${preview.estimatedDays} days`} />
          </div>

          <div className="bg-[#faf7f2] border border-[#e8e0d0] rounded-lg p-4 mb-1">
            <p className="text-[12px] text-[#1a1a2e] leading-relaxed mb-2.5">
              <span className="font-semibold">Sessions</span> are just how many more times you need to
              sit down and write — {preview.estimatedSessions} sessions, at your daily goal, gets you to the end.
            </p>
            <p className="text-[12px] text-[#1a1a2e] leading-relaxed mb-2.5">
              <span className="font-semibold">Calendar days</span> is different — it's how far away that
              finish line actually is on the calendar, counting the days you're <em>not</em> writing too.
              Since you're writing {(data.writingDays ?? []).length} day{(data.writingDays ?? []).length === 1 ? "" : "s"} a
              week, those {preview.estimatedSessions} sessions are spread out over about{" "}
              {preview.estimatedWeeks} week{preview.estimatedWeeks === 1 ? "" : "s"} — roughly {preview.estimatedDays} calendar
              days, landing around <span className="font-semibold">{preview.estimatedFinishLabel ?? "—"}</span>.
            </p>
            <p className="text-[11px] text-[#9a8c7a] leading-relaxed">
              The fewer days a week you write, the more those two numbers will spread apart — that's normal,
              not a bug. Miss a session here and there too — your plan page keeps this updated as you go.
            </p>
          </div>

          <NavRow onBack={() => go(-1)} onNext={onNext} nextLabel="Continue to step 2" />
        </QuestionCard>
      )}
    </div>
  );

  function validateStarting() {
    if (data.wordsWrittenSoFar === "" || data.wordsWrittenSoFar === undefined || data.wordsWrittenSoFar === null) return "Enter 0 if you haven't started.";
    if (Number(data.wordsWrittenSoFar) < 0) return "This can't be negative.";
    return null;
  }
  function validateTarget() {
    if (!data.targetLength || Number(data.targetLength) < 1) return "Enter your estimated project length.";
    if (data.wordsWrittenSoFar && Number(data.targetLength) < Number(data.wordsWrittenSoFar)) {
      return "Your target should be more than what you've already written.";
    }
    return null;
  }
  function validateBelief() {
    if (!data.dailyBelief || Number(data.dailyBelief) < 1) return "Enter a number greater than 0.";
    return null;
  }
}

// ── Sub-components ──────────────────────────────────────────────────────

function QuestionCard({ eyebrow, title, hint, children }) {
  return (
    <Card accent>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-2">{eyebrow}</p>
      <h3 className="font-serif text-[#1a1a2e] text-lg sm:text-xl font-bold leading-snug mb-1.5">{title}</h3>
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

function ChallengeStubCard({ days, label }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/days-challenge?type=outline&days=${days}`)}
      className="text-left bg-white border border-[#e8e0d0] rounded-lg p-3 hover:border-[#d4af37] transition-colors"
    >
      <p className="text-[15px] font-bold text-[#1a1a2e] leading-none mb-1">{days}-day</p>
      <p className="text-[11px] text-[#9a8c7a]">{label}</p>
    </button>
  );
}

function DailyReducedQuestion({ data, update, error, setError, onBack, onNext }) {
  const suggested = suggestReducedGoal(Number(data.dailyBelief) || 0, data.goalType);
  const [value, setValue] = useState(data.dailyGoal ?? suggested);

  function confirm() {
    if (!value || Number(value) < 1) { setError("Enter a daily goal of at least 1."); return; }
    update({ dailyGoal: Number(value) });
    onNext();
  }

  return (
    <Card accent>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-2">Question 6 of 8</p>
      <h3 className="font-serif text-[#1a1a2e] text-lg sm:text-xl font-bold leading-snug mb-1.5">
        Let's make that a little more sustainable
      </h3>
      <p className="text-[12px] text-[#9a8c7a] leading-relaxed mb-4">
        You said {data.dailyBelief} {unitLabel(data.goalType, Number(data.dailyBelief))} on a good day.
        Most writers do better long-term aiming a bit lower — here's a suggested daily goal you can adjust.
      </p>
      <FieldLabel>
        Your daily goal ({unitLabel(data.goalType, 2)})
      </FieldLabel>
      <TextInput
        type="number" min="1"
        value={value}
        onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
        onKeyDown={(e) => e.key === "Enter" && confirm()}
      />
      <p className="text-[11px] text-[#9a8c7a] mt-2">
        Suggested: <button type="button" onClick={() => setValue(suggested)} className="text-[#b8860b] font-semibold hover:underline">{suggested} {unitLabel(data.goalType, suggested)}</button>
      </p>
      <ErrorText>{error}</ErrorText>
      <NavRow onBack={onBack} onNext={confirm} />
    </Card>
  );
}

function WritingDaysQuestion({ data, update, error, setError, onBack, onNext }) {
  const writingDays = data.writingDays ?? [];

  function toggleDay(day) {
    const exists = writingDays.find((d) => d.day === day);
    if (exists) {
      update({ writingDays: writingDays.filter((d) => d.day !== day) });
    } else {
      update({ writingDays: [...writingDays, { day, reminderTime: "20:00" }] });
    }
  }

  function setTime(day, time) {
    update({ writingDays: writingDays.map((d) => (d.day === day ? { ...d, reminderTime: time } : d)) });
  }

  function confirm() {
    if (writingDays.length === 0) { setError("Pick at least one day."); return; }
    onNext();
  }

  return (
    <Card accent>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-2">Question 7 of 8</p>
      <h3 className="font-serif text-[#1a1a2e] text-lg sm:text-xl font-bold leading-snug mb-1.5">
        What days do you write most?
      </h3>
      <p className="text-[12px] text-[#9a8c7a] leading-relaxed mb-4">
        We'll send you a reminder on these days, at whatever time works for you.
      </p>
      <PillMultiSelect
        options={WEEKDAY_OPTIONS}
        values={writingDays.map((d) => d.day)}
        onToggle={toggleDay}
        columns={7}
      />

      {writingDays.length > 0 && (
        <div className="mt-4 space-y-2">
          {WEEKDAY_OPTIONS.filter((o) => writingDays.find((d) => d.day === o.value)).map((o) => {
            const wd = writingDays.find((d) => d.day === o.value);
            return (
              <div key={o.value} className="flex items-center justify-between bg-[#faf7f2] border border-[#e8e0d0] rounded-lg px-3 py-2">
                <span className="text-[12px] font-semibold text-[#1a1a2e]">{o.label}</span>
                <input
                  type="time"
                  value={wd.reminderTime}
                  onChange={(e) => setTime(o.value, e.target.value)}
                  className="text-[12px] text-[#1a1a2e] bg-white border border-[#e8e0d0] rounded-md px-2 py-1 focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            );
          })}
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      <NavRow onBack={onBack} onNext={confirm} />
    </Card>
  );
}