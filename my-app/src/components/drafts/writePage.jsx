import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { WriteEditor, ThesaurusDrawer } from "./writeeditorshared";
import { StartGroupSprintModal } from "../sprint/groupSprintModal";

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WritePage() {
  const { draftId: paramDraftId } = useParams();
  const navigate                  = useNavigate();
  const isNew = !paramDraftId;

  // Track the active draft ID; may be updated after first save of a new draft
  const [activeDraftId, setActiveDraftId] = useState(paramDraftId || null);

  // Word count display
  const [wordCount, setWordCount] = useState(0);

  // UI
  const [focusMode, setFocusMode]         = useState(false);
  const [thesaurusOpen, setThesaurusOpen] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [toast, setToast]                 = useState(null);
  const [sprintOpen, setSprintOpen]       = useState(false);

  // saveRef — WriteEditor will set this to a function that triggers a save
  // so the top-bar Save button can call it directly
  const saveRef = useRef(null);

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

      // Promote new draft — update state + URL without adding to history
      if (!draftId && savedId) {
        setActiveDraftId(savedId);
        window.history.replaceState({}, "", `/write/${savedId}`);
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
  }, []);

  // Manual save: call the function WriteEditor registered in saveRef
  function handleManualSave() {
    if (saveRef.current) {
      saveRef.current({ isManual: true });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f5f0e8" }}>

      {/* ── Sticky write top bar ── */}
      {!focusMode && (
        <div className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 border-b border-[#e8dcc8] bg-[#faf7f2]/95 backdrop-blur-sm">

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

      {/* ── Focus mode strip ── */}
      {focusMode && (
        <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-2.5 bg-[#faf7f2]/90 backdrop-blur-sm border-b border-[#e8dcc8]">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-[#9a8c7a] uppercase tracking-widest">Focus mode</span>
            <span className="text-xs text-[#b8a898] tabular-nums">{wordCount.toLocaleString()} words</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setThesaurusOpen(o => !o)}
              title="Thesaurus"
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                thesaurusOpen ? "bg-[#2d3748] text-white" : "text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8]"
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
            <button
              onClick={handleManualSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#2d3748] text-white rounded-lg text-xs font-semibold hover:bg-[#3d4f64] transition-all disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setFocusMode(false)}
              className="ml-1 text-xs text-[#9a8c7a] hover:text-[#2d3748] transition-colors">
              Exit
            </button>
          </div>
        </div>
      )}

      {/* ── Editor area ── */}
      <main className={`flex-1 overflow-y-auto ${focusMode ? "pt-11" : ""}`}>
        {/* Constrain width; shift left slightly when thesaurus is open to avoid overlap */}
        <div className={`mx-auto transition-all duration-300 ${
          thesaurusOpen ? "max-w-2xl" : "max-w-3xl"
        }`}>
          <div
            className="bg-white border-x border-[#e8dcc8] min-h-screen"
            style={{ boxShadow: "0 0 40px rgba(0,0,0,0.04)" }}>
            <WriteEditor
              draftId={activeDraftId}
              onWordsUpdate={setWordCount}
              onAutoSave={handleSave}
              onDraftLoaded={setWordCount}
              saveRef={saveRef}
            />
          </div>
        </div>
      </main>

      {/* ── Thesaurus drawer ── */}
      <ThesaurusDrawer
        isOpen={thesaurusOpen}
        onClose={() => setThesaurusOpen(false)}
      />

      {/* ── Sprint modal ── */}
      <StartGroupSprintModal
        isOpen={sprintOpen}
        onClose={() => setSprintOpen(false)}
        onCreated={(groupSprint, isInkwell) => {
          setSprintOpen(false);
          navigate(`/group-sprint/${groupSprint.id}`, {
            state: { writingMode: isInkwell ? "inkwell" : "external", draftId: activeDraftId }
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
  );
}