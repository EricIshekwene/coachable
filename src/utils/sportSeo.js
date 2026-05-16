/**
 * Per-sport SEO metadata (titles, descriptions, canonical slugs) for the public landing
 * and playbook pages. Centralized so the meta tags stay consistent with the sitemap and
 * llms.txt.
 */

const SPORT_META = {
  rugby: {
    label: "Rugby",
    slug: "rugby",
    landingTitle: "Rugby Play Designer & Animated Playbook — Coachable",
    landingDescription:
      "Design and animate rugby plays online. Build your team's digital rugby playbook, share plays with players, and visualize backline moves and set pieces on a real pitch.",
    playbooksTitle: "Public Rugby Playbooks & Animated Plays — Coachable",
    playbooksDescription:
      "Browse public rugby plays and playbooks created by coaches on Coachable. Lineouts, scrums, backline moves, and set pieces — all animated and shareable.",
  },
  football: {
    label: "Football",
    slug: "football",
    landingTitle: "Football Play Designer & Animated Playbook — Coachable",
    landingDescription:
      "Design and animate American football plays online. Build your team's digital football playbook, draw routes and assignments, and share plays with players on any device.",
    playbooksTitle: "Public Football Playbooks & Animated Plays — Coachable",
    playbooksDescription:
      "Browse public American football plays and playbooks created by coaches on Coachable. Offense, defense, and special teams — fully animated and shareable.",
  },
  soccer: {
    label: "Soccer",
    slug: "soccer",
    landingTitle: "Soccer Play Designer & Animated Playbook — Coachable",
    landingDescription:
      "Design and animate soccer plays online. Build your team's digital soccer playbook, diagram set pieces and tactical moves, and share with your squad.",
    playbooksTitle: "Public Soccer Playbooks & Animated Plays — Coachable",
    playbooksDescription:
      "Browse public soccer plays and playbooks created by coaches on Coachable. Set pieces, formations, and tactical patterns — all animated and shareable.",
  },
  lacrosse: {
    label: "Lacrosse",
    slug: "lacrosse",
    landingTitle: "Lacrosse Play Designer & Animated Playbook — Coachable",
    landingDescription:
      "Design and animate men's lacrosse plays online. Build your digital lacrosse playbook, diagram offensive sets and rides, and share plays with your team.",
    playbooksTitle: "Public Lacrosse Playbooks & Animated Plays — Coachable",
    playbooksDescription:
      "Browse public men's lacrosse plays and playbooks on Coachable. Offensive sets, rides, clears, and EMO — fully animated.",
  },
  basketball: {
    label: "Basketball",
    slug: "basketball",
    landingTitle: "Basketball Play Designer & Animated Playbook — Coachable",
    landingDescription:
      "Design and animate basketball plays online. Build your team's digital basketball playbook, diagram half-court sets and inbound plays, and share with players.",
    playbooksTitle: "Public Basketball Playbooks & Animated Plays — Coachable",
    playbooksDescription:
      "Browse public basketball plays and playbooks on Coachable. Half-court sets, inbounds, BLOBs, and SLOBs — animated and shareable.",
  },
  "field hockey": {
    label: "Field Hockey",
    slug: "field-hockey",
    landingTitle: "Field Hockey Play Designer & Animated Playbook — Coachable",
    landingDescription:
      "Design and animate field hockey plays online. Build your team's digital field hockey playbook, diagram set pieces and tactical patterns, and share with your team.",
    playbooksTitle: "Public Field Hockey Playbooks & Animated Plays — Coachable",
    playbooksDescription:
      "Browse public field hockey plays and playbooks on Coachable. Corners, set pieces, and tactical patterns — animated and shareable.",
  },
  "ice hockey": {
    label: "Ice Hockey",
    slug: "ice-hockey",
    landingTitle: "Ice Hockey Play Designer & Animated Playbook — Coachable",
    landingDescription:
      "Design and animate ice hockey plays online. Build your digital hockey playbook, diagram power plays, breakouts, and forechecks, and share with your team.",
    playbooksTitle: "Public Ice Hockey Playbooks & Animated Plays — Coachable",
    playbooksDescription:
      "Browse public ice hockey plays and playbooks on Coachable. Power plays, breakouts, forechecks, and faceoffs — animated and shareable.",
  },
  "womens lacrosse": {
    label: "Women's Lacrosse",
    slug: "womens-lacrosse",
    landingTitle: "Women's Lacrosse Play Designer & Animated Playbook — Coachable",
    landingDescription:
      "Design and animate women's lacrosse plays online. Build your digital playbook, diagram offensive sets and rides, and share with your team.",
    playbooksTitle: "Public Women's Lacrosse Playbooks & Animated Plays — Coachable",
    playbooksDescription:
      "Browse public women's lacrosse plays and playbooks on Coachable. Offensive sets, rides, and draws — animated and shareable.",
  },
};

const SITE_ORIGIN = "https://coachableplays.com";

/**
 * Looks up SEO metadata for a sport key. Accepts either the spaced form ("field hockey")
 * used by the Landing component or the slug form ("field-hockey") used in URLs.
 * @param {string|null|undefined} sportKey
 * @returns {object|null} Sport metadata object, or null when not recognized.
 */
export function getSportMeta(sportKey) {
  if (!sportKey) return null;
  if (SPORT_META[sportKey]) return SPORT_META[sportKey];
  const spaced = sportKey.replace(/-/g, " ");
  return SPORT_META[spaced] || null;
}

/**
 * Builds the per-sport landing-page meta payload consumed by usePageMeta.
 * @param {string|null|undefined} sportKey
 * @returns {{ title: string, description: string, canonical: string } | null}
 */
export function getLandingMeta(sportKey) {
  const meta = getSportMeta(sportKey);
  if (!meta) return null;
  return {
    title: meta.landingTitle,
    description: meta.landingDescription,
    canonical: `${SITE_ORIGIN}/${meta.slug}`,
  };
}

/**
 * Builds the per-sport playbooks-page meta payload consumed by usePageMeta.
 * @param {string|null|undefined} sportKey
 * @returns {{ title: string, description: string, canonical: string } | null}
 */
export function getPlaybooksMeta(sportKey) {
  const meta = getSportMeta(sportKey);
  if (!meta) return null;
  return {
    title: meta.playbooksTitle,
    description: meta.playbooksDescription,
    canonical: `${SITE_ORIGIN}/${meta.slug}/playbooks`,
  };
}

export { SPORT_META, SITE_ORIGIN };
