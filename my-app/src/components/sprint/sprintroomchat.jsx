import { useState, useEffect, useRef, useCallback } from "react";
import API_URL from "@/config/api";

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function initials(name = "") {
  return name.trim().slice(0, 2).toUpperCase();
}

// Curated, dependency-free emoji set (no emoji-mart install needed) —
// a writing-flavored group up top, plus the usual smileys/gestures.
const EMOJI_GROUPS = [
  { label: "Writing", emojis: ["✍️", "📝", "📚", "🔥", "💡", "🎉", "👏", "✅", "⏳", "☕", "🖋️", "📖"] },
  { label: "Smileys", emojis: ["😀", "😄", "😅", "😂", "🙂", "😉", "😊", "🥹", "😍", "🤔", "😴", "😭"] },
  { label: "Gestures", emojis: ["👍", "👎", "👌", "🙌", "🤝", "👋", "🙏", "💪", "✨", "🎯", "🚀", "💯"] },
];

// One chat bubble — avatar + name + timestamp on top, message below, with
// an optional quoted-reply block. Always left-aligned in a room-style feed
// (not a two-sided messenger), matching the reference room chat.
function ChatMessage({ message, onReply, onDelete, onJumpToQuote, isOwn, isHighlighted, registerRef }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      ref={(node) => registerRef(message.id, node)}
      className={`flex gap-2.5 px-4 py-2 transition-colors duration-1000 group ${
        isHighlighted ? "bg-[#fdf1cf]" : "hover:bg-black/[0.02]"
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>
      {message.sender?.avatar ? (
        <img src={message.sender.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#2d3748] text-[#d4af37] flex items-center justify-center text-[11px] font-bold flex-shrink-0">
          {initials(message.sender?.username || "?")}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-[#2d3748]">{message.sender?.username || "Someone"}</span>
          <span className="text-[11px] text-[#b8a898] flex-shrink-0">{formatTime(message.createdAt)}</span>
        </div>

        {message.quotedContent && (
          <button
            onClick={() => onJumpToQuote(message.quotedMessageId)}
            className="block w-full text-left mt-1 mb-1 pl-2.5 border-l-2 border-[#d4af37] text-xs text-[#9a8c7a] hover:border-[#b8941f] hover:bg-black/[0.03] rounded-r-md transition-colors">
            <span className="font-semibold text-[#7a6a50]">{message.quotedSenderName}</span>
            <p className="truncate">{message.quotedContent}</p>
          </button>
        )}

        {message.messageType === "GIF" ? (
          <img src={message.mediaUrl} alt="" className="mt-1 rounded-lg max-w-[220px]" />
        ) : message.messageType === "SOUND" ? (
          <span className="inline-flex items-center gap-1 mt-0.5 text-sm text-[#7a6a50]">
            🔊 {message.soundKey}
          </span>
        ) : (
          <p className="text-sm text-[#3d4a5c] break-words">{message.content}</p>
        )}
      </div>

      {hover && (
        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onReply(message)}
            title="Reply"
            className="w-6 h-6 rounded-md flex items-center justify-center text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10L4 15m0 0l5 5m-5-5h11a4 4 0 000-8h-1" />
            </svg>
          </button>
          {isOwn && (
            <button
              onClick={() => onDelete(message.id)}
              title="Delete"
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#9a8c7a] hover:text-red-600 hover:bg-red-50">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Discord-style GIF picker — searches the backend's Tenor proxy, shows
// trending gifs by default, click sends immediately.
function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/sprint-room/gifs/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setGifs([]);
        return;
      }
      const data = await res.json();
      setGifs(data.gifs || []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(""); // trending on open
  }, [runSearch]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  useEffect(() => {
    function handleClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={boxRef}
      className="absolute bottom-full left-3 mb-2 w-80 max-h-96 bg-white border border-[#e8dcc8] rounded-xl shadow-xl flex flex-col overflow-hidden z-20">
      <div className="p-2 border-b border-[#e8dcc8]">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Tenor…"
          className="w-full px-3 py-2 bg-[#f0e8d8] rounded-lg text-sm focus:outline-none text-[#2d3748] placeholder-[#b8a898]"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2">
        {loading ? (
          <p className="col-span-2 text-xs text-[#9a8c7a] text-center py-6">Loading gifs…</p>
        ) : gifs.length === 0 ? (
          <p className="col-span-2 text-xs text-[#9a8c7a] text-center py-6">No gifs found.</p>
        ) : (
          gifs.map((gif) => (
            <button
              key={gif.id}
              onClick={() => onSelect(gif)}
              className="rounded-lg overflow-hidden bg-[#f0e8d8] hover:ring-2 hover:ring-[#d4af37] transition-all">
              <img src={gif.previewUrl || gif.url} alt="" className="w-full h-24 object-cover" />
            </button>
          ))
        )}
      </div>
      <div className="px-2 py-1 text-[10px] text-[#b8a898] text-right border-t border-[#e8dcc8]">Powered by Tenor</div>
    </div>
  );
}

function EmojiPicker({ onSelect, onClose }) {
  const boxRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={boxRef}
      className="absolute bottom-full left-3 mb-2 w-72 max-h-80 overflow-y-auto bg-white border border-[#e8dcc8] rounded-xl shadow-xl p-3 z-20">
      {EMOJI_GROUPS.map((group) => (
        <div key={group.label} className="mb-2 last:mb-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#b8a898] mb-1">{group.label}</p>
          <div className="grid grid-cols-8 gap-1">
            {group.emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSelect(emoji)}
                className="text-lg rounded-md hover:bg-[#f0e8d8] w-8 h-8 flex items-center justify-center">
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Discord-style @mention dropdown — searches all members (same as the
// thread page), not just people currently in the room, since a mention
// still resolves and notifies someone who's away from the room right now.
function MentionDropdown({ members, activeIndex, onSelect }) {
  return (
    <div
      className="absolute bottom-full left-3 mb-2 w-60 bg-white border border-[#e8dcc8] rounded-xl overflow-hidden z-20"
      style={{ boxShadow: "0 8px 32px rgba(45,55,72,0.18)" }}>
      {members.length === 0 ? (
        <p className="px-3.5 py-3 text-xs text-[#9a8c7a]">No one to mention right now.</p>
      ) : (
        members.map((u, i) => (
          <button
            key={u.id}
            onMouseDown={(e) => {
              e.preventDefault(); // keep focus in the input
              onSelect(u);
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors ${
              i === activeIndex ? "bg-[#f0e8d8]" : "hover:bg-[#f0e8d8]"
            }`}>
            {u.avatar ? (
              <img src={u.avatar} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#2d3748] text-[#d4af37] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {initials(u.username)}
              </div>
            )}
            <span className="text-sm text-[#2d3748] font-semibold">@{u.username}</span>
          </button>
        ))
      )}
    </div>
  );
}

