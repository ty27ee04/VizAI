# Implementation Progress

Last audited: 2026-09-03 21:46 (Asia/Singapore)

## Current position

- Current phase: Phase 3 is complete, including automatic trusted-folder brand-plugin discovery.
- Last user-confirmed and repository-verified checkpoint: Step 3H.1-3H.10 and the Phase 3 boundary.
- Last verified Step 3H checkpoint: plugin contract, deterministic loader, ISAPI plugin entry point, discovery-based registry/application composition, source integration tests, compiled discovery smoke proof, focused regression, full regression, and production build all passed.
- Exact next task: **Phase 4 / Step 4A — identify the deployed HikCentral product/version and matching official API surface**. Wait for the user to explicitly say `Start Step 4` before giving implementation instructions.
- Live ISAPI status: pending because the camera is down. The prior read-only attempt safely returned `request-timeout`.

## Completed phases

1. Phase 1 shared contracts, adapter/provider registry, gateway lifecycle, canonical people-flow pipeline, output port, inventory loading, and startup composition.
2. Phase 2 direct Hikvision ISAPI deterministic vertical slice: bounded Digest transport, clients/parser, normalizer/publication, adapter/provider lifecycle, tests, and safe smoke path. Successful live camera compatibility remains pending.
3. Phase 3 local persistence/API/dashboard:
   - bounded PostgreSQL configuration and separate credential parsing;
   - PostgreSQL pool and recorded transactional TimescaleDB migration;
   - `people_flow_measurements` hypertable with `(id, observed_at)` primary key and `(camera_id, observed_at DESC)` index;
   - parameterized retry-safe PostgreSQL output adapter;
   - required-camera latest/history repository and camera-identity-guarded overview analytics;
   - Fastify camera-list, selected-camera health, latest/history, and overview routes;
   - dashboard selector that sends one selected logical `cameraId` to every widget request;
   - local `127.0.0.1` composition root and ignored runtime files;
   - trusted-folder provider plugin contract and deterministic source/compiled discovery;
   - Hikvision ISAPI plugin entry point and discovery-based application composition.

## Phase 3 verification

- Targeted: `pnpm test test/postgres-config.test.ts test/run-database-migrations.test.ts test/postgres-people-flow-output-port.test.ts test/people-flow-query-analytics.test.ts test/api-server.test.ts test/dashboard-server.test.ts` — 6 files, 22 tests passed.
- Step 3H focused: `pnpm test test/discover-adapter-providers.test.ts test/hikvision-isapi-plugin.test.ts test/installed-provider-discovery.test.ts test/adapter-registry.test.ts` — 4 files, 22 tests passed.
- Step 3H compiled smoke: `node dist/providers/plugin-discovery-smoke-check.js` — passed; discovered `hikvision-isapi` and attempted zero camera connections.
- Full: `pnpm test` — 31 files, 156 tests passed.
- Build: `pnpm build` — passed.
- Read-only local database check: TimescaleDB 2.29.1 reachable; migration `001-create-people-flow`, the `people_flow_measurements` hypertable, required non-null `camera_id`, and index `people_flow_camera_observed_idx` confirmed. It currently has zero rows because the camera is down.
- Secret boundary: `.env` and `config/cameras.local.json` are ignored; only environment key names were inspected.

## Evidence boundary

The local database schema, deterministic persistence/query/API/dashboard behavior, complete software regression suite, and TypeScript build are verified. No real camera measurement has reached the database yet. This does not prove successful live camera reachability, Digest authentication, device/report endpoint compatibility, production hosting, authentication, HikCentral, or ONVIF capability.

## Remaining work

- Phase 4 HikCentral: deployed-version/API discovery first, then least-privilege credentials, real resource/index discovery, provider implementation, tests, and separately labelled live validation.
- Phase 5 ONVIF: capability/service/profile/event discovery and only proven capabilities.
- Phase 6 production hardening: authentication/authorization, CORS, TLS/reverse proxy, rate limiting, deployment, backups, observability, retry/backoff, and load/recovery testing.
- Repeat the read-only ISAPI smoke check when the camera is online.

## Known limitations and technical debt

- Test TypeScript is transformed by Vitest but excluded from production `tsc` type-checking.
- Application startup registration and shutdown are not guarded by one explicit application state machine.
- The installed ISAPI plugin currently requires its credential-reference environment binding while plugins are composed, even when no ISAPI registration is present; optional plugin activation/configuration should be considered before multiple plugins are installed.
- The local API has no authentication and intentionally binds only to `127.0.0.1`.
- Production database backup, migration deployment, and TLS policy are not implemented.
- Phase 3 files and dependency changes are currently uncommitted.
