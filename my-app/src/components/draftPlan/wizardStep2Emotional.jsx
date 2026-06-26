// src/components/draftplan/wizardStep2Emotional.jsx
// Step 2 — "The Emotional Layer": why, what finishing means, treats,
// inspiration source, up to 2 moodboard images (start small per product
// decision — friction-tested before allowing all 5), and up to 5 characters.

import { useState } from "react";
import {
  Card, FieldLabel, TextInput, TextArea, ErrorText, PrimaryButton,
} from "./draftPlanUI";
import { uploadMoodboardImage } from "./draftPlanApi";

const SUB_STEPS = [
  "WHY",
  "MEANS",
  "DAILY_TREAT",
  "WEEKLY_TREAT",
  "INSPIRATION",
  "IMAGES",
  "CHARACTERS",
];

// Start with 2 image upload slots to keep friction low — can raise to the
// backend's max of 5 later without touching the wizard flow logic.
const MAX_IMAGES_AT_LAUNCH = 2;
const MAX_CHARACTERS = 5;
const CHAR_DESC_MAX = 50;

export default function WizardStep2Emotional({ data, onChange, onNext, onBack }) {
  const [sub, setSub] = useState(0);
  const [error, setError] = useState("");
  const step = SUB_STEPS[sub];

  function go(delta) {
    setError("");
    setSub((s) => {
      const ns = s + delta;
      if (ns < 0) { onBack(); return s; }
      if (ns >= SUB_STEPS.length) { onNext(); return s; }
      return ns;
    });
  }

  function update(patch) {
    onChange((d) => ({ ...d, ...patch }));
  }

  function next(validate) {
    if (validate) {
      const err = validate();
      if (err) { setError(err); return; }
    }
    go(1);
  }

  return (
    <div>
      {step === "WHY" && (
        <QuestionCard eyebrow="Question 1 of 7" title="Why do you want to finish this draft?">
          <TextArea
            value={data.whyFinish ?? ""}
            onChange={(e) => update({ whyFinish: e.target.value })}
            placeholder="What's pulling you toward the end of this story?"
            rows={4}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(() => (!data.whyFinish?.trim() ? "This one helps us know what to remind you of." : null))} />
        </QuestionCard>
      )}

      {step === "MEANS" && (
        <QuestionCard eyebrow="Question 2 of 7" title="What does finishing the draft mean to you?">
          <TextArea
            value={data.whatItMeans ?? ""}
            onChange={(e) => update({ whatItMeans: e.target.value })}
            placeholder="e.g. Proving to myself I can see something through."
            rows={4}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(() => (!data.whatItMeans?.trim() ? "Tell us what this means to you." : null))} />
        </QuestionCard>
      )}

      {step === "DAILY_TREAT" && (
        <QuestionCard
          eyebrow="Question 3 of 7"
          title="What's your treat for hitting your daily goal?"
        >
          <TextInput
            value={data.dailyTreat ?? ""}
            onChange={(e) => update({ dailyTreat: e.target.value })}
            placeholder="e.g. A cup of fancy coffee"
            onKeyDown={(e) => e.key === "Enter" && next(() => (!data.dailyTreat?.trim() ? "Enter a small daily treat." : null))}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(() => (!data.dailyTreat?.trim() ? "Enter a small daily treat." : null))} />
        </QuestionCard>
      )}

      {step === "WEEKLY_TREAT" && (
        <QuestionCard
          eyebrow="Question 4 of 7"
          title="And your treat for hitting your weekly goal?"
        >
          <TextInput
            value={data.weeklyTreat ?? ""}
            onChange={(e) => update({ weeklyTreat: e.target.value })}
            placeholder="e.g. Ordering takeout"
            onKeyDown={(e) => e.key === "Enter" && next(() => (!data.weeklyTreat?.trim() ? "Enter a weekly treat." : null))}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(() => (!data.weeklyTreat?.trim() ? "Enter a weekly treat." : null))} />
        </QuestionCard>
      )}

      {step === "INSPIRATION" && (
        <QuestionCard eyebrow="Question 5 of 7" title="Where do you get this story's inspiration from?">
          <TextArea
            value={data.inspirationSource ?? ""}
            onChange={(e) => update({ inspirationSource: e.target.value })}
            placeholder="e.g. An old photo of a library, a dream, a song that won't leave me alone…"
            rows={3}
          />
          <ErrorText>{error}</ErrorText>
          <NavRow onBack={() => go(-1)} onNext={() => next(() => (!data.inspirationSource?.trim() ? "Tell us where the story comes from." : null))} />
        </QuestionCard>
      )}

      {step === "IMAGES" && (
        <ImagesQuestion data={data} update={update} error={error} setError={setError} onBack={() => go(-1)} onNext={() => go(1)} />
      )}

      {step === "CHARACTERS" && (
        <CharactersQuestion data={data} update={update} error={error} setError={setError} onBack={() => go(-1)} onNext={() => go(1)} />
      )}
    </div>
  );
}

