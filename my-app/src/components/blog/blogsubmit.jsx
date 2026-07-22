// src/components/blog/blogSubmit.jsx
//
// Writer's Commons submission form. Any authenticated writer can submit an
// article, writing tip, piece of inspiration, or community resource here.
// Submissions start out PENDING and only appear publicly once an admin
// approves them from the admin Blog panel's "Pending Submissions" queue.
//
// The writing area intentionally mirrors the admin Blog panel's PostForm —
// same rich-text WriteEditor, same field layout — so writers get the same
// quality tools admins do. The differences are deliberate: writers pick from
// a shorter, friendlier category list, and the tag they can attach is scoped
// to their category (see CATEGORIES below) so admin-only tags — Public
// Opinion, Behind the Draft, Successful Stories, Announcement, Event,
// Milestone — never show up here.

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { AppMetaTags } from "../utilis/metatags";
import { WriteEditor } from "../drafts/writeeditorshared";
import API_URL from "@/config/api";

const NAVY = "#1a1a2e";
const GOLD = "#d4af37";
const CREAM = "#f5f3ef";
const PAPER = "#faf8f4";
const BORDER = "#e8e0d0";
const MUTED = "#9a8c7a";
const TEXT = "#6b5c4a";

// Kept in sync with SUBMITTABLE_CATEGORIES in blogController.js. "Resources"
// maps to the "Community Update & News" category underneath — the label is
// friendlier, but the tag ("resources") is what actually keeps it separate
// from admin-only announcements/events/milestones under that same category.
// "Finished Drafts" used to be a category here — it's a tag now (see
// CRAFT_TAGS below), so a finished-draft piece is submitted as a Writing Tip
// tagged "Finished Draft". Stories from Writers and Inspiration overlap
// enough in practice that neither one takes a writer-set tag — an admin can
// still tag an approved Inspiration post afterward (Wins & Struggles,
// Successful Stories, or Behind the Draft, which is what puts it in the
// homepage's Member Spotlight — an editorial call, not the writer's).
const CATEGORIES = [
  {
    value: "Stories from Writers",
    label: "Stories from Writers",
    hint: "A story, lesson, or experience from your own writing journey.",
    tagMode: "none",
  },
  {
    value: "Writing Tips",
    label: "Writing Tips",
    hint: "Craft advice or a technique that's worked for you.",
    tagMode: "craft",
  },
  {
    value: "Inspiration",
    label: "Inspiration",
    hint: "Tell us about your writing journey — what inspires you, a struggle you've pushed through, or a win worth celebrating. A real story, not just a quote or image.",
    tagMode: "none",
  },
  {
    value: "Public Opinion",
    label: "Public Opinion",
    hint: "A take or perspective you want to share with the community.",
    tagMode: "none",
  },
  {
    value: "Community Update & News",
    label: "Resources",
    hint: "A tool, article, or technique you think the community would find useful — write a short piece on it.",
    tagMode: "resources",
  },
];

// Tags writers can attach to a "craft" category (currently just Writing
// Tips). Kept in sync with the "Craft" group in BLOG_TAG_GROUPS in
// adminBlog.jsx.
const CRAFT_TAGS = [
  { value: "drafting", label: "Drafting" },
  { value: "outlining", label: "Outlining" },
  { value: "editing", label: "Editing" },
  { value: "brainstorming", label: "Brainstorming" },
  { value: "story-development", label: "Story Development" },
  { value: "finished-draft", label: "Finished Draft" },
];

// Resources has exactly one writer-facing tag, so there's nothing to
// choose — it's applied automatically.
const RESOURCES_TAG = "resources";

