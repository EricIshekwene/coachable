import jwt from "jsonwebtoken";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable must be set in production.");
}
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "coachable_session";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Sign a JWT for a user id. */
export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

/** Set the session cookie on the response. */
export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

/** Clear the session cookie. */
export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
}

/** Express middleware — attaches req.userId or returns 401. */
export function requireAuth(req, res, next) {
  // Try Bearer header first, then fall back to session cookie
  let token = null;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7);
  } else if (req.cookies?.[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware factory — checks the caller has one of the allowed roles
 * for the team specified by :teamId param.
 */
export function requireTeamRole(...allowedRoles) {
  return async (req, res, next) => {
    const { teamId } = req.params;
    if (!teamId) return res.status(400).json({ error: "Missing teamId" });

    // Import pool lazily to avoid circular deps
    const { default: pool } = await import("../db/pool.js");
    const { rows } = await pool.query(
      `SELECT tm.role FROM team_memberships tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.team_id = $1 AND tm.user_id = $2 AND t.deleted_at IS NULL`,
      [teamId, req.userId]
    );

    if (!rows.length) {
      return res.status(403).json({ error: "Not a member of this team" });
    }

    const role = rows[0].role;
    if (allowedRoles.length && !allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    req.teamRole = role;
    next();
  };
}
