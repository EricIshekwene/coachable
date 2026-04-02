import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * POST /user-issues — submit a reported issue (beta testers only).
 * Authenticated users who have is_beta_tester=true can submit issues.
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "title is required" });
    if (!description?.trim()) return res.status(400).json({ error: "description is required" });
    if (title.trim().length > 200) return res.status(400).json({ error: "title must be 200 characters or fewer" });
    if (description.trim().length > 5000) return res.status(400).json({ error: "description must be 5000 characters or fewer" });

    // Verify user is a beta tester
    const { rows: userRows } = await pool.query(
      "SELECT id, name, email, is_beta_tester FROM users WHERE id = $1",
      [req.userId]
    );
    if (!userRows.length) return res.status(404).json({ error: "User not found" });
    const user = userRows[0];
    if (!user.is_beta_tester) return res.status(403).json({ error: "Beta tester access required" });

    const { rows } = await pool.query(
      `INSERT INTO user_issues (user_id, user_name, user_email, title, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, status, created_at`,
      [user.id, user.name, user.email, title.trim(), description.trim()]
    );
    res.status(201).json({ issue: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
