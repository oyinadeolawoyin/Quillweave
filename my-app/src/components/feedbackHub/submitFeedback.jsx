import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "../profile/header";
import { WriteEditor, ThesaurusDrawer, countWords } from "../drafts/writeeditorshared";

// ─── Constants ────────────────────────────────────────────────────────────────

const GENRES = [
  "Fantasy", "Sci-fi", "Romance", "Thriller", "Literary",
  "Horror", "Mystery", "Historical fiction", "Other",
];

const TIERS = [
  { value: "TIER_1000", label: "Up to 1,000 words", cost: 10 },
  { value: "TIER_2000", label: "Up to 2,000 words", cost: 20 },
  { value: "TIER_3000", label: "Up to 3,000 words", cost: 30 },
  { value: "TIER_4000", label: "Up to 4,000 words", cost: 40 },
  { value: "TIER_5000", label: "Up to 5,000 words", cost: 50 },
];

const STAGES = [
  { value: "ROUGH",      label: "Rough draft",  sub: "Be gentle" },
  { value: "POLISHING",  label: "Polishing",    sub: "Be honest" },
  { value: "FINAL_EDIT", label: "Final edit",   sub: "Be ruthless" },
];

const PRESET_WARNINGS = ["Violence", "Death", "Sexual content", "Abuse", "Mental health"];

// ─── Step bar ─────────────────────────────────────────────────────────────────

function StepBar({ current, steps }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
              i < current ? "bg-[#2d3748] text-white"
                : i === current ? "bg-[#2d3748] text-white ring-4 ring-[#2d3748]/10"
                : "bg-[#f4f1ec] text-[#b8a898] border border-[#e8e0d0]"
            }`}>
              {i < current ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${i === current ? "text-[#2d3748]" : "text-[#b8a898]"}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-2 mb-4 transition-all duration-300 ${i < current ? "bg-[#2d3748]" : "bg-[#e8e0d0]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange, placeholder, maxWords = null }) {
  const [input,    setInput]    = useState("");
  const [tagError, setTagError] = useState("");
  const inputRef = useRef(null);

  function addTag(value) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (maxWords !== null && trimmed.split(/\s+/).filter(Boolean).length > maxWords) {
      setTagError(`Keep it to ${maxWords} words or fewer — be concise!`); return;
    }
    if (!tags.includes(trimmed) && tags.length < 8) {
      onChange([...tags, trimmed]); setTagError("");
    }
    setInput("");
  }

  return (
    <div>
      <div
        className={`min-h-[48px] w-full border rounded-xl bg-[#faf7f2] px-3 py-2 flex flex-wrap gap-2 cursor-text transition-all focus-within:ring-2 focus-within:ring-[#2d3748]/10 ${
          tagError ? "border-[#c0392b]" : "border-[#e8e0d0] focus-within:border-[#2d3748]"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1.5 bg-[#2d3748] text-white text-xs px-3 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} className="text-[#a8b4c4] hover:text-white transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef} value={input}
          onChange={e => { setInput(e.target.value); if (tagError) setTagError(""); }}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); addTag(input); }
            if (e.key === "Backspace" && !input && tags.length) onChange(tags.slice(0, -1));
          }}
          onBlur={() => input.trim() && addTag(input)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[140px] bg-transparent text-sm text-[#2d3748] placeholder-[#b8a898] outline-none"
        />
      </div>
      {tagError && <p className="text-xs text-[#c0392b] mt-1.5">{tagError}</p>}
    </div>
  );
}

// ─── Warning tag input ────────────────────────────────────────────────────────

