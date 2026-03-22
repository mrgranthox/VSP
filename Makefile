SHELL := /bin/bash

STAGING_API_PORT ?= 3300
STAGING_ADMIN_PORT ?= 3401
STAGING_GATEWAY_PORT ?= 3302
STAGING_POSTGRES_PORT ?= 55432
STAGING_REDIS_PORT ?= 56379
STAGING_APP_BASE_URL ?= http://localhost:$(STAGING_API_PORT)
STAGING_ADMIN_API_BASE_URL ?= $(STAGING_APP_BASE_URL)/api/v1
STAGING_CORS_ALLOWED_ORIGINS ?= $(STAGING_APP_BASE_URL),http://localhost:$(STAGING_ADMIN_PORT),http://localhost:$(STAGING_GATEWAY_PORT)
STAGING_BACKEND_ENV_FILE ?= ./backend/.env
STAGING_BACKEND_COMPOSE_ENV_FILE ?= ./backend/.env.compose.example
STAGING_COMPOSE_ENV = BACKEND_ENV_FILE=$(STAGING_BACKEND_ENV_FILE) BACKEND_COMPOSE_ENV_FILE=$(STAGING_BACKEND_COMPOSE_ENV_FILE) API_PORT=$(STAGING_API_PORT) ADMIN_PORT=$(STAGING_ADMIN_PORT) WS_GATEWAY_PUBLISHED_PORT=$(STAGING_GATEWAY_PORT) POSTGRES_PORT=$(STAGING_POSTGRES_PORT) REDIS_PORT=$(STAGING_REDIS_PORT) APP_BASE_URL=$(STAGING_APP_BASE_URL) CDN_BASE_URL=$(STAGING_APP_BASE_URL) CORS_ALLOWED_ORIGINS=$(STAGING_CORS_ALLOWED_ORIGINS) ADMIN_VITE_API_BASE_URL=$(STAGING_ADMIN_API_BASE_URL) EVENT_BUS_MODE=queue

.PHONY: help backend-install backend-dev backend-workers backend-gateway backend-typecheck backend-test backend-build backend-ci backend-seed compose-up compose-down compose-seed staging-up staging-seed staging-gate staging-down

help:
	@printf "Available targets:\n"
	@printf "  backend-install   Install backend dependencies\n"
	@printf "  backend-dev       Start the backend API in watch mode\n"
	@printf "  backend-workers   Start background workers\n"
	@printf "  backend-gateway   Start the websocket gateway\n"
	@printf "  backend-typecheck Run TypeScript checks\n"
	@printf "  backend-test      Run backend integration tests\n"
	@printf "  backend-build     Build the backend\n"
	@printf "  backend-ci        Run the full backend CI script\n"
	@printf "  backend-seed      Seed deterministic fixture data\n"
	@printf "  compose-up        Boot the Docker Compose API stack\n"
	@printf "  compose-down      Stop the Docker Compose stack\n"
	@printf "  compose-seed      Run the Docker Compose seed job\n"
	@printf "  staging-up        Boot API, workers, gateway, and admin-web on alternate local ports\n"
	@printf "  staging-seed      Seed the staging-like Docker Compose database\n"
	@printf "  staging-gate      Run the release gate against the staging-like stack\n"
	@printf "  staging-down      Stop the staging-like Docker Compose stack\n"

backend-install:
	cd backend && npm ci

backend-dev:
	cd backend && npm run dev

backend-workers:
	cd backend && npm run workers

backend-gateway:
	cd backend && npm run gateway

backend-typecheck:
	cd backend && npm run typecheck

backend-test:
	cd backend && npm test

backend-build:
	cd backend && npm run build

backend-ci:
	cd backend && ./scripts/run-ci.sh

backend-seed:
	cd backend && npm run db:seed

compose-up:
	docker compose up --build api

compose-down:
	docker compose down

compose-seed:
	docker compose --profile setup run --rm seed

staging-up:
	$(STAGING_COMPOSE_ENV) docker compose --profile workers --profile realtime up -d --build postgres redis api workers gateway admin-web

staging-seed:
	$(STAGING_COMPOSE_ENV) docker compose --profile setup run --rm seed

staging-gate:
	cd backend && RELEASE_GATE_BASE_URL=http://127.0.0.1:$(STAGING_API_PORT) RELEASE_GATE_GATEWAY_URL=http://127.0.0.1:$(STAGING_GATEWAY_PORT) RELEASE_GATE_ADMIN_URL=http://127.0.0.1:$(STAGING_ADMIN_PORT) npm run release:gate

staging-down:
	$(STAGING_COMPOSE_ENV) docker compose down
