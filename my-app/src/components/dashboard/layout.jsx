// src/components/dashboard/layout.jsx

import { useState } from "react";
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
export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isHomepage = pathname === "/";
  const showSidebar = Boolean(user) && !isHomepage;

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <TopBar
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((o) => !o)}
        showHamburger={showSidebar}
      />

      <div className="flex">
        {showSidebar && (
          <Sidebar
            mobileNavOpen={mobileNavOpen}
            onCloseMobileNav={() => setMobileNavOpen(false)}
          />
        )}

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}