import pg from "pg";

const connectionString = process.env.DATABASE_URL;

function getDatabaseHost() {
  if (process.env.PGHOST) return process.env.PGHOST;

  try {
    return connectionString ? new URL(connectionString).hostname : "";
  } catch {
    return "";
  }
}

function resolveSslConfig() {
  if (process.env.DATABASE_SSL === "false" || process.env.PGSSLMODE === "disable") {
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const host = getDatabaseHost();
  const allowSelfSigned =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false" ||
    process.env.PGSSLMODE === "no-verify" ||
    host.endsWith(".railway.internal");

  return { rejectUnauthorized: !allowSelfSigned };
}

const pool = new pg.Pool({
  connectionString,
  ssl: resolveSslConfig(),
});

export default pool;
