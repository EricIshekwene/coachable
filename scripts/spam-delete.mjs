/* eslint-disable no-console */
/**
 * Deletes spam users created during the burst window of 2026-05-27.
 * Wraps in a transaction; aborts if pre/post counts look wrong.
 * Cascades clean up email_verification_codes and user_preferences via ON DELETE CASCADE.
 */
import pg from "pg";

const START = "2026-05-27 20:30:00+00";
const END   = "2026-05-27 21:50:00+00";
const EXPECTED_MIN = 70000;
const EXPECTED_MAX = 71000;

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query("BEGIN");

  const beforeAll = await client.query("SELECT COUNT(*)::int AS c FROM users");
  const beforeWindow = await client.query(
    "SELECT COUNT(*)::int AS c FROM users WHERE created_at >= $1 AND created_at <= $2",
    [START, END]
  );
  console.log("Before — total users:", beforeAll.rows[0].c, "| in window:", beforeWindow.rows[0].c);

  if (beforeWindow.rows[0].c < EXPECTED_MIN || beforeWindow.rows[0].c > EXPECTED_MAX) {
    console.error(`Aborting: window count ${beforeWindow.rows[0].c} outside expected [${EXPECTED_MIN}, ${EXPECTED_MAX}]`);
    await client.query("ROLLBACK");
    process.exit(1);
  }

  const del = await client.query(
    "DELETE FROM users WHERE created_at >= $1 AND created_at <= $2",
    [START, END]
  );
  console.log("Deleted rows from users:", del.rowCount);

  const afterAll = await client.query("SELECT COUNT(*)::int AS c FROM users");
  const afterWindow = await client.query(
    "SELECT COUNT(*)::int AS c FROM users WHERE created_at >= $1 AND created_at <= $2",
    [START, END]
  );
  console.log("After  — total users:", afterAll.rows[0].c, "| in window:", afterWindow.rows[0].c);

  if (afterWindow.rows[0].c !== 0) {
    console.error("Aborting: window still has rows after delete");
    await client.query("ROLLBACK");
    process.exit(1);
  }

  await client.query("COMMIT");
  console.log("\nCOMMITTED.");
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("ROLLBACK due to:", e);
  process.exit(1);
} finally {
  await client.end();
}
