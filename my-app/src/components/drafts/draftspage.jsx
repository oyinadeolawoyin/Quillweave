// src/pages/DraftsPage.jsx
// Draft management page — lists all writer drafts with actions:
// Edit, Delete, Post to Feedback Hub, Continue in Sprint.
// Post to Hub opens an inline submission form (same interface as SubmitFeedback).
// Continue in Sprint loops back to the StartGroupSprintModal pre-filled with the draft.

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { StartGroupSprintModal } from "../sprint/groupSprintModal";
import { AppMetaTags } from "../utilis/metatags";

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

function countWords(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Spinner({ size = 4 }) {
  return (
    <svg className={`animate-spin h-${size} w-${size}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function PointsBadge({ balance }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#fffbf0] border border-[#f0d98a] text-[#9a6f00]">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
      {balance} pt{balance !== 1 ? "s" : ""}
    </span>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange, placeholder, maxWords = null }) {
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const ref = useRef(null);

  function add(val) {
    const t = val.trim();
    if (!t) return;
    if (maxWords && t.split(/\s+/).filter(Boolean).length > maxWords) {
      setErr(`Keep it to ${maxWords} word${maxWords !== 1 ? "s" : ""} or fewer.`); return;
    }
    if (!tags.includes(t) && tags.length < 8) { onChange([...tags, t]); setErr(""); }
    setInput("");
  }

  return (
    <div>
      <div
        className="min-h-[48px] w-full border border-[#e8e0d0] focus-within:border-[#2d3748] rounded-xl bg-[#faf7f2] px-3 py-2 flex flex-wrap gap-2 cursor-text transition-all focus-within:ring-2 focus-within:ring-[#2d3748]/10"
        onClick={() => ref.current?.focus()}
      >
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1.5 bg-[#2d3748] text-white text-xs px-3 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} className="text-[#a8b4c4] hover:text-white">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        <input
          ref={ref}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); } }}
          onBlur={() => add(input)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-[#2d3748] placeholder-[#c4bdb4] outline-none py-1"
        />
      </div>
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
    </div>
  );
}

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ draft, onConfirm, onCancel, loading }) {
  if (!draft) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-[#2d3748]">Delete draft?</h3>
            <p className="text-sm text-[#9a8c7a] mt-0.5">
              "{draft.title || "Untitled"}" will be permanently removed.
              {draft.sourceSubmissionId && " The linked critique submission and all its feedback will also be permanently deleted."}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Spinner size={3.5} /> Deleting…</> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post to Hub modal ────────────────────────────────────────────────────────
// Same fields as SubmitFeedback — but presented as a focused modal drawer.

function PostToHubModal({ draft, wallet, onClose, onSuccess }) {
  const [genre, setGenre]               = useState("");
  const [summary, setSummary]           = useState("");
  const [wordCountTier, setWordCountTier] = useState("");
  const [draftStage, setDraftStage]     = useState("");
  const [feedbackWanted, setFeedbackWanted] = useState([]);
  const [contentWarnings, setContentWarnings] = useState([]);
  const [customWarning, setCustomWarning] = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState(null);
  const [step, setStep]                 = useState(1); // 1: meta, 2: review & cost

  const wc = draft?.wordCount || 0;
  const requiredTier = TIERS.find(t => {
    const max = parseInt(t.value.replace("TIER_", ""), 10);
    return wc <= max;
  });
  const selectedTierObj = TIERS.find(t => t.value === wordCountTier);
  const cost = selectedTierObj?.cost || 0;
  const canAfford = wallet !== null && wallet >= cost;

  useEffect(() => {
    if (requiredTier && !wordCountTier) setWordCountTier(requiredTier.value);
  }, [requiredTier, wordCountTier]);

  async function handleSubmit() {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/drafts/${draft.id}/post-to-hub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ genre, summary, wordCountTier, draftStage, feedbackWanted, contentWarnings }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Couldn't post. Please try again."); return; }
      onSuccess(data.submission);
    } catch {
      setError("Couldn't reach the server. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!draft) return null;

  const step1Valid = genre && summary.trim().length >= 30 && draftStage && wordCountTier;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="bg-[#2d3748] px-6 py-5 flex items-center justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div>
            <p className="text-[11px] text-[#d4af37] uppercase tracking-widest font-semibold mb-0.5">
              {step === 1 ? "Prepare submission" : "Review & confirm"}
            </p>
            <h2 className="text-lg font-serif text-white leading-tight">Post to Feedback Hub</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[1, 2].map(i => (
                <div key={i} className={`rounded-full transition-all ${i <= step ? "w-5 h-1.5 bg-[#d4af37]" : "w-1.5 h-1.5 bg-white/25"}`} />
              ))}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Step 1: Metadata */}
          {step === 1 && (
            <div className="p-6 space-y-5">
              {/* Draft pill */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#faf7f2] border border-[#e8e0d0]">
                <div className="w-1.5 h-8 rounded-full bg-[#d4af37] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-[#9a8c7a] font-semibold uppercase tracking-wider">Draft</p>
                  <p className="text-sm font-semibold text-[#2d3748] truncate">{draft.title || "Untitled"}</p>
                  <p className="text-xs text-[#9a8c7a]">{wc.toLocaleString()} words</p>
                </div>
              </div>

              {/* Genre */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#2d3748]">Genre</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button key={g} type="button" onClick={() => setGenre(g)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        genre === g ? "bg-[#2d3748] text-white border-[#2d3748]" : "bg-[#faf7f2] text-[#6b5c4a] border-[#e8e0d0] hover:border-[#b8a898]"
                      }`}>
                      {g}
                    </button>
                  ))}
                  {genre && !GENRES.includes(genre) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#2d3748] text-white border border-[#2d3748]">
                      {genre}
                      <button type="button" onClick={() => setGenre("")} className="text-white/60 hover:text-white">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  )}
                </div>
                <input
                  value={genre && !GENRES.includes(genre) ? genre : ""}
                  onChange={e => setGenre(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
                  placeholder="Or type your own genre and press Enter…"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-[#e8e0d0] focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 text-sm text-[#2d3748] placeholder-[#c4bdb4] bg-[#faf7f2] transition-all"
                />
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#2d3748]">Summary <span className="text-[#9a8c7a] font-normal">(30–300 chars)</span></label>
                <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} maxLength={300}
                  placeholder="What is this chapter about? Give readers enough context to engage."
                  className="w-full px-4 py-3 rounded-xl border border-[#e8e0d0] focus:ring-2 focus:ring-[#2d3748]/10 focus:border-[#2d3748] text-[#2d3748] placeholder-[#c4bdb4] text-sm resize-none bg-[#faf7f2] transition-all"
                />
                <p className="text-xs text-right text-[#c4bdb4]">{summary.length}/300</p>
              </div>

              {/* Draft stage */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#2d3748]">Draft stage</label>
                <div className="grid grid-cols-3 gap-2">
                  {STAGES.map(s => (
                    <button key={s.value} type="button" onClick={() => setDraftStage(s.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        draftStage === s.value ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#b8a898] bg-[#faf7f2]"
                      }`}>
                      <p className={`text-xs font-semibold ${draftStage === s.value ? "text-[#2d3748]" : "text-[#6b5c4a]"}`}>{s.label}</p>
                      <p className={`text-[10px] mt-0.5 ${draftStage === s.value ? "text-[#6b5c4a]" : "text-[#9a8c7a]"}`}>{s.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Word count tier */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#2d3748]">Word count tier</label>
                <div className="space-y-2">
                  {TIERS.map(t => {
                    const max = parseInt(t.value.replace("TIER_", ""), 10);
                    const tooSmall = wc > max;
                    return (
                      <button key={t.value} type="button" onClick={() => !tooSmall && setWordCountTier(t.value)}
                        disabled={tooSmall}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 transition-all text-left ${
                          tooSmall ? "opacity-40 cursor-not-allowed border-[#e8e0d0] bg-[#f5f5f5]" :
                          wordCountTier === t.value ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#b8a898] bg-[#faf7f2]"
                        }`}>
                        <span className={`text-sm font-medium ${wordCountTier === t.value ? "text-[#2d3748]" : "text-[#6b5c4a]"}`}>{t.label}</span>
                        <span className={`text-sm font-semibold ${wordCountTier === t.value ? "text-[#d4af37]" : "text-[#9a8c7a]"}`}>{t.cost} pts</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback wanted */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#2d3748]">What feedback do you want? <span className="text-[#9a8c7a] font-normal">(optional)</span></label>
                <TagInput
                  tags={feedbackWanted} onChange={setFeedbackWanted}
                  placeholder="e.g. pacing, dialogue, character voice — press Enter"
                  maxWords={4}
                />
              </div>

              {/* Content warnings */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#2d3748]">Content warnings <span className="text-[#9a8c7a] font-normal">(optional)</span></label>
                {/* Preset toggle pills */}
                <div className="flex flex-wrap gap-2">
                  {PRESET_WARNINGS.map(w => (
                    <button key={w} type="button"
                      onClick={() => contentWarnings.includes(w)
                        ? setContentWarnings(contentWarnings.filter(x => x !== w))
                        : setContentWarnings([...contentWarnings, w])}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        contentWarnings.includes(w)
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-[#faf7f2] text-[#6b5c4a] border-[#e8e0d0] hover:border-[#b8a898]"
                      }`}>
                      {w}
                    </button>
                  ))}
                </div>
                {/* Custom warning tags — shows anything added via the input that isn't a preset */}
                {contentWarnings.some(w => !PRESET_WARNINGS.includes(w)) && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {contentWarnings.filter(w => !PRESET_WARNINGS.includes(w)).map(w => (
                      <span key={w} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                        {w}
                        <button type="button" onClick={() => setContentWarnings(contentWarnings.filter(x => x !== w))} className="text-amber-600 hover:text-amber-900">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Custom warning input */}
                <input value={customWarning} onChange={e => setCustomWarning(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const t = customWarning.trim();
                      if (t && !contentWarnings.includes(t)) {
                        setContentWarnings([...contentWarnings, t]);
                      }
                      setCustomWarning("");
                    }
                  }}
                  placeholder="Add custom warning and press Enter…"
                  className="w-full mt-2 px-4 py-2.5 rounded-xl border border-[#e8e0d0] focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 text-sm text-[#2d3748] placeholder-[#c4bdb4] bg-[#faf7f2] transition-all"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-[#faf7f2]">
                  Cancel
                </button>
                <button onClick={() => setStep(2)} disabled={!step1Valid}
                  className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all disabled:opacity-40">
                  Review submission
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="p-6 space-y-5">
              {/* Cost summary */}
              <div className={`rounded-xl border-2 p-4 space-y-3 ${canAfford ? "border-[#e8dcc8] bg-[#fffbf0]" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#2d3748]">Posting cost</p>
                  <span className={`text-lg font-bold ${canAfford ? "text-[#d4af37]" : "text-red-600"}`}>{cost} pts</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#9a8c7a]">
                  <span>Your balance</span>
                  <span className={`font-semibold ${canAfford ? "text-[#2d3748]" : "text-red-600"}`}>{wallet} pts</span>
                </div>
                {canAfford ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9a8c7a]">After posting</span>
                    <span className="font-semibold text-[#2d3748]">{wallet - cost} pts</span>
                  </div>
                ) : (
                  <p className="text-xs text-red-600 font-medium">
                    You need {cost - wallet} more point{cost - wallet !== 1 ? "s" : ""}. Earn them by critiquing others or commenting on daily emotions.
                  </p>
                )}
              </div>

              {/* Summary recap */}
              <div className="space-y-3 p-4 rounded-xl bg-[#faf7f2] border border-[#e8e0d0]">
                <Row label="Genre" value={genre} />
                <Row label="Stage" value={STAGES.find(s => s.value === draftStage)?.label} />
                <Row label="Tier" value={selectedTierObj?.label} />
                {feedbackWanted.length > 0 && (
                  <div className="flex items-start gap-2 text-xs">
                    <span className="text-[#9a8c7a] font-medium w-24 flex-shrink-0 pt-0.5">Feedback</span>
                    <div className="flex flex-wrap gap-1">
                      {feedbackWanted.map(f => <span key={f} className="px-2 py-0.5 bg-[#2d3748] text-white rounded-full">{f}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setStep(1); setError(null); }} className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-[#faf7f2]">
                  Back
                </button>
                <button onClick={handleSubmit} disabled={submitting || !canAfford}
                  className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {submitting ? <><Spinner size={3.5} /> Posting…</> : `Post for ${cost} pts`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[#9a8c7a] font-medium w-24 flex-shrink-0">{label}</span>
      <span className="text-[#2d3748]">{value}</span>
    </div>
  );
}

// ─── Success toast ────────────────────────────────────────────────────────────

function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all ${
      type === "success" ? "bg-[#2d3748] text-white" : "bg-red-600 text-white"
    }`}>
      {type === "success"
        ? <svg className="w-4 h-4 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      }
      {message}
    </div>
  );
}

// ─── Draft card ───────────────────────────────────────────────────────────────

function DraftCard({ draft, walletInfo, onEdit, onDelete, onPostToHub, onDirectPost, postingNow, onContinueSprint, onRepublish }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onOut(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  const isLinked = !!draft.sourceSubmissionId;
  const genre = draft.sourceSubmission?.genre;
  const wc = draft.wordCount || 0;

  // ── Staged-for-feedback chapters: already have genre/summary/tier/stage
  // saved from the submission form, so posting needs no form at all — just
  // a direct call. We still estimate cost/readiness here (mirroring
  // pointService.calculatePostingCost) purely so the card can show an
  // honest "ready" vs "needs X more pts" hint; the server is always the
  // final word on whether the post actually succeeds.
  const isStaged      = !isLinked && !!draft.isStagedForFeedback;
  const stagedTier     = TIERS.find(t => t.value === draft.stagedWordCountTier);
  const tierCostsMap   = walletInfo?.TIER_COSTS || {};
  const stagedBaseCost = tierCostsMap[draft.stagedWordCountTier] ?? stagedTier?.cost ?? 0;
  const surcharge       = (walletInfo?.activeChapterCount ?? 0) * (walletInfo?.MULTI_CHAPTER_SURCHARGE ?? 2);
  const stagedCost      = stagedBaseCost + surcharge;
  const balance          = walletInfo?.postingBalance ?? 0;
  const isFree            = !!walletInfo?.freePostAvailable;
  const stagedReady       = isFree || balance >= stagedCost;
  const stagedShortfall   = Math.max(stagedCost - balance, 0);
  const isPostingThis      = postingNow === draft.id;

  return (
    <div className="group bg-white rounded-2xl border border-[#e8e0d0] hover:border-[#d4af37]/50 hover:shadow-md transition-all duration-200">
      {/* Top accent line — isolated overflow clip so the dropdown isn't cut */}
      <div className="overflow-hidden rounded-t-2xl">
        <div className={`h-0.5 w-full ${isLinked ? "bg-gradient-to-r from-[#d4af37] via-[#c9a227] to-[#e8d080]" : "bg-gradient-to-r from-[#d0c8b8] to-[#e8e0d0]"}`} />
      </div>

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isLinked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-[#fffbf0] border border-[#f0d98a] text-[#9a6f00] rounded-full">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  linked
                </span>
              )}
              {genre && (
                <span className="text-[10px] font-medium px-2 py-0.5 bg-[#f4f1ec] text-[#7a6a50] rounded-full border border-[#e8e0d0]">{genre}</span>
              )}
              {isStaged && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-[#eef3ea] border border-[#cfe3c8] text-[#3f6b3f] rounded-full">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  staged for feedback
                </span>
              )}
            </div>
            <h3 className="font-serif font-semibold text-[#2d3748] leading-snug text-base truncate" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              {draft.title || <span className="italic text-[#9a8c7a] font-normal">Untitled</span>}
            </h3>
          </div>

          {/* 3-dot menu */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#b8a898] hover:text-[#2d3748] hover:bg-[#f4f1ec] transition-all">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 bg-white border border-[#e8e0d0] rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                <button onClick={() => { setMenuOpen(false); onEdit(draft); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#2d3748] hover:bg-[#faf7f2] transition-colors">
                  <svg className="w-4 h-4 text-[#9a8c7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit
                </button>
                <button onClick={() => { setMenuOpen(false); onContinueSprint(draft); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#2d3748] hover:bg-[#faf7f2] transition-colors">
                  <svg className="w-4 h-4 text-[#9a8c7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Continue in sprint
                </button>
                {isLinked && (
                  <button onClick={() => { setMenuOpen(false); navigate(`/critique/${draft.sourceSubmissionId}`); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#2d3748] hover:bg-[#faf7f2] transition-colors">
                    <svg className="w-4 h-4 text-[#9a8c7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    View
                  </button>
                )}
                {!isLinked && (
                  isStaged ? (
                    <button onClick={() => { setMenuOpen(false); onDirectPost(draft); }} disabled={isPostingThis}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#2d3748] hover:bg-[#faf7f2] transition-colors disabled:opacity-50">
                      <svg className="w-4 h-4 text-[#9a8c7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      {isPostingThis ? "Posting…" : "Post now"}
                    </button>
                  ) : (
                    <button onClick={() => { setMenuOpen(false); onPostToHub(draft); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#2d3748] hover:bg-[#faf7f2] transition-colors">
                      <svg className="w-4 h-4 text-[#9a8c7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      Post to feedback
                    </button>
                  )
                )}
                <div className="border-t border-[#f0ebe3]" />
                <button onClick={() => { setMenuOpen(false); onDelete(draft); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-[#9a8c7a]">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
            {wc.toLocaleString()} words
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {timeAgo(draft.updatedAt)}
          </span>
          {draft.sourceSubmission && (
            <span className="flex items-center gap-1 text-[#d4af37]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {draft.sourceSubmission._count?.responses || 0} critique{(draft.sourceSubmission._count?.responses || 0) !== 1 ? "s" : ""}
            </span>
          )}
          {isStaged && (
            <span className={`flex items-center gap-1 font-medium ${stagedReady ? "text-[#5e8c5e]" : "text-[#b8860b]"}`}>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              {stagedReady ? `Ready · ${stagedCost} pts` : `Needs ${stagedShortfall} more pt${stagedShortfall === 1 ? "" : "s"}`}
            </span>
          )}
        </div>

        {/* Primary actions */}
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => onEdit(draft)}
            className="flex-1 py-2 text-sm font-medium text-[#2d3748] bg-[#faf7f2] border border-[#e8e0d0] rounded-xl hover:bg-[#f4f1ec] hover:border-[#c4b898] transition-all flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </button>
          <button onClick={() => onContinueSprint(draft)}
            className="flex-1 py-2 text-sm font-medium text-[#2d3748] bg-[#faf7f2] border border-[#e8e0d0] rounded-xl hover:bg-[#f4f1ec] hover:border-[#c4b898] transition-all flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Sprint
          </button>
          {!isLinked && (
            isStaged ? (
              <button onClick={() => onDirectPost(draft)} disabled={isPostingThis}
                className="flex-1 py-2 text-sm font-medium text-white bg-[#2d3748] border border-[#2d3748] rounded-xl hover:bg-[#3d4f64] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
                {isPostingThis ? <><Spinner size={3.5} /> Posting…</> : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    Post now
                  </>
                )}
              </button>
            ) : (
              <button onClick={() => onPostToHub(draft)}
                className="flex-1 py-2 text-sm font-medium text-white bg-[#2d3748] border border-[#2d3748] rounded-xl hover:bg-[#3d4f64] transition-all flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Post
              </button>
            )
          )}
          {isLinked && (
            <button onClick={() => onRepublish(draft)}
              className="flex-1 py-2 text-sm font-medium text-white bg-[#2d3748] border border-[#2d3748] rounded-xl hover:bg-[#3d4f64] transition-all flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Repost
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DraftsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [drafts, setDrafts]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [wallet, setWallet]               = useState(null);
  // Full wallet payload (TIER_COSTS, activeChapterCount, surcharge, etc.) —
  // kept alongside the plain `wallet` balance number so staged-draft cost
  // estimates on the cards match the backend's real math exactly.
  const [walletInfo, setWalletInfo]       = useState(null);
  const [toast, setToast]                 = useState(null);

  // Modals
  const [deletingDraft, setDeletingDraft]   = useState(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [postingDraft, setPostingDraft]     = useState(null);
  const [sprintDraft, setSprintDraft]       = useState(null); // triggers StartGroupSprintModal
  // id of the staged draft currently being posted directly (no modal) — drives the spinner on its card
  const [directPosting, setDirectPosting]   = useState(null);

  // Fetch drafts
  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/drafts?limit=50`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.items || []);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  // Fetch wallet balance
  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/feedback/points/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWallet(data.postingBalance ?? null);
        setWalletInfo(data);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchDrafts(); fetchWallet(); }, [fetchDrafts, fetchWallet]);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  async function handleDelete() {
    if (!deletingDraft) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/drafts/${deletingDraft.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (res.ok) {
        setDrafts(d => d.filter(x => x.id !== deletingDraft.id));
        showToast("Draft deleted.");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || "Couldn't delete draft.", "error");
      }
    } catch {
      showToast("Couldn't reach the server.", "error");
    } finally {
      setDeleteLoading(false);
      setDeletingDraft(null);
    }
  }

  function handlePostSuccess(submission) {
    setPostingDraft(null);
    setDrafts(d => d.filter(x => x.id !== postingDraft?.id));
    showToast(`"${submission.title}" is now live in the Feedback Hub!`);
    fetchWallet();
  }

  // ── Direct post for staged-for-feedback drafts ────────────────────────────
  // These already carry their genre/summary/tier/draft stage from when they
  // were staged on the submission form, so there's no need to reopen
  // PostToHubModal and ask the writer to fill it all in again — just post.
  async function handleDirectPost(draft) {
    setDirectPosting(draft.id);
    try {
      const res = await fetch(`${API_URL}/drafts/${draft.id}/post-to-hub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}), // server falls back to this draft's staged genre/summary/tier/etc.
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Couldn't post. Please try again.", "error");
        return;
      }
      setDrafts(d => d.filter(x => x.id !== draft.id));
      showToast(`"${data.submission?.title || draft.title || "Your chapter"}" is now live in the Feedback Hub!`);
      fetchWallet();
    } catch {
      showToast("Couldn't reach the server.", "error");
    } finally {
      setDirectPosting(null);
    }
  }

  async function handleRepublish(draft) {
    try {
      const res = await fetch(`${API_URL}/drafts/${draft.id}/republish`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDrafts(d => d.filter(x => x.id !== draft.id));
        showToast(`"${draft.title || "Your chapter"}" is back in the Critique Hub!`);
      } else {
        showToast(data.message || "Couldn't repost. Please try again.", "error");
      }
    } catch {
      showToast("Couldn't reach the server.", "error");
    }
  }

  function handleSprintCreated(groupSprint, isQuillweave) {
    const draftId = sprintDraft?.id || null;
    setSprintDraft(null);
    navigate(`/group-sprint/${groupSprint.id}`, {
      state: { writingMode: isQuillweave ? "quillweave" : "external", draftId }
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#f5f0e8" }}>
      <AppMetaTags title="My Drafts" description="Your drafts on Quillweave — pick up where you left off." />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl text-[#2d3748] mb-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              Your drafts
            </h1>
            <p className="text-sm text-[#9a8c7a]">
              {drafts.length} draft{drafts.length !== 1 ? "s" : ""} · Every word gets you closer.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {wallet !== null && <PointsBadge balance={wallet} />}
            <button
              onClick={() => setSprintDraft({})}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#e8dcc8] text-[#6b5c4a] rounded-xl text-sm font-semibold hover:border-[#2d3748] hover:text-[#2d3748] transition-all bg-white hidden sm:flex">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start sprint
            </button>
            <button
              onClick={() => navigate("/write")}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New draft
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-[#9a8c7a]">
            <Spinner size={5} /> <span className="text-sm">Loading your drafts…</span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">📄</p>
            <p className="font-serif text-xl text-[#2d3748] mb-2" style={{ fontFamily: "'Georgia', serif" }}>No drafts yet</p>
            <p className="text-sm text-[#9a8c7a] mb-6">Start writing in a sprint or create a blank draft.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => navigate("/")} className="px-5 py-2.5 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-white">
                Start a sprint
              </button>
              <button onClick={() => navigate("/write")} className="px-5 py-2.5 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all">
                New draft
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Linked drafts section */}
            {drafts.some(d => d.sourceSubmissionId) && (
              <section className="mb-8">
                <h2 className="text-xs font-semibold text-[#9a8c7a] uppercase tracking-widest mb-3">From the critique hub</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {drafts.filter(d => d.sourceSubmissionId).map(d => (
                    <DraftCard
                      key={d.id} draft={d}
                      walletInfo={walletInfo}
                      onEdit={draft => navigate(`/write/${draft.id}`)}
                      onDelete={setDeletingDraft}
                      onPostToHub={setPostingDraft}
                      onDirectPost={handleDirectPost}
                      postingNow={directPosting}
                      onContinueSprint={setSprintDraft}
                      onRepublish={handleRepublish}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Plain drafts section */}
            {drafts.some(d => !d.sourceSubmissionId) && (
              <section>
                {drafts.some(d => d.sourceSubmissionId) && (
                  <h2 className="text-xs font-semibold text-[#9a8c7a] uppercase tracking-widest mb-3">Writing drafts</h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {drafts.filter(d => !d.sourceSubmissionId).map(d => (
                    <DraftCard
                      key={d.id} draft={d}
                      walletInfo={walletInfo}
                      onEdit={draft => navigate(`/write/${draft.id}`)}
                      onDelete={setDeletingDraft}
                      onPostToHub={setPostingDraft}
                      onDirectPost={handleDirectPost}
                      postingNow={directPosting}
                      onContinueSprint={setSprintDraft}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ── Modals ── */}
      <ConfirmDeleteModal
        draft={deletingDraft}
        onConfirm={handleDelete}
        onCancel={() => setDeletingDraft(null)}
        loading={deleteLoading}
      />

      {postingDraft && (
        <PostToHubModal
          draft={postingDraft}
          wallet={wallet}
          onClose={() => setPostingDraft(null)}
          onSuccess={handlePostSuccess}
        />
      )}

      {/* Continue in sprint → opens the full StartGroupSprintModal
          The modal passes writingMode="quillweave" and the draftId to the workspace via route state */}
      <StartGroupSprintModal
        isOpen={!!sprintDraft}
        onClose={() => setSprintDraft(null)}
        onCreated={handleSprintCreated}
        prefillDraftId={sprintDraft?.id || null}
        prefillDraftTitle={sprintDraft?.title || null}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}