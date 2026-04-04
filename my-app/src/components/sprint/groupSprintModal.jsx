import { useState, useEffect } from "react";
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
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mt-3">
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

// Soundscapes are now fetched from the DB per-member — no hardcoded list here

// ─── START GROUP SPRINT MODAL ─────────────────────────────────
export function StartGroupSprintModal({ isOpen, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState(25);
  const [checkin, setCheckin] = useState("");
  const [startWordCount, setStartWordCount] = useState("");
  const [soundscapeId, setSoundscapeId] = useState(null);
  const [soundscapes, setSoundscapes] = useState([]);
  const [loadingSoundscapes, setLoadingSoundscapes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [groupSprint, setGroupSprint] = useState(null);

  // Fetch approved soundscapes when modal opens
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
    setStep(1); setDuration(25); setSoundscapeId(null);
    setCheckin(""); setStartWordCount(""); setError(null); setGroupSprint(null);
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
        body: JSON.stringify({ duration }),
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
          checkin: checkin.trim() || null,
          startWords: startWordCount ? Number(startWordCount) : 0,
          soundscapeId: soundscapeId || null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-[#2d3748] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#d4af37] uppercase tracking-widest font-medium mb-0.5">
              {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
            <h2 className="text-xl font-serif text-white">
              {step === 1 ? "Open the Shop" : "Your Check-in"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${step >= 1 ? "bg-[#d4af37]" : "bg-white/30"}`} />
            <div className={`w-2 h-2 rounded-full ${step >= 2 ? "bg-[#d4af37]" : "bg-white/30"}`} />
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleCreateGroup} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-3">Sprint duration</label>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((dur) => (
                  <button key={dur.value} type="button" onClick={() => setDuration(dur.value)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${duration === dur.value ? "border-[#d4af37] bg-amber-50" : "border-gray-200 hover:border-[#2d3748]"}`}>
                    <div className={`text-base font-bold ${duration === dur.value ? "text-[#2d3748]" : "text-gray-500"}`}>{dur.value}m</div>
                    <div className={`text-xs mt-0.5 ${duration === dur.value ? "text-[#2d3748]" : "text-gray-400"}`}>{dur.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <ErrorBanner message={error} />
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={handleClose} className="flex-1 py-3 border-2 border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:border-[#2d3748] transition-all">Cancel</button>
              <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <><Spinner /> Creating...</> : "Continue →"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleHostCheckin} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#d4af37]">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Your session</p>
              <p className="text-sm text-[#2d3748] font-medium">{groupSprint?.duration} min</p>
              <p className="text-xs text-gray-400 mt-1">Share the link so others can join</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-2">
                What are you writing today? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea value={checkin} onChange={(e) => setCheckin(e.target.value)}
                placeholder="e.g. Chapter 12 — the confrontation scene..." rows={3} maxLength={200}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] text-[#2d3748] placeholder-gray-400 text-sm resize-none transition-all bg-gray-50" />
              <p className="mt-1 text-xs text-gray-400 text-right">{checkin.length}/200</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-1">
                Starting word count <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">We'll use this to calculate how many words you write.</p>
              <input type="number" value={startWordCount} onChange={(e) => setStartWordCount(e.target.value)}
                placeholder="e.g. 3400" min={0}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] text-[#2d3748] placeholder-gray-400 text-sm transition-all bg-gray-50" />
            </div>

            {/* ── Per-member soundscape picker ── */}
            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-1">
                🎵 Your soundscape <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">Pick an ambient sound to write to. Only you hear it.</p>
              {loadingSoundscapes ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2"><Spinner /> Loading sounds...</div>
              ) : soundscapes.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No soundscapes available yet — check back soon.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                  {/* None option */}
                  <button type="button" onClick={() => setSoundscapeId(null)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${soundscapeId === null ? "border-[#d4af37] bg-amber-50" : "border-gray-200 hover:border-[#2d3748]"}`}>
                    <span className="text-xl">🔇</span>
                    <div>
                      <p className={`text-sm font-medium ${soundscapeId === null ? "text-[#2d3748]" : "text-gray-600"}`}>None — write in silence</p>
                    </div>
                  </button>
                  {soundscapes.map((s) => (
                    <button key={s.id} type="button" onClick={() => setSoundscapeId(s.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${soundscapeId === s.id ? "border-[#d4af37] bg-amber-50" : "border-gray-200 hover:border-[#2d3748]"}`}>
                      <span className="text-xl">🎵</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${soundscapeId === s.id ? "text-[#2d3748]" : "text-gray-600"}`}>{s.name}</p>
                        {s.creatorName && <p className="text-xs text-gray-400 truncate">by {s.creatorName}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ErrorBanner message={error} />
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setStep(1); setError(null); }} className="px-5 py-3 border-2 border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:border-[#2d3748] transition-all">← Back</button>
              <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <><Spinner /> Starting...</> : "Open the Shop ☕"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── JOIN GROUP SPRINT MODAL ──────────────────────────────────
export function JoinGroupSprintModal({ onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [activeSprints, setActiveSprints] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [checkin, setCheckin] = useState("");
  const [startWordCount, setStartWordCount] = useState("");
  const [soundscapeId, setSoundscapeId] = useState(null);
  const [soundscapes, setSoundscapes] = useState([]);
  const [loadingSoundscapes, setLoadingSoundscapes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Fetch soundscapes when moving to step 2
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
    setCheckin(""); setStartWordCount(""); setSoundscapeId(null); setError(null);
    onClose();
  }

  async function handleJoin(e) {
    e.preventDefault(); setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sprint/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupSprintId: selectedSprint.id,
          checkin: checkin.trim() || null,
          startWords: startWordCount ? Number(startWordCount) : 0,
          soundscapeId: soundscapeId || null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#2d3748] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#d4af37] uppercase tracking-widest font-medium mb-0.5">
              {step === 1 ? "Active sessions" : "Your check-in"}
            </p>
            <h2 className="text-xl font-serif text-white">
              {step === 1 ? "Enter the Shop" : `Joining @${selectedSprint?.user?.username}'s sprint`}
            </h2>
          </div>
          <button onClick={handleClose} className="text-white/50 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {step === 1 && (
          <div className="p-6">
            {loadingRooms ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm"><Spinner /> Loading active rooms...</div>
            ) : activeSprints.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-3">☕</p>
                <p className="font-serif text-[#2d3748] text-lg mb-1">No active sprints right now</p>
                <p className="text-sm text-gray-400 mb-5">Check Discord for the next session.</p>
                <button onClick={handleClose} className="text-sm text-gray-400 hover:text-[#2d3748] transition-colors">Close</button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 mb-4">{activeSprints.length} active session{activeSprints.length !== 1 ? "s" : ""} — pick one to join</p>
                {activeSprints.map((gs) => {
                  const alreadyJoined = user && gs.sprints?.some(
                    (s) => Number(s.userId) === Number(user.id) && s.isActive !== false
                  );
                  return (
                    <button key={gs.id}
                      onClick={() => {
                        if (alreadyJoined) { handleClose(); navigate(`/group-sprint/${gs.id}`); }
                        else { setSelectedSprint(gs); setStep(2); }
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all group ${
                        alreadyJoined ? "border-[#d4af37] bg-amber-50 hover:bg-amber-100" : "border-gray-200 hover:border-[#d4af37] hover:bg-amber-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
                            </span>
                            <span className="text-xs text-gray-400">· @{gs.user?.username} · {gs.duration} min</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{gs._count?.sprints || 0} writer{(gs._count?.sprints || 0) !== 1 ? "s" : ""} inside</p>
                        </div>
                        {alreadyJoined ? (
                          <span className="text-xs font-semibold text-[#d4af37] flex-shrink-0 flex items-center gap-1">✓ Joined · Continue writing →</span>
                        ) : (
                          <span className="text-gray-300 group-hover:text-[#d4af37] text-xl transition-colors flex-shrink-0">→</span>
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
          <form onSubmit={handleJoin} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#d4af37]">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Joining</p>
              <p className="text-sm text-[#2d3748] font-medium">@{selectedSprint.user?.username}'s sprint · {selectedSprint.duration} min</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-2">
                What are you writing today? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea value={checkin} onChange={(e) => setCheckin(e.target.value)}
                placeholder="e.g. Blog post about slow living..." rows={3} maxLength={200}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] text-[#2d3748] placeholder-gray-400 text-sm resize-none transition-all bg-gray-50" />
              <p className="mt-1 text-xs text-gray-400 text-right">{checkin.length}/200</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-1">
                Starting word count <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="number" value={startWordCount} onChange={(e) => setStartWordCount(e.target.value)}
                placeholder="e.g. 3400" min={0}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] text-[#2d3748] placeholder-gray-400 text-sm transition-all bg-gray-50" />
            </div>

            {/* ── Per-member soundscape picker ── */}
            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-1">
                🎵 Your soundscape <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">Pick an ambient sound to write to. Only you hear it.</p>
              {loadingSoundscapes ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2"><Spinner /> Loading sounds...</div>
              ) : soundscapes.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No soundscapes available yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                  <button type="button" onClick={() => setSoundscapeId(null)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${soundscapeId === null ? "border-[#d4af37] bg-amber-50" : "border-gray-200 hover:border-[#2d3748]"}`}>
                    <span className="text-xl">🔇</span>
                    <p className={`text-sm font-medium ${soundscapeId === null ? "text-[#2d3748]" : "text-gray-600"}`}>None — write in silence</p>
                  </button>
                  {soundscapes.map((s) => (
                    <button key={s.id} type="button" onClick={() => setSoundscapeId(s.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${soundscapeId === s.id ? "border-[#d4af37] bg-amber-50" : "border-gray-200 hover:border-[#2d3748]"}`}>
                      <span className="text-xl">🎵</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${soundscapeId === s.id ? "text-[#2d3748]" : "text-gray-600"}`}>{s.name}</p>
                        {s.creatorName && <p className="text-xs text-gray-400 truncate">by {s.creatorName}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ErrorBanner message={error} />
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setStep(1); setError(null); }} className="px-5 py-3 border-2 border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:border-[#2d3748] transition-all">← Back</button>
              <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <><Spinner /> Joining...</> : "Enter the Shop ☕"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── RE-ENTER MODAL ───────────────────────────────────────────
export function ReEnterShopModal({ isOpen, onClose, onEnter, groupSprint }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-[#2d3748] px-6 py-5">
          <p className="text-xs text-[#d4af37] uppercase tracking-widest font-medium mb-0.5">Welcome back ✍️</p>
          <h2 className="text-xl font-serif text-white">Your seat is still warm</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-sm text-[#2d3748] leading-relaxed">
              You already checked in to this sprint — no need to fill out the form again. Just jump back in and keep writing.
            </p>
            <p className="text-xs text-gray-400 mt-2">{groupSprint?.duration} min session</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-3 border-2 border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:border-[#2d3748] transition-all">Leave</button>
            <button onClick={onEnter} className="flex-1 py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all">Continue writing ✍️</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CHECKOUT MODAL ───────────────────────────────────────────
// isEarly=false → navigates to /snippets/share (full page) after
//   checkout so the user can share their post-sprint reflection.
// isEarly=true  → just calls onSubmit and stays (no redirect).
export function CheckoutModal({ isOpen, onClose, onSubmit, sprintId, isEarly = false }) {
  const navigate = useNavigate();
  const [currentWords, setCurrentWords] = useState("");
  const [snippet, setSnippet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [capturedSprintId, setCapturedSprintId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentWords(""); setError(""); setSubmitting(false);
      if (sprintId) setCapturedSprintId(sprintId);
    }
  }, [isOpen, sprintId]);

  useEffect(() => {
    if (sprintId && !capturedSprintId) setCapturedSprintId(sprintId);
  }, [sprintId, capturedSprintId]);

  if (!isOpen) return null;

  const effectiveId = capturedSprintId || sprintId;

  async function handleSubmit() {
    const val = parseInt(currentWords, 10);
    if (isNaN(val) || val < 0) { setError("Please enter a valid word count (0 or more)."); return; }
    if (!effectiveId) { setError("Still loading your session — please wait a moment and try again."); return; }
    setSubmitting(true); setError("");
    try {
      const checkoutPromise = fetch(`${API_URL}/sprint/${effectiveId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentWordCount: val }),
      });

      const snippetPromise = snippet.trim()
        ? fetch(`${API_URL}/snippets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ context: snippet.trim() }),
          })
        : Promise.resolve(null);

      const [res, snippetRes] = await Promise.all([checkoutPromise, snippetPromise]);

      if (!res.ok) throw new Error("Checkout failed");
      if (snippetRes && !snippetRes.ok) throw new Error("Snippet save failed");

      onSubmit(); // notify parent (marks hasCheckedOut in workspace)

      if (!isEarly) {
        navigate("/snippets/share", { state: { fromSprint: true } });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <p className="text-4xl mb-3">{isEarly ? "✍️" : "🏁"}</p>
        <h3 className="font-serif text-[#2d3748] text-xl mb-1">
          {isEarly ? "Leaving early?" : "Sprint complete!"}
        </h3>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          {isEarly
            ? "No worries — enter your current word count before you go."
            : "Every word counts. Enter your current word count, then share a snippet of what you wrote today 🌱"}
        </p>
        <div className="text-left mb-4">
          <label className="text-xs font-medium text-[#2d3748] mb-1.5 block">How's your writing today</label>
          <input type="text"
            onChange={(e) => setSnippet(e.target.value)}
            placeholder="Any win or struggle" autoFocus
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-[#2d3748] focus:outline-none focus:border-[#2d3748] transition-colors" />
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        </div>
        <div className="text-left mb-4">
          <label className="text-xs font-medium text-[#2d3748] mb-1.5 block">Current word count</label>
          <input type="number" min="0" value={currentWords}
            onChange={(e) => setCurrentWords(e.target.value)}
            placeholder="e.g. 1240" autoFocus
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-[#2d3748] focus:outline-none focus:border-[#2d3748] transition-colors" />
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        </div>
        <div className="flex gap-3">
          {isEarly && (
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-500 text-sm rounded-xl hover:border-gray-300 transition-all">Stay</button>
          )}
          <button onClick={handleSubmit} disabled={submitting || !currentWords}
            className="flex-1 py-3 bg-[#2d3748] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-40">
            {submitting ? "Saving..." : isEarly ? "Check out ✓" : "Check out & share ✨"}
          </button>
        </div>
        {!isEarly && <p className="text-[10px] text-gray-400 mt-3">You'll be taken to share a snippet after this.</p>}
      </div>
    </div>
  );
}