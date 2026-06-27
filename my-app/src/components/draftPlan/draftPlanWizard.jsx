// src/components/draftplan/draftPlanWizard.jsx
// Owns the 3-step wizard's shared state and final submission to
// POST /draftplan. Each step component only reads/writes the slice of
// `data` it needs via the shared onChange updater.
//
// Guest flow: a logged-out visitor can answer every question same as a
// logged-in writer. Only at the very last step — right before the plan
// would actually be created — do we gate on having an account. Step 3
// shows a "Create my plan" button as usual; if there's no user yet, that
// button opens a signup modal instead of submitting. Once signup succeeds,
// we automatically run the same createDraftPlan() call with the answers
// already collected, so the guest never has to re-enter anything.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StepDots } from "./draftPlanUI";
import WizardStep1Math from "./wizardStep1Math";
import WizardStep2Emotional from "./wizardStep2Emotional";
import WizardStep3Identity from "./wizardStep3Identity";
import SignupGateModal from "../auth/signupgatemodal";
import { createDraftPlan } from "./draftPlanApi";
import { useAuth } from "../auth/authContext";

const STEP_LABELS = ["Your project", "Why it matters", "Your story"];

export default function DraftPlanWizard({ onCreated, onExit }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0, 1, 2
  const [data, setData] = useState({
    // Step 1
    workingTitle: "",
    wordsWrittenSoFar: "",
    hasOutline: null,
    targetLength: "",
    goalType: "WORDS",
    dailyBelief: "",
    dailyGoal: "",
    writingDays: [],
    // Step 2
    whyFinish: "",
    whatItMeans: "",
    dailyTreat: "",
    weeklyTreat: "",
    inspirationSource: "",
    moodboardImages: [],
    characters: [],
    // Step 3
    storyTitle: "",
    premise: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showSignupGate, setShowSignupGate] = useState(false);

  function validateBeforeSubmit() {
    if (!data.storyTitle?.trim() && !data.workingTitle?.trim()) {
      return "Give your story a title.";
    }
    if (!data.premise?.trim()) {
      return "Add a short premise.";
    }
    return null;
  }

  function buildPayload() {
    return {
      // Step 1
      wordsWrittenSoFar: Number(data.wordsWrittenSoFar) || 0,
      targetLength: Number(data.targetLength),
      goalType: data.goalType,
      dailyGoal: Number(data.dailyGoal),
      writingDays: data.writingDays,
      // Step 2
      whyFinish: data.whyFinish,
      whatItMeans: data.whatItMeans,
      dailyTreat: data.dailyTreat,
      weeklyTreat: data.weeklyTreat,
      inspirationSource: data.inspirationSource,
      moodboardImages: data.moodboardImages,
      characters: data.characters,
      // Step 3
      storyTitle: (data.storyTitle || data.workingTitle).trim(),
      premise: data.premise.trim(),
    };
  }

  // Runs the real "create the plan" call. Used both for already-logged-in
  // writers (called directly from handleSubmit) and for guests right after
  // they finish signing up in the modal (called from handleSignedUp).
  async function createPlan() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const plan = await createDraftPlan(buildPayload());
      onCreated?.(plan);
      navigate("/draftplan");
    } catch (err) {
      if (err.message?.includes("already have a draft plan")) {
        // Race condition (double-submit, duplicate tab, retry after a slow
        // response, etc.) — they already have a plan, so don't dead-end on
        // an error, just take them to it.
        navigate("/draftplan", { replace: true });
        return;
      }
      setSubmitError(err.message ?? "Something went wrong creating your plan.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    const err = validateBeforeSubmit();
    if (err) { setSubmitError(err); return; }
    setSubmitError("");

    if (!user) {
      // Answers are already in `data` — just need an account before we
      // can attach a plan to someone. Don't lose their work.
      setShowSignupGate(true);
      return;
    }
    createPlan();
  }

  // Called by the modal once /auth/signup succeeds and the session cookie
  // is set. The create call below reuses that same session, so the new
  // plan is correctly attached to the just-created account.
  function handleSignedUp() {
    setShowSignupGate(false);
    createPlan();
  }

  return (
    <div className="max-w-[560px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      {/* Header: exit + top-level step progress */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={onExit}
          className="text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Exit
        </button>
        <StepDots total={3} current={step} />
      </div>

      <p className="text-[11px] font-semibold text-[#9a8c7a] text-center mb-5 uppercase tracking-wide">
        Step {step + 1} of 3 · {STEP_LABELS[step]}
      </p>

      {step === 0 && (
        <WizardStep1Math
          data={data}
          onChange={setData}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <WizardStep2Emotional
          data={data}
          onChange={setData}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <WizardStep3Identity
          data={data}
          onChange={setData}
          onSubmit={handleSubmit}
          onBack={() => setStep(1)}
          submitting={submitting}
          submitError={submitError}
        />
      )}

      {showSignupGate && (
        <SignupGateModal
          title="Create your free account"
          message="Your plan is ready to go — just create an account so we know where to save it."
          onClose={() => setShowSignupGate(false)}
          onSignedUp={handleSignedUp}
        />
      )}
    </div>
  );
}