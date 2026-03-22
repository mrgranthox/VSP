#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STAGING_API_PORT="${STAGING_API_PORT:-3300}"
STAGING_ADMIN_PORT="${STAGING_ADMIN_PORT:-3401}"
KEEP_STAGING_UP="${KEEP_STAGING_UP:-false}"
started_staging="false"

cleanup() {
  if [[ "$started_staging" == "true" && "$KEEP_STAGING_UP" != "true" ]]; then
    make staging-down >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

echo "[hard-gate] backend ci"
(cd backend && ./scripts/run-ci.sh)

echo "[hard-gate] admin typecheck"
(cd frontend-admin && npm run typecheck)

echo "[hard-gate] admin build"
(cd frontend-admin && npm run build)

echo "[hard-gate] admin error-reporting verification"
(cd frontend-admin && npm run ops:error-reporting:verify)

echo "[hard-gate] admin browser verification (isolated local harness)"
(cd frontend-admin && npm run e2e)

echo "[hard-gate] resetting staging-like stack"
make staging-down >/dev/null 2>&1 || true

echo "[hard-gate] booting staging-like stack"
make staging-up
started_staging="true"

echo "[hard-gate] seeding staging-like stack"
make staging-seed

echo "[hard-gate] backend release gate against staging-like stack"
make staging-gate

echo "[hard-gate] admin browser verification against staging-like stack"
(
  cd frontend-admin
  E2E_USE_EXISTING_SERVER=true \
  E2E_BACKEND_BASE_URL="http://localhost:${STAGING_API_PORT}" \
  E2E_FRONTEND_BASE_URL="http://localhost:${STAGING_ADMIN_PORT}" \
  npm run e2e:staging
)

echo "[hard-gate] final gate passed"
