# Security & Production Bottleneck Review (2026-03-30)

## Scope
- Backend API and middleware hot paths under `backend/src`.
- Focused static review for auth/internal access checks, rate limiting, media URL signing, and high-cost admin read paths.

## Implemented fixes

### 1) Constant-time comparison for internal API key verification
**Risk:** comparing sensitive tokens with plain string equality can leak timing information in edge cases.

**Change:** `internalAccess` now compares provided and expected tokens with `timingSafeEqual` after equal-length checks.

**Impact:** hardens internal endpoint authentication against timing-based token probing.

### 2) Reduced Redis round trips in HTTP rate limiting middleware
**Risk:** sequential Redis calls (`zremrangebyscore` + `zadd` + `zcard` + `pexpire`) add per-request latency and reduce throughput under load.

**Change:** moved these commands into a single Redis pipeline (`multi().exec()`) and kept the same sliding-window behavior.

**Impact:** lowers network RTT overhead for every rate-limited request; improves p95/p99 latency in high traffic scenarios.

### 3) Scalable admin user detail endpoint path for growth
**Risk:** admin user detail currently performs high fan-out activity queries; as data grows, this can slow the UX and spike DB load.

**Change:** added `includeActivity` query support (`true` by default) to `/admin/users/:userId`, and when set to `false`, skips the expensive activity snapshot query fan-out while still returning the same response shape with zeroed activity data and an `activityIncluded` flag.

**Impact:** enables a fast-path response for list-to-detail navigation or lightweight panels in admin UI while preserving full detail behavior by default.

## Additional bottlenecks to prioritize next

### A) Deep pagination and count cost on very large tables
Several list endpoints still rely on offset pagination plus exact `count(*)` on every request. This can degrade latency at high page depths.

**Recommendation:**
- Introduce cursor pagination for high-volume entities (notifications, feed, messages).
- Use approximate or cached totals where exact counts are unnecessary for UX.

### B) `npm audit` dependency scan blocked in current environment
`npm audit --omit=dev --json` failed with HTTP 403 from npm advisories endpoint in this execution environment.

**Recommendation:**
- Run audit in CI with an allowed registry token/egress.
- Add a CI security gate (`npm audit --audit-level=high` plus SBOM/SCA tooling).

## Validation performed
- Type check passed after code changes.
- Full integration tests could not run successfully in this environment due to missing required env vars for DB/Redis/JWT/MFA.
