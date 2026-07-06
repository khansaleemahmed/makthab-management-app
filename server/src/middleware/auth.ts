import type { NextFunction, Request, Response } from "express";
import type { Role } from "@makthab/shared";
import { verifyAccessToken } from "../lib/jwt";
import { AppError } from "./errorHandler";

// Verify the Bearer access token and attach the payload to req.user.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "unauthorized", "Missing or malformed Authorization header");
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new AppError(401, "invalid_token", "Invalid or expired access token");
  }
}

// Restrict a route to one or more roles. Must run after requireAuth.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "unauthorized", "Authentication required");
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "forbidden", "Insufficient role for this action");
    }
    next();
  };
}
