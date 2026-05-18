import app from "./app.js";
import { logger } from "./lib/logger.js";
import { runMigrations } from "./lib/migrate.js";

const port = Number(process.env.PORT ?? 22729);

app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "ALI API Server running");
  runMigrations().catch(() => {});
});
