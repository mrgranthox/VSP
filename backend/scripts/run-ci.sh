#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export NODE_ENV="${NODE_ENV:-test}"
export RATE_LIMIT_ENABLED="${RATE_LIMIT_ENABLED:-false}"
export TWILIO_VERIFY_MOCK_MODE="${TWILIO_VERIFY_MOCK_MODE:-true}"
export PORT="${PORT:-3100}"
export APP_BASE_URL="${APP_BASE_URL:-http://127.0.0.1:${PORT}}"
export CDN_BASE_URL="${CDN_BASE_URL:-https://cdn.ci.local}"
export STORAGE_SIGNING_SECRET="${STORAGE_SIGNING_SECRET:-ci-storage-secret}"
export INTERNAL_API_KEY="${INTERNAL_API_KEY:-ci-internal-key}"
export LOG_LEVEL="${LOG_LEVEL:-warn}"

load_env_file() {
  local env_file="$1"

  [[ -f "$env_file" ]] || return 0

  while IFS= read -r assignment; do
    [[ -n "$assignment" ]] || continue
    export "$assignment"
  done < <(
    ENV_FILE="$env_file" node <<'NODE'
const fs = require("node:fs");
const dotenv = require("dotenv");

const envFile = process.env.ENV_FILE;
const parsed = dotenv.parse(fs.readFileSync(envFile));

for (const [key, value] of Object.entries(parsed)) {
  if (process.env[key] === undefined) {
    console.log(`${key}=${value}`);
  }
}
NODE
  )
}

load_env_file ".env.local"
load_env_file ".env"

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/vsp_ci?schema=public}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"

if [[ -z "${JWT_PRIVATE_KEY_BASE64:-}" || -z "${JWT_PUBLIC_KEY_BASE64:-}" ]]; then
  mapfile -t jwt_keys < <(node <<'NODE'
const { generateKeyPairSync } = require("node:crypto");

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" }
});

console.log(Buffer.from(privateKey).toString("base64"));
console.log(Buffer.from(publicKey).toString("base64"));
NODE
)

  export JWT_PRIVATE_KEY_BASE64="${jwt_keys[0]}"
  export JWT_PUBLIC_KEY_BASE64="${jwt_keys[1]}"
fi

if [[ -z "${MFA_ENCRYPTION_KEY_BASE64:-}" ]]; then
  export MFA_ENCRYPTION_KEY_BASE64="$(node -e 'process.stdout.write(require(\"node:crypto\").randomBytes(32).toString(\"base64\"))')"
fi

echo "[ci] validating Prisma schema"
npm run prisma:validate

echo "[ci] generating Prisma client"
npx prisma generate

echo "[ci] applying migrations to ${DATABASE_URL}"
npm run db:migrate:deploy

echo "[ci] seeding deterministic fixtures"
npm run db:seed

echo "[ci] typechecking"
npm run typecheck

echo "[ci] running tests"
npm test

echo "[ci] building production bundle"
npm run build

echo "[ci] verifying backup and restore path"
npm run ops:restore:verify

echo "[ci] starting built server for smoke tests"
SERVER_LOG="$(mktemp)"
node dist/src/server.js >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

cleanup_server() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup_server EXIT

for attempt in $(seq 1 30); do
  if curl -fsS "${APP_BASE_URL}/api/v1/health/ready" >/dev/null 2>&1; then
    break
  fi

  if [[ "$attempt" -eq 30 ]]; then
    echo "[ci] smoke server failed to become ready"
    cat "$SERVER_LOG"
    exit 1
  fi

  sleep 1
done

echo "[ci] running HTTP smoke tests"
RELEASE_GATE_BASE_URL="${APP_BASE_URL}" npm run release:gate
