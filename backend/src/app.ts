import "express-async-errors";

import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { error as errorResponse } from "./lib/response";
import { errorHandler } from "./middleware/errorHandler";
import { httpMetrics } from "./middleware/httpMetrics";
import { requestId } from "./middleware/requestId";
import { requestLogging } from "./middleware/requestLogging";
import { routes } from "./routes";

const allowedOrigins = env.CORS_ALLOWED_ORIGINS
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    imgSrc: [
      "'self'",
      ...(env.CDN_BASE_URL ? [env.CDN_BASE_URL] : []),
    ],
    connectSrc: ["'self'"],
  },
} as const;

const app = express();

app.disable("x-powered-by");
app.use(requestId);
app.use(httpMetrics);
app.use(requestLogging);
app.use(
  helmet({
    contentSecurityPolicy,
    hsts: {
      maxAge: 63_072_000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    maxAge: env.CORS_MAX_AGE_SECONDS,
  }),
);
app.use("/api/v1/billing/webhooks/provider", express.raw({ type: "*/*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", routes);

app.use((req: Request, res: Response) => {
  const requestIdValue =
    typeof req.headers["x-request-id"] === "string"
      ? req.headers["x-request-id"]
      : undefined;

  res.status(404).json(
    errorResponse("NOT_FOUND", "Route Not Found", null, {
      requestId: requestIdValue,
    }),
  );
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

export { app };
