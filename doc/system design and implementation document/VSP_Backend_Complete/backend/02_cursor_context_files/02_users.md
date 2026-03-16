# MODULE: users
# File: src/modules/users/

## PRISMA MODELS (users module owns these)
```prisma
model UserProfile {
  id          String      @id @default(uuid())
  userId      String      @unique
  firstName   String
  lastName    String
  displayName String?
  avatarUrl   String?
  bio         String?     // max 3000 chars, HTML stripped
  cityId      String?     // FK city_configs
  lat         Decimal?    @db.Decimal(10,8)
  lng         Decimal?    @db.Decimal(11,8)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  @@index([cityId])
}

model CustomerSavedWorker {
  id              String   @id @default(uuid())
  userId          String
  workerProfileId String
  createdAt       DateTime @default(now())
  @@unique([userId, workerProfileId])
  @@index([workerProfileId])
}

model UserFollow {
  id             String          @id @default(uuid())
  followerUserId String
  targetType     FollowTargetType // USER | WORKER
  targetId       String           // polymorphic → users.id or worker_profiles.id
  createdAt      DateTime         @default(now())
  @@unique([followerUserId, targetType, targetId])
  @@index([targetType, targetId])
}

model NotificationPreference {
  id                    String   @id @default(uuid())
  userId                String   @unique
  chatPushEnabled       Boolean  @default(true)
  requestPushEnabled    Boolean  @default(true)
  marketingEmailEnabled Boolean  @default(false)
  quietHoursStart       Int?     // hour 0–23 in user's local timezone
  quietHoursEnd         Int?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum FollowTargetType { USER WORKER }
```

## ENDPOINTS (12)
GET    /api/v1/users/me
PATCH  /api/v1/users/me
GET    /api/v1/users/me/preferences
PATCH  /api/v1/users/me/preferences
GET    /api/v1/users/me/saved-workers
POST   /api/v1/users/me/saved-workers/:workerId
DELETE /api/v1/users/me/saved-workers/:workerId
GET    /api/v1/users/me/follows
POST   /api/v1/users/me/follows
DELETE /api/v1/users/me/follows/:targetType/:targetId
GET    /api/v1/users/:userId/profile
DELETE /api/v1/users/me

## ZOD SCHEMAS
```typescript
export const UpdateUserMeBody = z.object({
  firstName:   z.string().min(1).max(100).trim().optional(),
  lastName:    z.string().min(1).max(100).trim().optional(),
  displayName: z.string().max(150).trim().optional().nullable(),
  bio:         z.string().max(3000).optional().nullable(),
  cityId:      z.string().uuid().optional().nullable(),
  lat:         z.coerce.number().min(-90).max(90).optional().nullable(),
  lng:         z.coerce.number().min(-180).max(180).optional().nullable(),
}).strict();

export const UpdateNotificationPreferencesBody = z.object({
  chatPushEnabled:       z.boolean().optional(),
  requestPushEnabled:    z.boolean().optional(),
  marketingEmailEnabled: z.boolean().optional(),
  quietHoursStart:       z.number().int().min(0).max(23).optional().nullable(),
  quietHoursEnd:         z.number().int().min(0).max(23).optional().nullable(),
}).strict();

export const AddFollowBody = z.object({
  targetType: z.enum(['USER','WORKER']),
  targetId:   z.string().uuid(),
}).strict();

export const FollowParams = z.object({
  targetType: z.enum(['USER','WORKER']),
  targetId:   z.string().uuid(),
});

export const WorkerIdPathParam = z.object({ workerId: z.string().uuid() });
export const UserIdPathParam   = z.object({ userId:   z.string().uuid() });
```

## SERVICE INTERFACE
```typescript
interface IUsersService {
  getMe(actor: ActorContext): Promise<UserProfile & { user: User }>;
  updateMe(actor: ActorContext, data: Partial<UserProfileUpdateData>): Promise<UserProfile>;
  getPublicProfile(userId: string): Promise<PublicUserProfile>;
  deleteMe(actor: ActorContext): Promise<void>; // staged deletion — sets status=DELETED, schedules anonymisation
  getNotificationPreferences(actor: ActorContext): Promise<NotificationPreference>;
  updateNotificationPreferences(actor: ActorContext, data: Partial<NotificationPreference>): Promise<NotificationPreference>;
  getSavedWorkers(actor: ActorContext, pagination: Pagination): Promise<PaginatedResult<WorkerProfile>>;
  saveWorker(actor: ActorContext, workerProfileId: string): Promise<void>;
  unsaveWorker(actor: ActorContext, workerProfileId: string): Promise<void>;
  getFollows(actor: ActorContext, pagination: Pagination): Promise<PaginatedResult<FollowEntry>>;
  followTarget(actor: ActorContext, targetType: 'USER'|'WORKER', targetId: string): Promise<void>;
  unfollowTarget(actor: ActorContext, targetType: 'USER'|'WORKER', targetId: string): Promise<void>;
}
```

## BUSINESS LOGIC RULES
- bio: strip all HTML server-side before storage. max 3000 chars.
- avatarUrl: set by media module after upload confirm — not set directly in PATCH /me
- deleteMe: sets user.status = DELETED, schedules anonymisation job (not instant hard delete)
  Anonymisation: clear email, phone, passwordHash, set firstName='Deleted', lastName='User'
  Preserve: booking history, reviews (for worker reputation integrity)
- followTarget: if targetType=USER, targetId must resolve to a users.id
  if targetType=WORKER, targetId must resolve to a worker_profiles.id
  Self-follow is blocked: followerUserId !== targetId (when targetType=USER)
- saveWorker: worker must exist and have verification_status=APPROVED
- NotificationPreference created automatically on user registration (via USER_REGISTERED event)
  Default: chatPushEnabled=true, requestPushEnabled=true, marketingEmailEnabled=false

## PUBLIC PROFILE FIELDS (safe to return unauthenticated)
userId, firstName, lastName, displayName, avatarUrl, bio, cityId
Do NOT return: lat, lng, email, phone, passwordHash

## PAGINATION
page (default 1, min 1), limit (default 20, min 1, max 100)
Response: { data: [], pagination: { page, limit, total, hasNext } }

## ERROR CODES
USER_NOT_FOUND, PERMISSION_DENIED, VALIDATION_FAILED

## EVENTS CONSUMED
USER_REGISTERED → create default NotificationPreference record

## SEED FIXTURES
Alice (customer): id=aaaaaaaa-0005-4000-a000-000000000005, profile cityId=dddddddd-0001-4000-d000-000000000001 (Accra)
Bob (worker):     id=aaaaaaaa-0006-4000-a000-000000000006
