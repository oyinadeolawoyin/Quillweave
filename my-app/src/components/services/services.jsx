import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Header from "../profile/header";
import { AppMetaTags } from "../utilis/metatags";

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

function GoldLine({ className = "" }) {
  return <div className={`w-10 h-px bg-[#d4af37] ${className}`} />;
}

// ── Story Coaching inclusions ─────────────────────────────────────────────────
const COACHING_INCLUDES = [
  "A focused conversation to help you articulate what your story is really about",
  "Plot troubleshooting — finding the source of what feels broken, not just the symptoms",
  "Worldbuilding sessions that help you find the story thread inside the world you've already built",
  "Questions that unlock character motivations you can sense but haven't been able to name yet",
  "Identifying what your story needs to move forward — so you leave with direction, not more confusion",
  "A thinking partner you can return to whenever the fog rolls back in",
];

// ── Author Website inclusions ─────────────────────────────────────────────────
const WEBSITE_INCLUDES = [
  "Custom-designed site built around your author brand",
  "Book showcase pages with cover art and purchase links",
  "Bio page that tells your story and connects with readers",
  "Blog or newsletter integration to build your audience",
  "Mobile-first, fast-loading, and easy for readers to navigate",
  "Full handover so you own and manage it completely",
];

// ── Decorative quote mark ─────────────────────────────────────────────────────
function QuoteMark() {
  return (
    <span
      className="absolute -top-4 -left-2 text-7xl font-serif text-[#d4af37] opacity-20 leading-none select-none"
      aria-hidden="true"
    >
      "
    </span>
  );
}

