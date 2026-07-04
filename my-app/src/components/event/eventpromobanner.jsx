// src/components/events/eventPromoBanner.jsx
//
// Drop this into the homepage (about.jsx), right after the hero <header>
// and before the <main> two-column body:
//
//   import { EventPromoBanner } from "../events/eventPromoBanner";
//   ...
//   </header>
//   <EventPromoBanner />
//   <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
//
// Shows a full-width promo strip for the nearest ACTIVE or UPCOMING event.
// Renders nothing if there's no such event, so the homepage looks exactly
// the same as it does today when nothing is running.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "@/config/api";
import { useAuth } from "../auth/authContext";

function formatRange(start, end) {
  const opts = { month: "short", day: "numeric" };
  const s = new Date(start).toLocaleDateString("en-US", opts);
  const e = new Date(end).toLocaleDateString("en-US", opts);
  return `${s} – ${e}`;
}

export function EventPromoBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/events?limit=20`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => {
        if (cancelled) return;
        const events = Array.isArray(data.events) ? data.events : [];
        const active = events.find((e) => e.status === "ACTIVE");
        const upcoming = events
          .filter((e) => e.status === "UPCOMING")
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
        setEvent(active || upcoming || null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading || !event) return null;

  const isActive = event.status === "ACTIVE";

  function handleCta() {
    if (!user) {
      navigate("/signup");
      return;
    }
    navigate("/events");
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#1e2d4a 60%,#0f1a2e 100%)" }}
    >
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(212,175,55,0.4) 40px, rgba(212,175,55,0.4) 41px)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-5 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {event.imageUrl && (
            <img
              src={event.imageUrl}
              alt=""
              className="w-full sm:w-28 h-28 rounded-2xl object-cover flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest"
              style={{ borderColor: "rgba(212,175,55,0.4)", color: "#d4af37", background: "rgba(212,175,55,0.08)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
              {isActive ? "Event happening now" : "Upcoming event"}
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white leading-tight mb-1">
              {event.title}
            </h2>
            <p className="text-[13px] sm:text-sm text-[#c5bfb5] leading-relaxed max-w-2xl">
              {event.description?.length > 140
                ? `${event.description.slice(0, 140)}…`
                : event.description}
            </p>
            <p className="text-[12px] text-[#9a8c7a] mt-2">
              {formatRange(event.startDate, event.endDate)}
              {event.finisherRole && <> · Finishers earn <strong style={{ color: "#d4af37" }}>{event.finisherRole}</strong></>}
            </p>
          </div>

          <button
            onClick={handleCta}
            className="px-6 py-3 rounded-xl font-semibold text-[#1a1a2e] text-sm transition-all hover:opacity-90 hover:shadow-lg flex-shrink-0 self-start sm:self-center"
            style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
          >
            {user ? (isActive ? "Join the event →" : "See event details →") : "Sign up to join →"}
          </button>
        </div>
      </div>
    </section>
  );
}