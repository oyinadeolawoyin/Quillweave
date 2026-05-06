import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../auth/authContext";
import Header from "../profile/header";

const API = import.meta.env.VITE_API_URL;

const EVENT_TYPES = ["DAYS_CHALLENGE", "ANNOUNCEMENT", "WORKSHOP", "OTHER"];

const emptyForm = {
  title: "",
  description: "",
  bannerUrl: "",
  type: "DAYS_CHALLENGE",
  daysTarget: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

export default function AdminEvents() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Redirect non-admins immediately
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchEvents();
  }, [user]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/events/admin/all`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      setError("Failed to load events.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingEvent(null);
    setForm(emptyForm);
    setError("");
    setSuccessMsg("");
    setShowForm(true);
  }

  function openEdit(ev) {
    setEditingEvent(ev);
    setForm({
      title: ev.title,
      description: ev.description,
      bannerUrl: ev.bannerUrl || "",
      type: ev.type,
      daysTarget: ev.daysTarget || "",
      startDate: ev.startDate ? ev.startDate.slice(0, 10) : "",
      endDate: ev.endDate ? ev.endDate.slice(0, 10) : "",
      isActive: ev.isActive,
    });
    setError("");
    setSuccessMsg("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingEvent(null);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const url = editingEvent
        ? `${API}/events/admin/${editingEvent.id}/update`
        : `${API}/events/admin/create`;

      const body = {
        ...form,
        daysTarget: form.daysTarget ? Number(form.daysTarget) : undefined,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Something went wrong.");
        return;
      }

      setSuccessMsg(editingEvent ? "Event updated!" : "Event created!");
      setShowForm(false);
      fetchEvents();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(eventId) {
    try {
      const res = await fetch(`${API}/events/admin/${eventId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setDeleteConfirm(null);
      setSuccessMsg("Event deleted.");
      fetchEvents();
    } catch {
      setError("Failed to delete event.");
    }
  }

  async function toggleActive(ev) {
    try {
      const res = await fetch(`${API}/events/admin/${ev.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !ev.isActive }),
      });
      if (!res.ok) throw new Error();
      fetchEvents();
    } catch {
      setError("Failed to update event.");
    }
  }

  if (!user || user.role !== "ADMIN") return null;

  const typeColors = {
    DAYS_CHALLENGE: "bg-pink-100 text-pink-700",
    ANNOUNCEMENT: "bg-blue-100 text-blue-700",
    WORKSHOP: "bg-yellow-100 text-yellow-700",
    OTHER: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="min-h-screen bg-[#f5f0eb]">
      <Header />
      {/* Page sub-header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-gray-700 transition-colors text-sm"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Events Admin</h1>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#c0392b] text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-[#a93226] transition-colors"
        >
          + New Event
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
            {successMsg}
          </div>
        )}
        {error && !showForm && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading events…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">No events yet.</p>
            <button
              onClick={openCreate}
              className="bg-[#c0392b] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#a93226] transition-colors"
            >
              Create your first event
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          typeColors[ev.type] || typeColors.OTHER
                        }`}
                      >
                        {ev.type.replace("_", " ")}
                      </span>
                      {ev.type === "DAYS_CHALLENGE" && ev.daysTarget && (
                        <span className="text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-medium">
                          {ev.daysTarget} days
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ev.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {ev.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg truncate">{ev.title}</h3>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{ev.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(ev.startDate).toLocaleDateString()} →{" "}
                      {new Date(ev.endDate).toLocaleDateString()}
                      {ev._count && (
                        <span className="ml-3 font-medium text-gray-500">
                          {ev._count.entries} entries
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(ev)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                        ev.isActive
                          ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                          : "border-green-300 text-green-700 hover:bg-green-50"
                      }`}
                    >
                      {ev.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => openEdit(ev)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(ev)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <p className="text-xs font-semibold text-[#c0392b] uppercase tracking-widest">
                  {editingEvent ? "Edit Event" : "New Event"}
                </p>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingEvent ? editingEvent.title : "Create a platform event"}
                </h2>
              </div>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Event Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                        form.type === t
                          ? "border-[#c0392b] bg-red-50 text-[#c0392b]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {t.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Title *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="e.g. 30-Day Writing Challenge"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0392b]/20 focus:border-[#c0392b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Describe the event..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0392b]/20 focus:border-[#c0392b] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Banner Image URL (optional)
                </label>
                <input
                  value={form.bannerUrl}
                  onChange={(e) => setForm((f) => ({ ...f, bannerUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0392b]/20 focus:border-[#c0392b]"
                />
              </div>

              {form.type === "DAYS_CHALLENGE" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Days Target *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.daysTarget}
                    onChange={(e) => setForm((f) => ({ ...f, daysTarget: e.target.value }))}
                    required
                    placeholder="e.g. 30"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0392b]/20 focus:border-[#c0392b]"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    How many consecutive days writers need to hit to complete the challenge.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0392b]/20 focus:border-[#c0392b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0392b]/20 focus:border-[#c0392b]"
                  />
                </div>
              </div>

              {editingEvent && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <label className="text-sm font-medium text-gray-700 flex-1">
                    Event is active
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      form.isActive ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        form.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#c0392b] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#a93226] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {submitting
                  ? "Saving…"
                  : editingEvent
                  ? "Save Changes"
                  : "Create Event"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete event?</h3>
            <p className="text-gray-500 text-sm mb-6">
              "{deleteConfirm.title}" will be permanently deleted and all enrolled projects will be
              unenrolled. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}