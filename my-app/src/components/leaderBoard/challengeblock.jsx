import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "@/config/api";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function daysLeft(endDate) {
  const diff = new Date(endDate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function daysPassed(startDate) {
  const diff = new Date() - new Date(startDate);
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function Avatar({ user, size = 32 }) {
  const initials = (user?.username ?? "?")[0].toUpperCase();
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.username}
        style={{
          width: size, height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          border: "1.5px solid rgba(212,175,55,0.25)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: "50%",
        background: "rgba(212,175,55,0.12)",
        border: "1.5px solid rgba(212,175,55,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.4, fontWeight: 700,
        color: "#d4af37",
        flexShrink: 0,
        fontFamily: "Georgia, serif",
      }}
    >
      {initials}
    </div>
  );
}

// ─── SKELETON ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div
      className="rounded-3xl overflow-hidden animate-pulse"
      style={{ background: "#1a2033", minHeight: 220 }}
    >
      <div className="px-7 pt-7 pb-6">
        <div className="h-3 bg-white/10 rounded w-1/3 mb-4" />
        <div className="h-8 bg-white/10 rounded w-2/3 mb-6" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── NO ACTIVE CHALLENGE ─────────────────────────────────────────────────────

function NoChallenge() {
  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(140deg, #141c2e 0%, #1a2540 55%, #1e2d4a 100%)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.08), 0 24px 64px rgba(10,15,30,0.28)",
      }}
    >
      <GoldTopBorder />
      <DotGrid />
      <div className="relative z-10 px-6 sm:px-8 pt-7 pb-8 text-center">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#d4af37] mb-4">
          Days Writing Challenge
        </p>
        <p className="text-white/90 text-sm leading-relaxed">
          No challenge is running right now.
        </p>
        <p className="text-white/65 text-xs mt-1">
          Watch this space — the next one is coming.
        </p>
      </div>
    </div>
  );
}

// ─── SHARED DECORATIONS ───────────────────────────────────────────────────────

function GoldTopBorder() {
  return (
    <div
      className="absolute top-0 left-8 right-8 h-px"
      style={{
        background: "linear-gradient(90deg, transparent, #d4af37 40%, #d4af37 60%, transparent)",
      }}
    />
  );
}

function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}

// ─── RANK MEDAL ──────────────────────────────────────────────────────────────

