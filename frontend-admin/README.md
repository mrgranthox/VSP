# VSP Admin Frontend

React + TypeScript + Vite admin console for the Vocational Services Platform.

## Local Development

```bash
cd frontend-admin
npm install
npm run dev
```

Set the API target in `.env` or `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=VSP Admin
VITE_APP_RELEASE=local
VITE_ERROR_REPORTING_ENABLED=true
VITE_ERROR_REPORTING_ENDPOINT=
```

## Production Build

```bash
cd frontend-admin
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

## Docker

The admin frontend ships with a production image in [`frontend-admin/Dockerfile`](/home/edward-nyame/Desktop/VJS/frontend-admin/Dockerfile).

Build args:

- `VITE_API_BASE_URL`
- `VITE_APP_NAME`

Example:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=http://localhost:3000/api/v1 \
  --build-arg VITE_APP_NAME="VSP Admin" \
  -t vsp-admin:local \
  frontend-admin
```

Run it:

```bash
docker run --rm -p 4173:80 vsp-admin:local
```

Health check:

```bash
curl http://localhost:4173/healthz
```

## Browser E2E

Playwright covers the critical live admin workflows against the real backend:

- seeded super-admin session bootstrap
- TOTP MFA setup and session step-up
- notifications inbox and detail desk
- reports, moderation cases, fraud signals, and support bulk operations
- CSV exports for the operator desks
- role access boundaries for moderator and support accounts

Before running E2E, make sure:

1. the database is seeded with the standard admin accounts
2. the admin frontend dependencies are installed

Install the browser once:

```bash
cd frontend-admin
npm run e2e:install
```

Run the suite:

```bash
cd frontend-admin
npm run e2e
```

The Playwright config will reuse an existing admin dev server on `http://localhost:3001` and backend API on `http://127.0.0.1:3000`, or start them automatically.

## Frontend Error Reporting

The admin console can forward runtime errors to an external collector or lightweight webhook.

Environment variables:

- `VITE_ERROR_REPORTING_ENABLED`
- `VITE_ERROR_REPORTING_ENDPOINT`
- `VITE_APP_RELEASE`

Verify delivery locally:

```bash
cd frontend-admin
npm run ops:error-reporting:verify
```

That verifier starts a local receiver, boots the Vite app with error reporting enabled, opens the dev-only error boundary probe route, and asserts that a frontend runtime error is delivered.

Seeded accounts used by the browser suite:

- `superadmin@vocationalplatform.com`
- `moderator@vocationalplatform.com`
- `support@vocationalplatform.com`

Shared seed password:

```text
Change-This-Password-123!
```

## Staging

The repo root [`compose.yml`](/home/edward-nyame/Desktop/VJS/compose.yml) now includes an `admin-web` service. Use it together with the backend API and seed job so the admin console points at a real staging backend, not local mocks.
