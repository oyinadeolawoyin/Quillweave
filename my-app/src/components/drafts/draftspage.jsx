// src/pages/DraftsPage.jsx
// Draft management page — lists all writer drafts with actions:
// Edit, Delete, Post to Feedback Hub.
// Post to Hub opens an inline submission form (same interface as SubmitFeedback).
// Start Sprint navigates straight to the Sprint Room (/sprint-room).
//
// Layout: a fixed-width drafts list on the left (search, star filter, rows
// with hover actions) and a progress column on the right (sprint calendar
// heatmap + stats, recent sprints, writing tips). On small screens the two
// columns collapse into a bottom tab bar — Drafts / Progress / Tips.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
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

// Category pill colors for the writing-tips cards — keyed by blog category.
const TIP_CATEGORY_STYLES = {
  Craft:   { bg: "#fdf9ed", border: "#f0d98a", text: "#b8860b" },
  Habit:   { bg: "#eaf2fb", border: "#bcd6f0", text: "#2f6690" },
  Mindset: { bg: "#f3ecf9", border: "#d9c2ec", text: "#7a4fa0" },
};
const DEFAULT_TIP_STYLE = { bg: "#f4f1ea", border: "#e3dccb", text: "#9a8c7a" };

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
  if (days < 2) return "Yesterday";
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
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#fdf9ed] border border-[#f0d98a] text-[#b8860b]">
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
        className="min-h-[48px] w-full border border-[#e8e0d0] focus-within:border-[#d4af37] rounded-xl bg-[#faf7f2] px-3 py-2 flex flex-wrap gap-2 cursor-text transition-all focus-within:ring-2 focus-within:ring-[#d4af37]/15"
        onClick={() => ref.current?.focus()}
      >
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1.5 bg-[#d4af37] text-[#1a1a2e] text-xs font-semibold px-3 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} className="text-[#1a1a2e]/60 hover:text-[#1a1a2e]">
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
          className="flex-1 min-w-[120px] bg-transparent text-sm text-[#1a1a2e] placeholder-[#c2b8a8] outline-none py-1"
        />
      </div>
      {err && <p className="text-xs text-[#c0392b] mt-1">{err}</p>}
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#ffffff] border border-[#e8e0d0] w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="bg-[#fdfaf5] px-6 py-5 flex items-center justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl border-b border-[#e8e0d0]">
          <div>
            <p className="text-[11px] text-[#d4af37] uppercase tracking-widest font-semibold mb-0.5">
              {step === 1 ? "Prepare submission" : "Review & confirm"}
            </p>
            <h2 className="text-lg font-serif text-[#1a1a2e] leading-tight" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>Post to Feedback Hub</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[1, 2].map(i => (
                <div key={i} className={`rounded-full transition-all ${i <= step ? "w-5 h-1.5 bg-[#d4af37]" : "w-1.5 h-1.5 bg-black/10"}`} />
              ))}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#9a8c7a] hover:text-[#1a1a2e] transition-all">
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
                  <p className="text-sm font-semibold text-[#1a1a2e] truncate">{draft.title || "Untitled"}</p>
                  <p className="text-xs text-[#9a8c7a]">{wc.toLocaleString()} words</p>
                </div>
              </div>

              {/* Genre */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#1a1a2e]">Genre</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button key={g} type="button" onClick={() => setGenre(g)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        genre === g ? "bg-[#d4af37] text-[#1a1a2e] border-[#d4af37]" : "bg-[#faf7f2] text-[#9a8c7a] border-[#e8e0d0] hover:border-[#d4af37]"
                      }`}>
                      {g}
                    </button>
                  ))}
                  {genre && !GENRES.includes(genre) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#d4af37] text-[#1a1a2e] border border-[#d4af37]">
                      {genre}
                      <button type="button" onClick={() => setGenre("")} className="text-[#1a1a2e]/60 hover:text-[#1a1a2e]">
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
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-[#e8e0d0] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15 text-sm text-[#1a1a2e] placeholder-[#c2b8a8] bg-[#faf7f2] transition-all"
                />
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#1a1a2e]">Summary <span className="text-[#9a8c7a] font-normal">(30–300 chars)</span></label>
                <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} maxLength={300}
                  placeholder="What is this chapter about? Give readers enough context to engage."
                  className="w-full px-4 py-3 rounded-xl border border-[#e8e0d0] focus:ring-2 focus:ring-[#d4af37]/15 focus:border-[#d4af37] text-[#1a1a2e] placeholder-[#c2b8a8] text-sm resize-none bg-[#faf7f2] transition-all"
                />
                <p className="text-xs text-right text-[#c2b8a8]">{summary.length}/300</p>
              </div>

              {/* Draft stage */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#1a1a2e]">Draft stage</label>
                <div className="grid grid-cols-3 gap-2">
                  {STAGES.map(s => (
                    <button key={s.value} type="button" onClick={() => setDraftStage(s.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        draftStage === s.value ? "border-[#d4af37] bg-[#fdf9ed]" : "border-[#e8e0d0] hover:border-[#d4af37] bg-[#faf7f2]"
                      }`}>
                      <p className={`text-xs font-semibold ${draftStage === s.value ? "text-[#1a1a2e]" : "text-[#9a8c7a]"}`}>{s.label}</p>
                      <p className={`text-[10px] mt-0.5 ${draftStage === s.value ? "text-[#b8860b]" : "text-[#c2b8a8]"}`}>{s.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Word count tier */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#1a1a2e]">Word count tier</label>
                <div className="space-y-2">
                  {TIERS.map(t => {
                    const max = parseInt(t.value.replace("TIER_", ""), 10);
                    const disabled = wc > max;
                    return (
                      <button key={t.value} type="button" disabled={disabled} onClick={() => setWordCountTier(t.value)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left disabled:opacity-35 disabled:cursor-not-allowed ${
                          wordCountTier === t.value ? "border-[#d4af37] bg-[#fdf9ed]" : "border-[#e8e0d0] hover:border-[#d4af37] bg-[#faf7f2]"
                        }`}>
                        <span className="text-xs font-medium text-[#1a1a2e]">{t.label}</span>
                        <span className="text-xs font-semibold text-[#d4af37]">{t.cost} pts</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback wanted */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#1a1a2e]">What feedback are you after? <span className="text-[#9a8c7a] font-normal">(optional)</span></label>
                <TagInput tags={feedbackWanted} onChange={setFeedbackWanted} placeholder="e.g. pacing, dialogue, worldbuilding…" maxWords={4} />
              </div>

              {/* Content warnings */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#1a1a2e]">Content warnings <span className="text-[#9a8c7a] font-normal">(optional)</span></label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_WARNINGS.map(w => {
                    const active = contentWarnings.includes(w);
                    return (
                      <button key={w} type="button"
                        onClick={() => setContentWarnings(active ? contentWarnings.filter(x => x !== w) : [...contentWarnings, w])}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active ? "bg-[#fdf1e7] text-[#e07b39] border-[#f3cda3]" : "bg-[#faf7f2] text-[#9a8c7a] border-[#e8e0d0] hover:border-[#d4af37]"
                        }`}>
                        {w}
                      </button>
                    );
                  })}
                </div>
                {contentWarnings.some(w => !PRESET_WARNINGS.includes(w)) && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {contentWarnings.filter(w => !PRESET_WARNINGS.includes(w)).map(w => (
                      <span key={w} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#fdf1e7] text-[#e07b39] border border-[#f3cda3]">
                        {w}
                        <button type="button" onClick={() => setContentWarnings(contentWarnings.filter(x => x !== w))} className="text-[#e07b39]/70 hover:text-[#e07b39]">
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
                  className="w-full mt-2 px-4 py-2.5 rounded-xl border border-[#e8e0d0] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15 text-sm text-[#1a1a2e] placeholder-[#c2b8a8] bg-[#faf7f2] transition-all"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-[#fdecea] border border-[#f3b8b0] rounded-xl text-sm text-[#c0392b]">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="px-5 py-3 border border-[#e8e0d0] text-[#9a8c7a] rounded-xl text-sm font-medium hover:border-[#d4af37] transition-all bg-[#faf7f2]">
                  Cancel
                </button>
                <button onClick={() => setStep(2)} disabled={!step1Valid}
                  className="flex-1 py-3 bg-[#d4af37] text-[#1a1a2e] rounded-xl text-sm font-semibold hover:bg-[#c9a02e] transition-all disabled:opacity-40">
                  Review submission
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="p-6 space-y-5">
              {/* Cost summary */}
              <div className={`rounded-xl border-2 p-4 space-y-3 ${canAfford ? "border-[#f0d98a] bg-[#fdf9ed]" : "border-[#f3b8b0] bg-[#fdecea]"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1a1a2e]">Posting cost</p>
                  <span className={`text-lg font-bold ${canAfford ? "text-[#d4af37]" : "text-[#c0392b]"}`}>{cost} pts</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#9a8c7a]">
                  <span>Your balance</span>
                  <span className={`font-semibold ${canAfford ? "text-[#1a1a2e]" : "text-[#c0392b]"}`}>{wallet} pts</span>
                </div>
                {canAfford ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9a8c7a]">After posting</span>
                    <span className="font-semibold text-[#1a1a2e]">{wallet - cost} pts</span>
                  </div>
                ) : (
                  <p className="text-xs text-[#c0392b] font-medium">
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
                      {feedbackWanted.map(f => <span key={f} className="px-2 py-0.5 bg-[#d4af37] text-[#1a1a2e] rounded-full font-semibold">{f}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-[#fdecea] border border-[#f3b8b0] rounded-xl text-sm text-[#c0392b]">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setStep(1); setError(null); }} className="px-5 py-3 border border-[#e8e0d0] text-[#9a8c7a] rounded-xl text-sm font-medium hover:border-[#d4af37] transition-all bg-[#faf7f2]">
                  Back
                </button>
                <button onClick={handleSubmit} disabled={submitting || !canAfford}
                  className="flex-1 py-3 bg-[#d4af37] text-[#1a1a2e] rounded-xl text-sm font-semibold hover:bg-[#c9a02e] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
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
      <span className="text-[#1a1a2e]">{value}</span>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium transition-all border ${
      type === "success" ? "bg-[#ffffff] border-[#e8e0d0] text-[#1a1a2e]" : "bg-[#fdecea] border-[#f3b8b0] text-[#c0392b]"
    }`}>
      {type === "success"
        ? <svg className="w-4 h-4 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      }
      {message}
    </div>
  );
}

// ─── Small icon action button ────────────────────────────────────────────────

function IconAction({ onClick, title, disabled, variant = "default", loading, children }) {
  const base = "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    default: "text-[#9a8c7a] hover:text-[#1a1a2e] hover:bg-black/5",
    primary: "text-[#1a1a2e] bg-[#d4af37] hover:bg-[#c9a02e]",
    danger:  "text-[#9a8c7a] hover:text-[#c0392b] hover:bg-red-500/10",
    dangerArmed: "text-white bg-red-600 hover:bg-red-500",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`${base} ${variants[variant]}`}>
      {loading ? <Spinner size={3.5} /> : children}
    </button>
  );
}

// ─── Star toggle ──────────────────────────────────────────────────────────────

function StarButton({ starred, onClick, loading }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      title={starred ? "Unstar draft" : "Star draft"}
      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 ${
        starred ? "text-[#d4af37] hover:text-[#c9a02e]" : "text-[#d9cab0] hover:text-[#d4af37] hover:bg-black/5"
      }`}>
      {loading ? <Spinner size={3} /> : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill={starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth={starred ? 0 : 1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3.5z" />
        </svg>
      )}
    </button>
  );
}

// ─── Delete icon with double-tap confirm ─────────────────────────────────────
// First click arms it (turns red + tooltip changes); a second click within
// 3 seconds actually deletes. Clicking away, or letting the timer lapse,
// disarms it again — so nothing gets wiped by an accidental single click.

function DeleteAction({ onConfirm, loading }) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleClick(e) {
    e.stopPropagation();
    if (loading) return;
    if (!armed) {
      setArmed(true);
      timerRef.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    clearTimeout(timerRef.current);
    setArmed(false);
    onConfirm();
  }

  return (
    <IconAction
      onClick={handleClick}
      title={armed ? "Click again to delete" : "Delete"}
      variant={armed ? "dangerArmed" : "danger"}
      loading={loading}>
      {armed ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      )}
    </IconAction>
  );
}

// ─── Draft row (list layout) ─────────────────────────────────────────────────

function DraftRow({ draft, walletInfo, onEdit, onDelete, onPostToHub, onDirectPost, postingNow, onRepublish, onToggleStar, starLoading, deleteLoading }) {
  const navigate = useNavigate();
  const isLinked = !!draft.sourceSubmissionId;
  const genre = draft.sourceSubmission?.genre;
  const wc = draft.wordCount || 0;

  const isStaged        = !isLinked && !!draft.isStagedForFeedback;
  const stagedTier       = TIERS.find(t => t.value === draft.stagedWordCountTier);
  const tierCostsMap     = walletInfo?.TIER_COSTS || {};
  const stagedBaseCost   = tierCostsMap[draft.stagedWordCountTier] ?? stagedTier?.cost ?? 0;
  const surcharge        = (walletInfo?.activeChapterCount ?? 0) * (walletInfo?.MULTI_CHAPTER_SURCHARGE ?? 2);
  const stagedCost       = stagedBaseCost + surcharge;
  const balance          = walletInfo?.postingBalance ?? 0;
  const isFree           = !!walletInfo?.freePostAvailable;
  const stagedReady      = isFree || balance >= stagedCost;
  const stagedShortfall  = Math.max(stagedCost - balance, 0);
  const isPostingThis    = postingNow === draft.id;

  return (
    <div className="group relative flex items-center gap-2 px-3 py-3 border-b border-[#f0ebe3] last:border-b-0 hover:bg-black/[0.02] transition-colors">
      <StarButton starred={!!draft.isStarred} onClick={() => onToggleStar(draft)} loading={starLoading} />

      {/* Title + meta — clicking the title opens the editor, same as the Edit icon */}
      <button onClick={() => onEdit(draft)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          {isLinked && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-[#fdf9ed] border border-[#f0d98a] text-[#b8860b] rounded-full">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              linked
            </span>
          )}
          {genre && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-black/5 text-[#9a8c7a] rounded-full border border-[#e8e0d0]">{genre}</span>}
          {isStaged && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
              stagedReady ? "bg-[#eef8f0] border-[#bfe5c8] text-[#2f9e44]" : "bg-[#fdf9ed] border-[#f0d98a] text-[#b8860b]"
            }`}>
              {stagedReady ? `Ready · ${stagedCost}pt` : `Needs ${stagedShortfall}pt`}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-[#1a1a2e] leading-snug text-[14px] truncate" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
          {draft.title || <span className="italic text-[#c2b8a8] font-normal">Untitled</span>}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-[#c2b8a8] mt-0.5">
          <span>{wc.toLocaleString()} words</span>
          <span>· {timeAgo(draft.updatedAt)}</span>
          {draft.sourceSubmission && (
            <span className="text-[#d4af37]">· {draft.sourceSubmission._count?.responses || 0} critique{(draft.sourceSubmission._count?.responses || 0) !== 1 ? "s" : ""}</span>
          )}
        </div>
      </button>

      {/* Icon actions — visible always on touch, revealed on hover for pointer devices */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity bg-gradient-to-l from-white via-white sm:from-transparent sm:via-transparent to-transparent pl-2">
        <IconAction onClick={() => onEdit(draft)} title="Edit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </IconAction>

        {isLinked ? (
          <IconAction onClick={() => onRepublish(draft)} title="Repost to feedback hub" variant="primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </IconAction>
        ) : (
          <IconAction
            onClick={() => isStaged ? onDirectPost(draft) : onPostToHub(draft)}
            title={isStaged ? "Post now" : "Post to feedback hub"}
            variant="primary"
            loading={isPostingThis}
            disabled={isPostingThis}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          </IconAction>
        )}

        {isLinked && (
          <IconAction onClick={() => navigate(`/critique/${draft.sourceSubmissionId}`)} title="View submission">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </IconAction>
        )}

        <DeleteAction onConfirm={() => onDelete(draft)} loading={deleteLoading} />
      </div>
    </div>
  );
}

// ─── Sprint calendar: heatmap + stats ──────────────────────────────────────────
// A GitHub-style calendar heatmap of writing days, with three headline
// stats above it — gives writers a quick, encouraging sense of momentum
// without digging through the sprint room history.

const HEATMAP_WEEKS = 19; // ~4.5 months — matches "Mar → Jul" span at a glance

function heatmapLevel(words) {
  if (!words) return 0;
  if (words < 200) return 1;
  if (words < 600) return 2;
  if (words < 1200) return 3;
  return 4;
}

const HEATMAP_COLORS = ["#f0ebe3", "#dcefdc", "#b8dfba", "#6fc576", "#2f9e44"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["", "M", "", "W", "", "F", ""];

// "YYYY-MM-DD" in the *browser's local* calendar day — NOT toISOString(),
// which converts to UTC and can shift the date by a day depending on the
// writer's timezone (e.g. a sprint logged at 11pm WAT would land on the
// wrong UTC day). The backend heatmap keys are built the same way using
// each writer's own User.timezone, so the two line up.
function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildHeatmapWeeks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (HEATMAP_WEEKS * 7 - 1) - today.getDay());

  const days = [];
  for (let i = 0; i < HEATMAP_WEEKS * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

// Consecutive days (ending today or yesterday) with any words logged.
function computeStreak(data) {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // If nothing logged today yet, the streak can still count through yesterday.
  const todayKey = localDateKey(cursor);
  if (!data[todayKey]) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = localDateKey(cursor);
    if (!data[key]) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeWordsThisMonth(data) {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return Object.entries(data).reduce((sum, [key, words]) => (key.startsWith(prefix) ? sum + (words || 0) : sum), 0);
}

function SprintCalendar({ heatmap, sprintsTotal }) {
  const weeks = useMemo(buildHeatmapWeeks, []);
  const streak = useMemo(() => computeStreak(heatmap), [heatmap]);
  const wordsThisMonth = useMemo(() => computeWordsThisMonth(heatmap), [heatmap]);

  // Show a month label above the first week whose first day falls in a new month.
  let lastMonth = null;
  const monthLabels = weeks.map(week => {
    const m = week[0].getMonth();
    if (m !== lastMonth) { lastMonth = m; return MONTH_NAMES[m]; }
    return null;
  });

  return (
    <div>
      <h2 className="text-2xl text-[#1a1a2e] mb-0.5" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>Sprint calendar</h2>
      <p className="text-sm text-[#c2b8a8] mb-6">Days you showed up</p>

      <div className="flex items-end gap-8 sm:gap-12 mb-8 flex-wrap">
        <div>
          <p className="text-3xl font-semibold text-[#1a1a2e]">{sprintsTotal}</p>
          <p className="text-xs text-[#c2b8a8] mt-0.5">sprints total</p>
        </div>
        <div>
          <p className="text-3xl font-semibold text-[#d4af37]">{streak}</p>
          <p className="text-xs text-[#c2b8a8] mt-0.5">day streak</p>
        </div>
        <div>
          <p className="text-3xl font-semibold text-[#1a1a2e]">{wordsThisMonth.toLocaleString()}</p>
          <p className="text-xs text-[#c2b8a8] mt-0.5">words this month</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="inline-flex flex-col min-w-full">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1.5 pl-6">
            {monthLabels.map((label, i) => (
              <div key={i} className="w-3 flex-shrink-0 text-[11px] text-[#c2b8a8]">{label || ""}</div>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {/* Weekday labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={i} className="w-4 h-3 text-[10px] text-[#c2b8a8] flex items-center">{label}</div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px] flex-shrink-0">
                {week.map(d => {
                  const key = localDateKey(d);
                  const words = heatmap[key] || 0;
                  return (
                    <div
                      key={key}
                      title={`${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${words.toLocaleString()} words`}
                      className="w-3 h-3 rounded-[2px]"
                      style={{ background: HEATMAP_COLORS[heatmapLevel(words)] }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[11px] text-[#c2b8a8]">No sprint</span>
        <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: HEATMAP_COLORS[0] }} />
        <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: HEATMAP_COLORS[2] }} />
        <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: HEATMAP_COLORS[4] }} />
        <span className="text-[11px] text-[#c2b8a8]">More</span>
      </div>
    </div>
  );
}

// ─── Recent sprints ────────────────────────────────────────────────────────────

function formatSprintDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDuration(minutes) {
  if (!minutes) return "";
  return `${minutes}m`;
}

function SprintHistoryList({ sprints }) {
  if (!sprints.length) {
    return <p className="text-sm text-[#c2b8a8] py-3">No sprints in the last 7 days — start one to build your streak.</p>;
  }
  return (
    <ul>
      {sprints.slice(0, 8).map((s, i) => (
        <li key={s.id} className="flex items-center gap-3 py-3.5 border-b border-[#f0ebe3] last:border-b-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? "bg-[#d4af37]" : "bg-[#2f9e44]"}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-[#1a1a2e] truncate" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              {s.checkin?.trim() || "Sprint session"}
            </p>
            <p className="text-xs text-[#c2b8a8] mt-0.5">{formatSprintDate(s.completedAt)}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm font-semibold text-[#2f9e44]">+{(s.wordsWritten || 0).toLocaleString()} words</span>
            {s.groupSprint?.duration && (
              <span className="inline-flex items-center gap-1 text-xs text-[#9a8c7a] bg-black/5 border border-[#e8e0d0] rounded-full px-2.5 py-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {formatDuration(s.groupSprint.duration)}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProgressPanel({ heatmap, sprintHistory, sprintsTotal, loading }) {
  return (
    <section className="bg-[#ffffff] rounded-2xl border border-[#e8e0d0] p-6 sm:p-8">
      {loading ? (
        <div className="flex items-center gap-2 text-[#c2b8a8] text-sm py-6"><Spinner size={4} /> Loading…</div>
      ) : (
        <SprintCalendar heatmap={heatmap} sprintsTotal={sprintsTotal} />
      )}

      <div className="mt-9 pt-7 border-t border-[#f0ebe3]">
        <h2 className="text-lg text-[#1a1a2e] mb-0.5" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>Recent sprints</h2>
        <p className="text-sm text-[#c2b8a8] mb-1">Last 7 days</p>
        {loading ? (
          <div className="flex items-center gap-2 text-[#c2b8a8] text-sm py-4"><Spinner size={4} /> Loading…</div>
        ) : (
          <SprintHistoryList sprints={sprintHistory} />
        )}
      </div>
    </section>
  );
}

// ─── Writing tips: latest blog posts ───────────────────────────────────────────

function readingTime(content = "") {
  const words = countWords(content);
  return Math.max(1, Math.round(words / 200));
}

function TipCard({ post }) {
  const style = TIP_CATEGORY_STYLES[post.category] || DEFAULT_TIP_STYLE;
  return (
    <Link to={`/blog/${post.id}`}
      className="group block bg-[#ffffff] rounded-2xl border border-[#e8e0d0] p-5 hover:border-[#d4af37] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        {post.category ? (
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border"
            style={{ background: style.bg, borderColor: style.border, color: style.text }}>
            {post.category}
          </span>
        ) : <span />}
        <span className="text-xs text-[#c2b8a8] whitespace-nowrap">{readingTime(post.content)} min · {formatDate(post.createdAt)}</span>
      </div>
      <h3 className="text-[17px] text-[#1a1a2e] leading-snug mb-1.5" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        {post.title || "Untitled"}
      </h3>
      {post.content && (
        <p className="text-sm text-[#9a8c7a] leading-relaxed line-clamp-2">
          {post.content.replace(/<[^>]*>/g, "").slice(0, 140)}
        </p>
      )}
    </Link>
  );
}

function WritingTipsSection({ posts, loading }) {
  return (
    <section>
      <h2 className="text-lg text-[#1a1a2e] mb-0.5" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>Writing tips</h2>
      <p className="text-sm text-[#c2b8a8] mb-4">From the Quillweave blog</p>
      {loading ? (
        <div className="flex items-center gap-2 text-[#c2b8a8] text-sm py-4"><Spinner size={4} /> Loading…</div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-[#c2b8a8] py-4">No tips yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {posts.map(post => <TipCard key={post.id} post={post} />)}
        </div>
      )}
    </section>
  );
}

// ─── Drafts list panel (left column) ───────────────────────────────────────────
// Owns the page's own action row (points balance, start sprint, new draft) —
// the app already has a site-wide top bar, so there's no separate header here.

function DraftsListPanel({
  drafts, allDraftsCount, search, onSearch, starredOnly, onToggleStarredOnly,
  starLoadingId, deletingId, wallet, onStartSprint, onNewDraft, ...rowProps
}) {
  const starredDrafts = drafts.filter(d => d.isStarred);
  const otherDrafts = starredOnly ? [] : drafts.filter(d => !d.isStarred);

  const rowFor = d => (
    <DraftRow
      key={d.id}
      draft={d}
      starLoading={starLoadingId === d.id}
      deleteLoading={deletingId === d.id}
      {...rowProps}
    />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Actions: points balance + start sprint + new draft */}
      <div className="px-4 pt-4 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9a8c7a]">My Drafts</p>
          {wallet !== null && <PointsBadge balance={wallet} />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onStartSprint}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-[#e8e0d0] text-[#9a8c7a] rounded-xl text-sm font-semibold hover:border-[#d4af37] hover:text-[#1a1a2e] transition-all bg-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sprint
          </button>
          <button
            onClick={onNewDraft}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-[#d4af37] text-[#1a1a2e] rounded-xl text-sm font-semibold hover:bg-[#c9a02e] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New draft
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 flex-shrink-0">
        <div className="relative">
          <svg className="w-4 h-4 text-[#c2b8a8] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search drafts…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#ffffff] border border-[#e8e0d0] text-sm text-[#1a1a2e] placeholder-[#c2b8a8] focus:outline-none focus:border-[#d4af37] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onToggleStarredOnly(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              !starredOnly ? "bg-white border-[#e8e0d0] text-[#1a1a2e] shadow-sm" : "border-transparent text-[#c2b8a8] hover:text-[#9a8c7a]"
            }`}>
            All
          </button>
          <button
            onClick={() => onToggleStarredOnly(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              starredOnly ? "bg-[#fdf9ed] border-[#f0d98a] text-[#b8860b]" : "border-transparent text-[#c2b8a8] hover:text-[#9a8c7a]"
            }`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={starredOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth={starredOnly ? 0 : 1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3.5z" />
            </svg>
            Starred
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {allDraftsCount === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-[#1a1a2e] font-medium mb-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>No drafts yet</p>
            <p className="text-xs text-[#c2b8a8]">Start writing in a sprint or create a blank draft.</p>
          </div>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-[#c2b8a8] text-center py-16 px-4">
            {starredOnly ? "No starred drafts yet — tap the star on a draft to pin it here." : "No drafts match your search."}
          </p>
        ) : (
          <>
            {starredDrafts.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#c2b8a8] uppercase tracking-widest px-4 pt-2 pb-1">Starred</p>
                {starredDrafts.map(rowFor)}
              </div>
            )}
            {otherDrafts.length > 0 && (
              <div>
                {starredDrafts.length > 0 && (
                  <p className="text-[11px] font-semibold text-[#c2b8a8] uppercase tracking-widest px-4 pt-4 pb-1">All drafts</p>
                )}
                {otherDrafts.map(rowFor)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Mobile tab bar ─────────────────────────────────────────────────────────────

function MobileTabBar({ tab, onChange }) {
  const tabs = [
    { key: "drafts", label: "Drafts", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    )},
    { key: "progress", label: "Progress", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M8 17V9m4 8V5m4 12v-6" /></svg>
    )},
    { key: "tips", label: "Tips", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    )},
  ];
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#ffffff] border-t border-[#e8e0d0] flex items-stretch pb-[env(safe-area-inset-bottom)]">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${tab === t.key ? "text-[#d4af37]" : "text-[#c2b8a8]"}`}>
          {t.icon}
          <span className="text-[10px] font-medium">{t.label}</span>
        </button>
      ))}
    </nav>
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
  const [starredOnly, setStarredOnly]     = useState(false);
  const [starLoadingId, setStarLoadingId] = useState(null);
  const [deletingId, setDeletingId]       = useState(null);
  const [search, setSearch]               = useState("");

  // Mobile tab: 'drafts' | 'progress' | 'tips'
  const [mobileTab, setMobileTab] = useState("drafts");

  // Sprint activity (heatmap + recent history)
  const [heatmap, setHeatmap]             = useState({});
  const [sprintHistory, setSprintHistory] = useState([]);
  // Exact lifetime sprint count from the backend (a real COUNT query, not
  // however many rows happen to come back in the history/heatmap fetch) —
  // so it's never silently capped at whatever limit those use.
  const [sprintsTotal, setSprintsTotal]   = useState(0);
  const [activityLoading, setActivityLoading] = useState(true);

  // Latest "writing tips" blog posts
  const [tipPosts, setTipPosts]           = useState([]);
  const [tipsLoading, setTipsLoading]     = useState(true);

  // Modals
  const [postingDraft, setPostingDraft]     = useState(null);
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

  // Fetch sprint heatmap + recent history in parallel — non-critical, so a
  // failure here shouldn't block the drafts list itself. History is fetched
  // at a higher limit than we display so the "sprints total" stat is a
  // closer approximation of the writer's real lifetime count.
  const fetchSprintActivity = useCallback(async () => {
    try {
      const [heatmapRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/sprint/heatmap`, { credentials: "include" }),
        fetch(`${API_URL}/sprint/history?days=7`, { credentials: "include" }),
      ]);
      if (heatmapRes.ok) {
        const data = await heatmapRes.json();
        setHeatmap(data.heatmap || {});
        setSprintsTotal(data.sprintsTotal || 0);
      }
      if (historyRes.ok) setSprintHistory((await historyRes.json()).sprints || []);
    } catch {}
    finally { setActivityLoading(false); }
  }, []);

  // Fetch the latest "Writing tips" posts for the sidebar teaser
  const fetchTipPosts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/blog?limit=3&category=${encodeURIComponent("Writing Tips")}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTipPosts(data.posts || []);
      }
    } catch {}
    finally { setTipsLoading(false); }
  }, []);

  useEffect(() => {
    fetchDrafts(); fetchWallet(); fetchSprintActivity(); fetchTipPosts();
  }, [fetchDrafts, fetchWallet, fetchSprintActivity, fetchTipPosts]);

  async function handleToggleStar(draft) {
    setStarLoadingId(draft.id);
    try {
      const res = await fetch(`${API_URL}/drafts/${draft.id}/star`, {
        method: "PATCH", credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDrafts(d => d.map(x => x.id === draft.id ? { ...x, isStarred: data.draft.isStarred } : x)
          .sort((a, b) => (b.isStarred ? 1 : 0) - (a.isStarred ? 1 : 0)));
      } else {
        showToast(data.message || "Couldn't update star.", "error");
      }
    } catch {
      showToast("Couldn't reach the server.", "error");
    } finally {
      setStarLoadingId(null);
    }
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  // Delete — triggered by the row's own double-tap-to-confirm icon, so
  // there's no separate modal to manage here.
  async function handleDeleteDraft(draft) {
    setDeletingId(draft.id);
    try {
      const res = await fetch(`${API_URL}/drafts/${draft.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (res.ok) {
        setDrafts(d => d.filter(x => x.id !== draft.id));
        showToast("Draft deleted.");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || "Couldn't delete draft.", "error");
      }
    } catch {
      showToast("Couldn't reach the server.", "error");
    } finally {
      setDeletingId(null);
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

  // Starred-first is already how the backend orders `drafts`; search and the
  // starred-only filter narrow the visible set from there.
  const visibleDrafts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drafts
      .filter(d => !starredOnly || d.isStarred)
      .filter(d => !q || (d.title || "").toLowerCase().includes(q));
  }, [drafts, starredOnly, search]);

  const rowProps = {
    walletInfo,
    onEdit: draft => navigate(`/write/${draft.id}`),
    onDelete: handleDeleteDraft,
    onPostToHub: setPostingDraft,
    onDirectPost: handleDirectPost,
    postingNow: directPosting,
    onRepublish: handleRepublish,
    onToggleStar: handleToggleStar,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fdfaf5" }}>
      <AppMetaTags title="My Drafts" description="Your drafts on Quillweave — pick up where you left off." />

      <div className="flex-1 flex overflow-hidden pb-16 lg:pb-0">
        {/* Left: drafts list */}
        <aside className={`w-full lg:w-[360px] lg:flex-shrink-0 lg:border-r border-[#f0ebe3] flex-col overflow-hidden ${mobileTab === "drafts" ? "flex" : "hidden lg:flex"}`}>
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-[#c2b8a8]">
              <Spinner size={5} /> <span className="text-sm">Loading your drafts…</span>
            </div>
          ) : (
            <DraftsListPanel
              drafts={visibleDrafts}
              allDraftsCount={drafts.length}
              search={search}
              onSearch={setSearch}
              starredOnly={starredOnly}
              onToggleStarredOnly={setStarredOnly}
              starLoadingId={starLoadingId}
              deletingId={deletingId}
              wallet={wallet}
              onStartSprint={() => navigate("/sprint-room")}
              onNewDraft={() => navigate("/write")}
              {...rowProps}
            />
          )}
        </aside>

        {/* Right: progress + tips — no max-width cap so the calendar and
            blog cards can use the full available width, like the rest of
            the app's wider layouts (e.g. the draft plan dashboard). */}
        <main className={`flex-1 overflow-y-auto ${mobileTab === "drafts" ? "hidden lg:block" : "block"}`}>
          <div className="max-w-4xl px-4 sm:px-8 lg:px-10 py-8 space-y-8">
            <div className={mobileTab === "tips" ? "hidden lg:block" : "block"}>
              <ProgressPanel
                heatmap={heatmap}
                sprintHistory={sprintHistory}
                sprintsTotal={sprintsTotal}
                loading={activityLoading}
              />
            </div>
            <div className={mobileTab === "progress" ? "hidden lg:block" : "block"}>
              <WritingTipsSection posts={tipPosts} loading={tipsLoading} />
            </div>
          </div>
        </main>
      </div>

      <MobileTabBar tab={mobileTab} onChange={setMobileTab} />

      {/* ── Modals ── */}
      {postingDraft && (
        <PostToHubModal
          draft={postingDraft}
          wallet={wallet}
          onClose={() => setPostingDraft(null)}
          onSuccess={handlePostSuccess}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}