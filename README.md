# VSP Workspace

Monorepo workspace for the Vocational Services Platform.

## Current State

- `backend/` contains the implemented Express, TypeScript, Prisma, Redis, websocket, media, queue, and admin backend.
- `frontend-admin/`, `frontend-web/`, and `frontend-mobile/` are present as workspace targets but are not scaffolded yet.
- `doc/` contains the canonical system-design packs and prompt packs that drive implementation.

## Repo Entry Points

- Backend runtime and local setup: [`backend/README.md`](/home/edward-nyame/Desktop/VJS/backend/README.md)
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
```

If you prefer not to use `make`, the same backend commands are documented in [`backend/README.md`](/home/edward-nyame/Desktop/VJS/backend/README.md).

## Backend Verification

The backend now has three standard verification paths:

- native local checks through `backend/scripts/run-ci.sh`
- containerized runtime checks through `compose.yml`
- GitHub Actions verification through `.github/workflows/backend-ci.yml`

## Next Workspace Targets

The next large implementation areas, if you want to keep pushing forward from here, are:

- scaffold `frontend-admin/`
- scaffold `frontend-web/`
- scaffold `frontend-mobile/`
