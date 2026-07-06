import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@makthab/shared";
import { env } from "./env";

// Claims carried in the access token. staffId identifies the actor (Staff.id)
// stamped on write operations; role drives access control.
export interface AccessTokenPayload {
  sub: number; // User.id
  staffId: number;
  username: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: number; // User.id
  tokenType: "refresh";
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtAccessTtl,
  } as SignOptions);
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ sub: userId, tokenType: "refresh" } as RefreshTokenPayload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshTtl,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtSecret) as unknown as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as unknown as RefreshTokenPayload;
}
