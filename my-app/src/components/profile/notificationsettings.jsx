import { useEffect, useState } from "react";
import { Bell, Inbox, Mail, Smartphone, Check, Loader2, AlertCircle } from "lucide-react";
import API_URL from "@/config/api";

// ─── Notification categories matching your backend ────────────────────────────

const CATEGORIES = [
  {
    section: "Discovery",
    items: [
      { key: "discovery_story_approved", label: "Your story is approved & live" },
      { key: "discovery_new_story", label: "A new story is added to Discovery" },
      { key: "discovery_story_liked", label: "Someone liked your story" },
    ],
  },
  {
    section: "Community (Snippets)",
    items: [
      { key: "snippet_comment", label: "Someone commented on your snippet" },
      { key: "snippet_comment_liked", label: "Someone liked your comment" },
      { key: "snippet_reply", label: "Someone replied to your comment" },
      { key: "snippet_reply_liked", label: "Someone liked your reply" },
    ],
  },
  {
    section: "Blog",
    items: [
      { key: "blog_new_post", label: "A new blog post is published" },
      { key: "blog_comment", label: "Someone commented on a blog post" },
      { key: "blog_reply", label: "Someone replied to your comment" },
    ],
  },
  {
    section: "Sprints",
    items: [
      { key: "sprint_checkout_kudos", label: "Post-sprint encouragement after checkout" },
      { key: "sprint_end_kudos", label: "Kudos when you end a group sprint" },
    ],
  },
  {
    section: "Events",
    items: [
      { key: "event_started", label: "An event has started" },
      { key: "event_ended", label: "An event has ended or been cancelled" },
    ],
  },
  {
    section: "Quotes & Announcements",
    items: [
      { key: "quote_new", label: "A new daily quote is published" },
    ],
  },
  {
    section: "Feedback",
    items: [
      { key: "feedback_new_submission", label: "Someone posts a new submission" },
      { key: "feedback_critique_received", label: "Someone critiqued your submission" },
      { key: "feedback_critique_upvoted", label: "Someone upvoted your critique" },
      { key: "feedback_paragraph_comment", label: "Someone commented on your paragraph" },
      { key: "feedback_paragraph_reply", label: "Someone replied to your paragraph comment" },
      { key: "feedback_comment_milestone", label: "Your comment hits an upvote milestone" },
    ],
  },
];

const CHANNELS = [
  { key: "inbox", label: "Inbox", Icon: Inbox },
  { key: "push", label: "Push", Icon: Smartphone },
  { key: "email", label: "Email", Icon: Mail },
];

// Default: everything on
function defaultPrefs() {
  const prefs = {};
  CATEGORIES.forEach(({ items }) =>
    items.forEach(({ key }) => {
      prefs[key] = { inbox: true, push: true, email: true };
    })
  );
  return prefs;
}

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState(defaultPrefs());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Fetch existing preferences
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/notifications/preferences`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.preferences) {
            // Merge saved prefs over defaults (so new keys still default to true)
            setPrefs((prev) => ({ ...prev, ...data.preferences }));
          }
        }
      } catch (_) {
        // Silently fall back to defaults if endpoint doesn't exist yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggle(key, channel) {
    setPrefs((prev) => ({
      ...prev,
      [key]: { ...prev[key], [channel]: !prev[key][channel] },
    }));
    setSaved(false);
  }

  // Toggle an entire row (all channels for one notification type)
  function toggleRow(key) {
    const current = prefs[key];
    const allOn = CHANNELS.every((c) => current[c.key]);
    setPrefs((prev) => ({
      ...prev,
      [key]: Object.fromEntries(CHANNELS.map((c) => [c.key, !allOn])),
    }));
    setSaved(false);
  }

  // Toggle an entire column (one channel for all types)
  function toggleColumn(channel) {
    const allOn = CATEGORIES.flatMap((s) => s.items).every(
      ({ key }) => prefs[key][channel]
    );
    setPrefs((prev) => {
      const next = { ...prev };
      CATEGORIES.flatMap((s) => s.items).forEach(({ key }) => {
        next[key] = { ...next[key], [channel]: !allOn };
      });
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/notifications/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ preferences: prefs }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-ink-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-ink-primary/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-ink-primary" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-ink-primary">Notification Preferences</h2>
            <p className="text-xs text-ink-gray mt-0.5">
              Choose what you hear about and how.
            </p>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-ink-primary text-white rounded-lg text-sm font-medium hover:bg-ink-primary/90 transition-colors disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : null}
          {saved ? "Saved!" : "Save changes"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_repeat(3,_56px)] gap-0 border-b border-ink-lightgray/30 px-5 py-3">
          <span className="text-xs font-semibold text-ink-gray uppercase tracking-wide">
            Notifications
          </span>
          {CHANNELS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => toggleColumn(key)}
              title={`Toggle all ${label}`}
              className="flex flex-col items-center gap-1 group"
            >
              <Icon className="w-4 h-4 text-ink-gray group-hover:text-ink-primary transition-colors" />
              <span className="text-[10px] font-semibold text-ink-gray uppercase tracking-wide group-hover:text-ink-primary transition-colors">
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Sections */}
        {CATEGORIES.map(({ section, items }, si) => (
          <div key={section}>
            {/* Section label */}
            <div className="px-5 py-2 bg-ink-cream/50">
              <span className="text-[11px] font-semibold text-ink-gold uppercase tracking-widest">
                {section}
              </span>
            </div>

            {/* Rows */}
            {items.map(({ key, label }, ri) => {
              const isLast = si === CATEGORIES.length - 1 && ri === items.length - 1;
              return (
                <div
                  key={key}
                  className={`grid grid-cols-[1fr_repeat(3,_56px)] gap-0 px-5 py-3.5 items-center hover:bg-ink-cream/30 transition-colors ${
                    !isLast ? "border-b border-ink-lightgray/20" : ""
                  }`}
                >
                  <button
                    onClick={() => toggleRow(key)}
                    className="text-sm text-ink-primary text-left hover:text-ink-gold transition-colors"
                  >
                    {label}
                  </button>

                  {CHANNELS.map(({ key: channel }) => (
                    <div key={channel} className="flex items-center justify-center">
                      <button
                        onClick={() => toggle(key, channel)}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all duration-150 ${
                          prefs[key][channel]
                            ? "bg-ink-primary border-ink-primary"
                            : "bg-white border-ink-lightgray hover:border-ink-gray"
                        }`}
                        aria-label={`Toggle ${channel} for ${label}`}
                        aria-checked={prefs[key][channel]}
                        role="checkbox"
                      >
                        {prefs[key][channel] && (
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <p className="text-xs text-ink-gray text-center">
        Click a column header to toggle all notifications for that channel. Click a row label to toggle all channels for that notification.
      </p>
    </div>
  );
}