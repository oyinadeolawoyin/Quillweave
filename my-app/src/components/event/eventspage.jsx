// src/components/events/eventsPage.jsx
//
// The "Events" page linked from the sidebar. Shows the ongoing/upcoming
// event(s) with title, description, image, the finisher role, and who's
// currently participating. Members can join/leave from here too.
//
// Wire it up in your router (main.jsx) as a child of the dashboard Layout,
// e.g.:
//   <Route path="/events" element={<EventsPage />} />

import { useEffect, useState } from "react";
import API_URL from "@/config/api";
import { useAuth } from "../auth/authContext";
import { renderMarkdownLite } from "./markdownlite";
import { AppMetaTags } from "../utilis/metatags";

const NAVY = "#1a1a2e";
const GOLD = "#d4af37";
const CREAM = "#f5f3ef";
const BORDER = "#e8e0d0";
const MUTED = "#9a8c7a";
const BODY = "#6b5c4a";

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusPill({ status }) {
  const styles = {
    ACTIVE:   { background: GOLD, color: "white", label: "Happening now" },
    UPCOMING: { background: NAVY, color: "white", label: "Upcoming" },
    ENDED:    { background: "#e5e5e5", color: "#6b6b6b", label: "Ended" },
  }[status] || { background: MUTED, color: "white", label: status };

  return (
    <span
      className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full flex-shrink-0"
      style={{ background: styles.background, color: styles.color }}
    >
      {styles.label}
    </span>
  );
}

function ParticipantRow({ p }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {p.user?.avatar ? (
        <img src={p.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: `${GOLD}25`, color: NAVY }}
        >
          {(p.user?.username || "?")[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: NAVY }}>{p.user?.username}</p>
        <p className="text-xs truncate" style={{ color: MUTED }}>{p.storyTitle}</p>
      </div>
      {p.isCompleted && (
        <span className="text-[10px] font-bold uppercase tracking-wide flex-shrink-0" style={{ color: GOLD }}>
          Finished ✓
        </span>
      )}
    </div>
  );
}

function EventCard({ event, participation, onJoin, onLeave, joining }) {
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  async function toggleParticipants() {
    const next = !showParticipants;
    setShowParticipants(next);
    if (next && participants.length === 0) {
      setLoadingParticipants(true);
      try {
        const res = await fetch(`${API_URL}/events/${event.id}/participants?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setParticipants(data.participants || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingParticipants(false);
      }
    }
  }

  const isActive = event.status === "ACTIVE";
  const isEnded = event.status === "ENDED";

  return (
    <div className="bg-white rounded-2xl border shadow-soft overflow-hidden" style={{ borderColor: BORDER }}>
      {event.imageUrl && (
        <img src={event.imageUrl} alt="" className="w-full h-auto max-h-[420px] object-contain" style={{ background: CREAM }} />
      )}

      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-serif text-xl" style={{ color: NAVY }}>{event.title}</h3>
          <StatusPill status={event.status} />
        </div>

        <div className="text-sm leading-relaxed mb-4" style={{ color: BODY }}>
          {renderMarkdownLite(event.description)}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs mb-4" style={{ color: MUTED }}>
          <span>📅 {formatDate(event.startDate)} – {formatDate(event.endDate)}</span>
          <span>👥 {event.participantCount ?? 0} participating</span>
          {event.badgeName && (
            <span>{event.badgeIcon} Finish and earn: <strong style={{ color: NAVY }}>{event.badgeName}</strong></span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!isEnded && participation && (
            participation.joined ? (
              <button
                onClick={() => onLeave(event.id)}
                disabled={joining}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border hover:bg-gray-50 transition-all disabled:opacity-60"
                style={{ borderColor: BORDER, color: NAVY }}
              >
                {joining ? "Leaving…" : "Leave event"}
              </button>
            ) : participation.hasDraftPlan ? (
              <button
                onClick={() => onJoin(event.id)}
                disabled={joining}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
                style={{ background: NAVY }}
              >
                {joining ? "Joining…" : isActive ? "Join event" : "Reserve your spot"}
              </button>
            ) : (
              <p className="text-xs" style={{ color: MUTED }}>
                You need a draft plan to join — create one from "My Draft Plan".
              </p>
            )
          )}

          <button
            onClick={toggleParticipants}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border hover:bg-gray-50 transition-all"
            style={{ borderColor: BORDER, color: BODY }}
          >
            {showParticipants ? "Hide participants" : "See who's participating"}
          </button>
        </div>

        {showParticipants && (
          <div className="mt-4 pt-4 border-t divide-y" style={{ borderColor: BORDER }}>
            {loadingParticipants ? (
              <p className="text-sm py-2" style={{ color: MUTED }}>Loading…</p>
            ) : participants.length === 0 ? (
              <p className="text-sm py-2" style={{ color: MUTED }}>No one has joined yet — be the first!</p>
            ) : (
              participants.map((p) => <ParticipantRow key={p.id} p={p} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [participationByEvent, setParticipationByEvent] = useState({});
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/events?limit=20`);
      const data = res.ok ? await res.json() : { events: [] };
      const all = Array.isArray(data.events) ? data.events : [];
      // Show ongoing + upcoming first, ended events after (in case someone
      // wants to look back at what already happened).
      const sorted = [...all].sort((a, b) => {
        const rank = { ACTIVE: 0, UPCOMING: 1, ENDED: 2 };
        return rank[a.status] - rank[b.status];
      });
      setEvents(sorted);

      if (user) {
        const entries = await Promise.all(
          sorted
            .filter((e) => e.status !== "ENDED")
            .map(async (e) => {
              const r = await fetch(`${API_URL}/events/${e.id}/participation`, { credentials: "include" });
              return [e.id, r.ok ? await r.json() : null];
            })
        );
        setParticipationByEvent(Object.fromEntries(entries));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(eventId) {
    setJoiningId(eventId);
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/join`, { method: "POST", credentials: "include" });
      if (res.ok) {
        setParticipationByEvent((prev) => ({ ...prev, [eventId]: { ...prev[eventId], hasDraftPlan: true, joined: true } }));
        setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, participantCount: (e.participantCount ?? 0) + 1 } : e));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setJoiningId(null);
    }
  }

  async function handleLeave(eventId) {
    setJoiningId(eventId);
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/leave`, { method: "POST", credentials: "include" });
      if (res.ok) {
        setParticipationByEvent((prev) => ({ ...prev, [eventId]: { ...prev[eventId], joined: false } }));
        setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, participantCount: Math.max(0, (e.participantCount ?? 1) - 1) } : e));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <AppMetaTags
        title="Events"
        description="Ongoing and upcoming community events on Quillweave — join in, track who's participating, and see what finishing earns you."
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: GOLD }}>Community</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight mb-1" style={{ color: NAVY }}>Events</h1>
          <p className="text-sm" style={{ color: MUTED }}>
            Ongoing and upcoming community events — join in, track who's participating, and see what finishing earns you.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border" style={{ borderColor: BORDER }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: BORDER }}>
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-sm" style={{ color: MUTED }}>No events yet — check back soon.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                participation={participationByEvent[event.id]}
                onJoin={handleJoin}
                onLeave={handleLeave}
                joining={joiningId === event.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}