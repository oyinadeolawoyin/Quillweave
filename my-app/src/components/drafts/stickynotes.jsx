import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import API_URL from "@/config/api";

// ═══════════════════════════════════════════════════════════════════════════
// Sticky Notes
//
// Writer-private "what do I want to fix/add here" notes. Two scopes:
//   - draft-overall  (paragraphIndex = null)
//   - paragraph      (paragraphIndex = 0-based position in the editor)
//
// Deliberately minimal per-note content: a colour, free text, and/or a short
// checklist. Nothing else — no threading, no visibility to critics. They only
// exist while the chapter is a WritingDraft, so the moment it's posted or
// republished to the Critique Hub the backing rows are gone — sticky notes
// never leak into the feedback stage. WritePage (this UI's only home) only
// ever renders WritingDraft records, so that's naturally where this lives.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Palette ──────────────────────────────────────────────────────────────────
// Real-paper pastel tones, each with a matching shadow/tape tint so the note
// reads as an actual physical sticky, not a flat colour chip.

export const STICKY_COLORS = {
  YELLOW: { bg: "#fff59d", edge: "#e8dd6a", tape: "rgba(255,255,255,0.55)", label: "Yellow" },
  PINK:   { bg: "#ffb3d1", edge: "#f28fb8", tape: "rgba(255,255,255,0.55)", label: "Pink"   },
  BLUE:   { bg: "#90caf9", edge: "#64b0ea", tape: "rgba(255,255,255,0.55)", label: "Blue"   },
  GREEN:  { bg: "#b9f6ca", edge: "#8fe8a8", tape: "rgba(255,255,255,0.55)", label: "Green"  },
  PURPLE: { bg: "#d7bbf5", edge: "#c096ea", tape: "rgba(255,255,255,0.55)", label: "Purple" },
  ORANGE: { bg: "#ffcc80", edge: "#f5ae4d", tape: "rgba(255,255,255,0.55)", label: "Orange" },
};
const COLOR_KEYS = Object.keys(STICKY_COLORS);

// Stable little "randomness" so a note doesn't jitter its rotation on every
// re-render, but different notes still look hand-placed rather than gridded.
function stableAngle(seed) {
  const n = Math.abs(Number(seed) || 0);
  return ((n * 37) % 9) - 4; // -4deg .. 4deg
}

