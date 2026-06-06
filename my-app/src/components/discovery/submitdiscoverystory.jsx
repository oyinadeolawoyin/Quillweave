// src/components/discovery/SubmitDiscoveryStory.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "../profile/header";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const GENRES = ["Fantasy", "Sci-fi", "Romance", "Thriller", "Literary", "Horror", "Mystery", "Historical fiction", "Other"];

const PLATFORMS = [
  "Wattpad", "Royal Road", "Kindle", "Amazon KU",
  "Webnovel", "Scribble Hub", "AO3", "Other",
];

const CONTENT_WARNINGS = [
  "Violence", "Strong language", "Sexual content", "Graphic gore",
  "Abuse", "Self-harm", "Suicide", "Substance use",
  "Trauma", "Dark themes", "Death", "Disturbing imagery",
];

// ─── RICH TEXTAREA ────────────────────────────────────────────────────────────

function RichTextarea({ value, onChange, rows, placeholder, className }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.value !== value) {
      ref.current.value = value;
    }
  }, [value]);

  const flushTimer = useRef(null);
  function handleChange(e) {
    const v = e.target.value;
    clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => onChange(v), 300);
  }
  function handleBlur(e) {
    clearTimeout(flushTimer.current);
    onChange(e.target.value);
  }

  function applyFormat(syntax) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const cur   = el.value;
    const sel   = cur.slice(start, end);
    let newVal, ns, ne;
    if (syntax === "em-dash") {
      newVal = cur.slice(0, start) + "\u2014" + cur.slice(end);
      ns = ne = start + 1;
    } else {
      const wrapped = `${syntax}${sel || "text"}${syntax}`;
      newVal = cur.slice(0, start) + wrapped + cur.slice(end);
      ns = sel ? start : start + syntax.length;
      ne = sel ? start + wrapped.length : ns + 4;
    }
    el.value = newVal;
    onChange(newVal);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(ns, ne); });
  }

  function handleKeyDown(e) {
    if (e.key === "-") {
      const el = ref.current;
      const pos = el.selectionStart;
      const cur = el.value;
      if (pos > 0 && cur[pos - 1] === "-") {
        e.preventDefault();
        const newVal = cur.slice(0, pos - 1) + "\u2014" + cur.slice(el.selectionEnd);
        el.value = newVal;
        onChange(newVal);
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos, pos); });
      }
    }
  }

  const btn = "h-7 px-2 flex items-center gap-1 rounded text-[11px] font-semibold text-[#6b5c4a] hover:bg-[#f0ebe3] hover:text-[#2d3748] transition-colors select-none";

  return (
    <div className="flex flex-col border border-[#e8e0d0] rounded-xl overflow-hidden focus-within:border-[#2d3748] focus-within:ring-2 focus-within:ring-[#2d3748]/10 transition-all bg-[#faf7f2]">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#e8e0d0] bg-white">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyFormat("**"); }} className={btn} title="Bold">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          </svg>
          <span>B</span>
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyFormat("*"); }} className={btn} title="Italic">
          <span className="italic font-serif text-sm leading-none">I</span>
        </button>
        <div className="w-px h-4 bg-[#e8e0d0] mx-1" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyFormat("em-dash"); }} className={btn} title="Em dash">
          <span className="text-sm leading-none">—</span>
          <span className="text-[10px] text-[#9a8c7a] font-normal">em dash</span>
        </button>
        <div className="ml-auto text-[10px] text-[#c4b9ab] pr-1 hidden sm:block">tip: -- → —</div>
      </div>
      <textarea
        ref={ref}
        defaultValue={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}

// ─── FIELD COMPONENTS ────────────────────────────────────────────────────────

