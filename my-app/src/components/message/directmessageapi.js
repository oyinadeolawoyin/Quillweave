// src/components/directMessages/directMessageApi.js

import API_URL from "@/config/api";

async function parseJsonSafe(res) {
  try { return await res.json(); } catch { return null; }
}

// GET /direct-messages
// Returns all conversations the logged-in user is part of, newest activity first.
export async function fetchConversations() {
  const res = await fetch(`${API_URL}/direct-messages`, { credentials: "include" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't load your messages.");
  return Array.isArray(data) ? data : [];
}

// POST /direct-messages/conversations/:userId
// Opens or returns the existing conversation room with another user.
// Safe to call repeatedly — idempotent.
export async function openConversation(otherUserId) {
  const res = await fetch(`${API_URL}/direct-messages/conversations/${otherUserId}`, {
    method: "POST",
    credentials: "include",
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't open conversation.");
  return data; // { id, otherUser, lastMessage, createdAt }
}

// GET /direct-messages/conversations/:conversationId/messages
// Paginated message history, newest first.
// Pass beforeId to load older messages.
export async function fetchMessages(conversationId, { beforeId } = {}) {
  const url = new URL(`${API_URL}/direct-messages/conversations/${conversationId}/messages`);
  if (beforeId) url.searchParams.set("beforeId", beforeId);

  const res = await fetch(url.toString(), { credentials: "include" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't load messages.");
  return data; // { messages, hasMore, nextCursor }
}

// POST /direct-messages/conversations/:conversationId/messages
// Body: { content, quotedMessageId? }
export async function sendMessage(conversationId, { content, quotedMessageId }) {
  const res = await fetch(`${API_URL}/direct-messages/conversations/${conversationId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, quotedMessageId }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't send message.");
  return data; // the new message object
}

// DELETE /direct-messages/messages/:messageId
export async function deleteMessage(messageId) {
  const res = await fetch(`${API_URL}/direct-messages/messages/${messageId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't delete message.");
  return data;
}

// PATCH /direct-messages/conversations/:conversationId/read
// Call when the user opens a conversation to clear the unread badge.
export async function markConversationRead(conversationId) {
  const res = await fetch(`${API_URL}/direct-messages/conversations/${conversationId}/read`, {
    method: "PATCH",
    credentials: "include",
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't mark conversation as read.");
  return data;
}