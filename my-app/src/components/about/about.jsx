import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Header from "../profile/header";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";

// ── Scroll-triggered fade-in ──────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function FadeIn({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Gold divider ──────────────────────────────────────────────────────────────
function GoldLine({ className = "" }) {
  return <div className={`w-10 h-px bg-[#d4af37] ${className}`} />;
}

// ── Writer avatar ─────────────────────────────────────────────────────────────
function WriterAvatar({ writer, delay }) {
  const [ref, inView] = useInView(0.1);
  const initials = (writer.username || "").slice(0, 2).toUpperCase();
  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-2"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0) scale(1)" : "translateY(16px) scale(0.9)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {writer.avatar ? (
        <img
          src={writer.avatar}
          alt={writer.username}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-soft"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-sm font-semibold ring-2 ring-white shadow-soft">
          {initials}
        </div>
      )}
      <span className="text-[11px] text-[#9a8c7a]">@{writer.username}</span>
    </div>
  );
}

// ── Community highlight card ──────────────────────────────────────────────────
function HighlightCard({ label, icon, user, value, unit, delay }) {
  const [ref, inView] = useInView(0.1);
  if (!user) return null;
  const initials = (user.username || "").slice(0, 2).toUpperCase();

  return (
    <div
      ref={ref}
      className="bg-white border border-[#e8e0d0] rounded-xl p-6 text-center hover:border-[#d4af37]/50 transition-colors duration-300"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div className="text-2xl mb-3">{icon}</div>
      <p className="text-[11px] tracking-[0.25em] text-[#d4af37] uppercase mb-4">{label}</p>

      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.username}
          className="w-14 h-14 rounded-full object-cover mx-auto mb-3 ring-2 ring-[#fffdf0]"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-lg font-semibold mx-auto mb-3 ring-2 ring-[#fffdf0]">
          {initials}
        </div>
      )}

      <p className="font-serif text-[#1a1a2e] text-base mb-1">@{user.username}</p>
      <p className="text-[#9a8c7a] text-[13px]">
        {value} {unit}
      </p>
    </div>
  );
}


const WHAT_YOU_FIND = [
  {
    title: "Accountability",
    body: "Show up to community sprints, track your progress, and build a writing habit that sticks — without pressure or guilt.",
  },
  {
    title: "Critique",
    body: "Share your work and get thoughtful feedback from other writers who want to see it improve, not just be praised.",
  },
  {
    title: "Connection",
    body: "Meet writers who understand the work — the slow days, the breakthroughs, and everything in between.",
  },
];

