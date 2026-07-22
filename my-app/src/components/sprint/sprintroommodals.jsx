import { useState, useEffect } from "react";
import API_URL from "@/config/api";

function formatCountdown(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Shared modal shell ─────────────────────────────────────────────────────
// Matches the Write page's palette: cream card, gold accent, slate text.
function ModalShell({ icon, title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#faf7f2] rounded-2xl shadow-2xl border border-[#e8dcc8] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#e8dcc8]">
          <div className="w-9 h-9 rounded-xl bg-[#2d3748] text-[#d4af37] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#2d3748] truncate">{title}</p>
            {subtitle && <p className="text-xs text-[#9a8c7a] truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Start Sprint modal ──────────────────────────────────────────────────────
// Starts the room's group sprint (POST /sprint/startGroupSprint). Only ever
// shown when the room has no active sprint — the page gates this via
// currentGroupSprint being null before it renders the trigger button.
const DURATIONS = [1, 5, 10, 15, 20, 25, 30, 45, 60];

export function StartRoomSprintModal({ isOpen, onClose, onStarted, sprintIsLive, sprintRemainingMs, onJoinInstead, startWords = 0 }) {
  const [duration, setDuration] = useState(25);
  const [sprintType, setSprintType] = useState("WRITING");
  const [soundscapes, setSoundscapes] = useState([]);
  const [soundscapesLoading, setSoundscapesLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null); // null = silence
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setSoundscapesLoading(true);
    fetch(`${API_URL}/soundscapes`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { soundscapes: [] }))
      .then((d) => setSoundscapes(d.soundscapes || []))
      .catch(() => setSoundscapes([]))
      .finally(() => setSoundscapesLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // Someone else was faster — don't let this member spin up a second,
  // competing sprint. Point them at the one that's already running instead.
  if (sprintIsLive) {
    return (
      <ModalShell
        title="Someone beat you to it"
        subtitle="A sprint already just started here"
        onClose={onClose}
        icon={
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }>
        <p className="text-sm text-[#7a6a50] leading-relaxed mb-5 text-center">
          A fellow writer in the room already kicked off a sprint. Jump into theirs instead of starting a second one.
        </p>
        <button
          onClick={onJoinInstead}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#d4af37] to-[#e8c766] text-[#2d3748] rounded-xl text-sm font-bold hover:brightness-105 transition-all">
          Join Sprint with Soundscape{typeof sprintRemainingMs === "number" ? ` · ${formatCountdown(sprintRemainingMs)}` : ""}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 py-2.5 border border-[#e8dcc8] text-[#7a6a50] rounded-xl text-xs font-semibold hover:border-[#c9b090] transition-all">
          Not right now
        </button>
      </ModalShell>
    );
  }

  async function handleStart() {
    setBusy(true); setError(null);
    try {
      const startRes = await fetch(`${API_URL}/sprint/startGroupSprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ duration, sprintType }),
      });
      const startData = await startRes.json().catch(() => ({}));
      if (!startRes.ok) throw new Error(startData.message || "Couldn't start the sprint.");
      const groupSprint = startData.groupSprint;

      // Starting a sprint as the host also joins it — no separate "join"
      // step needed. If this second call fails, the sprint still started
      // (other writers can join it), so we surface a softer message rather
      // than treating the whole action as failed.
      let sprint = null;
      try {
        const joinRes = await fetch(`${API_URL}/sprint/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ groupSprintId: groupSprint.id, startWords, soundscapeId: selectedId }),
        });
        const joinData = await joinRes.json().catch(() => ({}));
        if (joinRes.ok) sprint = joinData.sprint;
      } catch {}

      onStarted?.(groupSprint, sprint);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title="Start a sprint"
      subtitle="You'll join it too — everyone else can jump in once it starts"
      onClose={onClose}
      icon={
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }>
      <p className="text-xs font-semibold text-[#9a8c7a] uppercase tracking-wider mb-2">Minutes</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
              duration === d
                ? "bg-[#2d3748] text-white border-[#2d3748]"
                : "border-[#e8dcc8] text-[#7a6a50] hover:border-[#c9b090]"
            }`}>
            {d}
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold text-[#9a8c7a] uppercase tracking-wider mb-2">Type</p>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {["WRITING", "READING"].map((t) => (
          <button
            key={t}
            onClick={() => setSprintType(t)}
            className={`py-2 rounded-lg text-sm font-semibold border capitalize transition-all ${
              sprintType === t
                ? "bg-[#2d3748] text-white border-[#2d3748]"
                : "border-[#e8dcc8] text-[#7a6a50] hover:border-[#c9b090]"
            }`}>
            {t.toLowerCase()}
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold text-[#9a8c7a] uppercase tracking-wider mb-2">Soundscape</p>
      <div className="max-h-40 overflow-y-auto -mx-1 px-1 space-y-1.5 mb-5">
        <button
          onClick={() => setSelectedId(null)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all ${
            selectedId === null ? "border-[#2d3748] bg-[#2d3748]/5" : "border-[#e8dcc8] hover:border-[#c9b090]"
          }`}>
          <div className="w-7 h-7 rounded-lg bg-[#f0e8d8] flex items-center justify-center flex-shrink-0 text-[#7a6a50]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M9 9l6 6m0-6l-6 6" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#2d3748]">Silence</span>
          {selectedId === null && <CheckDot />}
        </button>
        {soundscapesLoading ? (
          <p className="text-xs text-[#9a8c7a] text-center py-3">Loading soundscapes…</p>
        ) : (
          soundscapes.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all ${
                selectedId === s.id ? "border-[#2d3748] bg-[#2d3748]/5" : "border-[#e8dcc8] hover:border-[#c9b090]"
              }`}>
              <div className="w-7 h-7 rounded-lg bg-[#f0e8d8] flex items-center justify-center flex-shrink-0 text-[#7a6a50]">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm12-3a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2d3748] truncate">{s.name}</p>
                {s.creatorName && <p className="text-[11px] text-[#9a8c7a] truncate">by {s.creatorName}</p>}
              </div>
              {selectedId === s.id && <CheckDot />}
            </button>
          ))
        )}
      </div>

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      <button
        onClick={handleStart}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#d4af37] to-[#e8c766] text-[#2d3748] rounded-xl text-sm font-bold hover:brightness-105 transition-all disabled:opacity-60">
        {busy ? "Starting…" : "Start & Join Sprint"}
      </button>
    </ModalShell>
  );
}

// ─── Join Sprint modal (soundscape picker) ──────────────────────────────────
export function JoinSprintModal({ isOpen, onClose, groupSprintId, startWords = 0, onJoined }) {
  const [soundscapes, setSoundscapes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null); // null = silence
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_URL}/soundscapes`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { soundscapes: [] }))
      .then((d) => setSoundscapes(d.soundscapes || []))
      .catch(() => setSoundscapes([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleJoin() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ groupSprintId, startWords, soundscapeId: selectedId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't join the sprint.");
      onJoined?.(data.sprint);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title="Join sprint with soundscape"
      subtitle="Pick an ambient sound to write to, or go quiet"
      onClose={onClose}
      icon={
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm12-3a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      }>
      <div className="max-h-64 overflow-y-auto -mx-1 px-1 space-y-1.5 mb-4">
        {/* Silence — always first, always available */}
        <button
          onClick={() => setSelectedId(null)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
            selectedId === null ? "border-[#2d3748] bg-[#2d3748]/5" : "border-[#e8dcc8] hover:border-[#c9b090]"
          }`}>
          <div className="w-8 h-8 rounded-lg bg-[#f0e8d8] flex items-center justify-center flex-shrink-0 text-[#7a6a50]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M9 9l6 6m0-6l-6 6" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#2d3748]">Silence</span>
          {selectedId === null && <CheckDot />}
        </button>

        {loading ? (
          <p className="text-xs text-[#9a8c7a] text-center py-4">Loading soundscapes…</p>
        ) : (
          soundscapes.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                selectedId === s.id ? "border-[#2d3748] bg-[#2d3748]/5" : "border-[#e8dcc8] hover:border-[#c9b090]"
              }`}>
              <div className="w-8 h-8 rounded-lg bg-[#f0e8d8] flex items-center justify-center flex-shrink-0 text-[#7a6a50]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm12-3a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2d3748] truncate">{s.name}</p>
                {s.creatorName && <p className="text-[11px] text-[#9a8c7a] truncate">by {s.creatorName}</p>}
              </div>
              {selectedId === s.id && <CheckDot />}
            </button>
          ))
        )}
      </div>

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      <button
        onClick={handleJoin}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#d4af37] to-[#e8c766] text-[#2d3748] rounded-xl text-sm font-bold hover:brightness-105 transition-all disabled:opacity-60">
        {busy ? "Joining…" : "Join Sprint with Soundscape"}
      </button>
    </ModalShell>
  );
}