function WarningTagInput({ warnings, onChange }) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  function toggle(w) {
    onChange(warnings.includes(w) ? warnings.filter(x => x !== w) : [...warnings, w]);
  }

  function addCustom(value) {
    const trimmed = value.trim();
    if (!trimmed || warnings.includes(trimmed) || warnings.length >= 10) return;
    onChange([...warnings, trimmed]);
    setInput("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_WARNINGS.map(w => (
          <button key={w} type="button" onClick={() => toggle(w)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              warnings.includes(w)
                ? "bg-[#fdf1f0] text-[#c0392b] border-[#f5c6c3]"
                : "bg-white text-[#9a8c7a] border-[#e8e0d0] hover:border-[#9a8c7a]"
            }`}>
            {w}
          </button>
        ))}
      </div>
      <div
        className="min-h-[44px] w-full border border-[#e8e0d0] rounded-xl bg-[#faf7f2] px-3 py-2 flex flex-wrap gap-2 cursor-text focus-within:border-[#2d3748] focus-within:ring-2 focus-within:ring-[#2d3748]/10 transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        {warnings.filter(w => !PRESET_WARNINGS.includes(w)).map(w => (
          <span key={w} className="inline-flex items-center gap-1.5 bg-[#fdf1f0] text-[#c0392b] border border-[#f5c6c3] text-xs px-3 py-1 rounded-full">
            {w}
            <button type="button" onClick={() => onChange(warnings.filter(x => x !== w))} className="hover:text-[#8a1a1a] transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); addCustom(input); }
            if (e.key === "Backspace" && !input) {
              const custom = warnings.filter(w => !PRESET_WARNINGS.includes(w));
              if (custom.length) onChange(warnings.filter(w => w !== custom[custom.length - 1]));
            }
          }}
          onBlur={() => input.trim() && addCustom(input)}
          placeholder={warnings.filter(w => !PRESET_WARNINGS.includes(w)).length === 0 ? "Add custom warning… (press Enter)" : ""}
          className="flex-1 min-w-[180px] bg-transparent text-sm text-[#2d3748] placeholder-[#b8a898] outline-none"
        />
      </div>
      <p className="text-xs text-[#9a8c7a]">Click a preset or type your own and press Enter.</p>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function SubmitFeedback() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { id: submissionId } = useParams();
  const isEditMode = Boolean(submissionId);

  const [step,           setStep]           = useState(0);
  const [wallet,         setWallet]         = useState(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [savingDraft,    setSavingDraft]    = useState(false);
  const [draftSaved,     setDraftSaved]     = useState(false);
  const [savedDraftId,   setSavedDraftId]   = useState(null);
  const [error,          setError]          = useState("");
  const [spotlightBlock, setSpotlightBlock] = useState("");
  const [loading,        setLoading]        = useState(isEditMode);
  const [customGenre,    setCustomGenre]    = useState("");
  const [thesaurusOpen,  setThesaurusOpen]  = useState(false);

  // Live word count from WriteEditor (driven by onWordsUpdate, always accurate)
  const [liveWordCount, setLiveWordCount] = useState(0);

  // contentRef gives direct DOM access to the editor — no auto-save needed
  const contentRef = useRef(null);

  const [form, setForm] = useState({
    title: "", genre: "", summary: "", content: "",
    wordCountTier: "", draftStage: "", contentWarnings: [], feedbackWanted: [],
  });

  // ── Load existing submission in edit mode ─────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/feedback/submissions/${submissionId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Submission not found.");
        const data = await res.json();
        const s = data.submission ?? data;
        const isKnown = GENRES.includes(s.genre ?? "");
        setForm({
          title: s.title ?? "", genre: isKnown ? s.genre : "Other", summary: s.summary ?? "",
          content: s.content ?? "", wordCountTier: s.wordCountTier ?? "", draftStage: s.draftStage ?? "",
          contentWarnings: s.contentWarnings ?? [], feedbackWanted: s.feedbackWanted ?? [],
        });
        if (!isKnown) setCustomGenre(s.genre ?? "");
      } catch (e) { setError(e.message); }
      setLoading(false);
    }
    load();
  }, [submissionId, isEditMode]);

  useEffect(() => { if (user) fetchWallet(); }, [user]);

  async function fetchWallet() {
    try {
      const res = await fetch(`${API_URL}/feedback/points/me`, { credentials: "include" });
      if (res.ok) setWallet(await res.json());
    } catch {}
  }

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })); setError(""); }

  const effectiveGenre = form.genre === "Other" ? customGenre.trim() : form.genre;

  // Use liveWordCount for validation on step 2 (accurate from rich editor)
  const wordCount    = step === 2 ? liveWordCount : countWords(form.content);
  const summaryWords = countWords(form.summary);
  const selectedTier = TIERS.find(t => t.value === form.wordCountTier);
  const balance      = wallet?.postingBalance ?? 0;
  const isFreeEligible = !!(wallet?.freePostAvailable);
  const tierMaxWords = { TIER_1000: 1000, TIER_2000: 2000, TIER_3000: 3000, TIER_4000: 4000, TIER_5000: 5000 };
  const maxWords     = tierMaxWords[form.wordCountTier] ?? 5000;
  const wordProgress = Math.min((wordCount / maxWords) * 100, 100);
  const wordOver     = form.wordCountTier && wordCount > maxWords;

  // ── Save as draft ─────────────────────────────────────────────────────────
  async function handleSaveAsDraft() {
    setSavingDraft(true);
    setError("");
    try {
      // Read content directly from the editor DOM — no auto-save needed
      const editorEl = contentRef.current;
      const innerText = editorEl?.innerText || "";
      if (!innerText.trim()) {
        setError("Write something first before saving as a draft.");
        setSavingDraft(false);
        return;
      }
      const content = editorEl?.innerHTML || "";

      if (savedDraftId) {
        await fetch(`${API_URL}/drafts/${savedDraftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: form.title || null, content }),
        });
      } else {
        const res = await fetch(`${API_URL}/drafts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: form.title || null, content }),
        });
        if (!res.ok) throw new Error("Failed to save draft.");
        const data = await res.json();
        setSavedDraftId(data.draft?.id);
      }
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (e) {
      setError(e.message || "Something went wrong saving your draft.");
    }
    setSavingDraft(false);
  }

  // ── Step validation ───────────────────────────────────────────────────────
  function validateStep(s) {
    if (s === 0) {
      if (!form.title.trim()) return "Please give your chapter a title.";
      if (!effectiveGenre)    return "Please select or enter a genre.";
      if (summaryWords < 25 || summaryWords > 60) return `Summary must be 25–60 words (currently ${summaryWords}).`;
      return "";
    }
    if (s === 1) {
      if (!form.wordCountTier)               return "Please select a word count tier.";
      if (!form.draftStage)                  return "Please select your draft stage.";
      if (form.feedbackWanted.length === 0)  return "Please add at least one specific feedback request.";
      return "";
    }
    if (s === 2) {
      if (liveWordCount === 0) return "Please write or paste your chapter content.";
      const max = tierMaxWords[form.wordCountTier];
      if (max && liveWordCount > max) return `Your chapter is ${liveWordCount} words. Selected tier allows up to ${selectedTier?.label}.`;
      if (!isEditMode && !isFreeEligible && balance < (selectedTier?.cost ?? 0))
        return `Not enough points. You need ${selectedTier?.cost ?? 0} pts but have ${balance}.`;
      return "";
    }
    return "";
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep(s => s + 1);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const err = validateStep(2);
    if (err) { setError(err); return; }
    setSubmitting(true); setError("");
    try {
      // Read content directly from the editor DOM — no auto-save round-trip needed
      const freshContent = contentRef.current?.innerHTML || "";

      const payload = { ...form, content: freshContent, genre: effectiveGenre };
      if (isEditMode) {
        const res = await fetch(`${API_URL}/feedback/submissions/${submissionId}`, {
          method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: payload.title, genre: payload.genre, summary: payload.summary,
            content: payload.content, draftStage: payload.draftStage,
            contentWarnings: payload.contentWarnings, feedbackWanted: payload.feedbackWanted,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Update failed.");
        // If we had a draft saved, delete it now that we submitted
        if (savedDraftId) {
          fetch(`${API_URL}/drafts/${savedDraftId}`, { method: "DELETE", credentials: "include" }).catch(() => {});
        }
        navigate(`/critique/${submissionId}`, { state: { updated: true } });
      } else {
        const res = await fetch(`${API_URL}/feedback/submissions`, {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Submission failed.");
        if (savedDraftId) {
          fetch(`${API_URL}/drafts/${savedDraftId}`, { method: "DELETE", credentials: "include" }).catch(() => {});
        }
        navigate(`/critique/${data.id}`);
      }
    } catch (e) {
      if (e.message?.includes("already have a chapter in the spotlight")) { setSpotlightBlock(e.message); setStep(0); }
      else setError(e.message);
    }
    setSubmitting(false);
  }

  const steps = ["About", "Details", "Your chapter"];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <svg className="w-8 h-8 animate-spin text-[#9a8c7a]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />

      <main className={`mx-auto px-4 sm:px-6 py-10 ${step === 2 ? "max-w-4xl" : "max-w-2xl"}`}>

        <Link to={isEditMode ? `/critique/${submissionId}` : "/critique"}
          className="inline-flex items-center gap-1.5 text-sm text-[#9a8c7a] hover:text-[#2d3748] transition-colors mb-8">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
          {isEditMode ? "Back to submission" : "Back to hub"}
        </Link>

        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[#2d3748] mb-2">
            {isEditMode ? "Edit submission" : "Submit a chapter"}
          </h1>
          <p className="text-[#6b5c4a] text-sm">
            {isEditMode
              ? "Update your chapter details. Existing critiques and comments are not affected."
              : "Share your writing and receive thoughtful feedback from the community."}
          </p>
        </div>

        {/* Balance bar */}
        {!isEditMode && wallet && (
          <div className="flex items-center justify-between bg-white border border-[#e8e0d0] rounded-xl px-4 py-3 mb-8 text-sm">
            <span className="text-[#6b5c4a]">Posting balance: <strong className="text-[#2d3748]">{balance} pts</strong></span>
            {isFreeEligible && (
              <span className="text-[11px] font-semibold text-[#b8860b] bg-[#fdf9ed] border border-[#f0d98a] px-2.5 py-1 rounded-full">Free post available</span>
            )}
          </div>
        )}

        {isEditMode && (
          <div className="flex items-start gap-3 bg-[#fdfbea] border border-[#e8d87a] rounded-xl px-4 py-3 mb-8 text-sm">
            <svg className="w-4 h-4 text-[#8a6c00] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-[#8a6c00]">Editing won't change your word count tier or cost. Existing feedback stays visible.</p>
          </div>
        )}

        {spotlightBlock && !isEditMode && (
          <div className="flex items-start gap-3 bg-[#fdf4f4] border border-[#e8c4c4] rounded-xl px-4 py-4 mb-6">
            <svg className="w-5 h-5 text-[#c0392b] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            <div>
              <p className="text-sm font-semibold text-[#c0392b] mb-1">You already have a chapter in the spotlight</p>
              <p className="text-sm text-[#7a3030] leading-relaxed">{spotlightBlock}</p>
              <Link to="/feedback" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-[#c0392b] hover:underline">View the spotlight →</Link>
            </div>
          </div>
        )}

        <StepBar current={step} steps={steps} />

        {/* ── Step 0: About ─────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="bg-white border border-[#e8e0d0] rounded-2xl p-6 sm:p-8 shadow-[0_2px_12px_rgba(45,35,20,0.05)] space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">Chapter title</label>
              <input type="text" value={form.title} onChange={e => set("title", e.target.value)}
                placeholder="e.g. The Hollow Season — Chapter 3"
                className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 transition-all"
              />
            </div>

            {/* Genre — presets + custom input for "Other" or any unlisted genre */}
            <div>
              <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">Genre</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(g => (
                  <button key={g} type="button" onClick={() => { set("genre", g); if (g !== "Other") setCustomGenre(""); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      form.genre === g ? "bg-[#2d3748] text-white border-[#2d3748]" : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#2d3748]"
                    }`}>
                    {g}
                  </button>
                ))}
              </div>
              {/* Custom genre input — tag-style: press Enter to confirm genre as a chip */}
              {form.genre === "Other" && (
                <div className="mt-3">
                  <div
                    className="min-h-[48px] w-full border border-[#e8e0d0] rounded-xl bg-[#faf7f2] px-3 py-2 flex flex-wrap gap-2 items-center cursor-text focus-within:border-[#2d3748] focus-within:ring-2 focus-within:ring-[#2d3748]/10 transition-all"
                    onClick={() => !customGenre && document.getElementById("custom-genre-input")?.focus()}
                  >
                    {customGenre ? (
                      <span className="inline-flex items-center gap-1.5 bg-[#2d3748] text-white text-xs px-3 py-1 rounded-full">
                        {customGenre}
                        <button
                          type="button"
                          onClick={() => setCustomGenre("")}
                          className="text-[#a8b4c4] hover:text-white transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ) : (
                      <input
                        id="custom-genre-input"
                        type="text"
                        autoFocus
                        placeholder="Type your genre and press Enter…"
                        className="flex-1 min-w-[200px] bg-transparent text-sm text-[#2d3748] placeholder-[#b8a898] outline-none"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = e.target.value.trim();
                            if (val) { setCustomGenre(val); e.target.value = ""; }
                          }
                        }}
                        onBlur={e => {
                          const val = e.target.value.trim();
                          if (val) setCustomGenre(val);
                        }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-[#9a8c7a] mt-1.5">
                    Type your genre (e.g. "Dark academia", "Grimdark") and press Enter.
                  </p>
                </div>
              )}
            </div>

            {/* Summary */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-[#2d3748]">Summary</label>
                <span className={`text-xs font-medium ${summaryWords < 25 || summaryWords > 60 ? "text-[#c0392b]" : "text-[#6b8c6b]"}`}>
                  {summaryWords} / 25–60 words
                </span>
              </div>
              <textarea value={form.summary} onChange={e => set("summary", e.target.value)} rows={3}
                placeholder="A brief, honest description — genre, tone, and the core tension. Helps readers decide if this is for them."
                className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 transition-all resize-none leading-relaxed"
              />
            </div>

            {error && <div className="bg-[#fdf1f0] border border-[#f5c6c3] rounded-xl px-4 py-3 text-sm text-[#c0392b]">{error}</div>}

            <div className="flex justify-end pt-2 border-t border-[#f0ebe3]">
              <button type="button" onClick={nextStep}
                className="px-6 py-2.5 rounded-xl bg-[#2d3748] text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Details ───────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white border border-[#e8e0d0] rounded-2xl p-6 sm:p-8 shadow-[0_2px_12px_rgba(45,35,20,0.05)] space-y-6">

            {/* Tier */}
            <div>
              <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">Word count tier</label>
              <p className="text-xs text-[#9a8c7a] mb-3">
                {isEditMode ? "Word count tier cannot be changed after submission." : "Match this to your chapter length."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {TIERS.map(t => {
                  const affordable = balance >= t.cost || isFreeEligible;
                  const isSelected = form.wordCountTier === t.value;
                  return (
                    <button key={t.value} type="button"
                      onClick={() => !isEditMode && set("wordCountTier", t.value)}
                      disabled={isEditMode || (!affordable && !isFreeEligible)}
                      className={`px-4 py-3 rounded-xl border text-left transition-all ${
                        isSelected ? "bg-[#2d3748] text-white border-[#2d3748]"
                          : isEditMode || !affordable ? "bg-[#faf7f2] text-[#b8a898] border-[#f0ebe3] cursor-not-allowed"
                          : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#2d3748]"
                      }`}>
                      <span className="block text-sm font-semibold">{t.label}</span>
                      <span className={`text-xs mt-0.5 block ${isSelected ? "text-[#a8b4c4]" : "text-[#9a8c7a]"}`}>
                        {isEditMode ? (isSelected ? "Current tier" : "—") : isFreeEligible ? "Free (first post)" : `Costs ${t.cost} pts`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Draft stage */}
            <div>
              <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">Draft stage</label>
              <div className="grid grid-cols-3 gap-3">
                {STAGES.map(s => (
                  <button key={s.value} type="button" onClick={() => set("draftStage", s.value)}
                    className={`px-3 py-3 rounded-xl border text-left transition-all ${
                      form.draftStage === s.value ? "bg-[#2d3748] text-white border-[#2d3748]" : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#2d3748]"
                    }`}>
                    <span className="block text-sm font-semibold">{s.label}</span>
                    <span className={`text-[11px] mt-0.5 block leading-tight ${form.draftStage === s.value ? "text-[#a8b4c4]" : "text-[#9a8c7a]"}`}>{s.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback wanted */}
            <div>
              <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">Feedback wanted</label>
              <p className="text-xs text-[#9a8c7a] mb-2">Tell readers what to focus on — up to 5 words per tag. Press Enter to add.</p>
              <TagInput tags={form.feedbackWanted} onChange={tags => set("feedbackWanted", tags)} placeholder="e.g. pacing in act two" maxWords={5} />
              {form.feedbackWanted.length === 0 && <p className="text-xs text-[#b8a898] mt-2">At least one feedback request is required.</p>}
            </div>

            {/* Content warnings */}
            <div>
              <label className="block text-sm font-semibold text-[#2d3748] mb-2">
                Content warnings <span className="font-normal text-[#9a8c7a]">(optional)</span>
              </label>
              <WarningTagInput warnings={form.contentWarnings} onChange={tags => set("contentWarnings", tags)} />
            </div>

            {error && <div className="bg-[#fdf1f0] border border-[#f5c6c3] rounded-xl px-4 py-3 text-sm text-[#c0392b]">{error}</div>}

            <div className="flex items-center justify-between pt-2 border-t border-[#f0ebe3]">
              <button type="button" onClick={() => { setStep(s => s - 1); setError(""); }}
                className="px-5 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#6b5c4a] hover:border-[#2d3748] transition-all">Back</button>
              <button type="button" onClick={nextStep}
                className="px-6 py-2.5 rounded-xl bg-[#2d3748] text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm">Continue</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Chapter content ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Word count progress */}
            <div className="bg-white border border-[#e8e0d0] rounded-2xl px-6 py-4 shadow-[0_2px_12px_rgba(45,35,20,0.05)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#2d3748]">Chapter content</span>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${wordOver ? "text-[#c0392b]" : "text-[#6b5c4a]"}`}>
                    {wordCount.toLocaleString()} / {maxWords.toLocaleString()} words
                  </span>
                  {/* Thesaurus toggle */}
                  <button
                    onClick={() => setThesaurusOpen(o => !o)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all font-medium ${
                      thesaurusOpen ? "border-[#2d3748] bg-[#2d3748] text-white" : "border-[#e8e0d0] text-[#7a6a50] hover:border-[#c9b090] bg-[#faf7f2]"
                    }`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    Thesaurus
                  </button>
                </div>
              </div>
              {form.wordCountTier && (
                <div className="h-1 bg-[#f0ebe3] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${wordOver ? "bg-[#c0392b]" : "bg-[#2d3748]"}`}
                    style={{ width: `${wordProgress}%` }} />
                </div>
              )}
            </div>

            {/*
              WriteEditor replaces the old RichEditor textarea.
              showColorTools={false} hides background + text colour pickers for the feedback hub.
              The title field inside WriteEditor is intentionally hidden since we already have a
              title field on step 0. We pass a dummy draftId of null here — real drafting is
              handled by the "Save as draft" button below.
            */}
            <div className="bg-white border border-[#e8e0d0] rounded-2xl shadow-[0_2px_12px_rgba(45,35,20,0.05)] overflow-hidden">
              <WriteEditor
                draftId={null}
                initialContent={isEditMode ? form.content : undefined}
                onWordsUpdate={wc => setLiveWordCount(wc)}
                onAutoSave={undefined}
                onDraftLoaded={() => {}}
                contentRef={contentRef}
                showColorTools={false}
              />
            </div>

            {/* Submission summary */}
            <div className="bg-white border border-[#e8e0d0] rounded-2xl p-5 shadow-[0_2px_12px_rgba(45,35,20,0.05)]">
              <p className="font-semibold text-[#2d3748] text-sm mb-3">Submission summary</p>
              <div className="space-y-2 text-sm">
                {[
                  ["Title",  form.title || "—"],
                  ["Genre",  effectiveGenre || "—"],
                  ["Tier",   TIERS.find(t => t.value === form.wordCountTier)?.label ?? "—"],
                  ...(!isEditMode ? [
                    ["Cost",           isFreeEligible ? "Free (first post)" : `${selectedTier?.cost ?? 0} pts`],
                    ["Balance after",  isFreeEligible ? `${balance} pts`    : `${balance - (selectedTier?.cost ?? 0)} pts`],
                  ] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-[#6b5c4a]">
                    <span>{label}</span>
                    <span className="font-medium text-[#2d3748] text-right max-w-[200px] truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="bg-[#fdf1f0] border border-[#f5c6c3] rounded-xl px-4 py-3 text-sm text-[#c0392b]">{error}</div>}

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => { setStep(s => s - 1); setError(""); }}
                className="px-5 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#6b5c4a] hover:border-[#2d3748] transition-all">Back</button>

              <div className="flex items-center gap-3">
                {/* Save as draft */}
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={handleSaveAsDraft}
                    disabled={savingDraft}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#6b5c4a] hover:border-[#2d3748] transition-all disabled:opacity-60">
                    {savingDraft ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                    ) : draftSaved ? (
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    )}
                    {draftSaved ? "Saved!" : savingDraft ? "Saving…" : "Save as draft"}
                  </button>
                )}

                {/* Submit */}
                <button type="button" onClick={handleSubmit} disabled={submitting || wordOver}
                  className="px-6 py-2.5 rounded-xl bg-[#2d3748] text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {submitting ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>{isEditMode ? "Saving..." : "Submitting..."}</>
                  ) : isEditMode ? "Save changes" : "Post chapter"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Thesaurus drawer — available on step 2 */}
      <ThesaurusDrawer isOpen={thesaurusOpen} onClose={() => setThesaurusOpen(false)} />
    </div>
  );
}