function StatusBadge({ status }) {
  const map = {
    PENDING: { label: "Pending review", bg: "rgba(212,175,55,0.15)", color: "#b8860b" },
    APPROVED: { label: "Published", bg: "rgba(46,125,50,0.12)", color: "#2e7d32" },
    REJECTED: { label: "Not approved", bg: "rgba(198,40,40,0.10)", color: "#c62828" },
  };
  const s = map[status] || map.PENDING;
  return (
    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-sm" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function MySubmissions({ refreshKey }) {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/blog/mine`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSubmissions(data.posts || []);
        }
      } catch {
        // silent — this list is a courtesy view, not critical path
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (isLoading) return null;
  if (submissions.length === 0) return null;

  return (
    <div className="bg-white border rounded-2xl p-6" style={{ borderColor: BORDER }}>
      <h2 className="font-serif text-lg mb-4" style={{ color: NAVY }}>Your submissions</h2>
      <div className="space-y-3">
        {submissions.map(s => (
          <div key={s.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0" style={{ borderColor: "#f0ebe3" }}>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: NAVY }}>{s.title || "Untitled"}</p>
              <p className="text-[11px]" style={{ color: MUTED }}>{s.category}</p>
            </div>
            <StatusBadge status={s.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

// The WriteEditor auto-saves on an interval — for submissions there's
// nothing to persist between saves, so this is a deliberate no-op.
async function noopAutoSave() {}

export default function BlogSubmit() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [craftTag, setCraftTag] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const contentRef = useRef(null);

  const activeCategory = CATEGORIES.find(c => c.value === category) || null;

  // Reset the tag selection whenever the category (and therefore the tag
  // vocabulary that applies) changes.
  useEffect(() => {
    setCraftTag("");
  }, [category]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function resolvedTag() {
    if (!activeCategory) return "";
    if (activeCategory.tagMode === "resources") return RESOURCES_TAG;
    if (activeCategory.tagMode === "craft") return craftTag; // may be empty
    return ""; // "none" mode — Stories from Writers, Inspiration, Public Opinion
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const html = contentRef.current?.innerHTML?.trim() || "";
    const plainText = contentRef.current?.innerText?.trim() || "";
    if (!plainText) return setError("Please write something before submitting.");
    if (!category) return setError("Please choose a category.");

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (title.trim()) formData.append("title", title.trim());
      formData.append("content", html);
      formData.append("category", category);
      const tag = resolvedTag();
      if (tag) formData.append("tag", tag);
      if (link.trim()) formData.append("link", link.trim());
      if (mediaFile) formData.append("media", mediaFile);

      const res = await fetch(`${API_URL}/blog/submit`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Something went wrong. Please try again.");
      }

      setSuccess(true);
      setTitle(""); setCategory(""); setCraftTag(""); setLink("");
      setMediaFile(null); setPreviewUrl(null);
      if (contentRef.current) contentRef.current.innerHTML = "";
      setRefreshKey(k => k + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <div className="text-center max-w-sm px-6">
          <p className="font-serif text-2xl mb-2" style={{ color: NAVY }}>Sign in to submit your writing</p>
          <p className="text-sm mb-6" style={{ color: MUTED }}>You'll need an account to submit an article, tip, or piece of inspiration to Writer's Commons.</p>
          <Link to="/login" className="inline-flex px-5 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: NAVY }}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <AppMetaTags title="Submit your writing – Writer's Commons" description="Submit an article, writing tip, or piece of inspiration to Writer's Commons." />

      <div style={{ background: NAVY }} className="border-b">
        <div className="h-[3px]" style={{ background: GOLD }} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-4 text-white/80 hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Writer's Commons
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl text-white">Submit your writing</h1>
          <p className="text-[13px] mt-2 text-white/80">
            Share an article, writing tip, piece of inspiration, or resource. An admin will review it before it goes live.
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {success && (
          <div className="bg-white border-2 rounded-2xl px-6 py-5 flex items-center gap-3" style={{ borderColor: GOLD }}>
            <span className="text-2xl">✓</span>
            <div>
              <p className="font-serif text-lg" style={{ color: NAVY }}>Submitted for review</p>
              <p className="text-sm" style={{ color: TEXT }}>An admin will take a look, and you'll be notified once it's approved or if it needs changes.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border rounded-2xl p-6 sm:p-8 space-y-6" style={{ borderColor: BORDER }}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Category</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className="text-left px-4 py-3 rounded-xl border transition-all"
                  style={category === c.value
                    ? { borderColor: GOLD, background: PAPER }
                    : { borderColor: BORDER, background: "#fff" }}
                >
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{c.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{c.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Craft tag — only choosable for Stories from Writers / Writing Tips.
              Inspiration and Resources apply their tag automatically. */}
          {activeCategory?.tagMode === "craft" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Tag (optional)</label>
              <select
                value={craftTag}
                onChange={e => setCraftTag(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border text-sm bg-white focus:outline-none"
                style={{ borderColor: BORDER, color: NAVY }}
              >
                <option value="">No tag</option>
                {CRAFT_TAGS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}
          {activeCategory?.tagMode === "resources" && (
            <p className="text-[11px]" style={{ color: MUTED }}>
              This will be tagged <span className="font-semibold" style={{ color: GOLD }}>Resources</span> automatically.
            </p>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Give your piece a title"
              className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none"
              style={{ borderColor: BORDER, color: NAVY }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Your writing</label>
            <div className="border rounded-2xl overflow-hidden focus-within:ring-2 transition-all" style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}>
              <WriteEditor
                initialContent=""
                contentRef={contentRef}
                onAutoSave={noopAutoSave}
                hideTitle
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: MUTED }}>
              Use the toolbar above to format your piece — bold, italics, lists, fonts, colors, and more.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Cover image (optional)</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" style={{ color: TEXT }} />
            {previewUrl && (
              <img src={previewUrl} alt="" className="mt-3 rounded-lg max-h-48 object-cover" />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>External link (optional)</label>
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://…"
              className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none"
              style={{ borderColor: BORDER, color: NAVY }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-lg text-sm font-bold text-white transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100"
            style={{ background: NAVY }}
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>

        <MySubmissions refreshKey={refreshKey} />
      </main>
    </div>
  );
}