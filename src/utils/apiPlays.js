import { apiFetch } from "./api";

/**
 * Fetch all plays for a team from the API.
 * Returns normalized array matching the frontend PlayRecord shape.
 */
export async function fetchPlays(teamId) {
  const data = await apiFetch(`/teams/${teamId}/plays`);
  return (data.plays || []).map(mapApiPlayToLocal);
}

/** Create a new play via API. Returns the created play in local shape. */
export async function createPlay(teamId, { title, tags, playData, notes, notesAuthorName }) {
  const data = await apiFetch(`/teams/${teamId}/plays`, {
    method: "POST",
    body: {
      title: title || "Untitled",
      tags: tags || [],
      playData: playData || null,
      notes: notes || "",
      notesAuthorName: notesAuthorName || "",
    },
  });
  return mapApiPlayToLocal(data.play || data);
}

/** Update an existing play via API. Returns the updated play. */
export async function updatePlay(teamId, playId, updates) {
  const data = await apiFetch(`/teams/${teamId}/plays/${playId}`, {
    method: "PATCH",
    body: updates,
  });
  return mapApiPlayToLocal(data.play || data);
}

/** Delete a play via API. */
export async function deletePlay(teamId, playId) {
  await apiFetch(`/teams/${teamId}/plays/${playId}`, { method: "DELETE" });
}

/** Fetch a single play by ID. */
export async function fetchPlay(teamId, playId) {
  const data = await apiFetch(`/teams/${teamId}/plays/${playId}`);
  return mapApiPlayToLocal(data.play || data);
}

/** Toggle favorite status. */
export async function toggleFavorite(teamId, playId, favorited) {
  await apiFetch(`/teams/${teamId}/plays/${playId}/favorite`, {
    method: "PUT",
    body: { favorited },
  });
}

/** Update play tags. */
export async function updatePlayTags(teamId, playId, tags) {
  await apiFetch(`/teams/${teamId}/plays/${playId}/tags`, {
    method: "PATCH",
    body: { tags },
  });
}

/** Update play notes. */
export async function updatePlayNotes(teamId, playId, notes, notesAuthorName) {
  await apiFetch(`/teams/${teamId}/plays/${playId}/notes`, {
    method: "PATCH",
    body: { notes, notesAuthorName },
  });
}

/** Move play to a folder. */
export async function movePlayToFolder(teamId, playId, folderId) {
  await apiFetch(`/teams/${teamId}/plays/${playId}/folder`, {
    method: "PATCH",
    body: { folderId },
  });
}

/** Create a share link for a play. Returns { token }. */
export async function sharePlay(teamId, playId) {
  return apiFetch(`/teams/${teamId}/plays/${playId}/share`, { method: "POST" });
}

/** Fetch a shared play by token (public, no team needed). */
export async function fetchSharedPlay(token) {
  const data = await apiFetch(`/shared/plays/${token}`);
  return data.play;
}

/** Copy a shared play to the current user's team playbook. */
export async function copySharedPlay(token) {
  const data = await apiFetch(`/shared/plays/${token}/copy`, { method: "POST" });
  return data.play;
}

/** Copy a platform play to the current user's team playbook. */
export async function copyPlatformPlay(playId) {
  const data = await apiFetch(`/platform-plays/${playId}/copy`, { method: "POST" });
  return data.play;
}

/** Fetch trashed plays for a team. */
export async function fetchTrashedPlays(teamId) {
  const data = await apiFetch(`/teams/${teamId}/plays-trash`);
  return (data.plays || []).map((p) => ({ ...mapApiPlayToLocal(p), archivedAt: p.archivedAt }));
}

/** Restore a play from trash. */
export async function restorePlay(teamId, playId) {
  await apiFetch(`/teams/${teamId}/plays/${playId}/restore`, { method: "POST" });
}

/** Permanently delete a play. */
export async function permanentDeletePlay(teamId, playId) {
  await apiFetch(`/teams/${teamId}/plays/${playId}/permanent`, { method: "DELETE" });
}

/** Duplicate a play. Returns the new play in local shape. */
export async function duplicatePlay(teamId, playId) {
  const data = await apiFetch(`/teams/${teamId}/plays/${playId}/duplicate`, { method: "POST" });
  return mapApiPlayToLocal(data.play || data);
}

/** Bulk soft-delete plays. */
export async function bulkDeletePlays(teamId, playIds) {
  await apiFetch(`/teams/${teamId}/plays/bulk/delete`, { method: "POST", body: { playIds } });
}

/** Bulk move plays to a folder. */
export async function bulkMovePlays(teamId, playIds, folderId) {
  await apiFetch(`/teams/${teamId}/plays/bulk/move`, { method: "POST", body: { playIds, folderId } });
}

/** Bulk add tags to plays. */
export async function bulkTagPlays(teamId, playIds, tags) {
  await apiFetch(`/teams/${teamId}/plays/bulk/tags`, { method: "POST", body: { playIds, tags } });
}

/** Map API play response to the local PlayRecord shape. */
function mapApiPlayToLocal(p) {
  return {
    id: p.id,
    teamId: p.teamId || null,
    folderId: p.folderId || null,
    title: p.title || "Untitled",
    tags: p.tags || [],
    playData: p.playData || null,
    thumbnail: p.thumbnail || null,
    notes: p.notes || "",
    notesAuthorName: p.notesAuthorName || "",
    notesUpdatedAt: p.notesUpdatedAt || null,
    favorited: Boolean(p.favorited),
    hiddenFromPlayers: Boolean(p.hiddenFromPlayers),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    // Legacy aliases
    playName: p.title || "Untitled",
    savedAt: p.updatedAt,
  };
}
