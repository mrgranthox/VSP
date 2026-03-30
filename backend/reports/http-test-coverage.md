# HTTP Test Coverage

Generated from the current TypeScript source tree.

- Routes: 215
- Static HTTP test invocations: 373
- Unique static HTTP invocations: 215
- Covered routes: 215
- Uncovered routes: 0
- Static coverage rate: 100.00%

## Limitations

- Coverage is derived from static HTTP invocation parsing in *.test.ts files.
- Dynamic runtime-generated URLs, websocket traffic, and non-HTTP flows are not included.
- A matched route indicates at least one static request invocation, not exhaustive behavioral coverage.

## Uncovered Routes

- None

## Covered Route Samples

- `GET /api/v1/admin/analytics/engagement` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/analytics/marketplace` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/analytics/overview` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/analytics/search` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/audit-logs` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/audit-logs/export` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/bookings` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/bookings/:bookingId` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/cities` via src/modules/admin/admin.integration.test.ts
- `POST /api/v1/admin/cities` via src/modules/admin/admin.integration.test.ts
- `PATCH /api/v1/admin/cities/:cityId` via src/modules/admin/admin.integration.test.ts
- `DELETE /api/v1/admin/comments/:commentId` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/configs` via src/modules/admin/admin.integration.test.ts
- `PATCH /api/v1/admin/configs/:configKey` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/content/:entityType/:entityId` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/feature-flags` via src/modules/admin/admin.integration.test.ts
- `PATCH /api/v1/admin/feature-flags/:flagKey` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/featured-workers` via src/modules/admin/admin.integration.test.ts
- `PATCH /api/v1/admin/featured-workers/:workerId` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/fraud-signals` via src/modules/admin/admin.integration.test.ts
- `PATCH /api/v1/admin/fraud-signals/:signalId` via src/modules/admin/admin.integration.test.ts
- `PATCH /api/v1/admin/fraud-signals/bulk` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/fraud-signals/export` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/moderation-cases` via src/modules/admin/admin.integration.test.ts
- `GET /api/v1/admin/moderation-cases/:caseId` via src/modules/admin/admin.integration.test.ts
