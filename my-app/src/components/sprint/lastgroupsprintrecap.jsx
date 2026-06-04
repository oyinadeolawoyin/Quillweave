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

export function utcTimeToLocal(utcHour24) {
  const now = new Date();
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    utcHour24, 0, 0
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
      <div className="mb-4 animate-pulse rounded-xl overflow-hidden border border-[#e8e0d0]">
        <div className="bg-[#1a1a2e] px-5 py-4 space-y-2">
          <div className="h-2 bg-white/10 rounded w-1/4" />
          <div className="h-4 bg-white/10 rounded w-2/5" />
        </div>
        <div className="bg-white p-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-[#f5f3ef] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="mb-4 rounded-xl overflow-hidden border border-[#d4af37]/30">
        {/* Dark header */}
        <div className="bg-[#1a1a2e] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-1">Last Session</p>
          <p className="text-white/60 text-[13px]">No group sprint yet.</p>
        </div>
        <div className="bg-[#fffdf0] border-t border-[#d4af37]/20 px-5 py-3">
          <p className="text-[12px] text-[#6b5c4a]">Be the first to start one!</p>
        </div>
      </div>
    );
  }

  const members      = sprint.sprints || [];
  const totalWords   = sprint.totalWordsWritten || 0;
  const hostUsername = sprint.user?.username;
  const sprintType   = sprint.sprintType === "READING" ? "Reading" : "Writing";
  const when         = timeAgo(sprint.completedAt);
  const memberCount  = sprint._count?.sprints || members.length;

  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-[#e8e0d0] shadow-sm">

      {/* ── Dark hero header — mirrors AccountabilityPage hero ── */}
      <div className="bg-[#1a1a2e] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-1.5">Last Session</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white text-[14px] font-semibold leading-snug">
              {sprintType} sprint
            </p>
            <p className="text-white/70 text-[11px] mt-0.5">
              hosted by{" "}
              <span className="text-[#d4af37] font-medium">@{hostUsername}</span>
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-serif text-2xl font-bold text-white leading-none">{fmt(totalWords)}</p>
            <p className="text-[10px] text-white/70 mt-0.5 uppercase tracking-wider">
              words · {when}
            </p>
          </div>
        </div>
      </div>

      {/* ── Gold accent divider ── */}
      <div className="h-[2px] bg-[#d4af37]" />

      {/* ── Members list ── */}
      {members.length > 0 && (
        <div className="bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a8c7a] mb-2.5">
            {memberCount} writer{memberCount !== 1 ? "s" : ""} showed up
          </p>
          <div className="space-y-1.5">
            {members.map((s, i) => {
              const username = s.user?.username || "writer";
              const avatar   = s.user?.avatar;
              const project  = s.project?.title;
              const checkin  = s.checkin;
              return (
                <div
                  key={s.id ?? i}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#f5f3ef] hover:bg-[#fffdf0] border border-transparent hover:border-[#d4af37]/20 transition-all"
                >
                  {/* Avatar */}
                  <Link to={`/profile/${s.user?.id}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={username}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-[#d4af37]/30"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1a1a2e] ring-1 ring-[#d4af37]/30">
                        <span className="text-[10px] font-bold text-[#d4af37] uppercase">
                          {username.charAt(0)}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Name + project */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${s.user?.id}`}
                      className="text-[12px] font-semibold text-[#1a1a2e] hover:text-[#d4af37] transition-colors block truncate"
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
                      <p className="text-[11px] text-[#9a8c7a] italic truncate">"{checkin}"</p>
                    )}
                  </div>

                  {/* Duration badge — dark pill like CTA */}
                  <span className="text-[10px] font-semibold text-white bg-[#1a1a2e] px-2 py-0.5 rounded-full flex-shrink-0">
                    {sprint.duration} min
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Footer — warm gold tint, mirrors AccountabilityPage schedule card style ── */}
      <div className="bg-[#fffdf0] border-t border-[#d4af37]/20 px-4 py-2.5 flex items-center justify-between gap-2">
        <p className="text-[10px] text-[#9a8c7a]">
          Sprints every <span className="font-semibold text-[#6b5c4a]">Wed, Fri & Sat</span> at 4pm UTC
        </p>
        <span className="text-[10px] font-bold text-[#d4af37] uppercase tracking-wider">Show up & write</span>
      </div>
    </div>
  );
}