// src/components/events/eventJoinBanner.jsx
//
// Drop this at the top of the Draft Plan dashboard page:
//
//   import { EventJoinBanner } from "../events/eventJoinBanner";
//   ...
//   return (
//     <div>
//       <EventJoinBanner />
//       {/* rest of the draft plan dashboard */}
//     </div>
//   );
//
// Behaviour:
//   - No event running/upcoming  → renders nothing.
//   - Event is ACTIVE            → "Join {title}" banner. If the writer has
//                                   no draft plan yet, the button is swapped
//                                   for a nudge to create one first.
//   - Event is UPCOMING          → a quieter "starts on {date}" awareness
//                                   banner, with an optional early "Reserve
//                                   your spot" action (calls the same join
//                                   endpoint — the backend allows joining
//                                   before the event starts).
//   - Already joined             → a confirmation state with a link to the
//                                   full event page instead of a button.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_URL from "@/config/api";

const NAVY = "#1a1a2e";
const GOLD = "#d4af37";
const BORDER = "#e8e0d0";
const MUTED = "#9a8c7a";

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(new Date(d).getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
  });
}

export function EventJoinBanner() {
  const [event, setEvent] = useState(null);       // nearest ACTIVE or UPCOMING event
  const [participation, setParticipation] = useState(null); // { hasDraftPlan, joined }
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/events?limit=20`);
        if (!res.ok) return;
        const data = await res.json();
        const events = Array.isArray(data.events) ? data.events : [];

        // Prefer an ACTIVE event; otherwise the soonest UPCOMING one.
        const active = events.find((e) => e.status === "ACTIVE");
        const upcoming = events
          .filter((e) => e.status === "UPCOMING")
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];

        const chosen = active || upcoming || null;
        if (cancelled) return;
        setEvent(chosen);

        if (chosen) {
          const partRes = await fetch(`${API_URL}/events/${chosen.id}/participation`, {
            credentials: "include",
          });
          if (partRes.ok) {
            const partData = await partRes.json();
            if (!cancelled) setParticipation(partData);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  async function handleJoin() {
    if (!event) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/events/${event.id}/join`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Couldn't join the event."); return; }
      setParticipation({ hasDraftPlan: true, joined: true, plan: data.plan });
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setJoining(false);
    }
  }

  if (loading || !event) return null;

  const isActive = event.status === "ACTIVE";

  return (
    <div
      className="rounded-2xl border mb-6 overflow-hidden flex flex-col sm:flex-row sm:items-center gap-4 p-5"
      style={{
        borderColor: isActive ? GOLD : BORDER,
        background: isActive ? `linear-gradient(135deg, ${GOLD}12, ${GOLD}05)` : "#ffffff",
      }}
    >
      {event.imageUrl && (
        <img
          src={event.imageUrl}
          alt=""
          className="w-16 h-16 rounded-xl object-cover flex-shrink-0 hidden sm:block"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm text-white flex-shrink-0"
            style={{ background: isActive ? GOLD : MUTED }}
          >
            {isActive ? "Happening now" : "Upcoming event"}
          </span>
        </div>
        <h3 className="font-serif text-lg" style={{ color: NAVY }}>{event.title}</h3>
        <p className="text-sm mt-0.5" style={{ color: MUTED }}>
          {isActive
            ? `Ends ${formatDate(event.endDate)}`
            : `Starts ${formatDate(event.startDate)}`}
          {event.finisherRole && (
            <> · Finish your plan during the event to earn <strong>{event.finisherRole}</strong></>
          )}
        </p>
        {error && <p className="text-xs mt-1.5 text-red-600">{error}</p>}
      </div>

      <div className="flex-shrink-0 flex items-center gap-2">
        {participation?.joined ? (
          <Link
            to="/events"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border hover:bg-gray-50 transition-all"
            style={{ borderColor: BORDER, color: NAVY }}
          >
            You're in ✓ View event
          </Link>
        ) : participation && !participation.hasDraftPlan ? (
          <Link
            to="/draftplan/new"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
            style={{ background: NAVY }}
          >
            Create a draft plan to join
          </Link>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
            style={{ background: NAVY }}
          >
            {joining ? "Joining…" : isActive ? `Join ${event.title}` : "Reserve your spot"}
          </button>
        )}
      </div>
    </div>
  );
}