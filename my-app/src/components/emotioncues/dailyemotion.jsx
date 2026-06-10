// src/components/emotion/DailyEmotion.jsx
// Changes:
//  - Fetches /emotions/:entryId/comments (authenticated) after the public entry loads
//  - Shows commentCount from the live comments fetch
//  - If commentCount > 1: shows up to 2 community sentences (previews)
//  - If commentCount === 1: shows the single sentence but hides the count badge
//  - If commentCount === 0: hides community section entirely

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";

export default function DailyEmotion() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [entry,        setEntry]        = useState(null);
  const [comments,     setComments]     = useState([]);    // full comment list
  const [isLiked,      setIsLiked]      = useState(false);
  const [likeCount,    setLikeCount]    = useState(0);
  const [alreadyWrote, setAlreadyWrote] = useState(false);
  const [isLoading,    setIsLoading]    = useState(true);
  const [liking,       setLiking]       = useState(false);

  useEffect(() => { fetchEntry(); }, []);

  async function fetchEntry() {
    try {
      const res  = await fetch(`${API_URL}/emotions/today`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntry(data);
      setIsLiked(data.userHasLiked ?? false);
      setLikeCount(data.likeCount  ?? 0);

      // Once we have the entry, fetch comments (requires auth).
      // Only attempt when logged in — guests see no sentence previews.
      if (user && data.id) {
        fetchComments(data.id);
      }
    } catch {
      setEntry(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchComments(entryId) {
    try {
      const res = await fetch(`${API_URL}/emotions/${entryId}/comments`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();

      // data shape: { userHasCommented, userComment, comments: [...] }
      setComments(data.comments ?? []);
      setAlreadyWrote(data.userHasCommented ?? false);
    } catch {
      // Silently ignore — comment section just won't show
    }
  }

  async function handleLike() {
    if (!user)  { navigate("/login"); return; }
    if (liking) return;
    setLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      const res = await fetch(`${API_URL}/emotions/${entry.id}/like`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.liked);
        setLikeCount(data.likeCount);
      } else {
        setIsLiked(wasLiked);
        setLikeCount((c) => wasLiked ? c + 1 : c - 1);
      }
    } catch {
      setIsLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
    } finally {
      setLiking(false);
    }
  }

  // ── Loading skeleton ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-3xl overflow-hidden animate-pulse" style={{ background: "#1a1a2e", minHeight: 240 }}>
        <div className="px-7 pt-7 pb-6">
          <div className="h-3 bg-white/10 rounded w-1/4 mb-4" />
          <div className="h-9 bg-white/10 rounded w-1/2 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-9 bg-white/10 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="rounded-3xl px-7 py-10 text-center" style={{ background: "#1a1a2e" }}>
        <p className="text-white/40 text-sm italic">Today's emotion cue will appear here shortly.</p>
      </div>
    );
  }

  const commentCount = comments.length;

  // Show exactly 6 cues on homepage
  const previewCues = (entry.cues ?? []).slice(0, 6);

  // Show sentence count whenever there are any
  const showCountBadge = commentCount > 0;

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(140deg, #1a1a2e 0%, #1e2240 55%, #1a5fb4 100%)",
        boxShadow:  "0 2px 4px rgba(0,0,0,0.08), 0 24px 64px rgba(10,15,30,0.28)",
      }}
    >
      {/* Dot-grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize:  "24px 24px",
        }}
      />

      {/* Gold top border */}
      <div
        className="absolute top-0 left-8 right-8 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #d4af37 40%, #d4af37 60%, transparent)" }}
      />

      <div className="relative z-10 px-6 sm:px-8 pt-7 pb-6">

        {/* Label row + like button */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#d4af37] mb-0.5">
              Today's Emotion Cue For Show, Don't Tell
            </p>
            <p className="text-[11px] text-white/30 tracking-wide">
              Write a sentence · earn a posting point
            </p>
          </div>

          <button
            onClick={handleLike}
            disabled={liking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold"
            style={
              isLiked
                ? { background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.5)", color: "#d4af37" }
                : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
            }
          >
            <svg
              className="w-3.5 h-3.5"
              style={{ transform: isLiked ? "scale(1.2)" : "scale(1)", transition: "transform 0.15s" }}
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {likeCount}
          </button>
        </div>

        {/* Emotion name */}
        <h2
          className="font-serif font-bold text-white mb-5"
          style={{ fontSize: "clamp(2rem, 5vw, 2.75rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
        >
          {entry.emotion}
        </h2>

        {/* Cues grid */}
        {previewCues.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {previewCues.map((cue, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ color: "#d4af37", fontSize: 10, marginTop: 2, flexShrink: 0 }}>—</span>
                <span className="text-white leading-snug" style={{ fontSize: 11 }}>{cue}</span>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="mb-5 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />



        {/* Footer */}
        <div className="flex items-center gap-4">
          {/* Sentence count — only show when > 1 */}
          {showCountBadge && (
            <span className="text-[11px] text-white/50 flex items-center gap-1.5 flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {commentCount} sentences
            </span>
          )}

          <button
            onClick={() => navigate("/emotions/practice")}
            className="ml-auto flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={
              alreadyWrote
                ? {
                    background: "rgba(74,222,128,0.12)",
                    border: "1px solid rgba(74,222,128,0.3)",
                    color: "#4ade80",
                  }
                : {
                    background: "linear-gradient(135deg, #d4af37 0%, #c09a28 100%)",
                    color: "#12181f",
                    boxShadow: "0 4px 22px rgba(212,175,55,0.4), 0 1px 0 rgba(255,255,255,0.15) inset",
                  }
            }
          >
            {alreadyWrote ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Practiced — View
              </>
            ) : (
              <>
                Practice now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}