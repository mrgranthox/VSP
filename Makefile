SHELL := /bin/bash

.PHONY: help backend-install backend-dev backend-workers backend-gateway backend-typecheck backend-test backend-build backend-ci backend-seed compose-up compose-down compose-seed

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