function RankLabel({ rank }) {
  const labels  = ["I", "II", "III"];
  const colours = [
    { bg: "rgba(212,175,55,0.15)", border: "rgba(212,175,55,0.45)", text: "#d4af37" },
    { bg: "rgba(192,192,192,0.12)", border: "rgba(192,192,192,0.35)", text: "#c0c0c0" },
    { bg: "rgba(176,141,87,0.12)", border: "rgba(176,141,87,0.35)", text: "#b08d57" },
  ];
  const c = colours[rank - 1] ?? colours[2];
  return (
    <div
      style={{
        width: 28, height: 28,
        borderRadius: "50%",
        background: c.bg,
        border: `1px solid ${c.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 800,
        color: c.text,
        letterSpacing: "0.05em",
        flexShrink: 0,
        fontFamily: "Georgia, serif",
      }}
    >
      {labels[rank - 1] ?? rank}
    </div>
  );
}

// ─── WINNERS BOARD ───────────────────────────────────────────────────────────

function WinnersBoard({ event, winners, navigate }) {
  const hasWinners = winners && winners.length > 0;

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(140deg, #141c2e 0%, #1a2540 55%, #1e2d4a 100%)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.08), 0 24px 64px rgba(10,15,30,0.28)",
      }}
    >
      <GoldTopBorder />
      <DotGrid />

      <div className="relative z-10 px-6 sm:px-8 pt-7 pb-6">
        {/* Header */}
        <div className="mb-5">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#d4af37] mb-0.5">
            {event.daysTarget}-Day Writing Challenge — Completed
          </p>
          <h2
            className="font-serif font-bold text-white"
            style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            {event.title}
          </h2>
        </div>

        {/* Divider */}
        <div className="mb-5 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

        {hasWinners ? (
          <>
            <p className="text-[11px] text-white/80 uppercase tracking-[0.18em] font-semibold mb-4">
              Challenge Honours
            </p>

            {/* Winner rows — editorial list, not cards */}
            <div className="space-y-0">
              {winners.slice(0, 5).map((w, i) => (
                <div
                  key={w.userId ?? i}
                  className="flex items-center gap-3 py-3"
                  style={{
                    borderBottom: i < winners.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                  }}
                >
                  <RankLabel rank={i + 1} />
                  <Avatar user={w.user} size={34} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-white font-semibold truncate"
                      style={{ fontSize: 13, letterSpacing: "-0.01em" }}
                    >
                      {w.user?.username ?? "[deleted]"}
                    </p>
                    {w.streak != null && (
                      <p className="text-white/70 text-[10px] mt-0.5">
                        {w.streak} day streak
                      </p>
                    )}
                  </div>
                  {w.streak != null && (
                    <p
                      className="text-[#d4af37] font-bold font-serif flex-shrink-0"
                      style={{ fontSize: 15 }}
                    >
                      {w.streak}d
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-white/90 text-sm">No winners recorded for this challenge.</p>
            <p className="text-white/60 text-xs mt-1">Watch for the next one.</p>
          </div>
        )}

        {/* Link to full event */}
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => navigate(`/events/${event.id}`)}
            className="text-[11px] font-semibold tracking-wide text-[#d4af37]/60 hover:text-[#d4af37] transition-colors"
          >
            View full challenge results
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ACTIVE CHALLENGE ─────────────────────────────────────────────────────────

function ActiveChallenge({ event, projects, navigate }) {
  const start     = new Date(event.startDate);
  const end       = new Date(event.endDate);
  const passed    = daysPassed(start);
  const remaining = daysLeft(end);
  const total     = event.daysTarget ?? Math.round((end - start) / (1000 * 60 * 60 * 24));
  const progress  = Math.min(100, Math.round((passed / total) * 100));

  // Show up to 5 participants
  const visible = (projects ?? []).slice(0, 5);

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(140deg, #141c2e 0%, #1a2540 55%, #1e2d4a 100%)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.08), 0 24px 64px rgba(10,15,30,0.28)",
      }}
    >
      <GoldTopBorder />
      <DotGrid />

      <div className="relative z-10 px-6 sm:px-8 pt-7 pb-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#d4af37]">
            {total}-Day Writing Challenge — Live
          </p>
          <span
            className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.25)",
              color: "#4ade80",
            }}
          >
            Day {passed + 1}
          </span>
        </div>

        <h2
          className="font-serif font-bold text-white mb-4"
          style={{ fontSize: "clamp(1.4rem, 4vw, 1.9rem)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
        >
          {event.title}
        </h2>

        {/* Progress bar */}
        <div className="mb-5">
          <div
            className="rounded-full overflow-hidden"
            style={{ height: 4, background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #c09a28, #d4af37)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-white/65">{passed} day{passed !== 1 ? "s" : ""} in</span>
            <span className="text-[10px] text-white/65">{remaining} day{remaining !== 1 ? "s" : ""} left</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-4 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Participants */}
        {visible.length > 0 ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/75 mb-3">
              Participating writers
            </p>
            <div className="space-y-0">
              {visible.map((p, i) => (
                <div
                  key={p.id ?? i}
                  className="flex items-center gap-3 py-2.5"
                  style={{
                    borderBottom: i < visible.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                  }}
                >
                  <Avatar user={p.user} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate" style={{ fontSize: 12.5 }}>
                      {p.user?.username ?? "[deleted]"}
                    </p>
                    {p.title && (
                      <p className="text-white/65 text-[10px] truncate mt-0.5">{p.title}</p>
                    )}
                  </div>
                  {p.currentStreak != null && (
                    <div
                      className="flex-shrink-0 text-right"
                      style={{ minWidth: 36 }}
                    >
                      <p className="text-[#d4af37] font-bold font-serif" style={{ fontSize: 13 }}>
                        {p.currentStreak}d
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {projects.length > 5 && (
              <p className="text-[10px] text-white/65 mt-3">
                +{projects.length - 5} more writers in the challenge
              </p>
            )}
          </>
        ) : (
          <p className="text-white/80 text-sm text-center py-2">
            No participants yet. Be the first to join.
          </p>
        )}

        {/* CTA */}
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => navigate(`/events/${event.id}`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #d4af37 0%, #c09a28 100%)",
              color: "#12181f",
              boxShadow: "0 4px 22px rgba(212,175,55,0.35), 0 1px 0 rgba(255,255,255,0.15) inset",
            }}
          >
            Join the challenge
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ChallengeBlock() {
  const navigate  = useNavigate();
  const [state,   setState]   = useState("loading"); // loading | active | ended | none
  const [event,   setEvent]   = useState(null);
  const [projects, setProjects] = useState([]);
  const [winners,  setWinners]  = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      // Fetch all active events
      const res  = await fetch(`${API_URL}/events/active`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const { events } = await res.json();

      // Find the first DAYS_CHALLENGE
      const challenge = (events ?? []).find((e) => e.type === "DAYS_CHALLENGE");

      if (challenge) {
        // Fetch participant projects
        const pRes = await fetch(`${API_URL}/events/${challenge.id}/projects`, {
          credentials: "include",
        });
        const pData = pRes.ok ? await pRes.json() : { projects: [] };
        setEvent(challenge);
        setProjects(pData.projects ?? []);
        setState("active");
        return;
      }

      // No active challenge — look for a recently ended one to show winners
      // We try the winners endpoint for the most recent event that was a DAYS_CHALLENGE.
      // Since we don't have a "latest ended challenge" endpoint, we skip this step
      // unless you add one. For now: show the "watch for next" message.
      // If you want to show the last ended challenge, pass its ID here.
      setState("none");
    } catch {
      setState("none");
    }
  }

  if (state === "loading") return <Skeleton />;
  if (state === "none")    return <NoChallenge />;
  if (state === "ended")   return <WinnersBoard event={event} winners={winners} navigate={navigate} />;

  return <ActiveChallenge event={event} projects={projects} navigate={navigate} />;
}