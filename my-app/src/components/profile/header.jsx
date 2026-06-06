import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { useState, useEffect, useRef } from "react";
import API_URL from "@/config/api";
import EventsDropdown from "./eventsDropdown";

// ── Dropdown nav icons (inline SVG) ──────────────────────────────────────────
const ProfileIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const ProjectsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const DraftsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);

const SignOutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [activeEvents, setActiveEvents] = useState([]);

  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchNotificationCount();
      const interval = setInterval(fetchNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    fetchActiveEvents();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setEventsDropdownOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotificationCount() {
    try {
      const res = await fetch(`${API_URL}/notifications`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const unreadCount = data.notifications.filter(
          n => n.read === false || n.read === null
        ).length;
        setNotificationCount(unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }

  async function fetchActiveEvents() {
    try {
      const res = await fetch(`${API_URL}/events/active`);
      if (res.ok) {
        const data = await res.json();
        setActiveEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch active events:", error);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
    setMobileOpen(false);
  }

  const navItems = [
    { to: "/critique",  label: "Critique"  },
    { to: "/members",   label: "Members"   },
    { to: "/snippets",  label: "Community" },
    
    // { to: "/thesaurus", label: "Thesaurus" },
    // { to: "/blog",      label: "Blog"      },
  ];

  function isActive(to) {
    return pathname === to || pathname.startsWith(to + "/");
  }

  return (
    <header className="bg-white border-b border-[#e5e5e5] sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4 sm:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[4.5rem]">

          {/* LEFT */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center shrink-0">
              <span className="text-[22px] font-serif font-semibold tracking-wide text-[#2d3748]">
                Inkwell
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1 ml-10">
              {navItems.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors group"
                  style={{ color: isActive(to) ? "#2d3748" : "#737373" }}
                >
                  {/* Background fill for active */}
                  <span
                    className="absolute inset-0 rounded-lg transition-colors"
                    style={{ background: isActive(to) ? "#f7f4ee" : "transparent" }}
                  />

                  {/* Label */}
                  <span className="relative z-10 group-hover:text-[#2d3748]">{label}</span>

                  {/* Blue active indicator line */}
                  {isActive(to) && (
                    <span
                      className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full"
                      style={{ background: "#3b82f6" }}
                    />
                  )}
                </Link>
              ))}

              <EventsDropdown
                open={eventsDropdownOpen}
                setOpen={setEventsDropdownOpen}
                activeEvents={activeEvents}
              />
            </nav>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">

            {/* 🔔 NOTIFICATION */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-lg text-[#737373] hover:text-[#2d3748] hover:bg-[#f7f4ee]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>

              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#d4af37] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>

            {/* 🟰 MOBILE HAMBURGER */}
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-[#f7f4ee]"
              onClick={() => setMobileOpen(o => !o)}
            >
              <svg className="w-6 h-6 text-[#2d3748]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>

            {/* 👤 PROFILE / AUTH */}
            <div className="relative" ref={profileRef}>

              {user ? (
                <>
                  <button
                    onClick={() => setProfileOpen(o => !o)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#f7f4ee] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#2d3748] flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} className="w-full h-full object-cover" alt={user.username} />
                      ) : (
                        user?.username?.charAt(0).toUpperCase() || "U"
                      )}
                    </div>
                    <span className="text-sm font-medium text-[#2d3748] hidden lg:block">
                      {user?.username}
                    </span>
                    {/* Chevron */}
                    <svg
                      className="w-3.5 h-3.5 text-[#737373] hidden lg:block transition-transform"
                      style={{ transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* ── Profile dropdown ──────────────────────────────────── */}
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-[#e5e5e5] rounded-xl shadow-xl overflow-hidden z-50">

                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-[#f0ebe3] bg-[#fafaf9]">
                        <p className="text-xs text-[#9a8c7a] font-medium">Signed in as</p>
                        <p className="text-sm font-semibold text-[#2d3748] truncate mt-0.5">{user.username}</p>
                      </div>

                      {/* Nav links */}
                      <div className="py-1">
                        <Link
                          to={`/profile/${user.id}`}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#4a4a4a] hover:bg-[#fafaf9] transition-colors"
                        >
                          <span className="text-[#737373]"><ProfileIcon /></span>
                          Profile
                        </Link>

                        <Link
                          to="/projects"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#4a4a4a] hover:bg-[#fafaf9] transition-colors"
                        >
                          <span className="text-[#737373]"><ProjectsIcon /></span>
                          Projects
                        </Link>

                        <Link
                          to="/drafts"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#4a4a4a] hover:bg-[#fafaf9] transition-colors"
                        >
                          <span className="text-[#737373]"><DraftsIcon /></span>
                          Drafts
                        </Link>

                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#4a4a4a] hover:bg-[#fafaf9] transition-colors"
                        >
                          <span className="text-[#737373]"><SettingsIcon /></span>
                          Settings
                        </Link>
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-[#f0ebe3]" />

                      {/* Sign out */}
                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <SignOutIcon />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#2d3748] hover:bg-[#1f2937] transition-colors"
                >
                  Sign in
                </Link>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* 📱 MOBILE MENU */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-[#e5e5e5] bg-white px-4 py-3 space-y-1">
          {navItems.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(to)
                  ? "bg-[#f7f4ee] text-[#2d3748]"
                  : "text-[#737373] hover:text-[#2d3748] hover:bg-[#fafaf9]"
              }`}
            >
              {label}
              {/* Blue dot for active on mobile */}
              {isActive(to) && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              )}
            </Link>
          ))}

          <div className="pt-1">
            <EventsDropdown
              open={eventsDropdownOpen}
              setOpen={setEventsDropdownOpen}
              activeEvents={activeEvents}
            />
          </div>
        </div>
      )}
    </header>
  );
}