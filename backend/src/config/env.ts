import { z } from "zod";

import { loadEnvFiles } from "./load-env";

loadEnvFiles();

const BooleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const toInt = (value: string, key: string): number => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a valid integer`);
  }

  return parsed;
};

const decodeBase64 = (value: string, key: string): Buffer => {
  try {
    return Buffer.from(value, "base64");
  } catch {
    throw new Error(`${key} must be valid base64`);
  }
};

const EnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_NAME: z.string().min(1).default("vsp-backend"),
    PORT: z.string().default("3000").transform((value) => toInt(value, "PORT")),
    APP_BASE_URL: z.string().url(),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_CACHE_DB: z.string().default("0").transform((value) => toInt(value, "REDIS_CACHE_DB")),
    REDIS_QUEUE_DB: z.string().default("1").transform((value) => toInt(value, "REDIS_QUEUE_DB")),
    REDIS_KEY_PREFIX: z.string().min(1).default("vsp:"),
    EVENT_BUS_MODE: z.enum(["inline", "queue"]).default("inline"),
    BACKGROUND_WORKERS_ENABLED: BooleanString.default("false"),
    PUSH_STALE_TOKEN_DAYS: z.string().default("30").transform((value) => toInt(value, "PUSH_STALE_TOKEN_DAYS")),
    WS_GATEWAY_PORT: z.string().default("3002").transform((value) => toInt(value, "WS_GATEWAY_PORT")),
    WS_GATEWAY_PATH: z.string().min(1).default("/ws"),
    WS_AUTH_TIMEOUT_MS: z.string().default("10000").transform((value) => toInt(value, "WS_AUTH_TIMEOUT_MS")),
    WS_PRESENCE_TTL_SECONDS: z.string().default("45").transform((value) => toInt(value, "WS_PRESENCE_TTL_SECONDS")),
    WS_MAX_CONNECTIONS_PER_USER: z.string().default("5").transform((value) => toInt(value, "WS_MAX_CONNECTIONS_PER_USER")),
    WS_HEARTBEAT_INTERVAL_MS: z.string().default("30000").transform((value) => toInt(value, "WS_HEARTBEAT_INTERVAL_MS")),
    WS_MAX_PAYLOAD_BYTES: z.string().default("65536").transform((value) => toInt(value, "WS_MAX_PAYLOAD_BYTES")),
    WS_MESSAGE_RATE_LIMIT_MAX: z.string().default("30").transform((value) => toInt(value, "WS_MESSAGE_RATE_LIMIT_MAX")),
    WS_MESSAGE_RATE_LIMIT_WINDOW_MS: z.string().default("60000").transform((value) => toInt(value, "WS_MESSAGE_RATE_LIMIT_WINDOW_MS")),
    WS_REDIS_CHANNEL: z.string().min(1).default("ws:events"),
    RATE_LIMIT_ENABLED: BooleanString.default("true"),
    CORS_ALLOWED_ORIGINS: z.string().min(1),
    CORS_MAX_AGE_SECONDS: z.string().default("86400").transform((value) => toInt(value, "CORS_MAX_AGE_SECONDS")),
    CDN_BASE_URL: z.string().url(),
    STORAGE_LOCAL_ROOT: z.string().min(1).default(".tmp/storage"),
    STORAGE_PENDING_MEDIA_TTL_SECONDS: z.string().default("1800").transform((value) => toInt(value, "STORAGE_PENDING_MEDIA_TTL_SECONDS")),
    STORAGE_PRIVATE_READ_URL_TTL_SECONDS: z
      .string()
      .default("3600")
      .transform((value) => toInt(value, "STORAGE_PRIVATE_READ_URL_TTL_SECONDS")),
    STORAGE_SIGNING_SECRET: z.string().min(1),
    MEDIA_PROCESS_INLINE: BooleanString.default("false"),
    JWT_PRIVATE_KEY_BASE64: z.string().min(1),
    JWT_PUBLIC_KEY_BASE64: z.string().min(1),
    JWT_PUBLIC_KEY_BASE64_PREVIOUS: z.string().optional(),
    JWT_ACCESS_TOKEN_TTL_SECONDS: z.string().default("900").transform((value) => toInt(value, "JWT_ACCESS_TOKEN_TTL_SECONDS")),
    JWT_REFRESH_TOKEN_TTL_SECONDS: z
      .string()
      .default("2592000")
      .transform((value) => toInt(value, "JWT_REFRESH_TOKEN_TTL_SECONDS")),
    JWT_ISSUER: z.string().min(1).default("vsp-backend"),
    JWT_AUDIENCE: z.string().min(1).default("vsp-api"),
    MFA_ENCRYPTION_KEY_BASE64: z.string().min(1),
    MFA_ENCRYPTION_KEY_BASE64_PREVIOUS: z.string().optional(),
    MFA_ISSUER: z.string().min(1).default("Vocational Services Platform"),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
    TWILIO_VERIFY_MOCK_MODE: BooleanString.default("true"),
    TWILIO_VERIFY_CODE_TTL_SECONDS: z.string().default("300").transform((value) => toInt(value, "TWILIO_VERIFY_CODE_TTL_SECONDS")),
    TYPESENSE_HOST: z.string().optional(),
    ALERTS_ENABLED: BooleanString.default("false"),
    ALERT_WEBHOOK_URL: z.string().url().optional(),
    ALERT_WEBHOOK_BEARER_TOKEN: z.string().optional(),
    ALERT_WEBHOOK_TIMEOUT_MS: z.string().default("3000").transform((value) => toInt(value, "ALERT_WEBHOOK_TIMEOUT_MS")),
    TYPESENSE_PORT: z.string().default("8108").transform((value) => toInt(value, "TYPESENSE_PORT")),
    TYPESENSE_PROTOCOL: z.enum(["http", "https"]).default("http"),
    TYPESENSE_API_KEY: z.string().optional(),
    TYPESENSE_CONNECTION_TIMEOUT_SECONDS: z
      .string()
      .default("2")
      .transform((value) => toInt(value, "TYPESENSE_CONNECTION_TIMEOUT_SECONDS")),
    TYPESENSE_WORKERS_COLLECTION: z.string().min(1).default("workers"),
    OPENAI_EMBEDDING_MODEL: z.string().min(1).default("text-embedding-3-small"),
    TYPESENSE_INDEXING_BATCH_SIZE: z.string().default("500").transform((value) => toInt(value, "TYPESENSE_INDEXING_BATCH_SIZE")),
    INTERNAL_API_KEY: z.string().optional(),
    TRACING_ENABLED: BooleanString.default("false"),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    OTEL_CONSOLE_EXPORTER_ENABLED: BooleanString.default("false"),
    OTEL_TRACES_SAMPLER_RATIO: z
      .string()
      .default("1")
      .transform((value) => {
        const parsed = Number.parseFloat(value);

        if (!Number.isFinite(parsed)) {
          throw new Error("OTEL_TRACES_SAMPLER_RATIO must be a valid number");
        }

        return parsed;
      }),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
  })
  .superRefine((value, ctx) => {
    const privateKey = Buffer.from(value.JWT_PRIVATE_KEY_BASE64, "base64").toString("utf8");
    const publicKey = Buffer.from(value.JWT_PUBLIC_KEY_BASE64, "base64").toString("utf8");
    const mfaKey = decodeBase64(value.MFA_ENCRYPTION_KEY_BASE64, "MFA_ENCRYPTION_KEY_BASE64");

    if (!privateKey.includes("BEGIN PRIVATE KEY")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_PRIVATE_KEY_BASE64"],
        message: "JWT_PRIVATE_KEY_BASE64 must decode to a PEM private key"
      });
    }

    if (!publicKey.includes("BEGIN PUBLIC KEY")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_PUBLIC_KEY_BASE64"],
        message: "JWT_PUBLIC_KEY_BASE64 must decode to a PEM public key"
      });
    }

    if (mfaKey.length !== 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MFA_ENCRYPTION_KEY_BASE64"],
        message: "MFA_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes"
      });
    }

    if (value.JWT_PUBLIC_KEY_BASE64_PREVIOUS) {
      const previousPublicKey = Buffer.from(value.JWT_PUBLIC_KEY_BASE64_PREVIOUS, "base64").toString("utf8");

      if (!previousPublicKey.includes("BEGIN PUBLIC KEY")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_PUBLIC_KEY_BASE64_PREVIOUS"],
          message: "JWT_PUBLIC_KEY_BASE64_PREVIOUS must decode to a PEM public key"
        });
      }
    }

    if (value.MFA_ENCRYPTION_KEY_BASE64_PREVIOUS) {
      const previousMfaKey = decodeBase64(value.MFA_ENCRYPTION_KEY_BASE64_PREVIOUS, "MFA_ENCRYPTION_KEY_BASE64_PREVIOUS");

      if (previousMfaKey.length !== 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["MFA_ENCRYPTION_KEY_BASE64_PREVIOUS"],
          message: "MFA_ENCRYPTION_KEY_BASE64_PREVIOUS must decode to exactly 32 bytes"
        });
      }
    }

    if (value.NODE_ENV === "production" && value.STORAGE_SIGNING_SECRET === "change-me") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STORAGE_SIGNING_SECRET"],
        message: "STORAGE_SIGNING_SECRET must be changed before production"
      });
    }

    if (value.NODE_ENV === "production" && !value.INTERNAL_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["INTERNAL_API_KEY"],
        message: "INTERNAL_API_KEY is required in production"
      });
    }

    if (!value.TWILIO_VERIFY_MOCK_MODE) {
      for (const key of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID"] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when TWILIO_VERIFY_MOCK_MODE=false`
          });
        }
      }
    }

    if (value.TYPESENSE_HOST && !value.TYPESENSE_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TYPESENSE_API_KEY"],
        message: "TYPESENSE_API_KEY is required when TYPESENSE_HOST is set"
      });
    }

    if (value.OTEL_TRACES_SAMPLER_RATIO < 0 || value.OTEL_TRACES_SAMPLER_RATIO > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OTEL_TRACES_SAMPLER_RATIO"],
        message: "OTEL_TRACES_SAMPLER_RATIO must be between 0 and 1"
      });
    }

    if (value.TRACING_ENABLED && !value.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT && !value.OTEL_CONSOLE_EXPORTER_ENABLED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TRACING_ENABLED"],
        message: "Tracing requires OTEL_EXPORTER_OTLP_TRACES_ENDPOINT or OTEL_CONSOLE_EXPORTER_ENABLED=true"
      });
    }
  });

const parsed = EnvironmentSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${message}`);
}

const env = parsed.data;

export { env };
