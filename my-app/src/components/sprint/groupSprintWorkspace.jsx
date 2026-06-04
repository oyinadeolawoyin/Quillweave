import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";
import { CheckoutModal } from "./groupSprintModal";
import { Room, Track } from "livekit-client";
import {
  ThesaurusDrawer,
  WriteEditor,
  countWords,
} from "../drafts/writeeditorshared"; // ← shared components

// ─── Constants ────────────────────────────────────────────────────────────────
const LIVEKIT_URL    = import.meta.env.VITE_LIVEKIT_URL;
const POLL_INTERVAL  = 8000;
const DC_SOUNDSCAPE  = "sc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(username = "") { return username.slice(0, 2).toUpperCase(); }

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function playRing() {
  try { const a = new Audio("/notification.mp3"); a.volume = 0.7; a.play().catch(() => {}); } catch {}
}

function encodeMsg(obj) { return new TextEncoder().encode(JSON.stringify(obj)); }

// ─── Soundscape hook ───────────────────────────────────────────────────────────

function useSoundscape(fileUrl, isActive) {
  const audioRef = useRef(null);
  const [muted,   setMuted]   = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!fileUrl || !isActive) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(fileUrl);
      audioRef.current.loop   = true;
      audioRef.current.volume = 0.35;
    }
    audioRef.current.play().then(() => setStarted(true)).catch(() => setStarted(false));
    return () => { audioRef.current?.pause(); };
  }, [fileUrl, isActive]);

  useEffect(() => { if (!isActive && audioRef.current) audioRef.current.pause(); }, [isActive]);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted; }, [muted]);

  return { muted, setMuted, started, setStarted, audioRef };
}

// ─── Timer pill ───────────────────────────────────────────────────────────────

function TimerPill({ secondsLeft, ended, large = false }) {
  const urgent = !ended && secondsLeft < 60;
  if (large) {
    return (
      <div className={`inline-flex items-center gap-2 tabular-nums font-mono font-black rounded-2xl px-6 py-3 text-3xl tracking-tight transition-all ${
        ended  ? "text-emerald-700 bg-emerald-50 border border-emerald-200" :
        urgent ? "text-red-600 bg-red-50 border border-red-200 animate-pulse" :
                 "text-[#2d3748] bg-[#fffbf0] border border-[#f0d98a]"
      }`}>
        {ended ? "✓ Done" : formatTime(secondsLeft)}
      </div>
    );
  }
  return (
    <span className={`tabular-nums font-mono text-sm font-bold px-2.5 py-1 rounded-lg transition-all ${
      ended  ? "text-emerald-700 bg-emerald-50" :
      urgent ? "text-red-600 bg-red-50 animate-pulse" :
               "text-[#7a6a50] bg-[#f0e8d8]"
    }`}>
      {ended ? "Done" : formatTime(secondsLeft)}
    </span>
  );
}

// ─── Writer avatar pill ───────────────────────────────────────────────────────

function WriterPill({ sprint, isHost, isMe }) {
  return (
    <Link to={`/profile/${sprint.user?.id}`}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:opacity-80 ${
        isMe ? "bg-[#fffbf0] border-[#f0d98a]" : "bg-white border-[#e8dcc8]"
      }`}>
      {sprint.user?.avatar
        ? <img src={sprint.user.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
        : <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${isHost ? "bg-[#d4af37] text-[#2d3748]" : "bg-[#2d3748] text-white"}`}>
            {getInitials(sprint.user?.username)}
          </div>
      }
      <span className="text-xs text-[#5a4a30] font-medium">@{sprint.user?.username}</span>
      {isHost && <span className="text-[10px] text-[#b8962e]">host</span>}
      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
    </Link>
  );
}

// ─── Writers sidebar ──────────────────────────────────────────────────────────

