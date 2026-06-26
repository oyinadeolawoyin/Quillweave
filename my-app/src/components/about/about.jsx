// src/components/about/about.jsx
//
// Public-facing homepage — designed to attract new users and showcase community activity.
// White & gold theme (#ffffff, #d4af37, #1a1a2e) matching the rest of the site.
// Routes are React Router links; API calls hit the existing endpoints.
//
// LAYOUT NOTE: the body is a fixed two-column layout (main feed + a
// persistent right sidebar) rather than a stack of sections that each
// individually decide whether to exist. With a small/young community,
// letting every section vanish when empty made the page collapse into
// something visibly sparse. The sidebar widgets (newcomers, logged-today,
// top critiquers) now always render in the same shape — capped at 5 rows
// with a "See all" link when there's more, and a single friendly
// empty-state line when there's none — so a quiet day and a busy day look
// like the same site, just with different content inside the same frame.

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_URL from "@/config/api";
import { useAuth } from "../auth/authContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getExcerpt(content = "", length = 120) {
  const text = stripHtml(content);
  return text.length > length ? text.slice(0, length) + "…" : text;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Avatar (navigable to profile) ───────────────────────────────────────────

function Avatar({ user, size = 8, onClick }) {
  if (!user) return null;
  const cls = `w-${size} h-${size} rounded-full object-cover flex-shrink-0 border-2 border-white`;
  const initials = (user.username || "?")[0].toUpperCase();

  const inner = user.avatar ? (
    <img src={user.avatar} alt={user.username} className={cls} />
  ) : (
    <div
      className={`${cls} flex items-center justify-center text-xs font-bold text-[#1a1a2e]`}
      style={{ background: "linear-gradient(135deg, #d4af37, #f0d060)" }}
    >
      {initials}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="flex-shrink-0 hover:opacity-80 transition-opacity">
        {inner}
      </button>
    );
  }

  return (
    <Link to={`/profile/${user.id}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
      {inner}
    </Link>
  );
}

// ─── Sign-up nudge modal ──────────────────────────────────────────────────────

function SignupNudge({ message, onClose, onSignup }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(26,26,46,0.55)" }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}>
          <span className="text-[#1a1a2e] text-xl">✦</span>
        </div>
        <h3 className="font-serif text-xl text-[#1a1a2e] mb-2">Join to continue</h3>
        <p className="text-[14px] text-[#6b5c4a] mb-6 leading-relaxed">{message}</p>
        <button
          onClick={onSignup}
          className="w-full py-3 rounded-xl font-semibold text-[#1a1a2e] mb-3 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
        >
          Create a free account
        </button>
        <button onClick={onClose} className="text-[13px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors">
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ─── Challenge picker modal ────────────────────────────────────────────────────

function ChallengePicker({ onClose, onPick }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(26,26,46,0.55)" }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8">
        <h3 className="font-serif text-xl text-[#1a1a2e] mb-1 text-center">Pick your challenge</h3>
        <p className="text-[13px] text-[#9a8c7a] text-center mb-6">How many days can you commit to writing?</p>
        <div className="space-y-3">
          <button
            onClick={() => onPick("SEVEN")}
            className="w-full rounded-xl border-2 border-[#d4af37] p-4 text-left hover:bg-[#fdf8ec] transition-colors group"
          >
            <div className="font-serif text-lg text-[#1a1a2e] group-hover:text-[#b8860b]">7-Day Challenge</div>
            <div className="text-[12px] text-[#9a8c7a] mt-0.5">A week of daily writing sessions. Perfect for building momentum.</div>
          </button>
          <button
            onClick={() => onPick("FIFTEEN")}
            className="w-full rounded-xl border-2 border-[#1a1a2e] p-4 text-left hover:bg-[#f5f3ef] transition-colors group"
          >
            <div className="font-serif text-lg text-[#1a1a2e]">15-Day Challenge</div>
            <div className="text-[12px] text-[#9a8c7a] mt-0.5">Two weeks of sustained writing. For drafts that need real traction.</div>
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-4 text-[13px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: "#d4af37" }} />
      <h2 className="font-serif text-lg text-[#1a1a2e] font-semibold">{children}</h2>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-[#e8e0d0] rounded-lg ${className}`} />;
}

