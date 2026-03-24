import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";
import { CheckoutModal } from "./groupSprintModal";
import { Room, Track } from "livekit-client";

// ─── Constants ────────────────────────────────────────────────
const SOUNDSCAPES = {
  rain:  { label: "Rain",   icon: "🌧️", url: "/cold-city-288972.mp3" },
  birds: { label: "Birds",  icon: "🐦", url: "https://cdn.pixabay.com/audio/2021/09/06/audio_e84e5c5d46.mp3" },
  cafe:  { label: "Café",   icon: "☕", url: "https://cdn.pixabay.com/audio/2022/10/16/audio_3a8b67dc77.mp3" },
};

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;
const POLL_INTERVAL = 8000;

// ─── Data-channel message type ────────────────────────────────
// We use LiveKit's publishData() to broadcast small JSON payloads.
// { type: "sc", muted: boolean }
const DC_SOUNDSCAPE = "sc";

// ─── Helpers ──────────────────────────────────────────────────
function getInitials(username = "") {
  return username.slice(0, 2).toUpperCase();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function playRing() {
  try {
    const audio = new Audio("/notification.mp3");
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {}
}

// Encode a plain object → Uint8Array for LiveKit publishData
function encodeMsg(obj) {
  return new TextEncoder().encode(JSON.stringify(obj));
}

// ─── Soundscape hook ──────────────────────────────────────────
// Manages local audio playback.
// Returns muted/started state + setters so the workspace can
// broadcast mute changes to other participants.
function useSoundscape(soundscape, isActive) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const scape = SOUNDSCAPES[soundscape];

  useEffect(() => {
    if (!scape || !isActive) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(scape.url);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35;
    }
    audioRef.current.play().then(() => setStarted(true)).catch(() => setStarted(false));
    return () => { audioRef.current?.pause(); };
  }, [scape, isActive]);

  useEffect(() => {
    if (!isActive && audioRef.current) audioRef.current.pause();
  }, [isActive]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  return { muted, setMuted, started, setStarted, scape, audioRef };
}

// ─── Soundscape Controls (top bar) ────────────────────────────
function SoundscapeControls({
  soundscape, isActive,
  muted, setMuted,
  started, setStarted,
  audioRef, scape,
  onMuteToggle, // (muted: boolean) => void — broadcast to room
}) {
  if (!scape || !isActive) return null;

  function handleToggleMute() {
    setMuted((prev) => {
      const next = !prev;
      onMuteToggle(next);
      return next;
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{scape.icon}</span>
      <span className="text-xs text-[#7a6a50] hidden sm:inline font-medium">{scape.label}</span>
      {!started ? (
        <button
          onClick={() =>
            audioRef.current
              ?.play()
              .then(() => { setStarted(true); onMuteToggle(false); })
              .catch(() => {})
          }
          className="text-xs text-[#c9a227] underline underline-offset-2 hover:text-[#a07c10] transition-colors font-medium"
        >
          Play sounds
        </button>
      ) : (
        <button
          onClick={handleToggleMute}
          className={`text-xs px-2.5 py-1 rounded-full border transition-all font-medium ${
            muted
              ? "border-[#ddd0bb] text-[#9a8a70] hover:border-[#c9b090] bg-[#f5ede0]"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {muted ? "🔇 Muted" : "🔊 On"}
        </button>
      )}
    </div>
  );
}

// ─── Screen Share Button ──────────────────────────────────────
function ScreenShareButton({ roomRef, isActive }) {
  const [sharing, setSharing] = useState(false);

  async function toggleShare() {
    if (!roomRef.current) return;
    if (sharing) {
      try { await roomRef.current.localParticipant.setScreenShareEnabled(false); } catch (e) { console.error(e); }
      setSharing(false);
    } else {
      try { await roomRef.current.localParticipant.setScreenShareEnabled(true); setSharing(true); } catch (e) { console.error(e); }
    }
  }

  if (!isActive) return null;
  return (
    <button
      onClick={toggleShare}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
        sharing
          ? "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
          : "border-[#ddd0bb] text-[#7a6a50] hover:border-[#c9b090] hover:text-[#5a4a30] bg-[#faf5ed]"
      }`}
    >
      <span>🖥️</span>
      <span className="hidden sm:inline">{sharing ? "Stop sharing" : "Share screen"}</span>
    </button>
  );
}

// ─── Stopwatch-face Timer ─────────────────────────────────────
function StopwatchTimer({ secondsLeft, totalSeconds, ended }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = ended ? 0 : secondsLeft / totalSeconds;
  const offset = circumference * (1 - progress);

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i / 60) * 360;
    const isMain = i % 5 === 0;
    const rad = (angle - 90) * (Math.PI / 180);
    const r1 = isMain ? 36 : 38;
    const r2 = 42;
    return {
      x1: 50 + r1 * Math.cos(rad), y1: 50 + r1 * Math.sin(rad),
      x2: 50 + r2 * Math.cos(rad), y2: 50 + r2 * Math.sin(rad),
      isMain,
    };
  });

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xl">{ended ? "🏁" : "⏱️"}</span>
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 110, height: 110, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #fffdf8, #f0e8d8)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.13), inset 0 1px 3px rgba(255,255,255,0.8), 0 0 0 3px #e8d8b8, 0 0 0 5px #c9b090",
        }}
      >
        <svg viewBox="0 0 100 100" width="100" height="100" className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e8dcc8" strokeWidth="4" />
          <circle cx="50" cy="50" r={radius} fill="none"
            stroke={ended ? "#10b981" : "#c9a227"} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }} />
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.isMain ? "#a09070" : "#d0c0a0"} strokeWidth={t.isMain ? 1.5 : 0.8}
              style={{ transform: "rotate(90deg)", transformOrigin: "50px 50px" }} />
          ))}
        </svg>
        <div className="z-10 text-center select-none">
          {ended ? (
            <p className="text-xs text-emerald-600 font-bold tracking-wide" style={{ fontFamily: "'Georgia', serif" }}>Done!</p>
          ) : (
            <>
              <p className="text-xl font-bold text-[#2d3748] leading-none tabular-nums"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.5px" }}>
                {formatTime(secondsLeft)}
              </p>
              <p className="text-[9px] text-[#9a8a70] mt-0.5 tracking-widest uppercase">left</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Participant Video (screen share) ────────────────────────
function ParticipantVideo({ track }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (!videoRef.current || !track) return;
    const el = track.attach();
    el.style.width = "100%"; el.style.height = "100%";
    el.style.objectFit = "cover"; el.style.position = "absolute";
    el.style.inset = "0"; el.style.borderRadius = "inherit";
    videoRef.current.appendChild(el);
    return () => { track.detach(el); el.remove(); };
  }, [track]);
  return <div ref={videoRef} className="absolute inset-0 z-10 rounded-2xl overflow-hidden" />;
}

