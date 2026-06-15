import { apiFetch } from "./api";

/** Fetch all folders for a team. */
export async function fetchFolders(teamId) {
  const data = await apiFetch(`/teams/${teamId}/folders`);
  return (data.folders || []).map(mapApiFolderToLocal);
}

/** Create a folder. */
export async function createFolder(teamId, { name, parentId, sortOrder }) {
  const data = await apiFetch(`/teams/${teamId}/folders`, {
    method: "POST",
    body: { name, parentId: parentId || null, sortOrder: sortOrder || 0 },
  });
  return mapApiFolderToLocal(data.folder || data);
}

/** Update a folder (rename / reorder). */
export async function updateFolder(teamId, folderId, updates) {
  const data = await apiFetch(`/teams/${teamId}/folders/${folderId}`, {
    method: "PATCH",
    body: updates,
  });
  return mapApiFolderToLocal(data.folder || data);
}

/** Delete a folder. */
export async function deleteFolder(teamId, folderId) {
  await apiFetch(`/teams/${teamId}/folders/${folderId}`, { method: "DELETE" });
}

/** Create a share link for a folder. Returns { token }. */
export async function shareFolder(teamId, folderId) {
  return apiFetch(`/teams/${teamId}/folders/${folderId}/share`, { method: "POST" });
}

/** Fetch a shared folder by token (public, no team needed). */
export async function fetchSharedFolder(token) {
  const data = await apiFetch(`/shared/folders/${token}`);
  return data.folder;
}

/** Copy all plays from a shared folder to the current user's team playbook. */
export async function copySharedFolder(token) {
  const data = await apiFetch(`/shared/folders/${token}/copy`, { method: "POST" });
  return data;
}

function mapApiFolderToLocal(f) {
  return {
    id: f.id,
    name: f.name || "Untitled Folder",
    parentId: f.parentId || null,
    sortOrder: f.sortOrder || 0,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    // The backend uses plays.folder_id, so we derive playIds from the plays list
    // This field won't be populated from the folder API; the Plays page will handle it
    playIds: [],
    tags: [],
  };
}
