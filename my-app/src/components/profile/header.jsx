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

            {/* 👤 PROFILE / AUTH BUTTON (SAFE RENDER) */}
            <div className="relative" ref={profileRef}>

            {user ? (
              <>
                {/* LOGGED IN USER */}
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

                {/* DROPDOWN */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-[#e5e5e5] rounded-xl shadow-xl overflow-hidden z-50">

                    <Link to={`/profile/${user.id}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#fafaf9]">
                      Profile
                    </Link>

                    <Link to="/projects" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#fafaf9]">
                      Projects
                    </Link>

                    <Link to="/settings" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#fafaf9]">
                      Settings
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* 🚪 NOT LOGGED IN */
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#2d3748] hover:bg-[#1f2937]"
              >
                Sign in
              </Link>
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