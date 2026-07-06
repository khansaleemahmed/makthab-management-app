/**
 * QA test-DB reset helper. Creates a fresh, seeded SQLite DB isolated from dev.
 * Run from server/ dir:  node tests/reset-test-db.mjs
 *
 * Uses a separate DATABASE_URL so the dev DB (data/madrasa.db) is never touched.
 * Requires that Backend has created at least one prisma migration (task #2).
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEST_DB_URL = process.env.TEST_DATABASE_URL || "file:./test.db";

const env = { ...process.env, DATABASE_URL: TEST_DB_URL };
const sh = (cmd) => {
  console.log(`$ ${cmd}   (DATABASE_URL=${TEST_DB_URL})`);
  execSync(cmd, { cwd: serverDir, env, stdio: "inherit" });
};

try {
  // Recreate schema from committed migrations, then seed.
  sh("npx prisma migrate reset --force --skip-generate");
  console.log("\nTest DB ready. Run: DATABASE_URL=" + TEST_DB_URL + " npm test");
} catch (e) {
  console.error("Test DB reset failed:", e.message);
  process.exit(1);
}
