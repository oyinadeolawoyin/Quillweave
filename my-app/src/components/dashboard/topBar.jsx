// src/components/dashboard/topBar.jsx

import { Link } from "react-router-dom";

const HamburgerIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </svg>
);

const CloseIcon = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

// Plain horizontal strip — logo only, no nav/search, same idea as Scribophile's
// top bar. The sidebar handles all navigation; this is brand chrome plus the
// mobile sidebar toggle.
export function TopBar({ mobileNavOpen, onToggleMobileNav }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#e5e5e5]">
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #d4af37 0%, #f3dea0 50%, #d4af37 100%)" }} />
      <div className="flex items-center h-20 px-4 sm:px-6">
        {/* Hamburger — mobile only, toggles the sidebar */}
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="sm:hidden p-2 -ml-2 mr-1 rounded-lg text-[#2d3748] hover:bg-[#f7f4ee] transition-colors"
          aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileNavOpen}
        >
          {mobileNavOpen ? <CloseIcon /> : <HamburgerIcon />}
        </button>

        <Link to="/" className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" aria-hidden="true" />
          <span className="text-[22px] font-serif font-semibold tracking-wide text-[#2d3748]">
            Ink<span className="text-[#b8860b]">well</span>
          </span>
        </Link>
      </div>
    </header>
  );
}