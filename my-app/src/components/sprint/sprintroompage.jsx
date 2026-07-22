import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { WriteEditor, ThesaurusDrawer } from "../drafts/writeeditorshared";
import {
  useStickyNotes,
  useHandwrittenFont,
  StickyNotesPanel,
  ParagraphStickyOverlay,
  DraftStickyNotesButton,
} from "../drafts/stickynotes";
import {
  StartRoomSprintModal,
  JoinSprintModal,
  WriterStatusPicker,
  statusMeta,
  SprintRoomDraftModal,
  SprintSummaryModal,
} from "./sprintroommodals";
import { SprintRoomChat } from "./sprintroomchat";

const MEMBERS_POLL_MS   = 10000;
const HEARTBEAT_MS      = 20000;
const SPRINT_POLL_MS    = 5000;
// API_URL is the REST base (e.g. ".../api") — socket.io connects to the
// server root, so strip that suffix off rather than adding a second env var.
const SOCKET_URL        = API_URL.replace(/\/api\/?$/, "");
// How often the live word count gets persisted to the backend in the
// background while a sprint is running — a safety net so an in-progress
// sprint doesn't lose its word count if the writer closes the tab or
// navigates away before a proper checkout/leave fires.
const SAFETY_SYNC_MS    = 20000;

function initials(name = "") {
  return name.trim().slice(0, 2).toUpperCase();
}