function Field({ label, hint, required = true, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-semibold text-[#2d3748]">
          {label}
          {!required && <span className="font-normal text-[#9a8c7a] ml-1">(optional)</span>}
        </label>
        {hint && <span className="text-xs text-[#9a8c7a]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputClass = "w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none focus:border-[#2d3748] focus:ring-2 focus:ring-[#2d3748]/10 transition-all";

// ─── MAIN FORM ───────────────────────────────────────────────────────────────

export default function SubmitDiscoveryStory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // storyId present → edit mode
  const { storyId } = useParams();
  const isEditMode = Boolean(storyId);

  const [loading, setLoading]       = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [coverPreview, setCoverPreview]   = useState(null);
  const [keepExistingCover, setKeepExistingCover] = useState(false);
  const [customGenre, setCustomGenre]     = useState("");
  const [customPlatform, setCustomPlatform] = useState("");

  const [form, setForm] = useState({
    title:             "",
    genre:             "",
    synopsis:          "",
    firstChapterTitle: "",
    firstChapter:      "",
    authorName:        "",
    recommendedBy:     "",
    platform:          "",
    platformLink:      "",
    contentWarnings:   [],
  });

  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  const coverRef  = useRef(null);
  const [coverFile, setCoverFile] = useState(null);

  // ── Load existing story in edit mode ──────────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;
    async function loadStory() {
      try {
        const res = await fetch(`${API_URL}/discovery/${storyId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Story not found.");
        const data = await res.json();
        const s = data.story ?? data;

        // Determine if genre is a known value or custom
        const knownGenre = GENRES.includes(s.genre) ? s.genre : "Other";
        if (knownGenre === "Other") setCustomGenre(s.genre);

        const knownPlatform = PLATFORMS.includes(s.platform) ? s.platform : "Other";
        if (knownPlatform === "Other") setCustomPlatform(s.platform);

        setForm({
          title:             s.title ?? "",
          genre:             knownGenre,
          synopsis:          s.synopsis ?? "",
          firstChapterTitle: s.firstChapterTitle ?? "",
          firstChapter:      s.firstChapter ?? "",
          authorName:        s.authorName ?? "",
          recommendedBy:     s.recommendedBy ?? "",
          platform:          knownPlatform,
          platformLink:      s.platformLink ?? "",
          contentWarnings:   s.contentWarnings ?? [],
        });

        if (s.coverUrl) {
          setCoverPreview(s.coverUrl);
          setKeepExistingCover(true);
        }
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    loadStory();
  }, [storyId, isEditMode]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function toggleWarning(tag) {
    setForm(prev => ({
      ...prev,
      contentWarnings: prev.contentWarnings.includes(tag)
        ? prev.contentWarnings.filter(w => w !== tag)
        : [...prev.contentWarnings, tag],
    }));
    setError("");
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function handleCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setKeepExistingCover(false);
  }

  function removeCover() {
    setCoverPreview(null);
    setCoverFile(null);
    setKeepExistingCover(false);
  }

  function validate() {
    const f = formRef.current;
    const effectiveGenre    = f.genre === "Other" ? customGenre.trim()    : f.genre;
    const effectivePlatform = f.platform === "Other" ? customPlatform.trim() : f.platform;
    if (!f.title.trim())             return "Please enter the story title.";
    if (!effectiveGenre)             return "Please select or enter a genre.";
    if (!f.synopsis.trim())          return "Please write a synopsis.";
    if (!f.firstChapterTitle.trim()) return "Please enter the title of the first chapter.";
    if (!f.firstChapter.trim())      return "Please paste the first chapter content.";
    if (!f.authorName.trim())        return "Please enter the author's name.";
    if (!effectivePlatform)          return "Please select or enter where this story is published.";
    if (!f.platformLink.trim())      return "Please paste the link to the story.";
    try { new URL(f.platformLink.trim()); } catch { return "Platform link must be a valid URL."; }
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setSubmitting(true);
    setError("");

    try {
      const fd = new FormData();
      const f = formRef.current;
      const effectiveGenre    = f.genre === "Other" ? customGenre.trim()    : f.genre;
      const effectivePlatform = f.platform === "Other" ? customPlatform.trim() : f.platform;

      Object.entries(f).forEach(([k, v]) => {
        if (k === "genre")           fd.append(k, effectiveGenre);
        else if (k === "platform")   fd.append(k, effectivePlatform);
        else if (k === "contentWarnings") {
          v.forEach(w => fd.append("contentWarnings", w));
        }
        else fd.append(k, v);
      });

      if (coverFile) {
        fd.append("cover", coverFile);
      }
      // In edit mode, if no new file and no existing cover, signal removal
      // (backend treats missing cover as unchanged if omitted)

      const url    = isEditMode ? `${API_URL}/discovery/${storyId}` : `${API_URL}/discovery`;
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, { method, credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || (isEditMode ? "Update failed." : "Submission failed."));

      if (isEditMode) {
        navigate(`/stories/${storyId}`, { state: { updated: true } });
      } else {
        navigate("/stories", { state: { submitted: true } });
      }
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  }

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <svg className="w-8 h-8 animate-spin text-[#9a8c7a] mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm text-[#9a8c7a]">Loading story…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />

      {/* Hero banner */}
      <div className="bg-[#2d3748] relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-[#d4af37]/10 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 relative">
          <Link
            to={isEditMode ? `/discovery/${storyId}` : "/discovery"}
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isEditMode ? "Back to story" : "Discovery"}
          </Link>
          <p className="text-xs text-[#d4af37] font-bold uppercase tracking-widest mb-2">
            {isEditMode ? "Edit story" : "Submit a story"}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif text-white leading-tight">
            {isEditMode ? "Update your story" : "Recommend a story"}
          </h1>
          <p className="mt-3 text-white/60 text-sm max-w-md">
            {isEditMode
              ? "Make changes to your submission. It will remain live while you edit."
              : "Found a hidden gem? Share its first chapter with the community and help other readers discover it."}
          </p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl rounded-t-none shadow-[0_4px_24px_rgba(45,35,20,0.10)] overflow-hidden"
        >
          <div className="px-6 sm:px-10 pt-10 pb-8 space-y-7">

            {/* ── Story identity ────────────────────────────────────────── */}
            <div className="space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#b8a898]">About the story</h2>

              <Field label="Story title">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. The Name of the Wind"
                  className={inputClass}
                />
              </Field>

              <Field label="Author name">
                <input
                  type="text"
                  value={form.authorName}
                  onChange={(e) => set("authorName", e.target.value)}
                  placeholder="e.g. Patrick Rothfuss"
                  className={inputClass}
                />
              </Field>

              <Field label="Genre">
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => { setField("genre", g); if (g !== "Other") setCustomGenre(""); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                        form.genre === g
                          ? "bg-[#2d3748] text-white border-[#2d3748]"
                          : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#2d3748]"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                {form.genre === "Other" && (
                  <input
                    type="text"
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    placeholder="Enter the genre (e.g. Dark academia, Cozy mystery…)"
                    className={`${inputClass} mt-2`}
                    autoFocus
                  />
                )}
              </Field>

              <Field label="Synopsis" hint="A hook that makes readers want to continue">
                <textarea
                  value={form.synopsis}
                  onChange={(e) => set("synopsis", e.target.value)}
                  rows={3}
                  placeholder="A compelling description of the story's premise, tone, and core tension."
                  className={`${inputClass} resize-none leading-relaxed`}
                />
              </Field>

              <Field label="Content warnings" required={false} hint="Helps readers make informed choices">
                <div className="flex flex-wrap gap-2">
                  {CONTENT_WARNINGS.map((tag) => {
                    const active = form.contentWarnings.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleWarning(tag)}
                        className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                          active
                            ? "bg-[#7c2020] text-white border-[#7c2020]"
                            : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#7c2020] hover:text-[#7c2020]"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {form.contentWarnings.length > 0 && (
                  <p className="text-xs text-[#9a8c7a] mt-2">
                    Selected: {form.contentWarnings.join(", ")}
                  </p>
                )}
              </Field>

              <Field label="Recommended by" required={false} hint="Leave blank if you're the author">
                <input
                  type="text"
                  value={form.recommendedBy}
                  onChange={(e) => set("recommendedBy", e.target.value)}
                  placeholder="Your name or username"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="border-t border-[#f0ebe3]" />

            {/* ── Platform ──────────────────────────────────────────────── */}
            <div className="space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#b8a898]">Where to find it</h2>

              <Field label="Platform">
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setField("platform", p); if (p !== "Other") setCustomPlatform(""); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                        form.platform === p
                          ? "bg-[#2d3748] text-white border-[#2d3748]"
                          : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#2d3748]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {form.platform === "Other" && (
                  <input
                    type="text"
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                    placeholder="Enter the website name (e.g. Tapas, Inkitt, personal blog…)"
                    className={`${inputClass} mt-2`}
                    autoFocus
                  />
                )}
              </Field>

              <Field label="Story link" hint="Direct URL to the story">
                <input
                  type="url"
                  value={form.platformLink}
                  onChange={(e) => set("platformLink", e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="border-t border-[#f0ebe3]" />

            {/* ── First chapter ─────────────────────────────────────────── */}
            <div className="space-y-5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#b8a898] mb-1">First chapter</h2>
                <p className="text-xs text-[#9a8c7a]">
                  Paste the opening chapter so readers can sample the story right here.
                </p>
              </div>

              <Field label="Chapter title" hint="What is this chapter called?">
                <input
                  type="text"
                  value={form.firstChapterTitle}
                  onChange={(e) => set("firstChapterTitle", e.target.value)}
                  placeholder="e.g. A Silence of Three Parts"
                  className={inputClass}
                />
              </Field>

              <Field label="Chapter content">
                <RichTextarea
                  value={form.firstChapter}
                  onChange={(v) => set("firstChapter", v)}
                  rows={18}
                  placeholder="Paste the first chapter here. Use a blank line between paragraphs for best readability."
                  className="w-full px-4 py-3 text-sm text-[#2d3748] placeholder-[#c4b9ab] bg-[#faf7f2] focus:outline-none resize-none leading-[1.9] font-[Georgia,serif]"
                />
                <p className="text-xs text-[#b8a898] mt-2">
                  Separate paragraphs with a blank line. Bold and italic are supported using the toolbar above.
                </p>
              </Field>
            </div>

            <div className="border-t border-[#f0ebe3]" />

            {/* ── Cover image ───────────────────────────────────────────── */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#b8a898] mb-1">
                  Cover image <span className="normal-case font-normal text-[#9a8c7a]">(optional)</span>
                </h2>
                <p className="text-xs text-[#9a8c7a]">Upload the story's cover art if available.</p>
              </div>

              <div
                onClick={() => coverRef.current?.click()}
                className="relative border-2 border-dashed border-[#e8e0d0] rounded-2xl p-6 text-center cursor-pointer hover:border-[#2d3748] transition-all group overflow-hidden"
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover preview" className="max-h-56 mx-auto rounded-xl object-cover shadow" />
                ) : (
                  <div className="text-[#b8a898] group-hover:text-[#2d3748] transition-colors">
                    <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium">Click to upload cover</p>
                    <p className="text-xs mt-1">JPG, PNG or WEBP — max 5 MB</p>
                  </div>
                )}
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleCoverChange}
                />
              </div>
              {coverPreview && (
                <button
                  type="button"
                  onClick={removeCover}
                  className="text-xs text-[#9a8c7a] hover:text-[#c0392b] transition-colors"
                >
                  {keepExistingCover ? "Remove existing cover" : "Remove cover"}
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#fdf1f0] border border-[#f5c6c3] rounded-xl px-4 py-3 text-sm text-[#c0392b]">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-10 py-5 bg-[#faf7f2] border-t border-[#f0ebe3] flex items-center justify-between gap-4">
            <p className="text-xs text-[#b8a898]">
              {isEditMode ? "Changes save immediately." : "Stories are reviewed before going live."}
            </p>
            <div className="flex items-center gap-3">
              {isEditMode && (
                <Link
                  to={`/discovery/${storyId}`}
                  className="px-5 py-3 rounded-xl border border-[#e8e0d0] text-sm text-[#6b5c4a] hover:border-[#2d3748] transition-all font-medium"
                >
                  Cancel
                </Link>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-7 py-3 rounded-xl bg-[#2d3748] text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {isEditMode ? "Saving…" : "Submitting…"}
                  </>
                ) : isEditMode ? "Save changes" : "Submit story"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}