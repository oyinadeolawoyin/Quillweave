// src/components/admin/AdminReportsPage.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import { AppMetaTags } from "../utilis/metatags";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    PENDING:   { label: "Pending",   color: "#b8860b", bg: "#fdf9ed", border: "#f0d98a" },
    RESOLVED:  { label: "Resolved",  color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
    DISMISSED: { label: "Dismissed", color: "#6b7280", bg: "#f4f1ec", border: "#e2ddd6" },
  }[status] ?? { label: status, color: "#9a8c7a", bg: "#f4f1ec", border: "#e2ddd6" };

  return (
    <span
      className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────

function Avatar({ user, size = "sm" }) {
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div className={`${dim} rounded-full bg-[#1a1a2e] flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden`}>
      {user?.avatar
        ? <img src={user.avatar} alt={user?.username} className="w-full h-full object-cover" />
        : <span>{user?.username?.charAt(0).toUpperCase() ?? "?"}</span>
      }
    </div>
  );
}

// ─── RESOLVE MODAL ────────────────────────────────────────────────────────────

function ResolveModal({ report, onClose, onResolved }) {
  const [resolution, setResolution] = useState("RESOLVED");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/reports/${report.id}/resolve`, {
        method:      "PATCH",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ resolution, adminNotes: adminNotes.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to resolve report.");
      onResolved(data);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#e8e0d0] overflow-hidden">
        <div className="bg-[#1a1a2e] px-6 py-4 flex items-center justify-between">
          <h2 className="font-serif text-white text-base font-bold">Resolve Report #{report.id}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Quick summary */}
          <div className="bg-[#faf7f2] border border-[#e8e0d0] rounded-xl px-4 py-3 text-[13px] text-[#4a3f35]">
            <span className="font-semibold">Reported critique</span> by{" "}
            <span className="text-[#1a1a2e] font-semibold">@{report.response?.critic?.username ?? "deleted user"}</span>
            {" "}on{" "}
            <span className="italic">"{report.response?.submission?.title}"</span>
          </div>

          {/* Resolution choice */}
          <div className="space-y-2">
            {[
              { value: "RESOLVED",  label: "Resolve",  desc: "Action was taken. Report is closed.", color: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
              { value: "DISMISSED", label: "Dismiss",  desc: "No action needed. Report is closed.", color: "#6b7280", bg: "#f4f1ec", border: "#e2ddd6" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setResolution(opt.value)}
                className="w-full text-left px-4 py-3 rounded-xl border transition-all"
                style={resolution === opt.value
                  ? { borderColor: opt.color, background: opt.bg, color: opt.color }
                  : { borderColor: "#e8e0d0", background: "white", color: "#4a3f35" }
                }
              >
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-[11px] opacity-70 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* Admin notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a8c7a] mb-1.5">
              Internal notes <span className="font-normal normal-case tracking-normal text-[#b8a898]">(optional)</span>
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="What action was taken, if any…"
              className="w-full border border-[#e8e0d0] rounded-xl px-3.5 py-2.5 text-[13px] text-[#1a1a2e] placeholder-[#b8a898] resize-none focus:outline-none focus:border-[#1a1a2e] transition-colors"
            />
          </div>

          {error && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-[#e8e0d0] text-[#6b5c4a] text-sm font-semibold rounded-xl hover:bg-[#f4f1ec] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 bg-[#1a1a2e] text-white text-sm font-semibold rounded-xl hover:bg-[#2d3748] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REPORT ROW ──────────────────────────────────────────────────────────────

function ReportRow({ report, onResolve }) {
  const [expanded, setExpanded] = useState(false);

  const submission = report.response?.submission;
  const critic     = report.response?.critic;
  const reporter   = report.reporter;

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${
      report.status === "PENDING" ? "border-[#f0d98a] shadow-[0_2px_12px_rgba(212,175,55,0.08)]" : "border-[#e8e0d0]"
    }`}>
      {/* ── Main row ── */}
      <div className="px-5 py-4 flex items-start gap-4">

        {/* Left: flag icon, coloured by status */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
          report.status === "PENDING" ? "bg-[#fdf9ed]" : "bg-[#f4f1ec]"
        }`}>
          <svg className="w-4 h-4" fill="none" stroke={report.status === "PENDING" ? "#b8860b" : "#9a8c7a"} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
        </div>

        {/* Middle: info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={report.status} />
            <span className="text-[10px] text-[#b8a898]">#{report.id} · {timeAgo(report.createdAt)}</span>
          </div>

          {/* Reason */}
          <p className="text-sm font-semibold text-[#1a1a2e] mb-1">{report.reason}</p>

          {/* Critique on submission */}
          <p className="text-[12px] text-[#6b5c4a] leading-snug">
            Critique by{" "}
            <Link to={`/profile/${critic?.id}`} className="font-semibold text-[#1a5fb4] hover:underline" onClick={(e) => e.stopPropagation()}>
              @{critic?.username ?? "deleted user"}
            </Link>
            {" "}on{" "}
            <Link to={`/critique/${submission?.id}`} className="font-semibold text-[#1a1a2e] hover:text-[#b8860b] transition-colors italic" onClick={(e) => e.stopPropagation()}>
              "{submission?.title ?? "deleted submission"}"
            </Link>
          </p>

          {/* Reporter */}
          <div className="flex items-center gap-1.5 mt-2">
            <Avatar user={reporter} size="sm" />
            <span className="text-[11px] text-[#9a8c7a]">
              Reported by{" "}
              <Link to={`/profile/${reporter?.id}`} className="font-semibold text-[#2d3748] hover:underline" onClick={(e) => e.stopPropagation()}>
                @{reporter?.username}
              </Link>
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] font-semibold text-[#9a8c7a] hover:text-[#1a1a2e] border border-[#e8e0d0] px-2.5 py-1.5 rounded-lg transition-all"
          >
            {expanded ? "Less" : "Details"}
          </button>
          {report.status === "PENDING" && (
            <button
              onClick={() => onResolve(report)}
              className="text-[11px] font-semibold text-white bg-[#1a1a2e] hover:bg-[#2d3748] px-2.5 py-1.5 rounded-lg transition-all"
            >
              Resolve
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="border-t border-[#f0ebe3] px-5 py-4 bg-[#faf7f2] space-y-4">

          {/* Reporter's details text */}
          {report.details ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-1">Reporter's details</p>
              <p className="text-[13px] text-[#4a3f35] leading-relaxed bg-white border border-[#e8e0d0] rounded-xl px-4 py-3">
                {report.details}
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-[#b8a898] italic">No additional details provided.</p>
          )}

          {/* The actual critique content */}
          {report.response?.generalFeedback && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-1">Critique content</p>
              <div className="text-[13px] text-[#4a3f35] leading-relaxed bg-white border border-[#e8e0d0] rounded-xl px-4 py-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {report.response.generalFeedback}
              </div>
            </div>
          )}

          {/* View critique link */}
          <Link
            to={`/critique/${submission?.id}#critique-${report.response?.id}`}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1a5fb4] hover:underline"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View critique on submission page
          </Link>

          {/* Resolution info (if resolved/dismissed) */}
          {report.status !== "PENDING" && (
            <div className="border-t border-[#e8e0d0] pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8c7a] mb-1">Resolution</p>
              <p className="text-[12px] text-[#4a3f35]">
                <span className="font-semibold">{report.status === "RESOLVED" ? "Resolved" : "Dismissed"}</span>
                {" "}by{" "}
                <span className="font-semibold">@{report.resolver?.username ?? "admin"}</span>
                {" "}· {timeAgo(report.resolvedAt)}
              </p>
              {report.adminNotes && (
                <p className="text-[12px] text-[#6b5c4a] mt-1 italic">"{report.adminNotes}"</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl p-5 flex gap-4 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-[#f4f1ec] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 bg-[#f4f1ec] rounded-full" />
        <div className="h-4 w-1/2 bg-[#f4f1ec] rounded" />
        <div className="h-3 w-2/3 bg-[#f4f1ec] rounded" />
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [reports,    setReports]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [pages,      setPages]      = useState(1);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading,    setLoading]    = useState(true);
  const [resolving,  setResolving]  = useState(null); // report being resolved

  // ── Guard: redirect non-admins immediately ────────────────────────────────
  useEffect(() => {
    if (user === null) { navigate("/login"); return; }   // not logged in
    if (user && user.role !== "ADMIN") { navigate("/"); return; } // logged in, not admin
  }, [user, navigate]);

  // ── Fetch reports ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;
    fetchReports();
  }, [user, page, statusFilter]);

  async function fetchReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, ...(statusFilter && { status: statusFilter }) });
      const res = await fetch(`${API_URL}/reports?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load reports.");
      const data = await res.json();
      setReports(data.items ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch (e) {
      setReports([]);
    }
    setLoading(false);
  }

  function handleResolved(updatedReport) {
    setReports((prev) =>
      prev.map((r) => r.id === updatedReport.id ? updatedReport : r)
    );
    setResolving(null);
  }

  // ── While auth is resolving, show nothing ────────────────────────────────
  if (!user) return null;
  if (user.role !== "ADMIN") return null;

  const pendingCount = reports.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <AppMetaTags title="Admin · Reports" description="Review and resolve member reports on Quillweave." />

      {/* Resolve modal */}
      {resolving && (
        <ResolveModal
          report={resolving}
          onClose={() => setResolving(null)}
          onResolved={handleResolved}
        />
      )}

      {/* ── Hero bar ── */}
      <div className="bg-[#1a1a2e] border-b border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-60" />
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 py-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4af37] mb-1">Admin Panel</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-white text-2xl sm:text-3xl leading-tight">
                Reported Critiques
              </h1>
              <p className="text-white/50 text-sm mt-1">
                Review and action reports submitted by writers.
              </p>
            </div>
            {/* Stats pill */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-center">
                <p className="text-xl font-bold text-[#d4af37]">{total}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Total</p>
              </div>
              {pendingCount > 0 && (
                <div className="bg-[#b8860b] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {pendingCount} pending
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 py-8">

        {/* ── Filter tabs ── */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {[
            { value: "",          label: "All" },
            { value: "PENDING",   label: "Pending" },
            { value: "RESOLVED",  label: "Resolved" },
            { value: "DISMISSED", label: "Dismissed" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                statusFilter === f.value
                  ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                  : "bg-white text-[#6b5c4a] border-[#e8e0d0] hover:border-[#1a1a2e]/30"
              }`}
            >
              {f.label}
            </button>
          ))}
          {/* Refresh */}
          <button
            onClick={fetchReports}
            className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-[#9a8c7a] hover:text-[#1a1a2e] border border-[#e8e0d0] px-3 py-1.5 rounded-lg hover:border-[#1a1a2e]/30 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* ── Report list ── */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white border border-[#e8e0d0] rounded-2xl px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f4f1ec] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#9a8c7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-serif text-[#1a1a2e] text-base mb-1">No reports here</p>
            <p className="text-sm text-[#9a8c7a]">
              {statusFilter === "PENDING" ? "All clear — no pending reports." : "Nothing matches this filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onResolve={(r) => setResolving(r)}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-[12px] font-semibold border border-[#e8e0d0] rounded-lg text-[#6b5c4a] hover:border-[#1a1a2e] disabled:opacity-40 transition-all"
            >
              ← Prev
            </button>
            <span className="text-[12px] text-[#9a8c7a] tabular-nums">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 text-[12px] font-semibold border border-[#e8e0d0] rounded-lg text-[#6b5c4a] hover:border-[#1a1a2e] disabled:opacity-40 transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}