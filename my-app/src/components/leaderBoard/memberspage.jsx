// src/components/members/MembersPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../profile/header";
import API_URL from "@/config/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function Avatar({ src, username, size = 36 }) {
  const initials = (username || "?")[0].toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={username}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[#1a1a2e] bg-[#d4af37]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

function ReputationBadge({ rep }) {
  if (rep == null) return null;
  let label = "Newcomer";
  let color = "#9a8c7a";
  if (rep >= 100) { label = "Legend"; color = "#d4af37"; }
  else if (rep >= 50) { label = "Scholar"; color = "#1a5fb4"; }
  else if (rep >= 20) { label = "Contributor"; color = "#059669"; }
  else if (rep >= 10) { label = "Regular"; color = "#7c3aed"; }
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{ color, background: color + "18" }}
    >
      {label}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LeaderRow({ rank, user, stat, statLabel }) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <Link
      to={`/profile/${user?.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f0ead8] transition-colors group"
    >
      <span className="w-6 text-center text-base flex-shrink-0">
        {medals[rank] || <span className="text-[11px] text-[#9a8c7a] font-bold">{rank}</span>}
      </span>
      <Avatar src={user?.avatar} username={user?.username} size={34} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1a1a2e] truncate group-hover:text-[#1a5fb4] transition-colors">
          @{user?.username}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[15px] font-bold text-[#d4af37]">{stat}</p>
        <p className="text-[9px] text-[#9a8c7a] uppercase tracking-wide">{statLabel}</p>
      </div>
    </Link>
  );
}

function LeaderboardCard({ title, icon, color, rows, emptyMsg }) {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-[#f0ead8]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{icon}</span>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
            All-Time Best
          </p>
        </div>
        <h3 className="font-serif text-[#1a1a2e] text-[17px] font-bold leading-tight">{title}</h3>
      </div>
      <div className="p-3 space-y-0.5">
        {rows.length === 0 ? (
          <p className="text-[12px] text-[#9a8c7a] text-center py-6">{emptyMsg}</p>
        ) : (
          rows.map((r) => (
            <LeaderRow
              key={r.user?.id}
              rank={r.rank}
              user={r.user}
              stat={r.critiqueCount ?? r.sprintCount ?? r.practiceCount ?? 0}
              statLabel={r.critiqueCount != null ? "critiques" : r.sprintCount != null ? "sprints" : "entries"}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NewMemberCard({ member }) {
  const rep = member.reputation ?? 5;
  return (
    <Link
      to={`/profile/${member.user.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f0ead8] transition-colors group border border-transparent hover:border-[#e8e0d0]"
    >
      <Avatar src={member.user.avatar} username={member.user.username} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1a1a2e] truncate group-hover:text-[#1a5fb4] transition-colors">
          @{member.user.username}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <ReputationBadge rep={rep} />
          <span className="text-[10px] text-[#9a8c7a]">{timeAgo(member.joinedAt)}</span>
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </Link>
  );
}

function PublicationCard({ story }) {
  const genreColors = {
    Fantasy: "#7c3aed", "Sci-Fi": "#0891b2", Romance: "#db2777",
    Mystery: "#b45309", Horror: "#dc2626", "Literary Fiction": "#059669",
    Thriller: "#d97706", Historical: "#6b5c4a", default: "#1a5fb4",
  };
  const genreColor = genreColors[story.genre] || genreColors.default;

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col">
      {/* Cover or gradient banner */}
      <div className="relative h-36 overflow-hidden flex-shrink-0">
        {story.coverUrl ? (
          <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${genreColor}22, ${genreColor}44)` }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={genreColor} strokeWidth="1.5" opacity="0.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
            style={{ color: "white", background: genreColor }}
          >
            {story.genre}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#d4af37">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className="text-[10px] text-white font-semibold">{story._count?.likes ?? 0}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h4 className="font-serif text-[#1a1a2e] text-[14px] font-bold leading-snug mb-1 line-clamp-2 group-hover:text-[#1a5fb4] transition-colors">
          {story.title}
        </h4>
        <p className="text-[11px] text-[#9a8c7a] mb-2">by {story.authorName}</p>
        <p className="text-[11px] text-[#6b5c4a] leading-relaxed line-clamp-3 flex-1 mb-3">
          {story.synopsis}
        </p>

        {/* Recommender info */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#f0ead8]">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar src={story.user?.avatar} username={story.user?.username} size={22} />
            <span className="text-[10px] text-[#9a8c7a] truncate">@{story.user?.username}</span>
          </div>
          <Link
            to={`/stories/${story.id}`}
            className="text-[10px] font-bold text-[#1a5fb4] hover:text-[#1a1a2e] transition-colors uppercase tracking-wide flex-shrink-0 ml-2"
          >
            Read →
          </Link>
        </div>
      </div>
    </div>
  );
}

function SearchResultCard({ result, onClose }) {
  return (
    <Link
      to={`/profile/${result.user.id}`}
      onClick={onClose}
      className="flex items-start gap-3 p-4 hover:bg-[#fffdf0] transition-colors group border-b border-[#f0ead8] last:border-0"
    >
      <Avatar src={result.user.avatar} username={result.user.username} size={42} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-bold text-[#1a1a2e] group-hover:text-[#1a5fb4] transition-colors">
            @{result.user.username}
          </p>
          <ReputationBadge rep={result.reputation} />
        </div>
        {result.user.bio && (
          <p className="text-[11px] text-[#9a8c7a] mt-0.5 line-clamp-1">{result.user.bio}</p>
        )}
        {result.stories?.length > 0 && (
          <p className="text-[10px] text-[#d4af37] mt-1 font-semibold">
            📚 {result.stories.length} published {result.stories.length === 1 ? "story" : "stories"}
          </p>
        )}
      </div>
      <span className="text-[10px] text-[#9a8c7a] flex-shrink-0">{timeAgo(result.user.createdAt)}</span>
    </Link>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function MembersPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [showResults, setShowResults]   = useState(false);
  const searchRef   = useRef(null);
  const debounceRef = useRef(null);

  // Load members page data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/leaderboard/members`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError("Couldn't load member data. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${API_URL}/leaderboard/members/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error();
        const json = await res.json();
        setSearchResults(json.results || []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [searchQuery]);

  // Close search results on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Header />

      {/* ── Hero ── */}
      <div className="bg-[#1a1a2e] border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-2">
            Inkwell Community
          </p>
          <h1 className="font-serif text-white text-2xl sm:text-3xl leading-tight mb-3">
            Meet the writers.
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-lg mb-6">
            Every story starts with someone showing up. Here are the writers building this community — critiquing, sprinting, practising, and sharing their work.
          </p>

          {/* ── Search bar ── */}
          <div ref={searchRef} className="relative max-w-sm">
            <div className="relative">
              {searching ? (
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              ) : (
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              )}
              <input
                type="text"
                placeholder="Search writers by username…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-[13px] focus:outline-none focus:border-[#d4af37]/60 focus:bg-white/15 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setShowResults(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Search dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#e8e0d0] shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="text-[12px] text-[#9a8c7a] text-center py-6 px-4">
                    No writers found for "{searchQuery}"
                  </p>
                ) : (
                  searchResults.map((r) => (
                    <SearchResultCard key={r.user.id} result={r} onClose={() => setShowResults(false)} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-10">

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <p className="text-[12px] text-[#9a8c7a]">Loading community…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-[13px] text-red-600">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-12">

            {/* ── Section 1: Three leaderboards ── */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-0.5 bg-[#d4af37]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">
                  Hall of Fame
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <LeaderboardCard
                  title="Critiquer"
                  icon="✍️"
                  color="#1a5fb4"
                  rows={data.critiquers}
                  emptyMsg="No critiques yet — be the first!"
                />
                <LeaderboardCard
                  title="Sprinter"
                  icon="⚡"
                  color="#d4af37"
                  rows={data.sprinters}
                  emptyMsg="No completed sprints yet."
                />
                <LeaderboardCard
                  title="Daily Practice"
                  icon="🌱"
                  color="#059669"
                  rows={data.practiceWriters}
                  emptyMsg="No emotion cue practice yet."
                />
              </div>
            </section>

            {/* ── Section 2: Newest members ── */}
            {data.newest?.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-0.5 bg-[#d4af37]" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">
                    New to Inkwell
                  </p>
                </div>
                <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#f0ead8] flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-[#1a1a2e] text-[17px] font-bold">Newest Members</h3>
                      <p className="text-[11px] text-[#9a8c7a] mt-0.5">Say hello — everyone starts somewhere</p>
                    </div>
                    <span className="bg-[#d4af37]/15 text-[#d4af37] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      {data.newest.length} writers
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-0 divide-[#f0ead8]">
                    {data.newest.map((member) => (
                      <div key={member.user.id} className="p-2">
                        <NewMemberCard member={member} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── Section 3: Members' publications ── */}
            {data.publications?.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-0.5 bg-[#d4af37]" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">
                    Members' Bookshelf
                  </p>
                </div>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h3 className="font-serif text-[#1a1a2e] text-xl font-bold">Publication Showcase</h3>
                    <p className="text-[12px] text-[#9a8c7a] mt-0.5">Stories our writers are reading and recommending</p>
                  </div>
                  <Link
                    to="/stories"
                    className="text-[11px] font-bold text-[#1a5fb4] hover:text-[#1a1a2e] transition-colors uppercase tracking-wide"
                  >
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data.publications.map((story) => (
                    <PublicationCard key={story.id} story={story} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Empty state for publications ── */}
            {data.publications?.length === 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-0.5 bg-[#d4af37]" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">
                    Members' Bookshelf
                  </p>
                </div>
                <div className="bg-white border border-[#e8e0d0] rounded-2xl p-10 text-center">
                  <p className="text-3xl mb-3">📚</p>
                  <p className="font-serif text-[#1a1a2e] text-lg font-bold mb-1">No publications yet</p>
                  <p className="text-[12px] text-[#9a8c7a] mb-4">Be the first to share a story you love with the community.</p>
                  <Link
                    to="/discovery/submit"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#d4af37] text-[#1a1a2e] text-[12px] font-bold rounded-lg hover:bg-[#c9a42d] transition-colors"
                  >
                    Recommend a story
                  </Link>
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}