// src/components/directMessages/inboxPage.jsx
// Lists all conversations the logged-in user has, sorted by latest message.
// Clicking a row navigates to /messages/:conversationId.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { fetchConversations } from "./directmessageapi";

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ username, avatar, size = 40 }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-serif font-bold text-[#1a1a2e]"
      style={{ width: size, height: size, background: "#fdf9ed", fontSize: size * 0.38, border: "1.5px solid #f0d98a" }}
    >
      {username?.charAt(0).toUpperCase() ?? "?"}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyInbox() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-[#fdf9ed] border border-[#f0d98a] flex items-center justify-center mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </div>
      <h2 className="font-serif text-[#1a1a2e] text-lg font-bold mb-1">No messages yet</h2>
      <p className="text-[13px] text-[#9a8c7a] mb-5 max-w-[280px]">
        Start a conversation by visiting a member's profile or the members page.
      </p>
      <button
        onClick={() => navigate("/members")}
        className="px-5 py-2.5 text-[13px] font-bold rounded-lg transition-colors"
        style={{ background: "#d4af37", color: "#1a1a2e" }}
      >
        Browse members
      </button>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchConversations()
      .then(setConversations)
      .catch((err) => setError(err.message ?? "Couldn't load messages."))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="max-w-[680px] mx-auto px-4 sm:px-6 pt-7 pb-16">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#b8860b] mb-1">Private messages</p>
        <h1 className="font-serif text-[#1a1a2e] text-2xl sm:text-[28px] font-bold leading-tight">
          Inbox
        </h1>
      </div>

      {/* States */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e8e0d0] p-4 flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-[#f0ebe3] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 bg-[#f0ebe3] rounded" />
                <div className="h-3 w-48 bg-[#f0ebe3] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg px-4 py-3 text-[13px]" style={{ background: "#fdf2f0", color: "#c0392b", border: "1px solid #f5c6c0" }}>
          {error}
        </div>
      )}

      {!loading && !error && conversations.length === 0 && <EmptyInbox />}

      {!loading && !error && conversations.length > 0 && (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              to={`/messages/${c.id}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-[#e8e0d0] px-4 py-3.5 hover:border-[#d4af37] hover:shadow-sm transition-all group"
            >
              <Avatar username={c.otherUser?.username} avatar={c.otherUser?.avatar} size={42} />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[14px] font-bold text-[#1a1a2e] truncate group-hover:text-[#b8860b] transition-colors">
                    {c.otherUser?.username ?? "Deleted user"}
                  </p>
                  <span className="text-[11px] text-[#c2b8a8] flex-shrink-0">
                    {timeAgo(c.lastMessage?.createdAt ?? c.updatedAt)}
                  </span>
                </div>
                <p className="text-[12px] text-[#9a8c7a] truncate mt-0.5">
                  {c.lastMessage
                    ? c.lastMessage.content === null
                      ? "Message deleted"
                      : (c.lastMessage.senderId === user?.id ? "You: " : "") + c.lastMessage.content
                    : "No messages yet"}
                </p>
              </div>

              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c2b8a8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}