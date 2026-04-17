import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "../../config/api";

const GENRES = [
  "Literary Fiction", "Fantasy", "Science Fiction", "Romance", "Mystery",
  "Thriller", "Horror", "Historical Fiction", "Contemporary Fiction",
  "Young Adult", "Middle Grade", "Memoir", "Non-fiction", "Poetry",
  "Screenplay", "Graphic Novel", "Short Stories", "Other"
];

const SESSION_GOAL_TYPES = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

function InputField({ label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#2d3748]">{label}</label>
      {hint && <p className="text-xs text-[#9a8c7a] -mt-1">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function CreateEditProject() {
  const { projectId } = useParams(); // present when editing
  const isEdit = Boolean(projectId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: "", description: "", link: "", genre: "", visibility: "PRIVATE",
    targetWordCount: "", deadline: "", daysPerWeek: "5",
    targetChapters: "", targetScenes: "",
    sessionGoalType: "", sessionGoalCount: "",
    status: "IN_PROGRESS",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`${API_URL}/projects/${projectId}/dashboard`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ project }) => {
        setForm({
          title: project.title || "",
          description: project.description || "",
          link: project.link || "",
          genre: project.genre || "",
          visibility: project.visibility || "PRIVATE",
          targetWordCount: project.targetWordCount ?? "",
          deadline: project.deadline ? project.deadline.split("T")[0] : "",
          daysPerWeek: project.daysPerWeek ?? "5",
          targetChapters: project.targetChapters ?? "",
          targetScenes: project.targetScenes ?? "",
          sessionGoalType: project.sessionGoalType || "",
          sessionGoalCount: project.sessionGoalCount ?? "",
          status: project.status || "IN_PROGRESS",
        });
      })
      .catch(() => navigate("/projects"))
      .finally(() => setFetching(false));
  }, [projectId, isEdit]);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (form.deadline && new Date(form.deadline) <= new Date()) e.deadline = "Deadline must be a future date.";
    if (form.targetWordCount && Number(form.targetWordCount) <= 0) e.targetWordCount = "Must be a positive number.";
    if (form.daysPerWeek && (Number(form.daysPerWeek) < 1 || Number(form.daysPerWeek) > 7)) e.daysPerWeek = "Must be between 1 and 7.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const payload = {
      ...form,
      targetWordCount: form.targetWordCount ? Number(form.targetWordCount) : null,
      targetChapters: form.targetChapters ? Number(form.targetChapters) : null,
      targetScenes: form.targetScenes ? Number(form.targetScenes) : null,
      sessionGoalCount: form.sessionGoalCount ? Number(form.sessionGoalCount) : null,
      daysPerWeek: Number(form.daysPerWeek),
      deadline: form.deadline || null,
      sessionGoalType: form.sessionGoalType || null,
    };

    try {
      const url = isEdit
        ? `${API_URL}/projects/${projectId}/updateProject`
        : `${API_URL}/projects/createProject`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors({ submit: data.message || "Something went wrong." });
      } else {
        setSuccess(true);
        setTimeout(() => navigate(isEdit ? `/projects/${projectId}` : "/projects"), 1200);
      }
    } catch {
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-16 flex justify-center">
        <div className="w-8 h-8 border-2 border-[#2d3748] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="mb-8">
          <button onClick={() => navigate(isEdit ? `/projects/${projectId}` : "/projects")} className="text-xs text-[#9a8c7a] hover:text-[#2d3748] transition-colors mb-4 flex items-center gap-1">
            ← {isEdit ? "Back to project" : "My projects"}
          </button>
          <h1 className="font-serif text-3xl text-[#2d3748]">
            {isEdit ? "Edit project" : "Start a new project"}
          </h1>
          <p className="text-sm text-[#9a8c7a] mt-1">
            {isEdit ? "Update your project details and goals." : "Tell Inkwell what you're writing so we can help you get it done."}
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl flex items-center gap-3">
            
            <p className="text-sm text-[#2d6e5a] font-medium">{isEdit ? "Project updated!" : "Project created!"} Redirecting…</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Basic info */}
          <div className="cozy-card space-y-5">
            <h2 className="font-serif text-base text-[#2d3748] flex items-center gap-2">
              About your project
            </h2>

            <InputField label="Title *" error={errors.title}>
              <input
                type="text" value={form.title} onChange={e => set("title", e.target.value)}
                placeholder="e.g. The Last Cartographer"
                className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all"
              />
            </InputField>

            <InputField label="Description" hint="A short summary of what you're writing.">
              <textarea
                value={form.description} onChange={e => set("description", e.target.value)}
                rows={3} placeholder="A lonely cartographer discovers a map that leads to…"
                className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all resize-none"
              />
            </InputField>

            <div className="grid grid-cols-2 gap-4">
              <InputField label="Genre">
                <select value={form.genre} onChange={e => set("genre", e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
                >
                  <option value="">Select genre…</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </InputField>

              <InputField label="Visibility">
                <select value={form.visibility} onChange={e => set("visibility", e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
                >
                  <option value="PRIVATE">Private</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </InputField>
            </div>

            <InputField label="Link" hint="Manuscript, Notion doc, or anything related.">
              <input
                type="url" value={form.link} onChange={e => set("link", e.target.value)}
                placeholder="https://…"
                className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
              />
            </InputField>

            {isEdit && (
              <InputField label="Status">
                <select value={form.status} onChange={e => set("status", e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
                >
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ON_HOLD">On hold</option>
                </select>
              </InputField>
            )}
          </div>

          {/* Goals */}
          <div className="cozy-card space-y-5">
            <h2 className="font-serif text-base text-[#2d3748] flex items-center gap-2">
              Writing goals
              <span className="text-xs text-[#9a8c7a] font-sans font-normal ml-1">— optional but recommended</span>
            </h2>

            <div className="grid grid-cols-3 gap-4">
              <InputField label="Target words" error={errors.targetWordCount}>
                <input
                  type="number" value={form.targetWordCount} onChange={e => set("targetWordCount", e.target.value)}
                  placeholder="85,000" min="1"
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#2d6e5a] transition-all"
                />
              </InputField>
              <InputField label="Target chapters">
                <input
                  type="number" value={form.targetChapters} onChange={e => set("targetChapters", e.target.value)}
                  placeholder="30" min="1"
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#b8962e] transition-all"
                />
              </InputField>
              <InputField label="Target scenes">
                <input
                  type="number" value={form.targetScenes} onChange={e => set("targetScenes", e.target.value)}
                  placeholder="90" min="1"
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                />
              </InputField>
            </div>

            <div className="bg-[#faf7f2] border border-[#f0ebe3] rounded-2xl p-4 space-y-4">
              <p className="text-xs font-medium text-[#6b5c4a] uppercase tracking-wide">Deadline & schedule</p>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Deadline" error={errors.deadline}>
                  <input
                    type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
                  />
                </InputField>
                <InputField label="Days/week writing" error={errors.daysPerWeek} hint="1–7 days">
                  <input
                    type="number" value={form.daysPerWeek} onChange={e => set("daysPerWeek", e.target.value)}
                    min="1" max="7" placeholder="5"
                    className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
                  />
                </InputField>
              </div>
              {form.deadline && form.targetWordCount && form.daysPerWeek && (
                <div className="flex items-center gap-2 text-xs text-[#2d6e5a] bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-3 py-2">
                    Daily goal ≈ <strong>{Math.ceil(
                      Math.max(Number(form.targetWordCount), 0) /
                      Math.max(Math.floor((new Date(form.deadline) - Date.now()) / (86400000 / 7) * Number(form.daysPerWeek)), 1)
                    ).toLocaleString()}</strong> words/session
                  </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputField label="Session goal type">
                <select value={form.sessionGoalType} onChange={e => set("sessionGoalType", e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
                >
                  <option value="">None</option>
                  {SESSION_GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </InputField>
              <InputField label="Session count goal" hint="e.g. 5 sessions per week">
                <input
                  type="number" value={form.sessionGoalCount} onChange={e => set("sessionGoalCount", e.target.value)}
                  placeholder="5" min="1"
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
                />
              </InputField>
            </div>
          </div>

          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">
              {errors.submit}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/projects/${projectId}` : "/projects")}
              className="flex-1 py-3 border border-[#e8e0d0] text-[#4a4a4a] text-sm font-medium rounded-2xl hover:border-[#2d3748] transition-all bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-2 flex-grow-[2] py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              ) : isEdit ? "Save changes" : "Create project"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}