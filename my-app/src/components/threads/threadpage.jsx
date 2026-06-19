// src/components/threads/threadpage.jsx

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import Header from "../profile/header";

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Prisma Json fields can come back as a parsed array OR a JSON string.
// This normalises both so ImageSlideshow always gets a plain string[].
function parseMediaUrls(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(Boolean) : []; }
    catch { return []; }
  }
  return [];
}

function Avatar({ user, size = 32 }) {
  if (!user) return (
    <div className="rounded-full bg-[#e8e0d0] flex items-center justify-center flex-shrink-0 text-[#9a8c7a] font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>?</div>
  );
  return user.avatar
    ? <img src={user.avatar} alt={user.username} className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    : (
      <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, background: "#1a1a2e", fontSize: size * 0.38 }}>
        {user.username?.charAt(0).toUpperCase()}
      </div>
    );
}

// ─── Media lightbox ───────────────────────────────────────────────────────────

function MediaLightbox({ url, onClose }) {
  const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-sm"
      onClick={onClose}
      style={{ animation: "lbFadeIn 0.15s ease" }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div onClick={e => e.stopPropagation()} className="max-w-[94vw] max-h-[94vh] flex items-center justify-center">
        {isVideo
          ? <video src={url} controls autoPlay className="max-w-full max-h-[92vh] rounded-xl shadow-2xl" />
          : <img src={url} alt="" className="max-w-full max-h-[92vh] rounded-xl shadow-2xl object-contain" />
        }
      </div>
      <p className="absolute bottom-4 text-white/30 text-[11px]">Click outside or press Esc to close</p>
      <style>{`@keyframes lbFadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
    </div>
  );
}

// ─── Media block — renders image/video and opens lightbox on click ─────────────

function MediaBlock({ url }) {
  const [lightbox, setLightbox] = useState(false);
  if (!url) return null;
  const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
  return (
    <>
      <div
        className="mt-3 rounded-xl overflow-hidden border border-[#e8e0d0] cursor-zoom-in group relative"
        onClick={() => setLightbox(true)}
      >
        {isVideo ? (
          <video src={url} className="w-full" muted />
        ) : (
          <img
            src={url}
            alt=""
            className="w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          />
        )}
        {/* zoom hint overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/55 rounded-full p-1.5">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      {lightbox && <MediaLightbox url={url} onClose={() => setLightbox(false)} />}
    </>
  );
}

// ─── Multi-file preview strip shown inside compose box ───────────────────────

const MAX_IMAGES = 5;

function MediaPreviewStrip({ files, onRemove }) {
  if (!files || files.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[#f4f1ec] bg-[#faf7f2] flex-wrap">
      {files.map((file, i) => {
        const isImage = file.type.startsWith("image/");
        const url = URL.createObjectURL(file);
        return (
          <div key={i} className="relative group flex-shrink-0">
            {isImage
              ? <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover border border-[#e8e0d0]" />
              : <video src={url} className="h-16 w-16 rounded-lg object-cover border border-[#e8e0d0]" muted />
            }
            <button
              onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
      {files.length < MAX_IMAGES && (
        <p className="text-[10px] text-[#c8b89a] ml-1">{files.length}/{MAX_IMAGES}</p>
      )}
    </div>
  );
}

// ─── Image slideshow shown on posted comments/replies ─────────────────────────

function ImageSlideshow({ urls }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!urls || urls.length === 0) return null;

  // Single image — use existing MediaBlock behaviour
  if (urls.length === 1) return <MediaBlock url={urls[0]} />;

  const prev = () => setIndex(i => (i - 1 + urls.length) % urls.length);
  const next = () => setIndex(i => (i + 1) % urls.length);

  const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(urls[index]);

  return (
    <>
      <div className="mt-3 rounded-xl overflow-hidden border border-[#e8e0d0] relative group bg-[#f5f3ef]" style={{ minHeight: 160 }}>
        {/* Main media */}
        <div className="cursor-zoom-in" onClick={() => setLightbox(true)}>
          {isVideo
            ? <video src={urls[index]} className="w-full object-contain" style={{ maxHeight: 340 }} muted />
            : <img src={urls[index]} alt="" className="w-full object-contain" style={{ maxHeight: 340 }} />
          }
        </div>

        {/* Prev / Next arrows */}
        {urls.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/65 flex items-center justify-center text-white transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/65 flex items-center justify-center text-white transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Dot indicators */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className="rounded-full transition-all"
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                background: i === index ? "#d4af37" : "rgba(255,255,255,0.55)",
              }}
            />
          ))}
        </div>

        {/* Counter badge */}
        <div className="absolute top-2 right-2 bg-black/45 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
          {index + 1}/{urls.length}
        </div>
      </div>

      {lightbox && <MediaLightbox url={urls[index]} onClose={() => setLightbox(false)} />}
    </>
  );
}

// ─── Formatted text — preserves paragraphs/line breaks, supports **bold** and *italic*/_italic_ ──

// Splits a single line into text/bold/italic/@mention segments.
function parseInlineFormatting(line, keyPrefix) {
  // Order: bold (**) → italic (* or _) → @mention
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|@[a-zA-Z0-9_]+)/g;
  const parts = line.split(pattern);
  return parts.map((part, i) => {
    if (!part) return null;
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length > 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length > 2)
    ) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("@") && part.length > 1) {
      const username = part.slice(1);
      return (
        <Link key={key} to={`/profile/${username}`}
          className="font-semibold text-[#1a5fb4] hover:underline">
          {part}
        </Link>
      );
    }
    return part;
  });
}

// Renders text content with paragraphs preserved (blank-line separated),
// single line breaks kept within a paragraph, and **bold**/*italic* support.
function FormattedText({ content, className = "" }) {
  if (!content) return null;

  const paragraphs = content.split(/\n{2,}/);

  return (
    <div className={className}>
      {paragraphs.map((para, pIdx) => {
        const lines = para.split("\n");
        return (
          <p key={pIdx} className={pIdx > 0 ? "mt-3" : ""}>
            {lines.map((line, lIdx) => (
              <span key={lIdx}>
                {parseInlineFormatting(line, `${pIdx}-${lIdx}`)}
                {lIdx < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}


// ─── Welcome nudge — shown to brand-new signups, points them to the daily challenge ──

function WelcomeChallengeNudge({ onDismiss }) {
  return (
    <div
      className="mb-6 rounded-2xl overflow-hidden border border-[#d4af37]/40 bg-gradient-to-r from-[#1a1a2e] to-[#2d2b4a] relative"
      style={{ animation: "welcomeFadeIn 0.5s ease both" }}
    >
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="px-6 py-6 sm:px-8 sm:py-7 sm:flex sm:items-center sm:justify-between gap-6">
        <div className="pr-8">
          <p className="text-[11px] tracking-[0.3em] text-[#d4af37] uppercase mb-2">Welcome to Inkwell</p>
          <h3 className="font-serif text-white text-xl sm:text-2xl mb-2">
            Glad you're here — say hi below 👋
          </h3>
          <p className="text-white/60 text-[13px] sm:text-[14px] leading-relaxed max-w-md">
            While you're at it, why not start your streak today? Join the daily
            writing challenge and show up alongside other writers.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex-shrink-0">
          <Link
            to="/challenge"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#d4af37] text-[#1a1a2e] text-[13px] font-bold rounded-xl hover:bg-[#c9a42d] transition-colors whitespace-nowrap"
          >
            Join the daily challenge
          </Link>
        </div>
      </div>
      <style>{`@keyframes welcomeFadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}


function LikeButton({ count, liked, onToggle, disabled, size = "md" }) {
  const [pop, setPop] = useState(false);

  function handleClick() {
    if (disabled) return;
    if (!liked) { setPop(true); setTimeout(() => setPop(false), 380); }
    onToggle();
  }

  const sizes = {
    sm: { icon: "w-5 h-5",     text: "text-[13px]", px: "px-3 py-2",   gap: "gap-2"   },
    md: { icon: "w-4 h-4",     text: "text-[12px]", px: "px-3 py-1.5",   gap: "gap-2"   },
    lg: { icon: "w-5 h-5",     text: "text-[13px]", px: "px-4 py-2",     gap: "gap-2"   },
  };
  const s = sizes[size] ?? sizes.md;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center ${s.gap} ${s.px} rounded-xl font-bold transition-colors disabled:opacity-40 ${
        liked
          ? "text-[#d4af37] bg-[#d4af37]/10 hover:bg-[#d4af37]/15"
          : "text-[#9a8c7a] hover:text-[#d4af37] hover:bg-[#d4af37]/08"
      }`}
      style={{
        transform: pop ? "scale(1.4)" : "scale(1)",
        transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), color 0.15s, background 0.15s",
      }}
    >
      <svg
        className={s.icon}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={liked ? 0 : 2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      <span className={`tabular-nums ${s.text}`}>{count}</span>
    </button>
  );
}

// ─── Compose box — with media upload ─────────────────────────────────────────

function ComposeBox({ placeholder = "Write something…", onSubmit, onCancel, autoFocus = false, compact = false }) {
  const [value, setValue]             = useState("");
  const [files, setFiles]             = useState([]);
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState("");
  // @mention autocomplete state
  const [mentionQuery, setMentionQuery]   = useState("");   // text after the last @
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionIndex, setMentionIndex]   = useState(0);
  const [mentionAnchor, setMentionAnchor] = useState(null); // caret position where @ was typed
  const mentionTimer = useRef(null);

  const textRef = useRef(null);
  const fileRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (autoFocus && textRef.current) {
      textRef.current.focus();
      textRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [autoFocus]);

  // Fetch member suggestions whenever mentionQuery changes
  useEffect(() => {
    if (!mentionQuery || mentionQuery.length < 2) { setMentionResults([]); return; }
    clearTimeout(mentionTimer.current);
    mentionTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API_URL}/threads/members/search?q=${encodeURIComponent(mentionQuery)}`, { credentials: "include" });
        if (r.ok) { const d = await r.json(); setMentionResults(d.users || []); setMentionIndex(0); }
      } catch {}
    }, 220);
    return () => clearTimeout(mentionTimer.current);
  }, [mentionQuery]);

  function addFiles(incoming) {
    setFiles(prev => [...prev, ...incoming].slice(0, MAX_IMAGES));
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  function wrapSelection(marker, ph) {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const selected = value.slice(start, end);
    const text = selected || ph;
    const newValue = `${value.slice(0, start)}${marker}${text}${marker}${value.slice(end)}`;
    setValue(newValue);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + text.length);
    });
  }

  // Called on every keystroke in the textarea — detects an active @mention
  function handleChange(e) {
    const newVal = e.target.value;
    setValue(newVal);

    const caret = e.target.selectionStart;
    // Walk backwards from caret to find if we're inside a @word
    const before = newVal.slice(0, caret);
    const match  = before.match(/@([a-zA-Z0-9_]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionAnchor(caret - match[0].length); // position of the @
    } else {
      setMentionQuery("");
      setMentionResults([]);
      setMentionAnchor(null);
    }
  }

  // Insert the chosen username into the textarea, replacing the @partial text
  function insertMention(username) {
    const el = textRef.current;
    if (!el || mentionAnchor === null) return;
    const before = value.slice(0, mentionAnchor);
    const after  = value.slice(el.selectionStart);
    const inserted = `@${username} `;
    const newVal = `${before}${inserted}${after}`;
    setValue(newVal);
    setMentionResults([]);
    setMentionQuery("");
    setMentionAnchor(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = mentionAnchor + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e) {
    if (mentionResults.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex].username);
        return;
      }
      if (e.key === "Escape") { setMentionResults([]); setMentionQuery(""); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  }

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true); setErr("");
    try {
      await onSubmit(trimmed, files.length > 0 ? files : null);
      setValue(""); setFiles([]);
    } catch (e) {
      setErr(e.message ?? "Something went wrong.");
    } finally { setSaving(false); }
  }

  const showDropdown = mentionResults.length > 0;

  return (
    <div className="relative">
      <div
        className="rounded-xl border border-[#e8e0d0] bg-white overflow-hidden"
        style={{ boxShadow: "0 2px 14px rgba(26,26,46,0.07)" }}
      >
        {/* Formatting toolbar */}
        <div className="flex items-center gap-1 px-3 pt-2.5">
          <button type="button" onClick={() => wrapSelection("**", "bold text")} title="Bold"
            className="w-7 h-7 flex items-center justify-center rounded-md text-[13px] font-bold text-[#6b5c4a] hover:bg-[#f4f1ec] hover:text-[#1a1a2e] transition-colors">B</button>
          <button type="button" onClick={() => wrapSelection("*", "italic text")} title="Italic"
            className="w-7 h-7 flex items-center justify-center rounded-md text-[13px] italic font-semibold text-[#6b5c4a] hover:bg-[#f4f1ec] hover:text-[#1a1a2e] transition-colors">I</button>
          <span className="w-px h-4 bg-[#e8e0d0] mx-1" />
          <span className="text-[10px] text-[#c8b89a] font-medium">@ to mention a member</span>
        </div>
        <textarea
          ref={textRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          className="w-full px-5 pt-1.5 pb-2 text-[14px] text-[#1a1a2e] placeholder-[#c8b89a] focus:outline-none resize-none bg-white leading-relaxed"
        />
        <MediaPreviewStrip files={files} onRemove={removeFile} />
        {err && <p className="text-[11px] text-[#c0392b] px-5 pt-1">{err}</p>}
        <div className="flex items-center justify-between px-5 pb-3.5 pt-2 bg-white border-t border-[#f4f1ec]">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#c8b89a]">⌘+Enter to post</span>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={files.length >= MAX_IMAGES}
              className="text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors disabled:opacity-30" title="Attach images">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
              onChange={e => { const s = Array.from(e.target.files); e.target.value = ""; addFiles(s); }} />
          </div>
          <div className="flex gap-2 items-center">
            {onCancel && (
              <button onClick={onCancel} className="px-3 py-1.5 text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors">Cancel</button>
            )}
            <button onClick={handleSubmit} disabled={!value.trim() || saving}
              className="px-5 py-2 bg-[#1a1a2e] text-white text-[13px] font-semibold rounded-lg hover:bg-[#252545] transition-colors disabled:opacity-40">
              {saving ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>

      {/* @mention dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 z-50 mt-1 w-64 bg-white border border-[#e8e0d0] rounded-xl shadow-xl overflow-hidden"
          style={{ boxShadow: "0 8px 32px rgba(26,26,46,0.14)" }}
        >
          {mentionResults.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); insertMention(u.username); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === mentionIndex ? "bg-[#faf7f2]" : "hover:bg-[#faf7f2]"
              }`}
            >
              {u.avatar
                ? <img src={u.avatar} alt={u.username} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                : <div className="w-7 h-7 rounded-full bg-[#1a1a2e] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
              }
              <span className="text-[13px] font-semibold text-[#1a1a2e]">@{u.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Compose Modal ───────────────────────────────────────────────────────────

function ComposeModal({ placeholder, onSubmit, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(26,26,46,0.55)", backdropFilter: "blur(4px)", animation: "cmFadeIn 0.15s ease" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(26,26,46,0.22)", animation: "cmSlideUp 0.18s ease" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#f4f1ec]">
          <span className="text-[13px] font-bold text-[#1a1a2e]">
            {placeholder?.startsWith("Replying") ? "Write a reply" : "Leave a comment"}
          </span>
          <button onClick={onClose} className="p-1.5 text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors rounded-lg hover:bg-[#f4f1ec]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">
          <ComposeBox
            placeholder={placeholder}
            onSubmit={async (content, files) => { await onSubmit(content, files); onClose(); }}
            onCancel={onClose}
            autoFocus
          />
        </div>
      </div>
      <style>{`
        @keyframes cmFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes cmSlideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
}

// ─── Reply row ────────────────────────────────────────────────────────────────

function ReplyRow({ reply, user, commentId, threadId, onLikeToggled, onReplyTo, highlightReplyId }) {
  const [liked, setLiked]       = useState(reply.likedByMe ?? false);
  const [likes, setLikes]       = useState(reply._count?.likes ?? 0);
  const [toggling, setToggling] = useState(false);
  const [highlighted, setHighlighted] = useState(false);

  const isTarget = highlightReplyId === reply.id;

  useEffect(() => {
    if (!isTarget) return;
    setHighlighted(true);
    setTimeout(() => setHighlighted(false), 2800);
  }, [isTarget]);

  async function toggleLike() {
    if (!user || toggling) return;
    setToggling(true);
    try {
      const r = await fetch(
        `${API_URL}/threads/${threadId}/comments/${commentId}/replies/${reply.id}/like`,
        { method: "POST", credentials: "include" }
      );
      if (r.ok) {
        const d = await r.json();
        setLiked(d.liked);
        setLikes(d.likesCount);
        onLikeToggled?.();
      }
    } finally { setToggling(false); }
  }

  return (
    <div id={`reply-${reply.id}`} className="flex gap-3" style={{ scrollMarginTop: 96 }}>
      <Avatar user={reply.author} size={28} />
      <div className="flex-1 min-w-0">
        <div
          className="rounded-xl px-4 py-3 transition-all duration-700"
          style={{
            background:  highlighted ? "#fffdf0" : "#faf7f2",
            boxShadow:   highlighted ? "0 0 0 2px #d4af37" : "none",
          }}
        >          <div className="flex items-center gap-2 mb-1.5">
            {reply.author?.id ? (
              <Link
                to={`/profile/${reply.author.id}`}
                className="text-[14px] font-bold text-[#1a1a2e] hover:text-[#d4af37] transition-colors"
              >
                {reply.author.username}
              </Link>
            ) : (
              <span className="text-[14px] font-bold text-[#1a1a2e]">Deleted user</span>
            )}
            <span className="text-[11px] text-[#c8b89a]">{timeAgo(reply.createdAt)}</span>
          </div>
          <FormattedText content={reply.content} className="text-[14px] font-medium text-[#2d2416] leading-relaxed" />
          {/* media in reply */}
          {(() => {
            const urls = parseMediaUrls(reply.mediaUrls);
            return urls.length > 0
              ? <ImageSlideshow urls={urls} />
              : reply.mediaUrl && <MediaBlock url={reply.mediaUrl} />;
          })()}
        </div>
        <div className="flex items-center gap-1 mt-1.5 pl-1">
          <LikeButton count={likes} liked={liked} onToggle={toggleLike} disabled={!user || toggling} size="md" />
          {user && (
            <button
              onClick={() => onReplyTo(reply.author?.username)}
              className="px-3 py-2 text-[13px] font-semibold text-[#9a8c7a] hover:text-[#1a1a2e] hover:bg-[#f0ebe3] rounded-lg transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comment card ─────────────────────────────────────────────────────────────

function CommentCard({ comment, user, threadId, isAdmin, highlightCommentId, highlightReplyId }) {
  const [liked, setLiked]           = useState(comment.likedByMe ?? false);
  const [likes, setLikes]           = useState(comment._count?.likes ?? 0);
  const [toggling, setToggling]     = useState(false);
  const [replies, setReplies]       = useState([]);
  const [repliesLoaded, setLoaded]  = useState(false);
  const [loadingReplies, setLR]     = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [replyPrefix, setReplyPrefix] = useState("");
  const [highlighted, setHighlighted] = useState(false);

  const cardRef = useRef(null);
  const replyCount = comment._count?.replies ?? 0;

  const isTargetComment = highlightCommentId === comment.id;
  const isTargetReply   = highlightReplyId != null;

  // Auto-scroll and highlight when this comment is the notification target
  useEffect(() => {
    if (!isTargetComment && !isTargetReply) return;

    // For reply targets, first load replies then scroll
    async function scrollToTarget() {
      if (isTargetReply && !repliesLoaded) {
        setLR(true);
        try {
          const r = await fetch(`${API_URL}/threads/${threadId}/comments/${comment.id}/replies?limit=50`);
          if (r.ok) {
            const d = await r.json();
            setReplies((d.replies ?? []).map(rep => ({ ...rep, mediaUrls: parseMediaUrls(rep.mediaUrls) })));
            setLoaded(true);
          }
        } finally { setLR(false); }
      }

      // Wait a tick for DOM to update
      setTimeout(() => {
        const targetEl = isTargetReply
          ? document.getElementById(`reply-${highlightReplyId}`)
          : cardRef.current;
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlighted(true);
          setTimeout(() => setHighlighted(false), 2800);
        }
      }, 120);
    }

    scrollToTarget();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTargetComment, isTargetReply]);

  async function toggleLike() {
    if (!user || toggling) return;
    setToggling(true);
    try {
      const r = await fetch(
        `${API_URL}/threads/${threadId}/comments/${comment.id}/like`,
        { method: "POST", credentials: "include" }
      );
      if (r.ok) {
        const d = await r.json();
        setLiked(d.liked);
        setLikes(d.likesCount);
      }
    } finally { setToggling(false); }
  }

  async function loadReplies() {
    if (repliesLoaded) { setLoaded(false); setReplies([]); return; }
    setLR(true);
    try {
      const r = await fetch(`${API_URL}/threads/${threadId}/comments/${comment.id}/replies?limit=50`);
      if (r.ok) {
        const d = await r.json();
        setReplies((d.replies ?? []).map(rep => ({ ...rep, mediaUrls: parseMediaUrls(rep.mediaUrls) })));
        setLoaded(true);
      }
    } finally { setLR(false); }
  }

  async function submitReply(content, files) {
    const form = new FormData();
    form.append("content", replyPrefix ? `@${replyPrefix} ${content}` : content);
    if (files && files.length > 0) {
      files.forEach((f, i) => form.append(`media_${i}`, f));
    }
    const r = await fetch(
      `${API_URL}/threads/${threadId}/comments/${comment.id}/replies`,
      { method: "POST", credentials: "include", body: form }
    );
    if (!r.ok) throw new Error("Failed to post reply");
    const d = await r.json();
    const reply = { ...d.reply, mediaUrls: parseMediaUrls(d.reply.mediaUrls) };
    setReplies(prev => [...prev, reply]);
    if (!repliesLoaded) setLoaded(true);
    setReplyPrefix("");
  }

  function openReply(mentionUsername) {
    setReplyPrefix(mentionUsername ?? "");
    setShowModal(true);
  }

  async function deleteComment() {
    if (!window.confirm("Delete this comment?")) return;
    await fetch(`${API_URL}/threads/${threadId}/comments/${comment.id}`, {
      method: "DELETE", credentials: "include",
    });
    window.location.reload();
  }

  const canDelete = user && (user.id === comment.authorId || isAdmin);

  return (
    <div ref={cardRef} className="flex gap-4" style={{ scrollMarginTop: 96 }}>
      <div className="flex flex-col items-center">
        <Avatar user={comment.author} size={40} />
        {(repliesLoaded && replies.length > 0) && (
          <div className="w-px flex-1 mt-2 bg-[#e8e0d0]" style={{ minHeight: 24 }} />
        )}
      </div>

      <div className="flex-1 min-w-0 pb-5">
        {/* Comment bubble */}
        <div
          className="bg-white rounded-2xl border px-5 py-4 transition-all duration-700"
          style={{
            boxShadow:   highlighted ? "0 0 0 3px #d4af37, 0 4px 16px rgba(212,175,55,0.18)" : "0 1px 6px rgba(26,26,46,0.05)",
            borderColor: highlighted ? "#d4af37" : "#e8e0d0",
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-baseline gap-2">
              {comment.author?.id ? (
                <Link
                  to={`/profile/${comment.author.id}`}
                  className="text-[15px] font-bold text-[#1a1a2e] hover:text-[#d4af37] transition-colors"
                >
                  {comment.author.username}
                </Link>
              ) : (
                <span className="text-[15px] font-bold text-[#1a1a2e]">Deleted user</span>
              )}
              <span className="text-[11px] text-[#c8b89a]">{timeAgo(comment.createdAt)}</span>
            </div>
            {canDelete && (
              <button
                onClick={deleteComment}
                className="text-[#c8b89a] hover:text-[#c0392b] transition-colors flex-shrink-0 p-1"
                title="Delete comment"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          <FormattedText content={comment.content} className="text-[15px] text-[#2d2416] leading-relaxed" />
          {/* media in comment */}
          {(() => {
            const urls = parseMediaUrls(comment.mediaUrls);
            return urls.length > 0
              ? <ImageSlideshow urls={urls} />
              : comment.mediaUrl && <MediaBlock url={comment.mediaUrl} />;
          })()}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-1 mt-2 pl-1">
          <LikeButton count={likes} liked={liked} onToggle={toggleLike} disabled={!user || toggling} size="md" />

          {replyCount > 0 && (
            <button
              onClick={loadReplies}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-[#9a8c7a] hover:text-[#1a1a2e] hover:bg-[#f0ebe3] rounded-lg transition-colors"
            >
              {loadingReplies ? (
                "Loading…"
              ) : repliesLoaded ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/>
                  </svg>
                  Hide {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </>
              )}
            </button>
          )}

          {user && (
            <button
              onClick={() => openReply(null)}
              className="px-3 py-2 text-[13px] font-semibold text-[#9a8c7a] hover:text-[#1a1a2e] hover:bg-[#f0ebe3] rounded-lg transition-colors"
            >
              Reply
            </button>
          )}
        </div>

        {/* Replies list */}
        {repliesLoaded && replies.length > 0 && (
          <div className="mt-3 ml-1 space-y-3 pl-4 border-l-2 border-[#ede8e0]">
            {replies.map(reply => (
              <ReplyRow
                key={reply.id}
                reply={reply}
                user={user}
                commentId={comment.id}
                threadId={threadId}
                onReplyTo={openReply}
                highlightReplyId={highlightReplyId}
              />
            ))}
          </div>
        )}

        {/* Reply compose modal */}
        {showModal && user && (
          <ComposeModal
            placeholder={replyPrefix ? `Replying to @${replyPrefix}…` : "Write a reply…"}
            onSubmit={submitReply}
            onClose={() => { setShowModal(false); setReplyPrefix(""); }}
          />
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function ThreadPage() {
  const { threadId }      = useParams();
  const { user }          = useAuth();
  const navigate          = useNavigate();
  const location          = useLocation();

  const [thread, setThread]           = useState(null);
  const [comments, setComments]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [threadLiked, setTL]          = useState(false);
  const [threadLikes, setTLikes]      = useState(0);
  const [toggling, setToggling]       = useState(false);
  const [threadLikePop, setTLPop]     = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [heroLightbox, setHeroLightbox] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  // Parse ?comment=X&reply=Y from notification links
  const searchParams    = new URLSearchParams(location.search);
  const targetCommentId = searchParams.get("comment") ? Number(searchParams.get("comment")) : null;
  const targetReplyId   = searchParams.get("reply")   ? Number(searchParams.get("reply"))   : null;

  // New-signup welcome nudge: shown when redirected here as ?welcome=1
  const isWelcome = searchParams.get("welcome") === "1";
  const [showWelcome, setShowWelcome] = useState(isWelcome);

  function dismissWelcome() {
    setShowWelcome(false);
    // Clean the query param so a refresh doesn't re-trigger the nudge
    const params = new URLSearchParams(location.search);
    params.delete("welcome");
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }


  const load = useCallback(async () => {
    try {
      const [tRes, cRes] = await Promise.all([
        fetch(`${API_URL}/threads/${threadId}`),
        fetch(`${API_URL}/threads/${threadId}/comments?limit=100`),
      ]);
      if (!tRes.ok) { navigate("/threads"); return; }
      const tData = await tRes.json();
      const cData = cRes.ok ? await cRes.json() : { comments: [] };
      setThread(tData.thread);
      setTLikes(tData.thread._count?.likes ?? 0);
      setComments(
        (cData.comments ?? []).map(c => ({
          ...c,
          mediaUrls: parseMediaUrls(c.mediaUrls),
        }))
      );
    } catch {}
  }, [threadId, navigate]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function toggleThreadLike() {
    if (!user || toggling) return;
    setToggling(true);
    try {
      const r = await fetch(`${API_URL}/threads/${threadId}/like`, {
        method: "POST", credentials: "include",
      });
      if (r.ok) {
        const d = await r.json();
        setTL(d.liked);
        setTLikes(d.likesCount);
        if (d.liked) { setTLPop(true); setTimeout(() => setTLPop(false), 380); }
      }
    } finally { setToggling(false); }
  }

  async function submitComment(content, files) {
    const form = new FormData();
    form.append("content", content);
    if (files && files.length > 0) {
      files.forEach((f, i) => form.append(`media_${i}`, f));
    }
    const r = await fetch(`${API_URL}/threads/${threadId}/comments`, {
      method: "POST", credentials: "include", body: form,
    });
    if (!r.ok) throw new Error("Failed to post");
    const d = await r.json();
    const comment = { ...d.comment, mediaUrls: parseMediaUrls(d.comment.mediaUrls) };
    setComments(prev => [comment, ...prev]);
    setShowCompose(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f3ef]">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-[#e8e0d0] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!thread) return null;

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Header />

      {/* ── Hero strip ── */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #212140 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-8 pb-12">

          {/* Breadcrumb */}
          <Link
            to="/forum"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/40 hover:text-[#d4af37] transition-colors mb-6"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
            </svg>
            All threads
          </Link>

          {/* Thread label */}
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]/70 mb-2">
            {thread.isPinned ? "📌 Pinned thread" : "Thread"}
          </p>

          {/* Title */}
          <h1 className="font-serif text-white text-3xl sm:text-4xl font-bold leading-tight mb-5">
            {thread.title}
          </h1>

          {/* Author + date */}
          <div className="flex items-center gap-3 mb-6">
            <Avatar user={thread.author} size={32} />
            <div>
              {thread.author?.id ? (
                <Link
                  to={`/profile/${thread.author.id}`}
                  className="text-[13px] font-semibold text-white/80 hover:text-[#d4af37] transition-colors"
                >
                  {thread.author.username}
                </Link>
              ) : (
                <span className="text-[13px] font-semibold text-white/80">Admin</span>
              )}
              <span className="text-[11px] text-white/35 ml-2.5">{timeAgo(thread.createdAt)}</span>
            </div>
          </div>

          {/* Like + comment count */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleThreadLike}
              disabled={!user || toggling}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border disabled:opacity-40 ${
                threadLiked
                  ? "bg-[#d4af37] text-[#1a1a2e] border-[#d4af37]"
                  : "border-white/20 text-white/60 hover:border-[#d4af37] hover:text-[#d4af37]"
              }`}
              style={{
                transform: threadLikePop ? "scale(1.12)" : "scale(1)",
                transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), color 0.15s, background 0.15s, border-color 0.15s",
              }}
            >
              <svg className="w-5 h-5" fill={threadLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={threadLiked ? 0 : 2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {threadLikes} {threadLikes === 1 ? "like" : "likes"}
            </button>
            <span className="text-[12px] text-white/35">
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content card ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-5 mb-8">
        <div
          className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden"
          style={{ boxShadow: "0 4px 24px rgba(26,26,46,0.09)" }}
        >
          {/* Hero image — zoomable, full width, shown at its full natural height (no cropping) */}
          {thread.mediaUrl && (() => {
            const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(thread.mediaUrl);
            return (
              <div
                className="relative cursor-zoom-in group"
                onClick={() => setHeroLightbox(true)}
              >
                {isVideo
                  ? <video src={thread.mediaUrl} className="w-full h-auto" muted />
                  : <img src={thread.mediaUrl} alt="" className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.01]" />
                }
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/08 transition-all" />
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/55 rounded-full p-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            );
          })()}

          <div className="px-7 py-6">
            <FormattedText content={thread.context} className="text-[16px] text-[#2d2416] leading-[1.75]" />

            {thread.link && (
              <a
                href={thread.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-5 text-[12px] font-semibold text-[#1a5fb4] hover:underline"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                {thread.link}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* hero lightbox */}
      {heroLightbox && thread.mediaUrl && (
        <MediaLightbox url={thread.mediaUrl} onClose={() => setHeroLightbox(false)} />
      )}

      {/* ── Comments section ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 pb-20">

        {showWelcome && <WelcomeChallengeNudge onDismiss={dismissWelcome} />}

        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-[#1a1a2e] text-xl font-bold">
            {comments.length > 0
              ? `${comments.length} ${comments.length === 1 ? "Comment" : "Comments"}`
              : "Be the first to comment"}
          </h2>
          {user && !showCompose && (
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-[13px] font-bold rounded-xl hover:bg-[#c9a42d] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
              </svg>
              Leave a comment
            </button>
          )}
          {!user && (
            <Link to="/login" className="text-[13px] font-semibold text-[#1a5fb4] hover:underline">
              Sign in to comment
            </Link>
          )}
        </div>

        {/* Compose modal */}
        {showCompose && user && (
          <ComposeModal
            placeholder="What do you think? Share your thoughts…"
            onSubmit={submitComment}
            onClose={() => setShowCompose(false)}
          />
        )}

        {/* Empty state */}
        {comments.length === 0 && (
          <div className="bg-white border border-[#e8e0d0] rounded-2xl py-14 text-center">
            <div className="w-12 h-12 rounded-full bg-[#faf7f2] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#c8b89a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p className="text-[14px] text-[#9a8c7a] mb-1">No comments yet.</p>
            {user && (
              <button
                onClick={() => setShowCompose(true)}
                className="mt-2 text-[13px] font-semibold text-[#1a5fb4] hover:underline"
              >
                Start the conversation
              </button>
            )}
          </div>
        )}

        {/* Comment list */}
        {comments.length > 0 && (
          <div className="space-y-2">
            {comments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                user={user}
                threadId={Number(threadId)}
                isAdmin={isAdmin}
                highlightCommentId={targetCommentId}
                highlightReplyId={targetReplyId}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA for guests */}
        {!user && comments.length > 0 && (
          <div
            className="mt-10 rounded-2xl border border-[#e8e0d0] bg-white px-8 py-7 text-center"
            style={{ borderTop: "3px solid #d4af37" }}
          >
            <p className="font-serif text-[#1a1a2e] text-lg font-bold mb-1">Join the conversation</p>
            <p className="text-[13px] text-[#9a8c7a] mb-5">Sign up to comment, reply, and connect with other writers.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/signup"
                className="px-6 py-2.5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-xl hover:bg-[#c9a42d] transition-colors">
                Create account
              </Link>
              <Link to="/login"
                className="px-6 py-2.5 border border-[#1a1a2e] text-[#1a1a2e] text-sm font-semibold rounded-xl hover:bg-[#1a1a2e] hover:text-white transition-colors">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}