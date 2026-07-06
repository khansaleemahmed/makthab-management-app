import type { AccessTokenPayload } from "../lib/jwt";

// Augment Express Request with the authenticated user set by requireAuth.
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
