# SHARED ARCHITECTURE — Paste this with EVERY module generation
# File: src/ (shared infrastructure)

## MANDATORY PATTERN
Controller → Validator (Zod) → Service → Repository/Prisma → EventBus.emit()
NEVER: DB calls in controllers. NEVER: HTTP concerns in services. NEVER: business logic in repositories.

## STACK
Node.js 20 LTS, Express 4, TypeScript 5, Prisma 5, PostgreSQL (Supabase),
Redis 7 (ioredis), BullMQ 5, Typesense 26, Zod 3, bcrypt, jsonwebtoken

## RESPONSE ENVELOPES (use for ALL endpoints)
```typescript
// src/lib/response.ts
export const success = (data: unknown, meta?: object) => ({
  success: true,
  data,
  meta: { requestId: meta?.requestId ?? uuidv4(), timestamp: new Date().toISOString(), ...meta }
});

export const paginated = (data: unknown[], pagination: Pagination, meta?: object) => ({
  success: true,
  data,
  pagination,
  meta: { requestId: uuidv4(), timestamp: new Date().toISOString(), ...meta }
});

export const error = (code: string, message: string, details?: unknown, meta?: object) => ({
  success: false,
  error: { code, message, details },
  meta: { requestId: uuidv4(), timestamp: new Date().toISOString(), ...meta }
});
```

## ERROR CODES (throw ApiError with these codes)
```typescript
// src/lib/errors.ts
export class ApiError extends Error {
  constructor(public code: string, public statusCode: number, message?: string, public details?: unknown) {
    super(message ?? code);
  }
}

export const Errors = {
  AUTH_INVALID_CREDENTIALS:        () => new ApiError('AUTH_INVALID_CREDENTIALS', 401),
  AUTH_EMAIL_NOT_VERIFIED:         () => new ApiError('AUTH_EMAIL_NOT_VERIFIED', 403),
  AUTH_PHONE_NOT_VERIFIED:         () => new ApiError('AUTH_PHONE_NOT_VERIFIED', 403),
  AUTH_SESSION_EXPIRED:            () => new ApiError('AUTH_SESSION_EXPIRED', 401),
  USER_SUSPENDED:                  () => new ApiError('USER_SUSPENDED', 403),
  USER_NOT_FOUND:                  () => new ApiError('USER_NOT_FOUND', 404),
  WORKER_PROFILE_NOT_FOUND:        () => new ApiError('WORKER_PROFILE_NOT_FOUND', 404),
  WORKER_NOT_VERIFIED:             () => new ApiError('WORKER_NOT_VERIFIED', 403),
  REQUEST_NOT_FOUND:               () => new ApiError('REQUEST_NOT_FOUND', 404),
  REQUEST_ALREADY_ACCEPTED:        () => new ApiError('REQUEST_ALREADY_ACCEPTED', 409),
  REQUEST_INVALID_STATUS_TRANSITION:()=> new ApiError('REQUEST_INVALID_STATUS_TRANSITION', 422),
  BOOKING_NOT_FOUND:               () => new ApiError('BOOKING_NOT_FOUND', 404),
  BOOKING_TIME_CONFLICT:           () => new ApiError('BOOKING_TIME_CONFLICT', 409),
  BOOKING_ALREADY_COMPLETED:       () => new ApiError('BOOKING_ALREADY_COMPLETED', 409),
  REVIEW_NOT_ALLOWED:              () => new ApiError('REVIEW_NOT_ALLOWED', 403),
  CONVERSATION_ACCESS_DENIED:      () => new ApiError('CONVERSATION_ACCESS_DENIED', 403),
  FILE_UPLOAD_INVALID_TYPE:        () => new ApiError('FILE_UPLOAD_INVALID_TYPE', 422),
  FILE_UPLOAD_TOO_LARGE:           () => new ApiError('FILE_UPLOAD_TOO_LARGE', 422),
  PERMISSION_DENIED:               () => new ApiError('PERMISSION_DENIED', 403),
  RATE_LIMIT_EXCEEDED:             () => new ApiError('RATE_LIMIT_EXCEEDED', 429),
  IDEMPOTENCY_CONFLICT:            () => new ApiError('IDEMPOTENCY_CONFLICT', 409),
  VALIDATION_FAILED:           (d?) => new ApiError('VALIDATION_FAILED', 422, 'Validation failed', d),
  CITY_NOT_SUPPORTED:              () => new ApiError('CITY_NOT_SUPPORTED', 422),
  FEATURE_FLAG_DISABLED:           () => new ApiError('FEATURE_FLAG_DISABLED', 403),
};
```

