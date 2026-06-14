// src/components/sprint/GroupSprintModal.jsx
// Simplified sprint modal — personal form first, group form second.
// Writing mode (Inkwell editor) vs external doc is chosen via two clear buttons.

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

const DURATIONS = [
  { value: 1, label: "1m" },
  { value: 10, label: "10m" },
  { value: 15, label: "15m" },
  { value: 25, label: "25m" },
  { value: 30, label: "30m" },
  { value: 45, label: "45m" },
  { value: 60, label: "60m" },
];

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({ children, onClose, step, totalSteps, title, subtitle }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="bg-[#2d3748] px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            {subtitle && <p className="text-[11px] text-[#d4af37] uppercase tracking-widest font-semibold mb-0.5">{subtitle}</p>}
            <h2 className="text-lg font-serif text-white leading-tight">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            {totalSteps > 1 && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`rounded-full transition-all ${i + 1 <= step ? "w-5 h-1.5 bg-[#d4af37]" : "w-1.5 h-1.5 bg-white/25"}`} />
                ))}
              </div>
            )}
            {onClose && (
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, hint, children, optional = false }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-[#2d3748]">
          {label}{optional && <span className="text-[#9a8c7a] font-normal ml-1">(optional)</span>}
        </label>
      )}
      {hint && <p className="text-xs text-[#9a8c7a] leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

// ─── Soundscape picker ────────────────────────────────────────────────────────

function SoundscapePicker({ soundscapeId, onChange, soundscapes, loading }) {
  const [previewId, setPreviewId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; }, []);

  function togglePreview(sc, e) {
    e.stopPropagation();
    if (previewId === sc.id) { audioRef.current?.pause(); audioRef.current = null; setPreviewId(null); return; }
    audioRef.current?.pause();
    const audio = new Audio(sc.fileUrl);
    audio.volume = 0.45; audio.loop = true; audio.play().catch(() => {});
    audioRef.current = audio; setPreviewId(sc.id);
  }

  const allOptions = [{ id: null, name: "Write in silence", fileUrl: null }].concat(soundscapes);

  return (
    <Field label="Soundscape" optional hint="Pick an ambient sound. Only you hear it.">
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#e8e0d0] bg-[#faf7f2] text-sm text-[#9a8c7a]">
          <Spinner /> Loading…
        </div>
      ) : (
        <div className="space-y-2 max-h-44 overflow-y-auto">
          {allOptions.map(opt => {
            const isSelected = soundscapeId === opt.id;
            const isPrev = previewId === opt.id;
            return (
              <div key={opt.id ?? "silence"}
                onClick={() => { audioRef.current?.pause(); audioRef.current = null; setPreviewId(null); onChange(opt.id); }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#c4b898] bg-[#faf7f2]"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  isSelected ? "border-[#d4af37] bg-[#d4af37]" : "border-[#c4bdb4]"
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <p className={`flex-1 text-sm font-medium truncate ${opt.id ? "text-[#2d3748]" : "text-[#9a8c7a]"}`}>{opt.name}</p>
                {opt.fileUrl && (
                  <button type="button" onClick={(e) => togglePreview(opt, e)}
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                      isPrev ? "bg-[#d4af37] border-[#d4af37] text-white" : "bg-white border-[#e0d8cc] text-[#9a8c7a] hover:border-[#d4af37]"
                    }`}
                  >
                    {isPrev
                      ? <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                      : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Field>
  );
}

// ─── START GROUP SPRINT MODAL ─────────────────────────────────────────────────
// Step 1: Personal check-in (what you're writing, word count if external, soundscape)
// Step 2: Group sprint settings (duration, visibility, sprint type)

export function StartGroupSprintModal({ isOpen, onClose, onCreated }) {
  const [step, setStep]                     = useState(1);
  // Personal fields (step 1)
  const [writingMode, setWritingMode]       = useState("inkwell"); // "inkwell" | "external"
  const [sprintType, setSprintType]         = useState("WRITING");
  const [checkin, setCheckin]               = useState("");
  const [startWordCount, setStartWordCount] = useState("");
  const [soundscapeId, setSoundscapeId]     = useState(null);
  const [soundscapes, setSoundscapes]       = useState([]);
  const [loadingSoundscapes, setLoadingSoundscapes] = useState(false);
  // Group fields (step 2)
  const [duration, setDuration]             = useState(25);
  const [visibility, setVisibility]         = useState("PUBLIC");
  // Shared
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState(null);
  const [groupSprint, setGroupSprint]       = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingSoundscapes(true);
    fetch(`${API_URL}/soundscapes`)
      .then(r => r.ok ? r.json() : { soundscapes: [] })
      .then(d => setSoundscapes(d.soundscapes || []))
      .catch(() => setSoundscapes([]))
      .finally(() => setLoadingSoundscapes(false));
  }, [isOpen]);

  function handleClose() {
    setStep(1); setDuration(25); setSoundscapeId(null); setSprintType("WRITING");
    setCheckin(""); setStartWordCount(""); setError(null); setGroupSprint(null);
    setVisibility("PUBLIC"); setWritingMode("inkwell");
    onClose();
  }

  // Step 1 → create the group sprint → step 3 (host check-in is merged into step 2 flow)
  async function handleContinueToGroup(e) {
    e.preventDefault();
    setError(null);
    // Validate: if external, starting words required for writing sprint
    if (sprintType === "WRITING" && writingMode === "external" && !startWordCount) {
      setError("Please enter your starting word count for your external doc.");
      return;
    }
    setStep(2);
  }

  async function handleCreateAndJoin(e) {
    e.preventDefault();
    setIsLoading(true); setError(null);
    try {
      // Create the group sprint
      const res = await fetch(`${API_URL}/sprint/startGroupSprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ duration, sprintType, visibility }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Couldn't create the sprint. Please try again.");
        setIsLoading(false); return;
      }
      const data = await res.json();
      const gs = data.groupSprint;
      setGroupSprint(gs);

      // Then join it
      const joinRes = await fetch(`${API_URL}/sprint/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupSprintId: gs.id,
          checkin:       checkin.trim() || null,
          startWords:    sprintType === "WRITING" ? (Number(startWordCount) || 0) : 0,
          soundscapeId:  soundscapeId || null,
          writingMode:   sprintType === "WRITING" ? writingMode : null,
        }),
      });
      if (!joinRes.ok) {
        const body = await joinRes.json().catch(() => ({}));
        setError(body.message || "Couldn't start the sprint. Please try again.");
        setIsLoading(false); return;
      }
      onCreated(gs, writingMode === "inkwell" && sprintType === "WRITING");
      handleClose();
    } catch {
      setError("Couldn't reach the server. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;
  const isWriting = sprintType === "WRITING";

  return (
    <ModalShell onClose={handleClose} step={step} totalSteps={2}
      title={step === 1 ? "Set up your sprint" : "Open the room"}
      subtitle={step === 1 ? "Your session" : "Group settings"}
    >
      {/* ── STEP 1: Personal ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleContinueToGroup} className="p-6 space-y-5">

          {/* Sprint type */}
          <Field label="Sprint type">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "WRITING", label: "Writing", desc: "Write words & track progress" },
                { value: "READING", label: "Reading", desc: "Read together, no word count" },
              ].map(t => (
                <button key={t.value} type="button" onClick={() => setSprintType(t.value)}
                  className={`p-3.5 rounded-xl border-2 transition-all text-left ${
                    sprintType === t.value ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#b8a898] bg-[#faf7f2]"
                  }`}
                >
                  <p className={`text-sm font-semibold ${sprintType === t.value ? "text-[#2d3748]" : "text-[#6b5c4a]"}`}>{t.label}</p>
                  <p className={`text-xs mt-0.5 ${sprintType === t.value ? "text-[#6b5c4a]" : "text-[#9a8c7a]"}`}>{t.desc}</p>
                </button>
              ))}
            </div>
          </Field>

          {/* Writing mode — only for writing sprints */}
          {isWriting && (
            <Field label="Where are you writing?">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "inkwell", label: "Inkwell editor", desc: "Write here, auto-saves to drafts" },
                  { value: "external", label: "My own doc", desc: "Google Docs, Scrivener, etc." },
                ].map(m => (
                  <button key={m.value} type="button" onClick={() => setWritingMode(m.value)}
                    className={`p-3.5 rounded-xl border-2 transition-all text-left ${
                      writingMode === m.value ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#b8a898] bg-[#faf7f2]"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${writingMode === m.value ? "text-[#2d3748]" : "text-[#6b5c4a]"}`}>{m.label}</p>
                    <p className={`text-xs mt-0.5 ${writingMode === m.value ? "text-[#6b5c4a]" : "text-[#9a8c7a]"}`}>{m.desc}</p>
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* External doc: starting word count required */}
          {isWriting && writingMode === "external" && (
            <Field label="Starting word count" hint="We'll subtract this from your final count to calculate words written.">
              <input type="number" value={startWordCount} onChange={e => setStartWordCount(e.target.value)}
                placeholder="e.g. 3400" min={0}
                className="w-full px-4 py-3 rounded-xl border border-[#e8e0d0] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] text-[#2d3748] placeholder-[#c4bdb4] text-sm transition-all bg-[#faf7f2]"
              />
            </Field>
          )}

          {/* Check-in */}
          <Field label={isWriting ? "What are you writing today?" : "What are you reading today?"} optional>
            <textarea value={checkin} onChange={e => setCheckin(e.target.value)}
              placeholder={isWriting ? "e.g. Chapter 12 — the confrontation scene…" : "e.g. Chapter 5 of The Midnight Library…"}
              rows={2} maxLength={200}
              className="w-full px-4 py-3 rounded-xl border border-[#e8e0d0] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] text-[#2d3748] placeholder-[#c4bdb4] text-sm resize-none transition-all bg-[#faf7f2]"
            />
            <p className="text-xs text-[#c4bdb4] text-right">{checkin.length}/200</p>
          </Field>

          <SoundscapePicker soundscapeId={soundscapeId} onChange={setSoundscapeId} soundscapes={soundscapes} loading={loadingSoundscapes} />

          <ErrorBanner message={error} />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose}
              className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-[#faf7f2]">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all flex items-center justify-center gap-2">
              Continue
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 2: Group room settings ──────────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={handleCreateAndJoin} className="p-6 space-y-5">

          {/* Summary pill of personal setup */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#faf7f2] border border-[#e8e0d0]">
            <div className="w-1.5 h-8 rounded-full bg-[#d4af37] flex-shrink-0" />
            <div>
              <p className="text-xs text-[#9a8c7a] uppercase tracking-wider font-semibold">Your setup</p>
              <p className="text-sm font-semibold text-[#2d3748]">
                {sprintType === "WRITING"
                  ? `Writing · ${writingMode === "inkwell" ? "Inkwell editor" : "External doc"}`
                  : "Reading sprint"}
              </p>
            </div>
          </div>

          {/* Duration */}
          <Field label="Duration">
            <div className="grid grid-cols-6 gap-2">
              {DURATIONS.map(dur => (
                <button key={dur.value} type="button" onClick={() => setDuration(dur.value)}
                  className={`py-3 rounded-xl border-2 transition-all text-center ${
                    duration === dur.value ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#b8a898] bg-[#faf7f2]"
                  }`}
                >
                  <p className={`text-xs font-bold leading-none ${duration === dur.value ? "text-[#2d3748]" : "text-[#6b5c4a]"}`}>{dur.label}</p>
                </button>
              ))}
            </div>
          </Field>

          {/* Visibility */}
          <Field label="Who can join?">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "PUBLIC", label: "Public", desc: "Visible to all writers" },
                { value: "PRIVATE", label: "Private", desc: "Only you in the room" },
              ].map(v => (
                <button key={v.value} type="button" onClick={() => setVisibility(v.value)}
                  className={`p-3.5 rounded-xl border-2 transition-all text-left ${
                    visibility === v.value ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#b8a898] bg-[#faf7f2]"
                  }`}
                >
                  <p className={`text-sm font-semibold ${visibility === v.value ? "text-[#2d3748]" : "text-[#6b5c4a]"}`}>{v.label}</p>
                  <p className={`text-xs mt-0.5 ${visibility === v.value ? "text-[#6b5c4a]" : "text-[#9a8c7a]"}`}>{v.desc}</p>
                </button>
              ))}
            </div>
          </Field>

          <ErrorBanner message={error} />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setStep(1); setError(null); }}
              className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-[#faf7f2]">
              Back
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <><Spinner /> Opening room…</> : "Open the room"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

// ─── JOIN GROUP SPRINT MODAL ──────────────────────────────────────────────────
// Requires a preselectedSprint — skips room-list step entirely.
// Shows only the personal check-in form for that specific sprint.

export function JoinGroupSprintModal({ onClose, preselectedSprint }) {
  const navigate = useNavigate();
  const [writingMode, setWritingMode]               = useState("inkwell");
  const [checkin, setCheckin]                       = useState("");
  const [startWordCount, setStartWordCount]         = useState("");
  const [soundscapeId, setSoundscapeId]             = useState(null);
  const [soundscapes, setSoundscapes]               = useState([]);
  const [loadingSoundscapes, setLoadingSoundscapes] = useState(false);
  const [isLoading, setIsLoading]                   = useState(false);
  const [error, setError]                           = useState(null);

  // preselectedSprint is required for this modal — guard early
  if (!preselectedSprint) return null;

  const isReadingSprint = preselectedSprint.sprintType === "READING";

  useEffect(() => {
    setLoadingSoundscapes(true);
    fetch(`${API_URL}/soundscapes`)
      .then(r => r.ok ? r.json() : { soundscapes: [] })
      .then(d => setSoundscapes(d.soundscapes || []))
      .catch(() => setSoundscapes([]))
      .finally(() => setLoadingSoundscapes(false));
  }, []);

  function handleClose() {
    setCheckin(""); setStartWordCount(""); setSoundscapeId(null);
    setError(null); setWritingMode("inkwell");
    onClose();
  }

  async function handleJoin(e) {
    e.preventDefault();
    const isWriting = preselectedSprint.sprintType === "WRITING";
    if (isWriting && writingMode === "external" && !startWordCount) {
      setError("Please enter your starting word count for your external doc."); return;
    }
    setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupSprintId: preselectedSprint.id,
          checkin:       checkin.trim() || null,
          startWords:    isWriting ? (Number(startWordCount) || 0) : 0,
          soundscapeId:  soundscapeId || null,
          writingMode:   isWriting ? writingMode : null,
        }),
      });
      if (res.ok) {
        handleClose();
        navigate(`/group-sprint/${preselectedSprint.id}`, {
          state: { writingMode: isWriting ? writingMode : null }
        });
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Couldn't join. Please try again.");
      }
    } catch {
      setError("Couldn't reach the server. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ModalShell onClose={handleClose}
      step={1} totalSteps={1}
      title={`Joining @${preselectedSprint.user?.username}'s sprint`}
      subtitle="Your check-in"
    >
      <form onSubmit={handleJoin} className="p-6 space-y-5">
        {/* Sprint info pill */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#faf7f2] border border-[#e8e0d0]">
          <div className="w-1.5 h-8 rounded-full bg-[#d4af37] flex-shrink-0" />
          <div>
            <p className="text-xs text-[#9a8c7a] uppercase tracking-wider font-semibold">Joining</p>
            <p className="text-sm font-semibold text-[#2d3748]">
              @{preselectedSprint.user?.username}'s room · {preselectedSprint.duration} min
              {preselectedSprint.sprintType === "READING" && (
                <span className="ml-2 text-[11px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Reading</span>
              )}
            </p>
          </div>
        </div>

        {/* Writing mode — only for writing sprints */}
        {!isReadingSprint && (
          <Field label="Where are you writing?">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "inkwell", label: "Inkwell editor", desc: "Write here, auto-saves" },
                { value: "external", label: "My own doc", desc: "Google Docs, Scrivener…" },
              ].map(m => (
                <button key={m.value} type="button" onClick={() => setWritingMode(m.value)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    writingMode === m.value ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#b8a898] bg-[#faf7f2]"
                  }`}
                >
                  <p className={`text-sm font-semibold ${writingMode === m.value ? "text-[#2d3748]" : "text-[#6b5c4a]"}`}>{m.label}</p>
                  <p className={`text-xs mt-0.5 ${writingMode === m.value ? "text-[#6b5c4a]" : "text-[#9a8c7a]"}`}>{m.desc}</p>
                </button>
              ))}
            </div>
          </Field>
        )}

        {/* External: starting word count */}
        {!isReadingSprint && writingMode === "external" && (
          <Field label="Starting word count" hint="We'll subtract this from your final count to calculate words written.">
            <input type="number" value={startWordCount} onChange={e => setStartWordCount(e.target.value)}
              placeholder="e.g. 3400" min={0}
              className="w-full px-4 py-3 rounded-xl border border-[#e8e0d0] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] text-[#2d3748] placeholder-[#c4bdb4] text-sm transition-all bg-[#faf7f2]"
            />
          </Field>
        )}

        <Field label={isReadingSprint ? "What are you reading today?" : "What are you writing today?"} optional>
          <textarea value={checkin} onChange={e => setCheckin(e.target.value)}
            placeholder={isReadingSprint ? "e.g. Chapter 5 of The Midnight Library…" : "e.g. Chapter 12 — the confrontation scene…"}
            rows={2} maxLength={200}
            className="w-full px-4 py-3 rounded-xl border border-[#e8e0d0] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] text-[#2d3748] placeholder-[#c4bdb4] text-sm resize-none transition-all bg-[#faf7f2]"
          />
          <p className="text-xs text-[#c4bdb4] text-right">{checkin.length}/200</p>
        </Field>

        <SoundscapePicker soundscapeId={soundscapeId} onChange={setSoundscapeId} soundscapes={soundscapes} loading={loadingSoundscapes} />

        <ErrorBanner message={error} />

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={handleClose}
            className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-[#faf7f2]">
            Cancel
          </button>
          <button type="submit" disabled={isLoading}
            className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <><Spinner /> Joining…</> : "Enter the room"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── RE-ENTER MODAL ───────────────────────────────────────────────────────────

export function ReEnterShopModal({ isOpen, onClose, onEnter, groupSprint }) {
  if (!isOpen) return null;
  return (
    <ModalShell onClose={onClose} title="Your seat is still warm" subtitle="Welcome back">
      <div className="p-6 space-y-5">
        <div className="px-4 py-4 rounded-xl bg-[#faf7f2] border border-[#e8e0d0]">
          <p className="text-sm text-[#2d3748] leading-relaxed">
            You already checked in to this sprint — jump back in and keep writing.
          </p>
          <p className="text-xs text-[#9a8c7a] mt-2">{groupSprint?.duration} min session</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-[#faf7f2]">Leave</button>
          <button onClick={onEnter} className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all">Continue writing</button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── CHECKOUT MODAL ───────────────────────────────────────────────────────────

export function CheckoutModal({ isOpen, onClose, onSubmit, sprintId, isEarly = false, linkedProject = null, sprintType = "WRITING" }) {
  const navigate = useNavigate();
  const [currentWords, setCurrentWords] = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");
  const [capturedSprintId, setCapturedSprintId] = useState(null);
  const [dailyThreadId, setDailyThreadId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentWords(""); setError(""); setSubmitting(false);
      if (sprintId) setCapturedSprintId(sprintId);

      // Fetch the Daily Writing Challenge thread so we can link to it
      fetch(`${API_URL}/threads/daily`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => setDailyThreadId(d?.thread?.id ?? null))
        .catch(() => setDailyThreadId(null));
    }
  }, [isOpen, sprintId]);

  useEffect(() => {
    if (sprintId && !capturedSprintId) setCapturedSprintId(sprintId);
  }, [sprintId, capturedSprintId]);

  if (!isOpen) return null;

  const effectiveId = capturedSprintId || sprintId;
  const isReadingSprint = sprintType === "READING";

  async function handleSubmit() {
    const val = parseInt(currentWords, 10);
    if (!isReadingSprint && (isNaN(val) || val < 0)) { setError("Please enter a valid word count."); return; }
    if (!effectiveId) { setError("Still loading your session — please wait a moment."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`${API_URL}/sprint/${effectiveId}/checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ currentWordCount: isReadingSprint ? 0 : val }),
      });
      if (!res.ok) throw new Error("Checkout failed");
      onSubmit();
      if (!isEarly) {
        navigate(`/threads/${2}` , { state: { fromSprint: true } });
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}
      title={isEarly ? "Leaving early?" : isReadingSprint ? "Reading complete" : "Sprint complete"}
      subtitle={isEarly ? "Check out early" : "Check out"}
    >
      <div className="p-6 space-y-5">
        <p className="text-sm text-[#9a8c7a] leading-relaxed">
          {isEarly
            ? isReadingSprint ? "No worries — hope you enjoyed your reading session." : "No worries — enter your current word count before you go."
            : isReadingSprint ? "Hope it was a great read." : "Every word counts. Enter your final word count."}
        </p>

        {!isReadingSprint && (
          <Field label="Current word count">
            <input type="number" min="0" value={currentWords} onChange={e => setCurrentWords(e.target.value)}
              placeholder="e.g. 1240"
              className="w-full px-4 py-3 border border-[#e8e0d0] rounded-xl text-sm text-[#2d3748] placeholder-[#c4bdb4] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-colors bg-[#faf7f2]"
            />
            {linkedProject && (
              <p className="text-[11px] text-[#9a8c7a] mt-1.5">Words written will be added to <strong>{linkedProject.title}</strong>.</p>
            )}
          </Field>
        )}

        <div className="px-4 py-4 rounded-xl bg-[#fffbf0] border border-[#f0e0bb] space-y-2">
          <p className="text-sm text-[#2d3748] leading-relaxed">
            {isReadingSprint
              ? "Tell the community what you read today — drop it in the Daily Writing Challenge thread."
              : "Tell the community what you're writing today — drop it in the Daily Writing Challenge thread."}
          </p>
          {/* <a
            href={`/threads/${2}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#d4af37] hover:text-[#b8932c] transition-all"
          >
            Go to the Daily Writing Challenge
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a> */}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          {isEarly && (
            <button onClick={onClose} className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] text-sm rounded-xl hover:border-[#b8a898] transition-all bg-[#faf7f2]">Stay</button>
          )}
          <button onClick={handleSubmit} disabled={submitting || (!isReadingSprint && !currentWords)}
            className="flex-1 py-3 bg-[#2d3748] text-white text-sm font-semibold rounded-xl hover:bg-[#3d4f64] transition-all disabled:opacity-40">
            {submitting ? "Saving…" : "Check out"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}