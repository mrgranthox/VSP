# HTTP Test Coverage

Generated from the current TypeScript source tree.

- Routes: 201
- Static HTTP test invocations: 293
- Unique static HTTP invocations: 160
- Covered routes: 156
- Uncovered routes: 45
- Static coverage rate: 77.61%

## Limitations

- Coverage is derived from static HTTP invocation parsing in *.test.ts files.
- Dynamic runtime-generated URLs, websocket traffic, and non-HTTP flows are not included.
- A matched route indicates at least one static request invocation, not exhaustive behavioral coverage.

## Uncovered Routes

- `GET /api/v1/admin/analytics/engagement` (admin)
- `GET /api/v1/admin/analytics/marketplace` (admin)
- `GET /api/v1/admin/analytics/overview` (admin)
- `GET /api/v1/admin/analytics/search` (admin)
- `GET /api/v1/admin/audit-logs` (admin)
- `GET /api/v1/admin/bookings` (admin)
- `GET /api/v1/admin/cities` (admin)
- `PATCH /api/v1/admin/cities/:cityId` (admin)
- `DELETE /api/v1/admin/comments/:commentId` (admin)
- `GET /api/v1/admin/configs` (admin)
- `PATCH /api/v1/admin/configs/:configKey` (admin)
- `GET /api/v1/admin/content/:entityType/:entityId` (admin)
- `GET /api/v1/admin/feature-flags` (admin)
- `PATCH /api/v1/admin/feature-flags/:flagKey` (admin)
- `GET /api/v1/admin/featured-workers` (admin)
- `GET /api/v1/admin/moderation-cases` (admin)
- `GET /api/v1/admin/moderation-cases/:caseId` (admin)
- `POST /api/v1/admin/moderation-cases/:caseId/actions` (admin)
- `GET /api/v1/admin/permissions` (admin)
- `GET /api/v1/admin/posts` (admin)
- `DELETE /api/v1/admin/posts/:postId` (admin)
- `GET /api/v1/admin/reports` (admin)
- `GET /api/v1/admin/reports/:reportId` (admin)
- `DELETE /api/v1/admin/reviews/:reviewId` (admin)
- `GET /api/v1/admin/roles` (admin)
- `PATCH /api/v1/admin/roles/:roleId/permissions` (admin)
- `GET /api/v1/admin/service-requests/:requestId` (admin)
- `GET /api/v1/admin/system/metrics` (admin)
- `GET /api/v1/admin/users/:userId` (admin)
- `POST /api/v1/admin/users/:userId/roles` (admin)
- `DELETE /api/v1/admin/users/:userId/roles/:roleId` (admin)
- `GET /api/v1/admin/workers` (admin)
- `GET /api/v1/admin/workers/:workerId` (admin)
- `POST /api/v1/admin/workers/:workerId/reject-verification` (admin)
- `PATCH /api/v1/admin/workers/:workerId/subscription` (admin)
- `POST /api/v1/admin/workers/:workerId/verify` (admin)
- `POST /api/v1/auth/sessions/revoke` (auth)
- `DELETE /api/v1/comments/:commentId/likes` (social)
- `GET /api/v1/health/ready` (platform)
- `PUT /api/v1/media/mock-upload/:mediaId` (media)
- `GET /api/v1/media/private/read` (media)
- `PATCH /api/v1/posts/:postId` (social)
- `DELETE /api/v1/posts/:postId/likes` (social)
- `DELETE /api/v1/posts/:postId/saves` (social)
- `DELETE /api/v1/users/me/follows/:targetType/:targetId` (users)

## Covered Route Samples

- `GET /api/v1/admin/bookings/:bookingId` via src/modules/admin/admin.integration.test.ts
- `POST /api/v1/admin/cities` via src/modules/admin/admin.integration.test.ts
- `PATCH /api/v1/admin/featured-workers/:workerId` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/fraud-signals` via src/modules/admin/admin.integration.test.ts
- `PATCH /api/v1/admin/fraud-signals/:signalId` via src/modules/admin/admin.integration.test.ts
- `POST /api/v1/admin/notifications/broadcast` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/service-requests` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/support-tickets` via src/modules/admin/admin.integration.test.ts
- `PATCH /api/v1/admin/support-tickets/:ticketId/assign` via src/modules/admin/admin.integration.test.ts
- `PATCH /api/v1/admin/support-tickets/:ticketId/status` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/system/health` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/users` via src/modules/admin/admin.integration.test.ts
- `POST /api/v1/admin/users/:userId/reactivate` via src/modules/admin/admin.integration.test.ts
- `POST /api/v1/admin/users/:userId/suspend` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/workers/:workerId/subscription` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/workers/:workerId/verification-documents` via src/modules/admin/admin.integration.test.ts
- `POST /api/v1/auth/login` via src/gateway/websocket.integration.test.ts, src/modules/admin/admin.integration.test.ts, src/modules/auth/auth.integration.test.ts, src/modules/billing/billing.integration.test.ts, src/modules/bookings/bookings.integration.test.ts, src/modules/chat/chat.integration.test.ts, src/modules/media/media.integration.test.ts, src/modules/moderation/moderation.integration.test.ts, src/modules/notifications/notifications.integration.test.ts, src/modules/requests/requests.integration.test.ts, src/modules/reviews/reviews.integration.test.ts, src/modules/search/search.integration.test.ts, src/modules/social/social.integration.test.ts, src/modules/support/support.integration.test.ts, src/modules/users/users.integration.test.ts, src/modules/worker-profiles/worker-profiles.integration.test.ts
- `POST /api/v1/auth/logout` via src/modules/auth/auth.integration.test.ts
- `GET /api/v1/auth/me` via src/modules/auth/auth.integration.test.ts
- `GET /api/v1/auth/mfa/backup-codes` via src/modules/auth/auth.integration.test.ts
- `POST /api/v1/auth/mfa/challenge` via src/modules/auth/auth.integration.test.ts
- `POST /api/v1/auth/mfa/challenge/request` via src/modules/auth/auth.integration.test.ts
- `POST /api/v1/auth/mfa/disable` via src/modules/auth/auth.integration.test.ts
- `POST /api/v1/auth/mfa/setup` via src/modules/auth/auth.integration.test.ts
- `POST /api/v1/auth/mfa/verify-setup` via src/modules/auth/auth.integration.test.ts
