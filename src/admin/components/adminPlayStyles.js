/**
 * adminPlayStyles.js
 *
 * Shared inline-style objects for the admin plays manager surfaces (play cards,
 * folder rows, section rows, pop-over menus). These map onto the admin design
 * tokens (`--adm-*`) so they respond to the admin light/dark theme switch.
 *
 * Extracted from AdminPlaysPage.jsx so the page and the extracted card/row
 * components (AdminPlayCard, AdminFolderCard, AdminSectionRow) share one source
 * of truth instead of each redefining the same token objects.
 */

/** Surface panel: card / sidebar background with a subtle border + shadow. */
export const PANEL_STYLE = {
  backgroundColor: "var(--adm-surface)",
  border: "1px solid var(--adm-border)",
  boxShadow: "var(--adm-shadow-sm)",
};

/** Recessed inset (empty-preview placeholders, thumbnails). */
export const INSET_STYLE = {
  backgroundColor: "var(--adm-surface2)",
  border: "1px solid var(--adm-border)",
};

/** Elevated pop-over / dropdown menu surface. */
export const MENU_STYLE = {
  backgroundColor: "var(--adm-surface-elevated)",
  border: "1px solid var(--adm-border2)",
  boxShadow: "var(--adm-shadow)",
};

/** Divider line inside a menu (matches the base surface border). */
export const MENU_DIVIDER_STYLE = { borderColor: "var(--adm-border)" };
