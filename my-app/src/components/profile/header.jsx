import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { useState, useEffect } from "react";
import API_URL from "@/config/api";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotificationCount();
      // Poll every 30 seconds for new notifications
      const interval = setInterval(fetchNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function fetchNotificationCount() {
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        // Count unread notifications (where read is false or null)
        const unreadCount = data.notifications.filter(
          n => n.read === false || n.read === null
        ).length;
        setNotificationCount(unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="bg-white border-b border-ink-lightgray sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl sm:text-3xl">🖋️</span>
            <h1 className="text-xl sm:text-2xl font-serif text-ink-primary">
              Inkwell
            </h1>
          </Link>

          {/* Not Authenticated */}
          {!user ? (
            <div className="flex items-center gap-3 sm:gap-5">
              <Link
                to="/blog"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/blog" || pathname.startsWith("/blog/")
                    ? "text-ink-primary"
                    : "text-ink-lightgray hover:text-ink-primary"
                }`}
              >
                Blog
              </Link>
              <Link
                to="/about"
                className={`hidden sm:inline text-sm font-medium transition-colors ${
                  pathname === "/about"
                    ? "text-ink-primary"
                    : "text-ink-lightgray hover:text-ink-primary"
                }`}
              >
                About
              </Link>
              <Link
                to="/services"
                className={`hidden sm:inline text-sm font-medium transition-colors ${
                  pathname === "/services"
                    ? "text-ink-primary"
                    : "text-ink-lightgray hover:text-ink-primary"
                }`}
              >
                Services
              </Link>
              <Link
                to="/login"
                className="hidden sm:inline text-sm text-ink-gray hover:text-ink-primary transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-ink-primary text-white rounded-lg font-medium
                         hover:bg-opacity-90 transition-all shadow-soft text-sm"
              >
                Get Started
              </Link>
            </div>
          ) : (
            <>
              {/* Authenticated - Desktop */}
              <div className="hidden sm:flex items-center gap-4 lg:gap-6">
                {/* Notification Bell with Badge */}
                <Link
                  to="/notifications"
                  className="relative p-2 text-ink-gray hover:text-ink-primary transition-colors rounded-lg hover:bg-ink-cream"
                  aria-label="Notifications"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {/* Notification Badge */}
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-ink-gold text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-cream transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-ink-primary flex items-center justify-center text-white font-medium">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    {/* Username */}
                    <span className="text-sm font-medium text-ink-primary hidden lg:block">
                      {user?.username}
                    </span>
                    {/* Dropdown arrow */}
                    <svg
                      className={`w-4 h-4 text-ink-gray transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                      />

                      {/* Menu */}
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-soft-lg border border-ink-lightgray z-20 py-2">
                        <div className="px-4 py-3 border-b border-ink-lightgray">
                          <p className="text-sm font-medium text-ink-primary">{user?.username}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>

                        <Link
                          to={`/profile/${user.id}`}
                          className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                          onClick={() => setShowDropdown(false)}
                        >
                          Profile
                        </Link>

                        <Link
                          to="/dashboard"
                          className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                          onClick={() => setShowDropdown(false)}
                        >
                          Dashboard
                        </Link>

                        <Link
                          to="/missions"
                          className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                          onClick={() => setShowDropdown(false)}
                        >
                          Missions
                        </Link>

                        <Link
                          to="/blog"
                          className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                          onClick={() => setShowDropdown(false)}
                        >
                          Blog
                        </Link>

                        <Link
                          to="/about"
                          className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                          onClick={() => setShowDropdown(false)}
                        >
                          About
                        </Link>

                        <Link
                          to="/services"
                          className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                          onClick={() => setShowDropdown(false)}
                        >
                          Services
                        </Link>

                        <div className="border-t border-ink-lightgray mt-2 pt-2">
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Authenticated - Mobile */}
              <div className="flex sm:hidden items-center gap-3 relative">
                {/* Notification Bell - Mobile */}
                <Link
                  to="/notifications"
                  className="relative p-2 text-ink-gray hover:text-ink-primary transition-colors"
                  aria-label="Notifications"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {/* Notification Badge - Mobile */}
                  {notificationCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-ink-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </Link>

                {/* Profile Avatar - Mobile */}
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-8 h-8 rounded-full bg-ink-primary flex items-center justify-center text-white font-medium text-sm"
                >
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </button>

                {/* Dropdown Menu - Mobile */}
                {showDropdown && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDropdown(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-soft-lg border border-ink-lightgray z-20 py-2 top-full">
                      <div className="px-4 py-3 border-b border-ink-lightgray">
                        <p className="text-sm font-medium text-ink-primary">{user?.username}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>

                      <Link
                        to={`/profile/${user.id}`}
                        className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        Profile
                      </Link>

                      <Link
                        to="/dashboard"
                        className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        Dashboard
                      </Link>

                      <Link
                        to="/missions"
                        className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        Missions
                      </Link>

                      <Link
                        to="/blog"
                        className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        Blog
                      </Link>

                      <Link
                        to="/about"
                        className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        About
                      </Link>

                      <Link
                        to="/services"
                        className="block px-4 py-2 text-sm text-ink-gray hover:bg-ink-cream transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        Services
                      </Link>

                      <div className="border-t border-ink-lightgray mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