// ─── Soundscape Badge ─────────────────────────────────────────
// Shown on each desk card. Three visual states:
//   isUnknown=true  → faint 🎧 (no data received yet)
//   muted=true      → 🔇 grey pill
//   muted=false     → 🎧 green pill
function SoundscapeBadge({ hasSoundscape, muted, isUnknown }) {
  if (!hasSoundscape) return null;

  if (isUnknown) {
    return (
      <div
        title="Soundscape status unknown"
        className="absolute bottom-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-sm
                   bg-white/70 border border-[#e0d0b8] shadow-sm opacity-40 select-none"
      >
        🎧
      </div>
    );
  }

  return (
    <div
      title={muted ? "Soundscape muted" : "Listening to soundscape"}
      className={`absolute bottom-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-sm
                  shadow-sm border select-none transition-all duration-300 ${
        muted
          ? "bg-white/90 border-gray-200 opacity-70"
          : "bg-emerald-50/95 border-emerald-200"
      }`}
    >
      {muted ? "🔇" : "🎧"}
    </div>
  );
}

// ─── Desk Card ────────────────────────────────────────────────
function DeskCard({ sprint, groupSprint, user, screenTrack, soundscapeStates, myMuted }) {
  const isMe = user && Number(sprint.userId) === Number(user.id);
  const isSprintHost = Number(sprint.userId) === Number(groupSprint.userId);
  const isCheckedOut = !sprint.isActive;
  const hasScreen = !!screenTrack;
  const hasSoundscape = !!groupSprint.soundscape;

  // Determine soundscape display state for this card:
  // Local user  → use live myMuted (most up-to-date, no round-trip needed)
  // Others      → read from soundscapeStates map (populated by data channel)
  let scMuted = false;
  let scUnknown = false;

  if (hasSoundscape && !isCheckedOut) {
    if (isMe) {
      scMuted = myMuted;
    } else {
      const username = sprint.user?.username;
      if (soundscapeStates[username] === undefined) {
        scUnknown = true; // haven't received a broadcast from them yet
      } else {
        scMuted = soundscapeStates[username];
      }
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Desk square */}
      <div
        className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
          isMe ? "ring-2 ring-[#c9a227] shadow-lg" : "ring-1 ring-[#e0d0b8] shadow-md"
        } ${isCheckedOut ? "opacity-55" : ""}`}
        style={{ aspectRatio: "1 / 1" }}
      >
        {/* Warm background */}
        <div className="absolute inset-0" style={{
          background: isMe
            ? "linear-gradient(145deg, #fffbef 0%, #fef3c7 60%, #fde68a22 100%)"
            : "linear-gradient(145deg, #faf7f0 0%, #f0e8d8 70%, #e8dcc822 100%)",
        }} />

        {/* Wood-grain texture */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "repeating-linear-gradient(175deg, transparent, transparent 18px, #8B6914 19px)",
        }} />

        {/* Screen share */}
        {hasScreen && <ParticipantVideo track={screenTrack} />}

        {/* Avatar */}
        {!hasScreen && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Link to={`/profile/${sprint.user?.username}`} className="group/avatar">
              {sprint.user?.avatar ? (
                <img src={sprint.user.avatar} alt={sprint.user?.username}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow-lg group-hover/avatar:scale-105 transition-transform" />
              ) : (
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold border-4 border-white shadow-lg group-hover/avatar:scale-105 transition-transform ${
                  isSprintHost ? "bg-[#d4af37] text-[#2d3748]" : "bg-[#2d3748] text-white"
                }`}>
                  {getInitials(sprint.user?.username)}
                </div>
              )}
            </Link>
          </div>
        )}

        {/* Coffee cup */}
        {!hasScreen && <div className="absolute top-2.5 right-2.5 text-base opacity-40 select-none">☕</div>}

        {/* Online dot */}
        {!isCheckedOut && <span className="absolute top-2.5 left-2.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white shadow" />}

        {/* Checked-out badge */}
        {isCheckedOut && (
          <div className="absolute top-2.5 left-2.5 bg-white/90 rounded-full px-2 py-0.5 text-[10px] text-gray-500 font-medium border border-gray-200 shadow-sm">
            ✓ done
          </div>
        )}

        {/* Host crown */}
        {isSprintHost && <div className="absolute top-2.5 right-8 text-sm select-none opacity-80">👑</div>}
      </div>

      {/* Info panel below desk */}
      <div className="bg-white rounded-b-2xl border border-t-0 border-[#e8dcc8] px-3 pt-2.5 pb-3 shadow-sm">
        {/* Name row */}
        <Link to={`/profile/${sprint.user?.username}`}
          className="text-sm font-bold text-[#2d3748] hover:underline truncate block leading-tight">
          @{sprint.user?.username}
          {isSprintHost && <span className="text-[#b8962e] font-normal text-xs ml-1">· host</span>}
          {isMe && <span className="text-[#9a8a70] font-normal text-xs ml-1">· you</span>}
        </Link>

        {/* Working-on text + soundscape indicator on the same row */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-xs text-[#7a6a50] leading-snug line-clamp-2 min-h-[2.5em] flex-1">
            {isCheckedOut
              ? `✓ wrapped up${sprint.wordsWritten > 0 ? ` · ${sprint.wordsWritten.toLocaleString()} words` : ""}`
              : sprint.checkin
              ? <><span className="text-[#9a8a70]">working on </span><span className="font-medium text-[#5a4a30]">"{sprint.checkin}"</span></>
              : <span className="italic text-[#aaa090]">writing quietly...</span>
            }
          </p>

          {/* Soundscape indicator — always visible here, even during screen share */}
          {!isCheckedOut && hasSoundscape && (
            <div
              title={scUnknown ? "Soundscape status unknown" : scMuted ? "Soundscape muted" : "Listening to soundscape"}
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-all duration-300 ${
                scUnknown
                  ? "bg-gray-50 border-gray-200 opacity-50"
                  : scMuted
                  ? "bg-white border-gray-200 opacity-70"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              {scUnknown ? "🎧" : scMuted ? "🔇" : "🎧"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Workspace ───────────────────────────────────────────
export default function GroupSprintWorkspace() {
  const { groupSprintId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groupSprint, setGroupSprint] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [mySprint, setMySprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sprintEnded, setSprintEnded] = useState(false);
  const ringFiredRef = useRef(false);
  const timerRef = useRef(null);

  const roomRef = useRef(null);
  const livekitJoinedRef = useRef(false);
  const [screenTracks, setScreenTracks] = useState({});

  // ── Soundscape states received from OTHER participants ──────
  // { [username]: boolean }  true = muted, false = listening
  // Populated when we receive a DC_SOUNDSCAPE data message.
  const [soundscapeStates, setSoundscapeStates] = useState({});

  const [showCheckout, setShowCheckout] = useState(false);
  const [showEarlyCheckout, setShowEarlyCheckout] = useState(false);

  const isHost = user && groupSprint && Number(groupSprint.userId) === Number(user.id);
  const hasCheckedOut = mySprint ? !mySprint.isActive : false;

  const soundscapeState = useSoundscape(
    groupSprint?.soundscape,
    groupSprint?.isActive ?? false
  );

  // ── Broadcast our soundscape state to every peer in the room ─
  // Called on mute toggle and immediately after joining the room.
  const broadcastSoundscapeState = useCallback((muted) => {
    const room = roomRef.current;
    if (!room) return;
    try {
      room.localParticipant.publishData(
        encodeMsg({ type: DC_SOUNDSCAPE, muted }),
        { reliable: true } // reliable = guaranteed delivery, good for state
      );
    } catch (e) {
      console.warn("[DataChannel] broadcast failed:", e);
    }
  }, []);

  // ── Fetch ───────────────────────────────────────────────────
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

  // ── LiveKit ──────────────────────────────────────────────────
  useEffect(() => {
    if (!groupSprint?.isActive || !groupSprint?.liveKitRoomName) return;
    if (livekitJoinedRef.current) return;
    livekitJoinedRef.current = true;

    async function joinRoom() {
      try {
        if (!LIVEKIT_URL) { livekitJoinedRef.current = false; return; }

        const res = await fetch(`${API_URL}/sprint/${groupSprintId}/livekit-token`, { credentials: "include" });
        if (!res.ok) { return; }
        const { token } = await res.json();

        const room = new Room();
        roomRef.current = room;

        // ── Screen share ───────────────────────────────────────
        room.on("trackSubscribed", (track, _pub, participant) => {
          if (track.source === Track.Source.ScreenShare) {
            setScreenTracks((prev) => ({ ...prev, [participant.identity]: track }));
          }
        });
        room.on("trackUnsubscribed", (track, _pub, participant) => {
          if (track.source === Track.Source.ScreenShare) {
            setScreenTracks((prev) => { const next = { ...prev }; delete next[participant.identity]; return next; });
          }
        });
        room.localParticipant.on("localTrackPublished", (pub) => {
          if (pub.track?.source === Track.Source.ScreenShare) {
            setScreenTracks((prev) => ({ ...prev, [room.localParticipant.identity]: pub.track }));
          }
        });
        room.localParticipant.on("localTrackUnpublished", (pub) => {
          if (pub.track?.source === Track.Source.ScreenShare) {
            setScreenTracks((prev) => { const next = { ...prev }; delete next[room.localParticipant.identity]; return next; });
          }
        });

        // ── Data channel: receive soundscape state from peers ──
        // participant.identity === their username (set in the LiveKit token on the server)
        room.on("dataReceived", (rawData, participant) => {
          if (!participant) return;
          try {
            const msg = JSON.parse(new TextDecoder().decode(rawData));
            if (msg.type === DC_SOUNDSCAPE) {
              // Update the sender's mute state on all other desks
              setSoundscapeStates((prev) => ({
                ...prev,
                [participant.identity]: msg.muted,
              }));
            }
            if (msg.type === "sc_request") {
              // A new participant is asking everyone to re-broadcast their state.
              // Reply with our current muted state so their desk cards update.
              broadcastSoundscapeState(soundscapeState.muted);
            }
          } catch {
            // malformed — ignore silently
          }
        });

        // When a NEW participant connects, they won't know our state yet.
        // Re-broadcast immediately so their desk card shows the right icon.
        room.on("participantConnected", () => {
          broadcastSoundscapeState(soundscapeState.muted);
        });

        await room.connect(LIVEKIT_URL, token);

        // After connecting, broadcast our state AND ask existing participants
        // to re-send theirs so we can populate their desk cards right away.
        setTimeout(() => {
          // Tell everyone our mute state
          broadcastSoundscapeState(soundscapeState.muted);
          // Ask existing participants to reply with their state
          try {
            room.localParticipant.publishData(
              encodeMsg({ type: "sc_request" }),
              { reliable: true }
            );
          } catch (e) {
            console.warn("[DataChannel] sc_request failed:", e);
          }
        }, 600);

      } catch (err) {
        console.error("[LiveKit] connection error:", err);
        livekitJoinedRef.current = false;
      }
    }

    joinRoom();
    // soundscapeState.muted intentionally not in deps — we only join once.
    // The initial broadcast uses a closure snapshot which is fine here.
  }, [groupSprint?.liveKitRoomName, groupSprint?.isActive, groupSprintId, broadcastSoundscapeState]);

  useEffect(() => {
    return () => { if (roomRef.current) { roomRef.current.disconnect(); roomRef.current = null; } };
  }, []);

  // ── Re-broadcast our soundscape state whenever it changes ───
  // This covers the case where we mute/unmute while someone is already
  // in the room, ensuring their desk card updates instantly.
  useEffect(() => {
    if (!roomRef.current || !groupSprint?.isActive) return;
    broadcastSoundscapeState(soundscapeState.muted);
  }, [soundscapeState.muted, broadcastSoundscapeState, groupSprint?.isActive]);

  // ── Poll ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupSprint?.isActive) return;
    const poll = setInterval(() => { fetchGroupSprint(); fetchMySprint(); }, POLL_INTERVAL);
    return () => clearInterval(poll);
  }, [groupSprint?.isActive, fetchGroupSprint, fetchMySprint]);

  // ── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupSprint?.isActive) return;
    const startedAt = new Date(groupSprint.startedAt).getTime();
    const endsAt = startedAt + groupSprint.duration * 60 * 1000;

    function tick() {
      const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !sprintEnded) {
        setSprintEnded(true);
        if (!hasCheckedOut && !ringFiredRef.current) {
          ringFiredRef.current = true;
          playRing();
          if (isHost) {
            fetch(`${API_URL}/sprint/${groupSprintId}/endGroupSprint`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              credentials: "include", body: JSON.stringify({}),
            }).then(() => { fetchGroupSprint(); setShowCheckout(true); }).catch(() => { setShowCheckout(true); });
          } else {
            setShowCheckout(true);
          }
        }
      }
    }

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [groupSprint, sprintEnded, hasCheckedOut, isHost, groupSprintId, fetchGroupSprint]);

  function handleCheckedOut() {
    setShowCheckout(false);
    setShowEarlyCheckout(false);
    fetchMySprint();
    fetchGroupSprint();
  }

  // ── Loading / Error ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f0e8" }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">☕</div>
          <p className="text-sm text-[#7a6a50] font-medium" style={{ fontFamily: "'Georgia', serif" }}>Setting the mood...</p>
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

  const totalSeconds = groupSprint.duration * 60;
  const soundscape = groupSprint.soundscape;
  const activeWriters = sprints.filter((s) => s.isActive).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f5f0e8" }}>
      <Header />

      {/* ── Sticky top bar ─────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 border-b border-[#e0d0b8]"
        style={{ background: "rgba(250, 245, 237, 0.96)", backdropFilter: "blur(8px)" }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {groupSprint.isActive ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
              </span>
            ) : (
              <span className="text-xs text-[#7a6a50] bg-[#ede8df] border border-[#ddd0bb] px-2.5 py-1 rounded-full flex-shrink-0">Session ended</span>
            )}
            <span className="text-xs text-[#9a8a70] hidden sm:block truncate font-medium">
              {activeWriters} writer{activeWriters !== 1 ? "s" : ""} at the table
              {groupSprint.duration && ` · ${groupSprint.duration} min`}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {soundscape && (
              <SoundscapeControls
                soundscape={soundscape}
                isActive={groupSprint.isActive}
                {...soundscapeState}
                onMuteToggle={broadcastSoundscapeState}
              />
            )}
            <ScreenShareButton roomRef={roomRef} isActive={groupSprint.isActive} />
            {groupSprint.isActive && (
              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#ddd0bb] text-[#7a6a50] rounded-full hover:border-[#c9b090] hover:text-[#5a4a30] transition-all font-medium bg-[#faf5ed]"
              >
                🔗 <span>Invite</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-y-auto justify-center w-full">
        <main className="w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-10 space-y-8">

          {/* Timer card */}
          {groupSprint.isActive && (
            <div className="rounded-3xl border border-[#e0d0b8] shadow-md p-6 sm:p-8"
              style={{ background: "linear-gradient(160deg, #fffdf8 0%, #faf3e4 100%)" }}>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <StopwatchTimer secondsLeft={secondsLeft} totalSeconds={totalSeconds} ended={sprintEnded} />
                </div>
                <div className="flex flex-col gap-4 flex-1 w-full">
                  {sprints.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {sprints.filter(s => s.isActive).map((s) => (
                        <div key={s.id} className="flex items-center gap-1.5 bg-white border border-[#e8dcc8] rounded-full px-2.5 py-1 shadow-sm">
                          {s.user?.avatar
                            ? <img src={s.user.avatar} alt={s.user?.username} className="w-5 h-5 rounded-full object-cover" />
                            : <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${Number(s.userId) === Number(groupSprint.userId) ? "bg-[#d4af37] text-[#2d3748]" : "bg-[#2d3748] text-white"}`}>{getInitials(s.user?.username)}</div>
                          }
                          <span className="text-xs text-[#5a4a30] font-medium">@{s.user?.username}</span>
                          {Number(s.userId) === Number(groupSprint.userId) && <span className="text-[10px] text-[#b8962e]">host</span>}
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    {!hasCheckedOut && !sprintEnded && (
                      <button onClick={() => setShowEarlyCheckout(true)}
                        className="px-5 py-2 border border-[#ddd0bb] text-[#7a6a50] text-sm rounded-xl hover:border-[#c9a227] hover:text-[#5a4a30] transition-all font-medium bg-white">
                        {isHost ? "End sprint early" : "Check out early"}
                      </button>
                    )}
                    <button onClick={() => navigator.clipboard?.writeText(window.location.href)}
                      className="sm:hidden px-5 py-2 border border-[#ddd0bb] text-[#7a6a50] text-sm rounded-xl hover:border-[#c9a227] transition-all font-medium bg-white">
                      🔗 Copy invite
                    </button>
                  </div>
                  {hasCheckedOut && <p className="text-sm text-emerald-700 font-medium">✓ You've checked out — great session!</p>}
                </div>
              </div>
            </div>
          )}

          {/* "At the table" desks */}
          <div className="rounded-3xl border border-[#e0d0b8] shadow-md p-5 sm:p-7"
            style={{ background: "linear-gradient(160deg, #faf7f0 0%, #f0e8d8 100%)" }}>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="font-serif text-2xl text-[#2d3748]"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                {groupSprint.isActive ? "At the table..." : "The session"}
              </h2>
              <span className="text-xl">☕</span>
            </div>

            {sprints.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">☕</p>
                <p className="font-serif text-[#2d3748] text-lg mb-1" style={{ fontFamily: "'Georgia', serif" }}>The café is empty...</p>
                <p className="text-sm text-[#9a8a70]">Share the invite link so others can join</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {sprints.map((sprint) => (
                  <DeskCard
                    key={sprint.id}
                    sprint={sprint}
                    groupSprint={groupSprint}
                    user={user}
                    screenTrack={screenTracks[sprint.user?.username] || null}
                    soundscapeStates={soundscapeStates}
                    myMuted={soundscapeState.muted}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Session ended: total words */}
          {!groupSprint.isActive && groupSprint.totalWordsWritten > 0 && (
            <div className="rounded-3xl border border-[#e0d0b8] shadow-md p-8 text-center"
              style={{ background: "linear-gradient(160deg, #fffdf8 0%, #faf3e4 100%)" }}>
              <p className="text-5xl mb-2">🏁</p>
              <p className="text-5xl font-bold text-[#2d3748] mb-2"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                {groupSprint.totalWordsWritten.toLocaleString()}
              </p>
              <p className="text-sm text-[#7a6a50] font-medium">words written together in this session</p>
            </div>
          )}

          <div className="text-center pb-8">
            <button onClick={() => navigate("/")}
              className="text-sm text-[#9a8a70] hover:text-[#2d3748] transition-colors font-medium">
              ← Back to the shop
            </button>
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      <CheckoutModal
        isOpen={showCheckout && !hasCheckedOut}
        onClose={() => setShowCheckout(false)}
        onSubmit={handleCheckedOut}
        sprintId={mySprint?.id}
        isEarly={false}
      />
      <CheckoutModal
        isOpen={showEarlyCheckout}
        onClose={() => setShowEarlyCheckout(false)}
        onSubmit={handleCheckedOut}
        sprintId={mySprint?.id}
        isEarly={true}
      />
    </div>
  );
}