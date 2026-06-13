// src/pages/AccountabilityPage.jsx
// Explains how Quillweave's community sprints work.
// Linked from the homepage "How our sprint sessions work →" row.
// Inspired by Scribophile's accountability page tone — focused, warm, practical.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "../profile/header";
import ContributeSoundscape from "./Contributesoundscape";

const DISCORD_INVITE = "https://discord.gg/TntmfbkxB";

// ─── Timezone helper ─────────────────────────────────────────
// Shows 3:30pm UTC in the user's local time, e.g. "4:30 PM WAT"
function localTime(utcHour, utcMinute = 0) {
  const now = new Date();
  const d = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, utcMinute, 0
  ));
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

// ─── Notification preference toggle ──────────────────────────
// Uses the dedicated /notifications/sprint-reminder endpoint so the cron job
// can efficiently query opted-in users without scanning the JSON blob table.
function FridayReminderToggle({ user }) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // Load the user's current opt-in state from the dedicated endpoint
  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/notifications/sprint-reminder`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && typeof d.optedIn === "boolean") {
          setChecked(d.optedIn);
        }
      })
      .catch(() => {});
  }, [user]);

  async function toggle(val) {
    if (!user) return;
    setChecked(val);
    setSaving(true);
    try {
      await fetch(`${API_URL}/notifications/sprint-reminder`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optedIn: val }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (_) {}
    finally { setSaving(false); }
  }

  return (
    <div className="bg-[#fffdf0] border border-[#d4af37]/40 rounded-xl p-4 flex items-start gap-3">
      {/* Gold checkbox */}
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" className="sr-only peer" checked={checked} disabled={saving} onChange={e => toggle(e.target.checked)} />
        <button
          onClick={() => toggle(!checked)}
          disabled={saving}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            checked ? "bg-[#d4af37] border-[#d4af37]" : "bg-white border-[#d4af37]"
          }`}
          aria-checked={checked}
          role="checkbox"
          aria-label="Remind me before Friday sprint"
        >
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1a1a2e]">
          Remind me 30 minutes before the Friday writing sprint
        </p>
        <p className="text-[11px] text-[#9a8c7a] mt-1 leading-relaxed">
          You'll get a notification at{" "}
          <strong className="text-[#6b5c4a]">{localTime(15, 30)}</strong> every Friday —
          that's 3:30 pm UTC, 30 minutes before we start. Works in your local timezone.
        </p>
        {saved && <p className="text-[11px] text-[#059669] mt-1.5 font-semibold">Preference saved!</p>}
        {!user && (
          <p className="text-[11px] text-[#9a8c7a] mt-1.5">
            <Link to="/login" className="text-[#1a5fb4] underline hover:no-underline">Sign in</Link> to enable reminders.
          </p>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════
export default function AccountabilityPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Header />

      {/* ── Hero ── */}
      <div className="bg-[#1a1a2e] border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-2">Community Sprints</p>
          <h1 className="font-serif text-white text-2xl sm:text-3xl leading-tight mb-3">
            Show up. Write. Repeat.
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-lg">
            Finishing a draft is less about inspiration and more about showing up. Our community sprint sessions give you a fixed time, a room full of writers, and no excuses.
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-8 items-start">

          {/* ── LEFT ── */}
          <div className="space-y-6">

            {/* Schedule cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Friday Writing */}
              <div className="bg-white border border-[#e8e0d0] rounded-xl overflow-hidden">
                <div className="bg-[#d4af37] px-5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a2e]/70 mb-0.5">Every Friday</p>
                  <p className="font-serif text-[#1a1a2e] text-lg font-bold">Writing Sprint</p>
                </div>
                <div className="px-5 py-4 space-y-2">
                  <div className="flex items-center gap-2 text-[12px] text-[#9a8c7a]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    4:00 pm UTC · {localTime(16)}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#9a8c7a]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Open to all members
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#9a8c7a]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    Write in the sprint room
                  </div>
                </div>
              </div>

              {/* Wednesday Reading */}
              <div className="bg-white border border-[#e8e0d0] rounded-xl overflow-hidden">
                <div className="bg-[#1a1a2e] px-5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Every Wednesday</p>
                  <p className="font-serif text-white text-lg font-bold">Reading Sprint</p>
                </div>
                <div className="px-5 py-4 space-y-2">
                  <div className="flex items-center gap-2 text-[12px] text-[#9a8c7a]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Time varies · check Discord
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#9a8c7a]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                    Read in the sprint room
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#9a8c7a]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5865f2" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                    Updates via Discord
                  </div>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white border border-[#e8e0d0] rounded-xl p-6">
              <h2 className="font-serif text-[#1a1a2e] text-lg font-bold mb-1">How it works</h2>
              <p className="text-[12px] text-[#9a8c7a] mb-5 leading-relaxed">
                No prep required. Just show up at the start time and write.
              </p>

              <div className="space-y-5">
                {[
                  {
                    n: "1",
                    title: "Join the sprint room",
                    body: "At the session time, head to the sprint room on Quillweave. You'll see other writers checking in — share your goal for the session or just dive in.",
                    color: "#d4af37",
                  },
                  {
                    n: "2",
                    title: "Write in silence alongside others",
                    body: "The timer runs. Everyone writes. Knowing other people are in the room doing the same thing — even quietly — makes it surprisingly easy to stay in the chair.",
                    color: "#d4af37",
                  },
                  {
                    n: "3",
                    title: "Check out when you're done",
                    body: "Log your word count when the session ends. Your total is added to the community's shared sprint history. Small wins, stacked up over weeks, finish drafts.",
                    color: "#d4af37",
                  },
                  {
                    n: "4",
                    title: "Come back next week",
                    body: "Consistency is the whole point. Writers who show up regularly — even imperfectly — tend to finish things. The session will be here every Friday at 4pm UTC.",
                    color: "#1a5fb4",
                  },
                ].map(({ n, title, body, color }) => (
                  <div key={n} className="flex gap-4">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold mt-0.5"
                      style={{ background: color + "20", color }}
                    >
                      {n}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#1a1a2e] mb-0.5">{title}</p>
                      <p className="text-[12px] text-[#6b5c4a] leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Friday reminder */}
            <div>
              <p className="text-[11px] text-[#9a8c7a] uppercase tracking-widest font-semibold mb-3">Get reminded</p>
              <FridayReminderToggle user={user} />
              <div className="mt-3 bg-white border border-[#e8e0d0] rounded-xl p-4 flex items-start gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865f2" className="flex-shrink-0 mt-0.5" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                <div>
                  <p className="text-[13px] font-semibold text-[#1a1a2e] mb-0.5">Wednesday reading sprint updates</p>
                  <p className="text-[12px] text-[#6b5c4a] leading-relaxed">
                    For Wednesday reading sprint announcements, join our{" "}
                    <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="text-[#5865f2] underline hover:no-underline">
                      Discord community
                    </a>. That's where session links, reading picks, and discussion happen.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-5">

            {/* CTA card */}
            <div className="bg-[#1a1a2e] rounded-xl p-6 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37] mb-2">Ready?</p>
              <h3 className="font-serif text-white text-xl mb-2 leading-snug">Join this Friday's sprint</h3>
              <p className="text-white/55 text-[12px] leading-relaxed mb-5">
                Every Friday at 4pm UTC. The room opens a few minutes early. Show up, share your goal, and write.
              </p>
            </div>

            {/* Discord card */}
            <div className="bg-white border border-[#e8e0d0] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#5865f2]/10 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865f2" aria-hidden="true">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1a1a2e]">Community Discord</p>
                  <p className="text-[11px] text-[#9a8c7a]">For the writers between sessions</p>
                </div>
              </div>
              <p className="text-[12px] text-[#6b5c4a] leading-relaxed mb-4">
                Brainstorm story ideas, ask craft questions, share a tough chapter, or just check in with other writers. The community is active between sprint sessions.
              </p>
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#5865f2] text-white text-[12px] font-semibold rounded-lg hover:bg-[#4752c4] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                Join the Discord
              </a>
            </div>

            {/* Contribute soundscape */}
            <ContributeSoundscape />

          </div>
        </div>
      </div>
    </div>
  );
}