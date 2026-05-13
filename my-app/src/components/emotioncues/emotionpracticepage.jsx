// src/pages/EmotionPracticePage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";

// ─── Confetti ─────────────────────────────────────────────────────────────────
function ConfettiCanvas({ active }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ["#d4af37", "#f59e0b", "#fbbf24", "#34d399", "#60a5fa", "#c084fc"];
    const particles = Array.from({ length: 110 }, () => ({
      x:    Math.random() * canvas.width,
      y:    -20 - Math.random() * 160,
      w:    5 + Math.random() * 9,
      h:    3 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx:   (Math.random() - 0.5) * 4,
      vy:   2 + Math.random() * 4,
      rot:  Math.random() * Math.PI * 2,
      drot: (Math.random() - 0.5) * 0.2,
      life: 1,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.07;
        p.rot += p.drot; p.life = Math.max(0, p.life - 0.007);
        if (p.y < canvas.height + 30) alive = true;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" style={{ width: "100vw", height: "100vh" }} />;
}

// ─── Tada overlay ─────────────────────────────────────────────────────────────
function TadaOverlay({ visible, onDone }) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible) return null;
  return (
    <>
      <ConfettiCanvas active={visible} />
      <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
        <div
          className="bg-[#1a2033] rounded-3xl px-10 py-8 text-center"
          style={{
            border: "1px solid rgba(212,175,55,0.4)",
            boxShadow: "0 0 0 1px rgba(212,175,55,0.1), 0 32px 80px rgba(0,0,0,0.5)",
            animation: "tada-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#d4af37,#c09a28)", boxShadow: "0 8px 24px rgba(212,175,55,0.4)" }}
          >
            <svg className="w-7 h-7 text-[#12181f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-serif text-2xl text-white font-bold mb-1">+1 Point Earned</p>
          <p className="text-white/50 text-sm">Your sentence is now in the community.</p>
          <p className="text-[#d4af37] text-xs font-bold tracking-widest uppercase mt-3">Posting balance +1</p>
        </div>
      </div>
      <style>{`
        @keyframes tada-pop {
          0%   { opacity: 0; transform: scale(0.65) translateY(24px); }
          100% { opacity: 1; transform: scale(1)    translateY(0px);  }
        }
      `}</style>
    </>
  );
}

// ─── Comment card ─────────────────────────────────────────────────────────────
function CommentCard({ comment, currentUserId }) {
  const navigate = useNavigate();
  const [liked,  setLiked]  = useState(comment.userHasLiked ?? false);
  const [count,  setCount]  = useState(comment.likeCount    ?? 0);
  const [liking, setLiking] = useState(false);

  async function handleLike() {
    if (!currentUserId || liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked); setCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      const res = await fetch(`${API_URL}/emotions/comments/${comment.id}/like`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) { const d = await res.json(); setLiked(d.liked); setCount(d.likeCount); }
      else        { setLiked(wasLiked); setCount((c) => wasLiked ? c + 1 : c - 1); }
    } catch      { setLiked(wasLiked); setCount((c) => wasLiked ? c + 1 : c - 1); }
    finally      { setLiking(false); }
  }

  const isOwn = comment.author?.id != null && currentUserId != null
    && String(comment.author.id) === String(currentUserId);
  const displayName = isOwn ? "You" : (comment.author?.username ?? "[deleted]");
  const canNavigate = !isOwn && comment.author?.id;

  return (
    <div
      className="rounded-2xl px-4 py-4 transition-all"
      style={{
        background: comment.isPinned
          ? "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.04))"
          : "rgba(255,255,255,0.04)",
        border: comment.isPinned
          ? "1px solid rgba(212,175,55,0.25)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {comment.isPinned && (
        <p className="text-[10px] text-[#d4af37] font-bold uppercase tracking-widest mb-2">
          Featured
        </p>
      )}
      <p className="text-white text-sm leading-relaxed mb-3" style={{ fontFamily: "inherit" }}>
        "{comment.content}"
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {comment.author?.avatar ? (
            <img src={comment.author.avatar} alt={comment.author.username}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-[9px] font-bold text-white/70">
              {(comment.author?.username?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          {canNavigate ? (
            <button
              onClick={() => navigate(`/profile/${comment.author.username}`)}
              className="text-[11px] text-white/80 hover:text-white transition-colors hover:underline underline-offset-2"
            >
              {displayName}
            </button>
          ) : (
            <span className="text-[11px] text-white/80">{displayName}</span>
          )}
          <span className="text-white/30 text-[10px]">·</span>
          <span className="text-[11px] text-white/60">
            {new Date(comment.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        </div>
        <button
          onClick={handleLike}
          disabled={!currentUserId || liking}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all disabled:opacity-30"
          style={
            liked
              ? { background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" }
              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }
          }
        >
          <svg className="w-3 h-3" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {count}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const MIN_CHARS = 20;

export default function EmotionPracticePage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  // Entry — public data (emotion, cues, counts)
  const [entry,      setEntry]      = useState(null);
  const [isLoading,  setIsLoading]  = useState(true);

  // Comments — loaded separately on an authenticated route
  const [commentsData,    setCommentsData]    = useState(null); // { comments, userHasCommented, userComment }
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [draft,      setDraft]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);
  const [showTada,   setShowTada]   = useState(false);
  const [editMode,   setEditMode]   = useState(false);
  const [editDraft,  setEditDraft]  = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [visible,    setVisible]    = useState(false);
  const textareaRef = useRef(null);

  // ── Fetch entry (public, no auth needed) ─────────────────────────────────
  const fetchEntry = useCallback(async () => {
    setIsLoading(true);
    try {
      const res  = await fetch(`${API_URL}/emotions/today`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntry(data);
    } catch { setEntry(null); }
    finally  { setIsLoading(false); }
  }, []);

  // ── Fetch comments (authenticated — only when user + entryId are known) ──
  const fetchComments = useCallback(async (entryId) => {
    if (!entryId) return;
    setCommentsLoading(true);
    try {
      const res  = await fetch(`${API_URL}/emotions/${entryId}/comments`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCommentsData(data);
    } catch { setCommentsData(null); }
    finally  { setCommentsLoading(false); }
  }, []);

  // Load entry once on mount
  useEffect(() => { fetchEntry(); }, [fetchEntry]);

  // Load comments once entry is loaded AND user is known
  useEffect(() => {
    if (entry?.id && user) {
      fetchComments(entry.id);
    } else if (!user) {
      // Guest — clear any stale comment data
      setCommentsData(null);
    }
  }, [entry?.id, user, fetchComments]);

  // Staggered entrance animation
  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setVisible(true), 60);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  async function handleSubmit() {
    if (!user) { navigate("/login"); return; }
    const trimmed = draft.trim();
    if (trimmed.length < MIN_CHARS) {
      setError(`Your sentence needs at least ${MIN_CHARS} characters.`);
      textareaRef.current?.focus();
      return;
    }
    setError(null); setSubmitting(true);
    try {
      const res  = await fetch(`${API_URL}/emotions/${entry.id}/comments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Something went wrong."); return; }
      setShowTada(!!data.pointAwarded);
      setDraft("");
      await fetchComments(entry.id);
    } catch { setError("Could not submit. Please try again."); }
    finally  { setSubmitting(false); }
  }

  async function handleEdit() {
    const trimmed = editDraft.trim();
    if (trimmed.length < MIN_CHARS) { setError(`At least ${MIN_CHARS} characters required.`); return; }
    setError(null); setEditSaving(true);
    try {
      const res = await fetch(`${API_URL}/emotions/comments/${commentsData?.userComment?.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.message ?? "Could not save."); return; }
      setEditMode(false);
      await fetchComments(entry.id);
    } catch { setError("Could not save. Please try again."); }
    finally  { setEditSaving(false); }
  }

  function startEdit() {
    setEditDraft(commentsData?.userComment?.content ?? "");
    setEditMode(true); setError(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: "#0f1422" }}>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="space-y-3 text-center animate-pulse">
            <div className="h-5 bg-white/10 rounded w-32 mx-auto" />
            <div className="h-12 bg-white/10 rounded w-56 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen" style={{ background: "#0f1422" }}>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center">
            <p className="font-serif text-2xl text-white mb-2">Nothing scheduled yet</p>
            <p className="text-white/40 text-sm mb-6">Today's emotion cue hasn't been published. Check back soon.</p>
            <button onClick={() => navigate(-1)} className="text-sm text-[#d4af37] hover:underline">
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Derive comment state from the separately-fetched commentsData
  const hasCommented  = commentsData?.userHasCommented ?? false;
  const allComments   = commentsData?.comments ?? [];
  const charCount     = draft.trim().length;
  const readyToPost   = charCount >= MIN_CHARS;
  const editCharCount = editDraft.trim().length;

  const myUserId = user?.id != null ? String(user.id) : null;
  const pinned   = allComments.filter((c) => c.isPinned);
  const myCard   = !hasCommented ? null :
    allComments.find((c) => String(c.author?.id) === myUserId) ??
    (commentsData?.userComment
      ? { ...commentsData.userComment, author: { id: user?.id, username: user?.username, avatar: user?.avatar }, userHasLiked: false }
      : null);
  const others   = allComments.filter((c) => !c.isPinned && String(c.author?.id) !== myUserId);

  const allCues = entry.cues ?? [];

  return (
    <div className="min-h-screen" style={{ background: "#0f1422" }}>
      <TadaOverlay visible={showTada} onDone={() => setShowTada(false)} />
      <Header />

      {/* ── Hero section ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #141c30 0%, #1a2540 50%, #1e2d4a 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize:  "28px 28px",
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%)" }}
        />

        <div
          className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(18px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <p
            className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#d4af37] mb-4"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease 0.1s" }}
          >
            Today's Emotion
          </p>

          <h1
            className="font-serif font-bold text-white mb-6"
            style={{
              fontSize: "clamp(2.8rem, 8vw, 5rem)",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
            }}
          >
            {entry.emotion}
          </h1>

          <div
            className="mx-auto mb-6"
            style={{
              width: 60, height: 2,
              background: "linear-gradient(90deg, transparent, #d4af37, transparent)",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.5s ease 0.3s",
            }}
          />

          <p
            className="text-white/70 text-sm"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease 0.35s" }}
          >
            {hasCommented
              ? "You've written your sentence today. Edit it below or read the community."
              : "Study the cues below. Write one sentence that captures this feeling."}
          </p>

          {!hasCommented && (
            <div
              className="mt-8 flex flex-col items-center gap-1"
              style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease 0.45s" }}
            >
              <p className="text-[11px] text-[#d4af37] font-semibold tracking-widest uppercase">Write now</p>
              <svg
                className="w-5 h-5 text-[#d4af37]"
                style={{ animation: "bounce-gentle 1.8s ease-in-out infinite" }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── Cues grid ─────────────────────────────────────────── */}
        {allCues.length > 0 && (
          <section
            style={{
              opacity:   visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#d4af37] flex-shrink-0">
                Body Language Cues
              </p>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
              <span className="text-[10px] text-white/50">{allCues.length} cues</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allCues.map((cue, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(8px)",
                    transition: `opacity 0.4s ease ${0.25 + i * 0.018}s, transform 0.4s ease ${0.25 + i * 0.018}s`,
                  }}
                >
                  <span style={{ color: "#d4af37", fontSize: 10, marginTop: 3, flexShrink: 0 }}>—</span>
                  <span className="text-white/90 leading-snug" style={{ fontSize: 12 }}>{cue}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Write / Edit box ──────────────────────────────────── */}
        <section
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease 0.35s, transform 0.6s ease 0.35s",
          }}
        >
          {!user ? (
            /* Guest CTA */
            <div
              className="rounded-3xl px-6 py-10 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.03))",
                border: "1px solid rgba(212,175,55,0.2)",
              }}
            >
              <p className="font-serif text-xl text-white mb-1">Ready to practise?</p>
              <p className="text-white/40 text-sm mb-6">Sign in to write your sentence and earn a posting point.</p>
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #d4af37, #c09a28)",
                  color: "#12181f",
                  boxShadow: "0 4px 20px rgba(212,175,55,0.35)",
                }}
              >
                Sign in to practice
              </button>
            </div>

          ) : hasCommented && !editMode ? (
            /* Already submitted */
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.07), rgba(212,175,55,0.03))",
                border: "1px solid rgba(212,175,55,0.2)",
              }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "rgba(212,175,55,0.12)" }}
              >
                <p className="text-xs font-bold text-[#4ade80] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Your sentence is in the community
                </p>
                <button
                  onClick={startEdit}
                  className="text-xs text-[#d4af37] hover:text-[#f0cc55] transition-colors underline underline-offset-2"
                >
                  Edit
                </button>
              </div>
              <div className="px-5 py-5">
                {commentsData?.userComment?.content ? (
                  <p className="text-white text-sm leading-relaxed" style={{ fontFamily: "inherit" }}>
                    "{commentsData.userComment.content}"
                  </p>
                ) : (
                  <p className="text-white/60 text-sm italic">
                    Your sentence was saved — find it below in the community.
                  </p>
                )}
              </div>
            </div>

          ) : (
            /* Textarea — new or edit */
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #16203a 0%, #1a2540 100%)",
                border: "1px solid rgba(212,175,55,0.25)",
                boxShadow: "0 0 0 1px rgba(212,175,55,0.05), 0 12px 40px rgba(0,0,0,0.3)",
              }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#d4af37]">
                  {editMode ? "Edit your sentence" : "Write your practice sentence"}
                </p>
                {editMode && (
                  <button
                    onClick={() => { setEditMode(false); setError(null); }}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="px-5 py-4">
                <textarea
                  ref={textareaRef}
                  value={editMode ? editDraft : draft}
                  onChange={(e) => {
                    if (editMode) setEditDraft(e.target.value);
                    else setDraft(e.target.value);
                    setError(null);
                  }}
                  placeholder={`Write one sentence about "${entry.emotion}"…`}
                  rows={4}
                  className="w-full resize-none text-white text-sm leading-relaxed placeholder-white/40 outline-none bg-transparent"
                  style={{ caretColor: "#d4af37" }}
                />
              </div>

              {error && (
                <p className="px-5 pb-3 text-xs text-red-400">{error}</p>
              )}

              <div
                className="px-5 pb-5 pt-2 flex items-center justify-between border-t"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <span
                  className="text-xs font-semibold transition-colors"
                  style={{ color: (editMode ? editCharCount : charCount) >= MIN_CHARS ? "#4ade80" : "rgba(255,255,255,0.4)" }}
                >
                  {editMode ? editCharCount : charCount} / {MIN_CHARS}+ chars
                </span>

                <button
                  onClick={editMode ? handleEdit : handleSubmit}
                  disabled={editMode
                    ? (editSaving || editCharCount < MIN_CHARS)
                    : (submitting || !readyToPost)
                  }
                  className="px-7 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={
                    (editMode ? editCharCount >= MIN_CHARS : readyToPost)
                      ? {
                          background: "linear-gradient(135deg, #d4af37, #c09a28)",
                          color: "#12181f",
                          boxShadow: "0 4px 20px rgba(212,175,55,0.4)",
                        }
                      : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.25)" }
                  }
                >
                  {editMode
                    ? (editSaving  ? "Saving…"  : "Save changes")
                    : (submitting  ? "Posting…" : "Post sentence")}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Community sentences ────────────────────────────────── */}
        {commentsLoading && (
          <div className="space-y-3">
            {[1,2].map((i) => (
              <div key={i} className="rounded-2xl px-4 py-4 animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="h-3 bg-white/10 rounded w-3/4 mb-3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!commentsLoading && allComments.length > 0 && (
          <section
            style={{
              opacity:   visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.6s ease 0.45s, transform 0.6s ease 0.45s",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/70 flex-shrink-0">
                Community sentences
              </p>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
              <span className="text-[10px] text-white/50">{allComments.length}</span>
            </div>

            <div className="space-y-3">
              {pinned.map((c) => <CommentCard key={c.id} comment={c} currentUserId={user?.id} />)}

              {myCard && !myCard.isPinned && (
                <div className="relative pl-3">
                  <div
                    className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                    style={{ background: "linear-gradient(180deg, #d4af37, transparent)" }}
                  />
                  <CommentCard key={myCard.id} comment={myCard} currentUserId={user?.id} />
                </div>
              )}

              {others.map((c) => <CommentCard key={c.id} comment={c} currentUserId={user?.id} />)}
            </div>
          </section>
        )}

        {!commentsLoading && user && allComments.length === 0 && (
          <div
            className="text-center py-12"
            style={{
              opacity: visible ? 1 : 0,
              transition: "opacity 0.5s ease 0.5s",
            }}
          >
            <p className="font-serif text-white italic text-lg">Be the first to write today.</p>
            <p className="text-white/70 text-sm mt-1">Your sentence starts the conversation.</p>
          </div>
        )}

        <p className="text-center text-[10px] text-white/60 pt-4 tracking-widest uppercase pb-8">
          A quiet space for writers · Inkwell
        </p>
      </main>

      <style>{`
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
      `}</style>
    </div>
  );
}