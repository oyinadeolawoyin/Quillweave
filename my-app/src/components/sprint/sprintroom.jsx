// src/components/sprint/sprintRoom.jsx
//
// ─── Sprint Room — the lobby before the room ───────────────────────────────
// Landing page for /sprint-room. Shows who's currently sprinting, invites
// the writer to start (solo or group), surfaces the standing Friday 4pm UTC
// sprint with a reminder opt-in, recaps the last group sprint, and closes
// with the soundscape contribution CTA. Clicking the clock opens the
// existing StartGroupSprintModal; joining a live room opens JoinGroupSprintModal.
//
// Route this in main.jsx under the shared Layout, e.g.:
//   { path: "sprint-room", element: <SprintRoom /> }

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { StartGroupSprintModal, JoinGroupSprintModal } from "./groupSprintModal";
import ContributeSoundscape from "./Contributesoundscape";
import { AppMetaTags } from "../utilis/metatags";

// ─── Small helpers ──────────────────────────────────────────────────────────

function fmt(n) {
  return (n ?? 0).toLocaleString();
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = Math.floor(diff / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

// Next upcoming Friday 16:00 UTC, as a Date — used by the clock + countdown.
function nextFridayFourPM() {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(16, 0, 0, 0);
  const day = target.getUTCDay(); // 0 Sun .. 6 Sat, Friday = 5
  let addDays = (5 - day + 7) % 7;
  if (addDays === 0 && target.getTime() <= now.getTime()) addDays = 7;
  target.setUTCDate(target.getUTCDate() + addDays);
  return target;
}

function localTimeLabel(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function localDayLabel(date) {
  return date.toLocaleDateString([], { weekday: "long" });
}

function countdownParts(target) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { days, hours, minutes };
}

// ─── The signature element: a ticking ink-and-brass alarm clock ────────────
// The gold wedge marks where, on the dial, the next Friday 4pm UTC sprint
// falls in *this viewer's local time* — so the clock face itself tells you
// when to show up, no matter your timezone.

function AlarmClock({ onClick, nextSprint, size = 220 }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const r = size / 2;
  const cx = r, cy = r;
  const faceR = r - 14;

  const secAngle = (now.getSeconds() / 60) * 360;
  const minAngle = ((now.getMinutes() + now.getSeconds() / 60) / 60) * 360;
  const hourAngle = (((now.getHours() % 12) + now.getMinutes() / 60) / 12) * 360;

  // Sprint wedge: where the next Friday sprint sits on a 12-hour dial.
  const sprintHour = nextSprint.getHours() % 12;
  const sprintMinute = nextSprint.getMinutes();
  const sprintAngle = ((sprintHour + sprintMinute / 60) / 12) * 360;

  function point(angle, len) {
    const rad = (angle - 90) * (Math.PI / 180);
    return [cx + len * Math.cos(rad), cy + len * Math.sin(rad)];
  }

  const [hx, hy] = point(hourAngle, faceR * 0.5);
  const [mx, my] = point(minAngle, faceR * 0.72);
  const [sx, sy] = point(secAngle, faceR * 0.8);

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30;
    const outer = point(angle, faceR - 4);
    const inner = point(angle, faceR - (i % 3 === 0 ? 14 : 9));
    return { x1: outer[0], y1: outer[1], x2: inner[0], y2: inner[1], major: i % 3 === 0 };
  });

  // Sprint wedge path (8-degree slice centered on sprintAngle)
  const wedgeHalf = 4;
  const [w1x, w1y] = point(sprintAngle - wedgeHalf, faceR - 2);
  const [w2x, w2y] = point(sprintAngle + wedgeHalf, faceR - 2);

  return (
    <button
      onClick={onClick}
      aria-label="Start a sprint"
      className="group relative flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a2e] rounded-full"
      style={{ width: size, height: size + 22 }}
    >
      {/* Bell caps */}
      <div className="absolute -top-1 left-[18%] w-[18%] aspect-square rounded-full bg-[#d4af37] shadow-md transition-transform group-hover:-rotate-6 group-active:scale-95" />
      <div className="absolute -top-1 right-[18%] w-[18%] aspect-square rounded-full bg-[#d4af37] shadow-md transition-transform group-hover:rotate-6 group-active:scale-95" />
      {/* Feet */}
      <div className="absolute bottom-0 left-[30%] w-[8%] h-3 rounded-full bg-[#9a8c7a]" />
      <div className="absolute bottom-0 right-[30%] w-[8%] h-3 rounded-full bg-[#9a8c7a]" />

      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="relative drop-shadow-xl transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[0.98]"
        style={{ marginTop: 10 }}
      >
        <circle cx={cx} cy={cy} r={r - 6} fill="#1a1a2e" />
        <circle cx={cx} cy={cy} r={r - 6} fill="none" stroke="#d4af37" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={faceR} fill="#fffdf8" />

        {/* Sprint-time wedge */}
        <path
          d={`M ${cx} ${cy} L ${w1x} ${w1y} A ${faceR - 2} ${faceR - 2} 0 0 1 ${w2x} ${w2y} Z`}
          fill="#d4af37"
          opacity="0.35"
        />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="#2d3748" strokeWidth={t.major ? 2.5 : 1.3} strokeLinecap="round" />
        ))}

        {/* Hands */}
        <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#1a1a2e" strokeWidth="5" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={mx} y2={my} stroke="#1a1a2e" strokeWidth="3.5" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={sx} y2={sy} stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />

        <circle cx={cx} cy={cy} r="5" fill="#d4af37" />
        <circle cx={cx} cy={cy} r="2" fill="#1a1a2e" />
      </svg>

      {/* Hover label */}
      <span className="absolute inset-x-0 -bottom-1 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-[#d4af37] opacity-0 group-hover:opacity-100 transition-opacity">
        Tap to start
      </span>
    </button>
  );
}