// ── Who it's for list ─────────────────────────────────────────────────────────
const WHO_ITS_FOR = [
  "want consistency without pressure",
  "are ready for honest feedback on their work",
  "feel lonely in their writing journey",
  "want to be part of a community of writers",
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function About() {
  const [writers, setWriters] = useState([]);
  const [highlights, setHighlights] = useState({
    streakLeader: null,
    topCritiquer: null,
    topSprinter: null,
    topPracticeWriter: null,
  });

  useEffect(() => {
    async function loadWriters() {
      try {
        const res = await fetch(`${API_URL}/users/founding-writers`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.users)) setWriters(data.users);
      } catch (err) {
        console.error("Failed to load writers:", err);
      }
    }

    async function loadHighlights() {
      try {
        const [leaderboardRes, challengeRes] = await Promise.all([
          fetch(`${API_URL}/leaderboard`),
          fetch(`${API_URL}/challenge/stats`),
        ]);

        const leaderboard = leaderboardRes.ok ? await leaderboardRes.json() : null;
        const challenge   = challengeRes.ok ? await challengeRes.json() : null;

        const streakTop = challenge?.streakLeaders?.[0];

        setHighlights({
          streakLeader: streakTop
            ? { user: streakTop.user, value: streakTop.currentStreak }
            : null,
          topCritiquer: leaderboard?.critiquers?.[0]
            ? { user: leaderboard.critiquers[0].user, value: leaderboard.critiquers[0].critiqueCount }
            : null,
          topSprinter: leaderboard?.sprinters?.[0]
            ? { user: leaderboard.sprinters[0].user, value: leaderboard.sprinters[0].sprintCount }
            : null,
          topPracticeWriter: leaderboard?.practiceWriters?.[0]
            ? { user: leaderboard.practiceWriters[0].user, value: leaderboard.practiceWriters[0].practiceCount }
            : null,
        });
      } catch (err) {
        console.error("Failed to load community highlights:", err);
      }
    }

    loadWriters();
    loadHighlights();
  }, []);

  const hasHighlights = Object.values(highlights).some(Boolean);

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <AppMetaTags
        title="About Inkwell — A Place to Write, Together"
        description="Inkwell helps writers stay accountable, get meaningful critique, and connect with a community that takes the craft seriously."
      />
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#1a1a2e] border-b border-white/10">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center">
          <p
            className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-6"
            style={{ animation: "inkFadeUp 0.8s ease 0.1s both" }}
          >
            About Inkwell
          </p>

          <h1
            className="text-4xl sm:text-5xl md:text-[3.5rem] font-serif text-white leading-[1.2] mb-8"
            style={{ animation: "inkFadeUp 0.9s ease 0.25s both" }}
          >
            Writing gets better
            <br />
            <em className="not-italic text-[#d4af37]">when you don't do it alone.</em>
          </h1>

          <GoldLine
            className="mx-auto mb-8"
            style={{ animation: "inkFadeUp 0.7s ease 0.4s both" }}
          />

          <div style={{ animation: "inkFadeUp 0.9s ease 0.5s both" }}>
            <p className="text-lg sm:text-xl text-white/70 leading-[1.8] max-w-lg mx-auto">
              Inkwell used to be a quiet place to write.
              <br />
              Now it's where writers show up, improve,
              <br />
              and find people who get it.
            </p>
          </div>
        </div>
      </section>

      {/* ── What you'll find here ────────────────────────────────────────── */}
      <section className="bg-[#fffdf0]">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
              What it is
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#1a1a2e] leading-snug mb-12">
              Three things Inkwell gives you.
            </h2>
          </FadeIn>

          <div className="space-y-8">
            {WHAT_YOU_FIND.map((item, i) => (
              <FadeIn key={item.title} delay={i * 120}>
                <div className="group bg-white border border-[#e8e0d0] rounded-xl p-6 sm:p-8 sm:flex sm:items-start sm:gap-6 hover:border-[#d4af37]/50 transition-colors duration-300">
                  <div
                    className="hidden sm:flex w-12 h-12 rounded-full items-center justify-center flex-shrink-0 font-serif text-lg"
                    style={{ background: "#d4af37" + "1a", color: "#d4af37" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-3 sm:hidden">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#d4af37" }} />
                      <h3 className="text-xl font-serif text-[#1a1a2e]">{item.title}</h3>
                    </div>
                    <h3 className="hidden sm:block text-xl font-serif text-[#1a1a2e] mb-2">{item.title}</h3>
                    <p className="text-[15px] text-[#6b5c4a] leading-[1.8]">{item.body}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why it exists ────────────────────────────────────────────────── */}
      <section className="bg-[#f5f3ef]">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
              Why it exists
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#1a1a2e] leading-snug mb-8">
              Finishing your work takes more than willpower.
            </h2>
            <p className="text-lg text-[#6b5c4a] leading-[1.8] mb-6">
              It takes people who notice when you show up — and who'll tell you,
              kindly and honestly, when something isn't working yet.
            </p>
            <p className="text-lg text-[#6b5c4a] leading-[1.8]">
              That's what Inkwell is built around: regular sprints to keep you
              consistent, a space to get real feedback, and a community of writers
              who are doing the same thing you are.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Mission banner ───────────────────────────────────────────────── */}
      <section className="bg-[#1a1a2e]">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24 text-center">
          <FadeIn>
            <GoldLine className="mx-auto mb-10" />
            <p className="text-2xl sm:text-3xl md:text-4xl font-serif text-white leading-[1.6] mb-4">
              To help writers finish what they start
            </p>
            <p className="text-lg text-white/60 leading-relaxed">
              through accountability, honest critique, and a community that cares about the craft.
            </p>
            <GoldLine className="mx-auto mt-10" />
          </FadeIn>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────────────────── */}
      <section className="bg-[#fffdf0]">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
              Who it's for
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#1a1a2e] leading-snug mb-12">
              Inkwell is for writers who —
            </h2>
          </FadeIn>

          <div className="space-y-6">
            {WHO_ITS_FOR.map((item, i) => (
              <FadeIn key={item} delay={i * 100}>
                <div className="flex items-center gap-5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "#d4af37" }}
                  />
                  <p className="text-lg text-[#6b5c4a]">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community Highlights ─────────────────────────────────────────── */}
      {hasHighlights && (
        <section className="bg-[#fffdf0]">
          <div className="max-w-4xl mx-auto px-6 py-20 sm:py-24">
            <FadeIn>
              <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5 text-center">
                Community Highlights
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif text-[#1a1a2e] leading-snug mb-12 text-center">
                Writers leading the way.
              </h2>
            </FadeIn>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <HighlightCard
                label="Longest Streak"
                icon="🔥"
                user={highlights.streakLeader?.user}
                value={highlights.streakLeader?.value}
                unit={highlights.streakLeader?.value === 1 ? "day streak" : "day streak"}
                delay={0}
              />
              <HighlightCard
                label="Top Critiquer"
                icon="✍️"
                user={highlights.topCritiquer?.user}
                value={highlights.topCritiquer?.value}
                unit={highlights.topCritiquer?.value === 1 ? "critique" : "critiques"}
                delay={80}
              />
              <HighlightCard
                label="Top Sprinter"
                icon="⏱️"
                user={highlights.topSprinter?.user}
                value={highlights.topSprinter?.value}
                unit={highlights.topSprinter?.value === 1 ? "sprint" : "sprints"}
                delay={160}
              />
              <HighlightCard
                label="Emotion Practice"
                icon="💛"
                user={highlights.topPracticeWriter?.user}
                value={highlights.topPracticeWriter?.value}
                unit={highlights.topPracticeWriter?.value === 1 ? "session" : "sessions"}
                delay={240}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Writers already here ─────────────────────────────────────────── */}
      {writers.length > 0 && (
        <section className="bg-[#f5f3ef]">
          <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24 text-center">
            <FadeIn>
              <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
                The community
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif text-[#1a1a2e] mb-3">
                Writers are already here.
              </h2>
              <p className="text-[#9a8c7a] mb-12 max-w-sm mx-auto">
                Showing up to sprints, sharing their work, and helping each other improve.
              </p>
            </FadeIn>

            <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-8">
              {writers.map((w, i) => (
                <WriterAvatar key={w.id} writer={w} delay={i * 80} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Community Partners ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#1a1a2e]">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-20 sm:py-28">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5 text-center">
              With Gratitude
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-white leading-snug mb-6 text-center max-w-xl mx-auto">
              A community that helps Inkwell grow.
            </h2>
            <p className="text-white/60 text-lg leading-[1.8] text-center max-w-lg mx-auto mb-14">
              We're grateful to partner with Writers' Circle — a community that
              shares Inkwell with its members and welcomes them into our
              sprints, critique spaces, and writing sessions.
            </p>
          </FadeIn>

          <FadeIn delay={140}>
            <div className="bg-[#fffdf0] rounded-2xl overflow-hidden shadow-soft sm:flex sm:items-stretch">
              {/* Partner image */}
              <div className="sm:w-[42%] h-56 sm:h-auto relative">
                <img
                  src="writersCircle.png"
                  alt="Writers' Circle"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/30 to-transparent sm:bg-gradient-to-r" />
              </div>

              {/* Partner content */}
              <div className="flex-1 p-8 sm:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#d4af37" }} />
                  <p className="text-[11px] tracking-[0.3em] text-[#d4af37] uppercase">Community Partner</p>
                </div>
                <h3 className="text-2xl font-serif text-[#1a1a2e] mb-4">Writers' Circle</h3>
                <p className="text-[15px] text-[#6b5c4a] leading-[1.8]">
                  Writers' Circle is a close-knit, supportive community of
                  writers in its own right. As a partner, they generously
                  share Inkwell's events and sessions with their members —
                  contributing to our community and helping more writers
                  find a space to write, get feedback, and grow. We're
                  grateful for their support and the spirit they bring to it.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Write with us (Inkwell Discord) ──────────────────────────────── */}
      <section className="bg-[#f5f3ef]">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24 text-center">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
              Write with us
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#1a1a2e] mb-4">
              You don't have to write alone.
            </h2>
            <p className="text-[#9a8c7a] mb-10 max-w-md mx-auto leading-relaxed">
              Join sprint sessions, get feedback on your work, and find your people
              in the Inkwell community.
            </p>

            <a
              href="https://discord.gg/DYHJK6EP"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-8 py-4 border border-[#1a1a2e] text-[#1a1a2e] text-sm font-medium rounded-xl hover:bg-[#1a1a2e] hover:text-white transition-all duration-300"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Join the community
            </a>
          </FadeIn>
        </div>
      </section>

      {/* ── Closing ──────────────────────────────────────────────────────── */}
      <section className="bg-[#1a1a2e]">
        <div className="max-w-3xl mx-auto px-6 py-28 sm:py-36 text-center">
          <FadeIn>
            <GoldLine className="mx-auto mb-12" />
            <p className="text-4xl sm:text-5xl md:text-[3.25rem] font-serif text-white leading-[1.5]">
              Show up.
              <br />
              Get better.
              <br />
              Belong somewhere.
            </p>
            <GoldLine className="mx-auto mt-12 mb-14" />
            <Link
              to="/signup"
              className="inline-block px-10 py-4 bg-[#d4af37] text-[#1a1a2e] text-sm font-semibold rounded-xl hover:opacity-90 transition-all duration-200 shadow-soft"
            >
              Start Writing Today
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#1a1a2e] border-t border-white/10 py-6 text-center">
        <p className="text-sm text-white/40">
          © {new Date().getFullYear()} Inkwell. Made with care for writers.
        </p>
      </footer>

      <style>{`
        @keyframes inkFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}