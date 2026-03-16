# MODULE: worker-profiles
# File: src/modules/worker-profiles/

## PRISMA MODELS (this module owns all worker_* tables)
```prisma
model WorkerProfile {
  id                 String             @id @default(uuid())
  userId             String             @unique
  headline           String?            // max 120 chars
  bio                String?            // max 3000 chars
  experienceYears    Int                @default(0)
  verificationStatus VerificationStatus @default(DRAFT)
  avgRating          Decimal            @default(0) @db.Decimal(3,2)   // DERIVED — never hand-edit
  totalReviews       Int                @default(0)                     // DERIVED
  jobsCompleted      Int                @default(0)                     // DERIVED
  responseRate       Decimal            @default(0) @db.Decimal(5,2)   // DERIVED
  serviceRadiusKm    Int                @default(10)
  isFeatured         Boolean            @default(false)                 // DERIVED from active subscription
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
}

model WorkerTradeCategory {
  id              String @id @default(uuid())
  workerProfileId String
  tradeCategoryId String
  @@unique([workerProfileId, tradeCategoryId])
  @@index([tradeCategoryId])
}

model WorkerService {
  id              String   @id @default(uuid())
  workerProfileId String
  title           String   // max 150 chars
  description     String?
  basePriceMinor  Int?     // minor currency units
  currencyCode    String?  // ISO 4217 e.g. GHS
  isEnabled       Boolean  @default(true)
  createdAt       DateTime @default(now())
  @@index([workerProfileId])
}

model WorkerServiceArea {
  id              String   @id @default(uuid())
  workerProfileId String
  cityId          String?  // FK city_configs
  centerLat       Decimal? @db.Decimal(10,8)
  centerLng       Decimal? @db.Decimal(11,8)
  radiusKm        Int      @default(10)  // min 1, max 100
  coverageMode    String   @default("CIRCLE")
  createdAt       DateTime @default(now())
  @@index([workerProfileId])
  @@index([cityId])
}

model WorkerAvailabilityRule {
  id              String   @id @default(uuid())
  workerProfileId String
  dayOfWeek       Int      // 0=Sunday, 6=Saturday
  startMinute     Int      // minutes from midnight e.g. 480=08:00
  endMinute       Int      // e.g. 1080=18:00. Must be > startMinute
  timezone        String   // IANA e.g. Africa/Accra
  createdAt       DateTime @default(now())
  @@index([workerProfileId, dayOfWeek])
}

model WorkerAvailabilityException {
  id              String   @id @default(uuid())
  workerProfileId String
  startsAt        DateTime
  endsAt          DateTime // must be > startsAt
  reason          String?  // max 255 chars
  createdAt       DateTime @default(now())
  @@index([workerProfileId, startsAt])
}

model WorkerPortfolioItem {
  id              String   @id @default(uuid())
  workerProfileId String
  title           String?  // max 150 chars
  caption         String?
  mediaUrl        String   // CDN URL — set by media module
  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())
  @@index([workerProfileId, sortOrder])
}

model WorkerCertification {
  id                 String             @id @default(uuid())
  workerProfileId    String
  title              String             // max 200 chars
  issuer             String?            // max 200 chars
  certificateUrl     String             // private storage — signed URL only
  issuedOn           DateTime?
  expiresOn          DateTime?
  verificationStatus VerificationStatus @default(DRAFT)
  createdAt          DateTime           @default(now())
  @@index([workerProfileId, verificationStatus])
}

model WorkerVerificationRequest {
  id              String             @id @default(uuid())
  workerProfileId String
  status          VerificationStatus @default(DRAFT)
  submittedAt     DateTime?
  reviewedAt      DateTime?
  reviewNotes     String?
  createdAt       DateTime           @default(now())
  @@index([workerProfileId, status])
}

enum VerificationStatus { DRAFT SUBMITTED UNDER_REVIEW APPROVED REJECTED EXPIRED }
```

## ENDPOINTS (25)
POST   /api/v1/worker-profiles
GET    /api/v1/worker-profiles/me
PATCH  /api/v1/worker-profiles/me
GET    /api/v1/worker-profiles/:workerId
POST/PATCH/DELETE /api/v1/worker-profiles/me/trades/:tradeId
POST/PATCH/DELETE /api/v1/worker-profiles/me/services/:serviceId
POST/PATCH/DELETE /api/v1/worker-profiles/me/service-areas/:areaId
POST/PATCH/DELETE /api/v1/worker-profiles/me/availability/rules/:ruleId
POST/PATCH/DELETE /api/v1/worker-profiles/me/availability/exceptions/:exceptionId
POST/PATCH/DELETE /api/v1/worker-profiles/me/portfolio/:itemId
POST/PATCH/DELETE /api/v1/worker-profiles/me/certifications/:certId
POST               /api/v1/worker-profiles/me/verification-requests

