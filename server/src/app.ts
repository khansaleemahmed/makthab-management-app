import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./lib/env";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

// Express app factory. Kept side-effect free so tests can create isolated apps.
export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ data: { status: "ok", time: new Date().toISOString() } });
  });

  app.use("/api/v1", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
