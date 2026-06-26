// src/components/daysChallenge/editChallengeModal.jsx
// Mirrors the Edit Project modal in planDashboard.jsx. Deliberately exposes
// only fields the backend allows changing mid-challenge: storyTitle,
// workingGoal, whyNow, dailyGoal. Duration, goalType, and focuses are
// creation-time decisions — see updateChallenge() in daysChallengeService.js
// for why those stay locked once a challenge has started.

import { useState } from "react";
import {
  FieldLabel, TextInput, TextArea, ErrorText, PrimaryButton, SecondaryButton,
} from "../draftPlan/draftPlanUI";
import { unitLabel } from "./dayschallengeconstants";
import { updateChallenge } from "./dayschallengeapi";

export default function EditChallengeModal({ challenge, onClose, onSaved }) {
  const [form, setForm] = useState({
    storyTitle:   challenge.storyTitle ?? "",
    workingGoal:  challenge.workingGoal ?? "",
    whyNow:       challenge.whyNow ?? "",
    dailyGoal:    challenge.dailyGoal ?? "",
    reminderTime: challenge.reminderTime ?? "09:00",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function save() {
    if (!form.workingGoal.trim()) { setError("Your goal for this challenge can't be empty."); return; }
    if (!form.whyNow.trim()) { setError("Tell us why this matters right now."); return; }
    if (!form.dailyGoal || Number(form.dailyGoal) < 1) { setError("Daily goal must be at least 1."); return; }
    if (!/^\d{2}:\d{2}$/.test(form.reminderTime)) { setError("Pick a valid reminder time."); return; }

    setSaving(true);
    setError("");
    try {
      const result = await updateChallenge({
        storyTitle:   form.storyTitle,
        workingGoal:  form.workingGoal,
        whyNow:       form.whyNow,
        dailyGoal:    Number(form.dailyGoal),
        reminderTime: form.reminderTime,
      });
      onSaved?.(result.challenge);
    } catch (err) {
      setError(err.message ?? "Couldn't save your changes.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e8e0d0] overflow-hidden flex flex-col max-h-[85vh]"
        style={{ borderTop: "4px solid #e07b39" }}
      >
        <div className="px-6 pt-6 pb-4 flex items-start justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: "#e07b39" }}>Edit challenge</p>
            <h3 className="font-serif text-[#1a1a2e] text-lg font-bold leading-tight">Update your challenge</h3>
          </div>
          <button onClick={onClose} className="text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors ml-3 flex-shrink-0 mt-1" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-2 overflow-y-auto space-y-3 flex-1">
          <div>
            <FieldLabel hint="Optional — what shows at the top of your challenge page.">Story title</FieldLabel>
            <TextInput value={form.storyTitle} onChange={(e) => update({ storyTitle: e.target.value })} placeholder="e.g. The Lantern Archive" />
          </div>
          <div>
            <FieldLabel>My goal for this challenge</FieldLabel>
            <TextArea value={form.workingGoal} onChange={(e) => update({ workingGoal: e.target.value })} rows={2} />
          </div>
          <div>
            <FieldLabel>Why this matters now</FieldLabel>
            <TextArea value={form.whyNow} onChange={(e) => update({ whyNow: e.target.value })} rows={2} />
          </div>
          <div>
            <FieldLabel hint="Changes apply from today onward — days you've already logged keep their original result.">
              Daily goal ({unitLabel(challenge.goalType, 2)})
            </FieldLabel>
            <TextInput type="number" min="1" value={form.dailyGoal} onChange={(e) => update({ dailyGoal: e.target.value })} />
          </div>
          <div>
            <FieldLabel hint="We'll send your daily check-in nudge at this time, in your local timezone.">
              Daily reminder
            </FieldLabel>
            <input
              type="time"
              value={form.reminderTime}
              onChange={(e) => update({ reminderTime: e.target.value })}
              className="w-full px-3.5 py-2.5 text-[14px] rounded-lg border border-[#e8e0d0] bg-white text-[#1a1a2e] focus:outline-none focus:border-[#e07b39] transition-colors"
            />
          </div>
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