function CheckDot() {
  return (
    <div className="ml-auto w-5 h-5 rounded-full bg-[#2d3748] text-[#d4af37] flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

// ─── Sprint summary modal ────────────────────────────────────────────────────
// Shown when a member's sprint ends (naturally or via early leave). Reports
// words written this sprint alongside the draft's running total, then offers
// exactly two choices: start/join another timed sprint, or keep writing here
// untimed. Once "Keep writing here" is picked, the room's top bar (not this
// modal) offers "Go to draft" / "Start a new sprint" / "Log progress" — see
// the free-writing toolbar in sprintroompage.jsx.
export function SprintSummaryModal({
  isOpen, onClose,
  wordsWritten = 0, draftTotalWords = 0,
  sprintIsLive, sprintRemainingMs,
  onStartNew, onJoinExisting, onKeepWriting,
}) {
  if (!isOpen) return null;

  return (
    <ModalShell
      title="Sprint complete"
      subtitle="Here's what you wrote this session"
      onClose={onClose}
      icon={
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl bg-[#faf7f2] border border-[#e8dcc8] p-4 text-center">
          <p className="text-2xl font-extrabold text-[#2d3748] tabular-nums">{wordsWritten.toLocaleString()}</p>
          <p className="text-[11px] text-[#9a8c7a] mt-1 leading-tight">words this sprint</p>
        </div>
        <div className="rounded-xl bg-[#faf7f2] border border-[#e8dcc8] p-4 text-center">
          <p className="text-2xl font-extrabold text-[#2d3748] tabular-nums">{draftTotalWords.toLocaleString()}</p>
          <p className="text-[11px] text-[#9a8c7a] mt-1 leading-tight">total in draft</p>
        </div>
      </div>

      <button
        onClick={sprintIsLive ? onJoinExisting : onStartNew}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#d4af37] to-[#e8c766] text-[#2d3748] rounded-xl text-sm font-bold hover:brightness-105 transition-all">
        {sprintIsLive ? (
          `Join Sprint with Soundscape · ${formatCountdown(sprintRemainingMs)}`
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Another Sprint
          </>
        )}
      </button>
      <button
        onClick={onKeepWriting}
        className="w-full mt-2 py-2.5 border border-[#e8dcc8] text-[#7a6a50] rounded-xl text-xs font-semibold hover:border-[#c9b090] transition-all">
        Keep writing here
      </button>
    </ModalShell>
  );
}

// ─── Writer status picker ────────────────────────────────────────────────────
// Small pill dropdown a writer uses to set their own "what I'm doing" flag.
// Purely self-reported and display-only — no gating logic depends on it.
const STATUS_OPTIONS = [
  { value: null, label: "Set status" },
  { value: "DRAFTING", label: "Drafting", color: "#4a7c59" },
  { value: "EDITING", label: "Editing", color: "#c17817" },
  { value: "OUTLINING", label: "Outlining", color: "#5b6ee1" },
];

export function statusMeta(value) {
  return STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0];
}

export function WriterStatusPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta(value);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all"
        style={{
          borderColor: value ? meta.color : "#e8dcc8",
          color: value ? meta.color : "#9a8c7a",
          backgroundColor: value ? `${meta.color}14` : "transparent",
        }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: value ? meta.color : "#c9b090" }} />
        {meta.label}
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-[#e8dcc8] py-1 w-36 overflow-hidden">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#2d3748] hover:bg-[#f0e8d8] transition-all text-left">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color || "#c9b090" }} />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Draft switcher modal ────────────────────────────────────────────────────
// Create a new draft or switch which draft you're sprinting on, without
// leaving the room. Mirrors the Write page's EntriesSidebar list but as a
// modal, since the room has no room for a persistent sidebar.
export function SprintRoomDraftModal({ isOpen, onClose, activeDraftId, onSelect, onCreateNew }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_URL}/drafts/sprint-picker`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { drafts: [] }))
      .then((d) => setDrafts(d.drafts || []))
      .catch(() => setDrafts([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = drafts.filter((d) =>
    (d.title || "Untitled").toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <ModalShell
      title="Your drafts"
      subtitle="Pick what to work on in this room"
      onClose={onClose}
      icon={
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-6 4h6m2 5H7a2 2 0 01-2-2V4a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V20a2 2 0 01-2 2z" />
        </svg>
      }>
      <button
        onClick={() => { onCreateNew(); onClose(); }}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-3 bg-[#d4af37] hover:brightness-105 text-[#2d3748] rounded-lg text-sm font-bold transition-all">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        New draft
      </button>

      <div className="relative mb-2">
        <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b8a898]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 114 10.5a6.5 6.5 0 0113 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drafts…"
          className="w-full pl-8 pr-2 py-1.5 text-xs bg-[#f0e8d8] text-[#2d3748] placeholder-[#b8a898] rounded-lg focus:outline-none transition-all"
        />
      </div>

      <div className="max-h-56 overflow-y-auto -mx-1 px-1 space-y-0.5">
        {loading ? (
          <p className="text-xs text-[#9a8c7a] text-center py-4">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#9a8c7a] text-center py-4">No drafts found.</p>
        ) : (
          filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => { onSelect(d.id); onClose(); }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                d.id === activeDraftId ? "bg-[#2d3748] text-white" : "hover:bg-[#f0e8d8] text-[#2d3748]"
              }`}>
              <p className="text-sm font-medium truncate">{d.title || "Untitled"}</p>
              <p className={`text-[10px] mt-0.5 ${d.id === activeDraftId ? "text-white/60" : "text-[#9a8c7a]"}`}>
                {(d.wordCount || 0).toLocaleString()} words
              </p>
            </button>
          ))
        )}
      </div>
    </ModalShell>
  );
}