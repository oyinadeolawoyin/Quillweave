import { useState, useEffect } from "react";
import API_URL from "@/config/api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatWeekRange(weekStart) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const opts = { month: "short", day: "numeric", timeZone: "UTC" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", {
    ...opts,
    year: "numeric",
  })}`;
}

export default function WeeklySchedule() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/schedule/current`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSchedule(data?.schedule || null))
      .catch((e) => console.error("[WeeklySchedule] fetch error:", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="cozy-card animate-pulse">
        <div className="h-4 bg-[#e8e0d0] rounded w-1/3 mb-5" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 bg-[#f0ebe3] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!schedule) return null;

  const byDay = {};
  for (const s of schedule.sessions || []) {
    if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = [];
    byDay[s.dayOfWeek].push(s);
  }
  const activeDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);
  const totalDone = (schedule.sessions || []).filter((s) => s.isDone).length;
  const total = (schedule.sessions || []).length;
  const progressPct = total > 0 ? Math.round((totalDone / total) * 100) : 0;

  return (
    <div className="cozy-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="cozy-icon-badge">📅</div>
          <div>
            <h2 className="font-serif text-base text-[#2d3748] leading-tight">{schedule.title}</h2>
            <p className="text-xs text-[#9a8c7a] mt-0.5">{formatWeekRange(schedule.weekStart)}</p>
          </div>
        </div>

        {total > 0 && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs font-semibold text-[#2d3748]">{totalDone}/{total}</p>
            <p className="text-[10px] text-[#9a8c7a]">done</p>
            <div className="w-14 h-1.5 bg-[#f0ebe3] rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-[#4ade80] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {schedule.description && (
        <p className="text-xs text-[#9a8c7a] -mt-2 mb-5 leading-relaxed pl-12">
          {schedule.description}
        </p>
      )}

      {/* Sessions */}
      {activeDays.length === 0 ? (
        <p className="text-sm text-[#9a8c7a] text-center py-6">No sessions scheduled this week.</p>
      ) : (
        <div className="space-y-4">
          {activeDays.map((day) => (
            <div key={day}>
              <p className="text-[10px] font-bold text-[#b8a898] uppercase tracking-[0.12em] mb-2 pl-1">
                {DAY_FULL[day]}
              </p>
              <div className="space-y-1.5">
                {byDay[day].map((s) => (
                  <div
                    key={s.id}
                    className={s.isDone ? "schedule-pill-done" : "schedule-pill-pending"}
                  >
                    {s.isDone ? (
                      <span className="w-5 h-5 rounded-full bg-[#4ade80] flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-[#d4af37] flex-shrink-0" />
                    )}
                    <span className={`font-mono text-xs font-semibold ${s.isDone ? "text-[#9a8c7a] line-through" : "text-[#2d3748]"}`}>
                      {s.time}
                    </span>
                    {s.label && (
                      <span className={`text-xs ml-1 ${s.isDone ? "text-[#9a8c7a] line-through" : "text-[#6b5c4a]"}`}>
                        · {s.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}