// src/components/minichallenge/adminminichallenges.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { AppMetaTags } from "../utilis/metatags";

const NAVY = "#1a1a2e";
const GOLD = "#d4af37";
const CREAM = "#f5f3ef";
const BORDER = "#e8e0d0";
const MUTED = "#9a8c7a";
const BODY = "#6b5c4a";

const TYPE_OPTIONS = [
  { value: "SESSION_COUNT",    label: "Session Count",     hint: "Log activity on N distinct days this week." },
  { value: "WEEKLY_GOAL",      label: "Weekly Goal",       hint: "Hit the writer's own weekly word/chapter/scene goal — target value below is ignored." },
  { value: "SPRINT_COUNT",     label: "Sprint Count",      hint: "Complete N sprints this week." },
  { value: "CONSECUTIVE_DAYS", label: "Consecutive Days",  hint: "Reach an N-day writing streak by week's end." },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE FORM
// ═══════════════════════════════════════════════════════════════════════════════

function TemplateForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [type, setType] = useState(initial?.type || "SESSION_COUNT");
  const [targetValue, setTargetValue] = useState(initial?.targetValue ?? 3);
  const [badgeIcon, setBadgeIcon] = useState(initial?.badgeIcon || "🔥");
  const [badgeName, setBadgeName] = useState(initial?.badgeName || "");
  const [rotationOrder, setRotationOrder] = useState(initial?.rotationOrder ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim())    { setError("Title is required."); return; }
    if (!badgeName.trim()) { setError("Badge name is required."); return; }
    if (!badgeIcon.trim()) { setError("Badge icon is required."); return; }
    if (!Number.isFinite(Number(targetValue)) || Number(targetValue) < 1) {
      setError("Target value must be a positive number."); return;
    }
    if (!Number.isFinite(Number(rotationOrder)) || Number(rotationOrder) < 0) {
      setError("Rotation order must be 0 or greater."); return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const isEdit = !!initial?.id;
      const url = isEdit ? `${API_URL}/mini-challenges/templates/${initial.id}` : `${API_URL}/mini-challenges/templates`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type,
          targetValue: Number(targetValue),
          badgeIcon: badgeIcon.trim(),
          badgeName: badgeName.trim(),
          rotationOrder: Number(rotationOrder),
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong."); return; }
      onSave(data.template, isEdit);
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedType = TYPE_OPTIONS.find((t) => t.value === type);

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
          placeholder="e.g. Session Sprint Week"
          required
          className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shown to members on the challenge page"
          rows={2}
          className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-y transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
          Type <span className="text-red-500">*</span>
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 transition-all"
          style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
        >
          {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {selectedType && <p className="text-xs mt-1.5" style={{ color: MUTED }}>{selectedType.hint}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
            Target value
            {type === "WEEKLY_GOAL" && <span className="font-normal ml-1" style={{ color: MUTED }}>(ignored for this type)</span>}
          </label>
          <input
            type="number"
            min={1}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            disabled={type === "WEEKLY_GOAL"}
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
            style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
            Rotation order <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            value={rotationOrder}
            onChange={(e) => setRotationOrder(e.target.value)}
            required
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
          />
          <p className="text-xs mt-1.5" style={{ color: MUTED }}>Position in the weekly rotation — must be unique across templates.</p>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: `${GOLD}0d`, border: `1px solid ${GOLD}40` }}>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
          Badge <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={badgeIcon}
            onChange={(e) => setBadgeIcon(e.target.value)}
            placeholder="🔥"
            required
            maxLength={4}
            className="w-16 border rounded-xl px-3 py-2.5 text-lg text-center bg-white focus:outline-none focus:ring-2 transition-all flex-shrink-0"
            style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
          />
          <input
            type="text"
            value={badgeName}
            onChange={(e) => setBadgeName(e.target.value)}
            placeholder='e.g. "Session Streaker"'
            required
            maxLength={50}
            className="flex-1 border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: BORDER, "--tw-ring-color": `${GOLD}40` }}
          />
        </div>
        <p className="text-xs mt-1.5" style={{ color: MUTED }}>
          Granted automatically — no one has to join anything. Anyone whose weekly activity clears the
          bar gets this on their profile once they claim it.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 shadow-soft"
          style={{ background: NAVY }}
        >
          {submitting ? "Saving…" : initial?.id ? "Update Template" : "Create Template"}
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
// TEMPLATE ROW
// ═══════════════════════════════════════════════════════════════════════════════

function TemplateRow({ template, onEdit, onToggled }) {
  const [toggling, setToggling] = useState(false);
  const typeInfo = TYPE_OPTIONS.find((t) => t.value === template.type);

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await fetch(`${API_URL}/mini-challenges/templates/${template.id}/active`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      const data = await res.json();
      if (res.ok) onToggled(data.template);
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div
      className="bg-white rounded-xl border p-4 flex items-start gap-4 transition-opacity"
      style={{ borderColor: BORDER, opacity: template.isActive ? 1 : 0.55 }}
    >
      <div className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: `${GOLD}15` }}>
        {template.badgeIcon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span
            className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-sm flex-shrink-0"
            style={{ background: template.isActive ? GOLD : "#e5e5e5", color: template.isActive ? "white" : "#6b6b6b" }}
          >
            {template.isActive ? "Active" : "Paused"}
          </span>
          <h3 className="font-serif text-base truncate" style={{ color: NAVY }}>{template.title}</h3>
        </div>
        <p className="text-xs mb-1.5" style={{ color: MUTED }}>{typeInfo?.label ?? template.type} · Rotation #{template.rotationOrder}</p>
        <p className="text-xs" style={{ color: MUTED }}>
          Target: <strong style={{ color: NAVY }}>{template.type === "WEEKLY_GOAL" ? "writer's own weekly goal" : template.targetValue}</strong>
          {" · "}Badge: <strong style={{ color: NAVY }}>{template.badgeName}</strong>
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-all disabled:opacity-50"
          style={{ borderColor: BORDER, color: BODY }}
        >
          {toggling ? "…" : template.isActive ? "Disable" : "Enable"}
        </button>
        <button onClick={() => onEdit(template)} className="p-1.5 hover:bg-gray-50 transition-colors rounded-lg" style={{ color: MUTED }} title="Edit template">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminMiniChallenges() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "create" | "edit"
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchTemplates();
  }, [user]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/mini-challenges/templates?includeInactive=true`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTemplates((data.templates || []).sort((a, b) => a.rotationOrder - b.rotationOrder));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSave(template, isEdit) {
    setTemplates((prev) => {
      const next = isEdit ? prev.map((t) => (t.id === template.id ? template : t)) : [...prev, template];
      return next.sort((a, b) => a.rotationOrder - b.rotationOrder);
    });
    setView("list");
    setEditingTemplate(null);
  }

  function handleEdit(template) {
    setEditingTemplate(template);
    setView("edit");
  }

  function handleToggled(template) {
    setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
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
      <AppMetaTags title="Admin · Weekly Challenges" description="Manage the rotating weekly mini-challenge templates on Quillweave." />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: GOLD }}>Admin Panel</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight mb-1" style={{ color: NAVY }}>Weekly Challenges</h1>
          <p className="text-sm" style={{ color: MUTED }}>
            This is a rotation, not a schedule — whichever active template comes up next runs automatically
            every week, forever. No one joins; the system just checks everyone's own writing activity.
          </p>
        </div>

        {view === "list" && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-serif" style={{ color: NAVY }}>All Templates</h2>
            <button
              onClick={() => setView("create")}
              className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-soft"
              style={{ background: NAVY }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Template
            </button>
          </div>
        )}

        {(view === "create" || view === "edit") && (
          <div className="bg-white rounded-2xl shadow-soft border p-6 sm:p-8 mb-8" style={{ borderColor: BORDER }}>
            <h2 className="text-xl font-serif mb-6" style={{ color: NAVY }}>
              {view === "edit" ? "Edit Template" : "New Template"}
            </h2>
            <TemplateForm
              initial={editingTemplate}
              onSave={handleSave}
              onCancel={() => { setView("list"); setEditingTemplate(null); }}
            />
          </div>
        )}

        {view === "list" && (
          loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white rounded-xl animate-pulse border" style={{ borderColor: BORDER }} />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border" style={{ borderColor: BORDER }}>
              <div className="text-4xl mb-3">🔥</div>
              <p className="text-sm" style={{ color: MUTED }}>No templates yet. Create your first one to kick off the rotation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <TemplateRow key={t.id} template={t} onEdit={handleEdit} onToggled={handleToggled} />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}