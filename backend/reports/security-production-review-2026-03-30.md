# Security & Production Bottleneck Review (2026-03-30)

## Scope
- Backend API and middleware hot paths under `backend/src`.
- Focused static review for auth/internal access checks, rate limiting, media URL signing, and heavy admin data access patterns.

## Implemented fixes

### 0) Better client UX under load via rate-limit response headers
**Risk:** as traffic grows, clients without limit visibility tend to retry aggressively, creating thundering-herd behavior and worse user-perceived reliability.

**Change:** rate-limited endpoints now return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` on every evaluated request, plus existing `Retry-After` when blocked.

**Impact:** clients can back off intelligently and render better UX messaging instead of generic failures.


### 1) Constant-time comparison for internal API key verification
**Risk:** comparing sensitive tokens with plain string equality can leak timing information in edge cases.

**Change:** `internalAccess` now compares provided and expected tokens with `timingSafeEqual` after equal-length checks.

**Impact:** hardens internal endpoint authentication against timing-based token probing.

### 2) Reduced Redis round trips in HTTP rate limiting middleware
**Risk:** sequential Redis calls (`zremrangebyscore` + `zadd` + `zcard` + `pexpire`) add per-request latency and reduce throughput under load.

**Change:** moved these commands into a single Redis pipeline (`multi().exec()`) and kept the same sliding-window behavior.

**Impact:** lowers network RTT overhead for every rate-limited request; improves p95/p99 latency in high traffic scenarios.

## Additional bottlenecks to prioritize next

### A) High fan-out admin activity query path
In `admin.service.ts`, the admin user detail activity flow issues a large `Promise.all` with many `count` and `findMany` calls in one request. This pattern can saturate the DB connection pool and increase tail latency for concurrent admin traffic.

**Recommendation:**
- Gate expensive sections behind query params (e.g., `includeActivity=true`).
- Cache low-volatility count aggregates for short TTLs.
- Consider read-model/materialized views for heavy admin dashboards.

### B) `npm audit` dependency scan blocked in current environment
`npm audit --omit=dev --json` failed with HTTP 403 from npm advisories endpoint in this execution environment.

**Recommendation:**
- Run audit in CI with an allowed registry token/egress.
- Add a CI security gate (`npm audit --audit-level=high` plus SBOM/SCA tooling).

## Validation performed
- Type check passed after code changes.
- Full integration tests could not run successfully in this environment due to missing required env vars for DB/Redis/JWT/MFA.
