import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import Header from "../profile/header";
import API_URL from "@/config/api";

// ── Quote Form ────────────────────────────────────────────────
// Used for both create and edit.
// The quote API sends notifications to all users on create,
// so we show a note about that in the form.
function QuoteForm({ initial, onSave, onCancel }) {
  const isEdit = !!initial?.id;
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) { setError("Quote content is required."); return; }
    setError(null);
    setSubmitting(true);

    try {
      const url = isEdit
        ? `${API_URL}/quote/${initial.id}/update`
        : `${API_URL}/quote/createQuote`;
      const method = "POST"; // both create and update use POST per your routes

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Quote of the day",
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Something went wrong."); return; }
      onSave(data.quote, isEdit);
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-ink-gray mb-1">
          Title <span className="text-gray-400 font-normal">(optional — defaults to "Quote of the day")</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quote of the day"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-primary/30"
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-ink-gray mb-1">
          Quote <span className="text-red-500">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write the quote here…"
          rows={4}
          required
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-primary/30 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">{content.length} characters</p>
      </div>

      {/* Notification note — only shown when creating */}
      {!isEdit && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0 mt-0.5">📣</span>
          <p className="text-xs text-amber-700 leading-relaxed">
            Publishing a new quote will send a push notification to all registered users.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-ink-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60"
        >
          {submitting
            ? isEdit ? "Saving…" : "Publishing…"
            : isEdit ? "Update Quote" : "Publish Quote"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-gray-200 text-ink-gray rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Quote Row ─────────────────────────────────────────────────
function QuoteRow({ quote, onEdit, isLatest }) {
  const date = new Date(quote.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-xl shadow-soft p-4 flex items-start gap-4">
      {/* Quote icon */}
      <div className="w-10 h-10 rounded-full bg-ink-cream flex items-center justify-center flex-shrink-0 text-lg">
        💬
      </div>

      <div className="flex-1 min-w-0">
        {/* Title + latest badge */}
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <h3 className="font-serif text-base text-ink-primary truncate">
            {quote.title || "Quote of the day"}
          </h3>
          {isLatest && (
            <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold flex-shrink-0">
              Currently shown
            </span>
          )}
        </div>

        {/* Content preview */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 italic">
          "{quote.content}"
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
          <span>{date}</span>
          <span>{quote._count?.likes ?? 0} likes</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(quote)}
          className="p-1.5 text-gray-400 hover:text-ink-primary transition-colors rounded-lg hover:bg-gray-50"
          title="Edit quote"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function AdminQuote() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [view, setView] = useState("list"); // "list" | "create" | "edit"
  const [editingQuote, setEditingQuote] = useState(null);

  // Redirect non-admins immediately
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === "ADMIN") fetchQuotes();
  }, [user]);

  // The quote API only exposes a single /quote endpoint that returns the latest.
  // We fetch that one to show in the list. If you later add a GET /quote/all
  // endpoint, swap this out. For now we show just the current active quote.
  async function fetchQuotes() {
    setLoadingQuotes(true);
    try {
      const res = await fetch(`${API_URL}/quote`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        // data is the quote object directly (not wrapped in an array)
        setQuotes(data?.id ? [data] : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuotes(false);
    }
  }

  function handleSave(quote, isEdit) {
    if (isEdit) {
      setQuotes((prev) => prev.map((q) => (q.id === quote.id ? quote : q)));
    } else {
      // New quote becomes the latest — put it at the top
      setQuotes((prev) => [quote, ...prev]);
    }
    setView("list");
    setEditingQuote(null);
  }

  function handleEdit(quote) {
    setEditingQuote(quote);
    setView("edit");
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-ink-cream flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold mb-2">
              Admin Panel
            </div>
            <h1 className="text-3xl font-serif text-ink-primary">Quote Management</h1>
            <p className="text-sm text-gray-400 mt-1">
              The most recently created quote is shown on the homepage.
            </p>
          </div>
          {view === "list" && (
            <button
              onClick={() => setView("create")}
              className="flex items-center gap-2 px-5 py-2.5 bg-ink-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-soft"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Quote
            </button>
          )}
        </div>

        {/* Create / Edit form */}
        {(view === "create" || view === "edit") && (
          <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 mb-8">
            <h2 className="text-xl font-serif text-ink-primary mb-6">
              {view === "edit" ? "Edit Quote" : "New Quote"}
            </h2>
            <QuoteForm
              initial={editingQuote}
              onSave={handleSave}
              onCancel={() => { setView("list"); setEditingQuote(null); }}
            />
          </div>
        )}

        {/* Quotes list */}
        {view === "list" && (
          <>
            {loadingQuotes ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
                ))}
              </div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-400 text-sm">No quote yet. Create the first one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote, idx) => (
                  <QuoteRow
                    key={quote.id}
                    quote={quote}
                    onEdit={handleEdit}
                    isLatest={idx === 0}
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