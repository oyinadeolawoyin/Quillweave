import { useState, useEffect, useRef } from "react";
import API_URL from "@/config/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function countWords(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Font options ─────────────────────────────────────────────────────────────

export const FONT_FAMILIES = [
  { label: "Georgia",        value: "'Georgia', 'Times New Roman', serif" },
  { label: "Palatino",       value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
  { label: "Garamond",       value: "'EB Garamond', Garamond, serif" },
  { label: "Times New Roman",value: "'Times New Roman', Times, serif" },
  { label: "Lora",           value: "'Lora', Georgia, serif" },
  { label: "Merriweather",   value: "'Merriweather', Georgia, serif" },
  { label: "Courier",        value: "'Courier New', Courier, monospace" },
  { label: "Arial",          value: "Arial, Helvetica, sans-serif" },
  { label: "System",         value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
];

export const FONT_SIZES = [
  { label: "Small",   value: "14px" },
  { label: "Normal",  value: "16px" },
  { label: "Large",   value: "18px" },
  { label: "XL",      value: "20px" },
  { label: "XXL",     value: "24px" },
];

const LINE_HEIGHTS = [
  { label: "Compact",  value: "1.5" },
  { label: "Normal",   value: "1.75" },
  { label: "Relaxed",  value: "1.95" },
  { label: "Spacious", value: "2.2" },
];

// Preset text colours
const TEXT_COLORS = [
  "#2d3748", "#1a202c", "#4a5568", "#744210", "#22543d",
  "#1a365d", "#553c9a", "#702459", "#c05621", "#c53030",
];

// Preset background colours
const BG_COLORS = [
  "transparent", "#ffffff", "#faf7f2", "#fffbf0", "#f0fff4",
  "#ebf8ff", "#faf5ff", "#fff5f5", "#f7fafc", "#1a202c",
];

// ─── Thesaurus drawer ─────────────────────────────────────────────────────────
// Right-side sliding drawer with Thesaurus + Emotion Cues tabs.
// Matches the richer emotion-cue UX from GroupSprintWorkspace.
//
// Props:
//   isOpen   bool
//   onClose  fn

export function ThesaurusDrawer({ isOpen, onClose }) {
  const [tab, setTab]         = useState("thesaurus"); // "thesaurus" | "emotions"
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const inputRef = useRef(null);

  // Emotion cues
  const [emotions, setEmotions]               = useState([]);
  const [emotionsLoading, setEmotionsLoading] = useState(false);
  const [emotionsError, setEmotionsError]     = useState(null);
  const [expandedEmotion, setExpandedEmotion] = useState(null); // null = list view; id = detail view

  useEffect(() => {
    if (isOpen && tab === "thesaurus") setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, tab]);

  useEffect(() => {
    if (tab !== "emotions" || emotions.length > 0) return;
    setEmotionsLoading(true);
    setEmotionsError(null);
    fetch(`${API_URL}/emotions`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setEmotions(d.emotions || []))
      .catch(() => setEmotionsError("Couldn't load emotion cues. Try again."))
      .finally(() => setEmotionsLoading(false));
  }, [tab, emotions.length]);

  async function search(word) {
    const w = word.trim().toLowerCase();
    if (!w) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
      if (!res.ok) { setError("No results found. Try another word."); return; }
      const data = await res.json();
      const synonyms = new Set();
      const antonyms = new Set();
      data.forEach(entry => {
        entry.meanings?.forEach(m => {
          m.synonyms?.forEach(s => synonyms.add(s));
          m.antonyms?.forEach(a => antonyms.add(a));
          m.definitions?.forEach(d => {
            d.synonyms?.forEach(s => synonyms.add(s));
            d.antonyms?.forEach(a => antonyms.add(a));
          });
        });
      });
      setResults({
        word: data[0]?.word || w,
        phonetic: data[0]?.phonetic || "",
        meanings: data[0]?.meanings?.slice(0, 3) || [],
        synonyms: [...synonyms].slice(0, 20),
        antonyms: [...antonyms].slice(0, 10),
      });
    } catch {
      setError("Couldn't connect to the dictionary. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      )}

      <div className={`fixed right-0 top-0 h-full z-40 w-80 bg-white border-l border-[#e8dcc8] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8dcc8] bg-[#faf7f2] flex-shrink-0">
          <div>
            <p className="text-xs text-[#9a8c7a] font-semibold uppercase tracking-wider">Writer's toolkit</p>
            <p className="text-sm font-serif text-[#2d3748]">Words & emotions</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#f0ebe3] flex items-center justify-center text-[#9a8c7a] hover:bg-[#e8e0d0] hover:text-[#2d3748] transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#f0ebe3] flex-shrink-0">
          <button
            onClick={() => setTab("thesaurus")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
              tab === "thesaurus" ? "text-[#2d3748] border-b-2 border-[#d4af37]" : "text-[#9a8c7a] hover:text-[#5a4a30]"
            }`}>
            📖 Thesaurus
          </button>
          <button
            onClick={() => setTab("emotions")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
              tab === "emotions" ? "text-[#2d3748] border-b-2 border-[#d4af37]" : "text-[#9a8c7a] hover:text-[#5a4a30]"
            }`}>
            🌿 Emotion Cues
          </button>
        </div>

        {/* ── Thesaurus tab ─────────────────────────────────────────────────── */}
        {tab === "thesaurus" && (
          <>
            <div className="px-4 py-3 border-b border-[#f0ebe3] flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && search(query)}
                  placeholder="Search a word…"
                  className="flex-1 px-3 py-2 text-sm bg-[#faf7f2] border border-[#e8e0d0] rounded-lg focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 text-[#2d3748] placeholder-[#c4bdb4] transition-all"
                />
                <button
                  onClick={() => search(query)}
                  className="px-3 py-2 bg-[#2d3748] text-white rounded-lg text-sm font-medium hover:bg-[#3d4f64] transition-all">
                  Go
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-12 gap-2 text-sm text-[#9a8c7a]">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Looking it up…
                </div>
              )}
              {error && !loading && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-[#9a8c7a]">{error}</p>
                </div>
              )}
              {results && !loading && (
                <div className="p-4 space-y-5">
                  <div>
                    <p className="text-xl font-serif font-semibold text-[#2d3748]" style={{ fontFamily: "'Georgia', serif" }}>
                      {results.word}
                    </p>
                    {results.phonetic && (
                      <p className="text-xs text-[#9a8c7a] mt-0.5">{results.phonetic}</p>
                    )}
                  </div>
                  {results.meanings.length > 0 && (
                    <div className="space-y-3">
                      {results.meanings.map((m, i) => (
                        <div key={i}>
                          <span className="text-[10px] font-semibold text-[#9a8c7a] uppercase tracking-wider bg-[#f4f1ec] px-2 py-0.5 rounded">
                            {m.partOfSpeech}
                          </span>
                          {m.definitions?.[0]?.definition && (
                            <p className="text-xs text-[#7a6a50] mt-1.5 leading-relaxed">
                              {m.definitions[0].definition}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {results.synonyms.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#2d3748] mb-2">Synonyms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {results.synonyms.map(s => (
                          <button
                            key={s}
                            onClick={() => { setQuery(s); search(s); }}
                            className="text-xs px-2.5 py-1 bg-[#faf7f2] border border-[#e8e0d0] text-[#5a4a30] rounded-full hover:border-[#d4af37] hover:bg-[#fffbf0] transition-all">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {results.antonyms.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#2d3748] mb-2">Antonyms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {results.antonyms.map(a => (
                          <button
                            key={a}
                            onClick={() => { setQuery(a); search(a); }}
                            className="text-xs px-2.5 py-1 bg-[#fff0f0] border border-[#f5caca] text-[#7a3a3a] rounded-full hover:border-[#e57a7a] transition-all">
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!results.synonyms.length && !results.antonyms.length && (
                    <p className="text-xs text-[#b8a898] text-center py-2">No synonyms or antonyms found.</p>
                  )}
                </div>
              )}
              {!loading && !error && !results && (
                <div className="px-4 py-10 text-center space-y-2">
                  <p className="text-2xl">📖</p>
                  <p className="text-xs text-[#b8a898]">Type a word above to find synonyms, antonyms, and definitions.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Emotion Cues tab ─────────────────────────────────────────────── */}
        {tab === "emotions" && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {emotionsLoading && (
              <div className="flex items-center justify-center py-12 gap-2 text-sm text-[#9a8c7a]">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading emotion cues…
              </div>
            )}
            {emotionsError && !emotionsLoading && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-[#9a8c7a]">{emotionsError}</p>
                <button
                  onClick={() => { setEmotions([]); setEmotionsError(null); }}
                  className="mt-3 text-xs text-[#d4af37] hover:underline">
                  Retry
                </button>
              </div>
            )}
            {!emotionsLoading && !emotionsError && emotions.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-2xl mb-2">🌿</p>
                <p className="text-xs text-[#b8a898]">No emotion cues yet.</p>
              </div>
            )}

            {/* List view */}
            {!emotionsLoading && emotions.length > 0 && expandedEmotion === null && (
              <div className="p-3 space-y-1">
                <p className="text-[10px] text-[#b8a898] px-1 pb-2">
                  Tap an emotion to see its sensory cues — use them to write more vividly.
                </p>
                {emotions.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setExpandedEmotion(e.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#faf7f2] hover:bg-[#f4f0e8] border border-[#e8dcc8] hover:border-[#d4af37] transition-all text-left group">
                    <div className="flex items-center gap-2.5">
                      {e.emoji && <span className="text-base">{e.emoji}</span>}
                      <span className="text-sm font-medium text-[#2d3748]">{e.emotion || e.name}</span>
                    </div>
                    <svg
                      className="w-3.5 h-3.5 text-[#c4bdb4] group-hover:text-[#d4af37] transition-colors"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* Detail view */}
            {!emotionsLoading && emotions.length > 0 && expandedEmotion !== null && (() => {
              const em = emotions.find(e => e.id === expandedEmotion);
              if (!em) return null;
              const rawCues = em.cues || "";
              const cueItems = Array.isArray(rawCues)
                ? rawCues.map(s => String(s).trim()).filter(Boolean)
                : String(rawCues)
                    .split(/(?<=[a-z,)])(?=[A-Z])/)
                    .map(s => s.trim())
                    .filter(Boolean);
              return (
                <div className="flex flex-col flex-1">
                  <button
                    onClick={() => setExpandedEmotion(null)}
                    className="flex items-center gap-2 px-4 py-3 bg-[#faf7f2] border-b border-[#e8dcc8] hover:bg-[#f4f0e8] transition-all text-left w-full group flex-shrink-0">
                    <svg className="w-4 h-4 text-[#9a8c7a] group-hover:text-[#2d3748] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-semibold text-[#2d3748]">{em.emotion || em.name}</span>
                    <span className="text-[10px] text-[#b8a898] ml-auto">tap to go back</span>
                  </button>
                  <div className="flex-1 overflow-y-auto p-4">
                    <p className="text-[10px] text-[#b8a898] mb-3 uppercase tracking-wider font-semibold">Sensory cues</p>
                    <ul className="space-y-2">
                      {cueItems.map((cue, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] flex-shrink-0 mt-1.5" />
                          <span className="text-xs text-[#5a4a30] leading-relaxed">{cue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Rich text toolbar ────────────────────────────────────────────────────────
// Includes: Bold, Italic, Underline, Lists, Em-dash, Font family, Font size,
//           Text colour, Background colour.
//
// Props:
//   onCommand        fn(cmd)         — execCommand shortcut
//   onFontFamily     fn(value)       — sets font-family on editor
//   onFontSize       fn(value)       — sets font-size on editor
//   currentFont      string
//   currentSize      string
//   showColorTools   bool            — hide color pickers for feedback hub
//   onTextColor      fn(color)
//   onBgColor        fn(color)
//   currentTextColor string
//   currentBgColor   string

export function RichToolbar({
  onCommand,
  onFontFamily,
  onFontSize,
  currentFont  = FONT_FAMILIES[0].value,
  currentSize  = FONT_SIZES[1].value,
  showColorTools = true,
  onTextColor,
  onBgColor,
  currentTextColor = "#2d3748",
  currentBgColor   = "transparent",
}) {
  const [colorPicker, setColorPicker] = useState(null); // "text" | "bg" | null
  const colorPickerRef = useRef(null);

  // Close color picker when clicking outside
  useEffect(() => {
    if (!colorPicker) return;
    function handler(e) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setColorPicker(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colorPicker]);

  const btn = "w-7 h-7 rounded flex items-center justify-center text-[#7a6a50] hover:bg-[#f0e8d8] hover:text-[#2d3748] transition-all text-xs font-medium flex-shrink-0";

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[#f0e8d8] flex-shrink-0 flex-wrap bg-[#faf7f2]">
      {/* Font family */}
      <select
        value={currentFont}
        onChange={e => onFontFamily?.(e.target.value)}
        className="h-7 text-xs text-[#5a4a30] bg-white border border-[#e8e0d0] rounded px-1.5 hover:border-[#c9b090] focus:outline-none focus:border-[#d4af37] transition-all cursor-pointer max-w-[110px]"
        title="Font family"
      >
        {FONT_FAMILIES.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        value={currentSize}
        onChange={e => onFontSize?.(e.target.value)}
        className="h-7 text-xs text-[#5a4a30] bg-white border border-[#e8e0d0] rounded px-1 hover:border-[#c9b090] focus:outline-none focus:border-[#d4af37] transition-all cursor-pointer w-20"
        title="Font size"
      >
        {FONT_SIZES.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <div className="w-px h-4 bg-[#e8e0d0] mx-1" />

      {/* Bold */}
      <button onMouseDown={e => { e.preventDefault(); onCommand("bold"); }} className={btn} title="Bold (Ctrl+B)">
        <strong>B</strong>
      </button>
      {/* Italic */}
      <button onMouseDown={e => { e.preventDefault(); onCommand("italic"); }} className={btn} title="Italic (Ctrl+I)">
        <em>I</em>
      </button>
      {/* Underline */}
      <button onMouseDown={e => { e.preventDefault(); onCommand("underline"); }} className={btn} title="Underline (Ctrl+U)">
        <span style={{ textDecoration: "underline" }}>U</span>
      </button>

      <div className="w-px h-4 bg-[#e8e0d0] mx-1" />

      {/* Bullet list */}
      <button onMouseDown={e => { e.preventDefault(); onCommand("insertUnorderedList"); }} className={btn} title="Bullet list">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </button>
      {/* Numbered list */}
      <button onMouseDown={e => { e.preventDefault(); onCommand("insertOrderedList"); }} className={btn} title="Numbered list">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h1v4M4 6H3m1 4H3m4-4h13M7 12h13M7 18h13M3 14h1l1 2-1 2H3" />
        </svg>
      </button>

      {/* Em dash */}
      <button
        onMouseDown={e => {
          e.preventDefault();
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode("—"));
            range.collapse(false);
          }
        }}
        className={`${btn} text-base`}
        title="Em dash —">
        —
      </button>

      {/* Divider */}
      <button
        onMouseDown={e => {
          e.preventDefault();
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return;
          const range = sel.getRangeAt(0);
          range.deleteContents();
          // Insert <hr data-divider="1">
          const hr = document.createElement("hr");
          hr.setAttribute("data-divider", "1");
          hr.style.cssText = "border:none;border-top:2px solid #c9b090;margin:1.5em auto;width:40%;display:block;";
          range.insertNode(hr);
          // Move cursor to a new empty div after the hr
          const after = document.createElement("div");
          after.innerHTML = "<br>";
          hr.parentNode.insertBefore(after, hr.nextSibling);
          const newRange = document.createRange();
          newRange.setStart(after, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }}
        className={btn}
        title="Insert section divider">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 16h14" opacity="0.3" />
        </svg>
      </button>

      {/* ── Colour tools (hidden in feedback hub) ────────────────────── */}
      {showColorTools && (
        <>
          <div className="w-px h-4 bg-[#e8e0d0] mx-1" />

          {/* Text colour */}
          <div className="relative" ref={colorPicker === "text" ? colorPickerRef : null}>
            <button
              onMouseDown={e => { e.preventDefault(); setColorPicker(p => p === "text" ? null : "text"); }}
              className={`${btn} flex-col gap-0.5`}
              title="Text colour">
              <span className="text-xs font-bold leading-none" style={{ color: currentTextColor === "transparent" ? "#2d3748" : currentTextColor }}>A</span>
              <span className="w-4 h-0.5 rounded-full" style={{ background: currentTextColor === "transparent" ? "#2d3748" : currentTextColor }} />
            </button>
            {colorPicker === "text" && (
              <ColorPopover
                colors={TEXT_COLORS}
                current={currentTextColor}
                onPick={c => { onTextColor?.(c); setColorPicker(null); }}
                label="Text colour"
                showTransparent={false}
              />
            )}
          </div>

          {/* Background colour */}
          <div className="relative" ref={colorPicker === "bg" ? colorPickerRef : null}>
            <button
              onMouseDown={e => { e.preventDefault(); setColorPicker(p => p === "bg" ? null : "bg"); }}
              className={`${btn} flex-col gap-0.5`}
              title="Highlight / background colour">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span
                className="w-4 h-0.5 rounded-full border border-[#e8e0d0]"
                style={{ background: currentBgColor === "transparent" ? "repeating-linear-gradient(45deg,#ccc 0,#ccc 1px,transparent 0,transparent 50%)" : currentBgColor }}
              />
            </button>
            {colorPicker === "bg" && (
              <ColorPopover
                colors={BG_COLORS}
                current={currentBgColor}
                onPick={c => { onBgColor?.(c); setColorPicker(null); }}
                label="Background colour"
                showTransparent={true}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Colour popover ───────────────────────────────────────────────────────────

function ColorPopover({ colors, current, onPick, label, showTransparent }) {
  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#e8e0d0] rounded-xl shadow-xl p-3 w-44">
      <p className="text-[10px] font-semibold text-[#9a8c7a] uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {showTransparent && (
          <button
            onMouseDown={e => { e.preventDefault(); onPick("transparent"); }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${current === "transparent" ? "border-[#d4af37]" : "border-[#e8e0d0] hover:border-[#c9b090]"}`}
            title="None / transparent"
            style={{ background: "repeating-linear-gradient(45deg,#ccc 0,#ccc 1px,transparent 0,transparent 50%)" }}
          />
        )}
        {colors.filter(c => c !== "transparent").map(c => (
          <button
            key={c}
            onMouseDown={e => { e.preventDefault(); onPick(c); }}
            className={`w-6 h-6 rounded-full border-2 transition-all ${current === c ? "border-[#d4af37] scale-110" : "border-[#e8e0d0] hover:border-[#c9b090]"}`}
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
      {/* Custom hex input */}
      <div className="mt-2 pt-2 border-t border-[#f0ebe3]">
        <input
          type="color"
          defaultValue={current === "transparent" ? "#ffffff" : current}
          onChange={e => onPick(e.target.value)}
          className="w-full h-7 rounded cursor-pointer border border-[#e8e0d0]"
          title="Custom colour"
        />
      </div>
    </div>
  );
}

// ─── Write editor ──────────────────────────────────────────────────────────────
// Rich text via contenteditable. Auto-saves every 30 s. Preserves formatting,
// font choice, font size, text colour, and background colour in the saved HTML.
//
// Props:
//   draftId          string | null
//   onWordsUpdate    fn(wc)
//   onAutoSave       async fn({ draftId, title, content, wordCount, isManual? }) → { id }
//   onDraftLoaded    fn(wordCount)
//   saveRef          React ref — parent can call saveRef.current() to force-save
//   showColorTools   bool (default true) — pass false in the feedback hub

export function WriteEditor({
  draftId,
  initialContent,
  onWordsUpdate,
  onAutoSave,
  onDraftLoaded,
  saveRef,
  contentRef,
  showColorTools = true,
}) {
  const [title, setTitle]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [wordCount, setWordCount] = useState(0);

  // Typography / colour state (persisted in draft HTML via wrapper div style)
  const [fontFamily,   setFontFamily]   = useState(FONT_FAMILIES[0].value);
  const [fontSize,     setFontSize]     = useState(FONT_SIZES[1].value);
  const [textColor,    setTextColor]    = useState("#2d3748");
  const [bgColor,      setBgColor]      = useState("transparent");

  const editorRef   = useRef(null);
  const autoSaveRef = useRef(null);
  const titleRef    = useRef(title);
  titleRef.current  = title;

  // Expose the raw editor DOM node to the parent so it can read innerHTML/innerText
  // directly at submit time without going through auto-save.
  useEffect(() => {
    if (contentRef) contentRef.current = editorRef.current;
  }, [contentRef]);

  // Keep latest style values accessible in closures without re-creating intervals
  const styleRef = useRef({ fontFamily, fontSize, textColor, bgColor });
  useEffect(() => { styleRef.current = { fontFamily, fontSize, textColor, bgColor }; }, [fontFamily, fontSize, textColor, bgColor]);

  // ── Load initialContent (edit mode — no draftId, content passed directly) ─
  useEffect(() => {
    if (draftId || !initialContent) return;
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
      const wrapper = editorRef.current.querySelector("[data-editor-styles]");
      if (wrapper) {
        if (wrapper.dataset.fontFamily) setFontFamily(wrapper.dataset.fontFamily);
        if (wrapper.dataset.fontSize)   setFontSize(wrapper.dataset.fontSize);
        if (wrapper.dataset.textColor)  setTextColor(wrapper.dataset.textColor);
        if (wrapper.dataset.bgColor)    setBgColor(wrapper.dataset.bgColor);
      }
    }
    const text = editorRef.current?.innerText || "";
    const wc = countWords(text);
    setWordCount(wc);
    onWordsUpdate?.(wc);
    onDraftLoaded?.(wc);
  }, [initialContent]);

  // ── Load existing draft ───────────────────────────────────────────────────
  useEffect(() => {
    if (!draftId) {
      onDraftLoaded?.(0);
      return;
    }
    fetch(`${API_URL}/drafts/${draftId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.draft) {
          setTitle(data.draft.title || "");
          if (editorRef.current) {
            editorRef.current.innerHTML = data.draft.content || "";
            // Restore saved editor-level styles from the first child wrapper if present
            const wrapper = editorRef.current.querySelector("[data-editor-styles]");
            if (wrapper) {
              if (wrapper.dataset.fontFamily) setFontFamily(wrapper.dataset.fontFamily);
              if (wrapper.dataset.fontSize)   setFontSize(wrapper.dataset.fontSize);
              if (wrapper.dataset.textColor)  setTextColor(wrapper.dataset.textColor);
              if (wrapper.dataset.bgColor)    setBgColor(wrapper.dataset.bgColor);
            }
          }
          const wc = data.draft.wordCount || 0;
          setWordCount(wc);
          onDraftLoaded?.(wc);
        }
      })
      .catch(() => {});
  }, [draftId]);

  // ── Get editor HTML with style metadata embedded ──────────────────────────
  function getContentHTML() {
    const { fontFamily: ff, fontSize: fs, textColor: tc, bgColor: bc } = styleRef.current;
    const innerHTML = editorRef.current?.innerHTML || "";
    // Wrap with a marker element that carries style info for restoration on load
    return `<div data-editor-styles="1" data-font-family="${ff}" data-font-size="${fs}" data-text-color="${tc}" data-bg-color="${bc}" style="display:none"></div>${innerHTML}`;
  }

  function getEditorText() {
    return editorRef.current?.innerText || "";
  }

  function handleEditorInput() {
    const wc = countWords(getEditorText());
    setWordCount(wc);
    onWordsUpdate?.(wc);
  }

  function handleCommand(cmd) {
    document.execCommand(cmd, false, null);
    editorRef.current?.focus();
  }

  // ── Auto-save every 30 s ─────────────────────────────────────────────────
  useEffect(() => {
    autoSaveRef.current = setInterval(async () => {
      const content = getContentHTML();
      if (!content) return;
      const wc = countWords(getEditorText());
      setSaving(true);
      try {
        await onAutoSave({ draftId, title: titleRef.current, content, wordCount: wc });
        setLastSaved(new Date());
      } catch {}
      finally { setSaving(false); }
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [draftId, onAutoSave]);

  // ── Expose save-now to parent via saveRef ─────────────────────────────────
  useEffect(() => {
    if (!saveRef) return;
    saveRef.current = async ({ isManual = false } = {}) => {
      const content = getContentHTML();
      const wc = countWords(getEditorText());
      setSaving(true);
      try {
        await onAutoSave({ draftId, title: titleRef.current, content, wordCount: wc, isManual });
        setLastSaved(new Date());
      } catch {}
      finally { setSaving(false); }
    };
  }, [draftId, onAutoSave, saveRef]);

  // Editor container style (applies font/size/color/bg to the whole writing area)
  const editorContainerStyle = {
    fontFamily,
    fontSize,
    color:           textColor,
    backgroundColor: bgColor === "transparent" ? undefined : bgColor,
    lineHeight:      "1.95",
    minHeight:       "60vh",
  };

  return (
    <div className="flex flex-col">
      {/* Save status */}
      <div className="flex items-center justify-end px-6 py-2 flex-shrink-0">
        {saving ? (
          <span className="text-xs text-[#9a8c7a] flex items-center gap-1.5">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving…
          </span>
        ) : lastSaved ? (
          <span className="text-xs text-[#b8a898]">
            Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : null}
      </div>

      {/* Formatting toolbar */}
      <RichToolbar
        onCommand={handleCommand}
        onFontFamily={setFontFamily}
        onFontSize={setFontSize}
        currentFont={fontFamily}
        currentSize={fontSize}
        showColorTools={showColorTools}
        onTextColor={setTextColor}
        onBgColor={setBgColor}
        currentTextColor={textColor}
        currentBgColor={bgColor}
      />

      {/* Title */}
      <div className="px-8 pt-6 pb-2 flex-shrink-0" style={{ backgroundColor: bgColor === "transparent" ? undefined : bgColor }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full text-2xl font-serif font-bold bg-transparent border-none outline-none placeholder-[#d4cdc4]"
          style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            color: textColor,
          }}
        />
      </div>

      {/* Divider */}
      <div className="mx-8 border-b border-[#f0e8d8] mb-4 flex-shrink-0" />

      {/* Rich text area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleEditorInput}
        data-placeholder="Begin writing…"
        className="px-8 pb-10 outline-none"
        style={editorContainerStyle}
      />

      {/* Word count footer */}
      <div className="px-8 py-3 border-t border-[#f0e8d8] flex-shrink-0">
        <p className="text-xs text-[#b8a898]">{wordCount.toLocaleString()} words</p>
      </div>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #c4bdb4;
          pointer-events: none;
        }
        [contenteditable] ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        [contenteditable] li { margin: 0.2rem 0; }
        [contenteditable] hr[data-divider] { border:none;border-top:2px solid #c9b090;margin:1.5em auto;width:40%;display:block; }
        [contenteditable] b, [contenteditable] strong { font-weight: 700; }
        [contenteditable] i, [contenteditable] em { font-style: italic; }
        [contenteditable] u { text-decoration: underline; }
      `}</style>
    </div>
  );
}