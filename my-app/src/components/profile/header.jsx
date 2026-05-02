import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { useState, useEffect } from "react";
import API_URL from "@/config/api";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotificationCount();
      const interval = setInterval(fetchNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  async function handleLogout() {
    await logout();
    navigate("/login");
    setMobileOpen(false);
  }

  const navItems = [
    { to: "/snippets", label: "Community" },
    { to: "/discovery", label: "Discovery" },
    { to: "/feedback", label: "Feedback Hub" },
    { to: "/blog", label: "Blog" },
    ...(user ? [{ to: "/projects", label: "Projects" }] : []),
  ];

  function isActive(to) {
    return pathname === to || pathname.startsWith(to + "/");
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
                  } ${to === "/feedback-hub" ? "relative" : ""}`}
                >
                  {label}
                  {to === "/feedback-hub" && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#d4af37] rounded-full" />
                  )}
                </Link>
              ))}
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
                  {to === "/feedback-hub" && (
                    <span className="text-[10px] bg-[#fdf3d8] text-[#b8962e] border border-[#f0d98a] px-2 py-0.5 rounded-full font-semibold">
                      New
                    </span>
                  )}
                </Link>
              ))}

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