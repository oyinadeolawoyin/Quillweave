// src/components/dashboard/sidebar.jsx

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { useState, useEffect, useCallback, useRef } from "react";
import API_URL from "@/config/api";

// ── Icons (inline SVG, no emoji) ─────────────────────────────────────────────

const DashboardIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const PlanIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

const SubmissionIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 15l3-3 3 3" />
    <path d="M12 12v6" />
  </svg>
);

const DraftsIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const ChallengeIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 22V4a1 1 0 011-1h13.5a.5.5 0 01.4.8L16 9l2.9 5.2a.5.5 0 01-.4.8H5" />
  </svg>
);

const BellIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const SprintIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

const CritiqueIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    <line x1="8" y1="9" x2="16" y2="9" />
    <line x1="8" y1="13" x2="13" y2="13" />
  </svg>
);

const CommunityIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const EventIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const TrophyIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 21h8" /><path d="M12 17v4" />
    <path d="M7 4h10v6a5 5 0 01-10 0z" />
    <path d="M17 5h3a2 2 0 01-2 4h-1" /><path d="M7 5H4a2 2 0 002 4h1" />
  </svg>
);

const MembersIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const NewsIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 4h13a2 2 0 012 2v13a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
    <path d="M16 4v17" />
    <line x1="7" y1="9" x2="12" y2="9" />
    <line x1="7" y1="13" x2="12" y2="13" />
  </svg>
);

const MessagesIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    <line x1="9" y1="10" x2="15" y2="10" />
  </svg>
);

const SettingsIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const SignOutIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// Collapse toggle chevron
const CollapseIcon = ({ collapsed, ...p }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }} {...p}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

// ── Unread badge pill ─────────────────────────────────────────────────────────

