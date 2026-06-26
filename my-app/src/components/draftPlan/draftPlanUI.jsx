// src/components/draftplan/draftPlanUI.jsx
// Small shared primitives reused across the wizard and plan dashboard,
// styled to match the existing parchment / navy / gold theme used in
// Homepage.jsx (ProfileBar, SectionTitle, modals, etc).

export function SectionTitle({ children, action }) {
    return (
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e8e0d0]">
        <h2
          className="font-serif text-[#1a1a2e] text-base font-semibold pl-3"
          style={{ borderLeft: "3px solid #d4af37" }}
        >
          {children}
        </h2>
        {action}
      </div>
    );
  }
  
  export function Card({ children, className = "", accent = false }) {
    return (
      <div
        className={`bg-white border border-[#e8e0d0] rounded-xl p-5 sm:p-6 ${className}`}
        style={accent ? { borderTop: "3px solid #d4af37" } : undefined}
      >
        {children}
      </div>
    );
  }
  
  export function PrimaryButton({ children, onClick, disabled, type = "button", className = "" }) {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`py-2.5 px-5 bg-[#d4af37] text-[#1a1a2e] text-sm font-bold rounded-lg hover:bg-[#c9a42d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {children}
      </button>
    );
  }
  
  export function SecondaryButton({ children, onClick, disabled, type = "button", className = "" }) {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`py-2.5 px-5 border border-[#1a1a2e] text-[#1a1a2e] text-sm font-semibold rounded-lg hover:bg-[#1a1a2e] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {children}
      </button>
    );
  }
  
  export function GhostButton({ children, onClick, disabled, className = "" }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors disabled:opacity-50 ${className}`}
      >
        {children}
      </button>
    );
  }
  
  export function FieldLabel({ children, hint }) {
    return (
      <label className="block mb-1.5">
        <span className="text-[12px] font-semibold text-[#1a1a2e]">{children}</span>
        {hint && <span className="block text-[11px] text-[#9a8c7a] mt-0.5 font-normal leading-snug">{hint}</span>}
      </label>
    );
  }
  
  export function TextInput({ value, onChange, placeholder, type = "text", min, onKeyDown, className = "" }) {
    return (
      <input
        type={type}
        min={min}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 border border-[#e8e0d0] rounded-lg text-[13px] text-[#1a1a2e] placeholder:text-[#c2b8a8] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] bg-white transition-colors ${className}`}
      />
    );
  }
  
  export function TextArea({ value, onChange, placeholder, rows = 3, maxLength, className = "" }) {
    return (
      <div>
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={`w-full px-3.5 py-2.5 border border-[#e8e0d0] rounded-lg text-[13px] text-[#1a1a2e] placeholder:text-[#c2b8a8] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] bg-white transition-colors resize-none ${className}`}
        />
        {maxLength && (
          <p className="text-[10px] text-[#c2b8a8] mt-1 text-right">
            {(value ?? "").length}/{maxLength}
          </p>
        )}
      </div>
    );
  }
  
  export function ErrorText({ children }) {
    if (!children) return null;
    return <p className="text-[12px] text-[#c0392b] mt-1.5 leading-relaxed">{children}</p>;
  }
  
  // Pill-style single-select option group (used for goalType, weekdays, etc.)
  export function PillSelect({ options, value, onChange, columns = 3 }) {
    return (
      <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="py-2.5 text-[12px] font-semibold rounded-lg border transition-all"
            style={
              value === o.value
                ? { background: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" }
                : { background: "#faf7f2", color: "#6b5c4a", borderColor: "#e8e0d0" }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  
  // Multi-select pill group (used for weekday picker)
  export function PillMultiSelect({ options, values, onToggle, columns = 7 }) {
    return (
      <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const active = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className="py-2.5 text-[11px] font-bold rounded-lg border transition-all"
              style={
                active
                  ? { background: "#d4af37", color: "#1a1a2e", borderColor: "#d4af37" }
                  : { background: "#faf7f2", color: "#9a8c7a", borderColor: "#e8e0d0" }
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }
  
  export function ProgressRing({ percent, size = 110, stroke = 10 }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (Math.min(Math.max(percent, 0), 100) / 100) * c;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0ebe3" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#d4af37"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
    );
  }
  
  export function LinearProgress({ percent, color = "#d4af37", track = "#f0ebe3", height = 6 }) {
    return (
      <div className="w-full rounded-full overflow-hidden" style={{ background: track, height }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, background: color }}
        />
      </div>
    );
  }
  
  export function StepDots({ total, current }) {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 20 : 6,
              height: 6,
              background: i <= current ? "#d4af37" : "#e8e0d0",
            }}
          />
        ))}
      </div>
    );
  }