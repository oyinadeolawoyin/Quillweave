import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { WriteEditor, ThesaurusDrawer } from "./writeeditorshared";
import { StartGroupSprintModal } from "../sprint/groupSprintModal";
import {
  useStickyNotes,
  useHandwrittenFont,
  StickyNotesPanel,
  ParagraphStickyOverlay,
  DraftStickyNotesButton,
} from "./stickynotes"

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium ${
      type === "error" ? "bg-red-600 text-white" : "bg-[#2d3748] text-white"
    }`}>
      {type === "success" && (
        <svg className="w-4 h-4 text-[#d4af37] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Entries sidebar ──────────────────────────────────────────────────────────
// Mirrors a familiar journal-app sidebar: search, a prominent "new entry"
// action, and a scrollable list of the writer's drafts. Slides in/out as an
// off-canvas panel on mobile (behind a hamburger button); pinned open on
// larger screens.

function EntriesSidebar({ isOpen, onClose, activeDraftId }) {
  const navigate = useNavigate();
  const [drafts, setDrafts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/drafts/sprint-picker`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { drafts: [] })
      .then(d => setDrafts(d.drafts || []))
      .catch(() => setDrafts([]))
      .finally(() => setLoading(false));
  }, [activeDraftId]);

  const filtered = drafts.filter(d =>
    (d.title || "Untitled").toLowerCase().includes(search.trim().toLowerCase())
  );

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function goTo(path) {
    navigate(path);
    onClose();
  }

  return (
    <>
      {/* Mobile backdrop — tap outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed lg:relative top-0 left-0 h-screen w-72 flex-shrink-0 z-40 lg:z-auto bg-[#232b38] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Search + mobile close */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex-1 relative">
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 114 10.5a6.5 6.5 0 0113 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search drafts…"
              className="w-full pl-8 pr-2 py-1.5 text-xs bg-white/10 text-white placeholder-white/40 rounded-lg focus:outline-none focus:bg-white/15 transition-all"
            />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New draft */}
        <div className="px-3 py-3 flex-shrink-0">
          <button
            onClick={() => goTo("/write")}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#d4af37] hover:brightness-105 text-[#2d3748] rounded-lg text-sm font-bold transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New draft
          </button>
        </div>

        {/* View all drafts */}
        <button
          onClick={() => goTo("/drafts")}
          className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg text-xs font-medium transition-all flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          View all drafts
        </button>

        {/* Entries list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-xs text-white/40">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-white/40 text-center py-8">No drafts found.</p>
          ) : filtered.map(d => (
            <button
              key={d.id}
              onClick={() => goTo(`/write/${d.id}`)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                d.id === activeDraftId ? "bg-[#d4af37]/20" : "hover:bg-white/5"
              }`}>
              <p className={`text-sm truncate ${d.id === activeDraftId ? "text-white font-semibold" : "text-white/80"}`}>
                {d.title || <span className="italic text-white/40">Untitled</span>}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">
                {formatDate(d.updatedAt)} · {(d.wordCount || 0).toLocaleString()} words
              </p>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WritePage() {
  const { draftId: paramDraftId } = useParams();
  const navigate                  = useNavigate();
  const { setLayoutFocusMode }    = useOutletContext();
  const isNew = !paramDraftId;

  // Track the active draft ID; may be updated after first save of a new draft
  const [activeDraftId, setActiveDraftId] = useState(paramDraftId || null);

  // Word count display
  const [wordCount, setWordCount] = useState(0);
  const [createdAt, setCreatedAt] = useState(null);

  function formatCreatedAt(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  // UI
  const [focusMode, setFocusMode]         = useState(false);
  const [thesaurusOpen, setThesaurusOpen] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [toast, setToast]                 = useState(null);
  const [sprintOpen, setSprintOpen]       = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false); // mobile off-canvas toggle

  // saveRef — WriteEditor will set this to a function that triggers a save
  // so the top-bar Save button can call it directly
  const saveRef = useRef(null);

  // ── Sticky notes ──────────────────────────────────────────────────────────
  // contentRef exposes the editor's raw contentEditable DOM node (WriteEditor
  // already supports this prop) so the paragraph overlay can walk its
  // children; sheetRef is the positioned "sheet of paper" wrapper the badges
  // are placed relative to.
  useHandwrittenFont();
  const editorContentRef = useRef(null);
  const sheetRef         = useRef(null);
  // Off by default — the paragraph overlay (and its per-paragraph plus
  // buttons) only mounts once this is switched on, same as the sprint
  // workspace. Previously it was always mounted, which is what made the
  // plus buttons feel slow to show up.
  const [stickyNotesOn, setStickyNotesOn] = useState(false);
  const [stickyPanel, setStickyPanel] = useState(null); // null | { paragraphIndex: number|null }
  const {
    draftNotes,
    notesByParagraph,
    createNote: createStickyNote,
    updateNote: updateStickyNote,
    deleteNote: deleteStickyNote,
  } = useStickyNotes(activeDraftId);

  const stickyScopeNotes = stickyPanel
    ? (stickyPanel.paragraphIndex === null ? draftNotes : (notesByParagraph.get(stickyPanel.paragraphIndex) || []))
    : [];
  const stickyScopeLabel = stickyPanel
    ? (stickyPanel.paragraphIndex === null ? "Whole draft" : `Paragraph ${stickyPanel.paragraphIndex + 1}`)
    : "";

  // Keep activeDraftId in sync with the URL param, and force a clean remount
  // of the editor (via editorInstanceKey below) — but only on a *real*
  // navigation (New draft / picking another draft), not on the silent
  // URL update that happens the moment a brand-new draft gets its first
  // save. Without this distinction, that silent update would yank the
  // editor out from under the writer mid-keystroke.
  const hasMountedRef      = useRef(false);
  const skipNextRemountRef = useRef(false);
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);

  useEffect(() => {
    setActiveDraftId(paramDraftId || null);
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (skipNextRemountRef.current) {
      skipNextRemountRef.current = false;
      return;
    }
    setEditorInstanceKey(k => k + 1);
  }, [paramDraftId]);

  // ── API save handler ──────────────────────────────────────────────────────
  // Called by WriteEditor's 30s interval AND our manual Save button (via saveRef).
  const handleSave = useCallback(async ({ draftId, title, content, isManual = false }) => {
    setSaving(true);
    try {
      let res;
      if (draftId) {
        res = await fetch(`${API_URL}/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, content }),
        });
      } else {
        res = await fetch(`${API_URL}/drafts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, content }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Save failed");
      }

      const data = await res.json();
      const savedId = data.draft?.id || draftId;

      // Promote new draft — update state + URL without adding to history.
      // Uses React Router's own navigate (not raw window.history.replaceState)
      // so useParams()/paramDraftId actually learns about the new URL — a
      // plain history.replaceState call left the router thinking it was
      // still on the old URL, which is why later clicking "New draft" did
      // nothing (the router saw no path change to react to).
      if (!draftId && savedId) {
        setActiveDraftId(savedId);
        skipNextRemountRef.current = true;
        navigate(`/write/${savedId}`, { replace: true });
      }

      if (isManual) {
        setToast({ message: "Draft saved.", type: "success" });
      }

      return { id: savedId };
    } catch (err) {
      setToast({ message: err.message || "Couldn't save. Check your connection.", type: "error" });
      throw err;
    } finally {
      setSaving(false);
    }
  }, [navigate]);
  function handleManualSave() {
    if (saveRef.current) {
      saveRef.current({ isManual: true });
    }
  }

  // Let Escape exit focus mode from anywhere, in case the small "Exit" control
  // in the top strip isn't noticed.
  useEffect(() => {
    if (!focusMode) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setFocusMode(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusMode]);

  // Report focus mode up to Layout so the dashboard sidebar hides too —
  // this page's own EntriesSidebar (the drafts list) is separate from that
  // and already handles itself above, but the outer nav needs telling
  // explicitly. Layout resets this on every route change on its own, so
  // there's no cleanup needed here beyond keeping it in sync while mounted.
  useEffect(() => {
    setLayoutFocusMode?.(focusMode);
  }, [focusMode, setLayoutFocusMode]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden flex">
      {/* Hidden entirely in focus mode — not just visually, since a translated
          -x-full sidebar on lg screens still keeps its layout width (it's
          "lg:relative", so it stays in the flex flow), leaving a blank gap
          next to the page instead of letting the editor take the full width. */}
      {!focusMode && (
        <EntriesSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeDraftId={activeDraftId}
        />
      )}

      <div
        className="flex-1 flex flex-col overflow-hidden min-w-0"
        style={{
          backgroundColor: "#c4915c",
          backgroundImage: `
            repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 96px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 2px, transparent 2px, transparent 96px),
            radial-gradient(ellipse at top, rgba(255,255,255,0.10), transparent 60%),
            linear-gradient(180deg, #d3a06a 0%, #bd875099 40%, #ab763f 100%)
          `,
        }}
      >

      {/* ── Sticky write top bar ── */}
      {!focusMode && (
        <div className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 border-b border-[#e8dcc8] bg-[#faf7f2]/95 backdrop-blur-sm">

          {/* Hamburger — opens the drafts sidebar on mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            title="Your drafts"
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#7a6a50] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Back to drafts */}
          <button
            onClick={() => navigate("/drafts")}
            className="flex items-center gap-1.5 text-sm text-[#7a6a50] hover:text-[#2d3748] transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">Drafts</span>
          </button>

          <div className="w-px h-4 bg-[#e8dcc8] flex-shrink-0" />

          {/* Label */}
          <p className="flex-1 min-w-0 text-xs text-[#9a8c7a] font-semibold uppercase tracking-wider truncate">
            {isNew && !activeDraftId ? "New draft" : "Editing draft"}
          </p>

          {/* Created date */}
          {createdAt && (
            <span className="text-xs text-[#b8a898] flex-shrink-0 hidden md:inline-block">
              Created {formatCreatedAt(createdAt)}
            </span>
          )}

          {/* Word count */}
          <span className="text-xs text-[#b8a898] tabular-nums flex-shrink-0 hidden sm:inline-block">
            {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
          </span>

          {/* Focus mode */}
          <button
            onClick={() => setFocusMode(true)}
            title="Enter focus mode"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          {/* Thesaurus toggle */}
          <button
            onClick={() => setThesaurusOpen(o => !o)}
            title="Open thesaurus"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
              thesaurusOpen
                ? "bg-[#2d3748] text-white"
                : "text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8]"
            }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>

          {/* Sticky notes — off by default; turns on the paragraph badges */}
          <button
            onClick={() => { setStickyNotesOn(o => !o); setStickyPanel(null); }}
            title={stickyNotesOn ? "Turn off sticky notes" : "Turn on sticky notes"}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium flex-shrink-0 ${
              stickyNotesOn ? "border-[#2d3748] bg-[#2d3748] text-white" : "border-[#e8dcc8] text-[#7a6a50] hover:border-[#c9b090] hover:bg-[#f0e8d8]"
            }`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h10a2 2 0 012 2v13l-4 3-4-3-4 3-2-1.5V5a2 2 0 012-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h6" />
            </svg>
            <span className="hidden sm:inline">Sticky notes</span>
          </button>

          {/* Sticky notes toggle — draft-overall notes */}
          {stickyNotesOn && (
            <DraftStickyNotesButton
              count={draftNotes.length}
              isOpen={!!stickyPanel && stickyPanel.paragraphIndex === null}
              onClick={() => setStickyPanel(p =>
                p && p.paragraphIndex === null ? null : { paragraphIndex: null }
              )}
            />
          )}

          {/* Continue in sprint */}
          <button
            onClick={() => setSprintOpen(true)}
            title="Continue writing in a sprint"
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#e8dcc8] text-[#7a6a50] rounded-lg text-xs font-semibold hover:border-[#2d3748] hover:text-[#2d3748] transition-all flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sprint
          </button>

          {/* Save button */}
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2d3748] text-white rounded-lg text-xs font-semibold hover:bg-[#3d4f64] transition-all disabled:opacity-50 flex-shrink-0">
            {saving ? (
              <>
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Floating exit-focus button ──
           Always-visible, thumb-sized tap target for touch/mobile users —
           doesn't depend on the top strip having room to show its own
           "Exit focus" button, and doesn't rely on the Esc key. ── */}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          title="Exit focus mode"
          aria-label="Exit focus mode"
          className="fixed bottom-5 left-5 z-40 w-12 h-12 rounded-full bg-[#2d3748] text-white shadow-xl flex items-center justify-center hover:bg-[#3d4f64] active:scale-95 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* ── Focus mode strip ── */}
      {focusMode && (
        <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-5 py-2.5 bg-[#faf7f2]/90 backdrop-blur-sm border-b border-[#e8dcc8]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden sm:inline text-[10px] font-semibold text-[#9a8c7a] uppercase tracking-widest">Focus mode</span>
            <span className="text-xs text-[#b8a898] tabular-nums flex-shrink-0">{wordCount.toLocaleString()} words</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setThesaurusOpen(o => !o)}
              title="Thesaurus"
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                thesaurusOpen ? "bg-[#2d3748] text-white" : "text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8]"
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
            <button
              onClick={handleManualSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#2d3748] text-white rounded-lg text-xs font-semibold hover:bg-[#3d4f64] transition-all disabled:opacity-50 flex-shrink-0">
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setFocusMode(false)}
              title="Exit focus mode (Esc)"
              className="ml-1 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#e8dcc8] text-xs font-semibold text-[#7a6a50] hover:border-[#2d3748] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Exit focus</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Editor area ── */}
      <main className={`flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-12 ${focusMode ? "pt-20" : ""}`}>
        {/* Constrain width; shift left slightly when thesaurus is open to avoid overlap */}
        <div className={`mx-auto transition-all duration-300 ${
          thesaurusOpen ? "max-w-3xl" : "max-w-4xl"
        }`}>
          {/* "Sheet of paper" — sharp corners, white, lifted off the wood with a deep shadow.
               Positioned relatively so the sticky-note paragraph badges (absolute) line up. */}
          <div
            ref={sheetRef}
            className="relative bg-white border border-[#e2d3b5] min-h-[75vh]"
            style={{ boxShadow: "0 30px 60px -15px rgba(35,22,8,0.45), 0 10px 24px rgba(35,22,8,0.22)" }}>
            <WriteEditor
              key={editorInstanceKey}
              draftId={activeDraftId}
              contentRef={editorContentRef}
              onWordsUpdate={setWordCount}
              onAutoSave={handleSave}
              onDraftLoaded={(wc, draftCreatedAt) => { setWordCount(wc); setCreatedAt(draftCreatedAt); }}
              saveRef={saveRef}
              showBlockTool={false}
            />

            {/* Hidden-until-clicked paragraph note badges, in the left margin —
                 only mounted once "Sticky notes" is turned on */}
            {stickyNotesOn && (
              <ParagraphStickyOverlay
                editorRef={editorContentRef}
                wrapperRef={sheetRef}
                notesByParagraph={notesByParagraph}
                onSelectParagraph={(index) => setStickyPanel(p =>
                  p && p.paragraphIndex === index ? null : { paragraphIndex: index }
                )}
              />
            )}
          </div>
        </div>
      </main>

      {/* ── Thesaurus drawer ── */}
      <ThesaurusDrawer
        isOpen={thesaurusOpen}
        onClose={() => setThesaurusOpen(false)}
      />

      {/* ── Sticky notes panel ── */}
      <StickyNotesPanel
        isOpen={!!stickyPanel}
        onClose={() => setStickyPanel(null)}
        scopeLabel={stickyScopeLabel}
        scopeNotes={stickyScopeNotes}
        onCreate={(payload) => createStickyNote({ ...payload, paragraphIndex: stickyPanel?.paragraphIndex ?? null })}
        onUpdate={updateStickyNote}
        onDelete={deleteStickyNote}
      />

      {/* ── Sprint modal ── */}
      <StartGroupSprintModal
        isOpen={sprintOpen}
        onClose={() => setSprintOpen(false)}
        onCreated={(groupSprint, isQuillweave) => {
          setSprintOpen(false);
          navigate(`/group-sprint/${groupSprint.id}`, {
            state: { writingMode: isQuillweave ? "quillweave" : "external", draftId: activeDraftId }
          });
        }}
        prefillDraftId={activeDraftId}
      />

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      </div>
    </div>
  );
}