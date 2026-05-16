import pg from "pg";
const { Pool } = pg;

// Connection URLs come from env vars — never hardcode credentials here.
// Set COMPARE_DB_URL_A and COMPARE_DB_URL_B before running this script,
// e.g. via `railway run` or a local .env that's gitignored.
const dbs = [
  {
    label: process.env.COMPARE_DB_LABEL_A || "DB A",
    url: process.env.COMPARE_DB_URL_A,
  },
  {
    label: process.env.COMPARE_DB_LABEL_B || "DB B",
    url: process.env.COMPARE_DB_URL_B,
  },
].filter((db) => db.url);

if (dbs.length === 0) {
  console.error("Set COMPARE_DB_URL_A and/or COMPARE_DB_URL_B to run this script.");
  process.exit(1);
}

for (const db of dbs) {
  console.log(`\n=== ${db.label} ===`);
  const pool = new Pool({ connectionString: db.url, connectionTimeoutMillis: 8000 });
  try {
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(`Tables: ${tables.rows.length}`);
    if (tables.rows.length) {
      console.log("  " + tables.rows.map((r) => r.table_name).join(", "));
    }

    if (tables.rows.some((r) => r.table_name === "users")) {
      const u = await pool.query("SELECT COUNT(*)::int AS n FROM users");
      console.log(`users count: ${u.rows[0].n}`);
    }
    if (tables.rows.some((r) => r.table_name === "plays")) {
      const p = await pool.query("SELECT COUNT(*)::int AS n FROM plays");
      console.log(`plays count: ${p.rows[0].n}`);
    }

    const size = await pool.query(
      "SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size"
    );
    console.log(`DB size: ${size.rows[0].db_size}`);

    const ver = await pool.query("SELECT version()");
    console.log(`PG version: ${ver.rows[0].version.split(" on ")[0]}`);
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  } finally {
    await pool.end();
  }
}
