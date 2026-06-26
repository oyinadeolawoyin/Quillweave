// src/components/draftplan/draftPlanEmptyState.jsx
// Shown when GET /draftplan/mine returns no plan. The single job of this
// screen is the CTA into the 3-step wizard ("take the test").

import { PrimaryButton } from "./draftPlanUI";

export default function DraftPlanEmptyState({ onStart }) {
  return (
    <div className="max-w-[640px] mx-auto px-4 sm:px-6 pt-12 pb-16">
      <div
        className="bg-white border border-[#e8e0d0] rounded-xl p-8 sm:p-10 text-center"
        style={{ borderTop: "4px solid #d4af37" }}
      >
        {/* Quill / compass mark — kept in the existing icon language, no new icon set */}
        <div
          className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: "#fdf9ed" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-2">
          Your Project Plan
        </p>
        <h1 className="font-serif text-[#1a1a2e] text-2xl sm:text-[28px] font-bold leading-tight mb-3">
          You don't have a draft plan yet
        </h1>
        <p className="text-[14px] text-[#6b5c4a] leading-relaxed max-w-[440px] mx-auto mb-7">
          If you want to finish that draft, take a short test. It takes a few minutes,
          and turns into a daily and weekly goal built around what you can actually do —
          plus a page to track your progress as you go.
        </p>

        <PrimaryButton onClick={onStart} className="px-7 py-3 text-[14px]">
          Take the test
        </PrimaryButton>

        <p className="text-[11px] text-[#9a8c7a] mt-4">
          Three short steps · about 3–5 minutes
        </p>
      </div>

      {/* What the test covers — sets expectations before they commit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
        {[
          { n: "01", title: "The math", body: "Your project size, daily goal, and a realistic finish date." },
          { n: "02", title: "The why", body: "What finishing means to you, your treats, and your characters." },
          { n: "03", title: "The story", body: "Your title and premise — then straight to your plan page." },
        ].map((s) => (
          <div key={s.n} className="bg-white border border-[#e8e0d0] rounded-xl p-4">
            <p className="text-[10px] font-bold text-[#d4af37] mb-1">{s.n}</p>
            <p className="text-[13px] font-bold text-[#1a1a2e] mb-1">{s.title}</p>
            <p className="text-[12px] text-[#9a8c7a] leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}