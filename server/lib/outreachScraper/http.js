/**
 * Polite HTTP fetch helper for the outreach scraper.
 *
 * Wraps the native fetch with a desktop User-Agent, an abort-based timeout,
 * and a single retry on transient failure (network error or 5xx). Kept tiny
 * and dependency-free so the scraper module stays self-contained.
 *
 * @module outreachScraper/http
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Delay (ms) callers should wait between requests to the same host. */
export const POLITE_DELAY_MS = 250;

/**
 * Sleep for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a URL and return its response body as text.
 *
 * Throws on a persistent failure (timeout, network error, or non-2xx after
 * the retry). The error message is safe to surface in `last_scrape_error`.
 *
 * @param {string} url - absolute URL to fetch
 * @param {{ timeoutMs?: number, retries?: number }} [opts]
 * @returns {Promise<{ status: number, finalUrl: string, html: string }>}
 */
export async function fetchHtml(url, { timeoutMs = 15000, retries = 1 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,*/*" },
        redirect: "follow",
        signal: ac.signal,
      });
      const html = await res.text();
      if (res.status >= 500 && attempt < retries) {
        lastErr = new Error(`HTTP ${res.status} from ${url}`);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return { status: res.status, finalUrl: res.url, html };
    } catch (err) {
      lastErr = err.name === "AbortError" ? new Error(`Timeout after ${timeoutMs}ms`) : err;
      if (attempt < retries) await sleep(POLITE_DELAY_MS);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error(`Failed to fetch ${url}`);
}
