import type { NextFunction, Request, Response } from "express";

// Minimal structural type for anything with a Zod-style `.parse`. Using this
// instead of `ZodTypeAny` avoids cross-package zod type-identity conflicts
// (the schemas come from the pre-compiled @makthab/shared package).
interface Parser<T = unknown> {
  parse: (data: unknown) => T;
}

// Validate + coerce request body; replaces req.body with the parsed value.
// Zod errors are caught by the central error handler (400).
export const validateBody =
  (schema: Parser) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };

// Validate + coerce query params. Parsed result is stashed on res.locals.query
// (req.query is read-only in Express 5-style typings for some setups).
export const validateQuery =
  (schema: Parser) => (req: Request, res: Response, next: NextFunction) => {
    res.locals.query = schema.parse(req.query);
    next();
  };
