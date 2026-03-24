import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";
import html2canvas from "html2canvas";

export default function DailyQuote() {
  const { user } = useAuth();
  const [quote, setQuote] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const quoteRef = useRef(null);

  useEffect(() => { fetchQuote(); }, []);

  async function fetchQuote() {
    try {
      const res = await fetch(`${API_URL}/quote`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const quoteData = data.quote || data;
        setQuote(quoteData);
        setLikesCount(quoteData._count?.likes || 0);
        setIsLiked(quoteData.userLiked || false);
      }
    } catch (error) {
      console.error("Failed to fetch quote:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLike() {
    if (!user || !quote) return;
    try {
      const res = await fetch(`${API_URL}/quote/${quote.id}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.liked);
        setLikesCount(data.likesCount);
      }
    } catch (error) {
      console.error("Failed to like quote:", error);
    }
  }

  async function handleShare() {
    if (!quoteRef.current) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(quoteRef.current, {
        backgroundColor: "#fffbf0",
        scale: 2,
        logging: false,
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const shareData = {
        title: "Daily Writing Quote",
        text: `"${quote.content}"${quote.title ? ` — ${quote.title}` : ""}`,
        url: window.location.origin + "/quote/" + quote.id,
      };
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], "quote.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ ...shareData, files: [file] });
        } else {
          await navigator.share(shareData);
        }
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = "daily-quote.png";
        link.href = url;
        link.click();
      }
    } catch (error) {
      const fallback = `"${quote.content}"${quote.title ? ` — ${quote.title}` : ""}\n\n${window.location.origin}`;
      await navigator.clipboard.writeText(fallback).catch(() => {});
    } finally {
      setIsSharing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="cozy-card animate-pulse">
        <div className="h-4 bg-[#e8e0d0] rounded w-1/4 mx-auto mb-5" />
        <div className="space-y-2">
          <div className="h-4 bg-[#e8e0d0] rounded w-4/5 mx-auto" />
          <div className="h-4 bg-[#e8e0d0] rounded w-3/5 mx-auto" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="cozy-card text-center py-8">
        <p className="text-[#9a8c7a] italic font-serif text-lg">
          "Your daily inspiration will appear here"
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Share button — floating outside */}
      <button
        onClick={handleShare}
        disabled={isSharing}
        className="absolute -top-3 -right-3 z-20 w-9 h-9 bg-white border border-[#e8e0d0] rounded-full shadow-sm flex items-center justify-center hover:border-[#d4af37] hover:text-[#b8962e] transition-all disabled:opacity-40"
        aria-label="Share quote"
      >
        {isSharing ? (
          <svg className="w-4 h-4 animate-spin text-[#b8962e]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-[#9a8c7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
      </button>

      {/* Quote card */}
      <div
        ref={quoteRef}
        className="cozy-card relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #fffbf0 0%, #fdf8ed 100%)" }}
      >
        {/* Label */}
        <p className="text-center text-[10px] font-semibold text-[#d4af37] tracking-[0.15em] uppercase mb-5">
          Today's Writing Spark
        </p>

        {/* Decorative open quote */}
        <div
          className="absolute top-5 left-5 font-serif text-[#d4af37] leading-none select-none pointer-events-none"
          style={{ fontSize: "72px", opacity: 0.12 }}
        >
          "
        </div>

        {/* Quote text */}
        <blockquote className="relative z-10 px-4 sm:px-8 mb-5">
          <p className="font-serif text-lg sm:text-xl text-[#2d3748] italic leading-relaxed text-center">
            {quote.content}
          </p>
          {quote.title && (
            <footer className="mt-4 text-center">
              <span className="text-sm text-[#9a8c7a] not-italic">— {quote.title}</span>
            </footer>
          )}
        </blockquote>

        {/* Decorative close quote */}
        <div
          className="absolute bottom-14 right-5 font-serif text-[#d4af37] leading-none select-none pointer-events-none"
          style={{ fontSize: "72px", opacity: 0.12 }}
        >
          "
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4 px-4">
          <div className="flex-1 h-px bg-[#e8e0d0]" />
          <span className="text-[#d4af37] text-xs">✦</span>
          <div className="flex-1 h-px bg-[#e8e0d0]" />
        </div>

        {/* Like + watermark */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-sm ${
              isLiked
                ? "text-[#b8962e] bg-[#fdf3d8]"
                : "text-[#9a8c7a] hover:text-[#b8962e] hover:bg-[#fdf3d8]"
            }`}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <svg
              className="w-4 h-4"
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="font-medium text-xs">
              {likesCount} {likesCount === 1 ? "writer" : "writers"} liked this
            </span>
          </button>
          <span className="text-[10px] text-[#c4b9ac] tracking-wide">
            {typeof window !== "undefined" ? window.location.hostname : "inkwell"}
          </span>
        </div>
      </div>
    </div>
  );
}