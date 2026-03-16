# MODULE: requests (service-requests)
# File: src/modules/requests/

## PRISMA MODELS
```prisma
model ServiceRequest {
  id                       String        @id @default(uuid())
  customerUserId           String
  tradeCategoryId          String?
  preferredWorkerProfileId String?
  title                    String        // min 5, max 200
  description              String        // min 10, max 5000
  locationText             String?       // max 255
  lat                      Decimal?      @db.Decimal(10,8)
  lng                      Decimal?      @db.Decimal(11,8)
  status                   RequestStatus @default(OPEN)
  requestedAt              DateTime      @default(now())
  scheduledAt              DateTime?     // must be future if set
  expiresAt                DateTime?     // set at creation: requestedAt + service_request_expiry_hours
  @@index([customerUserId, requestedAt])
  @@index([status, requestedAt])
}
model ServiceRequestItem {
  id               String @id @default(uuid())
  serviceRequestId String
  label            String  // max 150 chars
  quantity         Int     @default(1) // min 1, max 999
  note             String?
  @@index([serviceRequestId])
}
model ServiceRequestAssignment {
  id               String           @id @default(uuid())
  serviceRequestId String
  workerProfileId  String
  assignmentStatus AssignmentStatus @default(PENDING)
  assignedAt       DateTime         @default(now())
  respondedAt      DateTime?
  @@index([serviceRequestId, assignmentStatus])
  @@index([workerProfileId, assignmentStatus])
}
model ServiceRequestStatusHistory {
  id               String        @id @default(uuid())
  serviceRequestId String
  fromStatus       RequestStatus?
  toStatus         RequestStatus
  changedByUserId  String?
  changedAt        DateTime      @default(now())
  @@index([serviceRequestId, changedAt])
}
enum RequestStatus    { OPEN MATCHED ACCEPTED IN_PROGRESS COMPLETED CANCELLED EXPIRED }
enum AssignmentStatus { PENDING ACCEPTED DECLINED }
```

## ENDPOINTS (13)
POST/GET          /api/v1/service-requests
GET/PATCH         /api/v1/service-requests/:requestId
POST/PATCH/DELETE /api/v1/service-requests/:requestId/items/:itemId
POST              /api/v1/service-requests/:requestId/assignments
POST              /api/v1/service-requests/:requestId/assignments/:assignmentId/accept
POST              /api/v1/service-requests/:requestId/assignments/:assignmentId/decline
POST              /api/v1/service-requests/:requestId/cancel
POST              /api/v1/service-requests/:requestId/expire
GET               /api/v1/service-requests/:requestId/status-history

## ZOD SCHEMAS
```typescript
export const CreateServiceRequestBody = z.object({
  tradeCategoryId:          z.string().uuid().optional(),
  preferredWorkerProfileId: z.string().uuid().optional(),
  title:                    z.string().min(5).max(200).trim(),
  description:              z.string().min(10).max(5000),
  locationText:             z.string().max(255).optional(),
  lat:                      z.coerce.number().min(-90).max(90).optional(),
  lng:                      z.coerce.number().min(-180).max(180).optional(),
  scheduledAt:              z.string().datetime().optional(),
  items: z.array(z.object({
    label:    z.string().min(1).max(150).trim(),
    quantity: z.number().int().min(1).max(999).default(1),
    note:     z.string().max(500).optional(),
  })).max(20).optional(),
}).strict().refine(d => !d.scheduledAt || new Date(d.scheduledAt) > new Date(),
  { message: 'scheduledAt must be future' });
```

## STATE MACHINE (service layer enforces — return REQUEST_INVALID_STATUS_TRANSITION on violation)
OPEN → MATCHED (system assigns workers)
OPEN | MATCHED → CANCELLED (customer cancels) | EXPIRED (system job, expiresAt passed)
MATCHED → ACCEPTED (a worker accepts assignment)
ACCEPTED → IN_PROGRESS (worker starts) → COMPLETED (worker completes)
ACCEPTED | IN_PROGRESS → CANCELLED (either party)

## AUTO-EXPIRY JOB (subscription_expiry_check queue — every 15 min)
SELECT * FROM service_requests WHERE status IN ('OPEN','MATCHED') AND expires_at < NOW()
For each: transitionStatus(id, EXPIRED, null), mark all PENDING assignments as DECLINED
Config: service_request_expiry_hours (system_config, default 48h)
Max assignments per request: SERVICE_REQUEST_MAX_ASSIGNMENTS (system_config, default 10)

## IDEMPOTENCY
createRequest supports X-Idempotency-Key header.
Store in api_idempotency_keys with request_hash = SHA-256(requestBody).
On duplicate key with same body: return cached response. Different body: 409 IDEMPOTENCY_CONFLICT.

## EVENTS EMITTED
REQUEST_CREATED  → { requestId, customerUserId, tradeCategoryId, lat, lng } → search (notify nearby workers), analytics
REQUEST_ACCEPTED → { requestId, workerProfileId, customerUserId }            → bookings (create booking), notifications, analytics

