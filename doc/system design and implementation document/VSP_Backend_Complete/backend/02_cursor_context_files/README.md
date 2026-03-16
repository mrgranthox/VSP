# Vocational Services Platform — Cursor/Codex Module Context Files
# Version 1.0 | March 2026

## PURPOSE
Each file in this folder is a self-contained context document for one module or
cross-cutting layer. Paste the relevant file into Cursor or ChatGPT Codex when
generating that module. Each file fits within a single context window.

## HOW TO USE WITH CURSOR
1. Open Cursor in your project repository
2. Open the relevant module context file
3. Use Ctrl+Enter (Cursor Chat) and paste:
   "Using the following context, generate the complete [module] module
    following the Controller→Service→Repository pattern. Include validators,
    service, repository, controller, routes, and tests."
4. Then paste the entire contents of the module context file
5. Generate module by module — do not try to generate all modules at once

## HOW TO USE WITH CHATGPT CODEX
1. Create a new Codex task
2. Set the system prompt to include the architecture rules (see 00_ARCHITECTURE.md)
3. Paste the module context file as the user message
4. Request: "Generate all files for this module"

## FILE INDEX
```
00_ARCHITECTURE.md            — Architecture rules, stack, patterns, error envelopes (paste with EVERY module)
01_auth.md                    — Auth module: register, login, JWT, MFA, sessions
02_users.md                   — Users: profiles, preferences, saved workers, follows
03_worker_profiles.md         — Worker onboarding: trades, services, areas, availability, portfolio, certs, verification
04_search.md                  — Typesense search: workers, map, nearby, recommendations, impressions
05_social.md                  — Social: posts, comments, likes, saves, feed
06_chat.md                    — Chat: conversations, messages, attachments, read receipts
07_08_requests_bookings.md    — Service requests + Bookings (combined — they are tightly coupled)
09_10_11_reviews_moderation_notifications.md — Reviews + Moderation + Notifications
12_13_14_15_billing_support_analytics_admin_v2.md — Billing + Support + Analytics + Admin (UPDATED v2 — includes all 22 new admin endpoints)
X1_websocket_gateway.md       — WebSocket gateway (cross-cutting)
X2_media_pipeline.md          — Media upload, processing, CDN (cross-cutting)
X3_background_jobs.md         — BullMQ queues, job definitions, event bus (cross-cutting)
```

## RECOMMENDED GENERATION ORDER
```
1.  Run: npx prisma migrate dev (schema already defined in blueprints)
2.  Run: npx ts-node prisma/seed.ts
3.  Generate: 00_ARCHITECTURE (shared middleware, error handler, response builder)
4.  Generate: 01_auth
5.  Generate: 02_users
6.  Generate: 03_worker_profiles
7.  Generate: X3_background_jobs (queues setup needed before events)
8.  Generate: 04_search
9.  Generate: 05_social
10. Generate: 06_chat
11. Generate: 07_08_requests_bookings
12. Generate: 09_10_11_reviews_moderation_notifications
13. Generate: 12_13_14_15_billing_support_analytics_admin_v2
14. Generate: X1_websocket_gateway
15. Generate: X2_media_pipeline
16. Run: full integration test suite
```

## ALWAYS INCLUDE WITH EVERY GENERATION
Paste 00_ARCHITECTURE.md along with the module file.
It contains the shared patterns every module depends on.

## FIXTURE IDs (quick reference for tests)
superAdmin:       aaaaaaaa-0001-4000-a000-000000000001
admin:            aaaaaaaa-0002-4000-a000-000000000002
moderator:        aaaaaaaa-0003-4000-a000-000000000003
support:          aaaaaaaa-0004-4000-a000-000000000004
customerAlice:    aaaaaaaa-0005-4000-a000-000000000005
workerBob:        aaaaaaaa-0006-4000-a000-000000000006
workerUnverified: aaaaaaaa-0007-4000-a000-000000000007
wpBob (worker profile): bbbbbbbb-0001-4000-b000-000000000001
cityAccra:        dddddddd-0001-4000-d000-000000000001
tradeElectrician: eeeeeeee-0001-4000-e000-000000000001
fixtureRequest:   ffffffff-0001-4000-f000-000000000001
fixtureBooking:   ffffffff-0002-4000-f000-000000000002
fixtureReview:    ffffffff-0003-4000-f000-000000000003
fixturePost:      ffffffff-0004-4000-f000-000000000004
fixtureConv:      ffffffff-0005-4000-f000-000000000005
fixtureTicket:    ffffffff-0007-4000-f000-000000000007
fixtureModeCase:  ffffffff-0008-4000-f000-000000000008
All fixture passwords: Change-This-Password-123!