// ── Service card ─────────────────────────────────────────────────────────────
function ServiceCard({ icon, tag, title, description, includes, accent, delay }) {
  const [ref, inView] = useInView(0.08);
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(36px)",
        transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
      }}
      className="relative bg-white rounded-2xl shadow-soft overflow-hidden"
    >
      {/* Top accent strip */}
      <div className={`h-1 w-full ${accent}`} />

      <div className="p-8 sm:p-10">
        {/* Icon + tag */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#fafaf9] border border-gray-100 flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
            {icon}
          </div>
          <span className="text-[11px] tracking-[0.3em] text-[#d4af37] uppercase font-semibold">
            {tag}
          </span>
        </div>

        {/* Title + description */}
        <h3 className="text-2xl sm:text-3xl font-serif text-[#2d3748] mb-4 leading-snug">
          {title}
        </h3>
        <p className="text-[#4a4a4a] leading-[1.85] mb-8 text-base">
          {description}
        </p>

        {/* Divider */}
        <div className="h-px bg-gray-100 mb-8" />

        {/* What's included */}
        <p className="text-[11px] tracking-[0.3em] text-gray-400 uppercase mb-5 font-semibold">
          What's included
        </p>
        <ul className="space-y-3">
          {includes.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#d4af37] flex-shrink-0" />
              <span className="text-sm text-[#4a4a4a] leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Services() {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <AppMetaTags
        title="Services — Inkwell"
        description="Story development coaching and author website design for writers who are serious about their craft."
      />
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#fafaf9]">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center">
          <p
            className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-6"
            style={{ animation: "inkFadeUp 0.8s ease 0.1s both" }}
          >
            What we offer
          </p>

          <h1
            className="text-4xl sm:text-5xl md:text-[3.25rem] font-serif text-[#2d3748] leading-[1.2] mb-8"
            style={{ animation: "inkFadeUp 0.9s ease 0.25s both" }}
          >
            Your story deserves
            <br />
            <em className="not-italic text-[#4a4a4a]">to be told well.</em>
          </h1>

          <GoldLine
            className="mx-auto mb-8"
            style={{ animation: "inkFadeUp 0.7s ease 0.4s both" }}
          />

          <div style={{ animation: "inkFadeUp 0.9s ease 0.5s both" }}>
            <p className="text-lg sm:text-xl text-[#4a4a4a] leading-[1.85] max-w-xl mx-auto">
              Whether you need a thinking partner to help you see through the fog
              or a home on the web for the story you've already written —
              we're here when you need it.
            </p>
          </div>
        </div>
      </section>

      {/* ── Services grid ────────────────────────────────────────────────── */}
      <section className="bg-[#fafaf9]">
        <div className="max-w-5xl mx-auto px-6 pb-20 sm:pb-28 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ServiceCard
            delay={0}
            icon="📖"
            tag="Story Clarity"
            accent="bg-[#d4af37]"
            title="Story Clarity Sessions"
            description="You know your story better than anyone else — sometimes you just can't see it clearly. Maybe your worldbuilding is rich but the story thread feels buried. Maybe your plot has a problem you can feel but can't name. Maybe something is off and you've been staring at it so long you can't tell where. These sessions aren't about shaping your story for you. They're about thinking through it together until it clicks — and then you go write it."
            includes={COACHING_INCLUDES}
          />
          <ServiceCard
            delay={100}
            icon="🌐"
            tag="Author Website"
            accent="bg-[#2d3748]"
            title="Author Website Design"
            description="Readers who discover you deserve a place to land. We design clean, professional author websites that reflect your voice, showcase your work, and give your audience a reason to stay — and come back. No templates that look like everyone else's. A site that's unmistakably yours."
            includes={WEBSITE_INCLUDES}
          />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#2d3748] leading-snug mb-4">
              Simple. Unhurried. Collaborative.
            </h2>
            <p className="text-lg text-[#4a4a4a] leading-[1.85] mb-14">
              We start with a conversation. You tell us where you are with
              your story or your platform, and together we figure out exactly
              what kind of support makes sense for you right now.
            </p>
          </FadeIn>

          <div className="space-y-10">
            {[
              {
                step: "01",
                title: "Reach out",
                body: "Send us a message — no forms, no funnels. Just tell us a bit about your story or what you need for your website.",
              },
              {
                step: "02",
                title: "We talk",
                body: "A short, informal conversation to understand your vision and figure out how we can help. No pressure, no pitch.",
              },
              {
                step: "03",
                title: "We get to work",
                body: "Coaching sessions or design work begins — at a pace that fits your writing life, not the other way around.",
              },
            ].map(({ step, title, body }, i) => (
              <FadeIn key={step} delay={i * 120}>
                <div className="flex gap-6 sm:gap-8">
                  <span className="text-[2.5rem] font-serif text-[#d4af37] opacity-40 leading-none flex-shrink-0 w-12 text-center">
                    {step}
                  </span>
                  <div>
                    <h4 className="text-lg font-serif text-[#2d3748] mb-2">{title}</h4>
                    <p className="text-[#4a4a4a] leading-[1.8] text-base">{body}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial / philosophy banner ──────────────────────────────── */}
      <section className="bg-[#2d3748]">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-28 text-center">
          <FadeIn>
            <GoldLine className="mx-auto mb-10" />
            <div className="relative inline-block">
              <QuoteMark />
              <p className="text-2xl sm:text-3xl md:text-4xl font-serif text-white leading-[1.7] italic">
                Your story is already in there.
                <br />
                Sometimes you just need someone
                <br />
                to think through it with you.
              </p>
            </div>
            <GoldLine className="mx-auto mt-10" />
          </FadeIn>
        </div>
      </section>

      {/* ── For whom ─────────────────────────────────────────────────────── */}
      <section className="bg-[#fafaf9]">
        <div className="max-w-3xl mx-auto px-6 py-20 sm:py-24">
          <FadeIn>
            <p className="text-[11px] tracking-[0.35em] text-[#d4af37] uppercase mb-5">
              Who this is for
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#2d3748] leading-snug mb-12">
              These services are built for writers who —
            </h2>
          </FadeIn>

          <div className="space-y-5">
            {[
              "have a world fully built but can't find the story thread running through it",
              "can feel something is wrong with their plot but can't locate where it breaks",
              "are writing and writing but feel like they're going in circles",
              "want a sounding board — not someone to take over, just someone to think alongside",
              "are ready for readers but don't have a place to send them",
              "want a website that represents their work without feeling generic",
            ].map((item, i) => (
              <FadeIn key={item} delay={i * 80}>
                <div className="flex items-start gap-5">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#d4af37] flex-shrink-0" />
                  <p className="text-lg text-[#4a4a4a] leading-relaxed">{item}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-[#2d3748]">
        <div className="max-w-3xl mx-auto px-6 py-28 sm:py-36 text-center">
          <FadeIn>
            <GoldLine className="mx-auto mb-12" />
            <p className="text-4xl sm:text-5xl font-serif text-white leading-[1.5] mb-6">
              Ready to take
              <br />
              the next step?
            </p>
            <p className="text-gray-300 text-lg mb-10 max-w-md mx-auto leading-relaxed">
              Reach out and tell us about your story or your website needs.
              We'd love to hear what you're working on.
            </p>
            <GoldLine className="mx-auto mb-12" />
            <a
              href="mailto:hello@inkwellinky.com"
              className="inline-block px-10 py-4 bg-[#d4af37] text-[#2d3748] text-sm font-semibold rounded-xl hover:opacity-90 transition-all duration-200 shadow-soft"
            >
              Get in touch
            </a>
            <p className="mt-5 text-gray-500 text-sm">
              Or find us on{" "}
              <a
                href="https://discord.gg/DYHJK6EP"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 underline underline-offset-2 hover:text-white transition-colors"
              >
                Discord
              </a>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#2d3748] border-t border-white/10 py-6 text-center">
        <p className="text-sm text-gray-500">
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
