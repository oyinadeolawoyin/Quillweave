import { useState, useEffect, useRef } from "react";
import API_URL from "@/config/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function countWords(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Allow relative in-site links (e.g. /blog/123) and anchors as-is;
// otherwise default to https:// if no scheme was given.
export function normalizeLinkUrl(raw) {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(v)) return v;
  return `https://${v}`;
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
// Right-side sliding drawer with synonym/antonym/definition lookup.
//
// Props:
//   isOpen   bool
//   onClose  fn

export function ThesaurusDrawer({ isOpen, onClose }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

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
            <p className="text-sm font-serif text-[#2d3748]">Thesaurus</p>
          </div>
          <button type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#f0ebe3] flex items-center justify-center text-[#9a8c7a] hover:bg-[#e8e0d0] hover:text-[#2d3748] transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Thesaurus ─────────────────────────────────────────────────────── */}
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
            <button type="button"
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
                      <button type="button"
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
                      <button type="button"
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
      </div>
    </>
  );
}

// ─── Floating format bar (sticky bottom) ─────────────────────────────────────
// Full toolbar mirror — all commands accessible from anywhere in the editor.
// Appears when editor is focused, slides away when not.
//
// Props:
//   onCommand   fn(cmd)
//   onImagePicked fn(payload) — for inline image insert
//   visible     bool

