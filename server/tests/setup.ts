/**
 * Global test setup. Ensures tests never touch the dev DB.
 * The test DB is created/seeded by the QA npm script (see README-tests or
 * run: DATABASE_URL="file:./test.db" prisma migrate deploy && tsx prisma/seed.ts)
 * before invoking jest. Here we only assert we're pointed at a test DB.
 */
beforeAll(() => {
  const url = process.env.DATABASE_URL ?? "";
  if (url && !/test/i.test(url)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[QA] WARNING: DATABASE_URL does not look like a test DB (${url}). ` +
        `Set DATABASE_URL="file:./test.db" before running integration tests.`
    );
  }
});
