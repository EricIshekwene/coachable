/* eslint-disable no-console */
/**
 * READ-ONLY recon of spam user accounts.
 * Counts matching rows, surfaces email domains, and reports
 * how much cross-table data they have. Does NOT delete anything.
 */
import pg from "pg";

const SPAM_NAME = "🔥5.000TL🔥Bonus🔥For🔥You🔥https://bit.ly/3RluJej 🔥";

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_PUBLIC_URL or DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const totalUsers = await client.query("SELECT COUNT(*)::int AS c FROM users");
  console.log("Total users in DB:", totalUsers.rows[0].c);

  const exact = await client.query(
    "SELECT COUNT(*)::int AS c FROM users WHERE name = $1",
    [SPAM_NAME]
  );
  console.log("Users with EXACT spam name:", exact.rows[0].c);

  const fuzzy = await client.query(
    "SELECT COUNT(*)::int AS c FROM users WHERE name ILIKE '%5.000TL%' OR name ILIKE '%bit.ly/3RluJej%' OR name ILIKE '%🔥%Bonus%'"
  );
  console.log("Users matching fuzzy spam pattern:", fuzzy.rows[0].c);

  const domains = await client.query(`
    SELECT split_part(email, '@', 2) AS domain, COUNT(*)::int AS c
    FROM users
    WHERE name = $1
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 30
  `, [SPAM_NAME]);
  console.log("\nEmail domains used by spam users:");
  for (const r of domains.rows) console.log(`  ${r.c.toString().padStart(7)}  ${r.domain}`);

  const sample = await client.query(
    "SELECT id, email, name, created_at FROM users WHERE name = $1 ORDER BY created_at ASC LIMIT 5",
    [SPAM_NAME]
  );
  console.log("\nFirst 5 spam users (oldest):");
  for (const r of sample.rows) console.log(`  ${r.created_at.toISOString()}  ${r.email}`);

  const recent = await client.query(
    "SELECT id, email, name, created_at FROM users WHERE name = $1 ORDER BY created_at DESC LIMIT 5"
  , [SPAM_NAME]);
  console.log("\nLast 5 spam users (newest):");
  for (const r of recent.rows) console.log(`  ${r.created_at.toISOString()}  ${r.email}`);

  // Check what cross-table footprint these users have
  const probes = [
    ["email_verification_codes", "user_id"],
    ["user_preferences", "user_id"],
    ["teams", "owner_user_id"],
    ["team_members", "user_id"],
    ["team_invites", "invited_by_user_id"],
    ["plays", "created_by_user_id"],
    ["user_play_assignments", "user_id"],
    ["user_play_views", "user_id"],
    ["error_reports", "user_id"],
    ["user_issues", "user_id"],
    ["notifications", "user_id"],
  ];
  console.log("\nCross-table row counts for spam users:");
  for (const [table, col] of probes) {
    try {
      const q = await client.query(
        `SELECT COUNT(*)::int AS c FROM ${table} WHERE ${col} IN (SELECT id FROM users WHERE name = $1)`,
        [SPAM_NAME]
      );
      console.log(`  ${table}.${col}:`.padEnd(48), q.rows[0].c);
    } catch (e) {
      console.log(`  ${table}.${col}: (skipped — ${e.message.split("\n")[0]})`);
    }
  }
} finally {
  await client.end();
}
