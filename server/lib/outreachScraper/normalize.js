/**
 * Normalization for scraped staff records: map a free-text job title (plus the
 * category/section heading the person was listed under) to a canonical sport
 * slug and a set of role tags.
 *
 * Pure, table-driven, and dependency-free so it is trivially unit-testable.
 *
 * @module outreachScraper/normalize
 */

/**
 * Sport slug → keyword phrases. Order matters only in that gendered/multi-word
 * variants are listed; matching is longest-phrase-first to avoid e.g. "soccer"
 * stealing a "women's soccer" hit. Keep keywords lowercase.
 * @type {Record<string, string[]>}
 */
const SPORT_KEYWORDS = {
  football: ["football"],
  mens_basketball: ["men's basketball", "mens basketball"],
  womens_basketball: ["women's basketball", "womens basketball"],
  mens_soccer: ["men's soccer", "mens soccer"],
  womens_soccer: ["women's soccer", "womens soccer"],
  baseball: ["baseball"],
  softball: ["softball"],
  mens_lacrosse: ["men's lacrosse", "mens lacrosse"],
  womens_lacrosse: ["women's lacrosse", "womens lacrosse"],
  womens_volleyball: ["women's volleyball", "womens volleyball"],
  mens_volleyball: ["men's volleyball", "mens volleyball"],
  volleyball: ["volleyball"],
  wrestling: ["wrestling"],
  mens_golf: ["men's golf", "mens golf"],
  womens_golf: ["women's golf", "womens golf"],
  golf: ["golf"],
  mens_tennis: ["men's tennis", "mens tennis"],
  womens_tennis: ["women's tennis", "womens tennis"],
  tennis: ["tennis"],
  track_field: ["track & field", "track and field", "track/field", "track"],
  cross_country: ["cross country", "cross-country"],
  swimming_diving: ["swimming/diving", "swimming and diving", "swimming", "diving"],
  rowing: ["rowing", "crew"],
  field_hockey: ["field hockey"],
  ice_hockey: ["ice hockey", "hockey"],
  rugby: ["rugby"],
  cheerleading: ["cheerleading", "cheer", "spirit"],
  bowling: ["bowling"],
  gymnastics: ["gymnastics"],
};

// Longest phrases first so multi-word/gendered variants win over generic ones.
const SPORT_ENTRIES = Object.entries(SPORT_KEYWORDS)
  .flatMap(([slug, kws]) => kws.map((kw) => [slug, kw]))
  .sort((a, b) => b[1].length - a[1].length);

/**
 * Role tag → keyword phrases (lowercase). A person can match several tags.
 * @type {Record<string, string[]>}
 */
const ROLE_KEYWORDS = {
  head_coach: ["head coach"],
  offensive_coordinator: ["offensive coordinator"],
  defensive_coordinator: ["defensive coordinator"],
  special_teams_coordinator: ["special teams coordinator", "special teams"],
  recruiting_coordinator: ["recruiting coordinator", "director of recruiting", "recruiting"],
  strength_coach: ["strength and conditioning", "strength & conditioning", "strength coach", "sports performance"],
  graduate_assistant: ["graduate assistant", "graduate manager", "student assistant"],
  director_of_operations: ["director of operations", "operations"],
  athletic_trainer: ["athletic trainer", "sports medicine", "head trainer"],
  video_coordinator: ["video coordinator", "director of video", "video"],
};

const ROLE_ENTRIES = Object.entries(ROLE_KEYWORDS);

/**
 * Strip trailing parenthetical noise (e.g. Sidearm legacy category names append
 * a "(ZIP: 45469-1230)" suffix) and collapse whitespace.
 * @param {string} [text]
 * @returns {string}
 */
export function cleanCategory(text) {
  if (!text) return "";
  return text.replace(/\(ZIP:[^)]*\)/gi, "").replace(/\s+/g, " ").trim();
}

/**
 * Derive a canonical sport slug from a category heading and/or job title.
 * Prefers the category (a section like "Football Coaching Staff" is a stronger
 * sport signal than a generic title like "Assistant Coach").
 *
 * @param {string} categoryLabel - section heading the person was listed under
 * @param {string} title - the person's job title
 * @returns {string|null} canonical sport slug, or null when none matched
 */
export function deriveSport(categoryLabel, title) {
  const haystacks = [cleanCategory(categoryLabel).toLowerCase(), (title || "").toLowerCase()];
  for (const hay of haystacks) {
    if (!hay) continue;
    for (const [slug, kw] of SPORT_ENTRIES) {
      if (hay.includes(kw)) return slug;
    }
  }
  return null;
}

/**
 * Derive role tags from a job title (and category as a fallback haystack).
 * Returns all matching tags. `assistant_coach` is suppressed when a more
 * specific coordinator role already matched, since "assistant" is broad.
 *
 * @param {string} title - the person's job title
 * @param {string} [categoryLabel]
 * @returns {string[]} role tag slugs (possibly empty)
 */
export function deriveRoleTags(title, categoryLabel = "") {
  const hay = `${cleanCategory(categoryLabel)} ${title || ""}`.toLowerCase();
  const tags = [];
  for (const [tag, kws] of ROLE_ENTRIES) {
    if (kws.some((kw) => hay.includes(kw))) tags.push(tag);
  }
  // "head coach" and "assistant coach" are frequently split by a sport word
  // ("Head Softball Coach", "Assistant Women's Soccer Coach"), so match on
  // co-occurrence of the two words rather than the literal phrase. Requiring
  // "coach" keeps non-coaching roles (e.g. "Executive Assistant to the VP",
  // "Head Athletic Trainer") from being mislabeled.
  const hasCoach = /\bcoach/.test(hay);
  if (hasCoach && /\bhead\b/.test(hay) && !tags.includes("head_coach")) {
    tags.push("head_coach");
  }
  if (hasCoach && /\bassistant\b/.test(hay) && !tags.includes("assistant_coach")) {
    tags.push("assistant_coach");
  }
  return tags;
}

/**
 * Normalize one raw scraped record into the stored shape.
 *
 * @param {{ name?: string, title?: string, email?: string, phone?: string, categoryLabel?: string }} raw
 * @returns {{ name: string, title: string, sport: string|null, roleTags: string[], email: string|null, phone: string|null }}
 */
export function normalizeStaff(raw) {
  const title = (raw.title || "").replace(/\s+/g, " ").trim();
  const categoryLabel = cleanCategory(raw.categoryLabel);
  return {
    name: (raw.name || "").replace(/\s+/g, " ").trim(),
    title,
    sport: deriveSport(categoryLabel, title),
    roleTags: deriveRoleTags(title, categoryLabel),
    email: raw.email ? raw.email.trim() : null,
    phone: raw.phone ? raw.phone.trim() : null,
  };
}
