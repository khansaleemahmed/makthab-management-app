// QA-owned test harness config. See server/tests/.
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  maxWorkers: 1, // integration tests share one SQLite test DB
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 30000, // Puppeteer PDF routes can be slow on first launch
};
