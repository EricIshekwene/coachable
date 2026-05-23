import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** Whether a block list contains at least one question block. */
function blocksHaveQuestions(blocks) {
  return (Array.isArray(blocks) ? blocks : []).some((b) => b?.kind === "question");
}

/**
 * GET /notifications
 * List the authenticated user's notifications, newest first, with read/response state.
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.id, n.title, n.subject, n.priority, n.blocks, n.created_at,
              r.read_at, r.responded_at
         FROM notification_recipients r
         JOIN notifications n ON n.id = r.notification_id
        WHERE r.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT 100`,
      [req.userId]
    );
    res.json({
      notifications: rows.map((r) => ({
        id: r.id,
        title: r.title,
        subject: r.subject,
        priority: r.priority,
        blocks: Array.isArray(r.blocks) ? r.blocks : [],
        hasQuestions: blocksHaveQuestions(r.blocks),
        sentAt: r.created_at,
        readAt: r.read_at,
        respondedAt: r.responded_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /notifications/unread-count — number of unread notifications for the badge. */
router.get("/unread-count", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS count FROM notification_recipients WHERE user_id = $1 AND read_at IS NULL",
      [req.userId]
    );
    res.json({ count: rows[0]?.count || 0 });
  } catch (err) {
    next(err);
  }
});

/** POST /notifications/read-all — mark every unread notification as read. */
router.post("/read-all", requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE notification_recipients SET read_at = now() WHERE user_id = $1 AND read_at IS NULL",
      [req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** POST /notifications/:id/read — mark a single notification as read. */
router.post("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE notification_recipients SET read_at = COALESCE(read_at, now())
        WHERE user_id = $1 AND notification_id = $2`,
      [req.userId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Notification not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /notifications/:id/respond
 * Body: { answers: { [questionId]: value } }
 * Stores the user's answers to embedded question blocks (upsert) and marks
 * the notification read + responded.
 */
router.post("/:id/respond", requireAuth, async (req, res, next) => {
  try {
    const answers = req.body?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return res.status(400).json({ error: "answers object is required" });
    }

    // Confirm this notification was sent to the caller and has questions.
    const { rows } = await pool.query(
      `SELECT n.id, n.blocks
         FROM notification_recipients r
         JOIN notifications n ON n.id = r.notification_id
        WHERE r.user_id = $1 AND r.notification_id = $2`,
      [req.userId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Notification not found" });
    if (!blocksHaveQuestions(rows[0].blocks)) {
      return res.status(400).json({ error: "This notification has no questions to answer." });
    }

    // Keep only answers that map to a real question block id.
    const questionIds = new Set(
      rows[0].blocks.filter((b) => b?.kind === "question").map((b) => b.id)
    );
    const cleanAnswers = {};
    for (const [key, value] of Object.entries(answers)) {
      if (questionIds.has(key)) cleanAnswers[key] = value;
    }

    await pool.query(
      `INSERT INTO notification_responses (notification_id, user_id, answers)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (notification_id, user_id)
       DO UPDATE SET answers = EXCLUDED.answers, created_at = now()`,
      [req.params.id, req.userId, JSON.stringify(cleanAnswers)]
    );
    await pool.query(
      `UPDATE notification_recipients
          SET responded_at = now(), read_at = COALESCE(read_at, now())
        WHERE user_id = $1 AND notification_id = $2`,
      [req.userId, req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
