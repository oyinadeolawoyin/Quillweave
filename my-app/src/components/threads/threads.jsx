// src/components/threads/threadsfeedpage.jsx
//
// Community Threads feed — every member's posts in one dense, scrollable
// stream. Layout/interaction pattern follows Oyinade's Threads-app-style
// mockup (compose box up top, hairline-divided posts, tag filter bar, a
// Latest/Most Active sort toggle) but recolored entirely to QuillWeave's
// cream/navy/gold brand palette instead of the mockup's dark theme.
//
// Intentionally does NOT include a star/reputation action — QuillWeave
// threads don't carry a star field, so the feed only exposes Like + Comment.

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { AppMetaTags } from "../utilis/metatags";

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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Prisma Json fields can come back as a parsed array OR a JSON string.
function parseMediaUrls(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(Boolean) : []; }
    catch { return []; }
  }
  return [];
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url || "");
}

// ─── tag colors ───────────────────────────────────────────────────────────────
// Each tag gets a quiet, paper-and-ink tinted pill — distinct enough to scan
// the feed at a glance, restrained enough to stay inside the brand palette.

const TAG_STYLES = {
  "First Draft": { bg: "#fdf6e3", text: "#b8860b" },
  "Newcomer":    { bg: "#eef5ef", text: "#4a7c59" },
  "Off-topic":   { bg: "#f0ebe3", text: "#6b5c4a" },
  "Wins":        { bg: "#fdece0", text: "#c1531b" },
  "Struggles":   { bg: "#f7e9ec", text: "#a3435a" },
  "Question":    { bg: "#e8f1f5", text: "#3d6b8a" },
  "Feedback":    { bg: "#f0e9f5", text: "#6b4a8a" },
  "Tips":        { bg: "#fff3e0", text: "#9a6f00" },
  "Sprint":      { bg: "#e6f4f1", text: "#1f7a6c" },
  "Check-in":    { bg: "#eceaf2", text: "#1a1a2e" },
};
const DEFAULT_TAG_STYLE = { bg: "#f4f1ec", text: "#6b5c4a" };

function tagStyle(tag) {
  return TAG_STYLES[tag] || DEFAULT_TAG_STYLE;
}

function TagPill({ tag, size = "sm" }) {
  if (!tag) return null;
  const s = tagStyle(tag);
  const cls = size === "sm"
    ? "text-[10px] px-2 py-0.5"
    : "text-[11px] px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full ${cls}`}
      style={{ background: s.bg, color: s.text }}
    >
      {tag}
    </span>
  );
}

// ─── avatar — initial fallback, navigable to the profile ──────────────────────

function Avatar({ user, size = 40, ring = false }) {
  const inner = !user ? (
    <div
      className="rounded-full bg-[#e8e0d0] flex items-center justify-center text-[#9a8c7a] font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      ?
    </div>
  ) : user.avatar ? (
    <img
      src={user.avatar}
      alt={user.username}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 font-serif"
      style={{ width: size, height: size, background: "#1a1a2e", fontSize: size * 0.4 }}
    >
      {user.username?.charAt(0).toUpperCase()}
    </div>
  );

  const wrapped = ring ? (
    <div
      className="rounded-full flex-shrink-0"
      style={{ padding: 2, border: "1.5px solid #d4af37" }}
    >
      {inner}
    </div>
  ) : inner;

  if (!user?.id) return wrapped;

  return (
    <Link to={`/profile/${user.id}`} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      {wrapped}
    </Link>
  );
}

function UsernameLink({ user, className }) {
  if (!user?.id) {
    return <span className={className}>{user?.username || "Admin"}</span>;
  }
  return (
    <Link
      to={`/profile/${user.id}`}
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      {user.username}
    </Link>
  );
}

// ─── Formatted text — preserves paragraphs/line breaks, supports **bold** and *italic*/_italic_ ──
// Mirrors the renderer used on the thread detail page so posts look the same
// in the feed as they do once opened.

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
          className="font-semibold text-[#1a5fb4] hover:underline"
          onClick={(e) => e.stopPropagation()}>
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

// ─── media lightbox — supports multiple items, arrows, keyboard, thumbnails ───

