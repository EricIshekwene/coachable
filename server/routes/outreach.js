/**
 * Outreach scraper admin routes (mounted at /admin/outreach).
 *
 * Owner-only tool to scrape college athletic staff directories, filter the
 * results by sport/role, and export contact lists as CSV. Scraping runs inline
 * (no queue) since the target list is small (<50 schools). See
 * OUTREACH_SCRAPER_PLAN.md and server/lib/outreachScraper/.
 *
 * @module routes/outreach
 */

import { Router } from "express";
import pool from "../db/pool.js";
import { requireOwnerOrLegacyAdmin } from "../middleware/staffAuth.js";
import { scrapeSchool, scrapeMany } from "../lib/outreachScraper/index.js";
import { toCsv } from "../lib/outreachScraper/csv.js";

const router = Router();

// All outreach endpoints are owner-only.
router.use(requireOwnerOrLegacyAdmin);

/**
 * Persist a scrape result for one school in a transaction: replace its
 * previously-scraped rows (preserving manual rows), insert the fresh ones, and
 * update the school's last_scraped_at / last_scrape_error.
 *
 * @param {string} schoolId
 * @param {Array<{name,title,sport,roleTags,email,phone}>} staff
 * @param {string|null} [error] - scrape error to record (null clears it)
 * @returns {Promise<void>}
 */