// ─── Live member chip ───────────────────────────────────────────────────────

function MemberChip({ s }) {
  const username = s.user?.username || "writer";
  const avatar = s.user?.avatar;
  return (
    <Link
      to={`/profile/${s.user?.id}`}
      className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white border border-[#e8e0d0] hover:border-[#d4af37] transition-all flex-shrink-0"
      title={`@${username}`}
    >
      {avatar ? (
        <img src={avatar} alt={username} className="w-6 h-6 rounded-full object-cover" />
      ) : (
        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#1a1a2e]">
          <span className="text-[9px] font-bold text-[#d4af37] uppercase">{username.charAt(0)}</span>
        </div>
      )}
      <span className="text-xs font-medium text-[#2d3748]">@{username}</span>
    </Link>
  );
}

// ─── Active room card ───────────────────────────────────────────────────────

function ActiveRoomCard({ room, onJoin }) {
  const members = room.sprints || [];
  const memberCount = room._count?.sprints ?? members.length;
  const isReading = room.sprintType === "READING";

  return (
    <div className="rounded-2xl border border-[#e8e0d0] bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <p className="text-sm font-semibold text-[#1a1a2e] truncate">
            @{room.user?.username}'s room
          </p>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9a8c7a] bg-[#f5f3ef] px-2 py-0.5 rounded-full flex-shrink-0">
            {room.duration}m · {isReading ? "Reading" : "Writing"}
          </span>
        </div>

        {members.length > 0 ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
            {members.slice(0, 6).map((s, i) => <MemberChip key={s.id ?? i} s={s} />)}
            {memberCount > 6 && (
              <span className="text-xs text-[#9a8c7a] font-medium flex-shrink-0 px-1">
                +{memberCount - 6} more
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#9a8c7a]">No one's checked in yet — be the first.</p>
        )}
      </div>

      <button
        onClick={() => onJoin(room)}
        className="px-5 py-2.5 bg-[#2d3748] text-white text-sm font-semibold rounded-xl hover:bg-[#3d4f64] transition-all flex-shrink-0 w-full sm:w-auto"
      >
        Join room
      </button>
    </div>
  );
}

// ─── Last sprint recap (compact, reused styling from lastgroupsprintrecap) ─

function LastSprintRecap({ sprint }) {
  if (!sprint) {
    return (
      <div className="rounded-2xl overflow-hidden border border-[#d4af37]/30">
        <div className="bg-[#1a1a2e] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-1">Last Session</p>
          <p className="text-white/60 text-[13px]">No group sprint yet — yours could be the first.</p>
        </div>
      </div>
    );
  }

  const members = sprint.sprints || [];
  const totalWords = sprint.totalWordsWritten || 0;
  const hostUsername = sprint.user?.username;
  const sprintType = sprint.sprintType === "READING" ? "Reading" : "Writing";
  const when = timeAgo(sprint.completedAt);
  const memberCount = sprint._count?.sprints || members.length;

  return (
    <div className="rounded-2xl overflow-hidden border border-[#e8e0d0] shadow-sm">
      <div className="bg-[#1a1a2e] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-1.5">Last Session</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white text-[14px] font-semibold leading-snug">{sprintType} sprint</p>
            <p className="text-white/70 text-[11px] mt-0.5">
              hosted by <span className="text-[#d4af37] font-medium">@{hostUsername}</span>
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-serif text-2xl font-bold text-white leading-none">{fmt(totalWords)}</p>
            <p className="text-[10px] text-white/70 mt-0.5 uppercase tracking-wider">words · {when}</p>
          </div>
        </div>
      </div>

      <div className="h-[2px] bg-[#d4af37]" />

      {members.length > 0 && (
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a8c7a] mb-2.5">
            {memberCount} writer{memberCount !== 1 ? "s" : ""} showed up
          </p>
          <div className="space-y-1.5">
            {members.slice(0, 5).map((s, i) => {
              const username = s.user?.username || "writer";
              const avatar = s.user?.avatar;
              const project = s.project?.title;
              return (
                <div key={s.id ?? i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#f5f3ef]">
                  <Link to={`/profile/${s.user?.id}`} className="flex-shrink-0">
                    {avatar ? (
                      <img src={avatar} alt={username} className="w-7 h-7 rounded-full object-cover ring-1 ring-[#d4af37]/30" />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1a1a2e] ring-1 ring-[#d4af37]/30">
                        <span className="text-[10px] font-bold text-[#d4af37] uppercase">{username.charAt(0)}</span>
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${s.user?.id}`} className="text-[12px] font-semibold text-[#1a1a2e] hover:text-[#d4af37] transition-colors block truncate">
                      @{username}
                    </Link>
                    {project && (
                      <p className="text-[11px] text-[#9a8c7a] truncate">
                        working on <span className="font-medium text-[#6b5c4a]">{project}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-white bg-[#1a1a2e] px-2 py-0.5 rounded-full flex-shrink-0">
                    {sprint.duration} min
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-[#fffdf0] border-t border-[#d4af37]/20 px-4 py-2.5 flex items-center justify-between gap-2">
        <p className="text-[10px] text-[#9a8c7a]">
          Sprints every <span className="font-semibold text-[#6b5c4a]">Wed, Fri &amp; Sat</span> at 4pm UTC
        </p>
        <span className="text-[10px] font-bold text-[#d4af37] uppercase tracking-wider">Show up &amp; write</span>
      </div>
    </div>
  );
}

// ─── Friday reminder opt-in card ────────────────────────────────────────────

function FridayReminderCard({ user }) {
  const [optedIn, setOptedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const target = nextFridayFourPM();
  const [countdown, setCountdown] = useState(countdownParts(target));

  useEffect(() => {
    const id = setInterval(() => setCountdown(countdownParts(target)), 30000);
    return () => clearInterval(id);
  }, [target]);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    fetch(`${API_URL}/notifications/sprint-reminder`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOptedIn(Boolean(d?.optedIn)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [user]);

  async function toggle() {
    if (!user || saving) return;
    const next = !optedIn;
    setOptedIn(next);
    setSaving(true);
    try {
      await fetch(`${API_URL}/notifications/sprint-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ optedIn: next }),
      });
    } catch {
      setOptedIn(!next); // revert on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#e8e0d0] bg-[#fffbf0] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b8932c] mb-1.5">Standing sprint</p>
        <p className="font-serif text-lg text-[#1a1a2e] leading-snug mb-1">
          Quillweave sprints every Friday, 4pm UTC
        </p>
        <p className="text-sm text-[#6b5c4a]">
          That's <span className="font-semibold text-[#2d3748]">{localDayLabel(target)} at {localTimeLabel(target)}</span> your time —
          {" "}{countdown.days > 0 ? `${countdown.days}d ` : ""}{countdown.hours}h {countdown.minutes}m away.
        </p>
      </div>

      <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all flex-shrink-0 cursor-pointer ${
        !user ? "opacity-50 cursor-not-allowed border-[#e8e0d0] bg-white" :
        optedIn ? "border-[#d4af37] bg-white" : "border-[#e8e0d0] bg-white hover:border-[#c4b898]"
      }`}>
        <input
          type="checkbox"
          checked={optedIn}
          disabled={!user || !loaded}
          onChange={toggle}
          className="w-4 h-4 rounded accent-[#d4af37] flex-shrink-0"
        />
        <span className="text-sm text-[#2d3748] font-medium leading-tight">
          Remind me<br className="hidden sm:block" /> 30 min before
        </span>
      </label>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SprintRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeRooms, setActiveRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [lastSprint, setLastSprint] = useState(null);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState(null);

  const loadRooms = useCallback(() => {
    fetch(`${API_URL}/sprint/activeGroupSprints?limit=6`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setActiveRooms(d?.groupSprints || []))
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, []);

  useEffect(() => {
    loadRooms();
    const id = setInterval(loadRooms, 15000);
    return () => clearInterval(id);
  }, [loadRooms]);

  useEffect(() => {
    fetch(`${API_URL}/sprint/lastGroupSprint`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLastSprint(d?.groupSprint || null))
      .catch(() => {});
  }, []);

  function handleStartClick() {
    if (!user) { navigate("/login"); return; }
    setStartModalOpen(true);
  }

  function handleCreated(groupSprint, openEditor) {
    navigate(`/group-sprint/${groupSprint.id}`, { state: { writingMode: openEditor ? "quillweave" : null } });
  }

  const nextSprint = nextFridayFourPM();
  const hasRooms = activeRooms.length > 0;

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      <AppMetaTags
        title="The Sprint Room"
        description="Sprint solo or with friends — set the clock, show up, write."
      />

      {/* ── Hero: the clock ── */}
      <section className="rounded-3xl bg-[#1a1a2e] px-6 sm:px-10 py-10 sm:py-14 mb-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 24px, #d4af37 25px)" }}
        />
        <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <AlarmClock onClick={handleStartClick} nextSprint={nextSprint} size={200} />

          <div className="text-center md:text-left flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-2">The Sprint Room</p>
            <h1 className="font-serif text-2xl sm:text-3xl text-white leading-tight mb-3">
              Set the clock. Show up. Write.
            </h1>
            <p className="text-sm text-white/70 leading-relaxed mb-6 max-w-md mx-auto md:mx-0">
              Sprint solo whenever the mood strikes, or open a room and invite friends to write alongside you.
              Either way, tap the clock to begin.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <button
                onClick={handleStartClick}
                className="px-6 py-3 bg-[#d4af37] text-[#1a1a2e] text-sm font-semibold rounded-xl hover:bg-[#e0bf4f] transition-all"
              >
                Start a sprint
              </button>
              <span className="text-xs text-white/50 self-center">
                Solo by default — invite others once you're in
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who's sprinting now ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[#9a8c7a]">
            Sprinting right now
          </h2>
          {hasRooms && (
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              {activeRooms.length} live
            </span>
          )}
        </div>

        {loadingRooms ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-[#f5f3ef] animate-pulse" />
            ))}
          </div>
        ) : hasRooms ? (
          <div className="space-y-3">
            {activeRooms.map((room) => (
              <ActiveRoomCard key={room.id} room={room} onJoin={(r) => (user ? setJoinTarget(r) : navigate("/login"))} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e0d8cc] bg-[#faf7f2] px-6 py-8 text-center">
            <p className="text-sm text-[#6b5c4a] mb-1">No one's in the room yet.</p>
            <p className="text-xs text-[#9a8c7a]">Tap the clock above and be the first to start writing — solo or open to others.</p>
          </div>
        )}
      </section>

      {/* ── Friday standing sprint ── */}
      <section className="mb-6">
        <FridayReminderCard user={user} />
      </section>

      {/* ── Last sprint recap ── */}
      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[#9a8c7a] mb-3 px-1">
          Last sprint in this room
        </h2>
        <LastSprintRecap sprint={lastSprint} />
      </section>

      {/* ── Contribute a soundscape ── */}
      <section className="mb-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-[#9a8c7a] mb-3 px-1">
          Got a sound that helps you write?
        </h2>
        <ContributeSoundscape />
      </section>

      {/* ── Modals ── */}
      <StartGroupSprintModal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        onCreated={handleCreated}
      />
      {joinTarget && (
        <JoinGroupSprintModal
          preselectedSprint={joinTarget}
          onClose={() => setJoinTarget(null)}
        />
      )}
    </main>
  );
}