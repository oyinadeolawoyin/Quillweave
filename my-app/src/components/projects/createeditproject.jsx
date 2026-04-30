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

const PHASES = [
  {
    key: "BRAINSTORMING",
    label: "Brainstorming",
    hint: "Generating ideas, exploring concepts, finding your story.",
  },
  {
    key: "OUTLINING",
    label: "Outlining",
    hint: "Structuring beats, plotting chapters, mapping the arc.",
  },
  {
    key: "DRAFTING",
    label: "Drafting",
    hint: "Getting the words down — messy is fine.",
  },
  {
    key: "EDITING",
    label: "Editing",
    hint: "Revising, tightening, polishing what you have.",
  },
  {
    key: "PLANNING",
    label: "Planning",
    hint: "Research, world-building, character work before writing.",
  },
];

// ─── Tracking types ───────────────────────────────────────────
// "sessions" and "days" are grouped as rhythm trackers (pink).
const TRACKING_TYPES = [
  {
    key: "words",
    label: "Word count",
    hint: "Track your total words written toward a target.",
    color: "#2d6e5a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    group: "progress",
  },
  {
    key: "chapters",
    label: "Chapters",
    hint: "Count chapters drafted toward your goal.",
    color: "#b8962e",
    bg: "#fffbeb",
    border: "#fde68a",
    group: "progress",
  },
  {
    key: "scenes",
    label: "Scenes",
    hint: "Count individual scenes completed.",
    color: "#6d28d9",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    group: "progress",
  },
  {
    key: "sessions",
    label: "Writing sessions",
    hint: "Log each session toward a daily, weekly, or monthly count.",
    color: "#be185d",
    bg: "#fdf2f8",
    border: "#fbcfe8",
    group: "rhythm",
  },
  {
    key: "days",
    label: "Streak — consecutive days",
    hint: "Build a daily writing habit toward a days-in-a-row target.",
    color: "#9d174d",
    bg: "#fff0f8",
    border: "#f9a8d4",
    group: "rhythm",
  },
  {
    key: "none",
    label: "No goal tracking",
    hint: "Just keep notes, tasks and links — no progress metrics.",
    color: "#6b5c4a",
    bg: "#faf7f2",
    border: "#e8e0d0",
    group: "other",
  },
];