export function SprintRoomChat({ sprintRoomId, currentUserId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [viewingOlder, setViewingOlder] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mention, setMention] = useState(null); // { start, query }
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionResults, setMentionResults] = useState([]);

  const scrollRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);
  const messageRefs = useRef({});
  const jumpingRef = useRef(false);
  const mentionDebounceRef = useRef(null);

  const registerMessageRef = useCallback((id, node) => {
    if (node) messageRefs.current[id] = node;
    else delete messageRefs.current[id];
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!sprintRoomId) return;
    try {
      const res = await fetch(`${API_URL}/sprint-room/${sprintRoomId}/messages?limit=50`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages((data.messages || []).slice().reverse());
    } catch {}
    finally {
      setLoading(false);
    }
  }, [sprintRoomId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // Opening the panel counts as "seen" — clears the red-dot badge on the
  // Chat toggle (and the sidebar, once it's not showing the room).
  useEffect(() => {
    fetch(`${API_URL}/sprint-room/notifications/read`, { method: "POST", credentials: "include" }).catch(() => {});
  }, [sprintRoomId]);

  // Auto-scroll to the bottom on new messages — but only while the writer is
  // already down there. If they've jumped to a quote or scrolled up to read
  // history, new messages must NOT yank them back down; that's what the
  // "Jump To Present" pill below is for instead.
  useEffect(() => {
    if (viewingOlder) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, viewingOlder]);

  const NEAR_BOTTOM_PX = 120;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setViewingOlder(distanceFromBottom > NEAR_BOTTOM_PX);
  }, []);

  function jumpToPresent() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setHighlightId(null);
    setViewingOlder(false);
  }

  // Discord-style "jump to the quoted message". If it's not in the
  // currently-loaded window, page in older messages and try again.
  async function scrollToMessage(targetId, attempt = 0) {
    if (!targetId) return;
    const node = messageRefs.current[targetId];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(targetId);
      setTimeout(() => setHighlightId((cur) => (cur === targetId ? null : cur)), 1600);
      return;
    }
    if (attempt >= 4 || jumpingRef.current) return;
    jumpingRef.current = true;
    try {
      const oldest = messages[0];
      if (!oldest) return;
      const res = await fetch(
        `${API_URL}/sprint-room/${sprintRoomId}/messages?limit=50&before=${encodeURIComponent(oldest.createdAt)}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const older = (data.messages || []).slice().reverse();
      if (older.length === 0) return; // nothing further back to load
      setMessages((m) => [...older, ...m]);
      requestAnimationFrame(() => scrollToMessage(targetId, attempt + 1));
    } finally {
      jumpingRef.current = false;
    }
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    setMention(null);
    const quotedId = replyTo?.id || null;
    setReplyTo(null);
    try {
      const res = await fetch(`${API_URL}/sprint-room/${sprintRoomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, quotedMessageId: quotedId, messageType: "TEXT" }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((m) => [...m, data.message]);
        requestAnimationFrame(jumpToPresent);
      }
    } catch {}
  }

  async function handleSendGif(gif) {
    setShowGifPicker(false);
    const quotedId = replyTo?.id || null;
    setReplyTo(null);
    try {
      const res = await fetch(`${API_URL}/sprint-room/${sprintRoomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: "", quotedMessageId: quotedId, messageType: "GIF", mediaUrl: gif.url }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((m) => [...m, data.message]);
        requestAnimationFrame(jumpToPresent);
      }
    } catch {}
  }

  async function handleDelete(messageId) {
    setMessages((m) => m.filter((msg) => msg.id !== messageId));
    try {
      await fetch(`${API_URL}/sprint-room/messages/${messageId}`, { method: "DELETE", credentials: "include" });
    } catch {}
  }

  function handleDraftChange(e) {
    const value = e.target.value;
    setDraft(value);

    const caret = e.target.selectionStart;
    const uptoCaret = value.slice(0, caret);
    const match = uptoCaret.match(/(?:^|\s)@([a-zA-Z0-9_]{0,20})$/);
    if (match) {
      setMention({ start: caret - match[1].length - 1, query: match[1] });
      setMentionIndex(0);
      setShowGifPicker(false);
      setShowEmojiPicker(false);
    } else {
      setMention(null);
    }
  }

  // Mirrors the thread page's @mention autocomplete: search all members, not
  // just people currently present in this room (a mention still resolves —
  // and notifies — someone who isn't here right now, so they should be
  // findable in the picker too).
  useEffect(() => {
    if (!mention) {
      setMentionResults([]);
      return;
    }
    clearTimeout(mentionDebounceRef.current);
    if (mention.query.length < 2) {
      setMentionResults([]);
      return;
    }
    mentionDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/threads/members/search?q=${encodeURIComponent(mention.query)}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setMentionResults((data.users || []).filter((u) => u.id !== currentUserId));
      } catch {
        setMentionResults([]);
      }
    }, 200);
    return () => clearTimeout(mentionDebounceRef.current);
  }, [mention, currentUserId]);

  const filteredMentionMembers = mentionResults;

  function insertMention(user) {
    if (!mention) return;
    const before = draft.slice(0, mention.start);
    const after = draft.slice(mention.start + 1 + mention.query.length); // +1 for "@"
    const newValue = `${before}@${user.username} ${after}`;
    setDraft(newValue);
    setMention(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const pos = (before + `@${user.username} `).length;
      inputRef.current?.setSelectionRange(pos, pos);
    });
  }

  function insertEmoji(emoji) {
    const el = inputRef.current;
    const caret = el ? el.selectionStart : draft.length;
    const newValue = draft.slice(0, caret) + emoji + draft.slice(caret);
    setDraft(newValue);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = caret + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  function handleComposerKeyDown(e) {
    if (mention) {
      if (e.key === "Escape") {
        setMention(null);
        return;
      }
      if (filteredMentionMembers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((i) => Math.min(i + 1, filteredMentionMembers.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(filteredMentionMembers[mentionIndex] || filteredMentionMembers[0]);
          return;
        }
      }
    }
    if (e.key === "Enter") handleSend();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[#e8dcc8] flex-shrink-0">
        <button
          onClick={onBack}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-extrabold text-[#2d3748]">Chat</h2>
      </div>

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto py-2">
          {loading ? (
            <p className="text-xs text-[#9a8c7a] text-center py-8">Loading chat…</p>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <p className="text-sm text-[#9a8c7a]">No messages yet.</p>
              <p className="text-xs text-[#b8a898] mt-1">Say hi to the room 👋</p>
            </div>
          ) : (
            messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                isOwn={m.sender?.id === currentUserId}
                isHighlighted={m.id === highlightId}
                onReply={setReplyTo}
                onDelete={handleDelete}
                onJumpToQuote={scrollToMessage}
                registerRef={registerMessageRef}
              />
            ))
          )}
        </div>

        {/* Discord-style "you scrolled away" pill — stays visible for as long
            as the writer is up reading history (from a quote jump or a manual
            scroll), and never auto-dismisses or yanks them back down on its
            own. They leave when they choose to, via this button. */}
        {viewingOlder && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full bg-[#2d3748]/95 shadow-lg backdrop-blur-sm">
            <span className="text-xs font-medium text-white whitespace-nowrap">You're viewing older messages</span>
            <button
              onClick={jumpToPresent}
              className="px-3 py-1.5 rounded-full bg-[#d4af37] text-[#1a1a2e] text-xs font-bold whitespace-nowrap hover:bg-[#e0bd4a] transition-colors">
              Jump To Present
            </button>
          </div>
        )}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#f0e8d8] border-t border-[#e8dcc8] flex-shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[#7a6a50]">Replying to {replyTo.sender?.username}</p>
            <p className="text-xs text-[#9a8c7a] truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-[#9a8c7a] hover:text-[#2d3748] flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="relative flex items-center gap-1.5 px-3 py-3 border-t border-[#e8dcc8] flex-shrink-0">
        {mention && (
          <MentionDropdown members={filteredMentionMembers} activeIndex={mentionIndex} onSelect={insertMention} />
        )}
        {showGifPicker && <GifPicker onSelect={handleSendGif} onClose={() => setShowGifPicker(false)} />}
        {showEmojiPicker && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmojiPicker(false)} />}

        <button
          onClick={() => {
            setShowEmojiPicker(false);
            setShowGifPicker((v) => !v);
          }}
          title="Send a GIF"
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-extrabold text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all">
          GIF
        </button>
        <button
          onClick={() => {
            setShowGifPicker(false);
            setShowEmojiPicker((v) => !v);
          }}
          title="Add an emoji"
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-base text-[#9a8c7a] hover:text-[#2d3748] hover:bg-[#f0e8d8] transition-all">
          😊
        </button>

        <input
          ref={inputRef}
          value={draft}
          onChange={handleDraftChange}
          onKeyDown={handleComposerKeyDown}
          placeholder="Type your message… (@ to mention)"
          className="flex-1 px-3.5 py-2.5 bg-[#f0e8d8] text-[#2d3748] placeholder-[#b8a898] rounded-full text-sm focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="w-9 h-9 rounded-full bg-[#2d3748] text-[#d4af37] flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-[#3d4f64] transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}