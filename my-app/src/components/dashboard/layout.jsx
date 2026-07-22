// src/components/dashboard/layout.jsx

import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./topBar";
import { Sidebar } from "./sidebar";
import { useAuth } from "../auth/authContext";

// Wraps every page (public and authenticated alike). TopBar is the plain
// horizontal brand strip (logo only); Sidebar holds all navigation and
// becomes an off-canvas drawer on mobile, toggled by TopBar's hamburger.
// <Outlet/> swaps in whichever route's page component is currently active.
// Add new routes under this layout in main.jsx — never inside individual
// page files.
//
// The sidebar is dashboard navigation for logged-in writers — guests have
// no account to navigate to (no draft plan, no messages, no settings), so
// it's hidden for them on every route, not just the homepage. This also
// covers guests mid-wizard on /draftplan/new or /days-challenge/new, or on
// any other route they reach before signing up.
//
// It's also hidden whenever the active page's own "focus mode" is on (the
// write page and the group sprint workspace both have one) — those pages
// can't reach up into this layout directly, so they report their focus
// state back through the Outlet context's setLayoutFocusMode setter. This
// state resets on every route change so it can never get stuck hiding the
// sidebar if a page unmounts without explicitly turning focus mode back off.
export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pageFocusMode, setPageFocusMode] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isHomepage = pathname === "/";
  const showSidebar = Boolean(user) && !isHomepage && !pageFocusMode;

  // Guard against a stale "true" surviving a navigation away from a page
  // that had focus mode on (e.g. clicking a link instead of exiting focus
  // mode first).
  useEffect(() => {
    setPageFocusMode(false);
  }, [pathname]);

  return (
    <div className="h-dvh flex flex-col bg-[#fafaf9] overflow-hidden">
      <TopBar
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((o) => !o)}
        showHamburger={showSidebar}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showSidebar && (
          <Sidebar
            mobileNavOpen={mobileNavOpen}
            onCloseMobileNav={() => setMobileNavOpen(false)}
          />
        )}

        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          <Outlet context={{ setLayoutFocusMode: setPageFocusMode }} />
        </div>
      </div>
    </div>
  );
}