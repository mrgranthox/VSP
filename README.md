# Vocational Services Platform (VSP)

> **Enterprise Monorepo**: Production-grade platform connecting residential and commercial clients with verified vocational tradespeople and skilled service professionals. Features an Express/TypeScript modular monolith, Redis/BullMQ background processors, real-time WebSocket gateway, React 18 administrative control plane, and a 41-screen Flutter mobile application for Android & iOS.

[![CI Pipeline](https://github.com/mrgranthox/VSP/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/mrgranthox/VSP/actions)
[![Flutter Analyze](https://img.shields.io/badge/Flutter%20Analyze-0%20Issues-brightgreen.svg)](mobile)
[![Flutter Tests](https://img.shields.io/badge/Flutter%20Tests-12%2F12%20Passing-brightgreen.svg)](mobile)
[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-Passing-brightgreen.svg)](backend)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%20Strict-blue.svg)](backend)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-informational.svg)](backend/prisma)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Monorepo Structure](#monorepo-structure)
3. [Technology Stack](#technology-stack)
4. [Domain Capabilities & Personas](#domain-capabilities--personas)
5. [Prerequisites](#prerequisites)
6. [Quick Start (Local Development)](#quick-start-local-development)
7. [Physical Android Device Deployment (USB + ADB)](#physical-android-device-deployment-usb--adb)
8. [Environment Configuration Reference](#environment-configuration-reference)
9. [Pre-Seeded Evaluation Credentials](#pre-seeded-evaluation-credentials)
10. [REST API & Real-Time Gateway Protocols](#rest-api--real-time-gateway-protocols)
11. [Testing & Quality Verification](#testing--quality-verification)
12. [Observability & Security Operations](#observability--security-operations)
13. [Makefile & Tooling Index](#makefile--tooling-index)
14. [License](#license)

---

## System Architecture

VSP follows a decoupled, modular multi-tier architecture designed for horizontal scalability, zero-downtime rolling deployments, and strict operational separation:

```mermaid
flowchart TD
    subgraph Clients["Presentation & Edge Tier"]
        Mobile["Flutter Mobile App<br/>(Customer & Worker Personas · 41 Screens)<br/>Android / iOS / Web"]
        AdminDesk["Admin Console<br/>(React 18 · Vite · Tailwind · React Query)"]
    end

    subgraph Edge["Gateway & Traffic Distribution"]
        Proxy["Nginx Reverse Proxy / Cloudflare Edge"]
        RateLimit["Distributed Redis Rate Limiter & Security Headers"]
    end

    subgraph BackendRuntimes["Core Application Tier (Express + TypeScript Monolith)"]
        API["HTTP API Server (:3000)<br/>REST Endpoints · Auth · Validation · Business Logic"]
        Gateway["WebSocket Gateway (:3002)<br/>Real-Time Presence · Chat Streams · Notifications"]
        Workers["BullMQ Job Workers<br/>Async Media · Push Notifications · Cleanup · Indexing"]
    end

    subgraph Persistence["Persistence, Cache & Queue Tier"]
        PG[("PostgreSQL 16<br/>41 Relational Tables · Foreign Keys · Indexes")]
        RedisStore[("Redis 7<br/>Session Blacklist · Pub/Sub · Job Queues")]
        SearchEngine[("Typesense Engine (Optional)<br/>Fast Geospatial & Full-Text Search")]
    end

    subgraph Telemetry["Observability & Operations"]
        Prometheus["Prometheus Metrics (:9090)"]
        Grafana["Grafana Dashboards (:3003)"]
        Jaeger["Jaeger OTLP Traces (:16686)"]
        Alerts["Alertmanager Routing (:9093)"]
    end

    Mobile -->|HTTPS REST| Proxy
    Mobile -->|WSS Socket| Gateway
    AdminDesk -->|HTTPS REST| Proxy

    Proxy --> RateLimit --> API
    Gateway <-->|Redis PubSub| RedisStore

    API -->|Prisma ORM| PG
    API -->|Cache / Push Jobs| RedisStore
    API -.->|Search Indexing| SearchEngine

    Workers -->|Consume Jobs| RedisStore
    Workers -->|Persistence| PG

    API & Gateway & Workers -->|Metrics Export| Prometheus
    Prometheus --> Grafana
    API & Gateway & Workers -.->|Distributed Traces| Jaeger
    Prometheus --> Alerts
```

---

## Monorepo Structure

```text
.
├── backend/                       # Node.js + Express + Prisma Monolith Core
│   ├── contracts/                 # Generated OpenAPI 3.1 & route contract specs
│   ├── observability/             # Prometheus metrics, Alertmanager & Grafana configs
│   ├── prisma/                    # Schema definitions, migrations, and database seeders
│   │   ├── schema.prisma          # 41 Prisma models with relational constraints
│   │   └── seed.ts                # Production-grade idempotent seed fixtures
│   ├── reports/                   # Route inventory, test coverage & lint artifacts
│   ├── scripts/                   # Zero-downtime backup, restore, MFA rewrap & ops scripts
│   └── src/
│       ├── bootstrap/             # Runtimes: api.ts, workers.ts, gateway.ts
│       ├── config/                # Validated environment schemas (Zod)
│       ├── database/              # Prisma client initialization & query extensions
│       ├── gateway/               # WebSocket connection manager, heartbeat & pub/sub
│       ├── middleware/            # RSA JWT auth, RBAC, error filters, rate limiters
│       ├── modules/               # Domain feature modules (auth, admin, requests, chat, etc.)
│       ├── queues/                # BullMQ queue definitions and scheduler jobs
│       └── workers/               # Async worker processors
│
├── frontend-admin/                # React 18 Admin Web Application
│   ├── e2e/                       # Playwright browser automation test suites
│   ├── public/                    # Branding and static web assets
│   ├── scripts/                   # Build verifiers and error reporting validation
│   └── src/
│       ├── components/            # Reusable UI component library
│       ├── features/              # Modular admin features (users, tickets, moderation, metrics)
│       ├── lib/                   # API client, auth session context & formatters
│       └── pages/                 # Top-level route pages
│
├── mobile/                        # Flutter 3.x / Dart 3.x Native Mobile Client
│   ├── android/                   # Native Android wrapper (permissions, cleartext config)
│   ├── ios/                       # Native iOS runner & Xcode project configurations
│   ├── lib/
│   │   ├── core/                  # Constants, network clients (REST/WS), theme & storage
│   │   │   ├── constants/         # API routes, color tokens, typography scales
│   │   │   ├── network/           # ApiClient (HTTP + interceptors), WebSocketClient
│   │   │   ├── storage/           # StorageService (Encrypted / SharedPreferences tokens)
│   │   │   └── theme/             # Nunito + Inter typography, light & dark palettes
│   │   ├── data/
│   │   │   ├── models/            # Domain models (User, Worker, Booking, Chat, Review)
│   │   │   └── repositories/      # 11 Clean Architecture repositories
│   │   └── presentation/
│   │       ├── providers/         # 9 ChangeNotifier business logic providers
│   │       ├── routes/            # GoRouter configuration with dynamic aliases
│   │       ├── screens/           # 41 mobile screens (Auth, Customer Shell, Worker Shell)
│   │       └── widgets/           # Atomic UI elements (cards, badges, pills, text fields)
│   └── test/                      # Unit and widget test suite (12/12 passing)
│
├── compose.yml                    # Main Docker Compose multi-service orchestration
├── Makefile                       # Developer shortcuts for build, test, and release
└── README.md                      # Monorepo architecture & operations documentation
```

---

## Technology Stack

| Layer | Component | Technologies & Libraries |
| :--- | :--- | :--- |
| **Backend Core** | Runtime & API | **Node.js 22 LTS**, **TypeScript 5.8** (Strict mode), **Express 4.21** |
| | Database & Cache | **PostgreSQL 16**, **Prisma ORM 5.22**, **Redis 7** (`ioredis`) |
| | Queues & Real-Time | **BullMQ 5.16**, **WebSocket** (`ws` 8.18) with Redis Pub/Sub |
| | Security & Crypto | **RSA-256 JWT** (`jsonwebtoken`), **bcrypt**, **otplib** (TOTP MFA), **AES-256-GCM** |
| **Admin Console** | Frontend Framework | **React 18.3**, **Vite 5.4**, **TypeScript 5.6** |
| | UI & Styling | **Tailwind CSS 3.4**, **Lucide React**, **Recharts 3.8**, **Sonner** |
| | State & Forms | **TanStack React Query 5.91**, **React Hook Form 7**, **Zod 4** |
| | Testing | **Playwright 1.55**, **`@axe-core/playwright`** (Accessibility testing) |
| **Mobile App** | Framework & SDK | **Flutter 3.47**, **Dart 3.13** |
| | State Management | **Provider 6.1** (`ChangeNotifier` architecture) |
| | Navigation & Routing | **GoRouter 14.8** (Declarative routing + shorthand redirects) |
| | Networking & IO | **`http` 1.2**, **`web_socket_channel` 3.0**, **`shared_preferences` 2.3** |
| | Typography & Design | **Google Fonts 6.2** (Nunito + Inter with offline caching) |
| **DevOps & Observability** | Orchestration | **Docker 27**, **Docker Compose v2** |
| | Metrics & Dashboards | **Prometheus 2.54**, **Grafana 11.1**, **Alertmanager 0.27** |
| | Tracing & Errors | **OpenTelemetry Node SDK**, **Jaeger 1.61**, **Sentry SDK 10.4** |

---

## Domain Capabilities & Personas

### 1. Customer Persona (Mobile)
- **Discovery & Search**: Localized vocational trades search (Electrician, Plumber, Carpenter, HVAC, Cleaner, Mason, etc.) filtered by GPS distance, ratings, price tier, and verified badges.
- **Service Request Pipeline**: Submit requests with location details, images, scheduling windows, and receive competitive quotes from nearby tradespeople.
- **Bookings Engine**: Real-time booking tracking from confirmation through in-progress work to completion.
- **Real-Time Communication**: In-app encrypted WebSocket chat with typing indicators and notification delivery.
- **Ratings & Reviews**: Post-service rating and verified review submissions.

### 2. Worker / Tradesperson Persona (Mobile)
- **Onboarding Wizard**: Step-by-step verification wizard (trades, service areas, licenses, certifications, ID verification, and hourly rates).
- **Leads & Request Management**: Instant notifications of new localized service requests, quote submission, and scheduling.
- **Job Execution**: Live status transitions (`ACCEPTED` $\to$ `IN_PROGRESS` $\to$ `COMPLETED`).
- **Worker Analytics & Portfolio**: Real-time earnings summary, rating history, completed job counts, and media portfolio showcase.

### 3. Administrator Persona (Web Console)
- **Operations Control Plane**: Platform telemetry, transaction volume, active jobs, and worker capacity heatmaps.
- **KYC & Verification Desks**: Review worker licenses, insurance documentation, and approve/reject verification status.
- **Moderation & Fraud Prevention**: Flagged post reviews, dispute mediation, and user suspension controls.
- **Support Ticketing**: Ticket triage, priority assignments, and internal operator notes.

---

## Prerequisites

Before starting local development, ensure the following dependencies are installed on your host system:

- **Node.js**: `>= 20.0.0 LTS`
- **npm**: `>= 10.0.0`
- **Docker & Docker Compose**: v2.20+
- **Flutter SDK**: `>= 3.24.0` (with Dart `>= 3.5.0`)
- **Android SDK & platform-tools**: `adb` tool in your system `PATH` (for physical device or emulator execution)

---

## Quick Start (Local Development)

### Step 1: Start Core Infrastructure (Docker)
Start the PostgreSQL 16 database and Redis 7 cache from the workspace root:

```bash
cd /home/edward-nyame/VSP
docker compose up -d postgres redis
```

*Note: PostgreSQL is exposed on host port `5433` (container port 5432) to prevent conflicts with existing local PostgreSQL instances. Redis is available on port `6379`.*

### Step 2: Configure & Start Backend Monolith
```bash
cd /home/edward-nyame/VSP/backend

# Install dependencies
npm install

# Run database migrations and seed baseline data
npm run db:migrate:deploy
npm run db:seed

# Start the API server in watch mode (:3000)
npm run dev
```

In separate terminal tabs, start the background worker and WebSocket gateway runtimes:
```bash
cd /home/edward-nyame/VSP/backend
npm run workers     # Background job processor (BullMQ)
npm run gateway     # WebSocket gateway server (:3002)
```

### Step 3: Start Admin Web Console
```bash
cd /home/edward-nyame/VSP/frontend-admin

# Install dependencies and start Vite dev server (:3001)
npm install
npm run dev
```
Open **`http://localhost:3001`** in your browser.

### Step 4: Run Mobile Application (Flutter)
To run on your desktop browser (Chrome):
```bash
cd /home/edward-nyame/VSP/mobile
flutter run -d chrome
```

---

## Physical Android Device Deployment (USB + ADB)

To run the mobile app on a physical Android device connected via USB (e.g., **Samsung Galaxy M11**):

### 1. Enable USB Debugging
Enable **Developer Options** on your phone (tap *Build Number* 7 times in *Settings > About Phone*) and toggle on **USB Debugging**.

### 2. Verify Device Connection
```bash
adb devices -l
# Expected output:
# R9JN30HACLJ    device usb:2-2 product:m11qnnxx model:SM_M115F device:m11q
```

### 3. Establish Reverse Port Tunneling
Forward device local ports to your development host so the mobile app can reach the backend without needing external network/WiFi connectivity:
```bash
adb reverse tcp:3000 tcp:3000   # HTTP REST API
adb reverse tcp:3002 tcp:3002   # WebSocket Gateway
```

### 4. Build & Install Debug APK
```bash
cd /home/edward-nyame/VSP/mobile

# Fast assemble debug APK
flutter build apk --debug

# Install directly to attached device
adb install -r build/app/outputs/flutter-apk/app-debug.apk

# Launch the app
adb shell am start -n com.vsp.vsp_mobile/.MainActivity
```

*Tip: You can also execute live hot-reload development using:*
```bash
flutter run -d <DEVICE_ID>
```

---

## Environment Configuration Reference

### Backend Core (`backend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | API HTTP port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5433/vsp_dev?schema=public` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `WS_GATEWAY_PORT` | WebSocket gateway port | `3002` |
| `JWT_PRIVATE_KEY_BASE64` | Base64-encoded RSA-256 private key | Generated via `npm run ops:secrets:generate` |
| `JWT_PUBLIC_KEY_BASE64` | Base64-encoded RSA-256 public key | Generated via `npm run ops:secrets:generate` |
| `JWT_PUBLIC_KEY_BASE64_PREVIOUS` | Fallback public key for zero-downtime key rotation | Optional |
| `MFA_ENCRYPTION_KEY_BASE64` | 32-byte AES-256 key for encrypted TOTP/SMS secrets | Generated via `npm run ops:secrets:generate` |
| `STORAGE_SIGNING_SECRET` | Secret key for signed media URLs | Generated via `npm run ops:secrets:generate` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:3001,http://localhost:5173` |

### Frontend Admin (`frontend-admin/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Target Backend REST endpoint | `http://localhost:3000/api/v1` |
| `VITE_APP_NAME` | Portal header brand title | `VSP Admin` |
| `VITE_APP_RELEASE` | Release version tag | `1.0.0` |

---

## Pre-Seeded Evaluation Credentials

The database seeder (`backend/prisma/seed.ts`) automatically provisions standard test accounts for instant evaluation:

| Persona | Email | Password | Role / Details |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@example.com` | `Change-This-Password-123!` | Full control plane, RBAC management, audit logs |
| **Operations Admin** | `admin@example.com` | `Change-This-Password-123!` | Verification queues, dispute resolution, analytics |
| **Customer** | `alice@example.com` | `Change-This-Password-123!` | Alice Customer (Accra) · Has active confirmed booking |
| **Worker / Tradesperson**| `bob@example.com` | `Change-This-Password-123!` | Bob Williams · Licensed Electrician · 4.8 Rating |

> **Mobile Quick-Fill**: The mobile login screen features one-tap quick-fill buttons (`⚡ Customer (Alice)` and `⚡ Worker (Bob)`) for instant authentication without typing credentials.

---

## REST API & Real-Time Gateway Protocols

All REST API endpoints are prefixed with `/api/v1` and return structured JSON responses:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "94e80816-11f8-450a-bf19-74d6f83abec8",
    "timestamp": "2026-09-30T09:23:22.401Z"
  }
}
```

### Essential Endpoints

- **Health Checks**:
  - `GET /api/v1/health` — Liveness probe.
  - `GET /api/v1/health/ready` — Readiness probe (validates PostgreSQL & Redis connectivity).
- **Authentication (`/api/v1/auth`)**:
  - `POST /auth/register` — User account creation.
  - `POST /auth/login` — Issues access token (15m RSA JWT) and refresh token.
  - `POST /auth/refresh` — Refresh expired access token.
  - `GET /auth/me` — Fetches authenticated user profile, permissions, and roles.
- **Marketplace & Discovery**:
  - `GET /api/v1/trade-categories` — List available vocational trade categories.
  - `GET /api/v1/discovery/featured-workers` — Vetted tradespeople ranked by proximity and rating.
  - `GET /api/v1/search/workers` — Geospatial and textual search with radius filters.
- **Service Requests & Bookings**:
  - `POST /api/v1/service-requests` — Create client request for quotes.
  - `GET /api/v1/bookings` — List customer/worker bookings.
  - `PATCH /api/v1/bookings/:id/status` — Lifecycle transitions (`CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- **Real-Time WebSocket Gateway (`ws://<host>:3002/ws`)**:
  - Send: `{"type": "auth", "token": "<JWT>"}` to authenticate connection.
  - Send: `{"type": "chat_message", "conversationId": "...", "body": "..."}` for direct messaging.
  - Receive: Instant notification and message dispatch events backed by Redis Pub/Sub.

---

## Testing & Quality Verification

VSP maintains strict test coverage and zero-tolerance lint standards across all modules:

### 1. Mobile Application (Flutter)
```bash
cd mobile

# Static code analysis (must report 0 issues)
flutter analyze

# Execute 12/12 unit and widget tests
flutter test
```

### 2. Backend Monolith
```bash
cd backend

# TypeScript strict type checking
npm run typecheck

# Execute authentication and integration test suite
npm run test:auth
npm run test:admin
```

### 3. Frontend Admin Console
```bash
cd frontend-admin

# Typecheck and production build verification
npm run build

# Run Playwright end-to-end browser tests
npm run e2e
```

---

## Observability & Security Operations

### Disaster Recovery: Database Backup & Restore Verifier
Automated backup and restore verification scripts guarantee database snapshot reproducibility:
```bash
cd backend
npm run ops:backup               # Dumps PostgreSQL snapshot in custom format
npm run ops:restore:verify       # Restores into isolated scratch DB and verifies schema parity
```

### Zero-Downtime Cryptographic Rotation
- **RSA JWT Key Rotation**: Deploy new `JWT_PUBLIC_KEY_BASE64` while keeping the old key in `JWT_PUBLIC_KEY_BASE64_PREVIOUS` to validate older active tokens without logging users out.
- **MFA Secret Re-Wrapping**:
  ```bash
  cd backend
  npm run ops:mfa:rewrap -- --dry-run   # Test re-encryption of stored TOTP secrets
  ```

### Metrics & Tracing Dashboards
Boot the full observability suite with Docker Compose:
```bash
docker compose --profile monitoring up -d
```
- **Grafana**: `http://localhost:3003` (Pre-configured VSP system dashboards)
- **Prometheus**: `http://localhost:9090` (Scrapes `/api/v1/internal/metrics`)
- **Jaeger UI**: `http://localhost:16686` (End-to-end distributed trace spans)

---

## Makefile & Tooling Index

The repository includes a top-level `Makefile` for streamlined command execution:

| Target | Description |
| :--- | :--- |
| `make compose-up` | Starts PostgreSQL and Redis infrastructure containers |
| `make backend-dev` | Boots Express backend API in watch mode |
| `make backend-workers`| Launches BullMQ background worker process |
| `make backend-gateway`| Launches real-time WebSocket gateway server |
| `make backend-test` | Runs backend unit and integration test suites |
| `make staging-up` | Launches full staging stack via Docker Compose |
| `make staging-gate` | Runs automated E2E release gate against running stack |
| `make final-hard-gate`| Executes entire repository verification pipeline (types, tests, lint) |

---

## License

This project is licensed under the [MIT License](LICENSE).
