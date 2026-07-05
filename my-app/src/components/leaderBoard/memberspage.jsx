// src/components/members/MembersPage.jsx
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import API_URL from "@/config/api";
import { AppMetaTags } from "../utilis/metatags";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Avatar({ src, username, size = 36 }) {
  const [errored, setErrored] = useState(false);
  const initials = (username || "?")[0].toUpperCase();
  if (src && !errored) {
    return (
      <img
        src={src}
        alt={username}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
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
  let label = "Newcomer", color = "#9a8c7a";
  if (rep >= 100)      { label = "Legend";      color = "#d4af37"; }
  else if (rep >= 50)  { label = "Scholar";     color = "#1a5fb4"; }
  else if (rep >= 20)  { label = "Contributor"; color = "#059669"; }
  else if (rep >= 10)  { label = "Regular";     color = "#7c3aed"; }
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{ color, background: color + "18" }}
    >
      {label}
    </span>
  );
}

function SectionLabel({ eyebrow }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-px bg-[#d4af37]" />
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">
        {eyebrow}
      </p>
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

function LeaderRow({ rank, user, stat, statLabel }) {
  return (
    <Link
      to={`/profile/${user?.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#f7f4ee] transition-colors group border-b border-[#f0ead8] last:border-0"
    >
      <span className="w-5 text-center text-sm flex-shrink-0">
        {MEDALS[rank] ?? (
          <span className="text-[10px] text-[#9a8c7a] font-bold">{rank}</span>
        )}
      </span>
      <Avatar src={user?.avatar} username={user?.username} size={32} />
      <p className="flex-1 text-[12px] font-semibold text-[#1a1a2e] truncate group-hover:text-[#1a5fb4] transition-colors">
        @{user?.username}
      </p>
      <div className="text-right flex-shrink-0">
        <p className="text-[14px] font-bold text-[#d4af37] tabular-nums">{stat}</p>
        <p className="text-[9px] text-[#9a8c7a] uppercase tracking-wide">{statLabel}</p>
      </div>
    </Link>
  );
}

function LeaderboardCard({ title, icon, accentColor, rows, emptyMsg, statKey, statLabel }) {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden flex flex-col">
      <div
        className="px-5 py-4 border-b border-[#f0ead8]"
        style={{ borderTop: `3px solid ${accentColor}` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className="font-serif text-[#1a1a2e] text-[15px] font-bold leading-tight">{title}</h3>
        </div>
      </div>
      <div className="flex-1">
        {rows.length === 0 ? (
          <p className="text-[11px] text-[#9a8c7a] text-center py-8 px-4">{emptyMsg}</p>
        ) : (
          rows.map((r) => (
            <LeaderRow
              key={r.user?.id}
              rank={r.rank}
              user={r.user}
              stat={r[statKey] ?? 0}
              statLabel={statLabel}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Yesterday row + card ─────────────────────────────────────────────────────

function YesterdayRow({ user, stat, statLabel }) {
  return (
    <Link
      to={`/profile/${user?.id}`}
      className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-[#f7f4ee] transition-colors group"
    >
      <Avatar src={user?.avatar} username={user?.username} size={28} />
      <p className="flex-1 text-[12px] font-medium text-[#1a1a2e] truncate group-hover:text-[#1a5fb4] transition-colors">
        @{user?.username}
      </p>
      <span className="text-[11px] font-bold text-[#9a8c7a] tabular-nums flex-shrink-0">
        {stat} <span className="font-normal text-[10px]">{statLabel}</span>
      </span>
    </Link>
  );
}

function YesterdayCard({ title, icon, rows, statKey, statLabel }) {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#f0ead8] flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <p className="text-[11px] font-bold text-[#6b5c4a] uppercase tracking-wider">{title}</p>
        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-[#9a8c7a] bg-[#f0ead8] px-2 py-0.5 rounded-full">
          Yesterday
        </span>
      </div>
      <div className="p-2">
        {rows.map((r) => (
          <YesterdayRow
            key={r.user?.id}
            user={r.user}
            stat={r[statKey] ?? 0}
            statLabel={statLabel}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ user, meta, isNew = false }) {
  const rep = user?.feedbackPoints?.reputation ?? 5;
  return (
    <Link
      to={`/profile/${user?.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#f7f4ee] transition-colors group border-b border-[#f0ead8] last:border-0"
    >
      <Avatar src={user?.avatar} username={user?.username} size={34} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-semibold text-[#1a1a2e] truncate group-hover:text-[#1a5fb4] transition-colors">
            @{user?.username}
          </p>
          {isNew && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#059669] bg-[#05966918] px-1.5 py-0.5 rounded flex-shrink-0">
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <ReputationBadge rep={rep} />
        </div>
      </div>
      {meta && (
        <p className="text-[11px] text-[#9a8c7a] flex-shrink-0 tabular-nums">{meta}</p>
      )}
    </Link>
  );
}

function PanelCard({ title, icon, children, badge }) {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#f0ead8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className="font-serif text-[#1a1a2e] text-[15px] font-bold leading-tight">{title}</h3>
        </div>
        {badge && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#d4af37] bg-[#d4af37]/12 px-2.5 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Search ───────────────────────────────────────────────────────────────────

function SearchResultCard({ result, onClose }) {
  return (
    <Link
      to={`/profile/${result.user.id}`}
      onClick={onClose}
      className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#fffdf0] transition-colors group border-b border-[#f0ead8] last:border-0"
    >
      <Avatar src={result.user.avatar} username={result.user.username} size={40} />
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
      </div>
      <span className="text-[10px] text-[#9a8c7a] flex-shrink-0 mt-0.5">
        {timeAgo(result.user.createdAt)}
      </span>
    </Link>
  );
}

function SearchBar() {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop]   = useState(false);
  const ref      = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 1) { setResults([]); setShowDrop(false); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(
          `${API_URL}/leaderboard/members/search?q=${encodeURIComponent(query.trim())}`,
          { credentials: "include" }
        );
        const json = await res.json();
        setResults(json.results || []);
        setShowDrop(true);
      } catch { setResults([]); }
      finally  { setSearching(false); }
    }, 350);
  }, [query]);

  useEffect(() => {
    function outside(e) {
      if (ref.current && !ref.current.contains(e.target)) setShowDrop(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        {searching ? (
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        ) : (
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a8c7a" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        )}
        <input
          type="text"
          placeholder="Search writers by username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDrop(true)}
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#e8e0d0] rounded-xl text-[#1a1a2e] placeholder-[#9a8c7a] text-[13px] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setShowDrop(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
      {showDrop && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-[#e8e0d0] shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-[12px] text-[#9a8c7a] text-center py-6 px-4">
              No writers found for "{query}"
            </p>
          ) : (
            results.map((r) => (
              <SearchResultCard key={r.user.id} result={r} onClose={() => setShowDrop(false)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function MembersPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/leaderboard/members`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load");
        setData(await res.json());
      } catch {
        setError("Couldn't load member data. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <p className="text-[12px] text-[#9a8c7a]">Loading community…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 px-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-[13px] text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const {
    critiquers              = [],
    sprinters               = [],
    draftWriters            = [],
    yesterdayCritiquers     = [],
    yesterdaySprinters      = [],
    yesterdayDraftWriters   = [],
    newest                  = [],
    activeMembers           = [],
    topThreaders            = [],
  } = data ?? {};

  // Whether any yesterday data exists at all
  const hasYesterday =
    yesterdayCritiquers.length > 0 ||
    yesterdaySprinters.length  > 0 ||
    yesterdayDraftWriters.length > 0;

  // Whether any community panel has data
  const hasCommunity = activeMembers.length > 0 || topThreaders.length > 0;

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1400px] mx-auto">
      <AppMetaTags
        title="Members"
        description="Meet the Quillweave community — critiquers, sprinters, and draft writers."
      />

      {/* ── Page title + search ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37] mb-1">
            Quillweave Community
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1a1a2e] leading-tight">
            Members
          </h1>
        </div>
        <SearchBar />
      </div>

      <div className="space-y-10">

        {/* ══ Section 1: All-time leaderboards ══ */}
        <section>
          <SectionLabel eyebrow="Hall of Fame · All-Time" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LeaderboardCard
              title="Best Critiquers"
              icon="✍️"
              accentColor="#1a5fb4"
              rows={critiquers}
              emptyMsg="No critiques submitted yet."
              statKey="critiqueCount"
              statLabel="critiques"
            />
            <LeaderboardCard
              title="Best Sprinters"
              icon="⚡"
              accentColor="#d4af37"
              rows={sprinters}
              emptyMsg="No completed sprints yet."
              statKey="sprintCount"
              statLabel="sprints"
            />
            <LeaderboardCard
              title="Best Draft Writers"
              icon="📖"
              accentColor="#059669"
              rows={draftWriters}
              emptyMsg="No draft progress logged yet."
              statKey="wordCount"
              statLabel="words logged"
            />
          </div>
        </section>

        {/* ══ Section 2: Yesterday — hidden entirely when no data ══ */}
        {hasYesterday && (
          <section>
            <SectionLabel eyebrow="Yesterday's Activity" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {yesterdayCritiquers.length > 0 && (
                <YesterdayCard
                  title="Critiquers"
                  icon="✍️"
                  rows={yesterdayCritiquers}
                  statKey="critiqueCount"
                  statLabel="critiques"
                />
              )}
              {yesterdaySprinters.length > 0 && (
                <YesterdayCard
                  title="Sprinters"
                  icon="⚡"
                  rows={yesterdaySprinters}
                  statKey="sprintCount"
                  statLabel="sprints"
                />
              )}
              {yesterdayDraftWriters.length > 0 && (
                <YesterdayCard
                  title="Draft Writers"
                  icon="📖"
                  rows={yesterdayDraftWriters}
                  statKey="wordCount"
                  statLabel="words"
                />
              )}
            </div>
          </section>
        )}

        {/* ══ Section 3: Community panels ══ */}
        {hasCommunity && (
          <section>
            <SectionLabel eyebrow="Community" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {activeMembers.length > 0 && (
                <PanelCard title="Recently Active" icon="🟢">
                  {activeMembers.map((m) => (
                    <MemberRow key={m.user.id} user={m.user} meta={timeAgo(m.lastActive)} />
                  ))}
                  {newest.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center gap-3">
                        <div className="flex-1 h-px bg-[#f0ead8]" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#059669]">
                          Just joined
                        </span>
                        <div className="flex-1 h-px bg-[#f0ead8]" />
                      </div>
                      {newest.map((m) => (
                        <MemberRow
                          key={`new-active-${m.user.id}`}
                          user={m.user}
                          meta={timeAgo(m.joinedAt)}
                          isNew
                        />
                      ))}
                    </>
                  )}
                </PanelCard>
              )}

              {topThreaders.length > 0 && (
                <PanelCard title="Top Thread Contributors" icon="💬">
                  {topThreaders.map((m, i) => (
                    <Link
                      key={m.user.id}
                      to={`/profile/${m.user.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[#f7f4ee] transition-colors group border-b border-[#f0ead8] last:border-0"
                    >
                      <span className="text-sm w-5 text-center flex-shrink-0">
                        {MEDALS[i + 1] ?? (
                          <span className="text-[10px] text-[#9a8c7a] font-bold">{i + 1}</span>
                        )}
                      </span>
                      <Avatar src={m.user.avatar} username={m.user.username} size={32} />
                      <p className="flex-1 text-[12px] font-semibold text-[#1a1a2e] truncate group-hover:text-[#1a5fb4] transition-colors">
                        @{m.user.username}
                      </p>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13px] font-bold text-[#d4af37] tabular-nums">{m.postCount}</p>
                        <p className="text-[9px] text-[#9a8c7a] uppercase tracking-wide">posts</p>
                      </div>
                    </Link>
                  ))}
                  {newest.length > 0 && (
                    <>
                      <div className="px-4 py-2 flex items-center gap-3">
                        <div className="flex-1 h-px bg-[#f0ead8]" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#059669]">
                          Just joined
                        </span>
                        <div className="flex-1 h-px bg-[#f0ead8]" />
                      </div>
                      {newest.map((m) => (
                        <MemberRow
                          key={`new-thread-${m.user.id}`}
                          user={m.user}
                          meta={timeAgo(m.joinedAt)}
                          isNew
                        />
                      ))}
                    </>
                  )}
                </PanelCard>
              )}

            </div>
          </section>
        )}

      </div>
    </main>
  );
}