// src/components/feedback/SubmitFeedback.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "../profile/header";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

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
  { value: "ROUGH",      label: "Rough draft",  sub: "Early pass — be gentle" },
  { value: "POLISHING",  label: "Polishing",    sub: "Getting there — be honest" },
  { value: "FINAL_EDIT", label: "Final edit",   sub: "Near done — be ruthless" },
];

const WARNINGS = ["Violence", "Death", "Sexual content", "Abuse", "Mental health"];

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── STEP INDICATOR ──────────────────────────────────────────────────────────

function StepBar({ current, steps }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                i < current
                  ? "bg-[#2d3748] text-white"
                  : i === current
                  ? "bg-[#2d3748] text-white ring-4 ring-[#2d3748]/10"
                  : "bg-[#f4f1ec] text-[#b8a898] border border-[#e8e0d0]"
              }`}
            >
              {i < current ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${
              i === current ? "text-[#2d3748]" : "text-[#b8a898]"
            }`}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-2 mb-4 transition-all duration-300 ${
              i < current ? "bg-[#2d3748]" : "bg-[#e8e0d0]"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── TAG INPUT ───────────────────────────────────────────────────────────────

function TagInput({ tags, onChange, placeholder, maxWords = null }) {
  const [input, setInput] = useState("");
  const [tagError, setTagError] = useState("");
  const inputRef = useRef(null);

  function wordCount(str) {
    return str.trim().split(/\s+/).filter(Boolean).length;
  }

  function addTag(value) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (maxWords !== null && wordCount(trimmed) > maxWords) {
      setTagError(`Keep it to ${maxWords} words or fewer — be concise!`);
      return;
    }
    if (!tags.includes(trimmed) && tags.length < 8) {
      onChange([...tags, trimmed]);
      setTagError("");
    }
    setInput("");
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKey(e) {
    if (e.key === "Enter") { e.preventDefault(); addTag(input); }
    if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  function handleChange(e) {
    setInput(e.target.value);
    if (tagError) setTagError("");
  }

  return (
    <div>
      <div
        className={`min-h-[48px] w-full border rounded-xl bg-[#faf7f2] px-3 py-2 flex flex-wrap gap-2 cursor-text transition-all focus-within:ring-2 focus-within:ring-[#2d3748]/10 ${
          tagError ? "border-[#c0392b] focus-within:border-[#c0392b]" : "border-[#e8e0d0] focus-within:border-[#2d3748]"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 bg-[#2d3748] text-white text-xs px-3 py-1 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-[#a8b4c4] hover:text-white transition-colors ml-0.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKey}
          onBlur={() => input.trim() && addTag(input)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[140px] bg-transparent text-sm text-[#2d3748] placeholder-[#b8a898] outline-none"
        />
      </div>
      {tagError && (
        <p className="text-xs text-[#c0392b] mt-1.5 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {tagError}
        </p>
      )}
    </div>
  );
}

// ─── RICH TEXTAREA ────────────────────────────────────────────────────────────

function RichTextarea({ value, onChange, rows, placeholder, className }) {
  const ref = useRef(null);

  function applyFormat(syntax) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const selected = value.slice(start, end);
    let newValue, newStart, newEnd;

    if (syntax === "em-dash") {
      newValue = value.slice(0, start) + "\u2014" + value.slice(end);
      newStart = newEnd = start + 1;
    } else {
      const wrapped = `${syntax}${selected || "text"}${syntax}`;
      newValue = value.slice(0, start) + wrapped + value.slice(end);
      if (!selected) {
        newStart = start + syntax.length;
        newEnd   = newStart + 4;
      } else {
        newStart = start;
        newEnd   = start + wrapped.length;
      }
    }

    onChange(newValue);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newStart, newEnd);
    });
  }

  function handleKeyDown(e) {
    if (e.key === "-") {
      const el = ref.current;
      const pos = el.selectionStart;
      if (pos > 0 && value[pos - 1] === "-") {
        e.preventDefault();
        const newValue = value.slice(0, pos - 1) + "\u2014" + value.slice(el.selectionEnd);
        onChange(newValue);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(pos, pos);
        });
      }
    }
  }

  const toolbarBtnClass =
    "h-7 px-2 flex items-center gap-1 rounded text-[11px] font-semibold text-[#6b5c4a] hover:bg-[#f0ebe3] hover:text-[#2d3748] transition-colors select-none";

  return (
    <div className="flex flex-col border border-[#e8e0d0] rounded-xl overflow-hidden focus-within:border-[#2d3748] focus-within:ring-2 focus-within:ring-[#2d3748]/10 transition-all bg-[#faf7f2]">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#e8e0d0] bg-white">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat("**"); }}
          className={toolbarBtnClass}
          title="Bold"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          </svg>
          <span>B</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat("*"); }}
          className={toolbarBtnClass}
          title="Italic"
        >
          <span className="italic font-serif text-sm leading-none">I</span>
        </button>
        <div className="w-px h-4 bg-[#e8e0d0] mx-1" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat("em-dash"); }}
          className={toolbarBtnClass}
          title="Em dash"
        >
          <span className="text-sm leading-none">—</span>
          <span className="text-[10px] text-[#9a8c7a] font-normal">em dash</span>
        </button>
        <div className="ml-auto text-[10px] text-[#c4b9ab] pr-1 hidden sm:block">
          tip: -- auto-converts to —
        </div>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}

// ─── MAIN FORM ───────────────────────────────────────────────────────────────

export default function SubmitFeedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: submissionId } = useParams();
  const isEditMode = Boolean(submissionId);

  const [step, setStep]             = useState(0);
  const [wallet, setWallet]         = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [spotlightBlock, setSpotlightBlock] = useState("");
  const [loading, setLoading]       = useState(isEditMode);
  const [customGenre, setCustomGenre] = useState("");

  const [form, setForm] = useState({
    title:           "",
    genre:           "",
    summary:         "",
    content:         "",
    wordCountTier:   "",
    draftStage:      "",
    contentWarnings: [],
    feedbackWanted:  [],
  });

  // ── Load existing submission in edit mode ─────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;
    async function loadSubmission() {
      try {
        const res = await fetch(`${API_URL}/feedback/submissions/${submissionId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Submission not found.");
        const data = await res.json();
        const s = data.submission ?? data;
        const genreValue = s.genre ?? "";
        const isKnownGenre = GENRES.includes(genreValue);
        setForm({
          title:           s.title          ?? "",
          genre:           isKnownGenre ? genreValue : "Other",
          summary:         s.summary        ?? "",
          content:         s.content        ?? "",
          wordCountTier:   s.wordCountTier  ?? "",
          draftStage:      s.draftStage     ?? "",
          contentWarnings: s.contentWarnings ?? [],
          feedbackWanted:  s.feedbackWanted  ?? [],
        });
        if (!isKnownGenre) setCustomGenre(genreValue);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    loadSubmission();
  }, [submissionId, isEditMode]);

  useEffect(() => {
    if (user) fetchWallet();
  }, [user]);

  async function fetchWallet() {
    try {
      const res = await fetch(`${API_URL}/feedback/points/me`, { credentials: "include" });
      if (res.ok) setWallet(await res.json());
    } catch (e) {}
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function toggleWarning(w) {
    set(
      "contentWarnings",
      form.contentWarnings.includes(w)
        ? form.contentWarnings.filter((x) => x !== w)
        : [...form.contentWarnings, w]
    );
  }

  // The "effective" genre — either the selected preset or the custom input
  const effectiveGenre = form.genre === "Other" ? customGenre.trim() : form.genre;

  const wordCount    = countWords(form.content);
  const summaryWords = countWords(form.summary);
  const selectedTier = TIERS.find((t) => t.value === form.wordCountTier);
  const balance      = wallet?.postingBalance ?? 0;
  const canAfford    = selectedTier ? balance >= selectedTier.cost : false;
  const isFreeEligible = !!(wallet?.freePostAvailable);

  // ── Validation per step ────────────────────────────────────────────────────

  function validateStep(s) {
    if (s === 0) {
      if (!form.title.trim()) return "Please give your chapter a title.";
      if (!effectiveGenre)    return "Please select or enter a genre.";
      if (summaryWords < 25 || summaryWords > 60)
        return `Summary must be 25–60 words (currently ${summaryWords}).`;
      return "";
    }
    if (s === 1) {
      if (!form.wordCountTier) return "Please select a word count tier.";
      if (!form.draftStage) return "Please select your draft stage.";
      if (form.feedbackWanted.length === 0)
        return "Please add at least one specific feedback request.";
      return "";
    }
    if (s === 2) {
      if (!form.content.trim()) return "Please paste your chapter content.";
      const tierMaxWords = { TIER_1000: 1000, TIER_2000: 2000, TIER_3000: 3000, TIER_4000: 4000, TIER_5000: 5000 };
      const max = tierMaxWords[form.wordCountTier];
      if (max && wordCount > max) {
        return `Your chapter is ${wordCount} words. Selected tier allows up to ${selectedTier?.label}.`;
      }
      if (!isEditMode && !canAfford && !isFreeEligible) {
        return `Not enough points. You need ${selectedTier?.cost ?? 0} pts but have ${balance}.`;
      }
      return "";
    }
    return "";
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    const err = validateStep(2);
    if (err) { setError(err); return; }

    setSubmitting(true);
    setError("");
    try {
      const payload = { ...form, genre: effectiveGenre };

      if (isEditMode) {
        const res = await fetch(`${API_URL}/feedback/submissions/${submissionId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:           payload.title,
            genre:           payload.genre,
            summary:         payload.summary,
            content:         payload.content,
            draftStage:      payload.draftStage,
            contentWarnings: payload.contentWarnings,
            feedbackWanted:  payload.feedbackWanted,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Update failed.");
        navigate(`/feedback/${submissionId}`, { state: { updated: true } });
      } else {
        const res = await fetch(`${API_URL}/feedback/submissions`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Submission failed.");
        navigate(`/feedback/${data.id}`);
      }
    } catch (e) {
      // Spotlight block is a special top-level error — show it as a banner, not a step error
      if (e.message && e.message.includes('already have a chapter in the spotlight')) {
        setSpotlightBlock(e.message);
        setStep(0); // bring user back to start so they see the banner
      } else {
        setError(e.message);
      }
    }
    setSubmitting(false);
  }

  const steps = ["About", "Details", "Content"];

  const tierMaxWords = { TIER_1000: 1000, TIER_2000: 2000, TIER_3000: 3000, TIER_4000: 4000, TIER_5000: 5000 };
  const maxWords     = tierMaxWords[form.wordCountTier] ?? 5000;
  const wordProgress = Math.min((wordCount / maxWords) * 100, 100);
  const wordOver     = form.wordCountTier && wordCount > maxWords;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <svg className="w-8 h-8 animate-spin text-[#9a8c7a] mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm text-[#9a8c7a]">Loading submission…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

        <Link
          to={isEditMode ? `/feedback/${submissionId}` : "/feedback"}
          className="inline-flex items-center gap-1.5 text-sm text-[#9a8c7a] hover:text-[#2d3748] transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          {isEditMode ? "Back to submission" : "Back to hub"}
        </Link>

        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[#2d3748] mb-2">
            {isEditMode ? "Edit submission" : "Submit a chapter"}
          </h1>
          <p className="text-[#6b5c4a] text-sm">
            {isEditMode
              ? "Update your chapter details. Your existing critiques and comments will not be affected."
              : "Share your writing and receive structured, thoughtful feedback from the community."}
          </p>
        </div>

        {!isEditMode && wallet && (
          <div className="flex items-center justify-between bg-white border border-[#e8e0d0] rounded-xl px-4 py-3 mb-8 text-sm">
            <span className="text-[#6b5c4a]">
              Your posting balance: <strong className="text-[#2d3748]">{balance} pts</strong>
            </span>
            {isFreeEligible && (
              <span className="text-[11px] font-semibold text-[#b8860b] bg-[#fdf9ed] border border-[#f0d98a] px-2.5 py-1 rounded-full">
                Free post available
              </span>
            )}
          </div>
        )}

        {isEditMode && (
          <div className="flex items-start gap-3 bg-[#fdfbea] border border-[#e8d87a] rounded-xl px-4 py-3 mb-8 text-sm">
            <svg className="w-4 h-4 text-[#8a6c00] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[#8a6c00]">
              Editing will not change your word count tier or cost. Existing feedback remains visible.
            </p>
          </div>
        )}

        {/* ── SPOTLIGHT BLOCK BANNER ──────────────────────────────────────── */}
        {spotlightBlock && !isEditMode && (
          <div className="flex items-start gap-3 bg-[#fdf4f4] border border-[#e8c4c4] rounded-xl px-4 py-4 mb-6">
            <svg className="w-5 h-5 text-[#c0392b] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[#c0392b] mb-1">You already have a chapter in the spotlight</p>
              <p className="text-sm text-[#7a3030] leading-relaxed">{spotlightBlock}</p>
              <Link
                to="/feedback"
                className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-[#c0392b] hover:underline"
              >
                View the spotlight →
              </Link>
            </div>
          </div>
        )}

        <StepBar current={step} steps={steps} />

        <div className="bg-white border border-[#e8e0d0] rounded-2xl p-6 sm:p-8 shadow-[0_2px_12px_rgba(45,35,20,0.05)]">

          {/* ── STEP 0 — About ─────────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">
                  Chapter title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. The Hollow Season — Chapter 3"
                  className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 transition-all"
                />
              </div>

              {/* ── Genre — buttons + "Other" custom input ────────────────── */}
              <div>
                <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">Genre</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        set("genre", g);
                        if (g !== "Other") setCustomGenre("");
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                        form.genre === g
                          ? "bg-[#2d3748] text-white border-[#2d3748]"
                          : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#2d3748]"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                {form.genre === "Other" && (
                  <input
                    type="text"
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    placeholder="Enter the genre (e.g. Dark academia, Cozy mystery…)"
                    className="w-full mt-3 border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 transition-all"
                    autoFocus
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-[#2d3748]">Summary</label>
                  <span className={`text-xs font-medium ${
                    summaryWords < 25 || summaryWords > 60 ? "text-[#c0392b]" : "text-[#6b8c6b]"
                  }`}>
                    {summaryWords} / 25–60 words
                  </span>
                </div>
                <textarea
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  rows={3}
                  placeholder="A brief, honest description — genre, tone, and the core tension. Helps readers decide if this is for them."
                  className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ── STEP 1 — Details ───────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">
                  Word count tier
                </label>
                <p className="text-xs text-[#9a8c7a] mb-3">
                  {isEditMode
                    ? "Word count tier cannot be changed after submission."
                    : "Match this to your chapter length. The cost is deducted from your posting balance."}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {TIERS.map((t) => {
                    const affordable = balance >= t.cost || isFreeEligible;
                    const isSelected = form.wordCountTier === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => !isEditMode && set("wordCountTier", t.value)}
                        disabled={isEditMode || (!affordable && !isFreeEligible)}
                        className={`px-4 py-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-[#2d3748] text-white border-[#2d3748]"
                            : isEditMode
                            ? "bg-[#faf7f2] text-[#b8a898] border-[#f0ebe3] cursor-not-allowed"
                            : affordable
                            ? "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#2d3748]"
                            : "bg-[#faf7f2] text-[#b8a898] border-[#f0ebe3] cursor-not-allowed"
                        }`}
                      >
                        <span className="block text-sm font-semibold">{t.label}</span>
                        <span className={`text-xs mt-0.5 block ${
                          isSelected ? "text-[#a8b4c4]" : "text-[#9a8c7a]"
                        }`}>
                          {isEditMode ? (isSelected ? "Current tier" : "—") : isFreeEligible ? "Free (first post)" : `Costs ${t.cost} pts`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">
                  Draft stage
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {STAGES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => set("draftStage", s.value)}
                      className={`px-3 py-3 rounded-xl border text-left transition-all ${
                        form.draftStage === s.value
                          ? "bg-[#2d3748] text-white border-[#2d3748]"
                          : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#2d3748]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{s.label}</span>
                      <span className={`text-[11px] mt-0.5 block leading-tight ${
                        form.draftStage === s.value ? "text-[#a8b4c4]" : "text-[#9a8c7a]"
                      }`}>
                        {s.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2d3748] mb-1.5">
                  Feedback wanted
                </label>
                <p className="text-xs text-[#9a8c7a] mb-2">
                  Tell readers what to focus on — up to 5 words per tag. Press Enter to add.
                </p>
                <TagInput
                  tags={form.feedbackWanted}
                  onChange={(tags) => set("feedbackWanted", tags)}
                  placeholder="e.g. pacing in act two"
                  maxWords={5}
                />
                {form.feedbackWanted.length === 0 && (
                  <p className="text-xs text-[#b8a898] mt-2">At least one feedback request is required.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#2d3748] mb-2">
                  Content warnings <span className="font-normal text-[#9a8c7a]">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {WARNINGS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => toggleWarning(w)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        form.contentWarnings.includes(w)
                          ? "bg-[#fdf1f0] text-[#c0392b] border-[#f5c6c3]"
                          : "bg-white text-[#9a8c7a] border-[#e8e0d0] hover:border-[#9a8c7a]"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 — Content ───────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-[#2d3748]">
                    Chapter content
                  </label>
                  <span className={`text-xs font-semibold ${
                    wordOver ? "text-[#c0392b]" : "text-[#6b5c4a]"
                  }`}>
                    {wordCount.toLocaleString()} / {maxWords.toLocaleString()} words
                  </span>
                </div>

                {form.wordCountTier && (
                  <div className="h-1 bg-[#f0ebe3] rounded-full mb-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        wordOver ? "bg-[#c0392b]" : "bg-[#2d3748]"
                      }`}
                      style={{ width: `${wordProgress}%` }}
                    />
                  </div>
                )}

                <RichTextarea
                  value={form.content}
                  onChange={(v) => { set("content", v); }}
                  rows={18}
                  placeholder="Paste your chapter here. Separate paragraphs with a blank line."
                  className="w-full px-4 py-3 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none resize-none leading-[1.9] font-[Georgia,serif]"
                />
                <p className="text-xs text-[#b8a898] mt-2">
                  Separate paragraphs with a blank line so readers can comment on each one individually.
                </p>
              </div>

              <div className="bg-[#faf7f2] border border-[#e8e0d0] rounded-xl p-4 text-sm space-y-2">
                <p className="font-semibold text-[#2d3748] mb-2">Submission summary</p>
                <div className="flex justify-between text-[#6b5c4a]">
                  <span>Title</span>
                  <span className="font-medium text-[#2d3748] text-right max-w-[200px] truncate">{form.title || "—"}</span>
                </div>
                <div className="flex justify-between text-[#6b5c4a]">
                  <span>Genre</span>
                  <span className="font-medium text-[#2d3748]">{effectiveGenre || "—"}</span>
                </div>
                <div className="flex justify-between text-[#6b5c4a]">
                  <span>Tier</span>
                  <span className="font-medium text-[#2d3748]">
                    {TIERS.find((t) => t.value === form.wordCountTier)?.label ?? "—"}
                  </span>
                </div>
                {!isEditMode && (
                  <>
                    <div className="flex justify-between text-[#6b5c4a]">
                      <span>Cost</span>
                      <span className={`font-semibold ${isFreeEligible ? "text-[#b8860b]" : "text-[#2d3748]"}`}>
                        {isFreeEligible ? "Free (first post)" : `${selectedTier?.cost ?? 0} pts`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#6b5c4a]">
                      <span>Balance after</span>
                      <span className="font-medium text-[#2d3748]">
                        {isFreeEligible ? `${balance} pts` : `${balance - (selectedTier?.cost ?? 0)} pts`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 bg-[#fdf1f0] border border-[#f5c6c3] rounded-xl px-4 py-3 text-sm text-[#c0392b]">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#f0ebe3]">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => { setStep((s) => s - 1); setError(""); }}
                className="px-5 py-2.5 rounded-xl border border-[#e8e0d0] text-sm text-[#6b5c4a] hover:border-[#2d3748] transition-all"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2.5 rounded-xl bg-[#2d3748] text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || wordOver}
                className="px-6 py-2.5 rounded-xl bg-[#2d3748] text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {isEditMode ? "Saving..." : "Submitting..."}
                  </>
                ) : (
                  isEditMode ? "Save changes" : "Post chapter"
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}