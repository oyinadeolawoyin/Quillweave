import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";

// ─── Contribute Soundscape Section ────────────────────────────
// Shown on homepage. Invites writers (and guests) to contribute
// ambient audio to the community soundscape library.
export default function ContributeSoundscape() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* ── Teaser card on homepage ── */}
      <div className="cozy-card overflow-hidden relative">
        {/* Subtle background accent */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 24px, #8B6914 25px)" }}
        />

        <div className="relative flex items-start gap-4 mb-5">
          <div className="cozy-icon-badge text-xl flex-shrink-0">🎵</div>
          <div>
            <h2 className="font-serif text-base text-[#2d3748] leading-tight">
              Share a sound with the community
            </h2>
            <p className="text-xs text-[#9a8c7a] mt-0.5">
              Community soundscapes · free to use during sprints
            </p>
          </div>
        </div>

        <p className="text-sm text-[#6b5c4a] leading-relaxed mb-5">
          Got an ambient sound that helps you write? Share it.
          Every approved track goes into the library for all writers to use during their sprints.
        </p>

        {user ? (
          <button
            onClick={() => setIsOpen(true)}
            className="w-full py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all"
          >
            Contribute a soundscape 🎵
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => navigate("/signup")}
              className="w-full py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] transition-all"
            >
              Join to contribute a sound
            </button>
            <p className="text-center text-xs text-[#9a8c7a]">
              Already a member?{" "}
              <button onClick={() => navigate("/login")} className="underline hover:text-[#2d3748] transition-colors">
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>

      {/* ── Contribute Modal ── */}
      {isOpen && <ContributeModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

// ─── Contribute Modal ─────────────────────────────────────────
function ContributeModal({ onClose }) {
  const [name, setName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Please give your soundscape a name."); return; }
    if (!file) { setError("Please choose an audio file."); return; }

    const formData = new FormData();
    formData.append("name", name.trim());
    if (creatorName.trim()) formData.append("creatorName", creatorName.trim());
    formData.append("audio", file); // field name must match multer config

    setSubmitting(true); setError("");
    try {
      const res = await fetch(`${API_URL}/soundscapes`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Couldn't reach the server. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d3748]/50 backdrop-blur-sm">
      <div className="bg-[#fffdf8] rounded-3xl shadow-2xl w-full max-w-sm border border-[#e8e0d0] overflow-hidden">
        <div className="bg-[#2d3748] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#d4af37] uppercase tracking-widest font-medium mb-0.5">Community library</p>
            <h2 className="text-xl font-serif text-white">Contribute a sound</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <p className="text-5xl mb-4">🎵</p>
            <h3 className="font-serif text-[#2d3748] text-lg mb-2">Submitted — thank you!</h3>
            <p className="text-sm text-[#6b5c4a] leading-relaxed mb-6">
              Your soundscape has been sent for review. Once an admin approves it, it'll appear in the library for all writers to use.
            </p>
            <button onClick={onClose}
              className="w-full py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:opacity-90 transition-all">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-[#9a8c7a] leading-relaxed">
              Upload an ambient audio file (MP3, WAV, OGG). It'll go into pending review before going live.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#2d3748] mb-1.5">
                Soundscape name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rainy café window"
                maxLength={60}
                className="w-full px-4 py-3 border border-[#e8e0d0] rounded-xl text-sm text-[#2d3748] focus:outline-none focus:border-[#2d3748] transition-colors bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2d3748] mb-1.5">
                Creator / source <span className="text-[#9a8c7a] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g. Free Music Archive"
                maxLength={80}
                className="w-full px-4 py-3 border border-[#e8e0d0] rounded-xl text-sm text-[#2d3748] focus:outline-none focus:border-[#2d3748] transition-colors bg-white"
              />
              <p className="text-[10px] text-[#9a8c7a] mt-1">Credit the original creator if it isn't yours.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#2d3748] mb-1.5">
                Audio file <span className="text-red-400">*</span>
              </label>
              <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                file ? "border-[#d4af37] bg-amber-50" : "border-[#e8e0d0] hover:border-[#2d3748] bg-white"
              }`}>
                <span className="text-xl">{file ? "🎵" : "📁"}</span>
                <div className="min-w-0">
                  <p className="text-sm text-[#2d3748] font-medium truncate">
                    {file ? file.name : "Choose an audio file"}
                  </p>
                  <p className="text-[10px] text-[#9a8c7a]">MP3, WAV or OGG · max 20 MB</p>
                </div>
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/ogg,audio/*"
                  className="hidden"
                  onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); }}
                />
              </label>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="px-4 py-3 border border-[#e8e0d0] text-[#6b5c4a] text-sm rounded-xl hover:border-[#2d3748] transition-all">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 bg-[#2d3748] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </>
                ) : "Submit for review 🎵"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}