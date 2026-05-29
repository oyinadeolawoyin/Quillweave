import { useState, useEffect, useRef } from "react";
import API_URL from "@/config/api";
import Header from "../profile/header";

// ── Emotion icons mapped by keyword ──────────────────────────────────────────
function getEmotionIcon(emotion = "") {
  const e = emotion.toLowerCase();
  if (e.includes("joy") || e.includes("happy"))      return "😊";
  if (e.includes("sad") || e.includes("grief"))       return "💧";
  if (e.includes("anger") || e.includes("rage"))      return "🔥";
  if (e.includes("fear") || e.includes("anxious"))    return "🌊";
  if (e.includes("surprise") || e.includes("awe"))    return "✨";
  if (e.includes("disgust"))                           return "🌿";
  if (e.includes("love") || e.includes("tender"))     return "💛";
  if (e.includes("shame") || e.includes("guilt"))     return "🌑";
  if (e.includes("pride"))                             return "🌟";
  if (e.includes("envy") || e.includes("jealous"))    return "🌿";
  if (e.includes("hope"))                              return "🌤";
  if (e.includes("loneli") || e.includes("alone"))    return "🕊";
  if (e.includes("excite") || e.includes("thrill"))   return "⚡";
  if (e.includes("calm") || e.includes("peace"))      return "🌙";
  if (e.includes("nostalg"))                           return "📖";
  if (e.includes("confus") || e.includes("perplex"))  return "🌀";
  if (e.includes("bore"))                              return "🪨";
  if (e.includes("gratitude") || e.includes("thank")) return "🌸";
  if (e.includes("trust"))                             return "🤝";
  if (e.includes("antici"))                            return "🎯";
  return "💭";
}

// ── Cue card ─────────────────────────────────────────────────────────────────
function CueCard({ cue, index }) {
  return (
    <div className="cue-card" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="cue-index">#{index + 1}</div>
      <p className="cue-text">{cue}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ThesaurusPage() {
  const [emotions, setEmotions]       = useState([]);
  const [selected, setSelected]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [searchTerm, setSearchTerm]   = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    async function fetchEmotions() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/emotions`);
        if (!res.ok) throw new Error("Failed to fetch emotions");
        const data = await res.json();
        setEmotions(data.emotions || []);
        if (data.emotions?.length) setSelected(data.emotions[0]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEmotions();
  }, []);

  const filtered = emotions.filter(e =>
    e.emotion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleSelect(emotion) {
    setSelected(emotion);
    setSidebarOpen(false);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="thesaurus-root">
      <Header />
      <div className="thesaurus-loading">
        <div className="loading-spinner" />
        <p>Loading emotion library…</p>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="thesaurus-root">
      <Header />
      <div className="thesaurus-error">
        <span className="error-icon">⚠</span>
        <p>{error}</p>
      </div>
    </div>
  );

  const cues = selected?.cues ?? [];
  const currentIndex = emotions.indexOf(selected);

  return (
    <div className="thesaurus-root">
      <Header />

      {/* Mobile FAB */}
      <button
        className="sidebar-fab"
        onClick={() => setSidebarOpen(o => !o)}
        aria-label="Toggle emotion list"
      >
        {sidebarOpen ? "✕" : "≡"}
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="thesaurus-body">

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside className={`thesaurus-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>

          {/* Pinned header */}
          <div className="sidebar-header">
            <h2 className="sidebar-title">Emotion Library</h2>
            <span className="sidebar-count">{emotions.length} emotions</span>
          </div>

          {/* Pinned search */}
          <div className="sidebar-search-wrap">
            <svg className="sidebar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className="sidebar-search"
              placeholder="Search emotions…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="sidebar-search-clear" onClick={() => setSearchTerm("")}>✕</button>
            )}
          </div>

          {/* Scrollable nav list */}
          <nav className="sidebar-nav">
            {filtered.length === 0 && (
              <p className="sidebar-empty">No emotions match "{searchTerm}"</p>
            )}
            {filtered.map((emotion) => (
              <button
                key={emotion.id}
                className={`sidebar-item ${selected?.id === emotion.id ? "sidebar-item-active" : ""}`}
                onClick={() => handleSelect(emotion)}
              >
                <span className="sidebar-item-icon">{getEmotionIcon(emotion.emotion)}</span>
                <span className="sidebar-item-label">{emotion.emotion}</span>
                <span className="sidebar-item-count">{emotion.cues?.length ?? 0}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main ──────────────────────────────────────────────────────── */}
        <main className="thesaurus-main" ref={mainRef}>

          {selected ? (
            <>
              <div className="emotion-hero">
                <div className="emotion-hero-icon">{getEmotionIcon(selected.emotion)}</div>
                <div className="emotion-hero-text">
                  <h1 className="emotion-title">{selected.emotion}</h1>
                  <p className="emotion-subtitle">
                    {cues.length} {cues.length === 1 ? "expression cue" : "expression cues"}
                  </p>
                </div>
              </div>

              <div className="emotion-divider">
                <div className="divider-line" />
                <span className="divider-label">WRITING CUES</span>
                <div className="divider-line" />
              </div>

              {cues.length > 0 ? (
                <div className="cues-grid">
                  {cues.map((cue, i) => (
                    <CueCard key={i} cue={cue} index={i} />
                  ))}
                </div>
              ) : (
                <div className="cues-empty">
                  <span>📭</span>
                  <p>No cues available for this emotion yet.</p>
                </div>
              )}

              <div className="emotion-pagination">
                <button
                  className="page-btn"
                  disabled={currentIndex === 0}
                  onClick={() => handleSelect(emotions[currentIndex - 1])}
                >
                  ← Previous emotion
                </button>
                <span className="page-indicator">
                  {currentIndex + 1} / {emotions.length}
                </span>
                <button
                  className="page-btn"
                  disabled={currentIndex === emotions.length - 1}
                  onClick={() => handleSelect(emotions[currentIndex + 1])}
                >
                  Next emotion →
                </button>
              </div>
            </>
          ) : (
            <div className="thesaurus-empty-state">
              <span>📚</span>
              <p>Select an emotion from the sidebar to explore its writing cues.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}