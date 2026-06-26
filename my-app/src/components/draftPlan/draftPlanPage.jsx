// src/components/draftplan/draftPlanPage.jsx
// Top-level route component for /draftplan. Decides which of three states
// to render: loading, empty (no plan — CTA to take the test), wizard
// (mid-test), or dashboard (plan exists).

import { useEffect, useState } from "react";
import { useAuth } from "../auth/authContext";
import { useNavigate } from "react-router-dom";
import DraftPlanEmptyState from "./draftPlanEmptyState";
import DraftPlanWizard from "./draftPlanWizard";
import PlanDashboard from "./planDashboard";
import { fetchMyPlan } from "./draftPlanApi";

export default function DraftPlanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("view"); // "view" | "wizard"
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetchMyPlan()
      .then((p) => { if (!cancelled) setPlan(p); })
      .catch((err) => { if (!cancelled) setLoadError(err.message ?? "Couldn't load your plan."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f3ef]">
        <div className="max-w-[480px] mx-auto px-4 pt-16 text-center">
          <h1 className="font-serif text-[#1a1a2e] text-xl font-bold mb-2">Sign in to plan your draft</h1>
          <p className="text-[13px] text-[#6b5c4a] mb-5">You'll need an account to build and track a draft plan.</p>
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
        <DraftPlanWizard
          onCreated={(newPlan) => { setPlan(newPlan); setMode("view"); }}
          onExit={() => setMode("view")}
        />
      )}

      {!loading && !loadError && mode === "view" && !plan && (
        <DraftPlanEmptyState onStart={() => setMode("wizard")} />
      )}

      {!loading && !loadError && mode === "view" && plan && (
        <PlanDashboard plan={plan} onPlanUpdated={() => fetchMyPlan().then(setPlan).catch(() => {})} onPlanDeleted={() => setPlan(null)} />
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