function MediaLightbox({ urls, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const total = urls.length;

  const prev = useCallback((e) => { e?.stopPropagation(); setIndex(i => (i - 1 + total) % total); }, [total]);
  const next = useCallback((e) => { e?.stopPropagation(); setIndex(i => (i + 1) % total); }, [total]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  const url = urls[index];
  const video = isVideoUrl(url);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90"
      style={{ backdropFilter: "blur(12px)", animation: "lbFadeIn 0.15s ease" }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {total > 1 && (
        <p className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-[12px] font-semibold tabular-nums">
          {index + 1} / {total}
        </p>
      )}

      <div onClick={e => e.stopPropagation()} className="max-w-[92vw] max-h-[78vh] flex items-center justify-center relative">
        {total > 1 && (
          <button onClick={prev} className="absolute -left-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 hidden sm:flex items-center justify-center text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {video
          ? <video src={url} controls autoPlay className="max-w-full max-h-[78vh] rounded-xl shadow-2xl" />
          : <img src={url} alt="" className="max-w-full max-h-[78vh] rounded-xl shadow-2xl object-contain" />
        }
        {total > 1 && (
          <button onClick={next} className="absolute -right-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 hidden sm:flex items-center justify-center text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2 mt-5 px-4 max-w-[92vw] overflow-x-auto" onClick={e => e.stopPropagation()}>
          {urls.map((u, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className="flex-shrink-0 rounded-lg overflow-hidden transition-all"
              style={{
                width: 48, height: 48,
                border: i === index ? "2px solid #d4af37" : "2px solid transparent",
                opacity: i === index ? 1 : 0.55,
              }}
            >
              {isVideoUrl(u)
                ? <video src={u} className="w-full h-full object-cover" muted />
                : <img src={u} alt="" className="w-full h-full object-cover" />
              }
            </button>
          ))}
        </div>
      )}

      <p className="absolute bottom-4 text-white/30 text-[11px] hidden sm:block">
        Esc to close · ← → to navigate
      </p>
      <style>{`@keyframes lbFadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
    </div>
  );
}

// ─── media grid — layout adapts to how many images/videos a post has ──────────

function MediaThumb({ url, className = "", style = {} }) {
  const video = isVideoUrl(url);
  return (
    <div className={`relative overflow-hidden bg-[#f0ebe3] ${className}`} style={style}>
      {video ? (
        <>
          <video src={url} className="w-full h-full object-cover" muted />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-black/45 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#d4af37] translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </>
      ) : (
        <img src={url} alt="" className="w-full h-full object-cover" />
      )}
    </div>
  );
}

function MediaGrid({ urls }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  if (!urls || urls.length === 0) return null;

  const open = (i) => (e) => { e.stopPropagation(); setLightboxIndex(i); };
  const wrap = "mt-3 rounded-xl overflow-hidden border border-[#e8e0d0]";

  let body;
  if (urls.length === 1) {
    // Single image: let it display at its natural aspect ratio instead of
    // cropping into a fixed short box — the old 360px cap chopped tall
    // images on desktop. object-contain + a generous, viewport-relative
    // cap gives a full, uncropped view on any screen size.
    const single = urls[0];
    const video = isVideoUrl(single);
    body = (
      <div className={`${wrap} cursor-zoom-in bg-[#f0ebe3] flex items-center justify-center`} onClick={open(0)}>
        {video ? (
          <video src={single} className="w-full h-auto" style={{ maxHeight: "min(70vh, 620px)" }} muted />
        ) : (
          <img
            src={single}
            alt=""
            className="w-full h-auto object-contain"
            style={{ maxHeight: "min(70vh, 620px)" }}
          />
        )}
      </div>
    );
  } else if (urls.length === 2) {
    body = (
      <div className={`${wrap} grid grid-cols-2 gap-0.5`} style={{ height: 240 }}>
        {urls.map((u, i) => (
          <div key={i} className="cursor-zoom-in h-full" onClick={open(i)}>
            <MediaThumb url={u} className="w-full h-full" />
          </div>
        ))}
      </div>
    );
  } else if (urls.length === 3) {
    body = (
      <div className={`${wrap} grid grid-cols-3 gap-0.5`} style={{ height: 240 }}>
        <div className="col-span-2 h-full cursor-zoom-in" onClick={open(0)}>
          <MediaThumb url={urls[0]} className="w-full h-full" />
        </div>
        <div className="grid grid-rows-2 gap-0.5 h-full">
          <div className="cursor-zoom-in" onClick={open(1)}><MediaThumb url={urls[1]} className="w-full h-full" /></div>
          <div className="cursor-zoom-in" onClick={open(2)}><MediaThumb url={urls[2]} className="w-full h-full" /></div>
        </div>
      </div>
    );
  } else {
    const extra = urls.length - 4;
    body = (
      <div className={`${wrap} grid grid-cols-2 grid-rows-2 gap-0.5`} style={{ height: 280 }}>
        {urls.slice(0, 4).map((u, i) => {
          const isLast = i === 3 && extra > 0;
          return (
            <div key={i} className="relative cursor-zoom-in" onClick={open(i)}>
              <MediaThumb url={u} className="w-full h-full" />
              {isLast && (
                <div
                  className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold"
                  style={{ background: "rgba(26,26,46,0.55)", backdropFilter: "blur(2px)" }}
                >
                  +{extra} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {body}
      {lightboxIndex !== null && (
        <MediaLightbox urls={urls} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  );
}

// ─── emoji picker (kept, unchanged in spirit from the thread detail page) ─────

const EMOJI_SET = [
  "😀","😂","😅","😊","😉","😍","🥰","😘","😎","🤔",
  "😴","😭","😢","😡","🤯","🥳","😱","🙃","😇","🤗",
  "👍","👎","👏","🙌","🙏","💪","✍️","🤝","👋","✨",
  "🔥","💯","❤️","💛","💚","💙","💜","🖤","🤍","💔",
  "📚","📖","✏️","📝","💡","🎉","🎊","☕","🍵","🌙",
  "⭐","🌟","🚀","🎯","✅","❌","⏰","😬","🥲","🤩",
];

function EmojiPicker({ onSelect, onClose }) {
  const boxRef = useRef(null);
  useEffect(() => {
    function handleClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={boxRef}
      className="absolute bottom-full left-0 mb-2 z-50 w-64 bg-white border border-[#e8e0d0] rounded-xl p-2.5 overflow-y-auto"
      style={{ boxShadow: "0 8px 32px rgba(26,26,46,0.16)", maxHeight: "min(260px, 60vh)" }}
    >
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJI_SET.map((emoji, i) => (
          <button
            key={i}
            type="button"
            onMouseDown={e => { e.preventDefault(); onSelect(emoji); }}
            className="w-7 h-7 flex items-center justify-center text-[16px] rounded-md hover:bg-[#f4f1ec] transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── media preview strip inside the compose box ────────────────────────────────

const MAX_MEDIA = 5;

function MediaPreviewStrip({ files, onRemove }) {
  if (!files || files.length === 0) return null;
  return (
    <div className="flex items-center gap-2 py-2.5 border-t border-[#f4f1ec] flex-wrap">
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
      {files.length < MAX_MEDIA && (
        <p className="text-[10px] text-[#c8b89a] ml-1">{files.length}/{MAX_MEDIA}</p>
      )}
    </div>
  );
}

// ─── compose box (top of feed) ─────────────────────────────────────────────────

function ComposeBox({ user, tags, onSubmit }) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue]       = useState("");
  const [title, setTitle]       = useState("");
  const [tag, setTag]           = useState(null);
  const [files, setFiles]       = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  const textRef = useRef(null);
  const fileRef = useRef(null);

  function addFiles(incoming) {
    setFiles(prev => [...prev, ...incoming].slice(0, MAX_MEDIA));
  }
  function removeFile(i) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }
  function insertEmoji(emoji) {
    const el = textRef.current;
    const start = el ? el.selectionStart : value.length;
    const end   = el ? el.selectionEnd   : value.length;
    const newValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
    setValue(newValue);
    setShowEmoji(false);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  // Wraps the current selection (or a placeholder, if nothing's selected) in
  // ** or * so the compose box supports the same bold/italic markup the
  // thread detail page renders. Mirrors threadFormPage/threadPage's toolbar.
  function wrapSelection(marker, placeholder) {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const selected = value.slice(start, end);
    const text = selected || placeholder;
    const newValue = `${value.slice(0, start)}${marker}${text}${marker}${value.slice(end)}`;
    setValue(newValue);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + text.length);
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  }

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || saving) return;
    setSaving(true); setErr("");
    try {
      await onSubmit(trimmed, tag, files.length > 0 ? files : null, title.trim());
      setValue(""); setFiles([]); setTag(null); setTitle(""); setExpanded(false);
    } catch (e) {
      setErr(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const placeholder = user?.username
    ? `What's on your mind you'd like to share, ${user.username}?`
    : "What's on your mind right now you'd love to share?";

  return (
    <div className="bg-transparent mb-2 pb-3 border-b border-[#f0ebe3]">
      <div className={expanded ? "flex items-start gap-3 pt-2" : "flex items-center gap-3 py-1.5"}>
        <Avatar user={user} size={expanded ? 38 : 34} />
        <textarea
          ref={textRef}
          value={value}
          onFocus={() => setExpanded(true)}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={expanded ? 3 : 1}
          className={`flex-1 text-[15px] text-[#1a1a2e] placeholder-[#9a8c7a] focus:outline-none resize-none bg-transparent leading-relaxed ${
            expanded ? "pt-1.5" : "py-1 overflow-hidden whitespace-nowrap text-ellipsis"
          }`}
        />
      </div>

      {expanded && (
        <>
          {/* Title — optional. If left blank, the feed/homepage/profile will
              show a short excerpt of the content in its place instead. */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title (optional)"
            maxLength={120}
            className="w-full mt-2 pb-1.5 text-[14.5px] font-bold text-[#1a1a2e] placeholder-[#c8b89a] focus:outline-none bg-transparent border-b border-[#f0ebe3] focus:border-[#d4af37] transition-colors"
          />

          {/* Tag pills — pick one tag for the post, or leave untagged */}
          <div className="flex items-center gap-2 pt-3 pb-1 flex-wrap">
            {tags.map((t) => {
              const active = tag === t;
              const s = tagStyle(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(active ? null : t)}
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all"
                  style={{
                    background: active ? s.bg : "transparent",
                    color: active ? s.text : "#9a8c7a",
                    borderColor: active ? s.text + "55" : "#e8e0d0",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <MediaPreviewStrip files={files} onRemove={removeFile} />
          {err && <p className="text-[11px] text-[#c0392b] pt-1">{err}</p>}

          <div className="flex items-center justify-between pb-2 pt-3 mt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => wrapSelection("**", "bold text")}
                title="Bold"
                className="w-6 h-6 flex items-center justify-center rounded-md text-[13px] font-bold text-[#9a8c7a] hover:bg-[#f4f1ec] hover:text-[#1a1a2e] transition-colors"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => wrapSelection("*", "italic text")}
                title="Italic"
                className="w-6 h-6 flex items-center justify-center rounded-md text-[13px] italic font-semibold text-[#9a8c7a] hover:bg-[#f4f1ec] hover:text-[#1a1a2e] transition-colors"
              >
                I
              </button>
              <span className="w-px h-4 bg-[#e8e0d0]" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmoji(s => !s)}
                  className="text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors"
                  title="Add an emoji"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h.01M15 10h.01M8.5 15a4 4 0 007 0" />
                  </svg>
                </button>
                {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
              </div>

              {/* "+" add-media button */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={files.length >= MAX_MEDIA}
                title="Add photos or video"
                className="w-6 h-6 rounded-full border border-[#c8b89a] flex items-center justify-center text-[#9a8c7a] hover:text-[#1a1a2e] hover:border-[#1a1a2e] transition-colors disabled:opacity-30"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <input
                ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
                onChange={e => { const s = Array.from(e.target.files); e.target.value = ""; addFiles(s); }}
              />
              <span className="text-[11px] text-[#c8b89a] hidden sm:inline">⌘+Enter to post</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setExpanded(false); setValue(""); setFiles([]); setTag(null); setTitle(""); }}
                className="px-3 py-2 text-[13px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || saving}
                className="px-6 py-2 bg-[#d4af37] text-[#1a1a2e] text-[13px] font-bold rounded-xl hover:bg-[#c9a42d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Sharing…" : "Share"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── three-dot edit/delete menu — shown to the post's author (or an admin) ────

function PostOptionsMenu({ thread, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm("Delete this thread? This can't be undone.")) return;
    setDeleting(true);
    try {
      await onDelete(thread.id);
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative ml-auto flex-shrink-0" ref={boxRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        title="Post options"
        className="w-7 h-7 -mr-1 rounded-full flex items-center justify-center text-[#c8b89a] hover:text-[#1a1a2e] hover:bg-[#f4f1ec] transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-8 z-20 w-36 bg-white border border-[#e8e0d0] rounded-xl overflow-hidden py-1"
          style={{ boxShadow: "0 8px 24px rgba(26,26,46,0.14)" }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(thread.id); }}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-medium text-[#2d2416] hover:bg-[#faf7f2] transition-colors text-left"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-medium text-[#c0392b] hover:bg-red-50 transition-colors text-left disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
            </svg>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── one post in the feed ──────────────────────────────────────────────────────

function PostCard({ thread, user, onToggleLike, onEditThread, onDeleteThread }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!thread.likedByMe);
  const [likes, setLikes] = useState(thread.likesCount ?? thread._count?.likes ?? 0);
  const [pop, setPop] = useState(false);
  const [busy, setBusy] = useState(false);

  const mediaUrls = parseMediaUrls(thread.mediaUrls).length > 0
    ? parseMediaUrls(thread.mediaUrls)
    : (thread.mediaUrl ? [thread.mediaUrl] : []);

  async function handleLike(e) {
    e.stopPropagation();
    if (!user || busy) return;
    setBusy(true);
    try {
      const result = await onToggleLike(thread.id);
      if (result) {
        setLiked(result.liked);
        setLikes(result.likesCount);
        if (result.liked) { setPop(true); setTimeout(() => setPop(false), 380); }
      }
    } finally {
      setBusy(false);
    }
  }

  function openThread() {
    navigate(`/threads/${thread.id}`);
  }

  const commentCount = thread.totalCommentCount ?? thread._count?.comments ?? 0;
  const isAdmin = user?.role === "ADMIN";
  const canManage = user && (String(user.id) === String(thread.author?.id) || isAdmin);

  return (
    <div
      onClick={openThread}
      className="py-5 px-1 border-b border-[#f0ebe3] cursor-pointer hover:bg-[#faf7f2]/60 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Avatar user={thread.author} size={40} ring />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <UsernameLink
              user={thread.author}
              className="text-[13.5px] font-bold text-[#1a1a2e] hover:text-[#b8860b] transition-colors"
            />
            <span className="text-[#c8b89a] text-[12px]">·</span>
            <span className="text-[12px] text-[#9a8c7a]">{timeAgo(thread.createdAt)}</span>
            {thread.tag && <TagPill tag={thread.tag} />}
            {thread.isPinned && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                style={{ color: "#b8860b", background: "#fffdf0", borderColor: "#d4af37" }}>
                Pinned
              </span>
            )}
            {canManage && (
              <PostOptionsMenu thread={thread} onEdit={onEditThread} onDelete={onDeleteThread} />
            )}
          </div>

          {thread.title && thread.title.trim() && (
            <p className="mt-1.5 text-[14.5px] font-bold text-[#1a1a2e] leading-snug">
              {thread.title.trim()}
            </p>
          )}

          <FormattedText
            content={thread.context}
            className={`${thread.title && thread.title.trim() ? "mt-1" : "mt-1.5"} text-[14px] text-[#2d2416] leading-relaxed`}
          />

          <MediaGrid urls={mediaUrls} />

          <div className="flex items-center gap-1 mt-3" onClick={e => e.stopPropagation()}>
            <button
              onClick={handleLike}
              disabled={!user || busy}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 -ml-2.5 rounded-lg text-[12.5px] font-semibold transition-colors disabled:opacity-40 ${
                liked ? "text-[#b8860b]" : "text-[#9a8c7a] hover:text-[#b8860b]"
              }`}
              style={{ transform: pop ? "scale(1.15)" : "scale(1)", transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), color 0.15s" }}
            >
              <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={liked ? 0 : 2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {likes > 0 && <span className="tabular-nums">{likes}</span>}
            </button>

            <button
              onClick={openThread}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-semibold text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {commentCount > 0 && <span className="tabular-nums">{commentCount}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── feed skeleton ──────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-5 py-5">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-start gap-3 px-1 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-[#e8e0d0] flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-32 bg-[#e8e0d0] rounded" />
            <div className="h-3 w-full bg-[#f0ebe3] rounded" />
            <div className="h-3 w-3/4 bg-[#f0ebe3] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function ThreadsFeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tags, setTags] = useState([]);
  const [activeTag, setActiveTag] = useState(null); // null = "All"
  const [sort, setSort] = useState("latest"); // "latest" | "active"
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Fetch the fixed tag list once, from the same source of truth the backend
  // validates against.
  useEffect(() => {
    fetch(`${API_URL}/threads/tags`)
      .then(r => r.ok ? r.json() : { tags: [] })
      .then(d => setTags(d.tags || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ limit: "30", sort });
      if (activeTag) params.set("tag", activeTag);
      const r = await fetch(`${API_URL}/threads?${params.toString()}`);
      if (!r.ok) throw new Error("Failed to load threads.");
      const d = await r.json();
      setThreads(d.threads || []);
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [activeTag, sort]);

  useEffect(() => { load(); }, [load]);

  async function handleCreateThread(context, tag, files, title) {
    const form = new FormData();
    form.append("context", context);
    if (tag) form.append("tag", tag);
    if (title) form.append("title", title);
    if (files && files.length > 0) {
      files.forEach((f, i) => form.append(`media_${i}`, f));
    }
    const r = await fetch(`${API_URL}/threads`, { method: "POST", credentials: "include", body: form });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.message || "Couldn't post your thread.");
    }
    const d = await r.json();
    setThreads(prev => [d.thread, ...prev]);
  }

  async function handleToggleLike(threadId) {
    if (!user) return null;
    const r = await fetch(`${API_URL}/threads/${threadId}/like`, { method: "POST", credentials: "include" });
    if (!r.ok) return null;
    return r.json();
  }

  function handleEditThread(threadId) {
    navigate(`/threads/${threadId}/edit`);
  }

  async function handleDeleteThread(threadId) {
    try {
      const r = await fetch(`${API_URL}/threads/${threadId}`, { method: "DELETE", credentials: "include" });
      if (r.ok) setThreads(prev => prev.filter(t => t.id !== threadId));
    } catch {}
  }

  return (
    <div className="bg-[#f5f3ef] min-h-screen">
      <AppMetaTags
        title="Threads"
        description="Freewrites, wins, questions, and quiet struggles — the QuillWeave community, out loud."
      />
      <div className="max-w-3xl mx-auto bg-white px-4 sm:px-6 py-6 sm:py-8 min-h-screen">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h1 className="font-serif text-[#1a1a2e] text-2xl font-bold">Threads</h1>

          {/* Sort toggle */}
          <div className="flex items-center rounded-full border border-[#e8e0d0] p-0.5 bg-white self-start sm:self-auto">
            {[{ key: "latest", label: "Latest" }, { key: "active", label: "Most Active" }].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-full transition-colors ${
                  sort === opt.key ? "bg-[#1a1a2e] text-white" : "text-[#9a8c7a] hover:text-[#1a1a2e]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tag filter bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveTag(null)}
            className={`flex-shrink-0 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
              activeTag === null
                ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                : "text-[#9a8c7a] border-[#e8e0d0] hover:border-[#1a1a2e] hover:text-[#1a1a2e]"
            }`}
          >
            All
          </button>
          {tags.map((t) => {
            const active = activeTag === t;
            const s = tagStyle(t);
            return (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className="flex-shrink-0 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  background: active ? s.text : "transparent",
                  color: active ? "#fff" : s.text,
                  borderColor: active ? s.text : s.text + "40",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Compose box */}
        {user ? (
          <ComposeBox user={user} tags={tags} onSubmit={handleCreateThread} />
        ) : (
          <div className="rounded-2xl border border-[#e8e0d0] bg-white px-5 py-4 mb-2 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[13px] text-[#6b5c4a]">Sign in to share what you're working on.</p>
            <Link to="/login" className="text-[13px] font-semibold text-[#1a5fb4] hover:underline flex-shrink-0">
              Sign in
            </Link>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <FeedSkeleton />
        ) : err ? (
          <p className="text-[13px] text-[#c0392b] py-8 text-center">{err}</p>
        ) : threads.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-[#faf7f2] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#c8b89a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-[14px] text-[#9a8c7a]">
              {activeTag ? `No threads tagged "${activeTag}" yet.` : "No threads yet — be the first to share something."}
            </p>
          </div>
        ) : (
          <div>
            {threads.map(thread => (
              <PostCard
                key={thread.id}
                thread={thread}
                user={user}
                onToggleLike={handleToggleLike}
                onEditThread={handleEditThread}
                onDeleteThread={handleDeleteThread}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}