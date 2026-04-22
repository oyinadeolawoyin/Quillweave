import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";

// ─── Shared helpers ───────────────────────────────────────────

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
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mt-3">
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

const DURATIONS = [
  { value: 1,  label: "1 min",  description: "Quick sprint" },
  { value: 10, label: "10 min", description: "Quick sprint" },
  { value: 15, label: "15 min", description: "Focused burst" },
  { value: 25, label: "25 min", description: "Pomodoro" },
  { value: 30, label: "30 min", description: "Steady flow" },
  { value: 45, label: "45 min", description: "Deep work" },
  { value: 60, label: "60 min", description: "Marathon" },
];

const SPRINT_TYPES = [
  { value: "WRITING", label: "Writing", description: "Write words & track progress" },
  { value: "READING", label: "Reading", description: "Read together, no word count" },
];

// ─── Dropdown ─────────────────────────────────────────────────
function Dropdown({ label, hint, value, onChange, options, renderOption, renderSelected, placeholder, loading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[#2d3748] mb-1">
          {label}
        </label>
      )}
      {hint && <p className="text-xs text-[#9a8c7a] mb-2">{hint}</p>}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all text-left text-sm bg-[#faf7f2] ${
            open ? "border-[#d4af37] ring-2 ring-[#d4af37]/20" : "border-[#e8e0d0] hover:border-[#b8a898]"
          }`}
        >
          <span className={value !== undefined && value !== null ? "text-[#2d3748]" : "text-[#9a8c7a]"}>
            {loading ? "Loading..." : renderSelected ? renderSelected(value) : (value ?? placeholder ?? "Select…")}
          </span>
          <svg
            className={`w-4 h-4 text-[#9a8c7a] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-10 mt-1.5 w-full bg-white border border-[#e8e0d0] rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-52 overflow-y-auto divide-y divide-[#f0ebe3]">
              {loading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-[#9a8c7a]">
                  <Spinner /> Loading…
                </div>
              ) : options.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[#9a8c7a] italic">Nothing available yet.</p>
              ) : (
                options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onChange(opt); setOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[#faf7f2] ${
                      renderOption ? "" : ""
                    }`}
                  >
                    {renderOption ? renderOption(opt) : String(opt)}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Project Picker (dropdown) ────────────────────────────────
function ProjectDropdown({ selectedProjectId, onChange }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/projects/myProjects`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { projects: [] })
      .then(d => setProjects(d.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const active = projects.filter(p => p.status === "IN_PROGRESS");
  const allOptions = [{ id: null, title: "No project", genre: null }].concat(active);

  const selected = allOptions.find(p => p.id === selectedProjectId) || allOptions[0];

  return (
    <Dropdown
      label={<>Link a project <span className="text-[#9a8c7a] font-normal">(optional)</span></>}
      hint="Words you write today will be automatically added to this project when you check out."
      loading={loading}
      value={selectedProjectId}
      onChange={(opt) => onChange(opt.id)}
      options={allOptions}
      renderSelected={() =>
        selected?.id
          ? <span>{selected.title}{selected.genre ? <span className="text-[#9a8c7a] ml-1.5">· {selected.genre}</span> : null}</span>
          : <span className="text-[#9a8c7a]">No project link</span>
      }
      renderOption={(opt) => (
        <div>
          <p className={`font-medium truncate ${opt.id ? "text-[#2d3748]" : "text-[#9a8c7a]"}`}>{opt.title}</p>
          {opt.genre && <p className="text-xs text-[#9a8c7a] truncate">{opt.genre}</p>}
          {opt.currentWordCount != null && opt.targetWordCount != null && (
            <p className="text-xs text-[#9a8c7a] mt-0.5">
              {opt.currentWordCount.toLocaleString()} / {opt.targetWordCount.toLocaleString()} words
            </p>
          )}
        </div>
      )}
    />
  );
}

// ─── Soundscape Picker (dropdown) ─────────────────────────────
function SoundscapeDropdown({ soundscapeId, onChange, soundscapes, loading }) {
  const allOptions = [{ id: null, name: "Write in silence", creatorName: null }].concat(soundscapes);
  const selected = allOptions.find(s => s.id === soundscapeId) || allOptions[0];

  return (
    <Dropdown
      label={<>Your soundscape <span className="text-[#9a8c7a] font-normal">(optional)</span></>}
      hint="Pick an ambient sound to write to. Only you hear it."
      loading={loading}
      value={soundscapeId}
      onChange={(opt) => onChange(opt.id)}
      options={allOptions}
      renderSelected={() =>
        selected?.id
          ? selected.name
          : <span className="text-[#9a8c7a]">Write in silence</span>
      }
      renderOption={(opt) => (
        <div>
          <p className={`font-medium truncate ${opt.id ? "text-[#2d3748]" : "text-[#9a8c7a]"}`}>{opt.name}</p>
          {opt.creatorName && <p className="text-xs text-[#9a8c7a]">by {opt.creatorName}</p>}
        </div>
      )}
    />
  );
}

// ─── Modal shell ──────────────────────────────────────────────
function ModalShell({ children, onClose, step, totalSteps, title, subtitle }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="bg-[#2d3748] px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            {subtitle && (
              <p className="text-[11px] text-[#d4af37] uppercase tracking-widest font-semibold mb-0.5">{subtitle}</p>
            )}
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
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────
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

// ─── START GROUP SPRINT MODAL ─────────────────────────────────
export function StartGroupSprintModal({ isOpen, onClose, onCreated }) {
  const [step, setStep]                     = useState(1);
  const [duration, setDuration]             = useState(25);
  const [sprintType, setSprintType]         = useState("WRITING");
  const [visibility, setVisibility]         = useState("PUBLIC");
  const [checkin, setCheckin]               = useState("");
  const [startWordCount, setStartWordCount] = useState("");
  const [soundscapeId, setSoundscapeId]     = useState(null);
  const [soundscapes, setSoundscapes]       = useState([]);
  const [loadingSoundscapes, setLoadingSoundscapes] = useState(false);
  const [selectedProjectId, setSelectedProjectId]   = useState(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState(null);
  const [groupSprint, setGroupSprint]       = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingSoundscapes(true);
    fetch(`${API_URL}/soundscapes`)
      .then((r) => (r.ok ? r.json() : { soundscapes: [] }))
      .then((d) => setSoundscapes(d.soundscapes || []))
      .catch(() => setSoundscapes([]))
      .finally(() => setLoadingSoundscapes(false));
  }, [isOpen]);

  function handleClose() {
    setStep(1); setDuration(25); setSoundscapeId(null); setSprintType("WRITING");
    setCheckin(""); setStartWordCount(""); setError(null); setGroupSprint(null);
    setSelectedProjectId(null); setVisibility("PUBLIC");
    onClose();
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/startGroupSprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ duration, sprintType, visibility }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroupSprint(data.groupSprint);
        setStep(2);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Couldn't create the sprint. Please try again.");
      }
    } catch {
      setError("Couldn't reach the server. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleHostCheckin(e) {
    e.preventDefault(); setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupSprintId: groupSprint.id,
          checkin:       checkin.trim() || null,
          startWords:    sprintType === "WRITING" && startWordCount ? Number(startWordCount) : 0,
          soundscapeId:  soundscapeId  || null,
          projectId:     sprintType === "WRITING" ? (selectedProjectId || null) : null,
        }),
      });
      if (res.ok) {
        onCreated(groupSprint);
        handleClose();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Couldn't start the sprint. Please try again.");
      }
    } catch {
      setError("Couldn't reach the server. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  const isWriting = sprintType === "WRITING";

  return (
    <ModalShell
      onClose={handleClose}
      step={step}
      totalSteps={2}
      title={step === 1 ? "Open the Shop" : "Your Check-in"}
      subtitle={step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
    >
      {step === 1 && (
        <form onSubmit={handleCreateGroup} className="p-6 space-y-6">
          {/* Who can join */}
          <Field label="Who can join?">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "PUBLIC", label: "Public", desc: "Anyone can join" },
                { value: "PRIVATE", label: "Private", desc: "Invite only" },
              ].map((v) => (
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

          {/* Sprint type */}
          <Field label="Sprint type">
            <div className="grid grid-cols-2 gap-2">
              {SPRINT_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => setSprintType(t.value)}
                  className={`p-3.5 rounded-xl border-2 transition-all text-left ${
                    sprintType === t.value ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#b8a898] bg-[#faf7f2]"
                  }`}
                >
                  <p className={`text-sm font-semibold ${sprintType === t.value ? "text-[#2d3748]" : "text-[#6b5c4a]"}`}>{t.label}</p>
                  <p className={`text-xs mt-0.5 ${sprintType === t.value ? "text-[#6b5c4a]" : "text-[#9a8c7a]"}`}>{t.description}</p>
                </button>
              ))}
            </div>
          </Field>

          {/* Duration */}
          <Field label="Duration">
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((dur) => (
                <button key={dur.value} type="button" onClick={() => setDuration(dur.value)}
                  className={`py-3 rounded-xl border-2 transition-all text-center ${
                    duration === dur.value ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#b8a898] bg-[#faf7f2]"
                  }`}
                >
                  <p className={`text-sm font-bold leading-none ${duration === dur.value ? "text-[#2d3748]" : "text-[#6b5c4a]"}`}>{dur.value}m</p>
                </button>
              ))}
            </div>
          </Field>

          <ErrorBanner message={error} />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose}
              className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-[#faf7f2]">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <><Spinner /> Creating…</> : "Continue"}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleHostCheckin} className="p-6 space-y-5">
          {/* Session info pill */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#faf7f2] border border-[#e8e0d0]">
            <div className="w-1.5 h-8 rounded-full bg-[#d4af37] flex-shrink-0" />
            <div>
              <p className="text-xs text-[#9a8c7a] uppercase tracking-wider font-semibold">Your session</p>
              <p className="text-sm font-semibold text-[#2d3748]">
                {groupSprint?.duration} min · {groupSprint?.sprintType === "READING" ? "Reading" : "Writing"}
              </p>
            </div>
          </div>

          {/* What are you writing/reading today */}
          <Field
            label={isWriting ? "What are you writing today?" : "What are you reading today?"}
            optional
          >
            <textarea
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
              placeholder={isWriting ? "e.g. Chapter 12 — the confrontation scene…" : "e.g. Chapter 5 of The Midnight Library…"}
              rows={3} maxLength={200}
              className="w-full px-4 py-3 rounded-xl border border-[#e8e0d0] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] text-[#2d3748] placeholder-[#c4bdb4] text-sm resize-none transition-all bg-[#faf7f2]"
            />
            <p className="text-xs text-[#c4bdb4] text-right">{checkin.length}/200</p>
          </Field>

          {/* Writing-only fields */}
          {isWriting && (
            <>
              <ProjectDropdown selectedProjectId={selectedProjectId} onChange={setSelectedProjectId} />
              <Field label="Starting word count" optional hint="We'll use this to calculate how many words you write.">
                <input
                  type="number" value={startWordCount}
                  onChange={(e) => setStartWordCount(e.target.value)}
                  placeholder="e.g. 3400" min={0}
                  className="w-full px-4 py-3 rounded-xl border border-[#e8e0d0] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] text-[#2d3748] placeholder-[#c4bdb4] text-sm transition-all bg-[#faf7f2]"
                />
              </Field>
            </>
          )}

          <SoundscapeDropdown
            soundscapeId={soundscapeId}
            onChange={setSoundscapeId}
            soundscapes={soundscapes}
            loading={loadingSoundscapes}
          />

          <ErrorBanner message={error} />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setStep(1); setError(null); }}
              className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-[#faf7f2]">
              Back
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <><Spinner /> Starting…</> : "Open the Shop"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

// ─── JOIN GROUP SPRINT MODAL ──────────────────────────────────
export function JoinGroupSprintModal({ onClose }) {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [step, setStep]                             = useState(1);
  const [activeSprints, setActiveSprints]           = useState([]);
  const [loadingRooms, setLoadingRooms]             = useState(true);
  const [selectedSprint, setSelectedSprint]         = useState(null);
  const [checkin, setCheckin]                       = useState("");
  const [startWordCount, setStartWordCount]         = useState("");
  const [soundscapeId, setSoundscapeId]             = useState(null);
  const [soundscapes, setSoundscapes]               = useState([]);
  const [loadingSoundscapes, setLoadingSoundscapes] = useState(false);
  const [selectedProjectId, setSelectedProjectId]   = useState(null);
  const [isLoading, setIsLoading]                   = useState(false);
  const [error, setError]                           = useState(null);

  useEffect(() => {
    async function fetchRooms() {
      setLoadingRooms(true);
      try {
        const res = await fetch(`${API_URL}/sprint/activeGroupSprints?limit=10`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setActiveSprints(data.groupSprints || []);
        }
      } catch {}
      finally { setLoadingRooms(false); }
    }
    fetchRooms();
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    setLoadingSoundscapes(true);
    fetch(`${API_URL}/soundscapes`)
      .then((r) => (r.ok ? r.json() : { soundscapes: [] }))
      .then((d) => setSoundscapes(d.soundscapes || []))
      .catch(() => setSoundscapes([]))
      .finally(() => setLoadingSoundscapes(false));
  }, [step]);

  function handleClose() {
    setStep(1); setSelectedSprint(null);
    setCheckin(""); setStartWordCount(""); setSoundscapeId(null);
    setSelectedProjectId(null); setError(null);
    onClose();
  }

  async function handleJoin(e) {
    e.preventDefault(); setIsLoading(true); setError(null);
    const isReadingSprint = selectedSprint?.sprintType === "READING";
    try {
      const res = await fetch(`${API_URL}/sprint/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupSprintId: selectedSprint.id,
          checkin:       checkin.trim() || null,
          startWords:    !isReadingSprint && startWordCount ? Number(startWordCount) : 0,
          soundscapeId:  soundscapeId  || null,
          projectId:     !isReadingSprint ? (selectedProjectId || null) : null,
        }),
      });
      if (res.ok) {
        handleClose();
        navigate(`/group-sprint/${selectedSprint.id}`);
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

  const isReadingSprint = selectedSprint?.sprintType === "READING";

  return (
    <ModalShell
      onClose={handleClose}
      step={step}
      totalSteps={2}
      title={step === 1 ? "Enter the Shop" : `Joining @${selectedSprint?.user?.username}'s sprint`}
      subtitle={step === 1 ? "Active sessions" : "Your check-in"}
    >
      {step === 1 && (
        <div className="p-6">
          {loadingRooms ? (
            <div className="flex items-center justify-center py-12 gap-2.5 text-[#9a8c7a] text-sm">
              <Spinner /> Loading active rooms…
            </div>
          ) : activeSprints.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-serif text-[#2d3748] text-lg mb-2">No active sprints right now</p>
              <p className="text-sm text-[#9a8c7a] mb-5">Check back soon or start your own room.</p>
              <button onClick={handleClose} className="text-sm text-[#9a8c7a] hover:text-[#2d3748] transition-colors">Close</button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-[#9a8c7a] mb-4">
                {activeSprints.length} active session{activeSprints.length !== 1 ? "s" : ""} — pick one to join
              </p>
              {activeSprints.map((gs) => {
                const alreadyJoined = user && gs.sprints?.some(
                  (s) => Number(s.userId) === Number(user.id) && s.isActive !== false
                );
                return (
                  <button
                    key={gs.id}
                    onClick={() => {
                      // Already joined: skip check-in, go straight to room
                      if (alreadyJoined) { handleClose(); navigate(`/group-sprint/${gs.id}`); }
                      else { setSelectedSprint(gs); setStep(2); }
                    }}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all group ${
                      alreadyJoined
                        ? "border-[#d4af37] bg-[#fffbf0]"
                        : "border-[#e8e0d0] hover:border-[#d4af37] hover:bg-[#fffbf0] bg-[#faf7f2]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
                          </span>
                          <span className="text-xs text-[#9a8c7a]">· @{gs.user?.username} · {gs.duration} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            gs.sprintType === "READING"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {gs.sprintType === "READING" ? "Reading" : "Writing"}
                          </span>
                          <span className="text-xs text-[#9a8c7a]">
                            {gs._count?.sprints || 0} writer{(gs._count?.sprints || 0) !== 1 ? "s" : ""} inside
                          </span>
                        </div>
                      </div>
                      {alreadyJoined ? (
                        <span className="text-xs font-semibold text-[#d4af37] flex-shrink-0">
                          Joined · Continue
                        </span>
                      ) : (
                        <svg className="w-4 h-4 text-[#c4bdb4] group-hover:text-[#d4af37] transition-colors flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 2 && selectedSprint && (
        <form onSubmit={handleJoin} className="p-6 space-y-5">
          {/* Session info */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#faf7f2] border border-[#e8e0d0]">
            <div className="w-1.5 h-8 rounded-full bg-[#d4af37] flex-shrink-0" />
            <div>
              <p className="text-xs text-[#9a8c7a] uppercase tracking-wider font-semibold">Joining</p>
              <p className="text-sm font-semibold text-[#2d3748]">
                @{selectedSprint.user?.username}'s room · {selectedSprint.duration} min · {isReadingSprint ? "Reading" : "Writing"}
              </p>
            </div>
          </div>

          {/* What are you writing/reading */}
          <Field
            label={isReadingSprint ? "What are you reading today?" : "What are you writing today?"}
            optional
          >
            <textarea
              value={checkin} onChange={(e) => setCheckin(e.target.value)}
              placeholder={isReadingSprint ? "e.g. Chapter 5 of The Midnight Library…" : "e.g. Blog post about slow living…"}
              rows={3} maxLength={200}
              className="w-full px-4 py-3 rounded-xl border border-[#e8e0d0] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] text-[#2d3748] placeholder-[#c4bdb4] text-sm resize-none transition-all bg-[#faf7f2]"
            />
            <p className="text-xs text-[#c4bdb4] text-right">{checkin.length}/200</p>
          </Field>

          {/* Writing-only fields */}
          {!isReadingSprint && (
            <>
              <ProjectDropdown selectedProjectId={selectedProjectId} onChange={setSelectedProjectId} />
              <Field label="Starting word count" optional hint="We'll use this to calculate how many words you write.">
                <input
                  type="number" value={startWordCount}
                  onChange={(e) => setStartWordCount(e.target.value)}
                  placeholder="e.g. 3400" min={0}
                  className="w-full px-4 py-3 rounded-xl border border-[#e8e0d0] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] text-[#2d3748] placeholder-[#c4bdb4] text-sm transition-all bg-[#faf7f2]"
                />
              </Field>
            </>
          )}

          <SoundscapeDropdown
            soundscapeId={soundscapeId}
            onChange={setSoundscapeId}
            soundscapes={soundscapes}
            loading={loadingSoundscapes}
          />

          <ErrorBanner message={error} />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setStep(1); setError(null); }}
              className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-[#faf7f2]">
              Back
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <><Spinner /> Joining…</> : "Enter the Shop"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

// ─── RE-ENTER MODAL ───────────────────────────────────────────
export function ReEnterShopModal({ isOpen, onClose, onEnter, groupSprint }) {
  if (!isOpen) return null;
  return (
    <ModalShell onClose={onClose} title="Your seat is still warm" subtitle="Welcome back">
      <div className="p-6 space-y-5">
        <div className="px-4 py-4 rounded-xl bg-[#faf7f2] border border-[#e8e0d0]">
          <p className="text-sm text-[#2d3748] leading-relaxed">
            You already checked in to this sprint — no need to fill out the form again. Jump back in and keep writing.
          </p>
          <p className="text-xs text-[#9a8c7a] mt-2">{groupSprint?.duration} min session</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all bg-[#faf7f2]">
            Leave
          </button>
          <button onClick={onEnter}
            className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all">
            Continue writing
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── CHECKOUT MODAL ───────────────────────────────────────────
export function CheckoutModal({ isOpen, onClose, onSubmit, sprintId, isEarly = false, linkedProject = null, sprintType = "WRITING" }) {
  const navigate = useNavigate();
  const [currentWords, setCurrentWords]   = useState("");
  const [context, setContext]             = useState("");
  const [tags, setTags]                   = useState("");
  const [mediaFile, setMediaFile]         = useState(null);
  const [mediaPreview, setMediaPreview]   = useState(null);
  const [mediaType, setMediaType]         = useState(null);
  const [sourceType]                      = useState("POST_SPRINT");
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState("");
  const [capturedSprintId, setCapturedSprintId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentWords(""); setContext(""); setTags(""); setError(""); setSubmitting(false);
      setMediaFile(null); setMediaPreview(null); setMediaType(null);
      if (sprintId) setCapturedSprintId(sprintId);
    }
  }, [isOpen, sprintId]);

  useEffect(() => {
    if (sprintId && !capturedSprintId) setCapturedSprintId(sprintId);
  }, [sprintId, capturedSprintId]);

  if (!isOpen) return null;

  const effectiveId = capturedSprintId || sprintId;
  const isReadingSprint = sprintType === "READING";

  function handleMediaChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { setError("Only images and videos are supported."); return; }
    setMediaFile(file);
    setMediaType(isImage ? "image" : "video");
    setMediaPreview(URL.createObjectURL(file));
    setError("");
  }

  function removeMedia() {
    setMediaFile(null); setMediaPreview(null); setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    const val = parseInt(currentWords, 10);
    if (!isReadingSprint && (isNaN(val) || val < 0)) {
      setError("Please enter a valid word count (0 or more)."); return;
    }
    if (!effectiveId) { setError("Still loading your session — please wait a moment and try again."); return; }
    setSubmitting(true); setError("");

    try {
      // Build form data for snippet if media is included
      let snippetPromise = Promise.resolve(null);
      if (context.trim()) {
        const formData = new FormData();
        formData.append("context", context.trim());
        if (tags.trim()) formData.append("tags", tags.trim());
        formData.append("sourceType", sourceType);
        if (mediaFile) formData.append("media", mediaFile);
        snippetPromise = fetch(`${API_URL}/snippets`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
      }

      const checkoutPromise = fetch(`${API_URL}/sprint/${effectiveId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentWordCount: isReadingSprint ? 0 : val }),
      });

      const [res, snippetRes] = await Promise.all([checkoutPromise, snippetPromise]);

      if (!res.ok) throw new Error("Checkout failed");
      if (snippetRes && !snippetRes.ok) {
        const snippetErr = await snippetRes.json().catch(() => ({}));
        throw new Error(snippetErr.message || "Snippet save failed");
      }

      onSubmit();

      if (!isEarly) {
        navigate("/snippets", { state: { fromSprint: true } });
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      title={isEarly ? "Leaving early?" : isReadingSprint ? "Reading session complete" : "Sprint complete"}
      subtitle={isEarly ? "Check out early" : "Check out"}
    >
      <div className="p-6 space-y-5">
        <p className="text-sm text-[#9a8c7a] leading-relaxed">
          {isEarly
            ? isReadingSprint
              ? "No worries — hope you enjoyed your reading session."
              : "No worries — enter your current word count before you go."
            : isReadingSprint
            ? "Hope it was a great read. Share what you were reading with the community."
            : "Every word counts. Enter your final word count and share a reflection with the community."}
        </p>

        {/* Word count — writing sprints only */}
        {!isReadingSprint && (
          <Field label="Current word count">
            <input
              type="number" min="0" value={currentWords}
              onChange={(e) => setCurrentWords(e.target.value)}
              placeholder="e.g. 1240"
              className="w-full px-4 py-3 border border-[#e8e0d0] rounded-xl text-sm text-[#2d3748] placeholder-[#c4bdb4] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-colors bg-[#faf7f2]"
            />
            {linkedProject && (
              <p className="text-[11px] text-[#9a8c7a] mt-1.5">
                Words written will be added to <strong>{linkedProject.title}</strong> automatically.
              </p>
            )}
          </Field>
        )}

        {/* Reflection / snippet */}
        <Field
          label={isReadingSprint ? "What were you reading? Any thoughts?" : "Share a reflection"}
          optional
        >
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder={
              isReadingSprint
                ? "What did you read? Any passages that stayed with you?"
                : "How was your writing today? Any wins or struggles worth sharing?"
            }
            rows={4}
            className="w-full text-[#2d3748] text-sm leading-relaxed placeholder-[#c4bdb4] resize-none border border-[#e8e0d0] rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-all bg-[#faf7f2]"
          />
        </Field>

        {/* Media upload */}
        <div>
          {mediaPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-[#e8e0d0]">
              {mediaType === "image"
                ? <img src={mediaPreview} alt="Preview" className="w-full max-h-56 object-cover" />
                : <video src={mediaPreview} controls className="w-full max-h-56 rounded-xl" />}
              <button
                type="button" onClick={removeMedia}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full border border-dashed border-[#d6d0c8] rounded-xl py-4 flex items-center justify-center gap-2.5 text-[#9a8c7a] hover:border-[#d4af37] hover:text-[#d4af37] transition-all bg-[#faf7f2]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">Attach an image or video</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleMediaChange} className="hidden" />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          {isEarly && (
            <button onClick={onClose}
              className="px-5 py-3 border border-[#e8e0d0] text-[#6b5c4a] text-sm rounded-xl hover:border-[#b8a898] transition-all bg-[#faf7f2]">
              Stay
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || (!isReadingSprint && !currentWords)}
            className="flex-1 py-3 bg-[#2d3748] text-white text-sm font-semibold rounded-xl hover:bg-[#3d4f64] transition-all disabled:opacity-40"
          >
            {submitting ? "Saving…" : isEarly ? "Check out" : "Check out & share"}
          </button>
        </div>

        {!isEarly && (
          <p className="text-[11px] text-[#c4bdb4] text-center">You'll be taken to share a snippet after this.</p>
        )}
      </div>
    </ModalShell>
  );
}