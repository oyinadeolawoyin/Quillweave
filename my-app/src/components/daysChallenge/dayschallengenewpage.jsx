// src/components/daysChallenge/daysChallengeNewPage.jsx
// Route target for /days-challenge/new?duration=SEVEN|FIFTEEN.
//
// Guests and logged-in users both land here the same way — answer every
// question first, the wizard itself gates on having an account right
// before the final "Start my challenge" submit.

import { useNavigate, useSearchParams } from "react-router-dom";
import DaysChallengeWizard from "./dayschallengewizard";

export default function DaysChallengeNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const duration = searchParams.get("duration") || undefined;

  return (
    <div className="min-h-screen" style={{ background: "#faf8f4" }}>
      <DaysChallengeWizard initialDuration={duration} onExit={() => navigate("/")} />
    </div>
  );
}