function Badge({ count, collapsed }) {
  if (!count || count < 1) return null;
  // In collapsed mode, show as a small dot on the icon instead
  if (collapsed) {
    return (
      <span
        className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
        style={{ background: "#dc2626" }}
        aria-label={`${count} unread`}
      />
    );
  }
  return (
    <span
      className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center"
      style={{ background: "#dc2626", color: "#ffffff" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Nav structure ─────────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { to: "/draftplan",      label: "My Draft Plan",  Icon: PlanIcon },
  { to: "/days-challenge", label: "Days Challenge",  Icon: ChallengeIcon },
  { to: "/submissions",    label: "My Submissions",  Icon: SubmissionIcon },
  { to: "/drafts",         label: "My Drafts",       Icon: DraftsIcon },
];

// Sprint Room and Critique Now are high-value, time-sensitive — keep them up top.
// Forum, Members folded into Community section. Messages + Notifications get badges.
// Community Updates moved to bottom of community (low urgency unless badged).
const COMMUNITY_NAV = [
  { to: "/sprint-room",  label: "Sprint Room",    Icon: SprintIcon, badgeKey: "sprintRoom" },
  { to: "/critique",     label: "Critique Now",   Icon: CritiqueIcon },
  { to: "/threads",        label: "Forum",          Icon: CommunityIcon },
  { to: "/members",      label: "Members",        Icon: MembersIcon },
];

const EVENT_NAV = [
  { to: "/mini-challenges", label: "Weekly Challenge", Icon: TrophyIcon },
  { to: "/events",            label: "Events",         Icon: EventIcon },
];

const INBOX_NAV = [
  { to: "/messages",          label: "Messages",           Icon: MessagesIcon, badgeKey: "messages" },
  { to: "/notifications",     label: "Notifications",      Icon: BellIcon,     badgeKey: "notifications" },
  { to: "/community-update",              label: "Community update",  Icon: NewsIcon,     badgeKey: "communityUpdates" },
];

function buildDashboardNav(userId) {
  return [
    { to: `/profile/${userId}`, label: "My Dashboard", Icon: MembersIcon },
  ];
}

function buildAccountNav() {
  return [
    { to: "/settings", label: "Settings", Icon: SettingsIcon },
  ];
}

// ── Shared row (badge-aware, collapse-aware) ──────────────────────────────────

function NavRow({ to, label, Icon, active, badge, collapsed }) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className="relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors group"
      style={{
        color: active ? "#2d3748" : "#737373",
        padding: collapsed ? "0.625rem" : "0.625rem 0.75rem",
        justifyContent: collapsed ? "center" : undefined,
      }}
    >
      <span
        className="absolute inset-0 rounded-lg transition-colors"
        style={{ background: active ? "#fdf9ed" : "transparent" }}
        aria-hidden="true"
      />
      {/* Icon wrapper — relative so the dot badge can anchor to it */}
      <span className="relative z-10 flex-shrink-0" style={{ color: active ? "#b8860b" : "#9a8c7a" }}>
        <Icon />
        {collapsed && badge > 0 && <Badge count={badge} collapsed />}
      </span>
      {!collapsed && (
        <span className="relative z-10 group-hover:text-[#2d3748] truncate flex-1">{label}</span>
      )}
      {!collapsed && badge > 0 && (
        <span className="relative z-10">
          <Badge count={badge} />
        </span>
      )}
      {active && (
        <span
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
          style={{ background: "#d4af37" }}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

function NavSection({ title, items, isActive, counts, collapsed }) {
  return (
    <div className="mb-1">
      {title && !collapsed && (
        <p className="px-3 mb-1.5 mt-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#c2b8a8]">
          {title}
        </p>
      )}
      {title && collapsed && (
        // Thin divider in place of the section label when collapsed
        <div className="mx-auto mt-4 mb-1.5" style={{ width: 24, height: 1, background: "#e5e5e5" }} />
      )}
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavRow
            key={item.to}
            {...item}
            active={isActive(item.to)}
            badge={item.badgeKey ? (counts[item.badgeKey] ?? 0) : 0}
            collapsed={collapsed}
          />
        ))}
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ mobileNavOpen = false, onCloseMobileNav = () => {} }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const userId = user?.id ?? user?._id ?? "";
  const dashboardNav = buildDashboardNav(userId);
  const accountNav = buildAccountNav();

  // Collapse state — persisted in localStorage so it survives refreshes
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar_collapsed") === "true"; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar_collapsed", String(next)); } catch {}
      return next;
    });
  };

  // ── Unread counts ───────────────────────────────────────────────────────
  const [counts, setCounts] = useState({
    notifications:    0,
    messages:         0,
    communityUpdates: 0,
    sprintRoom:       0,
  });

  const suppressUntil = useRef(0);

  const fetchCounts = useCallback(async () => {
    if (Date.now() < suppressUntil.current) return;
    try {
      const res = await fetch(`${API_URL}/notifications/unread-counts`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setCounts(data);
    } catch {
      // silently ignore — counts aren't critical
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60_000);
    window.addEventListener("focus", fetchCounts);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchCounts);
    };
  }, [fetchCounts]);

  useEffect(() => {
    if (pathname === "/community-update") {
      setCounts((prev) => ({ ...prev, communityUpdates: 0 }));
      fetch(`${API_URL}/blog/mark-seen`, { method: "POST", credentials: "include" }).catch(() => {});
    }
    if (pathname === "/messages" || pathname.startsWith("/messages/")) {
      setCounts((prev) => ({ ...prev, messages: 0 }));
      suppressUntil.current = Date.now() + 5_000;
    }
    // Mirrors the messages pattern above — the chat panel itself also calls
    // /sprint-room/notifications/read on mount, but that badge should drop
    // to 0 the instant the writer is on the page, not on the next 60s poll.
    if (pathname === "/sprint-room" || pathname.startsWith("/sprint-room/")) {
      setCounts((prev) => ({ ...prev, sprintRoom: 0 }));
      suppressUntil.current = Date.now() + 5_000;
    }
  }, [pathname]);

  function isActive(to) {
    return pathname === to || pathname.startsWith(to + "/");
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
    onCloseMobileNav();
  }

  const navContent = (collapsed) => (
    <>
      <nav className="flex-1 overflow-y-auto pt-4 pb-4" style={{ padding: collapsed ? "1rem 0.5rem" : "1rem 0.75rem" }} onClick={onCloseMobileNav}>
        <NavSection
          title={null}
          items={[{ to: "/", label: "Home", Icon: DashboardIcon }]}
          isActive={isActive}
          counts={counts}
          collapsed={collapsed}
        />
        <NavSection title={null}        items={dashboardNav}  isActive={isActive} counts={counts} collapsed={collapsed} />
        <NavSection title="My Writing"  items={PRIMARY_NAV}   isActive={isActive} counts={counts} collapsed={collapsed} />
        <NavSection title="Community"   items={COMMUNITY_NAV} isActive={isActive} counts={counts} collapsed={collapsed} />
        <NavSection title="Event"       items={EVENT_NAV} isActive={isActive} counts={counts} collapsed={collapsed} />
        <NavSection title="Inbox"       items={INBOX_NAV}     isActive={isActive} counts={counts} collapsed={collapsed} />
        <NavSection title="Account"     items={accountNav}    isActive={isActive} counts={counts} collapsed={collapsed} />
      </nav>

      <div
        className="border-t border-[#f0ebe3] flex-shrink-0"
        style={{ padding: collapsed ? "0.75rem 0.5rem" : "0.75rem" }}
      >
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          className="w-full flex items-center rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          style={{
            gap: collapsed ? 0 : "0.75rem",
            padding: collapsed ? "0.625rem" : "0.625rem 0.75rem",
            justifyContent: collapsed ? "center" : undefined,
          }}
        >
          <SignOutIcon />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop / tablet — collapsible */}
      <aside
        className="hidden sm:flex flex-col h-[calc(100vh-3.6875rem)] sticky top-[3.6875rem] bg-white border-r border-[#e5e5e5] flex-shrink-0"
        style={{ width: collapsed ? "3.5rem" : "16rem", transition: "width 0.2s ease" }}
      >
        {/* Collapse toggle button */}
        <div
          className="flex flex-shrink-0 border-b border-[#f0ebe3]"
          style={{ justifyContent: collapsed ? "center" : "flex-end", padding: "0.5rem" }}
        >
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-md text-[#9a8c7a] hover:bg-[#fdf9ed] hover:text-[#b8860b] transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>

        {navContent(collapsed)}
      </aside>

      {/* Mobile — off-canvas drawer (always expanded) */}
      {mobileNavOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobileNav}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[80vw] h-full bg-white border-r border-[#e5e5e5] flex flex-col shadow-2xl">
            {navContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}