// One-time Google Fonts injection for the handwritten note face.
let fontInjected = false;
function useHandwrittenFont() {
  useEffect(() => {
    if (fontInjected) return;
    fontInjected = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ─── Data hook ────────────────────────────────────────────────────────────────

export function useStickyNotes(draftId) {
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!draftId) { setNotes([]); return; }
    setLoading(true);
    fetch(`${API_URL}/drafts/${draftId}/sticky-notes`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { notes: [] })
      .then(d => setNotes(d.notes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [draftId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createNote = useCallback(async ({ paragraphIndex = null, color, text, items }) => {
    if (!draftId) throw new Error("Save your draft before adding sticky notes.");
    const res = await fetch(`${API_URL}/drafts/${draftId}/sticky-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ paragraphIndex, color, text, items }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Couldn't add sticky note.");
    setNotes(prev => [...prev, data.note]);
    return data.note;
  }, [draftId]);

  const updateNote = useCallback(async (noteId, patch) => {
    const res = await fetch(`${API_URL}/drafts/${draftId}/sticky-notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Couldn't update sticky note.");
    setNotes(prev => prev.map(n => n.id === noteId ? data.note : n));
    return data.note;
  }, [draftId]);

  const deleteNote = useCallback(async (noteId) => {
    const res = await fetch(`${API_URL}/drafts/${draftId}/sticky-notes/${noteId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Couldn't delete sticky note.");
    }
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, [draftId]);

  const draftNotes = useMemo(() => notes.filter(n => n.paragraphIndex === null), [notes]);
  const notesByParagraph = useMemo(() => {
    const map = new Map();
    for (const n of notes) {
      if (n.paragraphIndex === null) continue;
      if (!map.has(n.paragraphIndex)) map.set(n.paragraphIndex, []);
      map.get(n.paragraphIndex).push(n);
    }
    return map;
  }, [notes]);

  return { notes, draftNotes, notesByParagraph, loading, refresh, createNote, updateNote, deleteNote };
}

// ─── Paragraph detection ──────────────────────────────────────────────────────
// A contentEditable box doesn't reliably wrap every line in a block element —
// Firefox uses bare text + <br> for line breaks by default, and even Chrome
// leaves the very first line as a raw text node until you press Enter once.
// Relying on root.children (element children only) misses all of that, which
// is why a short, single-paragraph draft could end up with *no* detectable
// paragraphs at all. Instead we walk every child node (including text nodes)
// and group them into paragraphs ourselves:
//   - an existing block element (div/p/ul/li/h1-6/blockquote/pre) is its own
//     paragraph
//   - a run of loose text/inline nodes is one paragraph
//   - a <br> ends the current run (this is what Firefox uses as "Enter")
// Positioning then uses a DOM Range spanning each group's nodes rather than
// requiring the group to be a single element — Range creation doesn't touch
// the live selection, so it's safe to call on every keystroke.

const BLOCK_TAGS = new Set(["DIV", "P", "UL", "OL", "LI", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6", "PRE", "TABLE"]);

function isMeaningfulNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim().length > 0;
  if (node.nodeType === Node.ELEMENT_NODE) {
    return (node.textContent || "").trim().length > 0 || !!node.querySelector?.("img");
  }
  return false;
}

export function getParagraphGroups(root) {
  if (!root) return [];
  const groups = [];
  let current = [];
  const flush = () => { if (current.length) { groups.push(current); current = []; } };

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && node.dataset?.editorStyles) continue; // hidden style marker
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "HR") { flush(); continue; }
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") { flush(); continue; }

    if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.tagName)) {
      flush();
      groups.push([node]);
      continue;
    }

    current.push(node); // loose text or inline element (b/i/a/span/img/…)
  }
  flush();

  return groups.filter(group => group.some(isMeaningfulNode));
}

// Bounding rect (relative to a wrapper element) for a paragraph group. Uses a
// throwaway Range rather than moving the user's actual selection/cursor.
export function getGroupRect(group, wrapperRect) {
  const range = document.createRange();
  range.setStartBefore(group[0]);
  range.setEndAfter(group[group.length - 1]);
  const rect = range.getBoundingClientRect();
  return { top: rect.top - wrapperRect.top, left: rect.left - wrapperRect.left, height: rect.height };
}

// ─── Sticky note card (the actual "paper") ────────────────────────────────────

function StickyNoteCard({ note, onEdit, onDelete }) {
  const palette = STICKY_COLORS[note.color] || STICKY_COLORS.YELLOW;
  const angle = stableAngle(note.id);

  return (
    <div
      className="relative rounded-sm p-4 pt-6 group transition-transform duration-150 hover:z-10 hover:scale-[1.03] hover:rotate-0"
      style={{
        background: `linear-gradient(160deg, ${palette.bg} 0%, ${palette.bg} 80%, ${palette.edge} 100%)`,
        boxShadow: "2px 6px 14px rgba(35,22,8,0.28), 0 1px 0 rgba(255,255,255,0.4) inset",
        transform: `rotate(${angle}deg)`,
        fontFamily: "'Kalam', 'Comic Sans MS', cursive",
        minHeight: "120px",
      }}
    >
      {/* "Tape" strip across the top */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-5 rounded-[2px]"
        style={{ background: palette.tape, boxShadow: "0 1px 2px rgba(0,0,0,0.15)", transform: `rotate(${-angle * 0.6}deg)` }}
      />

      {/* Folded corner */}
      <div
        className="absolute bottom-0 right-0 w-0 h-0"
        style={{
          borderStyle: "solid",
          borderWidth: "0 0 16px 16px",
          borderColor: `transparent transparent transparent rgba(0,0,0,0.12)`,
        }}
      />

      {/* Controls — appear on hover */}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(note)}
          title="Edit note"
          className="w-5 h-5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-[#3a2f14]">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(note)}
          title="Delete note"
          className="w-5 h-5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-[#3a2f14]">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {note.text && (
        <p className="text-[15px] leading-snug text-[#3a2f14] whitespace-pre-wrap break-words">
          {note.text}
        </p>
      )}

      {note.items?.length > 0 && (
        <ul className={`space-y-1 ${note.text ? "mt-2" : ""}`}>
          {note.items.map((item, i) => (
            <li key={i} className="text-[14px] leading-snug text-[#3a2f14] flex gap-1.5">
              <span>–</span>
              <span className="break-words">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Composer (add / edit) ────────────────────────────────────────────────────

function NoteComposer({ initial, onSave, onCancel }) {
  const [color, setColor] = useState(initial?.color || "YELLOW");
  const [text, setText]   = useState(initial?.text || "");
  const [items, setItems] = useState(initial?.items?.length ? initial.items : []);
  const [itemDraft, setItemDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const palette = STICKY_COLORS[color];

  function addItem() {
    const v = itemDraft.trim();
    if (!v) return;
    setItems(prev => [...prev, v]);
    setItemDraft("");
  }
  function removeItem(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!text.trim() && items.length === 0) {
      setError("Add some text or at least one list item.");
      return;
    }
    setSaving(true); setError(null);
    try {
      await onSave({ color, text, items });
    } catch (e) {
      setError(e.message || "Couldn't save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-sm p-4"
      style={{ background: palette.bg, fontFamily: "'Kalam', 'Comic Sans MS', cursive", boxShadow: "2px 6px 14px rgba(35,22,8,0.28)" }}
    >
      {/* Colour swatches */}
      <div className="flex gap-1.5 mb-3">
        {COLOR_KEYS.map(key => (
          <button
            key={key}
            onClick={() => setColor(key)}
            title={STICKY_COLORS[key].label}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${color === key ? "scale-110 border-[#3a2f14]" : "border-white/70"}`}
            style={{ background: STICKY_COLORS[key].bg }}
          />
        ))}
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What do you want to fix or add here?"
        rows={3}
        className="w-full bg-transparent border-none outline-none resize-none text-[15px] text-[#3a2f14] placeholder-[#3a2f14]/50"
      />

      {items.length > 0 && (
        <ul className="space-y-1 mb-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[14px] text-[#3a2f14]">
              <span>–</span>
              <span className="flex-1 break-words">{item}</span>
              <button onClick={() => removeItem(i)} className="opacity-50 hover:opacity-100">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1.5 mt-1">
        <input
          value={itemDraft}
          onChange={e => setItemDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          placeholder="Add a checklist item…"
          className="flex-1 px-2 py-1 text-[13px] rounded bg-white/40 outline-none placeholder-[#3a2f14]/40 text-[#3a2f14]"
        />
        <button onClick={addItem} className="text-[13px] px-2 py-1 rounded bg-white/50 hover:bg-white/70 text-[#3a2f14] font-semibold">
          +
        </button>
      </div>

      {error && <p className="text-xs text-red-800 mt-2">{error}</p>}

      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded text-[#3a2f14]/70 hover:text-[#3a2f14]">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded bg-[#2d3748] text-white font-semibold hover:bg-[#3d4f64] disabled:opacity-50">
          {saving ? "Saving…" : (initial ? "Save changes" : "Add note")}
        </button>
      </div>
    </div>
  );
}

// ─── Right-side panel ──────────────────────────────────────────────────────────
// Same slide-in treatment as the Thesaurus drawer, so it feels native to the
// write page rather than bolted on.

export function StickyNotesPanel({
  isOpen,
  onClose,
  scopeLabel,          // "Whole draft" or "Paragraph 3"
  scopeNotes,          // notes for the current scope
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState(null); // note being edited, or null

  useEffect(() => { setComposerOpen(false); setEditing(null); }, [scopeLabel]);

  async function handleCreate(payload) {
    await onCreate(payload);
    setComposerOpen(false);
  }
  async function handleEditSave(payload) {
    await onUpdate(editing.id, payload);
    setEditing(null);
  }
  async function handleDelete(note) {
    await onDelete(note.id);
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />}

      <div className={`fixed right-0 top-0 h-full z-40 w-96 bg-[#faf7f2] border-l border-[#e8dcc8] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8dcc8] flex-shrink-0">
          <div>
            <p className="text-xs text-[#9a8c7a] font-semibold uppercase tracking-wider">Sticky notes</p>
            <p className="text-sm font-serif text-[#2d3748]">{scopeLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#f0ebe3] flex items-center justify-center text-[#9a8c7a] hover:bg-[#e8e0d0] hover:text-[#2d3748] transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {scopeNotes.length === 0 && !composerOpen && (
            <p className="text-xs text-[#b8a898] text-center py-8">
              No sticky notes here yet.
            </p>
          )}

          {scopeNotes.map(note => (
            editing?.id === note.id ? (
              <NoteComposer key={note.id} initial={editing} onSave={handleEditSave} onCancel={() => setEditing(null)} />
            ) : (
              <StickyNoteCard key={note.id} note={note} onEdit={setEditing} onDelete={handleDelete} />
            )
          ))}

          {composerOpen && (
            <NoteComposer onSave={handleCreate} onCancel={() => setComposerOpen(false)} />
          )}
        </div>

        {!composerOpen && (
          <div className="p-4 border-t border-[#e8dcc8] flex-shrink-0">
            <button
              onClick={() => setComposerOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#2d3748] text-white rounded-lg text-sm font-semibold hover:bg-[#3d4f64] transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add sticky note
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Paragraph badges overlay ─────────────────────────────────────────────────
// Sits over the editor and drops a small tab in the left margin next to any
// paragraph that has notes (or that's currently hovered, as an affordance to
// add one). Notes themselves stay hidden until a writer clicks the badge —
// they never render inline over the text.
//
// Props:
//   editorRef        — ref to the contentEditable root (from WriteEditor's
//                       contentRef prop)
//   wrapperRef        — ref to a *positioned* ancestor (position: relative)
//                       that the editor sits inside, used as the coordinate
//                       origin for badge placement
//   notesByParagraph  — Map<index, StickyNote[]>
//   onSelectParagraph — (index) => void, called when a badge is clicked

export function ParagraphStickyOverlay({ editorRef, wrapperRef, notesByParagraph, onSelectParagraph }) {
  const [badges, setBadges] = useState([]); // [{ index, top, left }]

  const recompute = useCallback(() => {
    const root = editorRef.current;
    const wrapper = wrapperRef.current;
    if (!root || !wrapper) { setBadges([]); return; }

    const groups = getParagraphGroups(root);
    const wrapperRect = wrapper.getBoundingClientRect();

    setBadges(groups.map((group, index) => {
      const { top, left } = getGroupRect(group, wrapperRect);
      const range = document.createRange();
      range.setStartBefore(group[0]);
      range.setEndAfter(group[group.length - 1]);
      const hasText = range.toString().trim().length > 0 || group.some(n => n.nodeType === Node.ELEMENT_NODE && n.querySelector?.("img"));
      return { index, top, left, hasText };
    }));
  }, [editorRef, wrapperRef]);

  useEffect(() => {
    recompute();
    const root = editorRef.current;
    if (!root) return;

    const mo = new MutationObserver(() => recompute());
    mo.observe(root, { childList: true, subtree: true, characterData: true });

    const ro = new ResizeObserver(() => recompute());
    ro.observe(root);

    window.addEventListener("resize", recompute);
    // The write page's editor area scrolls internally — listen broadly via
    // capture so we catch scroll on whichever ancestor actually moves.
    document.addEventListener("scroll", recompute, true);
    // Typing doesn't always fire a MutationObserver-visible change fast
    // enough (e.g. mid-word), so also recompute on plain input/keyup.
    root.addEventListener("input", recompute);
    root.addEventListener("keyup", recompute);

    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      document.removeEventListener("scroll", recompute, true);
      root.removeEventListener("input", recompute);
      root.removeEventListener("keyup", recompute);
    };
  }, [editorRef, recompute]);

  return (
    <div className="pointer-events-none absolute inset-0">
      {badges.filter(b => b.hasText || (notesByParagraph.get(b.index)?.length || 0) > 0).map(({ index, top, left }) => {
        const count = notesByParagraph.get(index)?.length || 0;
        // Sits inside the editor's own left padding (a fixed gutter, not
        // outside the sheet), so it's never clipped by the page edge and
        // always lands on visible white paper.
        const badgeLeft = Math.max(4, left - 28);
        return (
          <button
            key={index}
            onClick={() => onSelectParagraph(index)}
            title={count > 0 ? `${count} sticky note${count > 1 ? "s" : ""} on this paragraph` : "Add a sticky note to this paragraph"}
            className={`pointer-events-auto absolute w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-all ${
              count > 0
                ? "bg-[#fff59d] text-[#7a6a20] border border-[#e8dd6a] opacity-100"
                : "bg-[#faf7f2] text-[#9a8c7a] border-2 border-[#c9b494] opacity-80 hover:opacity-100 hover:border-[#2d3748] hover:text-[#2d3748]"
            }`}
            style={{ top: Math.max(0, top), left: badgeLeft }}
          >
            {count > 0 ? count : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Draft-level toggle button (for the top toolbar) ─────────────────────────

export function DraftStickyNotesButton({ count, isOpen, onClick }) {
  return (
    <button
      data-tour="tour-sticky"
      onClick={onClick}
      title="Draft sticky notes"
      className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
        isOpen ? "bg-[#2d3748] text-white" : "text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8]"
      }`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h10a2 2 0 012 2v13l-4 3-4-3-4 3-2-1.5V5a2 2 0 012-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h6" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#d4af37] text-[#2d3748] text-[9px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}

// Small helper this module exports so the page can hook into the font once
// without duplicating the injection logic elsewhere.
export { useHandwrittenFont };