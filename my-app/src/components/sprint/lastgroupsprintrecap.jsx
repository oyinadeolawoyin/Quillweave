// ─── LastGroupSprintRecap ──────────────────────────────────────
// Drop this component into App.jsx and render it between
// <ActiveSprintsBanner> and the "Your writing desk" section.
//
// Usage in Homepage():
//   <div className="mb-10"><ActiveSprintsBanner onJoinClick={handleBannerJoinClick} /></div>
//   <LastGroupSprintRecap />                       ← add here
//   <section className="mb-12">                   ← Your writing desk
//
// Also replace your COMMUNITY_SCHEDULE map in CommunitySchedule()
// with the updated version at the bottom of this file.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API_URL from "@/config/api";

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

// Convert "4pm UTC" to user's local time for display
export function utcTimeToLocal(utcHour24) {
  const now = new Date();
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    utcHour24,
    0,
    0
  ));
  return utcDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function LastGroupSprintRecap() {
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/sprint/lastGroupSprint`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSprint(d?.groupSprint || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="mb-10">
        <div className="animate-pulse bg-white rounded-3xl border border-[#e8e0d0] p-6 space-y-3"
          style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.05)" }}>
          <div className="h-3 bg-[#e8e0d0] rounded w-1/4" />
          <div className="h-5 bg-[#e8e0d0] rounded w-2/5" />
          <div className="h-px bg-[#e8e0d0] my-4" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 flex-1 bg-[#e8e0d0] rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!sprint) return null;

  const members = sprint.sprints || [];
  const totalWords = sprint.totalWordsWritten || 0;
  const hostUsername = sprint.user?.username;
  const hostAvatar = sprint.user?.avatar;
  const sprintType = sprint.sprintType === "READING" ? "Reading" : "Writing";
  const when = timeAgo(sprint.completedAt);
  const memberCount = sprint._count?.sprints || members.length;

  return (
    <section className="mb-10">
      <div
        className="bg-white rounded-3xl border border-[#e8e0d0] overflow-hidden"
        style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(45,35,20,0.05)" }}
      >
        {/* Header bar */}
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-[#f0ebe3]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-1">
                Last session
              </p>
              <h2 className="font-serif text-[#2d3748] text-lg leading-snug">
                {sprintType} sprint hosted by{" "}
                <span className="text-[#2d3748]">@{hostUsername}</span>
              </h2>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-0.5">
                Together
              </p>
              <p className="font-serif text-2xl font-bold text-[#2d3748] leading-none">
                {fmt(totalWords)}
              </p>
              <p className="text-[10px] text-[#9a8c7a] mt-0.5">
                words · {when}
              </p>
            </div>
          </div>
        </div>

        {/* Members */}
        {members.length > 0 && (
          <div className="px-6 sm:px-8 py-5">
            <p className="text-[10px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-4">
              {memberCount} writer{memberCount !== 1 ? "s" : ""} showed up
            </p>

            <div className="space-y-3">
              {members.map((s, i) => {
                const username = s.user?.username || "writer";
                const avatar = s.user?.avatar;
                const project = s.project?.title;
                const checkin = s.checkin;

                return (
                  <div
                    key={s.id ?? i}
                    className="flex items-center gap-3 py-2.5 px-3.5 rounded-2xl bg-[#faf7f2]"
                  >
                    {/* Avatar */}
                    <Link
                      to={`/profile/${s.user?.id}`}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={username}
                          className="w-8 h-8 rounded-full object-cover border border-[#e8e0d0]"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center border border-[#e8e0d0]"
                          style={{ background: "#e8e0d0" }}
                        >
                          <span className="text-[11px] font-semibold text-[#9a8c7a] uppercase">
                            {username.charAt(0)}
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/profile/${s.user?.id}`}
                        className="text-sm font-semibold text-[#2d3748] leading-tight truncate hover:underline block"
                      >
                        @{username}
                      </Link>
                      {project && (
                        <p className="text-[11px] text-[#9a8c7a] truncate">
                          working on{" "}
                          <span className="font-medium text-[#6b5c4a]">{project}</span>
                        </p>
                      )}
                      {checkin && !project && (
                        <p className="text-[11px] text-[#9a8c7a] italic truncate">
                          "{checkin}"
                        </p>
                      )}
                    </div>

                    {/* Duration badge */}
                    <div className="flex-shrink-0 text-right">
                      <span className="inline-block text-[10px] text-[#9a8c7a] bg-white border border-[#e8e0d0] px-2 py-0.5 rounded-full font-medium">
                        {sprint.duration} min
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="px-6 sm:px-8 py-4 border-t border-[#f0ebe3] bg-[#faf7f2]">
          <p className="text-[11px] text-[#9a8c7a] text-center leading-relaxed">
            Sprints happen every Wednesday, Friday, and Saturday at 4pm UTC.{" "}
            <span className="font-semibold text-[#6b5c4a]">
              Show up and write.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}