function formatCountdown(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Same bell/notification sound used in the group sprint workspace, played
// once when a sprint in this room wraps up.
function playRing() {
  try { const a = new Audio("/notification.mp3"); a.volume = 0.7; a.play().catch(() => {}); } catch {}
}

// ─── Draft loading bar ────────────────────────────────────────────────────
// Brief, fast progress indicator shown over the sheet while the draft's
// starting word count is being calculated — this baseline is what a
// writer's "words this sprint" gets measured against, so it has to land
// before they're allowed to type a single character.
function DraftLoadingBar() {
  const [pct, setPct] = useState(10);
  useEffect(() => {
    const t = setTimeout(() => setPct(85), 30);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/95 backdrop-blur-sm">
      <div className="w-40 h-1.5 rounded-full bg-[#f0e8d8] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#e8c766] transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-[#9a8c7a] font-medium">Counting words in your draft…</p>
    </div>
  );
}

// ─── Editor gate ─────────────────────────────────────────────────────────
// Sits over the writing sheet only — chat, the writers list, and the top
// bar all stay fully usable underneath/alongside it. A writer has to start
// or join the room's sprint before they can actually type.
function EditorGate({ sprintIsLive, sprintRemainingMs, onStart, onJoin }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#faf7f2]/85 backdrop-blur-[2px] px-4">
      <div className="w-full max-w-xs bg-white rounded-2xl border border-[#e8dcc8] shadow-xl px-6 py-7 text-center">
        <div className="w-11 h-11 mx-auto rounded-xl bg-[#2d3748] text-[#d4af37] flex items-center justify-center mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-[#2d3748] mb-1">
          {sprintIsLive ? "A sprint is underway" : "No sprint running yet"}
        </p>
        <p className="text-xs text-[#9a8c7a] mb-5 leading-relaxed">
          {sprintIsLive
            ? "Join it to start typing. Chat's open in the meantime if you want to say hi."
            : "Start one, or wait for someone else to. You can still chat while you wait."}
        </p>
        {sprintIsLive ? (
          <button
            onClick={onJoin}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e8c766] text-[#2d3748] rounded-xl text-xs font-bold hover:brightness-105 transition-all">
            Join Sprint with Soundscape · {formatCountdown(sprintRemainingMs)}
          </button>
        ) : (
          <button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e8c766] text-[#2d3748] rounded-xl text-xs font-bold hover:brightness-105 transition-all">
            Start Sprint
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Join-the-room gate ──────────────────────────────────────────────────────
// First thing anyone sees before they've joined — a single "Join Sprint
// Room" action, nothing about creating a room (there's only ever one).
function JoinRoomGate({ writerCount, onJoin, joining }) {
  return (
    <div
      className="h-full flex items-center justify-center px-4"
      style={{
        backgroundColor: "#c4915c",
        backgroundImage: `
          repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 96px),
          repeating-linear-gradient(90deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 2px, transparent 2px, transparent 96px),
          radial-gradient(ellipse at top, rgba(255,255,255,0.10), transparent 60%),
          linear-gradient(180deg, #d3a06a 0%, #bd875099 40%, #ab763f 100%)
        `,
      }}>
      <div className="w-full max-w-sm bg-[#faf7f2] rounded-2xl border border-[#e8dcc8] shadow-2xl px-7 py-9 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#2d3748] text-[#d4af37] flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold text-[#2d3748] mb-1">Sprint Room</h1>
        <p className="text-sm text-[#9a8c7a] mb-6">
          {writerCount > 0
            ? `${writerCount} writer${writerCount === 1 ? "" : "s"} here right now`
            : "Be the first to show up"}
        </p>
        <button
          onClick={onJoin}
          disabled={joining}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#d4af37] to-[#e8c766] text-[#2d3748] rounded-xl text-sm font-bold hover:brightness-105 transition-all disabled:opacity-60">
          {joining ? "Joining…" : "Join Sprint Room"}
        </button>
      </div>
    </div>
  );
}

// ─── Writers panel ────────────────────────────────────────────────────────
function WritersPanel({
  members, currentUserId, myStatus, onChangeStatus, onOpenChat,
  onLeaveRoom, unreadChatCount = 0,
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="relative flex items-center justify-center px-5 py-5 border-b border-[#e8dcc8] flex-shrink-0">
        <div className="text-center">
          <h2 className="text-xl font-extrabold text-[#2d3748]">Writers</h2>
          <p className="text-sm text-[#9a8c7a]">{members.length} here</p>
        </div>
        <button
          onClick={onOpenChat}
          className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm font-semibold text-[#7a6a50] hover:text-[#2d3748] transition-colors">
          <span className="relative">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadChatCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadChatCount > 9 ? "9+" : unreadChatCount}
              </span>
            )}
          </span>
          Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {members.length === 0 ? (
          <p className="text-xs text-[#9a8c7a] text-center py-8">No one here yet.</p>
        ) : (
          members.map((m) => {
            const isMe = m.user.id === currentUserId;
            const meta = statusMeta(m.status);
            return (
              <div key={m.user.id} className="bg-white rounded-2xl border border-[#e8dcc8] px-5 py-4">
                <div className="flex items-center gap-3.5">
                  {m.user.avatar ? (
                    <img src={m.user.avatar} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#2d3748] text-[#d4af37] flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {initials(m.user.username)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-[#2d3748] truncate">
                      {m.user.username}{isMe && <span className="text-[#9a8c7a] font-normal"> (you)</span>}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  {isMe ? (
                    <WriterStatusPicker value={myStatus} onChange={onChangeStatus} />
                  ) : m.status ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ color: meta.color, backgroundColor: `${meta.color}14` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      {meta.label}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-5 py-4 border-t border-[#e8dcc8] flex-shrink-0">
        <button
          onClick={onLeaveRoom}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#e8dcc8] text-xs font-semibold text-[#7a6a50] hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Leave Room
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function SprintRoomPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext?.() || {};

  const [room, setRoom] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [members, setMembers] = useState([]);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [currentGroupSprint, setCurrentGroupSprint] = useState(null);
  const [mySprint, setMySprint] = useState(null);

  const [rightView, setRightView] = useState("writers"); // "writers" | "chat"
  const [unreadChatCount, setUnreadChatCount] = useState(0); // @mentions/replies badge on the Chat toggle
  const [focusMode, setFocusMode] = useState(false);
  const [startSprintOpen, setStartSprintOpen] = useState(false);
  const [joinSprintOpen, setJoinSprintOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [thesaurusOpen, setThesaurusOpen] = useState(false);
  const [stickyNotesOn, setStickyNotesOn] = useState(false);
  const [stickyPanel, setStickyPanel] = useState(null);

  // True until the initial "which draft was I last on" lookup below
  // resolves. Kept separate from draftLoading (which reflects the editor's
  // own fetch-and-render of whatever draftId it's given) so the editor
  // isn't mounted with a premature draftId=null and doesn't fire an early
  // "0 words, done loading" before we actually know the answer.
  const [draftDefaultResolved, setDraftDefaultResolved] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  useEffect(() => { wordCountRef.current = wordCount; }, [wordCount]);
  // True right after switching drafts mid-sprint, until the newly-loaded
  // draft's own word count is known and the still-running sprint has been
  // rebaselined against it. See switchToDraft() below.
  const [pendingRebaseline, setPendingRebaseline] = useState(false);
  // { sprintId, oldWordCount } captured at the moment of the switch — the
  // sprint we need to rebaseline and what the writer's total was on the
  // draft they're leaving. Kept in a ref (not state) so it's available
  // synchronously to the effect below without racing a render.
  const rebaselineInfoRef = useRef(null);
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const [now, setNow] = useState(Date.now());

  // True while the editor is loading a draft + counting its existing words.
  // Starts true since the very first draft (or blank one) still needs to
  // resolve before anyone can type. Doubles as the top layer of the sheet
  // overlay, ahead of the join/start gate.
  const [draftLoading, setDraftLoading] = useState(true);

  // Sprint summary — shown when a member's sprint ends or they leave early.
  const [showSprintSummary, setShowSprintSummary] = useState(false);
  const [sprintWordsWritten, setSprintWordsWritten] = useState(0);

  // Lets a writer keep typing in the room after their sprint ends without
  // being gated behind starting or joining another one. Cleared whenever
  // they actually join a (new) sprint, since canWrite covers that case itself.
  const [freeWriting, setFreeWriting] = useState(false);

  const editorContentRef = useRef(null);
  const sheetRef = useRef(null);
  const saveRef = useRef(null);
  const ringFiredRef = useRef(false);
  const lastSprintIdRef = useRef(null);
  const socketRef = useRef(null);
  // Mirrors wordCount so the progress-emit interval always sends the latest
  // value without needing to be torn down and rebuilt on every keystroke.
  const wordCountRef = useRef(0);
  // Baseline word count for the draft at the moment the current sprint
  // started — set by WriteEditor's onDraftLoaded, and re-set whenever a
  // fresh sprint is joined on top of an already-loaded draft.
  const startWordsRef = useRef(null);
  const prevMySprintRef = useRef(null);
  // Flips true the moment the writer explicitly picks a draft (or "New
  // draft") from the switcher — once that's happened, the "default to my
  // last draft" effect below must never override it, even if its fetch is
  // still in flight.
  const userPickedDraftRef = useRef(false);
  useHandwrittenFont();

  const {
    draftNotes, notesByParagraph,
    createNote: createStickyNote, updateNote: updateStickyNote, deleteNote: deleteStickyNote,
  } = useStickyNotes(activeDraftId);

  // Live "words this sprint" — a true diff against the baseline, so it
  // tracks the draft exactly: deleting text drops it immediately, typing
  // more brings it back up immediately. No ratchet — what you see is what
  // gets sent on the next sync, checkout, or leave.
  function currentLiveWritten() {
    return Math.max(0, wordCount - (startWordsRef.current ?? 0));
  }

  // ── Default to the last draft worked on ──────────────────────────────────
  // Runs once, on first load of the room. Without this, activeDraftId starts
  // null and the very first sprint always begins on a blank, untitled draft
  // — this instead reuses the same picker list the draft switcher shows and
  // opens on whichever draft was updated most recently. A writer who
  // explicitly picks a draft (or "New draft") before this resolves always
  // wins; userPickedDraftRef guards against the fetch clobbering that choice.
  useEffect(() => {
    fetch(`${API_URL}/drafts/sprint-picker`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { drafts: [] }))
      .then((d) => {
        if (userPickedDraftRef.current) return;
        const drafts = d.drafts || [];
        if (!drafts.length) return;
        const mostRecent = [...drafts].sort(
          (a, b) => new Date(b.updatedAt || b.lastEditedAt || 0) - new Date(a.updatedAt || a.lastEditedAt || 0)
        )[0];
        if (mostRecent?.id) setActiveDraftId(mostRecent.id);
      })
      .catch(() => {})
      .finally(() => setDraftDefaultResolved(true));
  }, []);

  // ── Fetch room + current group sprint ────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sprint-room`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setRoom(data.room);
      setCurrentGroupSprint(data.currentGroupSprint);
    } catch {}
    finally { setLoadingRoom(false); }
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!room?.id) return;
    try {
      const res = await fetch(`${API_URL}/sprint-room/${room.id}/members`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members || []);
      setJoined((data.members || []).some((m) => m.user.id === user?.id));
    } catch {}
  }, [room?.id, user?.id]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);
  useEffect(() => {
    if (!room?.id) return;
    fetchMembers();
    const t = setInterval(fetchMembers, MEMBERS_POLL_MS);
    return () => clearInterval(t);
  }, [room?.id, fetchMembers]);
  useEffect(() => {
    const t = setInterval(fetchRoom, SPRINT_POLL_MS);
    return () => clearInterval(t);
  }, [fetchRoom]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Heartbeat while joined
  useEffect(() => {
    if (!joined || !room?.id) return;
    const t = setInterval(() => {
      fetch(`${API_URL}/sprint-room/${room.id}/heartbeat`, { method: "POST", credentials: "include" }).catch(() => {});
    }, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [joined, room?.id]);

  // Red-dot badge on the Chat toggle — @mentions/replies only, not every
  // message. Polls while joined; skipped while the chat panel is already
  // open since SprintRoomChat marks everything read on mount anyway.
  useEffect(() => {
    if (!joined) return;
    async function fetchUnreadChatCount() {
      try {
        const res = await fetch(`${API_URL}/sprint-room/notifications/unread-count`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setUnreadChatCount(data.count || 0);
      } catch {}
    }
    fetchUnreadChatCount();
    const t = setInterval(fetchUnreadChatCount, 15000);
    return () => clearInterval(t);
  }, [joined]);

  // Opening the chat panel clears the badge immediately — SprintRoomChat
  // also tells the backend, this just keeps the UI from lagging a poll cycle.
  function openChat() {
    setUnreadChatCount(0);
    setRightView("chat");
  }

  // Let Escape exit focus mode from anywhere, same as the Write page.
  useEffect(() => {
    if (!focusMode) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setFocusMode(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusMode]);

  // Report focus mode up to Layout so the dashboard nav hides too, same as
  // the Write page — Layout resets this on route change on its own.
  const setLayoutFocusMode = outlet.setLayoutFocusMode;
  useEffect(() => {
    setLayoutFocusMode?.(focusMode);
  }, [focusMode, setLayoutFocusMode]);

  // ── Socket connection ──────────────────────────────────────────────────
  // One connection for the life of the page. Auth rides the same JWT
  // cookie the REST calls use (see src/socket/index.js), so no token is
  // passed explicitly here.
  useEffect(() => {
    const socket = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  // Join/leave the room's broadcast channel as the room becomes known —
  // separate from "joined the sprint room" (presence), this is purely the
  // socket.io channel scoping.
  useEffect(() => {
    if (!room?.id) return;
    socketRef.current?.emit("room:join", room.id);
    return () => socketRef.current?.emit("room:leave", room.id);
  }, [room?.id]);

  // Background persistence — a slower, fire-and-forget REST sync so the
  // sprint's word count survives a closed tab or crash even if the writer
  // never reaches a proper checkout/leave. Never awaited/blocking, and
  // failures are silently ignored — a missed sync just means the next one,
  // 20s later, catches it instead.
  useEffect(() => {
    if (!mySprint?.id) return;
    const t = setInterval(() => {
      fetch(`${API_URL}/sprint/${mySprint.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentWordCount: wordCountRef.current }),
      }).catch(() => {});
    }, SAFETY_SYNC_MS);
    return () => clearInterval(t);
  }, [mySprint?.id]);

  // Track my own sprint participation in the current group sprint. A
  // draft switch mid-sprint (see switchToDraft) checks out the old sprint
  // row and joins a fresh one, so more than one row for this user can
  // exist here — take the active one, falling back to the most recent.
  useEffect(() => {
    if (!currentGroupSprint || !user?.id) { setMySprint(null); return; }
    const mySprints = (currentGroupSprint.sprints || []).filter((s) => s.userId === user.id);
    const mine = mySprints.find((s) => s.isActive !== false) || mySprints[mySprints.length - 1];
    setMySprint(mine || null);
  }, [currentGroupSprint, user?.id]);

  // Derived sprint-live state. Checked against the server's isActive flag
  // (not just the countdown) so that a host ending the sprint early is
  // reflected for every writer as soon as the next room refetch lands,
  // rather than only once the original duration would have run out.
  const sprintEndsAt = currentGroupSprint
    ? new Date(currentGroupSprint.startedAt).getTime() + currentGroupSprint.duration * 60000
    : null;
  const sprintRemainingMs = sprintEndsAt ? sprintEndsAt - now : 0;
  const sprintIsLive = !!currentGroupSprint && currentGroupSprint.isActive !== false && sprintRemainingMs > 0;

  // Re-baseline the starting word count whenever this member freshly joins
  // a sprint on top of a draft that was already loaded (e.g. starting a
  // second sprint back-to-back without switching drafts). If the draft is
  // still loading, onDraftLoaded below will set the correct baseline once
  // it resolves, so this is skipped in that case to avoid a false 0.
  useEffect(() => {
    const justJoined = !!mySprint && !prevMySprintRef.current;
    if (justJoined && !draftLoading) {
      startWordsRef.current = wordCount;
    }
    prevMySprintRef.current = mySprint;
  }, [mySprint, wordCount, draftLoading]);

  // Reset the bell guard whenever a new group sprint starts in the room.
  useEffect(() => {
    if (currentGroupSprint?.id && currentGroupSprint.id !== lastSprintIdRef.current) {
      lastSprintIdRef.current = currentGroupSprint.id;
      ringFiredRef.current = false;
    }
  }, [currentGroupSprint?.id]);

  // Ring the same bell used in the group sprint workspace once this room's
  // sprint wraps up — whether it ran out the clock or the host ended it
  // early — so everyone still in the room hears it end. If this member was
  // actually participating, persist their final word count (checkout is
  // safe to call even though the group sprint may already be marked
  // inactive server-side) and surface their sprint summary.
  useEffect(() => {
    if (!currentGroupSprint) return;
    if (!sprintIsLive && !ringFiredRef.current) {
      ringFiredRef.current = true;
      playRing();
      if (mySprint) {
        const written = currentLiveWritten();
        setSprintWordsWritten(written);
        setShowSprintSummary(true);
        fetch(`${API_URL}/sprint/${mySprint.id}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ currentWordCount: wordCount }),
        }).catch(() => {});
        setMySprint(null);
      }
    }
  }, [currentGroupSprint, sprintIsLive, mySprint, wordCount]);


  async function handleJoinRoom() {
    if (!room?.id) return;
    setJoining(true);
    try {
      const res = await fetch(`${API_URL}/sprint-room/${room.id}/join`, { method: "POST", credentials: "include" });
      if (res.ok) { setJoined(true); fetchMembers(); }
    } finally { setJoining(false); }
  }

  async function handleLeaveRoom() {
    if (!room?.id) return;
    try {
      await fetch(`${API_URL}/sprint-room/${room.id}/leave`, { method: "POST", credentials: "include" });
    } finally {
      setJoined(false);
      setRightView("writers");
    }
  }

  // Voluntary early exit from just the sprint (not the room) — checks out
  // your current word count so it still counts toward the group total.
  async function handleLeaveSprint() {
    if (!mySprint) return;
    const written = currentLiveWritten();
    try {
      await fetch(`${API_URL}/sprint/${mySprint.id}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentWordCount: wordCount }),
      });
    } finally {
      setMySprint(null);
      setSprintWordsWritten(written);
      setShowSprintSummary(true);
      fetchRoom();
    }
  }

  // Host-only: ends the sprint for the whole room, not just themselves —
  // distinct from "Leave sprint" above, which only exits the sprint for
  // the person clicking it. This is destructive to everyone else's
  // in-progress sprint, so it's confirmed first.
  async function handleEndGroupSprint() {
    if (!currentGroupSprint) return;
    const confirmed = window.confirm(
      "End this sprint for everyone in the room? Anyone still writing will be checked out with their current word count."
    );
    if (!confirmed) return;

    try {
      // Check the host's own current word count out first, same as any
      // other writer's sprint ending — otherwise it's the one sprint in
      // the room that ends without its word count ever getting recorded.
      if (mySprint) {
        const written = currentLiveWritten();
        await fetch(`${API_URL}/sprint/${mySprint.id}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ currentWordCount: wordCount }),
        }).catch(() => {});
        setSprintWordsWritten(written);
      }
      await fetch(`${API_URL}/sprint/${currentGroupSprint.id}/endGroupSprint`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setCurrentGroupSprint(null);
      setMySprint(null);
      setShowSprintSummary(true);
      fetchRoom();
    }
  }

  async function handleChangeStatus(status) {
    if (!room?.id) return;
    setMembers((ms) => ms.map((m) => (m.user.id === user.id ? { ...m, status } : m)));
    try {
      await fetch(`${API_URL}/sprint-room/${room.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
    } catch {}
  }

  // ── Draft save (mirrors Write page) ──────────────────────────────────────
  const handleSave = useCallback(async ({ draftId, title, content }) => {
    try {
      let res;
      if (draftId) {
        res = await fetch(`${API_URL}/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, content }),
        });
      } else {
        res = await fetch(`${API_URL}/drafts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, content }),
        });
      }
      if (!res.ok) return;
      const data = await res.json();
      const savedId = data.draft?.id || draftId;
      if (!draftId && savedId) setActiveDraftId(savedId);
      return { id: savedId };
    } catch {}
  }, []);

  // Switching drafts while a sprint is running is NOT the writer leaving
  // the sprint — they're still in it the whole time, just looking at a
  // different draft. So this keeps the SAME sprint row running (no
  // checkout, no rejoin) and only shifts its startWords baseline once the
  // new draft's word count is known, so the total already earned carries
  // over exactly and keeps climbing from there. Capture what was earned
  // on the draft being left *before* swapping anything, since wordCount is
  // about to change out from under us as the new draft loads.
  async function switchToDraft(id, isNew) {
    userPickedDraftRef.current = true;
    if (mySprint) {
      rebaselineInfoRef.current = { sprintId: mySprint.id, oldWordCount: wordCount };
    } else {
      rebaselineInfoRef.current = null;
    }
    setActiveDraftId(isNew ? null : id);
    setEditorInstanceKey((k) => k + 1);
    setDraftLoading(true);
    setPendingRebaseline(!!mySprint);
  }

  function selectDraft(id) {
    switchToDraft(id, false);
  }
  function createNewDraft() {
    switchToDraft(null, true);
  }

  // Once the newly-selected draft has finished loading (so we know its
  // true word count), rebaseline the still-running sprint against it —
  // re-anchoring startWords so (newWordCount - newStartWords) reproduces
  // the exact total already earned on the old draft. onDraftLoaded already
  // set startWordsRef.current to a naive "fresh start" baseline as a
  // fallback; this overwrites it with the real anchor once the server
  // responds. If the sprint ended while the switch was in flight, skip it
  // rather than rebaselining a dead sprint.
  useEffect(() => {
    if (!pendingRebaseline || draftLoading) return;
    setPendingRebaseline(false);
    const info = rebaselineInfoRef.current;
    rebaselineInfoRef.current = null;
    if (!info || !sprintIsLive || !mySprint || mySprint.id !== info.sprintId) return;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/sprint/${info.sprintId}/rebaseline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ oldWordCount: info.oldWordCount, newWordCount: wordCount }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.sprint) {
          setMySprint(data.sprint);
          startWordsRef.current = data.sprint.startWords;
        }
      } catch {}
    })();
  }, [pendingRebaseline, draftLoading, sprintIsLive, mySprint, wordCount]);

  const myStatus = members.find((m) => m.user.id === user?.id)?.status ?? null;

  const isHost = !!currentGroupSprint && currentGroupSprint.userId === user?.id;
  // Gate typing on the sheet behind an active, joined sprint — or behind
  // free-writing mode, which a writer can opt into from their sprint
  // summary to keep typing without being tied to a running sprint. Chat
  // stays open regardless — this only affects the editor pane.
  const canWrite = (sprintIsLive && !!mySprint) || freeWriting;

  if (loadingRoom) {
    return (
      <div className="h-full flex items-center justify-center bg-[#faf7f2]">
        <p className="text-sm text-[#9a8c7a]">Loading Sprint Room…</p>
      </div>
    );
  }

  if (!joined) {
    return <JoinRoomGate writerCount={members.length} onJoin={handleJoinRoom} joining={joining} />;
  }

  return (
    <div className="h-full overflow-hidden flex">
      {/* ── Left: editor ── */}
      <div
        className="flex-1 flex flex-col overflow-hidden min-w-0"
        style={{
          backgroundColor: "#c4915c",
          backgroundImage: `
            repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 96px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 2px, transparent 2px, transparent 96px),
            radial-gradient(ellipse at top, rgba(255,255,255,0.10), transparent 60%),
            linear-gradient(180deg, #d3a06a 0%, #bd875099 40%, #ab763f 100%)
          `,
        }}>

        {/* Top bar */}
        {!focusMode && (
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-[#e8dcc8] bg-[#faf7f2]/95 backdrop-blur-sm">
          <button
            onClick={() => navigate("/drafts")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7a6a50] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="min-w-0">
            <p className="text-sm font-bold text-[#2d3748] truncate">Sprint Room</p>
            <p className="text-[11px] text-[#9a8c7a]">{members.length} writer{members.length === 1 ? "" : "s"}</p>
          </div>

          {/* Sprint control — center */}
          <div className="flex-1 flex items-center justify-center">
            {sprintIsLive ? (
              mySprint ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2d3748] text-[#d4af37] text-xs font-bold tabular-nums">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatCountdown(sprintRemainingMs)}
                  </div>
                  <button
                    onClick={handleLeaveSprint}
                    title="Leave the sprint for just you — everyone else keeps writing"
                    className="px-2.5 py-1.5 rounded-lg border border-[#e8dcc8] text-[11px] font-semibold text-[#7a6a50] hover:border-red-300 hover:text-red-600 transition-all">
                    Leave sprint
                  </button>
                  {isHost && (
                    <button
                      onClick={handleEndGroupSprint}
                      title="Ends the sprint for everyone in the room, not just you"
                      className="px-2.5 py-1.5 rounded-lg border border-[#e8dcc8] text-[11px] font-semibold text-[#7a6a50] hover:border-red-300 hover:text-red-600 transition-all">
                      End for everyone
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setJoinSprintOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#d4af37] to-[#e8c766] text-[#2d3748] rounded-lg text-xs font-bold hover:brightness-105 transition-all">
                    Join Sprint with Soundscape · {formatCountdown(sprintRemainingMs)}
                  </button>
                  {isHost && (
                    <button
                      onClick={handleEndGroupSprint}
                      title="Ends the sprint for everyone in the room, not just you"
                      className="px-2.5 py-1.5 rounded-lg border border-[#e8dcc8] text-[11px] font-semibold text-[#7a6a50] hover:border-red-300 hover:text-red-600 transition-all">
                      End for everyone
                    </button>
                  )}
                </div>
              )
            ) : freeWriting ? (
              // Post-sprint, writing untimed: quick access to the two most
              // likely next moves (leave to your drafts list, or log this
              // session on the draft plan), with starting another timed
              // sprint sitting between them rather than a lone button.
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/drafts")}
                  className="px-2.5 py-1.5 rounded-lg border border-[#e8dcc8] text-[11px] font-semibold text-[#7a6a50] hover:border-[#2d3748] hover:text-[#2d3748] transition-all">
                  Go to draft
                </button>
                <button
                  onClick={() => setStartSprintOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#d4af37] to-[#e8c766] text-[#2d3748] rounded-lg text-xs font-bold hover:brightness-105 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start a new sprint
                </button>
                <button
                  onClick={() => navigate("/draftplan")}
                  className="px-2.5 py-1.5 rounded-lg border border-[#e8dcc8] text-[11px] font-semibold text-[#7a6a50] hover:border-[#2d3748] hover:text-[#2d3748] transition-all">
                  Log progress
                </button>
              </div>
            ) : (
              <button
                onClick={() => setStartSprintOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#e8dcc8] text-[#7a6a50] rounded-lg text-xs font-semibold hover:border-[#2d3748] hover:text-[#2d3748] transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Sprint
              </button>
            )}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setDraftModalOpen(true)}
              title="Switch draft"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-6 4h6m2 5H7a2 2 0 01-2-2V4a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V20a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => setFocusMode(true)}
              title="Enter focus mode"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              onClick={() => setThesaurusOpen((o) => !o)}
              title="Thesaurus"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                thesaurusOpen ? "bg-[#2d3748] text-white" : "text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8]"
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
            <button
              onClick={() => { setStickyNotesOn((o) => !o); setStickyPanel(null); }}
              title={stickyNotesOn ? "Turn off sticky notes" : "Turn on sticky notes"}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                stickyNotesOn ? "bg-[#2d3748] text-white" : "text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8]"
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h10a2 2 0 012 2v13l-4 3-4-3-4 3-2-1.5V5a2 2 0 012-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h6" />
              </svg>
            </button>
            {stickyNotesOn && (
              <DraftStickyNotesButton
                count={draftNotes.length}
                isOpen={!!stickyPanel && stickyPanel.paragraphIndex === null}
                onClick={() => setStickyPanel((p) => (p && p.paragraphIndex === null ? null : { paragraphIndex: null }))}
              />
            )}
            <span className="text-xs text-[#b8a898] tabular-nums hidden sm:inline-block px-1">
              {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
            </span>
            <button
              onClick={handleLeaveRoom}
              title="Leave sprint room"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:text-red-600 hover:bg-red-50 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        )}

        {/* ── Floating exit-focus button ──
             Always-visible, thumb-sized tap target — doesn't depend on the
             strip having room for its own "Exit" button, and doesn't rely
             on the Esc key. ── */}
        {focusMode && (
          <button
            onClick={() => setFocusMode(false)}
            title="Exit focus mode"
            aria-label="Exit focus mode"
            className="fixed bottom-5 left-5 z-40 w-12 h-12 rounded-full bg-[#2d3748] text-white shadow-xl flex items-center justify-center hover:bg-[#3d4f64] active:scale-95 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* ── Focus mode strip ── */}
        {focusMode && (
          <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-5 py-2.5 bg-[#faf7f2]/90 backdrop-blur-sm border-b border-[#e8dcc8]">
            <div className="flex items-center gap-3 min-w-0">
              <span className="hidden sm:inline text-[10px] font-semibold text-[#9a8c7a] uppercase tracking-widest">Focus mode</span>
              {sprintIsLive && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2d3748] text-[#d4af37] text-xs font-bold tabular-nums flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatCountdown(sprintRemainingMs)}
                </span>
              )}
              <span className="text-xs text-[#b8a898] tabular-nums flex-shrink-0">{wordCount.toLocaleString()} words</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setThesaurusOpen((o) => !o)}
                title="Thesaurus"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                  thesaurusOpen ? "bg-[#2d3748] text-white" : "text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8]"
                }`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </button>
              <button
                onClick={() => setFocusMode(false)}
                title="Exit focus mode (Esc)"
                className="ml-1 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#e8dcc8] text-xs font-semibold text-[#7a6a50] hover:border-[#2d3748] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="hidden sm:inline">Exit focus</span>
              </button>
            </div>
          </div>
        )}

        {/* Editor */}
        <main className={`flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-12 ${focusMode ? "pt-20" : ""}`}>
          <div className={`mx-auto transition-all duration-300 ${thesaurusOpen ? "max-w-3xl" : "max-w-4xl"}`}>
            <div
              ref={sheetRef}
              className="relative bg-white border border-[#e2d3b5] min-h-[75vh]"
              style={{ boxShadow: "0 30px 60px -15px rgba(35,22,8,0.45), 0 10px 24px rgba(35,22,8,0.22)" }}>
              <div className={!canWrite ? "pointer-events-none select-none opacity-40" : ""}>
                {draftDefaultResolved && (
                  <WriteEditor
                    key={editorInstanceKey}
                    draftId={activeDraftId}
                    contentRef={editorContentRef}
                    onWordsUpdate={setWordCount}
                    onAutoSave={handleSave}
                    onDraftLoaded={(wc) => {
                      setWordCount(wc);
                      // Mid-sprint draft switch: estimate the carried-over
                      // baseline immediately (using the total already earned
                      // on the old draft) so the progress bar doesn't flash
                      // to zero while the rebaseline call is in flight. The
                      // pendingRebaseline effect overwrites this with the
                      // server's real anchor once it responds.
                      const info = rebaselineInfoRef.current;
                      startWordsRef.current = info ? wc - info.oldWordCount + (startWordsRef.current ?? 0) : wc;
                      setDraftLoading(false);
                    }}
                    saveRef={saveRef}
                    showBlockTool={false}
                  />
                )}
                {stickyNotesOn && (
                  <ParagraphStickyOverlay
                    editorRef={editorContentRef}
                    wrapperRef={sheetRef}
                    notesByParagraph={notesByParagraph}
                    onSelectParagraph={(index) => setStickyPanel((p) => (p && p.paragraphIndex === index ? null : { paragraphIndex: index }))}
                  />
                )}
              </div>
              {draftLoading ? (
                <DraftLoadingBar />
              ) : (
                !canWrite && (
                  <EditorGate
                    sprintIsLive={sprintIsLive}
                    sprintRemainingMs={sprintRemainingMs}
                    onStart={() => setStartSprintOpen(true)}
                    onJoin={() => setJoinSprintOpen(true)}
                  />
                )
              )}
            </div>
          </div>
        </main>

        <ThesaurusDrawer isOpen={thesaurusOpen} onClose={() => setThesaurusOpen(false)} />
        <StickyNotesPanel
          isOpen={!!stickyPanel}
          onClose={() => setStickyPanel(null)}
          scopeLabel={stickyPanel ? (stickyPanel.paragraphIndex === null ? "Whole draft" : `Paragraph ${stickyPanel.paragraphIndex + 1}`) : ""}
          scopeNotes={stickyPanel ? (stickyPanel.paragraphIndex === null ? draftNotes : (notesByParagraph.get(stickyPanel.paragraphIndex) || [])) : []}
          onCreate={(payload) => createStickyNote({ ...payload, paragraphIndex: stickyPanel?.paragraphIndex ?? null })}
          onUpdate={updateStickyNote}
          onDelete={deleteStickyNote}
        />
      </div>

      {/* ── Right: writers / chat ── */}
      {!focusMode && (
      <aside className="w-full max-w-[420px] flex-shrink-0 bg-[#faf7f2] border-l border-[#e8dcc8] flex flex-col">
        {rightView === "chat" ? (
          <SprintRoomChat sprintRoomId={room.id} currentUserId={user?.id} onBack={() => setRightView("writers")} />
        ) : (
          <WritersPanel
            members={members}
            currentUserId={user?.id}
            myStatus={myStatus}
            onChangeStatus={handleChangeStatus}
            onOpenChat={openChat}
            onLeaveRoom={handleLeaveRoom}
            unreadChatCount={unreadChatCount}
          />
        )}
      </aside>
      )}

      {/* ── Modals ── */}
      <StartRoomSprintModal
        isOpen={startSprintOpen}
        onClose={() => setStartSprintOpen(false)}
        // Starting a sprint here also joins it (soundscape picker is part of
        // this same modal now), so the host lands writing immediately
        // instead of needing a second "join" step.
        onStarted={(gs, sprint) => {
          setCurrentGroupSprint(gs);
          if (sprint) {
            setMySprint(sprint);
            startWordsRef.current = wordCount;
            setFreeWriting(false);
          }
          setStartSprintOpen(false);
          fetchRoom();
        }}
        sprintIsLive={sprintIsLive}
        sprintRemainingMs={sprintRemainingMs}
        onJoinInstead={() => { setStartSprintOpen(false); setJoinSprintOpen(true); }}
        startWords={wordCount}
      />
      <JoinSprintModal
        isOpen={joinSprintOpen}
        onClose={() => setJoinSprintOpen(false)}
        groupSprintId={currentGroupSprint?.id}
        startWords={wordCount}
        onJoined={() => { setJoinSprintOpen(false); setFreeWriting(false); fetchRoom(); }}
      />
      <SprintRoomDraftModal
        isOpen={draftModalOpen}
        onClose={() => setDraftModalOpen(false)}
        activeDraftId={activeDraftId}
        onSelect={selectDraft}
        onCreateNew={createNewDraft}
      />
      <SprintSummaryModal
        isOpen={showSprintSummary}
        onClose={() => setShowSprintSummary(false)}
        wordsWritten={sprintWordsWritten}
        draftTotalWords={wordCount}
        sprintIsLive={sprintIsLive}
        sprintRemainingMs={sprintRemainingMs}
        onStartNew={() => { setShowSprintSummary(false); setStartSprintOpen(true); }}
        onJoinExisting={() => { setShowSprintSummary(false); setJoinSprintOpen(true); }}
        // Two explicit next steps once a sprint wraps up: stay in the room
        // and keep typing untimed, or head over to the drafts list. A "Join
        // Sprint" button still appears at the top of the room on its own
        // whenever someone else starts a new one (sprintIsLive && !mySprint).
        onKeepWriting={() => { setFreeWriting(true); setShowSprintSummary(false); }}
      />
    </div>
  );
}