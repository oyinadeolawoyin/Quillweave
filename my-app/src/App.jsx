import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./components/auth/authContext";
import Header from "./components/profile/header";
import { AppMetaTags } from "./components/utilis/metatags";
import { StartGroupSprintModal, JoinGroupSprintModal } from "./components/sprint/groupSprintModal";
import DailyQuote from "./components/quote/dailyQuote";
import NotificationsSetup from "./components/notification/notificationSetup";
import WeeklySchedule from "./components/sprint/weeklyschedule";
import ContributeSoundscape from "./components/sprint/Contributesoundscape";
import API_URL from "./config/api";

// ── Helpers ───────────────────────────────────────────────────
function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Last Sprint Session ───────────────────────────────────────
function LastSprintSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/sprint/lastGroupSprint`, {
      headers: { "Cache-Control": "no-cache" },
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSession(data?.groupSprint || null))
      .catch((e) => console.error("[LastSprint] fetch error:", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="cozy-card animate-pulse">
      <div className="h-4 bg-[#e8e0d0] rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-[#e8e0d0] rounded w-2/3" />
        <div className="h-3 bg-[#e8e0d0] rounded w-1/2" />
      </div>
    </div>
  );

  if (!session) return null;

  const writers = (session.sprints || []).sort(
    (a, b) => (b.wordsWritten || 0) - (a.wordsWritten || 0)
  );
  const totalWords = session.totalWordsWritten || 0;
  const timeAgo = formatTimeAgo(session.completedAt);

  return (
    <div className="cozy-card overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <div className="cozy-icon-badge">🏁</div>
        <div>
          <h2 className="font-serif text-base text-[#2d3748] leading-tight">Last session</h2>
          {timeAgo && (
            <p className="text-xs text-[#9a8c7a] mt-0.5">
              {timeAgo} · hosted by @{session.user?.username}
            </p>
          )}
        </div>
      </div>

      {writers.length === 0 ? (
        <p className="text-sm text-[#9a8c7a] text-center py-4">No members in this session.</p>
      ) : (
        <div className="space-y-2 mb-5">
          {writers.map((s) => {
            const words = s.wordsWritten ?? 0;
            const isHost = Number(s.userId) === Number(session.userId);
            return (
              <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-[#f0ebe3] last:border-0">
                <span className="text-sm text-[#4a4a4a]">
                  <span className="font-medium text-[#2d3748]">@{s.user?.username}</span>
                  {isHost && (
                    <span className="ml-1.5 text-[10px] font-medium text-[#b8962e] bg-[#fdf3d8] px-1.5 py-0.5 rounded-full">host</span>
                  )}
                </span>
                <span className="text-sm text-[#9a8c7a]">{words.toLocaleString()} words</span>
              </div>
            );
          })}
        </div>
      )}

      {totalWords > 0 && (
        <div className="bg-[#f7f4ee] border border-[#e8e0d0] rounded-2xl p-4 text-center">
          <p className="text-2xl font-serif font-bold text-[#2d3748]">{totalWords.toLocaleString()}</p>
          <p className="text-xs text-[#9a8c7a] mt-0.5 font-medium tracking-wide uppercase">words written together</p>
        </div>
      )}
    </div>
  );
}

// ── Guest Prompt Modal ─────────────────────────────────────────
function GuestPrompt({ message, onClose }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d3748]/50 backdrop-blur-sm">
      <div className="bg-[#fffdf8] rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center border border-[#e8e0d0]">
        <div className="w-16 h-16 bg-[#fdf3d8] rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">✍️</span>
        </div>
        <h3 className="font-serif text-[#2d3748] text-xl mb-2">Join Inkwell first</h3>
        <p className="text-sm text-[#6b5c4a] mb-7 leading-relaxed">{message}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/signup")}
            className="w-full py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all"
          >
            Create a free account
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 border border-[#e8e0d0] text-[#4a4a4a] text-sm font-medium rounded-2xl hover:border-[#2d3748] transition-all bg-white"
          >
            Sign in
          </button>
        </div>
        <button onClick={onClose} className="mt-5 text-xs text-[#9a8c7a] hover:text-[#6b5c4a] transition-colors">
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ── Hero Image ─────────────────────────────────────────────────
function HeroImage() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: "560px" }}>
      <img
        src="/Gemini_Generated_Image_d6p43ed6p43ed6p4.png"
        alt="Writers gathered at Inkwell Coffee Shop"
        className="w-full h-full object-cover block"
        style={{ objectPosition: "center center" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(26,35,51,0.85) 0%, rgba(26,35,51,0.3) 45%, transparent 100%)" }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 px-6 text-center">
        <h1 className="font-serif text-white text-4xl sm:text-5xl leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
          The Coffee Shop<br />for Writers
        </h1>
        <p className="text-white/80 text-sm sm:text-base mt-3 max-w-sm leading-relaxed" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>
          Pull up a seat. Put on some rain. Write alongside others who show up just like you do.
        </p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showStartModal, setShowStartModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [guestMessage, setGuestMessage] = useState(null);

  function handleGroupSprintCreated(groupSprint) {
    navigate(`/group-sprint/${groupSprint.id}`);
  }

  function handleStartClick() {
    if (!user) {
      setGuestMessage("Sign up to start a sprint — solo or with others.");
      return;
    }
    setShowStartModal(true);
  }

  function handleJoinClick() {
    if (!user) {
      setGuestMessage("Sign up to pull up a seat and write with others.");
      return;
    }
    setShowJoinModal(true);
  }

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <AppMetaTags
        title="Inkwell Coffee Shop — Write Together"
        description="A cosy writing space where writers show up, sprint together and get words on the page."
      />
      <Header />
      <NotificationsSetup user={user} />

      {/* ── Hero ── */}
      <HeroImage />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* ── Sprint CTAs — full width, low pressure ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 max-w-2xl mx-auto">

          {/* Start a sprint — reframed as personal, not just for hosts */}
          <button
            onClick={handleStartClick}
            className="flex items-center gap-4 p-5 bg-[#2d3748] text-white rounded-2xl hover:bg-[#3d4f64] transition-all group text-left"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform flex-shrink-0">🖊️</span>
            <div>
              <p className="font-semibold text-sm leading-tight">Start writing</p>
              <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                Open a sprint room — write solo or invite others to join
              </p>
            </div>
          </button>

          {/* Join — kept friendly */}
          <button
            onClick={handleJoinClick}
            className="flex items-center gap-4 p-5 border-2 border-[#2d3748] text-[#2d3748] bg-white rounded-2xl hover:bg-[#2d3748] hover:text-white transition-all group text-left"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform flex-shrink-0">☕</span>
            <div>
              <p className="font-semibold text-sm leading-tight">Pull up a seat</p>
              <p className="text-[11px] text-[#9a8c7a] group-hover:text-white/60 mt-1 leading-relaxed transition-colors">
                Join someone already writing — you're welcome here
              </p>
            </div>
          </button>
        </div>

        {/* ── Two-column desktop layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:items-stretch">

          {/* ── Left column — main content ── */}
          <div className="flex flex-col gap-6">

            {/* Daily Quote */}
            <DailyQuote />

            {/* Weekly Schedule — flex-1 so it grows to match right column */}
            <div className="flex-1 flex flex-col [&>div]:h-full">
              <WeeklySchedule />
            </div>

            {/* How it works — guests only */}
            {!user && (
              <div className="cozy-card">
                <div className="text-center mb-6">
                  <h2 className="font-serif text-xl text-[#2d3748]">How it works</h2>
                  <div className="w-8 h-0.5 bg-[#d4af37] mx-auto mt-2" />
                </div>
                <div className="space-y-5">
                  {[
                    { icon: "🖊️", title: "Write solo or start a room", desc: "Open a sprint for yourself. No pressure to host — just set your timer and write." },
                    { icon: "☕", title: "Or pull up a seat with others", desc: "Join an active room, say what you're working on, and write alongside friends." },
                    { icon: "🎵", title: "Pick your soundscape", desc: "Each writer chooses their own ambient sound. Rain, café hum, birdsong — whatever helps you focus." },
                    { icon: "🏁", title: "Log your words, share a snippet", desc: "When the timer ends, record how much you wrote and share a line with the community." },
                  ].map((step) => (
                    <div key={step.title} className="flex items-start gap-4">
                      <div className="cozy-icon-badge flex-shrink-0">{step.icon}</div>
                      <div className="pt-0.5">
                        <p className="font-semibold text-[#2d3748] text-sm">{step.title}</p>
                        <p className="text-xs text-[#9a8c7a] mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#f0ebe3]">
                  <button
                    onClick={() => navigate("/signup")}
                    className="flex-1 py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all"
                  >
                    Create a free account
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="flex-1 py-3 border border-[#e8e0d0] text-[#4a4a4a] text-sm font-medium rounded-2xl hover:border-[#2d3748] transition-all"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right column — sidebar ── */}
          <div className="space-y-6">

            {/* Last session */}
            <LastSprintSession />

            {/* Contribute soundscape */}
            <ContributeSoundscape />

          </div>
        </div>

        {/* ── Footer note ── */}
        <p className="text-center text-[10px] text-[#b8a898] pt-10 pb-4 tracking-wide">
          A quiet space for writers · Inkwell Coffee Shop
        </p>

      </main>

      {/* Modals */}
      <StartGroupSprintModal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        onCreated={handleGroupSprintCreated}
      />
      {showJoinModal && (
        <JoinGroupSprintModal onClose={() => setShowJoinModal(false)} />
      )}
      {guestMessage && (
        <GuestPrompt message={guestMessage} onClose={() => setGuestMessage(null)} />
      )}
    </div>
  );
}