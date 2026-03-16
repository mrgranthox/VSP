import pino from "pino";

import { env } from "../config/env";

const logger = pino({
  name: env.APP_NAME,
  level: env.LOG_LEVEL
});

export { logger };
