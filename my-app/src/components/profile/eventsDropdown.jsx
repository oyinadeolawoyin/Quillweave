import { Link } from "react-router-dom";

export default function EventsDropdown({
  open,
  setOpen,
  activeEvents = [],
}) {
  function getEventTypeLabel(type) {
    if (type === "DAYS_CHALLENGE") return "Challenge";
    if (type === "WORKSHOP") return "Workshop";
    if (type === "ANNOUNCEMENT") return "Announcement";
    return "Event";
  }

  function daysLeft(endDate) {
    if (!endDate) return null;

    const diff = new Date(endDate).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    return days === 0 ? "Last day" : `${days}d left`;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          open
            ? "text-[#2d3748] bg-[#f7f4ee]"
            : "text-[#737373] hover:text-[#2d3748] hover:bg-[#fafaf9]"
        }`}
      >
        Events

        <svg
          className={`w-3.5 h-3.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#e5e5e5] rounded-2xl shadow-xl overflow-hidden z-50">

          {/* HEADER */}
          <div className="px-4 py-3 border-b border-[#f0f0f0]">
            <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide">
              Active Events
            </p>
          </div>

          {/* BODY */}
          <div className="max-h-72 overflow-y-auto">
            {activeEvents.length > 0 ? (
              activeEvents.map(ev => (
                <Link
                  key={ev.id}
                  to={`/events/${ev.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[#faf7f2]"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2d3748] to-[#4a5568] flex items-center justify-center">
                    <span className="text-sm">
                      {ev.type === "DAYS_CHALLENGE"
                        ? "🔥"
                        : ev.type === "WORKSHOP"
                        ? "🎓"
                        : "📣"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2d3748] truncate">
                      {ev.title}
                    </p>

                    <div className="flex items-center justify-between mt-1 text-xs text-[#737373]">
                      <span>{getEventTypeLabel(ev.type)}</span>
                      <span>{daysLeft(ev.endDate)}</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-[#737373]">
                No active events
              </div>
            )}
          </div>

          {/* FOOTER */}
          <Link
            to="/events"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-center text-[#2d3748] hover:bg-[#faf7f2] border-t border-[#f0f0f0]"
          >
            View all events →
          </Link>

        </div>
      )}
    </div>
  );
}