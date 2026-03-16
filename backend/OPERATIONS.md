# Backend Operations

This document covers the minimum operational workflows that should be exercised before onboarding real users.

## Backup

Create a PostgreSQL custom-format backup from the current `DATABASE_URL`:

```bash
cd backend
npm run ops:backup
```

Override the destination when you need a named release backup:

```bash
npm run ops:backup -- --output ./backups/pre-release.dump
```

## Restore Verification

Verify that backups can actually be restored:

```bash
cd backend
npm run ops:restore:verify
```

That command:

1. Creates a temporary dump if one is not supplied
2. Creates a scratch database on the same PostgreSQL cluster
3. Restores the dump into that scratch database
4. Verifies the restored database contains public tables
5. Verifies `_prisma_migrations` exists
6. Runs `prisma migrate status` against the restored database
7. Drops the scratch database on success or failure

If you already have a dump file, verify that one directly:

```bash
npm run ops:restore:verify -- --dump ./backups/pre-release.dump
```

Useful flags:

- `--database <name>` keeps the scratch database name deterministic for debugging
- `--keep-db` leaves the scratch database in place after verification
- `--keep-dump` keeps the generated temporary dump file

## Alerts

Minimal alerting is intentionally small in this phase. It is meant to catch week-one failures, not replace a full observability stack.

Set these environment variables:

```bash
ALERTS_ENABLED=true
ALERT_WEBHOOK_URL=https://your-alert-endpoint
ALERT_WEBHOOK_BEARER_TOKEN=optional-token
ALERT_WEBHOOK_TIMEOUT_MS=3000
```

Current alert sources:

- API startup failure
- Worker runtime startup failure
- Websocket gateway startup failure
- Uncaught exceptions and unhandled promise rejections in those runtimes
- Background jobs that fail after exhausting retries

## Metrics

Protected metrics endpoints:

- API: `GET /api/v1/internal/metrics`
- Gateway: `GET /metrics`

Send `x-internal-key: <INTERNAL_API_KEY>` when the key is configured.

For release verification against a running stack:

```bash
cd backend
npm run release:gate
```

Optional gateway verification:

```bash
RELEASE_GATE_GATEWAY_URL=http://127.0.0.1:3002 npm run release:gate
```

The release gate checks:

1. API metrics endpoint
2. API health and readiness
3. register/login/me/logout smoke flow
4. gateway health and metrics when `RELEASE_GATE_GATEWAY_URL` is set

## Secrets

Generate a fresh secret bundle:

```bash
cd backend
npm run ops:secrets:generate
```

To write file-backed secrets for mounted deployments:

```bash
npm run ops:secrets:generate -- --write-dir ./.secrets
```

That command writes secret files and prints matching `*_FILE` assignments such as:

```bash
JWT_PRIVATE_KEY_BASE64_FILE=/absolute/path/to/.secrets/jwt_private_key_base64.secret
```

Add those to your deployment environment instead of storing raw secret values in `.env`.

## Rotation

### JWT Keys

1. Generate a new secret set with `npm run ops:secrets:generate`
2. Set `JWT_PRIVATE_KEY_BASE64` and `JWT_PUBLIC_KEY_BASE64` to the new pair
3. Set `JWT_PUBLIC_KEY_BASE64_PREVIOUS` to the old public key
4. Deploy
5. Wait at least one full access-token TTL
6. Remove `JWT_PUBLIC_KEY_BASE64_PREVIOUS` in a follow-up deploy

### MFA Encryption Key

1. Generate a new `MFA_ENCRYPTION_KEY_BASE64`
2. Set `MFA_ENCRYPTION_KEY_BASE64` to the new value
3. Set `MFA_ENCRYPTION_KEY_BASE64_PREVIOUS` to the old value
4. Deploy
5. Run `npm run ops:mfa:rewrap -- --dry-run`
6. Run `npm run ops:mfa:rewrap`
7. Remove `MFA_ENCRYPTION_KEY_BASE64_PREVIOUS` only after the rewrap completes cleanly

The app decrypts MFA secrets with the current or previous key during the rotation window, but new writes always use the current key.

## Week-One Runbook

If a deploy fails:

1. Run `npm run ops:backup -- --output ./backups/pre-deploy.dump` before the deploy when the release includes schema or secret changes
2. Deploy the new app version and run `npm run db:migrate:deploy`
3. Check `GET /api/v1/health/ready`
4. Inspect API and worker logs for startup or migration errors
5. Run `npm run smoke:test`
6. If the database is suspect, run `npm run ops:restore:verify -- --dump ./backups/pre-deploy.dump`

If the app deploy regresses but the database is healthy:

1. Roll back the app image or release artifact
2. Re-run `npm run smoke:test`
3. Keep the database on the latest migration unless there is a proven migration fault

If the database change itself is bad:

1. Stop write traffic if possible
2. Verify the latest good dump with `npm run ops:restore:verify -- --dump ./backups/pre-deploy.dump`
3. Restore only with an explicit incident decision, because Prisma migrations are forward-only in this repo today

If a worker backlog grows:

1. Check worker logs for retry exhaustion alerts
2. Check Redis connectivity and queue mode configuration
3. Restart the worker runtime only after confirming the underlying failing job type
