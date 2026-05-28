/* eslint-disable no-console */
/**
 * READ-ONLY. Lists any users in the spam window whose name does NOT match the
 * spam pattern, so we can confirm a time-window DELETE won't wipe legit accounts.
 */
import pg from "pg";

const SPAM_NAME = "🔥5.000TL🔥Bonus🔥For🔥You🔥https://bit.ly/3RluJej 🔥";
const START = "2026-05-27 20:30:00+00";
const END   = "2026-05-27 21:50:00+00";

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const total = await client.query(
    "SELECT COUNT(*)::int AS c FROM users WHERE created_at >= $1 AND created_at <= $2",
    [START, END]
  );
  console.log(`Users created in window [${START} .. ${END}]:`, total.rows[0].c);

  const nonSpam = await client.query(
    `SELECT id, email, name, created_at
     FROM users
     WHERE created_at >= $1 AND created_at <= $2
       AND name <> $3
     ORDER BY created_at ASC`,
    [START, END, SPAM_NAME]
  );
  console.log(`\nNon-spam-name users in window: ${nonSpam.rowCount}`);
  for (const r of nonSpam.rows) {
    console.log(`  ${r.created_at.toISOString()}  ${r.email}  name="${r.name}"`);
  }
} finally {
  await client.end();
}
