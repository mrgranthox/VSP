# MODULE: auth
# File: src/modules/auth/
# Context window: paste this entire file when generating the auth module

## STACK
Node.js 20, Express, TypeScript, Prisma 5, PostgreSQL (Supabase), Redis, Zod, BullMQ
JWT RS256 — access token 15 min, refresh token 30 days (SHA-256 hashed in DB)

## ARCHITECTURE RULE
Controller → Validator → Service → Repository/Prisma → Event Emitter
No business logic in controllers. No DB calls in controllers. No HTTP in services.

## PRISMA MODELS (auth owns these)
```prisma
model User {
  id                String      @id @default(uuid())
  email             String?     @unique
  phone             String?     @unique
  passwordHash      String?
  status            UserStatus  @default(ACTIVE)
  isEmailVerified   Boolean     @default(false)
  isPhoneVerified   Boolean     @default(false)
  lastLoginAt       DateTime?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

model UserIdentity {
  id             String   @id @default(uuid())
  userId         String
  provider       String
  providerUserId String
  createdAt      DateTime @default(now())
  @@unique([provider, providerUserId])
  @@index([userId])
}

model UserSession {
  id               String    @id @default(uuid())
  userId           String
  refreshTokenHash String    // SHA-256 hash — never store raw token
  deviceType       String?   // ios | android | web
  ipAddress        String?
  mfaVerified      Boolean   @default(false)
  mfaMethod        String?   // totp | sms | null
  expiresAt        DateTime
  revokedAt        DateTime?
  createdAt        DateTime  @default(now())
  @@index([userId, expiresAt])
}

enum UserStatus { ACTIVE SUSPENDED DELETED }
```

## ENDPOINTS (10)
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/request-password-reset
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/verify-phone
GET    /api/v1/auth/me
POST   /api/v1/auth/sessions/revoke

## ZOD SCHEMAS
```typescript
export const RegisterBody = z.object({
  email:     z.string().email().max(255).transform(v=>v.toLowerCase()).optional(),
  phone:     z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  password:  z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/).optional(),
  firstName: z.string().min(1).max(100).trim(),
  lastName:  z.string().min(1).max(100).trim(),
}).strict()
  .refine(d => d.email || d.phone, { message: 'Email or phone required' });

export const LoginBody = z.object({
  email:    z.string().email().optional(),
  phone:    z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  password: z.string().min(1).max(128),
}).strict().refine(d => d.email || d.phone, { message: 'Email or phone required' });

export const RefreshBody = z.object({ refreshToken: z.string().min(1) }).strict();

export const RequestPasswordResetBody = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
}).strict().refine(d => d.email || d.phone);

export const ResetPasswordBody = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/),
}).strict();

export const VerifyEmailBody    = z.object({ token: z.string().min(1) }).strict();
export const VerifyPhoneBody    = z.object({ otp: z.string().length(6).regex(/^\d{6}$/) }).strict();
export const RevokeSessionBody  = z.object({ sessionId: z.string().uuid() }).strict();
export const MFAChallengeBody   = z.object({
  method: z.enum(['totp','sms','backup_code']),
  code:   z.string().min(6).max(12),
}).strict();
```

## SERVICE INTERFACE
```typescript
interface TokenPair {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    Date;
}
interface ActorContext { userId: string; roles?: string[]; mfaVerified?: boolean; ipAddress?: string; }

interface IAuthService {
  register(data: { email?:string; phone?:string; password?:string; firstName:string; lastName:string }): Promise<{ userId:string; status:string }>;
  login(data: { email?:string; phone?:string; password:string }, ipAddress:string, deviceType?:string): Promise<{ tokenPair:TokenPair; userId:string }>;
  logout(actor: ActorContext, sessionId: string): Promise<void>;
  refreshTokens(refreshToken: string): Promise<TokenPair>;
  requestPasswordReset(data: { email?:string; phone?:string }): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  verifyPhone(actor: ActorContext, otp: string): Promise<void>;
  revokeSession(actor: ActorContext, sessionId: string): Promise<void>;
  getMe(actor: ActorContext): Promise<{ user: User; roles: string[] }>;
  setupMFA(actor: ActorContext, method: 'totp'|'sms'): Promise<{ secret?:string; qrCodeUrl?:string }>;
  verifyMFASetup(actor: ActorContext, code: string): Promise<{ backupCodes: string[] }>;
  challengeMFA(actor: ActorContext, data: { method:string; code:string }): Promise<void>;
}
```

## BUSINESS LOGIC RULES
- bcrypt cost: 12. Never store raw password or raw refresh token.
- Refresh token stored as: crypto.createHash('sha256').update(rawToken).digest('hex')
- On refresh: issue new pair, revoke old session atomically in one transaction
- Token reuse detection: if a revoked refresh token is presented → revoke ALL sessions for that user → emit FRAUD_SIGNAL_CREATED { signalKey: 'REFRESH_TOKEN_REUSE', score: 80 }
- JWT claims: { sub: userId, roles: AdminRoleKey[], mfa_verified: boolean, jti: uuid, iat, exp }
- JWT algorithm: RS256. Private key from env JWT_PRIVATE_KEY_BASE64 (base64-decoded PEM)
- lastLoginAt updated on every successful login
- Email normalized to lowercase before storage and lookup
- Phone must be E.164 format (+countrycodenumber)
- Admin roles requiring mfa_verified=true: USER_SUSPEND, WORKER_VERIFY, CONFIG_UPDATE, ADMIN_ROLE_ASSIGN, ADMIN_ROLE_REMOVE
- Password reset token: crypto.randomBytes(32).toString('hex'), stored hashed, TTL 1 hour
- Email verification token: same pattern, TTL 24 hours
- Phone OTP: 6-digit numeric, via Twilio Verify service, TTL 5 minutes (TWILIO_VERIFY_SERVICE_SID)

## RATE LIMITING (apply via Redis sliding window middleware)
- POST /auth/login:    5 attempts per 5 minutes per IP+device. Key: rl:login:{ip}:{device}
- POST /auth/register: 3 attempts per hour per IP. Key: rl:register:{ip}

## ERROR CODES THIS MODULE PRODUCES
AUTH_INVALID_CREDENTIALS, AUTH_EMAIL_NOT_VERIFIED, AUTH_PHONE_NOT_VERIFIED,
AUTH_SESSION_EXPIRED, USER_SUSPENDED, VALIDATION_FAILED, RATE_LIMIT_EXCEEDED

## EVENTS EMITTED (after successful transaction)
- USER_REGISTERED → { userId, email, phone, createdAt }
  Consumed by: notifications (welcome email), analytics

## RESPONSE ENVELOPE (all endpoints use this)
Success: { success: true, data: {}, meta: { requestId: uuid, timestamp: iso8601 } }
Error:   { success: false, error: { code: string, message: string, details?: {} }, meta: { requestId, timestamp } }

## SEED FIXTURES (for tests)
SuperAdmin: id=aaaaaaaa-0001-4000-a000-000000000001, email=superadmin@vocationalplatform.com
Admin:      id=aaaaaaaa-0002-4000-a000-000000000002
Moderator:  id=aaaaaaaa-0003-4000-a000-000000000003
Support:    id=aaaaaaaa-0004-4000-a000-000000000004
Alice:      id=aaaaaaaa-0005-4000-a000-000000000005, email=alice@example.com (customer)
Bob:        id=aaaaaaaa-0006-4000-a000-000000000006, email=bob@example.com (approved worker)
All fixture passwords: Change-This-Password-123! (bcrypt hashed in seed)
