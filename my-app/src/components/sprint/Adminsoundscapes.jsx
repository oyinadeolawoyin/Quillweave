import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";

// ─── Admin Soundscapes Page ────────────────────────────────────
// Styled to match the AdminSchedule page pattern.
// Lists all pending soundscapes. Admin can preview, approve or delete.
export default function AdminSoundscapes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [soundscapes, setSoundscapes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // soundscapeId being acted on
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (user && user.role !== "ADMIN") navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    fetchPending();
  }, []);

  async function fetchPending() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/soundscapes/pending`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSoundscapes(data.soundscapes || []);
    } catch {
      setError("Couldn't load pending soundscapes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_URL}/soundscapes/${id}/approve`, {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) setSoundscapes((prev) => prev.filter((s) => s.id !== id));
    } catch {}
    finally { setActionLoading(null); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this soundscape? This cannot be undone.")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`${API_URL}/soundscapes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setSoundscapes((prev) => prev.filter((s) => s.id !== id));
    } catch {}
    finally { setActionLoading(null); }
  }

  function togglePreview(s) {
    if (playingId === s.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      audioRef.current = new Audio(s.fileUrl);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {});
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(s.id);
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const formatDate = (str) => {
    if (!str) return "";
    return new Date(str).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">

        {/* ── Page header ── */}
        <div className="cozy-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="cozy-icon-badge">🎵</div>
            <div>
              <h1 className="font-serif text-xl text-[#2d3748]">Soundscape Review</h1>
              <p className="text-xs text-[#9a8c7a] mt-0.5">Approve or reject community submissions</p>
            </div>
          </div>
          <p className="text-sm text-[#6b5c4a] leading-relaxed mt-3">
            Writers submit ambient audio files here. Preview each one, then approve to make it available in sprints
            or delete to reject it.
          </p>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="cozy-card">
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#e8e0d0] rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[#e8e0d0] rounded w-1/2" />
                    <div className="h-3 bg-[#e8e0d0] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="cozy-card text-center py-8">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-sm text-[#6b5c4a] mb-4">{error}</p>
            <button onClick={fetchPending}
              className="px-5 py-2.5 bg-[#2d3748] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all">
              Try again
            </button>
          </div>
        ) : soundscapes.length === 0 ? (
          <div className="cozy-card text-center py-12">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-serif text-[#2d3748] text-lg mb-1">All clear</p>
            <p className="text-sm text-[#9a8c7a]">No soundscapes pending review right now.</p>
          </div>
        ) : (
          <div className="cozy-card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-base text-[#2d3748]">Pending review</h2>
              <span className="text-xs text-white bg-[#2d3748] px-2.5 py-1 rounded-full font-medium">
                {soundscapes.length} waiting
              </span>
            </div>

            <div className="space-y-4">
              {soundscapes.map((s) => {
                const isActing = actionLoading === s.id;
                const isPlaying = playingId === s.id;

                return (
                  <div key={s.id}
                    className="flex items-start gap-4 p-4 rounded-2xl border border-[#f0ebe3] bg-[#faf7f2] hover:border-[#e8e0d0] transition-all">

                    {/* Play/pause button */}
                    <button
                      onClick={() => togglePreview(s)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all ${
                        isPlaying
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-[#fdf3d8] border-[#f0d98a] text-[#2d3748]"
                      }`}
                      title={isPlaying ? "Stop preview" : "Preview sound"}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#2d3748] truncate">{s.name}</p>
                          {s.creatorName && (
                            <p className="text-xs text-[#9a8c7a]">by {s.creatorName}</p>
                          )}
                          <p className="text-xs text-[#9a8c7a] mt-0.5">
                            Submitted by @{s.contributor?.username} · {formatDate(s.createdAt)}
                          </p>
                        </div>
                        {isPlaying && (
                          <span className="flex-shrink-0 flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Playing
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleApprove(s.id)}
                          disabled={isActing}
                          className="flex-1 py-2 bg-[#2d3748] text-white text-xs font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                        >
                          {isActing ? "..." : "✓ Approve"}
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={isActing}
                          className="flex-1 py-2 border border-red-200 text-red-500 text-xs font-medium rounded-xl hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          {isActing ? "..." : "✕ Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}