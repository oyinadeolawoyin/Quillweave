import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { useState, useEffect, useRef } from "react";
import API_URL from "@/config/api";
import EventsDropdown from "./eventsDropdown";

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
      const res = await fetch(`${API_URL}/notifications`, {
        credentials: "include",
      });

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
    { to: "/snippets", label: "Community" },
    { to: "/stories", label: "Stories" },
    { to: "/critique", label: "Critique" },
    { to: "/blog", label: "Blog" },
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(to)
                      ? "text-[#2d3748] bg-[#f7f4ee]"
                      : "text-[#737373] hover:text-[#2d3748] hover:bg-[#fafaf9]"
                  }`}
                >
                  {label}
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

            {/* 🔔 NOTIFICATION (UNCHANGED SVG) */}
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

            {/* 🟰 MOBILE HAMBURGER (ONLY MOBILE) */}
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

            {/* 👤 PROFILE (RE-STAYED BESIDE NOTIFICATION, SVG INTACT) */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#f7f4ee]"
              >
                <div className="w-8 h-8 rounded-full bg-[#2d3748] flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} className="w-full h-full object-cover" />
                  ) : (
                    user?.username?.charAt(0).toUpperCase() || "U"
                  )}
                </div>

                <span className="text-sm font-medium text-[#2d3748] hidden lg:block">
                  {user?.username}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-[#e5e5e5] rounded-xl shadow-xl overflow-hidden z-50">

                  <Link to={`/profile/${user.id}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#fafaf9]">
                    <svg className="w-4 h-4 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M5.121 17.804A10.97 10.97 0 0112 15c2.485 0 4.773.82 6.879 2.21M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Profile
                  </Link>

                  <Link to="/projects" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#fafaf9]">
                    <svg className="w-4 h-4 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
                      />
                    </svg>
                    Projects
                  </Link>

                  <Link to="/settings" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#fafaf9]">
                    <svg className="w-4 h-4 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                    </svg>
                    Settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Sign out
                  </button>

                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* 📱 MOBILE MENU (NAV ONLY, NO PROFILE DUPLICATION) */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-[#e5e5e5] bg-white px-4 py-3 space-y-2">

          {navItems.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`block px-3 py-2 rounded-lg text-sm ${
                isActive(to)
                  ? "bg-[#f7f4ee] text-[#2d3748]"
                  : "text-[#737373]"
              }`}
            >
              {label}
            </Link>
          ))}

          <div className="pt-2">
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