function FloatingFormatBar({ onCommand, onImagePicked, onLinkClick, onBlockClick, visible }) {
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);

  const floatBtn = "w-8 h-8 rounded-lg flex items-center justify-center text-white/75 hover:text-white hover:bg-white/15 transition-all text-sm flex-shrink-0";

  const HIGHLIGHT_COLORS = ["#fef08a","#bbf7d0","#bae6fd","#f9a8d4","#fca5a5","#c4b5fd","#fdba74"];
  const SEL_TEXT_COLORS  = ["#ffffff","#fde68a","#6ee7b7","#93c5fd","#f9a8d4","#c05621","#1a1a2e"];

  function insertEmdash() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode("—"));
      range.collapse(false);
    }
  }

  return (
    <div
      className="fixed bottom-5 left-1/2 z-50 transition-all duration-200"
      style={{
        transform: `translateX(-50%) translateY(${visible ? "0" : "90px"})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className="flex items-center gap-0.5 px-2 py-1.5 rounded-2xl shadow-2xl border border-white/10"
        style={{ background: "#1a1a2e" }}
      >
        {/* Bold / Italic / Underline */}
        <button type="button" title="Bold" onMouseDown={e => { e.preventDefault(); onCommand("bold"); }} className={floatBtn}>
          <strong style={{ fontFamily: "sans-serif", fontSize: "13px" }}>B</strong>
        </button>
        <button type="button" title="Italic" onMouseDown={e => { e.preventDefault(); onCommand("italic"); }} className={floatBtn}>
          <em style={{ fontFamily: "sans-serif", fontSize: "13px" }}>I</em>
        </button>
        <button type="button" title="Underline" onMouseDown={e => { e.preventDefault(); onCommand("underline"); }} className={floatBtn}>
          <span style={{ textDecoration: "underline", fontFamily: "sans-serif", fontSize: "13px" }}>U</span>
        </button>

        <div className="w-px h-4 bg-white/15 mx-0.5" />

        {/* Alignment */}
        <button type="button" title="Left" onMouseDown={e => { e.preventDefault(); onCommand("justifyLeft"); }} className={floatBtn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 10h12M3 14h18M3 18h12" />
          </svg>
        </button>
        <button type="button" title="Centre" onMouseDown={e => { e.preventDefault(); onCommand("justifyCenter"); }} className={floatBtn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M6 10h12M3 14h18M6 18h12" />
          </svg>
        </button>
        <button type="button" title="Right" onMouseDown={e => { e.preventDefault(); onCommand("justifyRight"); }} className={floatBtn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M9 10h12M3 14h18M9 18h12" />
          </svg>
        </button>

        <div className="w-px h-4 bg-white/15 mx-0.5" />

        {/* Lists */}
        <button type="button" title="Bullet list" onMouseDown={e => { e.preventDefault(); onCommand("insertUnorderedList"); }} className={floatBtn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>
        <button type="button" title="Numbered list" onMouseDown={e => { e.preventDefault(); onCommand("insertOrderedList"); }} className={floatBtn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h1v4M4 6H3m1 4H3m4-4h13M7 12h13M7 18h13M3 14h1l1 2-1 2H3" />
          </svg>
        </button>

        <div className="w-px h-4 bg-white/15 mx-0.5" />

        {/* Text colour for selection */}
        <div className="relative">
          <button type="button"
            title="Text colour"
            onMouseDown={e => { e.preventDefault(); setShowTextColor(p => !p); setShowHighlight(false); setShowFontSize(false); }}
            className={floatBtn}
          >
            <span className="text-[11px] font-black" style={{ color: "#fde68a" }}>A</span>
          </button>
          {showTextColor && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0f1724] border border-white/15 rounded-xl p-2 flex gap-1.5 shadow-2xl">
              {SEL_TEXT_COLORS.map(c => (
                <button type="button"
                  key={c}
                  onMouseDown={e => { e.preventDefault(); document.execCommand("foreColor", false, c); setShowTextColor(false); }}
                  className="w-5 h-5 rounded-full border-2 border-white/20 hover:border-white/60 transition-all flex-shrink-0"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight for selection */}
        <div className="relative">
          <button type="button"
            title="Highlight"
            onMouseDown={e => { e.preventDefault(); setShowHighlight(p => !p); setShowTextColor(false); setShowFontSize(false); }}
            className={floatBtn}
          >
            <svg className="w-3.5 h-3.5 text-[#fde68a]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>
          {showHighlight && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0f1724] border border-white/15 rounded-xl p-2 flex gap-1.5 shadow-2xl">
              {HIGHLIGHT_COLORS.map(c => (
                <button type="button"
                  key={c}
                  onMouseDown={e => { e.preventDefault(); document.execCommand("hiliteColor", false, c); setShowHighlight(false); }}
                  className="w-5 h-5 rounded-full border-2 border-white/20 hover:border-white/60 transition-all flex-shrink-0"
                  style={{ background: c }}
                  title={c}
                />
              ))}
              <button type="button"
                onMouseDown={e => { e.preventDefault(); document.execCommand("removeFormat", false, null); setShowHighlight(false); }}
                className="w-5 h-5 rounded-full border-2 border-white/20 hover:border-white/60 transition-all flex-shrink-0 flex items-center justify-center text-white/60 text-[9px]"
                style={{ background: "repeating-linear-gradient(45deg,#555 0,#555 1px,transparent 0,transparent 50%)" }}
                title="Remove highlight"
              />
            </div>
          )}
        </div>

        {/* Font size for selection */}
        <div className="relative">
          <button type="button"
            title="Font size"
            onMouseDown={e => { e.preventDefault(); setShowFontSize(p => !p); setShowTextColor(false); setShowHighlight(false); }}
            className={`${floatBtn} text-[10px] font-bold`}
          >
            <span style={{ fontSize: "11px", lineHeight: 1 }}>Aa</span>
          </button>
          {showFontSize && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0f1724] border border-white/15 rounded-xl p-1.5 flex flex-col gap-0.5 shadow-2xl w-24">
              {FONT_SIZES.map(s => (
                <button type="button"
                  key={s.value}
                  onMouseDown={e => {
                    e.preventDefault();
                    const sel = window.getSelection();
                    if (sel && !sel.isCollapsed) {
                      const range = sel.getRangeAt(0);
                      const span = document.createElement("span");
                      span.style.fontSize = s.value;
                      try { range.surroundContents(span); } catch {}
                    }
                    setShowFontSize(false);
                  }}
                  className="w-full text-left px-2 py-1 text-white/75 hover:text-white hover:bg-white/10 rounded text-xs transition-all"
                >
                  {s.label} <span className="text-white/40">({s.value})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-white/15 mx-0.5" />

        {/* Em dash */}
        <button type="button" title="Em dash —" onMouseDown={e => { e.preventDefault(); insertEmdash(); }} className={`${floatBtn} text-base`}>
          —
        </button>

        {/* Divider line */}
        <button type="button"
          title="Section divider"
          onMouseDown={e => {
            e.preventDefault();
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const hr = document.createElement("hr");
            hr.setAttribute("data-divider", "1");
            hr.style.cssText = "border:none;border-top:2px solid #c9b090;margin:1.5em auto;width:40%;display:block;";
            range.insertNode(hr);
            const after = document.createElement("div");
            after.innerHTML = "<br>";
            hr.parentNode.insertBefore(after, hr.nextSibling);
            const nr = document.createRange();
            nr.setStart(after, 0);
            nr.collapse(true);
            sel.removeAllRanges();
            sel.addRange(nr);
          }}
          className={floatBtn}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        </button>

        {/* Link */}
        <button type="button" title="Insert link" onMouseDown={e => { e.preventDefault(); onLinkClick?.(); }} className={floatBtn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
          </svg>
        </button>

        {/* Exercise block */}
        <button type="button" title="Insert exercise block" onMouseDown={e => { e.preventDefault(); onBlockClick?.(); }} className={floatBtn}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}


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
  onImagePicked,
  onLinkClick,
  onBlockClick,
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
      <button type="button" onMouseDown={e => { e.preventDefault(); onCommand("bold"); }} className={btn} title="Bold (Ctrl+B)">
        <strong>B</strong>
      </button>
      {/* Italic */}
      <button type="button" onMouseDown={e => { e.preventDefault(); onCommand("italic"); }} className={btn} title="Italic (Ctrl+I)">
        <em>I</em>
      </button>
      {/* Underline */}
      <button type="button" onMouseDown={e => { e.preventDefault(); onCommand("underline"); }} className={btn} title="Underline (Ctrl+U)">
        <span style={{ textDecoration: "underline" }}>U</span>
      </button>

      <div className="w-px h-4 bg-[#e8e0d0] mx-1" />

      {/* Align left */}
      <button type="button" onMouseDown={e => { e.preventDefault(); onCommand("justifyLeft"); }} className={btn} title="Align left">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 10h12M3 14h18M3 18h12" />
        </svg>
      </button>
      {/* Align centre */}
      <button type="button" onMouseDown={e => { e.preventDefault(); onCommand("justifyCenter"); }} className={btn} title="Align centre">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M6 10h12M3 14h18M6 18h12" />
        </svg>
      </button>
      {/* Align right */}
      <button type="button" onMouseDown={e => { e.preventDefault(); onCommand("justifyRight"); }} className={btn} title="Align right">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M9 10h12M3 14h18M9 18h12" />
        </svg>
      </button>

      <div className="w-px h-4 bg-[#e8e0d0] mx-1" />

      {/* Bullet list */}
      <button type="button" onMouseDown={e => { e.preventDefault(); onCommand("insertUnorderedList"); }} className={btn} title="Bullet list">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </button>
      {/* Numbered list */}
      <button type="button" onMouseDown={e => { e.preventDefault(); onCommand("insertOrderedList"); }} className={btn} title="Numbered list">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h1v4M4 6H3m1 4H3m4-4h13M7 12h13M7 18h13M3 14h1l1 2-1 2H3" />
        </svg>
      </button>

      {/* Em dash */}
      <button type="button"
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
      <button type="button"
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

      {/* Insert image — uploads to server first, then inserts URL */}
      <label
        className={`${btn} cursor-pointer`}
        title="Insert image"
        onMouseDown={e => e.preventDefault()}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = "";

            // Save cursor position before async upload
            const sel = window.getSelection();
            let savedRange = null;
            if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();

            // Show uploading placeholder
            let placeholder = null;
            if (savedRange) {
              placeholder = document.createElement("span");
              placeholder.textContent = "⏳ Uploading image…";
              placeholder.style.cssText = "color:#9a8c7a;font-style:italic;font-size:0.875em;";
              placeholder.setAttribute("data-upload-placeholder", "1");
              const r = savedRange.cloneRange();
              r.deleteContents();
              r.insertNode(placeholder);
            }

            try {
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch(`${API_URL}/blog/upload`, {
                method: "POST",
                credentials: "include",
                body: fd,
              });
              if (!res.ok) throw new Error("Upload failed");
              const data = await res.json();
              const url = data.url || data.fileUrl || data.mediaUrl;
              if (!url) throw new Error("No URL returned");

              // Remove placeholder and show size picker
              if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);

              // Show size picker modal
              onImagePicked?.({ url, savedRange });
            } catch (err) {
              if (placeholder && placeholder.parentNode) {
                placeholder.textContent = "⚠️ Upload failed — please try again.";
                setTimeout(() => placeholder.parentNode?.removeChild(placeholder), 3000);
              }
            }
          }}
        />
      </label>

      {/* Insert link — opens a modal for URL + display text, no upload involved */}
      <button type="button"
        onMouseDown={e => { e.preventDefault(); onLinkClick?.(); }}
        className={btn}
        title="Insert link"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
        </svg>
      </button>

      {/* Insert exercise/assignment block — opens a modal for heading + steps */}
      <button type="button"
        onMouseDown={e => { e.preventDefault(); onBlockClick?.(); }}
        className={btn}
        title="Insert exercise block"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </button>

      {/* ── Selection colour (applies to highlighted text) ──────────────── */}
      <div className="w-px h-4 bg-[#e8e0d0] mx-1" />

      {/* Selection text colour */}
      <div className="relative" ref={colorPicker === "sel-text" ? colorPickerRef : null}>
        <button type="button"
          onMouseDown={e => { e.preventDefault(); setColorPicker(p => p === "sel-text" ? null : "sel-text"); }}
          className={`${btn} flex-col gap-0.5`}
          title="Colour selected text">
          <span className="text-[10px] font-black leading-none" style={{ color: "#c05621" }}>A</span>
          <span className="w-4 h-0.5 rounded-full bg-[#c05621]" />
        </button>
        {colorPicker === "sel-text" && (
          <ColorPopover
            colors={TEXT_COLORS}
            current={null}
            onPick={c => {
              document.execCommand("foreColor", false, c);
              setColorPicker(null);
            }}
            label="Colour selection"
            showTransparent={false}
          />
        )}
      </div>

      {/* Selection highlight */}
      <div className="relative" ref={colorPicker === "sel-bg" ? colorPickerRef : null}>
        <button type="button"
          onMouseDown={e => { e.preventDefault(); setColorPicker(p => p === "sel-bg" ? null : "sel-bg"); }}
          className={`${btn} flex-col gap-0.5`}
          title="Highlight selected text">
          <svg className="w-3.5 h-3.5 text-[#d4af37]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
        {colorPicker === "sel-bg" && (
          <ColorPopover
            colors={["#fef08a","#bbf7d0","#bae6fd","#f9a8d4","#fca5a5","#c4b5fd","#fdba74","#ffffff","transparent"]}
            current={null}
            onPick={c => {
              if (c === "transparent") {
                document.execCommand("removeFormat", false, null);
              } else {
                document.execCommand("hiliteColor", false, c);
              }
              setColorPicker(null);
            }}
            label="Highlight selection"
            showTransparent={true}
          />
        )}
      </div>

      {/* Selection font size (applies px size to selected text via fontSize + post-process) */}
      <select
        title="Font size for selected text"
        className="h-7 text-xs text-[#5a4a30] bg-white border border-[#e8e0d0] rounded px-1 hover:border-[#c9b090] focus:outline-none focus:border-[#d4af37] transition-all cursor-pointer w-16"
        defaultValue=""
        onChange={e => {
          const px = e.target.value;
          if (!px) return;
          // execCommand fontSize only takes 1-7; use a span hack instead
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed) { e.target.value = ""; return; }
          const range = sel.getRangeAt(0);
          const span = document.createElement("span");
          span.style.fontSize = px;
          range.surroundContents(span);
          e.target.value = "";
        }}
      >
        <option value="" disabled>px</option>
        {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {/* ── Colour tools (hidden in feedback hub) ────────────────────── */}
      {showColorTools && (
        <>
          <div className="w-px h-4 bg-[#e8e0d0] mx-1" />

          {/* Text colour */}
          <div className="relative" ref={colorPicker === "text" ? colorPickerRef : null}>
            <button type="button"
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
            <button type="button"
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
          <button type="button"
            onMouseDown={e => { e.preventDefault(); onPick("transparent"); }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${current === "transparent" ? "border-[#d4af37]" : "border-[#e8e0d0] hover:border-[#c9b090]"}`}
            title="None / transparent"
            style={{ background: "repeating-linear-gradient(45deg,#ccc 0,#ccc 1px,transparent 0,transparent 50%)" }}
          />
        )}
        {colors.filter(c => c !== "transparent").map(c => (
          <button type="button"
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

// ─── Image size picker modal ──────────────────────────────────────────────────
// Shows after image upload so the user can choose a display size before insert.

const IMAGE_SIZE_PRESETS = [
  { label: "Small",    value: "33%" },
  { label: "Medium",   value: "60%" },
  { label: "Large",    value: "90%" },
  { label: "Full",     value: "100%" },
];

function ImageSizeModal({ url, savedRange, onInsert, onClose }) {
  const [size, setSize] = useState("100%");
  const [align, setAlign] = useState("center");

  function handleInsert() {
    onInsert({ url, size, align, savedRange });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e8e0d0] p-6 w-80 space-y-4">
        <h3 className="font-serif text-base text-[#1a1a2e]">Insert image</h3>

        {/* Preview */}
        <div className="rounded-xl overflow-hidden border border-[#e8e0d0] bg-[#faf7f2] flex items-center justify-center" style={{ height: "120px" }}>
          <img src={url} alt="preview" style={{ maxHeight: "110px", maxWidth: "100%", objectFit: "contain", width: size }} />
        </div>

        {/* Size */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a8c7a] mb-2">Width</p>
          <div className="flex gap-2 flex-wrap">
            {IMAGE_SIZE_PRESETS.map(p => (
              <button type="button"
                key={p.value}
                onClick={() => setSize(p.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={size === p.value
                  ? { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" }
                  : { background: "white", color: "#5a4a30", borderColor: "#e8e0d0" }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Custom */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="range" min={20} max={100} value={parseInt(size)}
              onChange={e => setSize(`${e.target.value}%`)}
              className="flex-1 accent-[#d4af37]"
            />
            <span className="text-xs text-[#9a8c7a] w-10 text-right">{size}</span>
          </div>
        </div>

        {/* Align */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a8c7a] mb-2">Alignment</p>
          <div className="flex gap-2">
            {[["left","Left"],["center","Centre"],["right","Right"]].map(([val, lbl]) => (
              <button type="button"
                key={val}
                onClick={() => setAlign(val)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={align === val
                  ? { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" }
                  : { background: "white", color: "#5a4a30", borderColor: "#e8e0d0" }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button"
            onClick={handleInsert}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "#1a1a2e" }}
          >
            Insert
          </button>
          <button type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border text-[#6b5c4a] hover:bg-[#f5f3ef] transition-all"
            style={{ borderColor: "#e8e0d0" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Link insert modal ────────────────────────────────────────────────────────
// Lets the writer insert as many in-article links as they want — no upload,
// no external service, just an <a> tag written straight into the post HTML.
//
// Props:
//   initialText  string — pre-filled from the current selection, if any
//   savedRange   Range | null — cursor/selection position before the modal opened
//   onInsert     fn({ url, text, savedRange })
//   onClose      fn

function LinkModal({ initialText, savedRange, onInsert, onClose }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState(initialText || "");
  const [error, setError] = useState(null);
  const urlInputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => urlInputRef.current?.focus(), 50);
  }, []);

  function handleInsert() {
    const cleanUrl = normalizeLinkUrl(url);
    if (!cleanUrl) { setError("Enter a URL first."); return; }
    onInsert({ url: cleanUrl, text: text.trim(), savedRange });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e8e0d0] p-6 w-80 space-y-4">
        <h3 className="font-serif text-base text-[#1a1a2e]">Insert link</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
            {error}
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a8c7a] mb-1.5">URL</p>
          <input
            ref={urlInputRef}
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(null); }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleInsert(); } }}
            placeholder="https://… or /blog/post-id"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: "#e8e0d0", "--tw-ring-color": "#d4af3740" }}
          />
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a8c7a] mb-1.5">
            Link text {initialText ? "" : "(optional)"}
          </p>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleInsert(); } }}
            placeholder="Words readers will see"
            disabled={!!initialText}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all disabled:bg-[#f5f3ef] disabled:text-[#9a8c7a]"
            style={{ borderColor: "#e8e0d0", "--tw-ring-color": "#d4af3740" }}
          />
          <p className="text-[11px] mt-1.5 text-[#9a8c7a]">
            {initialText ? "Your highlighted text will become the link." : "Leave blank to show the URL itself."}
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button"
            onClick={handleInsert}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "#1a1a2e" }}
          >
            Insert link
          </button>
          <button type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border text-[#6b5c4a] hover:bg-[#f5f3ef] transition-all"
            style={{ borderColor: "#e8e0d0" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Exercise / callout block modal ───────────────────────────────────────────
// Inserts a styled box (dark header + numbered list) — used for "Assignment",
// "Exercise", or any other step-by-step callout in a tutorial-style post.
//
// Props:
//   savedRange   Range | null — cursor position before the modal opened
//   onInsert     fn({ heading, items, savedRange })
//   onClose      fn

function blankStep() {
  return { text: "", linkName: "", linkUrl: "", showLink: false };
}

function BlockModal({ savedRange, onInsert, onClose }) {
  const [heading, setHeading] = useState("Assignment");
  const [items, setItems] = useState([blankStep(), blankStep()]);
  const [error, setError] = useState(null);
  const headingRef = useRef(null);

  useEffect(() => {
    setTimeout(() => headingRef.current?.focus(), 50);
  }, []);

  function updateItem(i, field, value) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function toggleLink(i) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, showLink: !it.showLink } : it)));
  }

  function addItem() {
    setItems(prev => [...prev, blankStep()]);
  }

  function removeItem(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleInsert() {
    const cleanItems = items
      .map(it => ({ text: it.text.trim(), linkName: it.linkName.trim(), linkUrl: it.linkUrl.trim() }))
      .filter(it => it.text || it.linkUrl);
    if (!heading.trim() && cleanItems.length === 0) {
      setError("Add a heading or at least one item.");
      return;
    }
    onInsert({ heading: heading.trim(), items: cleanItems, savedRange });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e8e0d0] p-8 w-full max-w-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-serif text-xl text-[#1a1a2e]">Insert exercise block</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9a8c7a] mb-2">Heading</p>
          <input
            ref={headingRef}
            type="text"
            value={heading}
            onChange={e => { setHeading(e.target.value); setError(null); }}
            placeholder="Assignment"
            className="w-full border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: "#e8e0d0", "--tw-ring-color": "#d4af3740" }}
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9a8c7a] mb-2">Steps</p>
          <div className="space-y-4">
            {items.map((it, i) => (
              <div key={i} className="border rounded-xl p-4" style={{ borderColor: "#f0e8d8", background: "#fdfcfa" }}>
                <div className="flex items-start gap-3">
                  <span className="text-sm text-[#9a8c7a] w-5 flex-shrink-0 pt-3 font-medium">{i + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <textarea
                      value={it.text}
                      onChange={e => updateItem(i, "text", e.target.value)}
                      placeholder={`Step ${i + 1} — write as much as you need…`}
                      rows={2}
                      className="w-full border rounded-lg px-3 py-2.5 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 transition-all"
                      style={{ borderColor: "#e8e0d0", "--tw-ring-color": "#d4af3740", minHeight: "3.2rem" }}
                    />

                    {it.showLink ? (
                      <div className="grid sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a8c7a] mb-1">
                            Link name
                          </p>
                          <input
                            type="text"
                            value={it.linkName}
                            onChange={e => updateItem(i, "linkName", e.target.value)}
                            placeholder="e.g. Character worksheet"
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all"
                            style={{ borderColor: "#e8e0d0", "--tw-ring-color": "#d4af3740" }}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a8c7a] mb-1">
                            Link URL
                          </p>
                          <input
                            type="text"
                            value={it.linkUrl}
                            onChange={e => updateItem(i, "linkUrl", e.target.value)}
                            placeholder="https://…"
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all"
                            style={{ borderColor: "#e8e0d0", "--tw-ring-color": "#d4af3740" }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button type="button"
                        onClick={() => toggleLink(i)}
                        className="text-xs font-medium text-[#7a6a50] hover:text-[#d4af37] flex items-center gap-1 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
                        </svg>
                        Add link to this step
                      </button>
                    )}
                  </div>
                  {items.length > 1 && (
                    <button type="button"
                      onClick={() => removeItem(i)}
                      className="w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-[#b8a898] hover:bg-[#f5f3ef] hover:text-red-500 transition-all"
                      title="Remove step"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button"
            onClick={addItem}
            className="mt-3 text-sm font-medium text-[#7a6a50] hover:text-[#2d3748] flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add step
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button"
            onClick={handleInsert}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "#1a1a2e" }}
          >
            Insert block
          </button>
          <button type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl text-sm font-medium border text-[#6b5c4a] hover:bg-[#f5f3ef] transition-all"
            style={{ borderColor: "#e8e0d0" }}
          >
            Cancel
          </button>
        </div>
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
  const [editorFocused, setEditorFocused] = useState(false);
  const [imagePick, setImagePick] = useState(null); // { url, savedRange }
  const [linkPick, setLinkPick] = useState(null); // { initialText, savedRange }
  const [blockPick, setBlockPick] = useState(null); // { savedRange }

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
          onWordsUpdate?.(wc);
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

  // ── Open the link modal, remembering the current selection ──────────────
  function openLinkModal() {
    const sel = window.getSelection();
    let savedRange = null;
    let initialText = "";
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange = sel.getRangeAt(0).cloneRange();
      initialText = sel.toString();
    }
    setLinkPick({ initialText, savedRange });
  }

  // ── Insert a link after URL/text are chosen ──────────────────────────────
  function insertLink({ url, text, savedRange }) {
    editorRef.current?.focus();

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const sel = window.getSelection();
    if (savedRange) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
      const range = sel.getRangeAt(0);

      if (!range.collapsed) {
        // Wrap the existing selection in the link, ignoring any typed
        // replacement text — the highlighted words become the link text.
        try {
          range.surroundContents(a);
        } catch {
          // Selection spans partial elements (surroundContents can't handle
          // that) — fall back to extracting the text and rebuilding it as
          // a plain link, which always works.
          const fragment = range.extractContents();
          a.appendChild(fragment);
          range.insertNode(a);
        }
        range.setStartAfter(a);
        range.collapse(true);
      } else {
        a.textContent = text || url;
        range.insertNode(a);
        range.setStartAfter(a);
        range.collapse(true);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      a.textContent = text || url;
      editorRef.current?.appendChild(a);
    }
    handleEditorInput();
  }

  // ── Open the exercise-block modal, remembering the current cursor pos ───
  function openBlockModal() {
    const sel = window.getSelection();
    let savedRange = null;
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
    setBlockPick({ savedRange });
  }

  // ── Insert a styled exercise/assignment block ────────────────────────────
  function insertBlock({ heading, items, savedRange }) {
    editorRef.current?.focus();

    const box = document.createElement("div");
    box.setAttribute("data-exercise-block", "1");
    box.style.cssText =
      "background:#1c2333;color:#f5f5f7;border-radius:14px;padding:20px 24px;margin:1.5em 0;";

    if (heading) {
      const h = document.createElement("p");
      h.textContent = heading;
      h.style.cssText = "font-weight:700;font-size:1.05em;margin:0 0 12px 0;color:#ffffff;";
      box.appendChild(h);
    }

    if (items.length > 0) {
      const ol = document.createElement("ol");
      ol.style.cssText = "list-style:decimal;padding-left:1.25em;margin:0;";
      items.forEach(({ text, linkName, linkUrl }) => {
        const li = document.createElement("li");
        li.style.cssText = "margin:0.4em 0;line-height:1.6;";
        if (text) li.appendChild(document.createTextNode(text));
        if (linkUrl) {
          if (text) li.appendChild(document.createTextNode(" "));
          const a = document.createElement("a");
          a.href = normalizeLinkUrl(linkUrl);
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = linkName || linkUrl;
          a.style.cssText = "color:#d4af37;font-weight:600;text-decoration:underline;";
          li.appendChild(a);
        }
        ol.appendChild(li);
      });
      box.appendChild(ol);
    }

    editorRef.current?.focus();
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
      const range = sel.getRangeAt(0);
      range.insertNode(box);
      const after = document.createElement("div");
      after.innerHTML = "<br>";
      box.parentNode.insertBefore(after, box.nextSibling);
      const nr = document.createRange();
      nr.setStart(after, 0);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
    } else {
      editorRef.current?.appendChild(box);
    }
    handleEditorInput();
  }

  // ── Insert image after size is chosen ────────────────────────────────────
  function insertImage({ url, size, align, savedRange }) {
    const img = document.createElement("img");
    img.src = url;
    img.setAttribute("data-inline-image", "1");

    const marginLeft  = align === "right"  ? "auto" : align === "center" ? "auto" : "0";
    const marginRight = align === "left"   ? "auto" : align === "center" ? "auto" : "0";
    img.style.cssText = `width:${size};max-width:100%;height:auto;display:block;margin:1em ${marginRight} 1em ${marginLeft};border-radius:8px;`;

    const wrapper = document.createElement("div");
    wrapper.style.textAlign = align;
    wrapper.appendChild(img);

    editorRef.current?.focus();
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
      const range = sel.getRangeAt(0);
      range.insertNode(wrapper);
      const after = document.createElement("div");
      after.innerHTML = "<br>";
      wrapper.parentNode.insertBefore(after, wrapper.nextSibling);
      const nr = document.createRange();
      nr.setStart(after, 0);
      nr.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nr);
    } else {
      editorRef.current?.appendChild(wrapper);
    }
    handleEditorInput();
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
        onImagePicked={payload => setImagePick(payload)}
        onLinkClick={openLinkModal}
        onBlockClick={openBlockModal}
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
        onFocus={() => setEditorFocused(true)}
        onBlur={() => setEditorFocused(false)}
        data-placeholder="Begin writing…"
        className="px-8 pb-10 outline-none"
        style={editorContainerStyle}
      />

      {/* Word count footer */}
      <div className="px-8 py-3 border-t border-[#f0e8d8] flex-shrink-0">
        <p className="text-xs text-[#b8a898]">{wordCount.toLocaleString()} words</p>
      </div>

      {/* Sticky floating format bar — visible when editor is focused */}
      <FloatingFormatBar
        onCommand={handleCommand}
        onImagePicked={payload => setImagePick(payload)}
        onLinkClick={openLinkModal}
        onBlockClick={openBlockModal}
        visible={editorFocused}
      />

      {/* Image size / alignment picker modal */}
      {imagePick && (
        <ImageSizeModal
          url={imagePick.url}
          savedRange={imagePick.savedRange}
          onInsert={insertImage}
          onClose={() => setImagePick(null)}
        />
      )}

      {/* Link insert modal */}
      {linkPick && (
        <LinkModal
          initialText={linkPick.initialText}
          savedRange={linkPick.savedRange}
          onInsert={insertLink}
          onClose={() => setLinkPick(null)}
        />
      )}

      {/* Exercise/assignment block modal */}
      {blockPick && (
        <BlockModal
          savedRange={blockPick.savedRange}
          onInsert={insertBlock}
          onClose={() => setBlockPick(null)}
        />
      )}

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
        [contenteditable] a { color: #d4af37; text-decoration: underline; cursor: text; }
      `}</style>
    </div>
  );
}