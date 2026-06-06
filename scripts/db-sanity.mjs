/* eslint-disable no-console */
/**
 * READ-ONLY post-cleanup sanity check. Walks the major tables and flags
 * orphaned rows, weird name/email patterns, or suspicious row counts so
 * we can confirm the spam wipe didn't leave debris.
 */
import pg from "pg";

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

async function q(sql, params = []) {
  const r = await client.query(sql, params);
  return r.rows;
}

async function safeQ(sql, params = []) {
  try { return await q(sql, params); }
  catch (e) { return [{ __err: e.message.split("\n")[0] }]; }
}

function head(title) { console.log(`\n=== ${title} ===`); }

try {
  head("Table row counts (whole DB)");
  const tables = await q(`
    SELECT relname AS t, n_live_tup AS rows
    FROM pg_stat_user_tables
    WHERE n_live_tup > 0
    ORDER BY n_live_tup DESC
  `);
  for (const r of tables) console.log(`  ${r.rows.toString().padStart(8)}  ${r.t}`);

  head("Users — overview");
  const u1 = await q(`SELECT COUNT(*)::int AS c FROM users`);
  console.log("  total users:", u1[0].c);
  const u2 = await q(`SELECT COUNT(*)::int AS c FROM users WHERE email_verified_at IS NOT NULL`);
  console.log("  email_verified:", u2[0].c);
  const u3 = await q(`SELECT COUNT(*)::int AS c FROM users WHERE onboarded_at IS NOT NULL`);
  console.log("  onboarded:", u3[0].c);
  const u4 = await q(`
    SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS c
    FROM users GROUP BY 1 ORDER BY 1 DESC LIMIT 10
  `);
  console.log("  signups by day (last 10):");
  for (const r of u4) console.log(`    ${r.day.toISOString().slice(0,10)}: ${r.c}`);

  head("Suspicious-looking user names still in DB");
  const sus = await q(`
    SELECT id, email, name, created_at FROM users
    WHERE name ~* '(bit\\.ly|5\\.000TL|bonus|1win|casino|bahis|https?://|www\\.)'
       OR length(name) > 60
       OR (LENGTH(name) - LENGTH(REPLACE(name, '🔥', ''))) / LENGTH('🔥') >= 2
    ORDER BY created_at DESC LIMIT 40
  `);
  if (sus.length === 0) console.log("  (none)");
  for (const r of sus) console.log(`  ${r.created_at.toISOString()}  ${r.email}  name="${r.name}"`);

  head("Suspicious email domains still in DB");
  const dom = await q(`
    SELECT split_part(email,'@',2) AS d, COUNT(*)::int AS c
    FROM users
    WHERE split_part(email,'@',2) ~* '(1win|\\.con$|\\.cok$|\\.coma$|gmail\\..+\\..+|hotmail\\..+\\..+|outlook\\..+\\..+|xn--)'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 30
  `);
  if (dom.length === 0) console.log("  (none)");
  for (const r of dom) console.log(`  ${r.c.toString().padStart(5)}  ${r.d}`);

  head("Top 20 most common email domains overall");
  const topdom = await q(`
    SELECT split_part(email,'@',2) AS d, COUNT(*)::int AS c
    FROM users GROUP BY 1 ORDER BY 2 DESC LIMIT 20
  `);
  for (const r of topdom) console.log(`  ${r.c.toString().padStart(5)}  ${r.d}`);

  head("Orphan checks (FK CASCADE should keep these at 0)");
  const orphans = [
    ["email_verification_codes", "user_id"],
    ["user_preferences", "user_id"],
  ];
  for (const [t, c] of orphans) {
    const r = await safeQ(`SELECT COUNT(*)::int AS c FROM ${t} WHERE ${c} NOT IN (SELECT id FROM users)`);
    console.log(`  ${t}.${c} orphans:`, r[0].c ?? r[0].__err);
  }

  head("Pending email_verification_codes vs total users");
  const evc = await q(`SELECT COUNT(*)::int AS c FROM email_verification_codes`);
  console.log("  total codes rows:", evc[0].c);
  const evcU = await q(`SELECT COUNT(DISTINCT user_id)::int AS c FROM email_verification_codes`);
  console.log("  distinct users with codes:", evcU[0].c);

  head("Teams / plays / shared links — should be untouched");
  for (const t of ["teams", "plays", "shared_play_links", "shared_folder_links", "team_invites"]) {
    const r = await safeQ(`SELECT COUNT(*)::int AS c FROM ${t}`);
    console.log(`  ${t}:`, r[0].c ?? r[0].__err);
  }

  head("Recent signups (last 20 across all time)");
  const recent = await q(`
    SELECT email, name, created_at, email_verified_at IS NOT NULL AS verified
    FROM users ORDER BY created_at DESC LIMIT 20
  `);
  for (const r of recent) console.log(`  ${r.created_at.toISOString()}  v=${r.verified}  ${r.email}  name="${r.name}"`);

} finally {
  await client.end();
}
