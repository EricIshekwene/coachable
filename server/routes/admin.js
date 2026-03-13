import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../db/pool.js";

const router = Router();
const ADMIN_HASH = "$2b$10$VHa04rH/gcOa97BFMCM7WOvEVU5kU2KK4pfMa9A1fj.HuSO903Ri2";

// In-memory session store (resets on server restart — fine for admin)
const sessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function requireAdmin(req, res, next) {
  const sid = req.headers["x-admin-session"];
  if (!sid || !sessions.has(sid)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const session = sessions.get(sid);
  if (Date.now() > session.expiresAt) {
    sessions.delete(sid);
    return res.status(401).json({ error: "Session expired" });
  }
  next();
}

// POST /admin/login
router.post("/login", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });

  const valid = await bcrypt.compare(password, ADMIN_HASH);
  if (!valid) return res.status(401).json({ error: "Invalid password" });

  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, { expiresAt: Date.now() + SESSION_TTL_MS });
  res.json({ session: sid });
});

// POST /admin/logout
router.post("/logout", (req, res) => {
  const sid = req.headers["x-admin-session"];
  if (sid) sessions.delete(sid);
  res.json({ ok: true });
});

// GET /admin/users — list all users
router.get("/users", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.email_verified_at, u.onboarded_at, u.created_at,
              tm.role, t.name AS team_name
       FROM users u
       LEFT JOIN team_memberships tm ON tm.user_id = u.id
       LEFT JOIN teams t ON t.id = tm.team_id
       ORDER BY u.created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/users/:id — delete a single user and their owned teams
router.delete("/users/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    // Delete teams owned by this user (cascades to memberships, invites, plays, etc.)
    await pool.query("DELETE FROM teams WHERE owner_user_id = $1", [id]);
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/users — delete ALL users
router.delete("/users", requireAdmin, async (_req, res, next) => {
  try {
    // Delete all teams first (cascades to memberships, invites, plays, etc.)
    await pool.query("DELETE FROM teams");
    await pool.query("DELETE FROM users");
    res.json({ ok: true, message: "All users deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