// ─── Community update card ─────────────────────────────────────────────────────

function CommunityCard({ post, onNudge }) {
  const navigate = useNavigate();
  const excerpt = getExcerpt(post.content, 130);

  function handleClick(e) {
    e.preventDefault();
    onNudge(
      "Sign up to read the full community update and stay in the loop.",
      () => navigate("/signup"),
      `/blog/${post.id}`
    );
  }

  return (
    <div
      onClick={handleClick}
      className="group bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden cursor-pointer
                 hover:border-[#d4af37]/60 hover:shadow-[0_4px_24px_rgba(212,175,55,0.12)] transition-all duration-300 flex flex-col"
    >
      {post.mediaUrl && (
        <div className="h-44 overflow-hidden flex-shrink-0">
          <img
            src={post.mediaUrl}
            alt={post.title || ""}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      {!post.mediaUrl && (
        <div className="h-44 flex-shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a1a2e,#1e2d4a)" }}>
          <span className="font-serif text-white text-5xl opacity-10">✦</span>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <span className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#d4af37" }}>
          {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>

        {post.title && (
          <h3 className="font-serif text-base text-[#1a1a2e] leading-snug mb-2 line-clamp-2 group-hover:text-[#b8860b] transition-colors">
            {post.title}
          </h3>
        )}

        <p className="text-[13px] text-[#6b5c4a] leading-relaxed flex-1 line-clamp-3">{excerpt}</p>

        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#f0ebe3]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-[#1a1a2e]"
              style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
            >
              A
            </div>
            <span className="text-[12px] text-[#6b5c4a] truncate font-medium">Inkwell Team</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#9a8c7a]">
            <span>{post._count?.likes ?? 0} ♥</span>
            <span>{post._count?.comments ?? 0} 💬</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Thread card ──────────────────────────────────────────────────────────────

function ThreadCard({ thread, onNudge }) {
  const navigate = useNavigate();

  function handleClick(e) {
    e.preventDefault();
    onNudge(
      "Join the community to read and participate in discussions.",
      () => navigate("/signup"),
      `/threads/${thread.id}`
    );
  }

  return (
    <div
      onClick={handleClick}
      className="group flex gap-3 items-start py-3 border-b border-[#f0ebe3] last:border-b-0 cursor-pointer hover:bg-[#faf8f4] -mx-4 px-4 transition-colors"
    >
      <Avatar user={thread.author} size={8} onClick={(e) => { e?.stopPropagation?.(); }} />
      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-semibold text-[#1a1a2e] line-clamp-2 group-hover:text-[#b8860b] transition-colors leading-snug">
          {thread.title}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#9a8c7a]">
          <span className="font-medium text-[#6b5c4a]">{thread.author?.username}</span>
          <span>·</span>
          <span>{thread._count?.likes ?? 0} ♥</span>
          <span>·</span>
          <span>{thread.totalCommentCount ?? thread._count?.comments ?? 0} 💬</span>
          <span>·</span>
          <span>{timeAgo(thread.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar widget shell ──────────────────────────────────────────────────────
// Every right-column widget shares this shell so all three always render the
// same fixed shape: title row, up to `cap` rows of content, a "See all" link
// when there's more than `cap`, and a single friendly line when there's none
// at all. Nothing here ever collapses the widget away — only what's inside
// the fixed frame changes between a quiet day and a busy one.

function SidebarWidget({ title, action, children }) {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a8c7a]">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function SidebarEmptyRow({ children }) {
  return (
    <p className="text-[12px] text-[#9a8c7a] leading-relaxed py-2">{children}</p>
  );
}

function SidebarSkeletonRows({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

const SIDEBAR_ROW_CAP = 5;

// ─── Main Homepage ────────────────────────────────────────────────────────────

export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Data state ──
  const [communityPosts, setCommunityPosts]     = useState([]);
  const [latestThreads, setLatestThreads]       = useState([]);
  const [activeThreads, setActiveThreads]       = useState([]);
  const [topCritiquers, setTopCritiquers]       = useState([]);
  const [newcomers, setNewcomers]               = useState([]);
  const [progressLoggers, setProgressLoggers]   = useState([]);
  const [threadCommenters, setThreadCommenters] = useState([]);
  const [recentSprinters, setRecentSprinters]   = useState([]);
  const [loading, setLoading]                   = useState(true);

  // ── UI state ──
  const [nudge, setNudge]               = useState(null); // { message, onConfirm }
  const [showChallengePicker, setShowChallengePicker] = useState(false);

  // ── Fetch all data ──
  useEffect(() => {
    const go = async () => {
      try {
        const [
          postsRes,
          latestRes,
          activeRes,
          critiquersRes,
          newcomersRes,
          recentActivityRes,
        ] = await Promise.all([
          fetch(`${API_URL}/blog/pinned`).then(r => r.ok ? r.json() : { posts: [] }),
          // /threads/latest returns { threads, total, page, totalPages }
          fetch(`${API_URL}/threads/latest`).then(r => r.ok ? r.json() : { threads: [] }),
          // /threads/active returns an array directly
          fetch(`${API_URL}/threads/active`).then(r => r.ok ? r.json() : []),
          // top critiquers (all-time, by feedback count) — sidebar caps display at 5
          fetch(`${API_URL}/leaderboard/critiquers`).then(r => r.ok ? r.json() : { critiquers: [] }),
          // newest members (last 2 days only)
          fetch(`${API_URL}/leaderboard/members`).then(r => r.ok ? r.json() : { newest: [] }),
          // recent activity — used here just for today's progress loggers
          fetch(`${API_URL}/leaderboard/homepage-activity`).then(r => r.ok ? r.json() : {}),
        ]);

        setCommunityPosts(postsRes.posts || []);

        // latestRes is { threads: [...], total, page, totalPages }
        const latestArr = Array.isArray(latestRes.threads) ? latestRes.threads : [];
        setLatestThreads(latestArr.slice(0, 5));

        // activeRes is a plain array
        const activeArr = Array.isArray(activeRes) ? activeRes : (activeRes.threads ?? []);
        setActiveThreads(activeArr.slice(0, 5));

        // critiquers: [{ rank, critiqueCount, user: { id, username, avatar, feedbackPoints } }]
        setTopCritiquers(Array.isArray(critiquersRes.critiquers) ? critiquersRes.critiquers : []);

        // newest members from the members page data: [{ rank, user, joinedAt }]
        setNewcomers(Array.isArray(newcomersRes.newest) ? newcomersRes.newest : []);

        // today's progress loggers, pulled out of the recent-activity payload
        const recentActivity = recentActivityRes && typeof recentActivityRes === "object" ? recentActivityRes : {};
        setProgressLoggers(Array.isArray(recentActivity.progressLoggers) ? recentActivity.progressLoggers : []);
        setThreadCommenters(Array.isArray(recentActivity.threadCommenters) ? recentActivity.threadCommenters : []);
        setRecentSprinters(Array.isArray(recentActivity.sprinters) ? recentActivity.sprinters : []);
      } catch {
        // fail silently — sections just show their empty state
      } finally {
        setLoading(false);
      }
    };
    go();
  }, []);

  // For guests, show the "sign up to continue" modal pointing at signup.
  // For logged-in users, skip the modal entirely and go straight to where
  // they were trying to go — they're already a member, no nudge needed.
  function showNudge(message, onConfirm, loggedInDestination) {
    if (user) {
      if (loggedInDestination) navigate(loggedInDestination);
      return;
    }
    setNudge({ message, onConfirm });
  }

  // Both guests and logged-in users go straight into the wizard now — no
  // signup nudge here. Guests get to answer every question first; the
  // wizard itself prompts for an account right before the final submit,
  // then creates the challenge automatically once they're signed up.
  function handleChallengePickerDone(duration) {
    setShowChallengePicker(false);
    navigate(`/days-challenge/new?duration=${duration}`);
  }

  // ─── Sidebar content ────────────────────────────────────────────────────────
  // Built once here so the same widgets can sit in the right column on
  // desktop and re-flow into the document on mobile without duplicating markup.

  const sidebar = (
    <div className="space-y-6">
      {/* Newest members — last 2 days */}
      <SidebarWidget
        title="New Writers to Welcome"
        action={
          newcomers.length > SIDEBAR_ROW_CAP && (
            <button onClick={() => showNudge("Sign up to see all our newest members.", () => navigate("/signup"), "/members")} className="text-[11px] font-semibold hover:underline" style={{ color: "#d4af37" }}>
              See all →
            </button>
          )
        }
      >
        {loading ? (
          <SidebarSkeletonRows count={3} />
        ) : newcomers.length > 0 ? (
          <div className="space-y-3">
            {newcomers.slice(0, SIDEBAR_ROW_CAP).map((entry) => {
              const u = entry.user;
              return (
                <div key={u?.id ?? entry.rank} className="flex items-center gap-3">
                  <Avatar user={u} size={7} />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${u?.id}`}
                      className="text-[12px] font-semibold text-[#1a1a2e] hover:text-[#b8860b] transition-colors truncate block"
                    >
                      {u?.username}
                    </Link>
                    <p className="text-[10px] text-[#9a8c7a]">Joined {timeAgo(entry.joinedAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <SidebarEmptyRow>
            No new writers in the last couple of days —{" "}
            <button onClick={() => navigate("/signup")} className="font-semibold hover:underline" style={{ color: "#d4af37" }}>
              be the next one to join
            </button>.
          </SidebarEmptyRow>
        )}
      </SidebarWidget>

      {/* Writers who logged progress today */}
      <SidebarWidget title="Writers Logged Progress Today">
        {loading ? (
          <SidebarSkeletonRows count={3} />
        ) : progressLoggers.length > 0 ? (
          <div className="space-y-3">
            {progressLoggers.slice(0, SIDEBAR_ROW_CAP).map((entry) => (
              <div key={entry.user.id} className="flex items-center gap-3">
                <Avatar user={entry.user} size={7} />
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${entry.user.id}`} className="text-[12px] font-semibold text-[#1a1a2e] hover:text-[#b8860b] transition-colors truncate block">
                    {entry.user.username}
                  </Link>
                  <p className="text-[10px] text-[#9a8c7a]">{entry.wordsLogged.toLocaleString()} words</p>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-semibold flex-shrink-0" style={{ color: "#1a7a4c" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1a7a4c" }} />
                  Logged Today
                </span>
              </div>
            ))}
          </div>
        ) : (
          <SidebarEmptyRow>
            No one's logged their progress yet today —{" "}
            {user ? (
              <button onClick={() => navigate("/draftplan")} className="font-semibold hover:underline" style={{ color: "#d4af37" }}>
                log yours
              </button>
            ) : (
              <button onClick={() => showNudge("Create a free account to start logging your writing progress.", () => navigate("/signup"))} className="font-semibold hover:underline" style={{ color: "#d4af37" }}>
                be the first
              </button>
            )}
            .
          </SidebarEmptyRow>
        )}
      </SidebarWidget>

      {/* Members active in threads today — hidden when empty */}
      {(loading || threadCommenters.length > 0) && (
        <SidebarWidget title="Active in Threads Today">
          {loading ? (
            <SidebarSkeletonRows count={3} />
          ) : (
            <div className="space-y-3">
              {threadCommenters.slice(0, SIDEBAR_ROW_CAP).map((entry) => {
                const tc = entry.threadCount  ?? 0;
                const cc = entry.commentCount ?? 0;
                // Build a label like "2 posts · 3 comments", "1 post", or "4 comments"
                const parts = [];
                if (tc > 0) parts.push(`${tc} post${tc !== 1 ? "s" : ""}`);
                if (cc > 0) parts.push(`${cc} comment${cc !== 1 ? "s" : ""}`);
                // Fallback: older entries that only carry postCount
                const activityLabel = parts.length > 0
                  ? parts.join(" · ")
                  : `${entry.postCount} comment${entry.postCount !== 1 ? "s" : ""}`;

                return (
                  <div key={entry.user.id} className="flex items-center gap-3">
                    <Avatar user={entry.user} size={7} />
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/profile/${entry.user.id}`}
                        className="text-[12px] font-semibold text-[#1a1a2e] hover:text-[#b8860b] transition-colors truncate block"
                      >
                        {entry.user.username}
                      </Link>
                      <p className="text-[10px] text-[#9a8c7a]">{activityLabel} today</p>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-semibold flex-shrink-0" style={{ color: "#2563a8" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2563a8" }} />
                      In threads
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SidebarWidget>
      )}

      {/* Members who sprinted recently (today + yesterday) — hidden when empty */}
      {(loading || recentSprinters.length > 0) && (
        <SidebarWidget title="Sprinting Recently">
          {loading ? (
            <SidebarSkeletonRows count={3} />
          ) : (
            <div className="space-y-3">
              {recentSprinters.slice(0, SIDEBAR_ROW_CAP).map((entry) => (
                <div key={entry.user.id} className="flex items-center gap-3">
                  <Avatar user={entry.user} size={7} />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${entry.user.id}`}
                      className="text-[12px] font-semibold text-[#1a1a2e] hover:text-[#b8860b] transition-colors truncate block"
                    >
                      {entry.user.username}
                    </Link>
                    <p className="text-[10px] text-[#9a8c7a]">
                      {entry.sprintCount} sprint{entry.sprintCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-semibold flex-shrink-0" style={{ color: "#7c3aed" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#7c3aed" }} />
                    Sprinting
                  </span>
                </div>
              ))}
            </div>
          )}
        </SidebarWidget>
      )}

      {/* Top critiquers — all-time, ranked by feedback count */}
      <SidebarWidget
        title="Top Critiquers"
        action={
          topCritiquers.length > SIDEBAR_ROW_CAP && (
            <button onClick={() => showNudge("Sign up to see the full critiquer leaderboard.", () => navigate("/signup"), "/critique")} className="text-[11px] font-semibold hover:underline" style={{ color: "#d4af37" }}>
              See all →
            </button>
          )
        }
      >
        {loading ? (
          <SidebarSkeletonRows count={3} />
        ) : topCritiquers.length > 0 ? (
          <div className="space-y-3">
            {topCritiquers.slice(0, SIDEBAR_ROW_CAP).map((entry) => {
              const u = entry.user;
              const rep = u?.feedbackPoints?.reputation ?? null;
              return (
                <div key={u?.id ?? entry.rank} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-[#9a8c7a] w-4 flex-shrink-0">#{entry.rank}</span>
                  <Avatar user={u} size={7} />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${u?.id}`}
                      className="text-[12px] font-semibold text-[#1a1a2e] hover:text-[#b8860b] transition-colors truncate block"
                    >
                      {u?.username}
                    </Link>
                    <p className="text-[10px] text-[#9a8c7a]">
                      {entry.critiqueCount} critique{entry.critiqueCount !== 1 ? "s" : ""}
                      {rep !== null ? ` · ★ ${rep}` : ""}
                    </p>
                  </div>
                  {entry.rank === 1 && (
                    <span className="text-[10px] font-semibold flex items-center gap-0.5 flex-shrink-0" style={{ color: "#d4af37" }}>
                      ★ Feedback Star
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <SidebarEmptyRow>
            {user ? (
              "No critiques yet — be the first to give feedback."
            ) : (
              <>
                Join to see who's giving the best feedback.{" "}
                <button onClick={() => navigate("/signup")} className="font-semibold hover:underline" style={{ color: "#d4af37" }}>
                  Sign up →
                </button>
              </>
            )}
          </SidebarEmptyRow>
        )}
      </SidebarWidget>
    </div>
  );

  // ─── Sections ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "#faf8f4" }}>

      {/* ── NUDGE MODAL ─────────────────────────────────────────────────────── */}
      {nudge && (
        <SignupNudge
          message={nudge.message}
          onClose={() => setNudge(null)}
          onSignup={() => { setNudge(null); nudge.onConfirm?.(); }}
        />
      )}

      {/* ── CHALLENGE PICKER ─────────────────────────────────────────────── */}
      {showChallengePicker && (
        <ChallengePicker
          onClose={() => setShowChallengePicker(false)}
          onPick={handleChallengePickerDone}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — guests see the pitch; logged-in users see a personal welcome
      ═══════════════════════════════════════════════════════════════════════ */}
      {user ? (
        <header className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#1e2d4a 60%,#0f1a2e 100%)" }}>
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(212,175,55,0.4) 40px, rgba(212,175,55,0.4) 41px)",
            }}
          />

          <div className="relative max-w-6xl mx-auto px-5 py-16 sm:py-20 text-center">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-widest"
              style={{ borderColor: "rgba(212,175,55,0.4)", color: "#d4af37", background: "rgba(212,175,55,0.08)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
              Community is writing right now
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white leading-tight mb-4">
              Welcome back,<br />
              <span style={{ color: "#d4af37" }}>{user.username}.</span>
            </h1>

            <p className="text-[15px] sm:text-base text-[#c5bfb5] max-w-xl mx-auto mb-10 leading-relaxed">
              Pick up where you left off — log today's progress, jump into a sprint, or see what the community's been writing.
            </p>

            {/* Quick actions — straight to the real page, no signup nudge */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-2">
              <button
                onClick={() => navigate("/draftplan")}
                className="px-8 py-3.5 rounded-xl font-semibold text-[#1a1a2e] text-[15px] transition-all hover:opacity-90 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
              >
                Log my progress →
              </button>

              <button
                onClick={() => navigate("/sprint-room")}
                className="px-8 py-3.5 rounded-xl font-semibold text-white text-[15px] border transition-all hover:bg-white/10"
                style={{ borderColor: "rgba(212,175,55,0.5)" }}
              >
                Start a sprint
              </button>

              <button
                onClick={() => navigate("/critique")}
                className="px-8 py-3.5 rounded-xl font-semibold text-white text-[15px] border transition-all hover:bg-white/10"
                style={{ borderColor: "rgba(212,175,55,0.5)" }}
              >
                Give feedback
              </button>
            </div>
          </div>
        </header>
      ) : (
        <header className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#1e2d4a 60%,#0f1a2e 100%)" }}>
          {/* Subtle texture lines */}
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(212,175,55,0.4) 40px, rgba(212,175,55,0.4) 41px)",
            }}
          />

          <div className="relative max-w-6xl mx-auto px-5 py-20 sm:py-28 text-center">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-widest"
              style={{ borderColor: "rgba(212,175,55,0.4)", color: "#d4af37", background: "rgba(212,175,55,0.08)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
              Community is writing right now
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white leading-tight mb-5">
              A home for writers with<br />
              <span style={{ color: "#d4af37" }}>more ideas than finished drafts.</span>
            </h1>

            <p className="text-[16px] sm:text-lg text-[#c5bfb5] max-w-2xl mx-auto mb-10 leading-relaxed">
            Track your draft. Take a writing challenge. Get real feedback. Find resources to sharpen your craft and the community support to carry you to the finish line. Every day, writers here show up and make progress — join them.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={() => navigate("/draftplan/new")}
                className="px-8 py-3.5 rounded-xl font-semibold text-[#1a1a2e] text-[15px] transition-all hover:opacity-90 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
              >
                Want to finish that draft? →
              </button>

              <button
                onClick={() => setShowChallengePicker(true)}
                className="px-8 py-3.5 rounded-xl font-semibold text-white text-[15px] border transition-all hover:bg-white/10"
                style={{ borderColor: "rgba(212,175,55,0.5)" }}
              >
                Developing, editing or brainstorming? Take the challenge
              </button>
            </div>

            {/* Secondary CTA */}
            <p className="text-[13px] text-[#9a8c7a]">
              Want feedback on your work?{" "}
              <button
                onClick={() => navigate("/signup?intent=critique")}
                className="font-semibold hover:underline transition-colors"
                style={{ color: "#d4af37" }}
              >
                Get started here for free →
              </button>
            </p>
          </div>
        </header>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          BODY — fixed two-column layout below ~1024px breakpoint reflows to
          a single column with the sidebar widgets after the main feed.
      ═══════════════════════════════════════════════════════════════════════ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

          {/* ── MAIN COLUMN ───────────────────────────────────────────────── */}
          <div className="space-y-12 min-w-0">

            {/* Pinned community posts — grouped by category */}
            {(loading || communityPosts.length > 0) && (() => {
              const groups = {};
              for (const post of communityPosts) {
                const key = post.category?.trim() || "Community News";
                if (!groups[key]) groups[key] = [];
                groups[key].push(post);
              }
              const groupEntries = Object.entries(groups);

              return (
                <>
                  {loading ? (
                    <section>
                      <SectionLabel>From the community</SectionLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2].map(i => (
                          <div key={i} className="bg-white border border-[#e8e0d0] rounded-2xl overflow-hidden">
                            <Skeleton className="h-44 rounded-none" />
                            <div className="p-5 space-y-2">
                              <Skeleton className="h-2.5 w-16" />
                              <Skeleton className="h-4 w-4/5" />
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : (
                    groupEntries.map(([category, posts]) => (
                      <section key={category}>
                        <SectionLabel>{category}</SectionLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {posts.map(post => (
                            <CommunityCard key={post.id} post={post} onNudge={showNudge} />
                          ))}
                        </div>
                        <div className="mt-3 text-right">
                          <button
                            onClick={() => showNudge("Sign up to read all community updates.", () => navigate("/signup"), "/community-update")}
                            className="text-[12px] font-semibold hover:underline transition-colors"
                            style={{ color: "#d4af37" }}
                          >
                            Read all updates →
                          </button>
                        </div>
                      </section>
                    ))
                  )}
                </>
              );
            })()}

            {/* Latest threads + Active discussions — side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <section>
                <SectionLabel>Latest threads</SectionLabel>
                <div className="bg-white border border-[#e8e0d0] rounded-2xl px-4 py-2">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex gap-3 items-start py-3 border-b border-[#f0ebe3] last:border-b-0">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-4/5" />
                          <Skeleton className="h-2.5 w-1/2" />
                        </div>
                      </div>
                    ))
                  ) : latestThreads.length > 0 ? (
                    latestThreads.map(t => (
                      <ThreadCard key={t.id} thread={t} onNudge={showNudge} />
                    ))
                  ) : (
                    <p className="text-[13px] text-[#9a8c7a] py-6 text-center">No threads yet.</p>
                  )}
                </div>
                <div className="mt-2 text-right">
                  <button
                    onClick={() => showNudge("Sign up to join the forum and start or reply to threads.", () => navigate("/signup"), "/forum")}
                    className="text-[12px] font-semibold hover:underline"
                    style={{ color: "#d4af37" }}
                  >
                    See all threads →
                  </button>
                </div>
              </section>

              <section>
                <SectionLabel>Active discussions</SectionLabel>
                <div className="bg-white border border-[#e8e0d0] rounded-2xl px-4 py-2">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex gap-3 items-start py-3 border-b border-[#f0ebe3] last:border-b-0">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-4/5" />
                          <Skeleton className="h-2.5 w-1/2" />
                        </div>
                      </div>
                    ))
                  ) : activeThreads.length > 0 ? (
                    activeThreads.map(t => (
                      <ThreadCard key={t.id} thread={t} onNudge={showNudge} />
                    ))
                  ) : (
                    <p className="text-[13px] text-[#9a8c7a] py-6 text-center">Quiet in here — be the first to post!</p>
                  )}
                </div>
              </section>
            </div>

            {/* Mid-page CTA banner */}
            <section
              className="rounded-2xl p-8 sm:p-10 text-center relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#1a1a2e,#1e2d4a)" }}
            >
              <div className="absolute inset-0 pointer-events-none opacity-5"
                style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #d4af37 0%, transparent 60%)" }} />
              <p className="relative text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#d4af37" }}>
                Ready to write?
              </p>
              <h2 className="relative font-serif text-2xl sm:text-3xl text-white mb-6 leading-snug">
                Stop planning to write.<br />Start writing.
              </h2>
              <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate("/draftplan/new")}
                  className="px-7 py-3 rounded-xl font-semibold text-[#1a1a2e] text-[14px] transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
                >
                  Start my draft plan
                </button>
                <button
                  onClick={() => setShowChallengePicker(true)}
                  className="px-7 py-3 rounded-xl font-semibold text-white text-[14px] border border-white/20 hover:bg-white/10 transition-all"
                >
                  Take the writing challenge
                </button>
              </div>
            </section>

            {/* Bottom CTA — desktop only here; on mobile it renders after the sidebar */}
            <section className="hidden lg:block rounded-2xl border border-[#e8e0d0] bg-white p-8 sm:p-12 text-center">
              {user ? (
                <>
                  <p className="font-serif text-2xl sm:text-3xl text-[#1a1a2e] mb-3 leading-snug">
                    Your draft isn't going to write itself.<br />
                    <span style={{ color: "#d4af37" }}>But we can help.</span>
                  </p>
                  <p className="text-[14px] text-[#9a8c7a] mb-7 max-w-md mx-auto">
                    Track progress, take a challenge, get critique — pick up where you left off.
                  </p>
                  <button
                    onClick={() => navigate("/draftplan")}
                    className="inline-block px-10 py-3.5 rounded-xl font-semibold text-[#1a1a2e] text-[15px] transition-all hover:opacity-90 hover:shadow-lg"
                    style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
                  >
                    Go to my draft plan →
                  </button>
                </>
              ) : (
                <>
                  <p className="font-serif text-2xl sm:text-3xl text-[#1a1a2e] mb-3 leading-snug">
                    Your draft isn't going to write itself.<br />
                    <span style={{ color: "#d4af37" }}>But we can help.</span>
                  </p>
                  <p className="text-[14px] text-[#9a8c7a] mb-7 max-w-md mx-auto">
                    Track progress, take challenges, get critique — everything a writing community should do.
                  </p>
                  <button
                    onClick={() => navigate("/signup")}
                    className="inline-block px-10 py-3.5 rounded-xl font-semibold text-[#1a1a2e] text-[15px] transition-all hover:opacity-90 hover:shadow-lg"
                    style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
                  >
                    Join for free →
                  </button>
                  <p className="text-[12px] text-[#c5bfb5] mt-4">No credit card. No catch. Just writing.</p>
                </>
              )}
            </section>
          </div>

          {/* ── SIDEBAR COLUMN ────────────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-6">
            {sidebar}
          </aside>

        </div>

        {/* Bottom CTA — mobile only, appears after the sidebar widgets */}
        <section className="lg:hidden mt-8 rounded-2xl border border-[#e8e0d0] bg-white p-8 text-center">
          {user ? (
            <>
              <p className="font-serif text-2xl text-[#1a1a2e] mb-3 leading-snug">
                Your draft isn't going to write itself.<br />
                <span style={{ color: "#d4af37" }}>But we can help.</span>
              </p>
              <p className="text-[14px] text-[#9a8c7a] mb-7 max-w-md mx-auto">
                Track progress, take a challenge, get critique — pick up where you left off.
              </p>
              <button
                onClick={() => navigate("/draftplan")}
                className="inline-block px-10 py-3.5 rounded-xl font-semibold text-[#1a1a2e] text-[15px] transition-all hover:opacity-90 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
              >
                Go to my draft plan →
              </button>
            </>
          ) : (
            <>
              <p className="font-serif text-2xl text-[#1a1a2e] mb-3 leading-snug">
                Your draft isn't going to write itself.<br />
                <span style={{ color: "#d4af37" }}>But we can help.</span>
              </p>
              <p className="text-[14px] text-[#9a8c7a] mb-7 max-w-md mx-auto">
                Track progress, take challenges, get critique — everything a writing community should do.
              </p>
              <button
                onClick={() => navigate("/signup")}
                className="inline-block px-10 py-3.5 rounded-xl font-semibold text-[#1a1a2e] text-[15px] transition-all hover:opacity-90 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
              >
                Join for free →
              </button>
              <p className="text-[12px] text-[#c5bfb5] mt-4">No credit card. No catch. Just writing.</p>
            </>
          )}
        </section>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e8e0d0] mt-8 py-8 px-5 text-center">
        <p className="font-serif text-[#1a1a2e] text-sm mb-1">Inkwell</p>
        <p className="text-[12px] text-[#9a8c7a]">A home for writers with more ideas than finished drafts.</p>
      </footer>
    </div>
  );
}