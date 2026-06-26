// src/components/daysChallenge/daysChallengeEmptyState.jsx

export default function DaysChallengeEmptyState({ onStart }) {
    return (
      <div className="max-w-[560px] mx-auto px-4 pt-16 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: "#e07b39" }}>
          Days Challenge
        </p>
        <h1 className="font-serif text-[#1a1a2e] text-2xl sm:text-[28px] font-bold leading-tight mb-3">
          Build momentum in 7 or 15 days
        </h1>
        <p className="text-[14px] text-[#6b5c4a] leading-relaxed mb-7">
          Pick a short, focused sprint — outlining, brainstorming, editing, or story development —
          set a daily goal, and check in each day. Short enough to actually finish, real enough to move your story forward.
        </p>
        <button
          onClick={onStart}
          className="py-2.5 px-6 text-[#1a1a2e] text-sm font-bold rounded-lg transition-colors"
          style={{ background: "#e07b39" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#c96a2e")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#e07b39")}
        >
          Start a challenge
        </button>
      </div>
    );
  }