// src/components/minichallenge/minichallengebanner.jsx
//
// Compact "This Week's Challenge" strip for the homepage — mirrors
// EventPromoBanner's job (tease it, guests included) while the full
// picture (leaderboard, remaining amounts) lives on /mini-challenges.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "@/config/api";
import { useAuth } from "../auth/authContext";

const NAVY = "#1a1a2e";
const GOLD = "#d4af37";

export function MiniChallengeBanner({ onNudge }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/mini-challenges/current`, { credentials: "include" });
        const data = res.ok ? await res.json() : { template: null };
        if (cancelled) return;
        setTemplate(data.template || null);

        if (data.template && user) {
          const pRes = await fetch(`${API_URL}/mini-challenges/my-progress`, { credentials: "include" });
          if (pRes.ok && !cancelled) setProgress(await pRes.json());
        }
      } catch {
        // quietly hide the banner rather than show a broken widget
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || !template) return null;

  const pct = progress?.targetValue != null
    ? Math.min(100, Math.round((progress.achievedValue / progress.targetValue) * 100))
    : null;

  return (
    <div className="border-b" style={{ background: "#fdf9ed", borderColor: "#e8d988" }}>
      <div className="max-w-6xl mx-auto px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{template.badgeIcon}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>
              This Week's Challenge
            </p>
            <p className="text-[14px] font-semibold truncate" style={{ color: NAVY }}>{template.title}</p>
          </div>
        </div>

        {user ? (
          progress && progress.targetValue != null ? (
            <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-56">
              <div className="flex-1 h-2 rounded-full bg-white overflow-hidden border" style={{ borderColor: "#e8d988" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: GOLD }} />
              </div>
              <span className="text-[12px] font-semibold flex-shrink-0" style={{ color: NAVY }}>
                {progress.achievedValue}/{progress.targetValue}
              </span>
            </div>
          ) : progress ? (
            <span className="text-[12px] flex-shrink-0" style={{ color: "#6b5c4a" }}>
              {progress.achievedValue} so far this week — keep going!
            </span>
          ) : null
        ) : (
          <button
            onClick={() => navigate("/signup")}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white flex-shrink-0 hover:opacity-90 transition-all"
            style={{ background: NAVY }}
          >
            Sign up to join in →
          </button>
        )}

        <button
          onClick={() => {
            if (typeof onNudge === "function") {
              onNudge(
                "Sign up to see this week's challenge details and track your progress.",
                () => navigate("/signup"),
                "/mini-challenges"
              );
            } else {
              // Fallback so the button always does *something* even if a
              // parent forgets to wire up onNudge — guests just go to
              // /mini-challenges directly instead of silently doing nothing.
              navigate("/mini-challenges");
            }
          }}
          className="text-[12px] font-semibold hover:underline flex-shrink-0"
          style={{ color: GOLD }}
        >
          See details →
        </button>
      </div>
    </div>
  );
}