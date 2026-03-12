/**
 * Quick script to reset a user's password in the database.
 * Usage: node server/reset-password.js <email> <new-password>
 */
import pg from "pg";
import bcrypt from "bcrypt";

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("Usage: node server/reset-password.js <email> <new-password>");
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters");
  process.exit(1);
}

const DATABASE_URL =
  "postgresql://postgres:K9mXwPr4hN7vTsJq2YdF8eRbL5cA3gWx@crossover.proxy.rlwy.net:39355/railway";

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  const hash = await bcrypt.hash(newPassword, 10);
  const { rowCount } = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE email = $2",
    [hash, email.trim().toLowerCase()]
  );

  if (rowCount === 0) {
    console.error(`No user found with email: ${email}`);
  } else {
    console.log(`Password reset successfully for ${email}`);
  }
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await pool.end();
}
