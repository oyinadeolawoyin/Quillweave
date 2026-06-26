// src/components/draftplan/draftPlanNewPage.jsx
// Route target for /draftplan/new.
//
// - Guests: go straight into the wizard. They can answer every question
//   before ever being asked to sign up — the wizard itself shows the
//   signup gate right before the final "Create my plan" submit.
// - Logged-in users with no existing plan: same wizard, straight to create.
// - Logged-in users who already have a plan: skip the wizard entirely and
//   send them to their existing plan at /draftplan instead of letting them
//   accidentally create a second one.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { fetchMyPlan } from "./draftPlanApi";
import DraftPlanWizard from "./draftPlanWizard";

export default function DraftPlanNewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checking, setChecking] = useState(Boolean(user));

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    fetchMyPlan()
      .then((plan) => {
        if (cancelled) return;
        if (plan) {
          navigate("/draftplan", { replace: true });
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        // If the check fails, fail open into the wizard rather than
        // stranding the user on a blank page.
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf8f4" }}>
        <p className="text-[13px] text-[#9a8c7a]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#faf8f4" }}>
      <DraftPlanWizard onExit={() => navigate("/")} />
    </div>
  );
}