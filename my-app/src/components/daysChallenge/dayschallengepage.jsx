// src/components/daysChallenge/daysChallengePage.jsx
// Top-level route component for /days-challenge. Mirrors draftPlanPage.jsx:
// decides which of three states to render — loading, empty (no challenge —
// CTA to start one), wizard (mid-setup), or dashboard (challenge exists).

import { useEffect, useState } from "react";
import { useAuth } from "../auth/authContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import DaysChallengeEmptyState from "./dayschallengeemptystate";
import DaysChallengeWizard from "./dayschallengewizard";
import DaysChallengeDashboard from "./dayschallengedashboard";
import { fetchMyChallenge } from "./dayschallengeapi";

export default function DaysChallengePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null); // { challenge, stats }
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("view"); // "view" | "wizard"
  const [loadError, setLoadError] = useState("");

  // Supports the deep link from the Draft Plan wizard's outline-check step:
  // /days-challenge?type=outline&days=7 — preselects duration and jumps
  // straight into the wizard rather than showing the empty state first.
  const presetDays = searchParams.get("days");
  const presetDuration = presetDays === "7" ? "SEVEN" : presetDays === "15" ? "FIFTEEN" : undefined;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetchMyChallenge()
      .then((res) => {
        if (cancelled) return;
        setData(res);
        if (!res && presetDuration) setMode("wizard");
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message ?? "Couldn't load your challenge."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f3ef]">
        <div className="max-w-[480px] mx-auto px-4 pt-16 text-center">
          <h1 className="font-serif text-[#1a1a2e] text-xl font-bold mb-2">Sign in to join a challenge</h1>
          <p className="text-[13px] text-[#6b5c4a] mb-5">You'll need an account to start a Days Challenge.</p>
          <button
            onClick={() => navigate("/login")}
            className="py-2.5 px-6 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      {loading && <LoadingState />}

      {!loading && loadError && (
        <div className="max-w-[480px] mx-auto px-4 pt-16 text-center">
          <p className="text-[13px] text-[#c0392b]">{loadError}</p>
        </div>
      )}

      {!loading && !loadError && mode === "wizard" && (
        <DaysChallengeWizard
          initialDuration={presetDuration}
          onCreated={(challenge) => { setData({ challenge }); setMode("view"); }}
          onExit={() => setMode("view")}
        />
      )}

      {!loading && !loadError && mode === "view" && !data?.challenge && (
        <DaysChallengeEmptyState onStart={() => setMode("wizard")} />
      )}

      {!loading && !loadError && mode === "view" && data?.challenge && (
        <DaysChallengeDashboard
          initialChallenge={data.challenge}
          initialStats={data.stats}
          onChallengeUpdated={() => fetchMyChallenge().then(setData).catch(() => {})}
          onChallengeEnded={() => setData(null)}
        />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-16">
      <div className="h-7 w-56 bg-[#ece8e1] rounded animate-pulse mb-5" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-5">
          <div className="h-24 bg-[#ece8e1] rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="h-48 bg-[#ece8e1] rounded-xl animate-pulse" />
            <div className="h-48 bg-[#ece8e1] rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="h-72 bg-[#ece8e1] rounded-xl animate-pulse" />
      </div>
    </div>
  );
}