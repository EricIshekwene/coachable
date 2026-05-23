/**
 * Pure helpers for in-app notification audience targeting and response
 * aggregation. Kept dependency-free (no pool/db) so they can be unit tested
 * directly and reused by the admin notification routes.
 */

/**
 * Build the SQL WHERE clause + params for a notification audience filter.
 * The caller composes this into a `SELECT ... FROM users u WHERE <where>`.
 *
 * @param {{mode?: string, sport?: string, playFilter?: string, signupFrom?: string, signupTo?: string}} audience
 * @returns {{ where: string, params: any[] }}
 */
export function buildNotifAudienceSql(audience = {}) {
  const { mode = "all", sport = "", playFilter = "any", signupFrom = "", signupTo = "" } = audience || {};
  const conditions = ["u.email IS NOT NULL", "u.email != ''"];
  const params = [];

  const teamJoin =
    "FROM team_memberships tm JOIN teams t ON t.id = tm.team_id AND (t.deleted_at IS NULL OR t.deleted_at > now())";
  const activeExpr =
    "EXISTS (SELECT 1 FROM plays p WHERE p.created_by_user_id = u.id AND p.updated_at > now() - interval '30 days')";
  const coachExpr =
    `EXISTS (SELECT 1 ${teamJoin} WHERE tm.user_id = u.id AND tm.role IN ('owner','coach','assistant_coach'))`;
  const playerExpr =
    `EXISTS (SELECT 1 ${teamJoin} WHERE tm.user_id = u.id AND tm.role = 'player')`;

  if (mode === "active") conditions.push(activeExpr);
  else if (mode === "inactive") conditions.push(`NOT ${activeExpr}`);
  else if (mode === "coaches") conditions.push(coachExpr);
  else if (mode === "players") conditions.push(playerExpr);

  if (sport) {
    params.push(sport);
    conditions.push(`EXISTS (SELECT 1 ${teamJoin} WHERE tm.user_id = u.id AND t.sport ILIKE $${params.length})`);
  }

  if (playFilter === "has_plays") {
    conditions.push("EXISTS (SELECT 1 FROM plays p WHERE p.created_by_user_id = u.id)");
  } else if (playFilter === "no_plays") {
    conditions.push("NOT EXISTS (SELECT 1 FROM plays p WHERE p.created_by_user_id = u.id)");
  }

  if (signupFrom) { params.push(signupFrom); conditions.push(`u.created_at >= $${params.length}`); }
  if (signupTo) { params.push(signupTo); conditions.push(`u.created_at <= ($${params.length}::date + interval '1 day')`); }

  return { where: conditions.join(" AND "), params };
}

/**
 * Human-readable label for an audience filter (mirrors the composer chips).
 * @param {object} audience
 * @returns {string}
 */
export function buildNotifAudienceLabel(audience = {}) {
  const { mode = "all", sport = "", playFilter = "any", signupFrom = "", signupTo = "" } = audience || {};
  const modeLabel = {
    all: "All users", active: "Active users", inactive: "Inactive users",
    coaches: "Coaches", players: "Players",
  }[mode] || "All users";
  const parts = [modeLabel];
  if (sport) parts.push(sport);
  if (playFilter === "has_plays") parts.push("has plays");
  else if (playFilter === "no_plays") parts.push("no plays");
  if (signupFrom || signupTo) parts.push(`joined ${signupFrom || "…"}–${signupTo || "…"}`);
  return parts.join(" · ");
}

/**
 * Aggregate raw response rows into per-question summaries for the admin
 * detail view. Choice questions return a `distribution`, rating/scale add an
 * `average`, and free-text questions return recent `samples`.
 *
 * @param {Array} blocks notification block list (text + question blocks)
 * @param {Array<{answers: object}>} responseRows
 * @returns {Array<object>}
 */
export function aggregateNotifResponses(blocks, responseRows) {
  const questions = (Array.isArray(blocks) ? blocks : []).filter((b) => b?.kind === "question");
  const rows = Array.isArray(responseRows) ? responseRows : [];
  const CHOICE = new Set(["multiple", "checkboxes", "dropdown", "yes_no"]);
  const RATING = new Set(["scale", "rating"]);

  return questions.map((q) => {
    const answers = rows
      .map((r) => (r.answers || {})[q.id])
      .filter((v) => v !== undefined && v !== null && v !== "");

    if (CHOICE.has(q.type)) {
      const options = q.type === "yes_no" ? ["Yes", "No"] : (q.options || []);
      const counts = {};
      for (const o of options) counts[o] = 0;
      for (const a of answers) {
        for (const v of (Array.isArray(a) ? a : [a])) counts[v] = (counts[v] || 0) + 1;
      }
      return {
        id: q.id, label: q.label || "Untitled question", type: q.type,
        distribution: Object.entries(counts).map(([name, value]) => ({ name, value })),
      };
    }

    if (RATING.has(q.type)) {
      const nums = answers.map(Number).filter((n) => !Number.isNaN(n));
      const max = q.type === "rating" ? 5 : (q.scaleMax || 5);
      const counts = {};
      for (let i = 1; i <= max; i++) counts[i] = 0;
      for (const n of nums) counts[n] = (counts[n] || 0) + 1;
      const average = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
      const suffix = q.type === "rating" ? "★" : "";
      return {
        id: q.id, label: q.label || "Untitled question", type: q.type,
        average: Number(average.toFixed(2)),
        distribution: Object.entries(counts).map(([name, value]) => ({ name: name + suffix, value })),
      };
    }

    return {
      id: q.id, label: q.label || "Untitled question", type: q.type,
      samples: answers.slice(-30).reverse().map(String),
    };
  });
}
