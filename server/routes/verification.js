import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { generateCode, sendVerificationEmail } from "../lib/email.js";

const router = Router();
const CODE_EXPIRY_MINUTES = 10;

/**
 * POST /verification/send
 * Sends (or re-sends) a verification code to the authenticated user's email.
 */
router.post("/send", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, email_verified_at FROM users WHERE id = $1",
      [req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const user = rows[0];
    if (user.email_verified_at) {
      return res.status(400).json({ error: "Email already verified" });
    }

    // Rate-limit: max 1 code per 60 seconds
    const recent = await pool.query(
      `SELECT id FROM email_verification_codes
       WHERE user_id = $1 AND created_at > now() - interval '60 seconds'
       LIMIT 1`,
      [req.userId]
    );
    if (recent.rows.length) {
      return res.status(429).json({ error: "Please wait before requesting a new code" });
    }

    const code = generateCode();

    // Invalidate old unused codes
    await pool.query(
      `UPDATE email_verification_codes
       SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [req.userId]
    );

    // Insert new code
    await pool.query(
      `INSERT INTO email_verification_codes (user_id, email, code, expires_at)
       VALUES ($1, $2, $3, now() + interval '${CODE_EXPIRY_MINUTES} minutes')`,
      [req.userId, user.email, code]
    );

    await sendVerificationEmail(user.email, code, user.name);

    res.json({ ok: true, message: "Verification code sent" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /verification/verify
 * Verifies the code and marks the user's email as verified.
 */
router.post("/verify", requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) {
      return res.status(400).json({ error: "Verification code is required" });
    }

    // Find valid, unused code
    const { rows } = await pool.query(
      `SELECT id, email FROM email_verification_codes
       WHERE user_id = $1 AND code = $2 AND used_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.userId, code.trim()]
    );

    if (!rows.length) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    // Mark code as used
    await pool.query(
      "UPDATE email_verification_codes SET used_at = now() WHERE id = $1",
      [rows[0].id]
    );

    // Mark user as verified
    await pool.query(
      "UPDATE users SET email_verified_at = now() WHERE id = $1",
      [req.userId]
    );

    res.json({ ok: true, verified: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /verification/status
 * Check if the current user's email is verified.
 */
router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT email_verified_at FROM users WHERE id = $1",
      [req.userId]
    );
    res.json({ verified: Boolean(rows[0]?.email_verified_at) });
  } catch (err) {
    next(err);
  }
});

export default router;