function QuestionCard({ eyebrow, title, hint, children }) {
  return (
    <Card accent>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-2">{eyebrow}</p>
      <h3 className="font-serif text-[#1a1a2e] text-lg sm:text-xl font-bold leading-snug mb-1.5">{title}</h3>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function NavRow({ onBack, onNext, nextLabel = "Continue" }) {
  return (
    <div className="flex items-center justify-between mt-5">
      <button type="button" onClick={onBack} className="text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors px-1 py-1">
        ← Back
      </button>
      <PrimaryButton onClick={onNext} className="px-5 py-2">{nextLabel}</PrimaryButton>
    </div>
  );
}

function ImagesQuestion({ data, update, error, setError, onBack, onNext }) {
  const images = data.moodboardImages ?? [];
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (images.length >= MAX_IMAGES_AT_LAUNCH) return;

    setUploading(true);
    setError("");
    try {
      const url = await uploadMoodboardImage(file);
      if (url) update({ moodboardImages: [...images, url] });
    } catch (err) {
      setError(err.message ?? "Couldn't upload that image — try again.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(i) {
    update({ moodboardImages: images.filter((_, idx) => idx !== i) });
  }

  return (
    <Card accent>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-2">Question 6 of 7</p>
      <h3 className="font-serif text-[#1a1a2e] text-lg sm:text-xl font-bold leading-snug mb-1.5">
        Any images that capture the story?
      </h3>
      <p className="text-[12px] text-[#9a8c7a] leading-relaxed mb-4">
        Optional — a mood board, a map, anything visual. Up to {MAX_IMAGES_AT_LAUNCH} images for now.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: MAX_IMAGES_AT_LAUNCH }).map((_, i) => {
          const url = images[i];
          return (
            <div key={i} className="aspect-[4/3] rounded-lg border border-dashed border-[#e8e0d0] overflow-hidden relative bg-[#faf7f2]">
              {url ? (
                <>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    aria-label="Remove image"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-[#fdf9ed] transition-colors text-center px-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c2b8a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="text-[10px] text-[#9a8c7a] mt-1.5">
                    {i === images.length && uploading ? "Uploading…" : "Add image"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading || images.length >= MAX_IMAGES_AT_LAUNCH} />
                </label>
              )}
            </div>
          );
        })}
      </div>

      <ErrorText>{error}</ErrorText>
      <NavRow onBack={onBack} onNext={onNext} nextLabel={images.length ? "Continue" : "Skip"} />
    </Card>
  );
}

function CharactersQuestion({ data, update, error, setError, onBack, onNext }) {
  const characters = data.characters ?? [];
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  function addCharacter() {
    if (!name.trim()) { setError("Give your character a name first."); return; }
    if (characters.length >= MAX_CHARACTERS) { setError(`You can add up to ${MAX_CHARACTERS} characters.`); return; }
    update({ characters: [...characters, { name: name.trim(), description: desc.trim() }] });
    setName(""); setDesc(""); setError("");
  }

  function removeCharacter(i) {
    update({ characters: characters.filter((_, idx) => idx !== i) });
  }

  return (
    <Card accent>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-2">Question 7 of 7</p>
      <h3 className="font-serif text-[#1a1a2e] text-lg sm:text-xl font-bold leading-snug mb-1.5">
        Favorite characters — loved or difficult to write
      </h3>
      <p className="text-[12px] text-[#9a8c7a] leading-relaxed mb-4">
        Optional — add up to {MAX_CHARACTERS}. These show on your plan page community section.
      </p>

      {characters.length > 0 && (
        <div className="space-y-2 mb-4">
          {characters.map((c, i) => (
            <div key={i} className="flex items-center justify-between bg-[#faf7f2] border border-[#e8e0d0] rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#1a1a2e] truncate">{c.name}</p>
                {c.description && <p className="text-[11px] text-[#9a8c7a] truncate">{c.description}</p>}
              </div>
              <button type="button" onClick={() => removeCharacter(i)} className="text-[#9a8c7a] hover:text-[#c0392b] transition-colors flex-shrink-0 ml-2" aria-label="Remove character">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {characters.length < MAX_CHARACTERS && (
        <div className="bg-white border border-[#e8e0d0] rounded-lg p-3 mb-2">
          <FieldLabel>Character name</FieldLabel>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Elowen" className="mb-2" />
          <FieldLabel>Short description</FieldLabel>
          <TextInput value={desc} onChange={(e) => setDesc(e.target.value.slice(0, CHAR_DESC_MAX))} placeholder="e.g. Protagonist — loved writing her" />
          <button type="button" onClick={addCharacter} className="mt-2 text-[12px] font-semibold text-[#b8860b] hover:underline">
            + Add character
          </button>
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      <NavRow onBack={onBack} onNext={onNext} nextLabel={characters.length ? "Continue" : "Skip"} />
    </Card>
  );
}