# VSP Backend

Backend runtime for the Vocational Services Platform.

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+
- PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) for backup and restore verification
- Redis 7+
- Docker Desktop or Docker Engine with Compose, if you want the containerized flow

## Native Boot

1. Copy the environment file and fill in the secrets:

   ```bash
   cd backend
   cp .env.example .env
   ```

2. Set these values in `.env` before using auth or MFA:

   - `JWT_PRIVATE_KEY_BASE64`
   - `JWT_PUBLIC_KEY_BASE64`
   - `MFA_ENCRYPTION_KEY_BASE64`

   For production-like environments, prefer mounted secret files over raw inline values. Any env key can be supplied as `<KEY>_FILE`, for example `JWT_PRIVATE_KEY_BASE64_FILE=/run/secrets/jwt_private_key_base64.secret`.

   To generate a fresh secret set:

   ```bash
   npm run ops:secrets:generate
   npm run ops:secrets:generate -- --write-dir ./.secrets
   ```

3. Install dependencies, apply migrations, seed fixture data, and start the API:

   ```bash
   npm install
   npm run db:migrate:deploy
   npm run db:seed
   npm run dev
   ```

   If you change the Prisma schema locally, create a named migration instead of using `db push`:

   ```bash
   npm run db:migrate:dev -- --name describe_change
   ```

4. Optional runtimes:

   ```bash
   npm run workers
   npm run gateway
   ```

5. Verify the API:

   ```bash
   curl http://localhost:3000/api/v1/health
   curl http://localhost:3000/api/v1/health/ready
   curl -H "x-internal-key: $INTERNAL_API_KEY" http://localhost:3000/api/v1/internal/metrics
   curl -H "authorization: Bearer $INTERNAL_API_KEY" http://localhost:3000/api/v1/internal/metrics
   npm run smoke:test
   npm run release:gate
   ```

## Operations

Run the backup and restore checks from `backend/`:

```bash
npm run ops:backup
npm run ops:restore:verify
```

- `ops:backup` writes a PostgreSQL custom-format dump under `backend/backups/` by default. Override the location with `npm run ops:backup -- --output ./backups/pre-release.dump`.
- `ops:restore:verify` creates a fresh backup if you do not provide one, restores it into a scratch database, checks the public table count, checks `_prisma_migrations`, and runs `prisma migrate status` against the restored copy.
- To verify a specific dump file, run `npm run ops:restore:verify -- --dump ./backups/pre-release.dump`.
- `ops:secrets:generate` prints a fresh secret set. Use `--write-dir ./.secrets` to write file-backed secrets and print matching `*_FILE` entries.
- `ops:mfa:rewrap` re-encrypts stored MFA secrets with the current `MFA_ENCRYPTION_KEY_BASE64`. Use `--dry-run` first during key rotation.
- `release:gate` verifies `health`, `ready`, the internal metrics endpoint, and the auth smoke flow against a running server.
- `ops:tracing:verify` starts a local OTLP receiver, boots the built API with tracing enabled, runs the release gate, and fails unless real spans are exported. Run `npm run build` first when invoking it manually.
- `ops:error-reporting:verify` starts a local Sentry-compatible receiver, emits a test exception through the runtime error-reporting path, and fails unless an envelope is delivered.
- `api:contracts:generate` emits `contracts/openapi.json`, `reports/route-inventory.json`, and the static HTTP test coverage reports.
- `api:contracts:check` verifies those generated artifacts are up to date.

Minimal operational alerting is also supported:

- `ALERTS_ENABLED=true`
- `ALERT_WEBHOOK_URL=https://your-alert-endpoint`
- `ALERT_WEBHOOK_BEARER_TOKEN=...` if your webhook needs auth

When enabled, the API, workers, and websocket gateway raise alerts on startup failure, fatal runtime errors, and final background job failures after retries are exhausted.

JWT verification also supports `JWT_PUBLIC_KEY_BASE64_PREVIOUS` during key rotation, so existing access tokens can remain valid until the access-token TTL expires.

Optional Sentry-compatible error reporting is also supported:

- `SENTRY_ENABLED=true`
- `SENTRY_DSN=https://public@your-sentry-host/project-id`
- `SENTRY_ENVIRONMENT=production`
- `SENTRY_RELEASE=git-sha-or-version`

## Observability

- API metrics: `GET /api/v1/internal/metrics` with `x-internal-key` or `Authorization: Bearer <INTERNAL_API_KEY>`
- Gateway metrics: `GET /metrics` with `x-internal-key` or `Authorization: Bearer <INTERNAL_API_KEY>`
- API responses now include `X-Trace-ID` and `Traceparent`, and the standard response envelope includes `meta.traceId` for request-level correlation.
- Optional OTLP tracing is supported for API, workers, and gateway through `TRACING_ENABLED=true`.
- `ops:tracing:verify` is the local proof that the traced runtime exports OTLP spans, not just that tracing config exists.
- `ops:error-reporting:verify` is the local proof that runtime exceptions are delivered to a Sentry-compatible ingestion endpoint.
- Prometheus now exposes dependency check timing/failure metrics and operational alert delivery metrics, so alerting and readiness are themselves observable.
- API contract artifacts now live under `backend/contracts/` and `backend/reports/`, including a generated OpenAPI 3.1 document and a static HTTP route coverage report.