## SEED FIXTURE
Request: id=ffffffff-0001-4000-f000-000000000001, status=COMPLETED
  customer=Alice, trade=electrician, location=East Legon Accra
  Assignment: workerProfileId=wpBob, status=ACCEPTED

---
# MODULE: bookings
# File: src/modules/bookings/

## PRISMA MODELS
```prisma
model Booking {
  id               String        @id @default(uuid())
  serviceRequestId String        @unique  // 1:1 with service_request
  workerProfileId  String
  customerUserId   String
  scheduledStart   DateTime
  scheduledEnd     DateTime
  status           BookingStatus @default(PENDING)
  completedAt      DateTime?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  @@index([workerProfileId, scheduledStart])
  @@index([customerUserId, scheduledStart])
}
model BookingReschedule {
  id                 String           @id @default(uuid())
  bookingId          String
  requestedByUserId  String
  oldStart           DateTime
  oldEnd             DateTime
  newStart           DateTime
  newEnd             DateTime
  status             RescheduleStatus @default(PENDING)
  createdAt          DateTime         @default(now())
  @@index([bookingId, createdAt])
}
model BookingCancellation {
  id                String   @id @default(uuid())
  bookingId         String
  cancelledByUserId String
  reason            String?
  createdAt         DateTime @default(now())
}
enum BookingStatus    { PENDING CONFIRMED IN_PROGRESS COMPLETED CANCELLED RESCHEDULED }
enum RescheduleStatus { PENDING ACCEPTED DECLINED CANCELLED }
```

## ENDPOINTS (9)
POST   /api/v1/bookings
GET    /api/v1/bookings
GET    /api/v1/bookings/:bookingId
POST   /api/v1/bookings/:bookingId/confirm
POST   /api/v1/bookings/:bookingId/start
POST   /api/v1/bookings/:bookingId/complete
POST   /api/v1/bookings/:bookingId/reschedule
POST   /api/v1/bookings/:bookingId/reschedule/:rescheduleId/respond
POST   /api/v1/bookings/:bookingId/cancel

## ZOD SCHEMAS
```typescript
export const CreateBookingBody = z.object({
  serviceRequestId: z.string().uuid(),
  scheduledStart:   z.string().datetime(),
  scheduledEnd:     z.string().datetime(),
}).strict()
  .refine(d => new Date(d.scheduledStart) < new Date(d.scheduledEnd), { message: 'start must be before end' })
  .refine(d => new Date(d.scheduledStart) > new Date(), { message: 'start must be future' });

export const RescheduleBody = z.object({
  newStart: z.string().datetime(),
  newEnd:   z.string().datetime(),
  reason:   z.string().max(500).optional(),
}).strict()
  .refine(d => new Date(d.newStart) < new Date(d.newEnd))
  .refine(d => new Date(d.newStart) > new Date());

export const RescheduleResponseBody = z.object({
  action: z.enum(['ACCEPT','DECLINE']),
  reason: z.string().max(500).optional(),
}).strict();

export const CancelBookingBody = z.object({ reason: z.string().max(255).optional() }).strict();
```

## CONFLICT DETECTION (run before create AND before reschedule accept)
```sql
SELECT id FROM bookings
WHERE worker_profile_id = :workerProfileId
  AND status IN ('PENDING','CONFIRMED','IN_PROGRESS')
  AND id != :excludeBookingId
  AND scheduled_start < :effectiveEnd    -- effectiveEnd = newEnd + bufferMinutes
  AND scheduled_end   > :effectiveStart  -- effectiveStart = newStart - bufferMinutes
```
Buffer: BOOKING_CONFLICT_BUFFER_MINUTES (system_config, default 30 min)

## STATE MACHINE
(new) → PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
PENDING | CONFIRMED → CANCELLED
CONFIRMED → RESCHEDULED (reschedule accepted)

## AUTO-COMPLETE JOB
Run nightly: find bookings WHERE status=IN_PROGRESS AND scheduled_end < NOW() - BOOKING_AUTO_COMPLETE_HOURS
Set status=COMPLETED, completedAt=NOW()
Config: booking_auto_complete_hours (system_config, default 24h)

## EVENTS EMITTED
BOOKING_CONFIRMED  → { bookingId, workerProfileId, customerUserId, scheduledStart } → notifications, analytics
BOOKING_COMPLETED  → { bookingId, workerProfileId, customerUserId }                 → reviews (request review notification), search (update jobs_completed), analytics

## SEED FIXTURE
Booking: id=ffffffff-0002-4000-f000-000000000002
  serviceRequestId=ffffffff-0001-..., workerProfile=wpBob, customer=Alice
  scheduledStart=2026-01-12T10:00:00Z, scheduledEnd=2026-01-12T13:00:00Z, status=COMPLETED
