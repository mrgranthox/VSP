# VSP Workspace

Monorepo workspace for the Vocational Services Platform.

## Current State

- `backend/` contains the implemented Express, TypeScript, Prisma, Redis, websocket, media, queue, and admin backend.
- `frontend-admin/` contains the implemented React admin console wired to the live backend.
- `frontend-web/` and `frontend-mobile/` are present as the next workspace targets.
- `doc/` contains the canonical system-design packs and prompt packs that drive implementation.

## Repo Entry Points

- Backend runtime and local setup: [`backend/README.md`](/home/edward-nyame/Desktop/VJS/backend/README.md)
- Admin frontend runtime and local setup: [`frontend-admin/README.md`](/home/edward-nyame/Desktop/VJS/frontend-admin/README.md)
- Docker Compose stack: [`compose.yml`](/home/edward-nyame/Desktop/VJS/compose.yml)
- Backend CI workflow: [`.github/workflows/backend-ci.yml`](/home/edward-nyame/Desktop/VJS/.github/workflows/backend-ci.yml)

## Common Commands

From the repo root:

```bash
make help
make backend-install
make backend-dev
make backend-ci
make compose-up
make compose-seed
make compose-down
make staging-up
make staging-seed
make staging-gate
make staging-down
```

If you prefer not to use `make`, the same backend commands are documented in [`backend/README.md`](/home/edward-nyame/Desktop/VJS/backend/README.md).

## Staging-Like Local Stack

For end-to-end backend + admin verification before a real hosted staging environment exists:

1. Copy the root staging env template if you want persisted compose overrides:

   ```bash
   cp .env.staging.example .env
   ```

2. Boot the full local staging-like stack:

   ```bash
   make staging-up
   make staging-seed
   make staging-gate
   ```

That stack uses alternate local ports by default so it can run beside other dev services:

- API: `http://localhost:3300`
- admin-web: `http://localhost:3401`
- websocket gateway: `http://localhost:3302`
- PostgreSQL: `localhost:55432`
- Redis: `localhost:56379`

When you are done:

```bash
make staging-down
```

## Backend Verification

The backend now has three standard verification paths:

- native local checks through `backend/scripts/run-ci.sh`
- containerized runtime checks through `compose.yml`
- GitHub Actions verification through `.github/workflows/backend-ci.yml`

## Next Workspace Targets

The next large implementation areas, if you want to keep pushing forward from here, are:

- scaffold `frontend-web/`
- scaffold `frontend-mobile/`
