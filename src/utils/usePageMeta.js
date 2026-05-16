import { useEffect } from "react";

const DEFAULT_TITLE = "Coachable — Digital Playbook & Animated Play Designer for Coaches";
const DEFAULT_DESCRIPTION =
  "Coachable is the online playbook platform for coaches. Design animated plays, share digital playbooks, and manage your team's strategy.";
const SITE_ORIGIN = "https://coachableplays.com";

/**
 * Reads a meta tag's content by attribute selector, returning null when absent.
 * @param {string} selector
 * @returns {string|null}
 */
function readMetaContent(selector) {
  const el = document.head.querySelector(selector);
  return el ? el.getAttribute("content") : null;
}

/**
 * Updates a meta tag's content, creating it on the fly if it doesn't exist yet.
 * Returns the previous content value so callers can restore it on unmount.
 * @param {string} selector - CSS selector that uniquely identifies the meta element.
 * @param {{ name?: string, property?: string }} attrs - Attributes to set when creating a new tag.
 * @param {string|null|undefined} value - Content value to write. When null/undefined the tag is left untouched.
 * @returns {string|null}
 */
function setMetaContent(selector, attrs, value) {
  if (value == null) return null;
  let el = document.head.querySelector(selector);
  const prev = el ? el.getAttribute("content") : null;
  if (!el) {
    el = document.createElement("meta");
    if (attrs.name) el.setAttribute("name", attrs.name);
    if (attrs.property) el.setAttribute("property", attrs.property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
  return prev;
}

/**
 * Updates the canonical link tag's href, creating it on the fly if missing.
 * Returns the previous href so callers can restore it on unmount.
 * @param {string|null|undefined} href
 * @returns {string|null}
 */
function setCanonical(href) {
  if (href == null) return null;
  let el = document.head.querySelector('link[rel="canonical"]');
  const prev = el ? el.getAttribute("href") : null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return prev;
}

/**
 * Sets per-route page metadata (title, description, canonical URL, Open Graph, Twitter Card)
 * for the duration of the calling component's mount. Restores the previous values on unmount,
 * which keeps the SPA behaving correctly when the user navigates between routes.
 *
 * Pass only the fields you want to override; everything else falls through to the values
 * declared in index.html. A bare call with no arguments will reset to the site defaults.
 *
 * @param {Object} [meta]
 * @param {string} [meta.title] - Browser tab title and og:title.
 * @param {string} [meta.description] - <meta name="description">, og:description, twitter:description.
 * @param {string} [meta.canonical] - Absolute URL for <link rel="canonical"> and og:url.
 *   When omitted, defaults to SITE_ORIGIN + window.location.pathname.
 * @param {string} [meta.ogImage] - Absolute URL for og:image / twitter:image. Defaults to the
 *   site-wide og-image.png if omitted.
 */
export default function usePageMeta({ title, description, canonical, ogImage } = {}) {
  useEffect(() => {
    const resolvedCanonical =
      canonical != null
        ? canonical
        : typeof window !== "undefined"
          ? `${SITE_ORIGIN}${window.location.pathname}`
          : null;
    const resolvedTitle = title || DEFAULT_TITLE;
    const resolvedDescription = description || DEFAULT_DESCRIPTION;
    const resolvedOgImage = ogImage || `${SITE_ORIGIN}/og-image.png`;

    const prevTitle = document.title;
    document.title = resolvedTitle;

    const prevDescription = setMetaContent(
      'meta[name="description"]',
      { name: "description" },
      resolvedDescription,
    );
    const prevOgTitle = setMetaContent(
      'meta[property="og:title"]',
      { property: "og:title" },
      resolvedTitle,
    );
    const prevOgDescription = setMetaContent(
      'meta[property="og:description"]',
      { property: "og:description" },
      resolvedDescription,
    );
    const prevOgUrl = setMetaContent(
      'meta[property="og:url"]',
      { property: "og:url" },
      resolvedCanonical,
    );
    const prevOgImage = setMetaContent(
      'meta[property="og:image"]',
      { property: "og:image" },
      resolvedOgImage,
    );
    const prevTwitterTitle = setMetaContent(
      'meta[name="twitter:title"]',
      { name: "twitter:title" },
      resolvedTitle,
    );
    const prevTwitterDescription = setMetaContent(
      'meta[name="twitter:description"]',
      { name: "twitter:description" },
      resolvedDescription,
    );
    const prevTwitterImage = setMetaContent(
      'meta[name="twitter:image"]',
      { name: "twitter:image" },
      resolvedOgImage,
    );
    const prevCanonical = setCanonical(resolvedCanonical);

    return () => {
      document.title = prevTitle;
      setMetaContent('meta[name="description"]', { name: "description" }, prevDescription);
      setMetaContent('meta[property="og:title"]', { property: "og:title" }, prevOgTitle);
      setMetaContent(
        'meta[property="og:description"]',
        { property: "og:description" },
        prevOgDescription,
      );
      setMetaContent('meta[property="og:url"]', { property: "og:url" }, prevOgUrl);
      setMetaContent('meta[property="og:image"]', { property: "og:image" }, prevOgImage);
      setMetaContent('meta[name="twitter:title"]', { name: "twitter:title" }, prevTwitterTitle);
      setMetaContent(
        'meta[name="twitter:description"]',
        { name: "twitter:description" },
        prevTwitterDescription,
      );
      setMetaContent('meta[name="twitter:image"]', { name: "twitter:image" }, prevTwitterImage);
      setCanonical(prevCanonical);
    };
  }, [title, description, canonical, ogImage]);
}

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION, SITE_ORIGIN, readMetaContent };
