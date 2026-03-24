import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Helpers ───────────────────────────────────────────────────
function formatWeekRange(weekStart) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const opts = { month: "short", day: "numeric", timeZone: "UTC" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

function getMondayOfCurrentWeek() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ── Session Row (inside the form) ────────────────────────────
function SessionRow({ session, index, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
      <span className="text-xs text-gray-400 w-5 text-center">{index + 1}</span>
      <select
        value={session.dayOfWeek}
        onChange={(e) => onChange(index, "dayOfWeek", Number(e.target.value))}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d3748]/30 bg-white"
      >
        {DAY_NAMES_FULL.map((d, i) => (
          <option key={i} value={i}>{d}</option>
        ))}
      </select>
      <input
        type="time"
        value={session.time}
        onChange={(e) => onChange(index, "time", e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d3748]/30 bg-white"
      />
      <input
        type="text"
        value={session.label}
        onChange={(e) => onChange(index, "label", e.target.value)}
        placeholder="Label (optional)"
        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d3748]/30 bg-white"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
        title="Remove session"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Create / Edit Form ────────────────────────────────────────
function ScheduleForm({ initial, onSave, onCancel }) {
  const isEdit = !!initial?.id;

  const [weekStart, setWeekStart] = useState(
    initial?.weekStart ? new Date(initial.weekStart).toISOString().slice(0, 10) : getMondayOfCurrentWeek()
  );
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [sessions, setSessions] = useState(
    initial?.sessions?.length
      ? initial.sessions.map((s) => ({ dayOfWeek: s.dayOfWeek, time: s.time, label: s.label || "" }))
      : [{ dayOfWeek: 1, time: "09:00", label: "" }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleSessionChange(index, field, value) {
    setSessions((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addSession() {
    setSessions((prev) => [...prev, { dayOfWeek: 1, time: "09:00", label: "" }]);
  }

  function removeSession(index) {
    setSessions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    if (sessions.length === 0) { setError("Add at least one session."); return; }

    // Convert HH:MM (from time input) to HH:mm string — already correct format
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      ...(isEdit ? {} : {
        weekStart,
        sessions: sessions.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          time: s.time,
          label: s.label.trim() || undefined,
        })),
      }),
    };

    setError(null);
    setSubmitting(true);

    try {
      const url = isEdit ? `${API_URL}/schedule/${initial.id}` : `${API_URL}/schedule`;
      const method = isEdit ? "POST" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong."); return; }
      onSave(data.schedule, isEdit);
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-[#2d3748] mb-1">
            Week starting <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d3748]/30"
          />
          <p className="text-xs text-gray-400 mt-1">The backend normalises this to the Monday of that ISO week.</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#2d3748] mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Week 14 Writing Schedule"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d3748]/30"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#2d3748] mb-1">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any notes for the week…"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d3748]/30 resize-y"
        />
      </div>

      {!isEdit && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-[#2d3748]">
              Sessions <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={addSession}
              className="flex items-center gap-1 text-xs text-[#2d3748] font-medium hover:opacity-70 transition-opacity"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add session
            </button>
          </div>
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <SessionRow
                key={i}
                index={i}
                session={s}
                onChange={handleSessionChange}
                onRemove={removeSession}
              />
            ))}
          </div>
          {sessions.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No sessions yet — click "Add session" above.</p>
          )}
        </div>
      )}

      {isEdit && (
        <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          💡 To add, edit, or remove individual sessions on this schedule, use the session controls on the schedule card below.
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-[#2d3748] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60"
        >
          {submitting ? "Saving…" : isEdit ? "Update Schedule" : "Create Schedule"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-gray-200 text-[#4a4a4a] rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Inline Add Session Form ────────────────────────────────────
function AddSessionInline({ scheduleId, onAdded, onCancel }) {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [time, setTime] = useState("09:00");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/schedule/${scheduleId}/sessions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfWeek, time, label: label.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Error adding session."); return; }
      onAdded(data.session);
      setLabel(""); setTime("09:00"); setDayOfWeek(1);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-[#f7f4ee] border border-[#e8e0d0] rounded-xl space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d3748]/30"
        >
          {DAY_NAMES_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d3748]/30"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d3748]/30"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1.5 bg-[#2d3748] text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-all"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Single Session Item ────────────────────────────────────────
function SessionItem({ session, onToggleDone, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(session.dayOfWeek);
  const [time, setTime] = useState(session.time);
  const [label, setLabel] = useState(session.label || "");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/schedule/sessions/${session.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfWeek, time, label: label.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) { onUpdate(data.session); setEditing(false); }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await fetch(`${API_URL}/schedule/sessions/${session.id}/done`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: !session.isDone }),
      });
      const data = await res.json();
      if (res.ok) onToggleDone(data.session);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove this session?")) return;
    await fetch(`${API_URL}/schedule/sessions/${session.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    onDelete(session.id);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-[#f7f4ee] rounded-xl flex-wrap">
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none"
        >
          {DAY_NAMES_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 bg-[#2d3748] text-white rounded-lg text-xs font-medium disabled:opacity-60"
        >
          {saving ? "…" : "Save"}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${session.isDone ? "bg-green-50" : "hover:bg-gray-50"}`}>
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          session.isDone
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 hover:border-green-400"
        } disabled:opacity-50`}
        title={session.isDone ? "Mark undone" : "Mark done"}
      >
        {session.isDone && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <span className={`text-xs font-medium w-8 text-center rounded-md py-0.5 ${
        session.isDone ? "text-green-600" : "text-[#2d3748] bg-gray-100"
      }`}>
        {DAY_NAMES[session.dayOfWeek]}
      </span>
      <span className={`text-sm font-mono ${session.isDone ? "text-gray-400 line-through" : "text-[#2d3748]"}`}>
        {session.time}
      </span>
      {session.label && (
        <span className={`text-xs flex-1 truncate ${session.isDone ? "text-gray-400" : "text-gray-500"}`}>
          {session.label}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-gray-400 hover:text-[#2d3748] transition-colors rounded hover:bg-gray-100"
          title="Edit session"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
          title="Delete session"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Schedule Card ─────────────────────────────────────────────
function ScheduleCard({ schedule, onEdit, onDelete, onScheduleUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState(schedule.sessions || []);
  const [showAddSession, setShowAddSession] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doneCount = sessions.filter((s) => s.isDone).length;
  const total = sessions.length;

  async function handleDelete() {
    if (!confirm(`Delete schedule "${schedule.title}"? This removes all its sessions too.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/schedule/${schedule.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) onDelete(schedule.id);
    } finally {
      setDeleting(false);
    }
  }

  function handleSessionToggle(updated) {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleSessionUpdate(updated) {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleSessionDelete(sessionId) {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }

  function handleSessionAdded(newSession) {
    setSessions((prev) => [...prev, newSession].sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time)
    ));
    setShowAddSession(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-base text-[#2d3748] leading-tight">{schedule.title}</h3>
            {schedule.isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{formatWeekRange(schedule.weekStart)}</p>
          {schedule.description && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{schedule.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-400">{total} session{total !== 1 ? "s" : ""}</span>
            {total > 0 && (
              <span className="text-xs text-gray-400">
                {doneCount}/{total} done
              </span>
            )}
            {total > 0 && (
              <div className="flex-1 max-w-[80px] h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: `${(doneCount / total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 text-gray-400 hover:text-[#2d3748] transition-colors rounded-lg hover:bg-gray-50"
            title={expanded ? "Collapse" : "Expand sessions"}
          >
            <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={() => onEdit(schedule)}
            className="p-1.5 text-gray-400 hover:text-[#2d3748] transition-colors rounded-lg hover:bg-gray-50"
            title="Edit schedule"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
            title="Delete schedule"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sessions (expanded) */}
      {expanded && (
        <div className="px-6 pb-5 border-t border-gray-50 pt-3">
          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No sessions yet.</p>
          ) : (
            <div className="space-y-0.5">
              {sessions.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  onToggleDone={handleSessionToggle}
                  onUpdate={handleSessionUpdate}
                  onDelete={handleSessionDelete}
                />
              ))}
            </div>
          )}

          {showAddSession ? (
            <AddSessionInline
              scheduleId={schedule.id}
              onAdded={handleSessionAdded}
              onCancel={() => setShowAddSession(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddSession(true)}
              className="mt-3 flex items-center gap-1.5 text-xs text-[#2d3748] font-medium hover:opacity-70 transition-opacity"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add session
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function AdminSchedule() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [view, setView] = useState("list"); // "list" | "create" | "edit"
  const [editingSchedule, setEditingSchedule] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchSchedules();
  }, [user]);

  async function fetchSchedules() {
    setLoadingSchedules(true);
    try {
      const res = await fetch(`${API_URL}/schedule`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSchedules(false);
    }
  }

  function handleSave(schedule, isEdit) {
    if (isEdit) {
      setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? schedule : s)));
    } else {
      setSchedules((prev) => [schedule, ...prev]);
    }
    setView("list");
    setEditingSchedule(null);
  }

  function handleEdit(schedule) {
    setEditingSchedule(schedule);
    setView("edit");
  }

  function handleDelete(scheduleId) {
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold mb-2">
              Admin Panel
            </div>
            <h1 className="text-3xl font-serif text-[#2d3748]">Schedule Management</h1>
          </div>
          {view === "list" && (
            <button
              onClick={() => setView("create")}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2d3748] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Schedule
            </button>
          )}
        </div>

        {/* Create / Edit form */}
        {(view === "create" || view === "edit") && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
            <h2 className="text-xl font-serif text-[#2d3748] mb-6">
              {view === "edit" ? "Edit Schedule" : "New Schedule"}
            </h2>
            <ScheduleForm
              initial={editingSchedule}
              onSave={handleSave}
              onCancel={() => { setView("list"); setEditingSchedule(null); }}
            />
          </div>
        )}

        {/* Schedules list */}
        {view === "list" && (
          <>
            {loadingSchedules ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-gray-400 text-sm">No schedules yet. Create your first one!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onScheduleUpdate={(updated) =>
                      setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}