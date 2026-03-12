import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/** Sign a JWT for a user id. */
export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

/** Express middleware — attaches req.userId or returns 401. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
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
      "SELECT role FROM team_memberships WHERE team_id = $1 AND user_id = $2",
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
