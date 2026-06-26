// src/components/draftplan/logProgressModal.jsx
// POST /draftplan/progress — adds (or removes) an amount on top of whatever
// is already logged for today, and shows the matching treat prompts when
// metDailyGoal / metWeeklyGoal come back true.

import { useState } from "react";
import { PrimaryButton, SecondaryButton, TextInput, TextArea, ErrorText } from "./draftPlanUI";
import { logProgress } from "./draftPlanApi";
import { unitLabel } from "./draftPlanConstants";

export default function LogProgressModal({ plan, onClose, onLogged }) {
  const [count, setCount] = useState("");
  const [direction, setDirection] = useState("add"); // "add" | "remove"
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // response from the API once logged

  // What's already logged today, so the writer can see the number they
  // type gets added on top of this — never replaces it.
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  const todayLog = (plan?.progressLogs ?? []).find((l) => new Date(l.logDate) >= todayMidnight);
  const alreadyToday = Math.max(todayLog?.countLogged ?? 0, 0);

  async function submit() {
    if (!count || Number(count) < 1) {
      setError(direction === "add" ? "Enter how much to add." : "Enter how much to remove.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await logProgress({ countLogged: Number(count), note: note.trim() || undefined, direction });
      setResult(res);
      onLogged?.(res);
    } catch (err) {
      setError(err.message ?? "Couldn't log your progress.");
    } finally {
      setSaving(false);
    }
  }

  const previewAfter = direction === "add"
    ? alreadyToday + (Number(count) || 0)
    : Math.max(alreadyToday - (Number(count) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-[#e8e0d0] overflow-hidden"
        style={{ borderTop: "4px solid #d4af37" }}
      >
        {!result ? (
          <>
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-1">Log progress</p>
                <h3 className="font-serif text-[#1a1a2e] text-lg font-bold leading-tight">
                  {direction === "add" ? "How much more did you write?" : "How much should we take off?"}
                </h3>
              </div>
              <button onClick={onClose} className="text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors ml-3 flex-shrink-0 mt-1" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 pb-6">
              {/* Already logged today, front and center, so it's clear new
                  entries stack on top instead of replacing it */}
              {alreadyToday > 0 && (
                <div className="bg-[#faf7f2] border border-[#e8e0d0] rounded-lg px-3.5 py-2.5 mb-4 flex items-center justify-between">
                  <span className="text-[11px] text-[#9a8c7a]">Already logged today</span>
                  <span className="text-[13px] font-bold text-[#1a1a2e]">
                    {alreadyToday.toLocaleString()} {unitLabel(plan?.goalType, alreadyToday)}
                  </span>
                </div>
              )}

              {/* Add vs remove toggle */}
              <div className="flex gap-1.5 mb-4 p-1 rounded-lg" style={{ background: "#f5f3ef" }}>
                <button
                  type="button"
                  onClick={() => setDirection("add")}
                  className="flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-colors"
                  style={
                    direction === "add"
                      ? { background: "#fff", color: "#1a1a2e", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                      : { color: "#9a8c7a" }
                  }
                >
                  Add more
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("remove")}
                  className="flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-colors"
                  style={
                    direction === "remove"
                      ? { background: "#fff", color: "#c0392b", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                      : { color: "#9a8c7a" }
                  }
                >
                  Take off
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <TextInput
                    type="number" min="1"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder={plan?.dailyGoal ? String(plan.dailyGoal) : "0"}
                  />
                  <span className="text-[12px] text-[#9a8c7a] flex-shrink-0 whitespace-nowrap">
                    {unitLabel(plan?.goalType, Number(count) || 0)}
                  </span>
                </div>

                {/* Live preview of today's running total after this entry */}
                {count && Number(count) > 0 && (
                  <p className="text-[11px] text-[#9a8c7a] mt-1.5">
                    {direction === "add" ? "That'll bring today to" : "That'll bring today down to"}{" "}
                    <span className="font-semibold text-[#1a1a2e]">
                      {previewAfter.toLocaleString()} {unitLabel(plan?.goalType, previewAfter)}
                    </span>
                    {direction === "remove" && Number(count) > alreadyToday && " (can't go below 0)"}
                  </p>
                )}

                {direction === "add" && plan?.dailyGoal && (
                  <p className="text-[11px] text-[#9a8c7a] mt-1.5">
                    Today's goal: {plan.dailyGoal} {unitLabel(plan.goalType, plan.dailyGoal)}
                  </p>
                )}
                {direction === "remove" && (
                  <p className="text-[11px] text-[#9a8c7a] mt-1.5">
                    This comes off today's count and your overall project total — handy for fixing an over-count.
                  </p>
                )}
              </div>

              <div className="mb-2">
                <TextArea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={direction === "add" ? "Optional note about this session…" : "Optional note about this correction…"}
                  rows={2}
                />
              </div>

              <ErrorText>{error}</ErrorText>

              <div className="flex items-center gap-2 mt-4">
                <SecondaryButton onClick={onClose} className="flex-1">Cancel</SecondaryButton>
                <PrimaryButton onClick={submit} disabled={saving} className="flex-1">
                  {saving ? "Saving…" : direction === "add" ? "Add it" : "Remove it"}
                </PrimaryButton>
              </div>
            </div>
          </>
        ) : (
          <LoggedResult result={result} plan={plan} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function LoggedResult({ result, plan, onClose }) {
  const { metDailyGoal, metWeeklyGoal, dailyTreat, weeklyTreat, isDraftDone, direction, isPickedDay } = result;
  const isRemoval = direction === "remove";
  const isBonus   = isPickedDay === false;

  if (isRemoval) {
    return (
      <div className="px-6 pt-7 pb-6 text-center">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#faf2ef" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
          </svg>
        </div>

        <h3 className="font-serif text-[#1a1a2e] text-lg font-bold mb-1">Total updated</h3>
        <p className="text-[13px] text-[#6b5c4a] leading-relaxed mb-4">
          That amount has been taken off today's count and your project total.
        </p>

        <PrimaryButton onClick={onClose} className="w-full mt-3">Done</PrimaryButton>
      </div>
    );
  }

  return (
    <div className="px-6 pt-7 pb-6 text-center">
      <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#fdf9ed" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <h3 className="font-serif text-[#1a1a2e] text-lg font-bold mb-1">
        {isDraftDone ? "Your draft is done. 🎉" : "Progress logged"}
      </h3>
      <p className="text-[13px] text-[#6b5c4a] leading-relaxed mb-4">
        {isDraftDone
          ? "You've hit your overall goal — what a thing to finish."
          : isBonus
            ? "A bonus session — nice surprise."
            : "Nice work showing up today."}
      </p>

      {(metDailyGoal && dailyTreat) && (
        <div className="bg-[#fdf9ed] border border-[#f0d98a] rounded-lg p-3.5 mb-2.5 text-left flex items-start gap-2.5">
          <span className="text-lg leading-none">{isBonus ? "✨" : "🎉"}</span>
          <p className="text-[12px] text-[#1a1a2e] leading-relaxed">
            You hit your daily goal{isBonus ? " on a bonus day" : ""} — now go treat yourself with{" "}
            <span className="font-bold">{dailyTreat}</span>.
          </p>
        </div>
      )}

      {(metWeeklyGoal && weeklyTreat) && (
        <div className="bg-[#fdf9ed] border border-[#f0d98a] rounded-lg p-3.5 mb-2.5 text-left flex items-start gap-2.5">
          <span className="text-lg leading-none">✨</span>
          <p className="text-[12px] text-[#1a1a2e] leading-relaxed">
            And your weekly goal too — treat yourself with <span className="font-bold">{weeklyTreat}</span> as well.
          </p>
        </div>
      )}

      {!metDailyGoal && (
        <p className="text-[12px] text-[#9a8c7a] mb-2">
          Logged — keep going, you don't need to hit it every day.
        </p>
      )}

      <PrimaryButton onClick={onClose} className="w-full mt-3">Done</PrimaryButton>
    </div>
  );
}