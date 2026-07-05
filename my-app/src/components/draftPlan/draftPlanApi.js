// src/components/draftplan/draftPlanApi.js

import API_URL from "../../config/api";

async function parseJsonSafe(res) {
  try { return await res.json(); } catch { return null; }
}

// GET /draftplan/mine
export async function fetchMyPlan() {
  const res = await fetch(`${API_URL}/draftplan/mine`, { credentials: "include" });
  if (res.status === 404) return null;
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't load your draft plan.");
  return data?.plan ?? null;
}

// POST /draftplan
export async function createDraftPlan(payload) {
  const res = await fetch(`${API_URL}/draftplan`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't create your draft plan.");
  return data?.plan;
}

// PATCH /draftplan
export async function updateDraftPlan(payload) {
  const res = await fetch(`${API_URL}/draftplan`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't update your draft plan.");
  return data?.plan;
}

// DELETE /draftplan
export async function deleteDraftPlan() {
  const res = await fetch(`${API_URL}/draftplan`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't delete your draft plan.");
  return data;
}

// POST /draftplan/progress
export async function logProgress({ countLogged, note, logDate, direction }) {
  const res = await fetch(`${API_URL}/draftplan/progress`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ countLogged, note, logDate, direction }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't log your progress.");
  return data;
}

// GET /draftplan/active
export async function fetchActiveDraftWriters() {
  const res = await fetch(`${API_URL}/draftplan/active`, { credentials: "include" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't load active writers.");
  return data?.writers ?? data ?? [];
}

// GET /draftplan/logged-today
export async function fetchWritersWhoLoggedToday() {
  const res = await fetch(`${API_URL}/draftplan/logged-today`, { credentials: "include" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't load today's writers.");
  return data?.writers ?? data ?? [];
}

// GET /draftplan/scheduled-today
// Authenticated — returns [] if the current user doesn't have today as a
// writing day themselves (enforced server-side, not just hidden here).
// Includes peers who've already logged today (hasLoggedToday) alongside
// those still getting ready.
export async function fetchWritersScheduledToday() {
  const res = await fetch(`${API_URL}/draftplan/scheduled-today`, { credentials: "include" });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't load today's scheduled writers.");
  return data?.writers ?? data ?? [];
}

// POST /draftplan/upload-image
// Uses the same multer/supabase pipeline as thread media uploads.
// Returns the public URL string.
export async function uploadMoodboardImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_URL}/draftplan/upload-image`, {
    method: "POST",
    credentials: "include",
    body: formData,
    // Do NOT set Content-Type — browser sets it with the correct multipart boundary
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message ?? "Couldn't upload that image.");
  return data?.url;
}