// src/components/daysChallenge/daysChallengeApi.js

import API_URL from "@/config/api";

async function parseJsonSafe(res) {
  try { return await res.json(); } catch { return null; }
}

// GET /days-challenge/mine
export async function fetchMyChallenge() {
  const res = await fetch(`${API_URL}/days-challenge/mine`, { credentials: "include" });
  if (res.status === 404) return null;
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't load your challenge.");
  return data; // { challenge, stats }
}

// POST /days-challenge
// Body: { duration, focuses, storyTitle?, workingGoal, whyNow, goalType, dailyGoal, reminderTime? }
// reminderTime is "HH:MM" in the writer's local time (defaults to "09:00" server-side if omitted)
export async function createChallenge(payload) {
  const res = await fetch(`${API_URL}/days-challenge`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't start your challenge.");
  return data; // { challenge, stats }
}

// PATCH /days-challenge
// Body: { storyTitle?, workingGoal?, whyNow?, dailyGoal?, reminderTime? } — only send fields being changed
export async function updateChallenge(payload) {
  const res = await fetch(`${API_URL}/days-challenge`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't update your challenge.");
  return data; // { challenge, stats }
}

// PATCH /days-challenge/complete
export async function completeChallenge() {
  const res = await fetch(`${API_URL}/days-challenge/complete`, {
    method: "PATCH",
    credentials: "include",
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't mark this challenge complete.");
  return data; // { challenge, stats }
}

// PATCH /days-challenge/uncomplete
// Reverts an early-completed challenge back to ACTIVE (only if endDate hasn't passed).
export async function uncompleteChallenge() {
  const res = await fetch(`${API_URL}/days-challenge/uncomplete`, {
    method: "PATCH",
    credentials: "include",
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't resume this challenge.");
  return data; // { challenge, stats }
}

// DELETE /days-challenge
export async function leaveChallenge() {
  const res = await fetch(`${API_URL}/days-challenge`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't leave this challenge.");
  return data;
}

// POST /days-challenge/progress
// Body: { countLogged: number, note?: string, checkInDate?: ISO string, direction?: "add" | "remove" }
// direction defaults to "add" server-side if omitted
export async function logProgress({ countLogged, note, checkInDate, direction }) {
  const res = await fetch(`${API_URL}/days-challenge/progress`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ countLogged, note, checkInDate, direction }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't log your progress.");
  return data; // { checkIn, direction, metDailyGoal, isAllDone, stats, challenge }
}

// GET /days-challenge/active
export async function fetchActiveChallengeWriters() {
  const res = await fetch(`${API_URL}/days-challenge/active`, { credentials: "include" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't load active writers.");
  return Array.isArray(data) ? data : (data?.writers ?? []);
}

// GET /days-challenge/logged-today
export async function fetchWritersWhoLoggedToday() {
  const res = await fetch(`${API_URL}/days-challenge/logged-today`, { credentials: "include" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't load today's writers.");
  return Array.isArray(data) ? data : (data?.writers ?? []);
}