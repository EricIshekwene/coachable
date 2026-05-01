/**
 * Canonical list of sports supported by the platform.
 * Each entry drives automatic creation of a sport folder and page section on server startup.
 * "Blank" is intentionally excluded — it is a field type, not a sport.
 *
 * To add a new sport:
 *   1. Add an entry here (backend sync).
 *   2. Add the name to SUPPORTED_FIELD_TYPES in src/features/slate/hooks/useAdvancedSettings.js (frontend).
 *   3. Restart the server — the folder and page section are auto-created.
 */
export const SPORT_CONFIGS = [
  { name: "Rugby",           pageKey: "rugby" },
  { name: "Football",        pageKey: "football" },
  { name: "Soccer",          pageKey: "soccer" },
  { name: "Lacrosse",        pageKey: "lacrosse" },
  { name: "Womens Lacrosse", pageKey: "womens_lacrosse" },
  { name: "Basketball",      pageKey: "basketball" },
  { name: "Field Hockey",    pageKey: "field_hockey" },
  { name: "Ice Hockey",      pageKey: "ice_hockey" },
];
