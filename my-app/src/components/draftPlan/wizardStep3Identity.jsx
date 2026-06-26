// src/components/draftplan/wizardStep3Identity.jsx
// Step 3 — "The Story": title + premise. Shortest step on purpose — by now
// the writer has done the harder reflective work in steps 1 and 2.

import { Card, FieldLabel, TextInput, TextArea, ErrorText, PrimaryButton } from "./draftPlanUI";

export default function WizardStep3Identity({ data, onChange, onSubmit, onBack, submitting, submitError }) {
  function update(patch) {
    onChange((d) => ({ ...d, ...patch }));
  }

  function handleSubmit() {
    onSubmit();
  }

  return (
    <Card accent>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-2">Last step</p>
      <h3 className="font-serif text-[#1a1a2e] text-lg sm:text-xl font-bold leading-snug mb-1.5">
        Name your story
      </h3>
      <p className="text-[12px] text-[#9a8c7a] leading-relaxed mb-4">
        This is what shows at the top of your plan page — change it anytime.
      </p>

      <FieldLabel>Story title</FieldLabel>
      <TextInput
        value={data.storyTitle ?? data.workingTitle ?? ""}
        onChange={(e) => update({ storyTitle: e.target.value })}
        placeholder="e.g. The Lantern Archive"
        className="mb-4"
      />

      <FieldLabel>Premise</FieldLabel>
      <TextArea
        value={data.premise ?? ""}
        onChange={(e) => update({ premise: e.target.value })}
        placeholder="A young archivist discovers a hidden language within ancient texts that can manipulate reality, but must race against a clandestine organization that wants to weaponize it."
        rows={4}
      />

      <ErrorText>{submitError}</ErrorText>

      <div className="flex items-center justify-between mt-5">
        <button type="button" onClick={onBack} disabled={submitting} className="text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors px-1 py-1 disabled:opacity-50">
          ← Back
        </button>
        <PrimaryButton onClick={handleSubmit} disabled={submitting} className="px-6 py-2.5">
          {submitting ? "Creating your plan…" : "Create my plan"}
        </PrimaryButton>
      </div>
    </Card>
  );
}