const SESSION_GOAL_TYPES = [
  { value: "DAILY",   label: "Daily" },
  { value: "WEEKLY",  label: "Weekly" },
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

function deriveTrackingKey(project) {
  if (!project) return "none";
  if (project.consecutiveDaysTarget) return "days";
  if (project.sessionGoalCount)      return "sessions";
  if (project.targetScenes)          return "scenes";
  if (project.targetChapters)        return "chapters";
  if (project.targetWordCount)       return "words";
  return "none";
}

export default function CreateEditProject() {
  const { projectId } = useParams();
  const isEdit = Boolean(projectId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: "", description: "", link: "", genre: "", visibility: "PRIVATE",
    deadline: "", daysPerWeek: "5", status: "IN_PROGRESS",
    phase: "DRAFTING",
    targetWordCount: "",
    targetChapters: "",
    targetScenes: "",
    sessionGoalType: "WEEKLY", sessionGoalCount: "",
    consecutiveDaysTarget: "",
  });
  const [trackingKey, setTrackingKey] = useState("none");
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [success, setSuccess]  = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`${API_URL}/projects/${projectId}/dashboard`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ project }) => {
        const key = deriveTrackingKey(project);
        setTrackingKey(key);
        setForm({
          title:                project.title || "",
          description:          project.description || "",
          link:                 project.link || "",
          genre:                project.genre || "",
          visibility:           project.visibility || "PRIVATE",
          deadline:             project.deadline ? project.deadline.split("T")[0] : "",
          daysPerWeek:          project.daysPerWeek ?? "5",
          status:               project.status || "IN_PROGRESS",
          phase:                project.phase || "DRAFTING",
          targetWordCount:      project.targetWordCount ?? "",
          targetChapters:       project.targetChapters ?? "",
          targetScenes:         project.targetScenes ?? "",
          sessionGoalType:      project.sessionGoalType || "WEEKLY",
          sessionGoalCount:     project.sessionGoalCount ?? "",
          consecutiveDaysTarget: project.consecutiveDaysTarget ?? "",
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
    if (form.daysPerWeek && (Number(form.daysPerWeek) < 1 || Number(form.daysPerWeek) > 7)) e.daysPerWeek = "Must be between 1 and 7.";

    if (trackingKey === "words"    && form.targetWordCount    && Number(form.targetWordCount)    <= 0) e.targetWordCount = "Must be a positive number.";
    if (trackingKey === "chapters" && form.targetChapters     && Number(form.targetChapters)     <= 0) e.targetChapters = "Must be a positive number.";
    if (trackingKey === "scenes"   && form.targetScenes       && Number(form.targetScenes)       <= 0) e.targetScenes = "Must be a positive number.";
    if (trackingKey === "sessions" && form.sessionGoalCount   && Number(form.sessionGoalCount)   <= 0) e.sessionGoalCount = "Must be a positive number.";
    if (trackingKey === "days"     && form.consecutiveDaysTarget && Number(form.consecutiveDaysTarget) <= 0) e.consecutiveDaysTarget = "Must be a positive number.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const payload = {
      title:       form.title,
      description: form.description,
      link:        form.link,
      genre:       form.genre,
      visibility:  form.visibility,
      deadline:    form.deadline || null,
      daysPerWeek: Number(form.daysPerWeek),
      phase:       form.phase || "DRAFTING",
      ...(isEdit && { status: form.status }),
      targetWordCount:       null,
      targetChapters:        null,
      targetScenes:          null,
      sessionGoalType:       null,
      sessionGoalCount:      null,
      consecutiveDaysTarget: null,
    };

    if (trackingKey === "words") {
      payload.targetWordCount = form.targetWordCount ? Number(form.targetWordCount) : null;
    } else if (trackingKey === "chapters") {
      payload.targetChapters = form.targetChapters ? Number(form.targetChapters) : null;
    } else if (trackingKey === "scenes") {
      payload.targetScenes = form.targetScenes ? Number(form.targetScenes) : null;
    } else if (trackingKey === "sessions") {
      payload.sessionGoalType  = form.sessionGoalType || "WEEKLY";
      payload.sessionGoalCount = form.sessionGoalCount ? Number(form.sessionGoalCount) : null;
    } else if (trackingKey === "days") {
      payload.consecutiveDaysTarget = form.consecutiveDaysTarget ? Number(form.consecutiveDaysTarget) : null;
    }

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

  const progressTypes = TRACKING_TYPES.filter(t => t.group === "progress");
  const rhythmTypes   = TRACKING_TYPES.filter(t => t.group === "rhythm");
  const otherTypes    = TRACKING_TYPES.filter(t => t.group === "other");

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(isEdit ? `/projects/${projectId}` : "/projects")}
            className="text-xs text-[#9a8c7a] hover:text-[#2d3748] transition-colors mb-4 flex items-center gap-1"
          >
            ← {isEdit ? "Back to project" : "My projects"}
          </button>
          <h1 className="font-serif text-3xl text-[#2d3748]">
            {isEdit ? "Edit project" : "Start a new project"}
          </h1>
          <p className="text-sm text-[#9a8c7a] mt-1">
            {isEdit
              ? "Update your project details and goals."
              : "Tell Inkwell what you're writing so we can help you finish it."}
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl">
            <p className="text-sm text-[#2d6e5a] font-medium">
              {isEdit ? "Project updated!" : "Project created!"} Redirecting…
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Basic info ── */}
          <div className="cozy-card space-y-5">
            <h2 className="font-serif text-base text-[#2d3748]">About your project</h2>

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
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all">
                  <option value="">Select genre…</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </InputField>

              <InputField label="Visibility">
                <select value={form.visibility} onChange={e => set("visibility", e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all">
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
                  className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all">
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ON_HOLD">On hold</option>
                </select>
              </InputField>
            )}
          </div>

          {/* ── Writing phase ── */}
          <div className="cozy-card space-y-4">
            <div>
              <h2 className="font-serif text-base text-[#2d3748]">Writing phase</h2>
              <p className="text-xs text-[#9a8c7a] mt-1">Where are you in the process right now?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PHASES.map(p => {
                const active = form.phase === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => set("phase", p.key)}
                    className="text-left rounded-2xl border px-4 py-3 transition-all"
                    style={{
                      background:  active ? "#faf7f2" : "white",
                      borderColor: active ? "#d4af37" : "#e8e0d0",
                      boxShadow:   active ? "0 0 0 1px #d4af37" : "none",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                        style={{ borderColor: active ? "#d4af37" : "#c4bdb4" }}
                      >
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: active ? "#92680a" : "#2d3748" }}>
                        {p.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9a8c7a] mt-1.5 ml-6 leading-relaxed">{p.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Tracking type picker ── */}
          <div className="cozy-card space-y-5">
            <div>
              <h2 className="font-serif text-base text-[#2d3748]">How do you want to track progress?</h2>
              <p className="text-xs text-[#9a8c7a] mt-1">Pick one — you can always change it later.</p>
            </div>

            {/* Progress trackers */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a8c7a]">Progress trackers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {progressTypes.map(t => <TrackingButton key={t.key} t={t} active={trackingKey === t.key} onSelect={setTrackingKey} />)}
              </div>
            </div>

            {/* Rhythm / habit trackers — pink */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#be185d]">Habit trackers</p>
                <div className="h-px flex-1 bg-[#fbcfe8]" />
              </div>
              <p className="text-[11px] text-[#9a8c7a] leading-relaxed">
                These track how consistently you show up, not how much you produce.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rhythmTypes.map(t => <TrackingButton key={t.key} t={t} active={trackingKey === t.key} onSelect={setTrackingKey} />)}
              </div>
            </div>

            {/* No tracking */}
            <div className="grid grid-cols-1 gap-2.5">
              {otherTypes.map(t => <TrackingButton key={t.key} t={t} active={trackingKey === t.key} onSelect={setTrackingKey} />)}
            </div>

            {/* ── Tracking detail inputs ── */}
            {trackingKey === "words" && (
              <div className="space-y-4 pt-2 border-t border-[#f0ebe3]">
                <InputField label="Target word count" error={errors.targetWordCount}>
                  <input
                    type="number" value={form.targetWordCount} onChange={e => set("targetWordCount", e.target.value)}
                    placeholder="85,000" min="1"
                    className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 transition-all"
                    onFocus={e => e.target.style.borderColor = "#2d6e5a"}
                    onBlur={e => e.target.style.borderColor = "#e8e0d0"}
                  />
                </InputField>
                <_DeadlineFields form={form} set={set} errors={errors} />
                {form.deadline && form.targetWordCount && form.daysPerWeek && (
                  <p className="text-xs text-[#2d6e5a] bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-3 py-2">
                    Daily goal approx. <strong>{Math.ceil(
                      Math.max(Number(form.targetWordCount), 0) /
                      Math.max(Math.floor((new Date(form.deadline) - Date.now()) / (86400000 / 7) * Number(form.daysPerWeek)), 1)
                    ).toLocaleString()}</strong> words/session
                  </p>
                )}
              </div>
            )}

            {trackingKey === "chapters" && (
              <div className="space-y-4 pt-2 border-t border-[#f0ebe3]">
                <InputField label="Target chapters" error={errors.targetChapters}>
                  <input
                    type="number" value={form.targetChapters} onChange={e => set("targetChapters", e.target.value)}
                    placeholder="30" min="1"
                    className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 transition-all"
                    onFocus={e => e.target.style.borderColor = "#b8962e"}
                    onBlur={e => e.target.style.borderColor = "#e8e0d0"}
                  />
                </InputField>
                <_DeadlineFields form={form} set={set} errors={errors} />
              </div>
            )}

            {trackingKey === "scenes" && (
              <div className="space-y-4 pt-2 border-t border-[#f0ebe3]">
                <InputField label="Target scenes" error={errors.targetScenes}>
                  <input
                    type="number" value={form.targetScenes} onChange={e => set("targetScenes", e.target.value)}
                    placeholder="90" min="1"
                    className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 transition-all"
                    onFocus={e => e.target.style.borderColor = "#6d28d9"}
                    onBlur={e => e.target.style.borderColor = "#e8e0d0"}
                  />
                </InputField>
                <_DeadlineFields form={form} set={set} errors={errors} />
              </div>
            )}

            {trackingKey === "sessions" && (
              <div className="space-y-4 pt-2 border-t border-[#fbcfe8]">
                {/* Pink hint banner */}
                <div className="bg-[#fff0f8] border border-[#fbcfe8] rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-[#9d174d] leading-relaxed">
                    A session is logged each time you record writing activity. Set a count goal and how often you want to hit it.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Session count goal" hint="e.g. 5 sessions" error={errors.sessionGoalCount}>
                    <input
                      type="number" value={form.sessionGoalCount} onChange={e => set("sessionGoalCount", e.target.value)}
                      placeholder="5" min="1"
                      className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 transition-all"
                      onFocus={e => e.target.style.borderColor = "#be185d"}
                      onBlur={e => e.target.style.borderColor = "#e8e0d0"}
                    />
                  </InputField>
                  <InputField label="Per period">
                    <select value={form.sessionGoalType} onChange={e => set("sessionGoalType", e.target.value)}
                      className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 transition-all"
                      style={{ "--tw-ring-color": "#be185d" }}>
                      {SESSION_GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </InputField>
                </div>
                {/* Days challenge callout */}
                <div className="bg-[#fdf2f8] border border-[#f9a8d4] rounded-xl px-3 py-2.5 space-y-1">
                  <p className="text-[11px] font-semibold text-[#9d174d]">Days challenge</p>
                  <p className="text-[11px] text-[#be185d] leading-relaxed">
                    Session projects can join platform Days Challenges — write every day of the challenge to stay on the board.
                    Set your project to Public to be eligible.
                  </p>
                </div>
              </div>
            )}

            {trackingKey === "days" && (
              <div className="space-y-4 pt-2 border-t border-[#fbcfe8]">
                {/* Pink hint banner */}
                <div className="bg-[#fff0f8] border border-[#fbcfe8] rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-[#9d174d] leading-relaxed">
                    Each day you log writing advances your streak. Miss a day and it resets to zero.
                  </p>
                </div>
                <InputField label="Consecutive days target" hint="How many days in a row do you want to write?" error={errors.consecutiveDaysTarget}>
                  <input
                    type="number" value={form.consecutiveDaysTarget} onChange={e => set("consecutiveDaysTarget", e.target.value)}
                    placeholder="30" min="1"
                    className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 transition-all"
                    onFocus={e => e.target.style.borderColor = "#9d174d"}
                    onBlur={e => e.target.style.borderColor = "#e8e0d0"}
                  />
                </InputField>
                {/* Days challenge callout */}
                <div className="bg-[#fdf2f8] border border-[#f9a8d4] rounded-xl px-3 py-2.5 space-y-1">
                  <p className="text-[11px] font-semibold text-[#9d174d]">Days challenge</p>
                  <p className="text-[11px] text-[#be185d] leading-relaxed">
                    Streak projects can be enrolled in platform Days Challenges. Your streak must stay alive for the
                    full duration of the challenge. Set your project to Public to be eligible.
                  </p>
                </div>
              </div>
            )}
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
              className="flex-1 py-3 border border-[#e8e0d0] text-[#4a4a4a] text-sm font-medium rounded-2xl hover:border-[#2d3748] transition-all bg-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-2 flex-grow-[2] py-3 bg-[#2d3748] text-white text-sm font-medium rounded-2xl hover:bg-[#3d4f64] disabled:opacity-60 transition-all flex items-center justify-center gap-2">
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

// ─── Tracking type button ─────────────────────────────────────
function TrackingButton({ t, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(t.key)}
      className="text-left rounded-2xl border px-4 py-3.5 transition-all"
      style={{
        background:  active ? t.bg    : "white",
        borderColor: active ? t.color : "#e8e0d0",
        boxShadow:   active ? `0 0 0 1px ${t.color}` : "none",
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
          style={{ borderColor: active ? t.color : "#c4bdb4" }}
        >
          {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />}
        </div>
        <span className="text-sm font-semibold" style={{ color: active ? t.color : "#2d3748" }}>
          {t.label}
        </span>
      </div>
      <p className="text-[11px] text-[#9a8c7a] mt-1.5 ml-6 leading-relaxed">{t.hint}</p>
    </button>
  );
}

// ─── Shared deadline + days/week fields ───────────────────────
function _DeadlineFields({ form, set, errors }) {
  return (
    <div className="bg-[#faf7f2] border border-[#f0ebe3] rounded-2xl p-4 space-y-4">
      <p className="text-xs font-medium text-[#6b5c4a] uppercase tracking-wide">Deadline & schedule — optional</p>
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Deadline" error={errors.deadline}>
          <input
            type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)}
            min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
            className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
          />
        </InputField>
        <InputField label="Days/week writing" error={errors.daysPerWeek} hint="1–7">
          <input
            type="number" value={form.daysPerWeek} onChange={e => set("daysPerWeek", e.target.value)}
            min="1" max="7" placeholder="5"
            className="w-full px-4 py-2.5 border border-[#e8e0d0] rounded-xl text-sm bg-white text-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition-all"
          />
        </InputField>
      </div>
    </div>
  );
}