The metrics surface includes:

- process and Node runtime metrics via Prometheus format
- HTTP request count, latency, and in-flight request gauges
- readiness gauges for API dependencies
- BullMQ queue depth gauges
- background job success/failure counters
- websocket connection and event counters in the gateway runtime

The repo also includes a ready-to-run monitoring stack under `backend/observability/`:

- Prometheus scrape config and alert rules
- Alertmanager routing config and local webhook sink
- Grafana provisioning and a VSP backend overview dashboard
- Jaeger can be enabled locally as an OTLP trace backend

## Docker Compose

The repo root includes [`compose.yml`](/home/edward-nyame/Desktop/VJS/compose.yml). It uses:

- `postgres` on `localhost:5432`
- `redis` on `localhost:6379`
- `api` on `localhost:3000`
- `gateway` on `localhost:3002` when the `realtime` profile is enabled
- `typesense` on `localhost:8108` when the `search` profile is enabled
- `prometheus` on `localhost:9090` when the `monitoring` profile is enabled
- `grafana` on `localhost:3001` when the `monitoring` profile is enabled
- `alertmanager` on `localhost:9093` when the `monitoring` profile is enabled
- `alert-echo` on `localhost:18080` when the `monitoring` profile is enabled
- `jaeger` on `localhost:16686` when the `tracing` profile is enabled

If those ports are already taken on your machine, override them at launch time with `API_PORT`, `WS_GATEWAY_PUBLISHED_PORT`, `POSTGRES_PORT`, `REDIS_PORT`, or `TYPESENSE_PUBLISHED_PORT`.

Compose reads:

- `.env.example` for the general backend defaults
- `.env.compose.example` for container-specific overrides and dev-only JWT/MFA defaults

### API Only

```bash
docker compose up --build api
```

Example with alternate host ports:

```bash
API_PORT=3300 POSTGRES_PORT=55432 REDIS_PORT=56379 \
APP_BASE_URL=http://localhost:3300 \
docker compose up --build api
```

### Seed the Database

```bash
docker compose --profile setup run --rm seed
```

### API + Workers

Workers only process queued events if the API publishes to the queue. For that mode, start the stack with `EVENT_BUS_MODE=queue`.

```bash
EVENT_BUS_MODE=queue docker compose --profile workers up --build
```

### API + Workers + Gateway

```bash
EVENT_BUS_MODE=queue docker compose --profile workers --profile realtime up --build
```

### Monitoring Stack

This profile starts Prometheus, Alertmanager, a local alert webhook sink, and Grafana against the protected API and gateway metrics endpoints. The compose defaults use the same `INTERNAL_API_KEY` as `.env.compose.example`.

```bash
EVENT_BUS_MODE=queue docker compose --profile workers --profile realtime --profile monitoring up --build
```

Grafana defaults:

- URL: `http://localhost:3001`
- username: `admin`
- password: `admin`

Alertmanager defaults:

- UI: `http://localhost:9093`
- local webhook sink: `http://localhost:18080`
- inspect local alert deliveries with `docker compose logs -f alert-echo`

### Tracing Stack

This profile starts Jaeger with OTLP HTTP enabled. Point the backend runtimes at it with:

```bash
TRACING_ENABLED=true \
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4318/v1/traces \
EVENT_BUS_MODE=queue \
docker compose --profile workers --profile realtime --profile tracing up --build
```

Jaeger defaults:

- UI: `http://localhost:16686`
- OTLP HTTP collector: `http://localhost:4318/v1/traces`

### Enable Typesense

Typesense is optional. Start it with the `search` profile and point the app services at the container hostname.

```bash
EVENT_BUS_MODE=queue \
TYPESENSE_HOST=typesense \
TYPESENSE_API_KEY=dev-typesense-api-key \
docker compose --profile workers --profile realtime --profile search up --build
```

## Seed Fixtures

The seed is deterministic and safe to rerun. Default fixture password:

```text
Change-This-Password-123!
```

Default fixture users:

- `superadmin@vocationalplatform.com`
- `admin@vocationalplatform.com`
- `moderator@vocationalplatform.com`
- `support@vocationalplatform.com`
- `alice@example.com`
- `bob@example.com`
- `unverified@example.com`

Override the super admin email with `SEED_ADMIN_EMAIL` and the shared fixture password with `SEED_ADMIN_PASSWORD`.

## Health Checks

- API liveness: `GET /api/v1/health`
- API readiness: `GET /api/v1/health/ready`
- Gateway: `GET /health`

The API health routes return the standard response envelope. The websocket gateway keeps a minimal standalone health response because it is not an Express app.

## CI

The repo now includes [`backend-ci.yml`](/home/edward-nyame/Desktop/VJS/.github/workflows/backend-ci.yml), which runs the backend check pipeline on pushes, pull requests, and manual dispatches.

For the same sequence locally:

```bash
cd backend
./scripts/run-ci.sh
```

The script loads `.env` and `.env.local` when they exist, provisions ephemeral JWT and MFA secrets when they are not already set, and then runs Prisma validation, Prisma generate, `migrate deploy`, deterministic seed, typecheck, API artifact drift checks, tests, the production build, traced-runtime export verification, and error-reporting delivery verification against the built server.

It now also verifies the backup and restore path by creating a dump, restoring it into a scratch database, and checking Prisma migration status against the restored copy.