## GLOBAL ERROR HANDLER (app.use — last middleware)
```typescript
// src/middleware/errorHandler.ts
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string ?? uuidv4();

  if (err instanceof ZodError) {
    return res.status(422).json(error('VALIDATION_FAILED', 'Validation failed', err.flatten(), { requestId }));
  }
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(error(err.code, err.message, err.details, { requestId }));
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json(error('CONFLICT', 'Record already exists', null, { requestId }));
    if (err.code === 'P2025') return res.status(404).json(error('NOT_FOUND', 'Record not found', null, { requestId }));
  }
  logger.error({ err, requestId }, 'Unhandled error');
  return res.status(500).json(error('INTERNAL_ERROR', 'Internal server error', null, { requestId }));
};
```

## AUTH MIDDLEWARE
```typescript
// src/middleware/authenticate.ts
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw Errors.AUTH_SESSION_EXPIRED();
  const payload = verifyAccessToken(token); // throws if invalid/expired
  if (payload.status === 'SUSPENDED') throw Errors.USER_SUSPENDED();
  req.actor = {
    userId: payload.sub,
    roles: payload.roles,
    mfaVerified: payload.mfa_verified,
    ipAddress: req.ip,
  };
  next();
};

export const optionalAuthenticate = async (req, res, next) => {
  try { await authenticate(req, res, next); } catch { next(); }
};
```

## REQUEST ID MIDDLEWARE (apply first)
```typescript
export const requestId = (req, res, next) => {
  const id = (req.headers['x-request-id'] as string) ?? uuidv4();
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
};
```

## RATE LIMIT MIDDLEWARE (Redis sliding window)
```typescript
// src/middleware/rateLimit.ts
export const rateLimit = (key: (req) => string, windowMs: number, max: number) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.RATE_LIMIT_ENABLED === 'false') return next();
    const k = `rl:${key(req)}`;
    const count = await redis.incr(k);
    if (count === 1) await redis.pexpire(k, windowMs);
    if (count > max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      throw Errors.RATE_LIMIT_EXCEEDED();
    }
    next();
  };
```

## VALIDATE MIDDLEWARE
```typescript
// src/middleware/validate.ts
export const validate = (schema: ZodSchema, source: 'body'|'query'|'params' = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) throw Errors.VALIDATION_FAILED(result.error.flatten());
    req[source] = result.data; // replace with parsed/transformed data
    next();
  };
```

## PRISMA CLIENT (singleton)
```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query','error'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## REDIS CLIENT
```typescript
// src/lib/redis.ts
import Redis from 'ioredis';
export const redis = new Redis(process.env.REDIS_URL!, {
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_CACHE_DB ?? '0'),
  keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'vsp:',
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});
export const redisQueue = new Redis(process.env.REDIS_URL!, {
  db: parseInt(process.env.REDIS_QUEUE_DB ?? '1'),
  maxRetriesPerRequest: null, // required for BullMQ
});
```

## PAGINATION HELPER
```typescript
// src/lib/pagination.ts
export interface Pagination { page: number; limit: number; }
export const getPaginationArgs = ({ page, limit }: Pagination) => ({
  skip: (page - 1) * limit,
  take: limit,
});
export const buildPagination = (page: number, limit: number, total: number) => ({
  page, limit, total, hasNext: page * limit < total
});
```

## SECURITY HEADERS (apply via helmet)
```typescript
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", process.env.CDN_BASE_URL!],
      connectSrc: ["'self'"],
    }
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
}));
```

## CORS
```typescript
import cors from 'cors';
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  maxAge: parseInt(process.env.CORS_MAX_AGE_SECONDS ?? '86400'),
}));
```

## ACTOR CONTEXT TYPE
```typescript
// src/types/actor.ts
export interface ActorContext {
  userId:     string;
  roles?:     string[];  // AdminRoleKey[]
  permissions?: string[];
  mfaVerified?: boolean;
  ipAddress?: string;
}
declare global {
  namespace Express {
    interface Request { actor?: ActorContext; }
  }
}
```
