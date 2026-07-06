import { createApp } from "./app";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { ensureDataDirs } from "./lib/paths";

ensureDataDirs();
const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`Makthab API listening on http://localhost:${env.port}`);
  logger.info(`Health check: http://localhost:${env.port}/health`);
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
