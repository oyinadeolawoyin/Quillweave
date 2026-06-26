// src/components/daysChallenge/logChallengeProgressModal.jsx
//
// POST /days-challenge/progress — adds (or removes) an amount on top of
// whatever's already logged for today, same add/remove pattern as draft
// plan's logProgressModal.jsx.
//
// Stays a single-screen modal (unlike draft plan's two-stage version) so it
// keeps the original contract with dayschallengedashboard.jsx: onLogged
// fires as soon as the request succeeds, the dashboard closes this modal
// itself, and the dashboard's own TadaModal — not this component — owns the
// "you hit your goal" celebration. Don't add an internal result screen here
// without also changing handleLogged() in the dashboard, or the two will
// race (the dashboard closes this modal before any result screen renders).

import { useState } from "react";
import {
  FieldLabel, TextInput, TextArea, ErrorText, PrimaryButton, SecondaryButton,
} from "../draftPlan/draftPlanUI";
import { unitLabel } from "./dayschallengeconstants.js";
import { logProgress } from "./dayschallengeapi";

export default function LogChallengeProgressModal({ challenge, onClose, onLogged }) {
  const [count, setCount] = useState("");
  const [direction, setDirection] = useState("add"); // "add" | "remove"
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // What's already logged today, so the writer can see the number they
  // type gets added on top of this — never replaces it.
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  const todayCheckIn = (challenge?.checkIns ?? []).find((c) => new Date(c.checkInDate) >= todayMidnight);
  const alreadyToday = Math.max(todayCheckIn?.countLogged ?? 0, 0);

  async function handleSubmit() {
    if (!count || Number(count) < 1) {
      setError(direction === "add" ? "Enter how much to add." : "Enter how much to remove.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await logProgress({
        countLogged: Number(count),
        note: note.trim() || undefined,
        direction,
      });
      onLogged?.(result);
    } catch (err) {
      setError(err.message ?? "Couldn't log your progress — try again.");
      setSaving(false);
    }
  }

  const previewAfter = direction === "add"
    ? alreadyToday + (Number(count) || 0)
    : Math.max(alreadyToday - (Number(count) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-[#e8e0d0] overflow-hidden" style={{ borderTop: "4px solid #e07b39" }}>
        <div className="px-6 pt-6 pb-2 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: "#e07b39" }}>Log today's progress</p>
            <h3 className="font-serif text-[#1a1a2e] text-lg font-bold leading-tight">
              {direction === "add" ? "How much more did you do today?" : "How much should we take off?"}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors ml-3 flex-shrink-0 mt-1" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-2">
          {/* Already logged today, front and center, so it's clear new
              entries stack on top instead of replacing it */}
          {alreadyToday > 0 && (
            <div className="bg-[#fff3e0] border border-[#f5ddb8] rounded-lg px-3.5 py-2.5 mb-3 flex items-center justify-between">
              <span className="text-[11px] text-[#9a8c7a]">Already logged today</span>
              <span className="text-[13px] font-bold text-[#1a1a2e]">
                {alreadyToday.toLocaleString()} {unitLabel(challenge.goalType, alreadyToday)}
              </span>
            </div>
          )}

          {/* Add vs remove toggle */}
          <div className="flex gap-1.5 mb-3 p-1 rounded-lg" style={{ background: "#f5f3ef" }}>
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

          <FieldLabel hint={`Daily goal: ${challenge.dailyGoal} ${unitLabel(challenge.goalType, challenge.dailyGoal)}`}>
            {unitLabel(challenge.goalType, 2)} {direction === "add" ? "to add" : "to remove"}
          </FieldLabel>
          <TextInput
            type="number" min="1"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder={challenge.goalType === "WORDS" ? "e.g. 500" : "e.g. 20"}
            className="mb-1"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          {/* Live preview of today's running total after this entry */}
          {count && Number(count) > 0 && (
            <p className="text-[11px] text-[#9a8c7a] mb-3">
              {direction === "add" ? "That'll bring today to" : "That'll bring today down to"}{" "}
              <span className="font-semibold text-[#1a1a2e]">
                {previewAfter.toLocaleString()} {unitLabel(challenge.goalType, previewAfter)}
              </span>
              {direction === "remove" && Number(count) > alreadyToday && " (can't go below 0)"}
            </p>
          )}
          {!(count && Number(count) > 0) && <div className="mb-3" />}

          {direction === "remove" && (
            <p className="text-[11px] text-[#9a8c7a] mb-3">
              This corrects today's count only — handy for fixing an over-count.
            </p>
          )}

          <FieldLabel>Note (optional)</FieldLabel>
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={direction === "add" ? "Anything you want to remember about today's session" : "Optional note about this correction…"}
            rows={2}
          />
          <ErrorText>{error}</ErrorText>
        </div>

        <div className="px-6 pb-6 pt-3 flex gap-2 border-t border-[#f0ebe3] mt-2">
          <SecondaryButton onClick={onClose} disabled={saving} className="flex-1">Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving ? "Saving…" : direction === "add" ? "Add it" : "Remove it"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}