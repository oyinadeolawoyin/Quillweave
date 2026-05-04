import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { useState, useEffect, useRef } from "react";
import API_URL from "@/config/api";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [activeEvents, setActiveEvents] = useState([]);
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);
  const [eventsMobileOpen, setEventsMobileOpen] = useState(false);
  const eventsDropdownRef = useRef(null);

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
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (eventsDropdownRef.current && !eventsDropdownRef.current.contains(e.target)) {
        setEventsDropdownOpen(false);
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
        const unreadCount = data.notifications.filter(n => n.read === false || n.read === null).length;
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
    { to: "/discovery", label: "Discovery" },
    { to: "/feedback", label: "Feedback" },
    { to: "/blog", label: "Blog" },
    ...(user ? [{ to: "/projects", label: "Projects" }] : []),
  ];

  function isActive(to) {
    return pathname === to || pathname.startsWith(to + "/");
  }

  const isEventsActive = pathname.startsWith("/events");

  function getEventTypeLabel(type) {
    if (type === "DAYS_CHALLENGE") return "Challenge";
    if (type === "WORKSHOP") return "Workshop";
    if (type === "ANNOUNCEMENT") return "Announcement";
    return "Event";
  }

  function daysLeft(endDate) {
    if (!endDate) return null;
    const d = Math.max(0, Math.ceil((new Date(endDate) - Date.now()) / (1000 * 60 * 60 * 24)));
    return d === 0 ? "Last day" : `${d}d left`;
  }

  return (
    <>
      <header className="bg-white border-b border-[#e5e5e5] sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-[4.5rem]">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
              <span className="text-2xl">🖋️</span>
              <span className="text-xl font-serif text-[#2d3748] tracking-tight">Inkwell</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden sm:flex items-center gap-1">
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

              {/* Events dropdown */}
              <div className="relative" ref={eventsDropdownRef}>
                <button
                  onClick={() => setEventsDropdownOpen(o => !o)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isEventsActive || eventsDropdownOpen
                      ? "text-[#2d3748] bg-[#f7f4ee]"
                      : "text-[#737373] hover:text-[#2d3748] hover:bg-[#fafaf9]"
                  }`}
                >
                  Events
                  {activeEvents.length > 0 && (
                    <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />
                  )}
                  <svg
                    className={`w-3 h-3 transition-transform ${eventsDropdownOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {eventsDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[#e5e5e5] rounded-2xl shadow-xl overflow-hidden z-50"
                    style={{ boxShadow: "0 8px 32px rgba(45,55,72,0.12)" }}>
                    {activeEvents.length > 0 ? (
                      <>
                        <div className="px-4 pt-3 pb-2">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-[#9a8c7a]">Active Events</p>
                        </div>
                        <div className="pb-2">
                          {activeEvents.map(ev => (
                            <Link
                              key={ev.id}
                              to={`/events/${ev.id}`}
                              onClick={() => setEventsDropdownOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-[#faf7f2] transition-colors"
                            >
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2d3748] to-[#4a5568] flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-sm">{ev.type === "DAYS_CHALLENGE" ? "🔥" : ev.type === "WORKSHOP" ? "🎓" : "📣"}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#2d3748] truncate">{ev.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-semibold text-[#d4af37] bg-[#fdf8e7] px-1.5 py-0.5 rounded-full border border-[#f0d98a]">
                                    {getEventTypeLabel(ev.type)}
                                  </span>
                                  {ev.endDate && (
                                    <span className="text-[10px] text-[#9a8c7a]">{daysLeft(ev.endDate)}</span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <div className="border-t border-[#f0ebe3] px-4 py-2.5">
                          <Link
                            to="/events"
                            onClick={() => setEventsDropdownOpen(false)}
                            className="text-xs font-semibold text-[#2d3748] hover:text-[#d4af37] transition-colors"
                          >
                            View all events →
                          </Link>
                        </div>
                      </>
                    ) : (
                      <div className="px-4 py-5 text-center">
                        <p className="text-sm text-[#9a8c7a]">No active events right now</p>
                        <Link
                          to="/events"
                          onClick={() => setEventsDropdownOpen(false)}
                          className="text-xs font-semibold text-[#2d3748] hover:underline mt-1 block"
                        >
                          Browse past events
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>

            {/* Desktop Right Side */}
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <>
                  <Link
                    to="/notifications"
                    className="relative p-2 rounded-lg text-[#737373] hover:text-[#2d3748] hover:bg-[#f7f4ee] transition-colors"
                    aria-label="Notifications"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {notificationCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-[#d4af37] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {notificationCount > 9 ? "9+" : notificationCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to={`/profile/${user.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#f7f4ee] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#2d3748] flex items-center justify-center text-white text-sm font-semibold shrink-0 overflow-hidden">
                      {user?.avatar
                        ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                        : <span>{user?.username?.charAt(0).toUpperCase() || "U"}</span>
                      }
                    </div>
                    <span className="text-sm font-medium text-[#2d3748] hidden lg:block max-w-[120px] truncate">
                      {user?.username}
                    </span>
                  </Link>

                  <Link to="/settings" className="px-3 py-1.5 text-sm text-[#737373] hover:text-[#2d3748] transition-colors rounded-lg hover:bg-[#f7f4ee]">
                    Settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm text-[#737373] hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  >
                    Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-[#737373] hover:text-[#2d3748] transition-colors rounded-lg hover:bg-[#fafaf9]"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="px-5 py-2 bg-[#2d3748] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all shadow-sm"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Right Side */}
            <div className="flex sm:hidden items-center gap-2">
              {user && (
                <Link to="/notifications" className="relative p-2 text-[#737373]" aria-label="Notifications">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-[#d4af37] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-lg text-[#2d3748] hover:bg-[#f7f4ee] transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-[#e5e5e5] bg-white">
            <div className="max-w-5xl mx-auto px-4 py-3 space-y-1">
              {navItems.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive(to)
                      ? "text-[#2d3748] bg-[#f7f4ee]"
                      : "text-[#4a4a4a] hover:bg-[#fafaf9]"
                  }`}
                >
                  {label}
                </Link>
              ))}

              {/* Events section — accordion on mobile */}
              <div>
                <button
                  onClick={() => setEventsMobileOpen(o => !o)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isEventsActive ? "text-[#2d3748] bg-[#f7f4ee]" : "text-[#4a4a4a] hover:bg-[#fafaf9]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    Events
                    {activeEvents.length > 0 && (
                      <span className="text-[10px] bg-[#fdf8e7] text-[#b8962e] border border-[#f0d98a] px-2 py-0.5 rounded-full font-semibold">
                        {activeEvents.length} active
                      </span>
                    )}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform text-[#9a8c7a] ${eventsMobileOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {eventsMobileOpen && (
                  <div className="mt-1 ml-4 space-y-1 border-l-2 border-[#f0ebe3] pl-3">
                    {activeEvents.length > 0 ? (
                      <>
                        {activeEvents.map(ev => (
                          <Link
                            key={ev.id}
                            to={`/events/${ev.id}`}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#4a4a4a] hover:bg-[#faf7f2] transition-colors"
                          >
                            <span>{ev.type === "DAYS_CHALLENGE" ? "🔥" : ev.type === "WORKSHOP" ? "🎓" : "📣"}</span>
                            <span className="flex-1 truncate font-medium">{ev.title}</span>
                            {ev.endDate && (
                              <span className="text-[10px] text-[#9a8c7a] flex-shrink-0">{daysLeft(ev.endDate)}</span>
                            )}
                          </Link>
                        ))}
                        <Link
                          to="/events"
                          className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#d4af37] hover:bg-[#faf7f2] transition-colors"
                        >
                          View all events →
                        </Link>
                      </>
                    ) : (
                      <Link
                        to="/events"
                        className="block px-3 py-2 rounded-xl text-sm text-[#9a8c7a] hover:bg-[#faf7f2] transition-colors"
                      >
                        Browse events
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-[#e5e5e5] my-2" />

              {user ? (
                <>
                  <Link
                    to={`/profile/${user.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#4a4a4a] hover:bg-[#fafaf9]"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#2d3748] flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
                      {user?.avatar
                        ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                        : <span>{user?.username?.charAt(0).toUpperCase() || "U"}</span>
                      }
                    </div>
                    <span>{user?.username}</span>
                    <span className="ml-auto text-xs text-[#737373]">Profile</span>
                  </Link>
                  <Link to="/settings" className="block px-4 py-2.5 rounded-xl text-sm font-medium text-[#4a4a4a] hover:bg-[#fafaf9]">
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-4 py-2.5 rounded-xl text-sm font-medium text-[#4a4a4a] hover:bg-[#fafaf9]">
                    Sign In
                  </Link>
                  <Link to="/signup" className="block px-4 py-2.5 rounded-xl text-sm font-medium text-center bg-[#2d3748] text-white hover:opacity-90">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}