// src/components/community/CommunityLeaderboard.jsx
import { useState, useEffect } from "react";
import API_URL from "@/config/api";

function Avatar({ user, size = 30 }) {
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
          border: "1.5px solid rgba(212,175,55,0.2)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: "50%",
        background: "rgba(212,175,55,0.1)",
        border: "1.5px solid rgba(212,175,55,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "#d4af37",
        flexShrink: 0,
        fontFamily: "Georgia, serif",
      }}
    >
      {initials}
    </div>
  );
}

function Rank({ n }) {
  const map    = ["I", "II", "III", "IV", "V"];
  const styles = [
    { color: "#d4af37" },
    { color: "#c0c0c0" },
    { color: "#b08d57" },
    { color: "rgba(255,255,255,0.25)" },
    { color: "rgba(255,255,255,0.25)" },
  ];
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.08em",
        fontFamily: "Georgia, serif",
        width: 16,
        textAlign: "center",
        flexShrink: 0,
        ...(styles[n - 1] ?? styles[4]),
      }}
    >
      {map[n - 1] ?? n}
    </span>
  );
}

function ColumnSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-2.5 bg-white/10 rounded w-2/3 mb-4" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white/10 rounded" />
          <div className="w-7 h-7 bg-white/10 rounded-full" />
          <div className="h-2.5 bg-white/10 rounded flex-1" />
          <div className="h-2.5 bg-white/10 rounded w-8" />
        </div>
      ))}
    </div>
  );
}

function BoardColumn({ label, sublabel, rows, loading, renderStat }) {
  return (
    <div>
      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#d4af37]">
          {label}
        </p>
        {sublabel && (
          <p className="text-[10px] text-white/70 mt-0.5">{sublabel}</p>
        )}
      </div>

      <div className="mb-4 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

      {loading ? (
        <ColumnSkeleton />
      ) : rows.length === 0 ? (
        <p className="text-white text-xs italic">No data yet.</p>
      ) : (
        <div className="space-y-0">
          {rows.map((row, i) => (
            <div
              key={row.user?.id ?? i}
              className="flex items-center gap-2.5 py-2.5"
              style={{
                borderBottom: i < rows.length - 1
                  ? "1px solid rgba(255,255,255,0.05)"
                  : "none",
              }}
            >
              <Rank n={i + 1} />
              <Avatar user={row.user} size={28} />
              <p
                className="flex-1 text-white font-medium truncate"
                style={{ fontSize: 12, letterSpacing: "-0.005em" }}
              >
                {row.user?.username ?? "[deleted]"}
              </p>
              {renderStat && (
                <p
                  className="flex-shrink-0 font-bold font-serif text-[#d4af37]"
                  style={{ fontSize: 12 }}
                >
                  {renderStat(row)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommunityLeaderboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const res = await fetch(`${API_URL}/leaderboard`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setData({ critiquers: [], sprinters: [], practiceWriters: [] });
    } finally {
      setLoading(false);
    }
  }

  const critiquers      = data?.critiquers      ?? [];
  const sprinters       = data?.sprinters       ?? [];
  const practiceWriters = data?.practiceWriters ?? [];

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(140deg, #141c2e 0%, #1a2540 55%, #1e2d4a 100%)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.08), 0 24px 64px rgba(10,15,30,0.28)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className="absolute top-0 left-8 right-8 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, #d4af37 40%, #d4af37 60%, transparent)",
        }}
      />

      <div className="relative z-10 px-6 sm:px-8 pt-7 pb-7">
        <div className="mb-6">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#d4af37] mb-0.5">
            Community Honours
          </p>
          <p className="text-[11px] text-white/80">
            The writers showing up consistently
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <BoardColumn
            label="Top Critiquers"
            sublabel="Most feedback given"
            rows={loading ? [] : critiquers}
            loading={loading}
            renderStat={(r) => `${r.critiqueCount} crits`}
          />
          <BoardColumn
            label="Top Sprinters"
            sublabel="Most sprints completed"
            rows={loading ? [] : sprinters}
            loading={loading}
            renderStat={(r) => `${r.sprintCount} sprints`}
          />
          <BoardColumn
            label="Sentence Crafters"
            sublabel="Most emotion cue practice"
            rows={loading ? [] : practiceWriters}
            loading={loading}
            renderStat={(r) => `${r.practiceCount} days`}
          />
        </div>
      </div>
    </div>
  );
}