function WritersSidebar({ sprints, groupSprint, user }) {
  const active = sprints.filter(s => s.isActive);
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[#e8dcc8]">
        <p className="text-xs font-semibold text-[#9a8a70] uppercase tracking-wider">
          {active.length} writer{active.length !== 1 ? "s" : ""} in the room
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {active.length === 0 ? (
          <p className="text-xs text-[#b8a898] text-center py-6">No one here yet</p>
        ) : active.map(s => {
          const isHost = Number(s.userId) === Number(groupSprint?.userId);
          const isMe   = Number(s.userId) === Number(user?.id);
          return (
            <div key={s.id} className={`rounded-xl border p-3 space-y-1 transition-all ${isMe ? "bg-[#fffbf0] border-[#f0d98a]" : "bg-white border-[#e8dcc8]"}`}>
              <div className="flex items-center gap-2">
                {s.user?.avatar
                  ? <img src={s.user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                  : <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${isHost ? "bg-[#d4af37] text-[#2d3748]" : "bg-[#2d3748] text-white"}`}>
                      {getInitials(s.user?.username)}
                    </div>
                }
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#2d3748] truncate">@{s.user?.username}</span>
                    {isHost && <span className="text-[10px] text-[#b8962e] font-medium">host</span>}
                    {isMe   && <span className="text-[10px] text-[#6b9e6b] font-medium">you</span>}
                  </div>
                </div>
              </div>
              {s.checkin && (
                <p className="text-xs text-[#7a6a50] leading-relaxed pl-9 italic line-clamp-2">"{s.checkin}"</p>
              )}
              {s.soundscape && (
                <p className="text-[10px] text-[#b8a898] pl-9">🎵 {s.soundscape.name}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Drafts picker modal ──────────────────────────────────────────────────────

function DraftsPickerModal({ isOpen, currentDraftId, onSelect, onClose }) {
  const [drafts,  setDrafts]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_URL}/drafts/sprint-picker`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { drafts: [] })
      .then(d => setDrafts(d.drafts || []))
      .catch(() => setDrafts([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[70dvh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#e8e0d0] flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-[#9a8c7a] uppercase tracking-wider font-semibold">Switch draft</p>
            <p className="text-sm font-semibold text-[#2d3748]">Your drafts</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#f4f1ec] flex items-center justify-center text-[#9a8c7a] hover:text-[#2d3748] transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-[#9a8c7a]">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              Loading…
            </div>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-[#9a8c7a] text-center py-8">No drafts yet.</p>
          ) : drafts.map(d => (
            <button key={d.id} onClick={() => onSelect(d)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                d.id === currentDraftId ? "border-[#d4af37] bg-[#fffbf0]" : "border-[#e8e0d0] hover:border-[#d4af37] hover:bg-[#fffbf0] bg-[#faf7f2]"
              }`}>
              <p className={`text-sm font-semibold truncate ${d.id === currentDraftId ? "text-[#2d3748]" : "text-[#5a4a30]"}`}>
                {d.title || <span className="italic font-normal text-[#9a8c7a]">Untitled</span>}
              </p>
              <p className="text-xs text-[#9a8c7a] mt-0.5">
                {(d.wordCount || 0).toLocaleString()} words
                {d.id === currentDraftId && <span className="ml-2 text-[#d4af37] font-medium">· current</span>}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sprint summary modal ─────────────────────────────────────────────────────

function SprintSummaryModal({ isOpen, wordsWritten, draftId, onSaveDraft, onClose, onContinueSprint }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="text-center space-y-2">
          <p className="text-4xl">🏁</p>
          <h2 className="text-xl font-serif text-[#2d3748]" style={{ fontFamily: "'Georgia', serif" }}>Sprint complete!</h2>
          <p className="text-sm text-[#9a8c7a]">Here's what you wrote this session.</p>
        </div>

        <div className="rounded-xl bg-[#faf7f2] border border-[#e8dcc8] p-4 text-center">
          <p className="text-4xl font-bold text-[#2d3748]" style={{ fontFamily: "'Georgia', serif" }}>
            {(wordsWritten || 0).toLocaleString()}
          </p>
          <p className="text-sm text-[#9a8c7a] mt-1">words written this sprint</p>
        </div>

        <div className="space-y-2">
          <button onClick={onSaveDraft}
            className="w-full py-3 bg-[#2d3748] text-white rounded-xl text-sm font-semibold hover:bg-[#3d4f64] transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Save & go to drafts
          </button>
          <button onClick={onContinueSprint}
            className="w-full py-2.5 border-2 border-[#d4af37] text-[#9a6f00] bg-[#fffbf0] rounded-xl text-sm font-semibold hover:bg-[#fff8e0] transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Start another sprint
          </button>
          <button onClick={onClose}
            className="w-full py-2.5 border border-[#e8e0d0] text-[#6b5c4a] rounded-xl text-sm font-medium hover:border-[#b8a898] transition-all">
            Keep writing — stay in room
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main workspace component ─────────────────────────────────────────────────

export default function GroupSprintWorkspace() {
  const { groupSprintId } = useParams();
  const { user }          = useAuth();
  const navigate          = useNavigate();
  const location          = useLocation();

  const routeWritingMode = location.state?.writingMode || null;
  const routeDraftId     = location.state?.draftId     || null;

  // Sprint data
  const [groupSprint, setGroupSprint] = useState(null);
  const [sprints,     setSprints]     = useState([]);
  const [mySprint,    setMySprint]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // Timer
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sprintEnded, setSprintEnded] = useState(false);
  const timerRef  = useRef(null);
  const ringFired = useRef(false);

  // Checkout
  const [showCheckout,      setShowCheckout]      = useState(false);
  const [showEarlyCheckout, setShowEarlyCheckout] = useState(false);
  const hasCheckedOut = mySprint && !mySprint.isActive;

  // UI mode
  const [writeMode,       setWriteMode]       = useState(routeWritingMode === "inkwell");
  const [activeDraftId,   setActiveDraftId]   = useState(routeDraftId);
  const [focusMode,       setFocusMode]       = useState(false);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [thesaurusOpen,   setThesaurusOpen]   = useState(false);
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);

  // Word tracking — currentWordCount is updated live from the WriteEditor
  const [currentWordCount,  setCurrentWordCount]  = useState(0);
  const startWordsRef = useRef(null); // baseline word count when sprint started (set by onDraftLoaded)

  // Sprint summary
  const [showSummary,        setShowSummary]        = useState(false);
  const [sprintWordsWritten, setSprintWordsWritten] = useState(0);
  const [bannerDismissed,    setBannerDismissed]    = useState(false);

  // LiveKit
  const roomRef   = useRef(null);
  const lkJoined  = useRef(false);
  const [screenTracks,     setScreenTracks]     = useState({});
  const [soundscapeStates, setSoundscapeStates] = useState({});

  // Derived
  const isHost       = user && groupSprint && Number(user.id) === Number(groupSprint.userId);
  const mySoundscape = mySprint?.soundscape;
  const soundscapeState = useSoundscape(mySoundscape?.fileUrl || null, groupSprint?.isActive ?? false);

  const broadcastSoundscape = useCallback((muted) => {
    if (!roomRef.current) return;
    try { roomRef.current.localParticipant.publishData(encodeMsg({ type: DC_SOUNDSCAPE, muted }), { reliable: true }); }
    catch (e) { console.warn("[DC] broadcast failed:", e); }
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchGroupSprint = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sprint/${groupSprintId}`, { credentials: "include" });
      if (!res.ok) { setError("Sprint not found."); return; }
      const data = await res.json();
      setGroupSprint(data.groupSprint);
      setSprints(data.groupSprint.sprints || []);
    } catch { setError("Failed to load sprint."); }
    finally { setLoading(false); }
  }, [groupSprintId]);

  const fetchMySprint = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/sprint/loginUserSession`, { credentials: "include" });
      if (res.ok) { const data = await res.json(); setMySprint(data.sprint); }
    } catch {}
  }, [user]);

  useEffect(() => { fetchGroupSprint(); fetchMySprint(); }, [fetchGroupSprint, fetchMySprint]);

  // Auto-restore most recent draft when entering write mode with no draft selected
  useEffect(() => {
    if (!writeMode || activeDraftId) return;
    fetch(`${API_URL}/drafts/sprint-picker`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const drafts = data?.drafts || [];
        if (drafts.length > 0) setActiveDraftId(drafts[0].id);
      })
      .catch(() => {});
  }, [writeMode, activeDraftId]);

  // ── LiveKit ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupSprint?.isActive || !groupSprint?.liveKitRoomName) return;
    if (lkJoined.current) return;
    lkJoined.current = true;

    async function joinRoom() {
      try {
        if (!LIVEKIT_URL) { lkJoined.current = false; return; }
        const res = await fetch(`${API_URL}/sprint/${groupSprintId}/livekit-token`, { credentials: "include" });
        if (!res.ok) return;
        const { token } = await res.json();
        const room = new Room();
        roomRef.current = room;

        room.on("trackSubscribed", (track, _pub, participant) => {
          if (track.source === Track.Source.ScreenShare) setScreenTracks(p => ({ ...p, [participant.identity]: track }));
        });
        room.on("trackUnsubscribed", (track, _pub, participant) => {
          if (track.source === Track.Source.ScreenShare) setScreenTracks(p => { const n = { ...p }; delete n[participant.identity]; return n; });
        });
        room.on("dataReceived", (raw, participant) => {
          if (!participant) return;
          try {
            const msg = JSON.parse(new TextDecoder().decode(raw));
            if (msg.type === DC_SOUNDSCAPE) setSoundscapeStates(p => ({ ...p, [participant.identity]: msg.muted }));
            if (msg.type === "sc_request") broadcastSoundscape(soundscapeState.muted);
          } catch {}
        });
        room.on("participantConnected", () => broadcastSoundscape(soundscapeState.muted));
        await room.connect(LIVEKIT_URL, token);
        setTimeout(() => {
          broadcastSoundscape(soundscapeState.muted);
          try { roomRef.current.localParticipant.publishData(encodeMsg({ type: "sc_request" }), { reliable: true }); } catch {}
        }, 600);
      } catch (err) {
        console.error("[LiveKit] error:", err);
        lkJoined.current = false;
      }
    }
    joinRoom();
  }, [groupSprint?.liveKitRoomName, groupSprint?.isActive, groupSprintId, broadcastSoundscape]);

  useEffect(() => () => { if (roomRef.current) { roomRef.current.disconnect(); roomRef.current = null; } }, []);
  useEffect(() => {
    if (!roomRef.current || !groupSprint?.isActive) return;
    broadcastSoundscape(soundscapeState.muted);
  }, [soundscapeState.muted, broadcastSoundscape, groupSprint?.isActive]);

  // ── Poll ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupSprint?.isActive) return;
    const p = setInterval(() => { fetchGroupSprint(); fetchMySprint(); }, POLL_INTERVAL);
    return () => clearInterval(p);
  }, [groupSprint?.isActive, fetchGroupSprint, fetchMySprint]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupSprint?.isActive) return;
    const startedAt = new Date(groupSprint.startedAt).getTime();
    const endsAt    = startedAt + groupSprint.duration * 60 * 1000;

    function tick() {
      const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !sprintEnded) {
        setSprintEnded(true);
        if (!hasCheckedOut && !ringFired.current) {
          ringFired.current = true;
          playRing();

          // ── Calculate words written during this sprint ─────────────────
          // currentWordCount is the live count from WriteEditor's onWordsUpdate.
          // startWordsRef is set when the draft loads (onDraftLoaded) so we
          // correctly measure only words added *during* the sprint.
          const wordsNow   = currentWordCount;
          const startWords = startWordsRef.current ?? 0;
          const written    = Math.max(0, wordsNow - startWords);
          setSprintWordsWritten(written);

          const endSprint = async () => {
            if (isHost) {
              await fetch(`${API_URL}/sprint/${groupSprintId}/endGroupSprint`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                credentials: "include", body: JSON.stringify({}),
              }).catch(() => {});
              await fetchGroupSprint();
            }
            await fetchMySprint();
            if (writeMode) setShowSummary(true);
            else           setShowCheckout(true);
          };
          endSprint();
        }
      }
    }

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [groupSprint, sprintEnded, hasCheckedOut, isHost, groupSprintId, fetchGroupSprint, writeMode, currentWordCount]);

  // ── Auto-save handler ──────────────────────────────────────────────────────
  // Receives wordCount from the WriteEditor so the backend always gets the
  // correct count even when the content is HTML (not plain text).
  const handleAutoSave = useCallback(async ({ draftId, title, content, wordCount }) => {
    const body = {
      draftId:   draftId || undefined,
      title,
      content,
      // Pass wordCount if your sprint-save endpoint accepts it;
      // the backend draftService.sprintAutoSave will use it or recount from content.
      wordCount: wordCount ?? undefined,
    };
    const res = await fetch(`${API_URL}/drafts/sprint-save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Auto-save failed");
    const data = await res.json();
    if (!activeDraftId && data.draft?.id) setActiveDraftId(data.draft.id);
    return data.draft;
  }, [activeDraftId]);

  // ── Save & go to drafts ────────────────────────────────────────────────────
  async function handleSaveDraft() {
    setShowSummary(false);
    navigate("/drafts");
  }

  function handleContinueSprint() {
    setShowSummary(false);
    setSprintEnded(false);
    ringFired.current = false;
    startWordsRef.current = null;
    navigate("/");
  }

  function handleCheckedOut() {
    setShowCheckout(false);
    setShowEarlyCheckout(false);
    fetchMySprint();
    fetchGroupSprint();
  }

  // ── Guard renders ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f0e8" }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">☕</div>
          <p className="text-sm text-[#7a6a50] font-medium" style={{ fontFamily: "'Georgia', serif" }}>Setting the mood…</p>
        </div>
      </div>
    );
  }

  if (error || !groupSprint) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f0e8" }}>
        <div className="text-center">
          <p className="text-4xl mb-3">☕</p>
          <p className="text-[#2d3748] font-serif text-lg">{error || "Sprint not found."}</p>
          <button onClick={() => navigate("/")} className="mt-4 text-sm text-[#9a8a70] hover:text-[#2d3748] transition-colors">← Back home</button>
        </div>
      </div>
    );
  }

  const totalSeconds  = groupSprint.duration * 60;
  const activeWriters = sprints.filter(s => s.isActive).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#f5f0e8" }}>
      {!writeMode && <Header />}

      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 border-b border-[#e0d0b8]"
        style={{ background: "rgba(250,245,237,0.96)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-full px-4 sm:px-6 flex items-center justify-between h-12 gap-3">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            {groupSprint.isActive ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
              </span>
            ) : (
              <span className="text-xs text-[#7a6a50] bg-[#ede8df] border border-[#ddd0bb] px-2 py-0.5 rounded-full flex-shrink-0">Ended</span>
            )}

            {!focusMode && writeMode && (
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="flex items-center gap-1.5 text-xs text-[#7a6a50] hover:text-[#2d3748] transition-colors hidden lg:flex"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {activeWriters} writing
              </button>
            )}

            {!writeMode && (
              <span className="text-xs text-[#9a8a70] hidden sm:block font-medium">
                {activeWriters} writer{activeWriters !== 1 ? "s" : ""} · {groupSprint.duration} min
              </span>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {mySoundscape && groupSprint.isActive && (
              <button
                onClick={() => { soundscapeState.setMuted(m => !m); broadcastSoundscape(!soundscapeState.muted); }}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all font-medium ${
                  soundscapeState.muted ? "border-[#ddd0bb] text-[#9a8a70] bg-[#f5ede0]" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}>
                <span>{soundscapeState.muted ? "🔇" : "🎵"}</span>
                <span className="hidden sm:inline text-[10px]">{mySoundscape.name}</span>
              </button>
            )}

            <button
              onClick={() => setThesaurusOpen(o => !o)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                thesaurusOpen ? "border-[#2d3748] bg-[#2d3748] text-white" : "border-[#ddd0bb] text-[#7a6a50] hover:border-[#c9b090] bg-[#faf5ed]"
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <span className="hidden sm:inline">Thesaurus</span>
            </button>

            {groupSprint.isActive && (
              <TimerPill secondsLeft={secondsLeft} ended={sprintEnded} />
            )}

            {writeMode && (
              <button
                onClick={() => setFocusMode(f => !f)}
                title={focusMode ? "Exit focus mode" : "Focus mode"}
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                  focusMode ? "border-[#2d3748] bg-[#2d3748] text-white" : "border-[#ddd0bb] text-[#7a6a50] hover:border-[#c9b090] bg-[#faf5ed]"
                }`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </button>
            )}

            {groupSprint.isActive && (
              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#ddd0bb] text-[#7a6a50] rounded-full hover:border-[#c9b090] hover:text-[#5a4a30] transition-all font-medium bg-[#faf5ed]">
                🔗 <span>Invite</span>
              </button>
            )}
          </div>
        </div>

        {/* Write mode secondary toolbar */}
        {writeMode && (
          <div className="px-4 sm:px-6 flex items-center gap-2 h-9 border-t border-[#f0e8d8]">
            <button onClick={() => setWriteMode(false)}
              className="flex items-center gap-1.5 text-xs text-[#9a8a70] hover:text-[#2d3748] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Sprint room
            </button>
            <span className="text-[#e0d0b8]">|</span>
            {!focusMode && (
              <button onClick={() => setDraftsModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-[#9a8a70] hover:text-[#2d3748] transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Drafts
              </button>
            )}
            {focusMode && (
              <span className="text-xs text-[#c4bdb4] italic">Focus mode — sidebar hidden</span>
            )}
          </div>
        )}
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      {writeMode ? (
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Sidebar */}
          {!focusMode && (
            <aside className="hidden lg:flex flex-col w-60 xl:w-64 border-r border-[#e0d0b8] flex-shrink-0 overflow-y-auto"
              style={{ background: "rgba(250,245,237,0.7)" }}>
              <WritersSidebar sprints={sprints} groupSprint={groupSprint} user={user} />
            </aside>
          )}

          {/* Editor */}
          <div className="flex-1 overflow-y-auto bg-[#f5f0e8] px-4 sm:px-6 py-5 sm:py-7">
            {sprintEnded && !showSummary && !bannerDismissed && (
              <div className="w-full mb-3 rounded-2xl border border-[#d4af37] bg-[#fffbf0] px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">🏁</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2d3748]">Sprint complete — great work!</p>
                    <p className="text-xs text-[#9a8a70] truncate">Your writing is auto-saving. What would you like to do?</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                  <button onClick={handleSaveDraft}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#2d3748] text-white rounded-xl text-xs font-semibold hover:bg-[#3d4f64] transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    Go to Drafts
                  </button>
                  <button onClick={handleContinueSprint}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-[#d4af37] text-[#9a6f00] bg-white rounded-xl text-xs font-semibold hover:bg-[#fff8e0] transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    New Sprint
                  </button>
                  <button onClick={() => setBannerDismissed(true)}
                    className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-[#b8a898] hover:text-[#5a4a30] hover:bg-[#f0e8d8] transition-all" title="Dismiss">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            )}

            <div className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-md border border-[#e8e0d0]">
              {/*
                WriteEditor is now the SHARED component from writeeditorshared.jsx.
                onWordsUpdate → keeps currentWordCount in sync (used for sprint word-diff calc).
                onDraftLoaded → sets startWordsRef so we measure only new words this sprint.
                onAutoSave receives { draftId, title, content, wordCount } — wordCount is the
                accurate count from the rich editor, passed straight to the backend.
              */}
              <WriteEditor
                draftId={activeDraftId}
                onWordsUpdate={setCurrentWordCount}
                onAutoSave={handleAutoSave}
                onDraftLoaded={(savedWC) => { startWordsRef.current = savedWC; }}
                showColorTools={true}
              />
            </div>
          </div>

          {/* Thesaurus drawer */}
          <ThesaurusDrawer isOpen={thesaurusOpen} onClose={() => setThesaurusOpen(false)} />
        </div>

      ) : (
        // Sprint room layout
        <div className="flex flex-1 overflow-y-auto justify-center w-full">
          <main className="w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">

            {sprints.filter(s => s.isActive).length > 0 && groupSprint.isActive && (
              <div className="flex flex-wrap gap-2">
                {sprints.filter(s => s.isActive).map(s => (
                  <WriterPill key={s.id} sprint={s}
                    isHost={Number(s.userId) === Number(groupSprint.userId)}
                    isMe={Number(s.userId) === Number(user?.id)}
                  />
                ))}
              </div>
            )}

            {groupSprint.isActive && !hasCheckedOut && (
              <div className="rounded-3xl border border-[#e0d0b8] shadow-sm p-6 sm:p-8"
                style={{ background: "linear-gradient(160deg, #fffdf8 0%, #faf3e4 100%)" }}>

                <div className="flex justify-center mb-6">
                  <TimerPill secondsLeft={secondsLeft} ended={sprintEnded} large />
                </div>

                <div className="mb-6">
                  <h2 className="font-serif text-xl text-[#2d3748] mb-1" style={{ fontFamily: "'Georgia', serif" }}>
                    You're in the room.
                  </h2>
                  <p className="text-sm text-[#9a8a70]">
                    {routeWritingMode === "external"
                      ? "Writing in your own doc? Use the thesaurus if you need it."
                      : "Ready to write? Jump into the Inkwell editor."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => setWriteMode(true)}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-[#d4af37] bg-[#fffbf0] hover:bg-[#fff8e0] hover:shadow-md transition-all text-left group">
                    <div className="w-10 h-10 rounded-xl bg-[#2d3748] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <svg className="w-5 h-5 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2d3748]">Write with Inkwell</p>
                      <p className="text-xs text-[#9a8a70] mt-0.5">Editor here — auto-saves to drafts</p>
                    </div>
                  </button>

                  <button onClick={() => setThesaurusOpen(true)}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-[#e8dcc8] bg-[#faf7f2] hover:border-[#c9b090] hover:shadow-md transition-all text-left group">
                    <div className="w-10 h-10 rounded-xl bg-[#f4f1ec] border border-[#e8dcc8] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <svg className="w-5 h-5 text-[#7a6a50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2d3748]">Thesaurus</p>
                      <p className="text-xs text-[#9a8a70] mt-0.5">Synonyms & definitions</p>
                    </div>
                  </button>
                </div>

                {!hasCheckedOut && !sprintEnded && (
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => setShowEarlyCheckout(true)}
                      className="text-xs text-[#9a8a70] hover:text-[#5a4a30] transition-colors">
                      {isHost ? "End sprint early" : "Check out early"} →
                    </button>
                  </div>
                )}
              </div>
            )}

            {!groupSprint.isActive && (
              <div className="rounded-3xl border border-[#e0d0b8] shadow-sm p-8 text-center"
                style={{ background: "linear-gradient(160deg, #fffdf8 0%, #faf3e4 100%)" }}>
                <p className="text-4xl mb-3">🏁</p>
                <p className="font-serif text-2xl text-[#2d3748] mb-1" style={{ fontFamily: "'Georgia', serif" }}>
                  {groupSprint.totalWordsWritten > 0 ? groupSprint.totalWordsWritten.toLocaleString() : "Session"}
                </p>
                {groupSprint.totalWordsWritten > 0 && <p className="text-sm text-[#7a6a50]">words written together</p>}
                {hasCheckedOut && <p className="text-sm text-emerald-600 font-medium mt-2">✓ You checked out — great session!</p>}
              </div>
            )}

            <div className="rounded-3xl border border-[#e0d0b8] shadow-sm p-5 sm:p-7"
              style={{ background: "linear-gradient(160deg, #faf7f0 0%, #f0e8d8 100%)" }}>
              <div className="flex items-center gap-2 mb-5">
                <h2 className="font-serif text-xl text-[#2d3748]" style={{ fontFamily: "'Georgia', serif" }}>
                  {groupSprint.isActive ? "At the table…" : "The session"}
                </h2>
                <span className="text-lg">☕</span>
              </div>

              {sprints.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl mb-3">☕</p>
                  <p className="font-serif text-[#2d3748] mb-1">The café is empty…</p>
                  <p className="text-sm text-[#9a8a70]">Share the invite link so others can join</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sprints.map(s => {
                    const isHost_ = Number(s.userId) === Number(groupSprint.userId);
                    const isMe_   = Number(s.userId) === Number(user?.id);
                    return (
                      <div key={s.id} className={`rounded-2xl border p-4 transition-all ${isMe_ ? "bg-[#fffbf0] border-[#f0d98a]" : "bg-white border-[#e8dcc8]"} ${!s.isActive ? "opacity-60" : ""}`}>
                        <div className="flex items-center gap-2.5 mb-2">
                          <Link to={`/profile/${s.user?.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            {s.user?.avatar
                              ? <img src={s.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                              : <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isHost_ ? "bg-[#d4af37] text-[#2d3748]" : "bg-[#2d3748] text-white"}`}>{getInitials(s.user?.username)}</div>
                            }
                            <span className="text-sm font-semibold text-[#2d3748]">@{s.user?.username}</span>
                          </Link>
                          <div className="ml-auto flex items-center gap-1.5">
                            {isHost_ && <span className="text-[10px] text-[#b8962e] font-medium">host</span>}
                            {!s.isActive ? <span className="text-[10px] text-[#9a8a70]">checked out</span> : <span className="w-2 h-2 bg-emerald-400 rounded-full" />}
                          </div>
                        </div>
                        {s.checkin  && <p className="text-xs text-[#7a6a50] italic line-clamp-2">"{s.checkin}"</p>}
                        {s.project  && <p className="text-xs text-[#9a8c7a] mt-1">📚 {s.project.title}</p>}
                        {!s.isActive && s.wordsWritten > 0 && (
                          <p className="text-xs text-emerald-600 font-medium mt-1">+{s.wordsWritten.toLocaleString()} words</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-center pb-8">
              <button onClick={() => navigate("/")} className="text-sm text-[#9a8a70] hover:text-[#2d3748] transition-colors font-medium">
                ← Back to the shop
              </button>
            </div>
          </main>
        </div>
      )}

      {/* Thesaurus drawer (both modes) */}
      <ThesaurusDrawer isOpen={thesaurusOpen} onClose={() => setThesaurusOpen(false)} />

      {/* Drafts picker */}
      <DraftsPickerModal
        isOpen={draftsModalOpen}
        currentDraftId={activeDraftId}
        onSelect={d => { setActiveDraftId(d.id); setDraftsModalOpen(false); }}
        onClose={() => setDraftsModalOpen(false)}
      />

      {/* Sprint summary */}
      <SprintSummaryModal
        isOpen={showSummary}
        wordsWritten={sprintWordsWritten}
        draftId={activeDraftId}
        onSaveDraft={handleSaveDraft}
        onContinueSprint={handleContinueSprint}
        onClose={() => setShowSummary(false)}
      />

      {/* Checkout modals */}
      <CheckoutModal
        isOpen={showCheckout && !hasCheckedOut}
        onClose={() => setShowCheckout(false)}
        onSubmit={handleCheckedOut}
        sprintId={mySprint?.id}
        isEarly={false}
        sprintType={groupSprint.sprintType}
      />
      <CheckoutModal
        isOpen={showEarlyCheckout}
        onClose={() => setShowEarlyCheckout(false)}
        onSubmit={handleCheckedOut}
        sprintId={mySprint?.id}
        isEarly={true}
        sprintType={groupSprint.sprintType}
      />
    </div>
  );
}