## ZOD SCHEMAS
```typescript
export const CreateWorkerProfileBody = z.object({
  headline:        z.string().max(120).trim().optional(),
  bio:             z.string().max(3000).optional(),
  experienceYears: z.number().int().min(0).max(60).default(0),
}).strict();

export const UpdateWorkerProfileBody = z.object({
  headline:        z.string().max(120).trim().optional(),
  bio:             z.string().max(3000).optional().nullable(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  serviceRadiusKm: z.number().int().min(1).max(100).optional(),
}).strict();

export const CreateServiceAreaBody = z.object({
  cityId:    z.string().uuid().optional(),
  centerLat: z.coerce.number().min(-90).max(90).optional(),
  centerLng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm:  z.number().int().min(1).max(100).default(10),
}).strict().refine(d => d.cityId || (d.centerLat !== undefined && d.centerLng !== undefined),
  { message: 'cityId or centerLat+centerLng required' });

export const CreateAvailabilityRuleBody = z.object({
  dayOfWeek:   z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute:   z.number().int().min(1).max(1440),
  timezone:    z.string().min(1).max(64),
}).strict().refine(d => d.startMinute < d.endMinute, { message: 'startMinute must be before endMinute' });

export const CreateCertificationBody = z.object({
  title:     z.string().min(1).max(200).trim(),
  issuer:    z.string().max(200).optional(),
  mediaRef:  z.string().min(1), // from media upload flow
  issuedOn:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
}).strict();

export const SubmitVerificationBody = z.object({
  documentRefs: z.array(z.string().min(1)).min(1).max(5),
  notes:        z.string().max(1000).optional(),
}).strict();
```

## AGGREGATE FIELD RULES (CRITICAL — never let AI change these)
avgRating    = ROUND(AVG(reviews.rating), 2) WHERE reviewee_user_id = worker.userId AND booking.status=COMPLETED
totalReviews = COUNT(*) reviews against this worker
jobsCompleted= COUNT(*) bookings WHERE worker_profile_id = wp.id AND status=COMPLETED
responseRate = (assignments ACCEPTED|DECLINED within 48h / total assignments in last 48h) × 100
               — min 3 assignments required before displaying. Below 3 → store 0, display null
isFeatured   = true if worker_featured_subscriptions has row with status=ACTIVE AND ends_at > NOW()

All aggregates updated synchronously after triggering events.
Repair job audit_integrity_check runs nightly to fix drift.

## PROFILE COMPLETE SCORE (for Typesense ranking — compute at index time)
headline(10) + bio>=100chars(10) + avatar(10) + >=1 trade(10) + >=1 service(10)
+ >=1 service area(10) + >=1 portfolio item(15) + >=1 approved cert(10) + >=2 availability rules(10) + experience_years>0(5) = max 100

## VERIFICATION STATE MACHINE
DRAFT → SUBMITTED (worker submits) → UNDER_REVIEW (admin opens) → APPROVED (admin WORKER_VERIFY) | REJECTED (admin WORKER_REJECT_VERIFICATION)
APPROVED → EXPIRED (system job)
REJECTED|EXPIRED → SUBMITTED (worker resubmits)

## PUBLIC PROFILE FIELDS (safe unauthenticated)
id, headline, bio, experienceYears, verificationStatus, avgRating, totalReviews,
jobsCompleted, responseRate, isFeatured, serviceRadiusKm, tradeCategories,
services(isEnabled=true), serviceAreas, portfolioItems, certifications(title,issuer,verificationStatus only)
Do NOT expose: certificateUrl (private storage)

## EVENTS EMITTED
WORKER_PROFILE_CREATED → { workerProfileId, userId }  → search (index), analytics
WORKER_VERIFICATION_SUBMITTED → { workerProfileId }   → notifications (admin alert)

## SEED FIXTURES
Bob's WorkerProfile: id=bbbbbbbb-0001-4000-b000-000000000001, userId=aaaaaaaa-0006-...,
  verificationStatus=APPROVED, avgRating=4.75, totalReviews=12, jobsCompleted=15, responseRate=92.5
  trade: electrician (eeeeeeee-0001-4000-e000-000000000001)
  serviceArea: center Accra (5.6037,-0.1870), radiusKm=20, cityId=dddddddd-0001-...
Unverified worker: id=bbbbbbbb-0002-4000-b000-000000000002, status=SUBMITTED
