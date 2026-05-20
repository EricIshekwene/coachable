/**
 * In-memory store for temporarily hosting generated GIF blobs.
 * Assets expire after 24 hours and are auto-cleaned on each write.
 * UUIDs are cryptographically random so no auth is needed on the GET endpoint.
 */

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** @type {Map<string, { buffer: Buffer, createdAt: number }>} */
const store = new Map();

/**
 * Store a GIF buffer under the given id.
 * @param {string} id
 * @param {Buffer} buffer
 */
export function storeGifAsset(id, buffer) {
  store.set(id, { buffer, createdAt: Date.now() });
  // Evict expired entries on every write
  for (const [k, v] of store.entries()) {
    if (Date.now() - v.createdAt > TTL_MS) store.delete(k);
  }
}

/**
 * Retrieve a GIF buffer by id, or null if expired/not found.
 * @param {string} id
 * @returns {Buffer|null}
 */
export function getGifAsset(id) {
  const entry = store.get(id);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(id);
    return null;
  }
  return entry.buffer;
}
