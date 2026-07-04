import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { renderMarkdownLite, stripMarkdown } from "./markdownlite";

// ─── Shared color tokens (matches AdminBlog / Accountability palette) ─────────
const NAVY = "#1a1a2e";
const GOLD = "#d4af37";
const CREAM = "#f5f3ef";
const BORDER = "#e8e0d0";
const MUTED = "#9a8c7a";
const BODY = "#6b5c4a";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function toDateInputValue(d) {
  if (!d) return "";
  const date = new Date(d);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date - tzOffset).toISOString().slice(0, 10);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT FORM
// ═══════════════════════════════════════════════════════════════════════════════

function EventForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [startDate, setStartDate] = useState(toDateInputValue(initial?.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(initial?.endDate));
  const [badgeName, setBadgeName] = useState(initial?.badgeName || "");
  const [badgeIcon, setBadgeIcon] = useState(initial?.badgeIcon || "🏆");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initial?.imageUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim())        { setError("Title is required."); return; }
    if (!description.trim())  { setError("Description is required."); return; }
    if (!startDate)           { setError("Start date is required."); return; }
    if (!endDate)             { setError("End date is required."); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError("End date must be after the start date."); return; }
    if (!badgeName.trim()) { setError("Badge name is required — this is what participants who finish their draft plan earn."); return; }
    if (!badgeIcon.trim()) { setError("Badge icon is required — pick an emoji to represent it."); return; }

    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("startDate", new Date(startDate).toISOString());
      formData.append("endDate", new Date(endDate).toISOString());
      formData.append("badgeName", badgeName.trim());
      formData.append("badgeIcon", badgeIcon.trim());
      if (imageFile) formData.append("image", imageFile);

      const isEdit = !!initial?.id;
      const url = isEdit ? `${API_URL}/events/${initial.id}` : `${API_URL}/events`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        body: formData,
        // no Content-Type — browser sets multipart boundary automatically
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong."); return; }
      onSave(data.event, isEdit);
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

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Design Your Summer Writing Routine"
          required
          className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-semibold" style={{ color: NAVY }}>
            Description <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs font-semibold"
            style={{ color: GOLD }}
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>

        {showPreview ? (
          <div
            className="w-full border rounded-xl px-4 py-2.5 text-sm min-h-[104px]"
            style={{ borderColor: BORDER, color: BODY }}
          >
            {description.trim()
              ? renderMarkdownLite(description)
              : <span style={{ color: MUTED }}>Nothing to preview yet.</span>}
          </div>
        ) : (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this event about?"
            rows={4}
            required
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-y transition-all"
            style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
          />
        )}
        <p className="text-xs mt-1.5" style={{ color: MUTED }}>
          Supports <strong>**bold**</strong> and <em>*italic*</em>. Leave a blank line between lines to start a new paragraph.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
            Start date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
            End date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
          />
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: `${GOLD}0d`, border: `1px solid ${GOLD}40` }}>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
          Finisher badge <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={badgeIcon}
            onChange={(e) => setBadgeIcon(e.target.value)}
            placeholder="🏆"
            required
            maxLength={4}
            className="w-16 border rounded-xl px-3 py-2.5 text-lg text-center bg-white focus:outline-none focus:ring-2 transition-all flex-shrink-0"
            style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
          />
          <input
            type="text"
            value={badgeName}
            onChange={(e) => setBadgeName(e.target.value)}
            placeholder='e.g. "Summer Routine Finisher"'
            required
            maxLength={50}
            className="flex-1 border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
          />
        </div>
        <p className="text-xs mt-1.5" style={{ color: MUTED }}>
          When the event ends, anyone whose draft plan hit its writing target automatically earns this
          badge on their profile. It never touches their account role — badges and roles are separate.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Cover image (optional)</label>
        {previewUrl && (
          <div className="mb-3 relative inline-block">
            <img src={previewUrl} alt="Preview" className="h-36 w-auto rounded-xl object-cover border" style={{ borderColor: BORDER }} />
            <button
              type="button"
              onClick={() => { setImageFile(null); setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute top-1.5 right-1.5 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow text-gray-500 hover:text-red-500 text-xs font-bold border"
              style={{ borderColor: BORDER }}
            >
              ✕
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="event-image-upload"
        />
        <label
          htmlFor="event-image-upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-all select-none"
          style={{ background: NAVY, color: "white" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {previewUrl ? "Change image" : "Upload image"}
        </label>
        {imageFile && (
          <p className="text-xs mt-2" style={{ color: MUTED }}>{imageFile.name}</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 shadow-soft"
          style={{ background: NAVY }}
        >
          {submitting ? "Saving…" : initial?.id ? "Update Event" : "Create Event"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border rounded-xl text-sm font-medium hover:bg-white transition-all"
          style={{ borderColor: BORDER, color: BODY }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT ROW
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }) {
  const styles = {
    ACTIVE:   { background: GOLD, color: "white", label: "Active" },
    UPCOMING: { background: NAVY, color: "white", label: "Upcoming" },
    ENDED:    { background: "#e5e5e5", color: "#6b6b6b", label: "Ended" },
  }[status] || { background: MUTED, color: "white", label: status };
  return (
    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm flex-shrink-0" style={{ background: styles.background, color: styles.color }}>
      {styles.label}
    </span>
  );
}

function EventRow({ event, onEdit, onDelete, onFinalize }) {
  const [deleting, setDeleting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/events/${event.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) onDelete(event.id);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  async function handleFinalize() {
    if (!confirm(`Finalize "${event.title}" now? Anyone who's finished their draft plan will earn the "${event.badgeName}" badge immediately.`)) return;
    setFinalizing(true);
    try {
      const res = await fetch(`${API_URL}/events/${event.id}/finalize`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        onFinalize(event.id, data);
        alert(`Finalized. ${data.finisherUserIds?.length ?? 0} writer(s) earned the "${event.badgeName}" badge.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-4 flex items-start gap-4" style={{ borderColor: BORDER }}>
      {event.imageUrl ? (
        <img src={event.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: `${GOLD}15` }}>
          🎉
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={event.status} />
              <h3 className="font-serif text-base truncate" style={{ color: NAVY }}>{event.title}</h3>
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>
              {formatDate(event.startDate)} – {formatDate(event.endDate)}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap" style={{ color: MUTED }}>
              <span>{event.participantCount ?? 0} participating</span>
              <span>Finisher badge: <strong style={{ color: NAVY }}>{event.badgeIcon} {event.badgeName}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {event.status !== "ENDED" && (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-all disabled:opacity-50"
                style={{ borderColor: BORDER, color: BODY }}
                title="Finalize now instead of waiting for the event to end automatically"
              >
                {finalizing ? "Finalizing…" : "Finalize now"}
              </button>
            )}
            <button
              onClick={() => onEdit(event)}
              className="p-1.5 hover:bg-gray-50 transition-colors rounded-lg"
              style={{ color: MUTED }}
              title="Edit event"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
              title="Delete event"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminEvents() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "create" | "edit"
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchEvents();
  }, [user]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/events?limit=50`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSave(event, isEdit) {
    if (isEdit) {
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    } else {
      setEvents((prev) => [event, ...prev]);
    }
    setView("list");
    setEditingEvent(null);
  }

  function handleEdit(event) {
    setEditingEvent(event);
    setView("edit");
  }

  function handleDelete(eventId) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

  function handleFinalize(eventId, data) {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...data.event } : e)));
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <div className="text-sm" style={{ color: MUTED }}>Loading…</div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: GOLD }}>Admin Panel</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight mb-1" style={{ color: NAVY }}>Events</h1>
          <p className="text-sm" style={{ color: MUTED }}>
            Create community events tied to draft plans — set a finisher badge, and writers who
            complete their plan by the end date earn it automatically.
          </p>
        </div>

        {view === "list" && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-serif" style={{ color: NAVY }}>All Events</h2>
            <button
              onClick={() => setView("create")}
              className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-soft"
              style={{ background: NAVY }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Event
            </button>
          </div>
        )}

        {(view === "create" || view === "edit") && (
          <div className="bg-white rounded-2xl shadow-soft border p-6 sm:p-8 mb-8" style={{ borderColor: BORDER }}>
            <h2 className="text-xl font-serif mb-6" style={{ color: NAVY }}>
              {view === "edit" ? "Edit Event" : "New Event"}
            </h2>
            <EventForm
              initial={editingEvent}
              onSave={handleSave}
              onCancel={() => { setView("list"); setEditingEvent(null); }}
            />
          </div>
        )}

        {view === "list" && (
          loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white rounded-xl animate-pulse border" style={{ borderColor: BORDER }} />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: BORDER }}>
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-sm" style={{ color: MUTED }}>No events yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onFinalize={handleFinalize}
                />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}