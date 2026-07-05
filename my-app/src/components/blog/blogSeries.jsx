import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { AppMetaTags } from "../utilis/metatags";
import API_URL from "@/config/api";

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getExcerpt(content = "", length = 160) {
  const text = stripHtml(content);
  return text.length > length ? text.slice(0, length) + "…" : text;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SeriesSkeleton() {
  return (
    <div className="min-h-screen bg-[#f5f3ef] animate-pulse">
      <div className="bg-[#1a1a2e] h-56" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-10 relative z-10 space-y-4 pb-16">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#e8e0d0] h-32" />
        ))}
      </div>
    </div>
  );
}

// ── Numbered entry card ────────────────────────────────────────────────────────
function SeriesPostRow({ post, index }) {
  const excerpt = getExcerpt(post.content, 160);
  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      to={`/blog/${post.id}`}
      className="group bg-white rounded-2xl border border-[#e8e0d0] shadow-soft hover:shadow-soft-lg
                 overflow-hidden transition-all duration-300 flex flex-col sm:flex-row"
    >
      {/* Image / index */}
      <div className="sm:w-56 h-48 sm:h-auto overflow-hidden relative flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(26,26,46,0.06), rgba(212,175,55,0.08))" }}>
        {post.mediaUrl ? (
          <img
            src={post.mediaUrl}
            alt={post.title || "Series post"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-15 select-none">🖋️</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 text-white text-xs font-bold rounded-full shadow-sm" style={{ background: "#1a1a2e" }}>
            Part {index + 1}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1 justify-center">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#d4af37" }}>{date}</p>
        <h2 className="font-serif text-xl sm:text-2xl text-ink-primary mb-2 leading-snug
                       group-hover:text-[#d4af37] transition-colors duration-200 line-clamp-2">
          {post.title || excerpt.slice(0, 60) + "…"}
        </h2>
        <p className="text-sm text-[#6b5c4a] leading-relaxed line-clamp-2 mb-3">{excerpt}</p>
        <span className="text-sm font-semibold text-ink-primary group-hover:text-[#d4af37] transition-colors flex items-center gap-1.5">
          Read this part
          <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BlogSeries() {
  const { slug } = useParams();
  const [series, setSeries] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchSeries();
  }, [slug]);

  async function fetchSeries() {
    setIsLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`${API_URL}/blog/series/${slug}`, { credentials: "include" });
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSeries(data.series);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) return <SeriesSkeleton />;

  if (notFound || !series) {
    return (
      <div className="min-h-screen bg-[#f5f3ef]">
        <main className="max-w-3xl mx-auto px-4 py-28 text-center">
          <p className="text-7xl font-serif text-gray-200 mb-4">404</p>
          <h1 className="text-2xl font-serif text-ink-primary mb-3">Series not found</h1>
          <Link to="/blog" className="text-[#d4af37] hover:underline text-sm">← Back to Community</Link>
        </main>
      </div>
    );
  }

  const posts = series.posts || [];

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <AppMetaTags
        title={`${series.title} – Quillweave Community`}
        description={series.description || `A story series from the Quillweave community: ${series.title}`}
      />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d1320 0%, #141c2e 40%, #1a2540 70%, #1e2d4a 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent 5%, #d4af37 35%, #d4af37 65%, transparent 95%)" }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 relative">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All posts
          </Link>
          <span className="inline-flex px-3 py-1 text-[11px] font-bold uppercase tracking-widest rounded-full mb-4" style={{ background: "rgba(212,175,55,0.15)", color: "#d4af37" }}>
            Series · {posts.length} {posts.length === 1 ? "post" : "posts"}
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif text-white leading-tight mb-4">{series.title}</h1>
          {series.description && (
            <p className="text-white text-base sm:text-lg max-w-2xl" style={{ opacity: 0.65 }}>
              {series.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Posts list ──────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#e8e0d0]">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-[#9a8c7a] text-sm">No posts in this series yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map((post, idx) => (
              <SeriesPostRow key={post.id} post={post} index={idx} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}