async function persistScrape(schoolId, staff, error = null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM outreach_scraped_staff WHERE school_id = $1 AND source = 'scrape'",
      [schoolId]
    );
    for (const s of staff) {
      await client.query(
        `INSERT INTO outreach_scraped_staff
           (school_id, name, title, sport, role_tags, email, phone, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'scrape')`,
        [schoolId, s.name || null, s.title || null, s.sport, s.roleTags || [], s.email, s.phone]
      );
    }
    await client.query(
      "UPDATE outreach_schools SET last_scraped_at = now(), last_scrape_error = $2 WHERE id = $1",
      [schoolId, error]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * GET /admin/outreach/schools
 * List every seeded school with its status and scraped-staff count.
 */
router.get("/schools", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.canonical_name, s.short_name, s.athletic_domain, s.platform,
              s.staff_directory_url, s.division, s.scrapeable,
              s.last_scraped_at, s.last_scrape_error,
              COUNT(st.id)::int AS staff_count
         FROM outreach_schools s
         LEFT JOIN outreach_scraped_staff st ON st.school_id = s.id
        GROUP BY s.id
        ORDER BY s.scrapeable DESC, s.division, s.canonical_name`
    );
    res.json({ schools: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/outreach/scrape/:schoolId
 * Scrape a single school synchronously and persist the result.
 */
router.post("/scrape/:schoolId", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM outreach_schools WHERE id = $1", [
      req.params.schoolId,
    ]);
    const school = rows[0];
    if (!school) return res.status(404).json({ error: "School not found" });
    try {
      const staff = await scrapeSchool(school);
      const err = staff.length === 0 ? "No staff parsed from page" : null;
      await persistScrape(school.id, staff, err);
      res.json({ ok: true, count: staff.length, error: err });
    } catch (scrapeErr) {
      await pool.query(
        "UPDATE outreach_schools SET last_scraped_at = now(), last_scrape_error = $2 WHERE id = $1",
        [school.id, scrapeErr.message]
      );
      res.status(200).json({ ok: false, count: 0, error: scrapeErr.message });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/outreach/scrape-all
 * Scrape every scrapeable school (concurrency-capped) and persist results.
 * Returns a per-school summary; individual failures don't abort the batch.
 */
router.post("/scrape-all", async (_req, res, next) => {
  try {
    const { rows: schools } = await pool.query(
      "SELECT * FROM outreach_schools WHERE scrapeable = TRUE"
    );
    const results = await scrapeMany(schools);
    for (const r of results) {
      const err = r.ok ? (r.count === 0 ? "No staff parsed from page" : null) : r.error;
      await persistScrape(r.schoolId, r.staff, err);
    }
    const summary = results.map((r) => ({
      schoolId: r.schoolId,
      ok: r.ok && r.count > 0,
      count: r.count,
      error: r.ok ? (r.count === 0 ? "No staff parsed from page" : null) : r.error,
    }));
    res.json({ results: summary });
  } catch (err) {
    next(err);
  }
});

/**
 * Build a parameterized WHERE clause + params from the staff filter query.
 * Shared by /staff and /export.csv.
 * @param {Record<string,string>} q - req.query
 * @returns {{ where: string, params: any[] }}
 */
function buildStaffFilter(q) {
  const clauses = [];
  const params = [];
  if (q.schoolId) {
    params.push(q.schoolId);
    clauses.push(`st.school_id = $${params.length}`);
  }
  if (q.sport) {
    params.push(q.sport);
    clauses.push(`st.sport = $${params.length}`);
  }
  if (q.role) {
    const roles = String(q.role).split(",").map((r) => r.trim()).filter(Boolean);
    if (roles.length) {
      params.push(roles);
      clauses.push(`st.role_tags && $${params.length}::text[]`);
    }
  }
  if (q.hasEmail === "true") {
    clauses.push(`st.email IS NOT NULL AND st.email <> ''`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

/**
 * GET /admin/outreach/staff
 * Return filtered staff rows joined with their school name.
 * Query: schoolId, sport, role (csv), hasEmail=true.
 */
router.get("/staff", async (req, res, next) => {
  try {
    const { where, params } = buildStaffFilter(req.query);
    const { rows } = await pool.query(
      `SELECT st.id, st.school_id, sc.canonical_name AS school_name,
              st.name, st.title, st.sport, st.role_tags, st.email, st.phone, st.source
         FROM outreach_scraped_staff st
         JOIN outreach_schools sc ON sc.id = st.school_id
         ${where}
        ORDER BY sc.canonical_name, st.name`,
      params
    );
    res.json({ staff: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/outreach/staff
 * Manually add a staff row (source='manual') for any school.
 */
router.post("/staff", async (req, res, next) => {
  try {
    const { schoolId, name, title, sport, roleTags, email, phone } = req.body || {};
    if (!schoolId) return res.status(400).json({ error: "schoolId is required" });
    if (!name && !email) return res.status(400).json({ error: "name or email is required" });
    const school = await pool.query("SELECT id FROM outreach_schools WHERE id = $1", [schoolId]);
    if (!school.rows[0]) return res.status(404).json({ error: "School not found" });
    const { rows } = await pool.query(
      `INSERT INTO outreach_scraped_staff
         (school_id, name, title, sport, role_tags, email, phone, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'manual')
       RETURNING id`,
      [
        schoolId,
        name || null,
        title || null,
        sport || null,
        Array.isArray(roleTags) ? roleTags : [],
        email || null,
        phone || null,
      ]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/outreach/staff/:id
 * Remove a single staff row (scraped or manual).
 */
router.delete("/staff/:id", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM outreach_scraped_staff WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/outreach/export.csv
 * Stream filtered staff rows as a CSV download. Same filters as /staff.
 */
router.get("/export.csv", async (req, res, next) => {
  try {
    const { where, params } = buildStaffFilter(req.query);
    const { rows } = await pool.query(
      `SELECT sc.canonical_name AS school_name,
              st.name, st.title, st.sport, st.role_tags, st.email, st.phone
         FROM outreach_scraped_staff st
         JOIN outreach_schools sc ON sc.id = st.school_id
         ${where}
        ORDER BY sc.canonical_name, st.name`,
      params
    );
    const header = ["School", "Name", "Title", "Sport", "Role Tags", "Email", "Phone"];
    const body = rows.map((r) => [
      r.school_name,
      r.name,
      r.title,
      r.sport,
      (r.role_tags || []).join("; "),
      r.email,
      r.phone,
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="outreach-contacts.csv"');
    res.send(toCsv(header, body));
  } catch (err) {
    next(err);
  }
});

export default router;
