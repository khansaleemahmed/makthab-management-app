/**
 * QA integration-test helpers.
 *
 * These skeletons run against the real Express app once Backend exports an app
 * factory. We try a few likely export shapes so the suite goes green as soon as
 * the server lands, without further edits:
 *   - export function createApp(): Express
 *   - export const app: Express
 *   - export default app
 * Confirm the actual shape with Backend and delete the ones that don't apply.
 */
import type { Express } from "express";

let cachedApp: Express | null = null;
let triedLoad = false;

export function loadApp(): Express | null {
  if (triedLoad) return cachedApp;
  triedLoad = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../src/app");
    const candidate =
      (typeof mod.createApp === "function" && mod.createApp()) ||
      mod.app ||
      (mod.default && (typeof mod.default === "function" ? mod.default() : mod.default));
    cachedApp = candidate ?? null;
  } catch {
    cachedApp = null;
  }
  return cachedApp;
}

/** Use `describeApi("...", fn)` so suites SKIP (not fail) until the app exists. */
export const appAvailable = () => loadApp() !== null;
export const describeApi = (name: string, fn: () => void) =>
  appAvailable() ? describe(name, fn) : describe.skip(name, fn);

// Seed credentials — CONFIRM exact values with Backend's prisma/seed.ts.
export const CREDS = {
  admin: { username: "admin", password: "admin123" },
  accountant: { username: "accountant", password: "accountant123" },
  teacher: { username: "teacher", password: "teacher123" },
};

export const API = "/api/v1";

import request from "supertest";

export async function login(username: string, password: string): Promise<string> {
  const app = loadApp();
  if (!app) throw new Error("app not available");
  const res = await request(app).post(`${API}/auth/login`).send({ username, password });
  return res.body?.data?.accessToken;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
