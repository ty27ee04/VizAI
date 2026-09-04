# Recovery Handoff

Last audited: 2026-09-03 21:46 (Asia/Singapore)

## Purpose and critical rule

This is a guided TypeScript implementation of a VizAI multi-camera gateway. One physical Hikvision device may be registered as three unrelated logical cameras for ISAPI, HikCentral, and ONVIF. `cameraId` remains distinct through gateway, normalized measurements, database rows, API queries/responses, and dashboard selection. Never add physical grouping, shadow/authority roles, arbitration, cross-provider copying, or an implicit all-camera total.

## Current status

- Phase 3 is complete for local deterministic/database scope, including automatic trusted-folder brand-plugin discovery.
- Last completed task: Steps 3H.1-3H.10 and the Phase 3 boundary, verified against source, focused tests, compiled output, full tests, and build.
- Current/in-progress task: none.
- Exact next task: **Phase 4 / Step 4A — identify the deployed HikCentral product/version and matching official API surface**. Do not start until the user explicitly says `Start Step 4`.

## Implemented runtime flow

`trusted provider folders -> plugin discovery -> AdapterRegistry -> local inventory -> CameraGateway -> discovered HikvisionIsapiAdapterProvider -> ISAPI client/parser -> PeriodicPeopleFlowNormalizer -> canonical validation -> PostgresPeopleFlowOutputPort -> TimescaleDB -> camera-scoped query repository -> analytics -> Fastify API -> dashboard selector`.

Important Phase 3 files:

- `src/database/postgres-config.ts`, `postgres-pool.ts`, `run-database-migrations.ts`
- `src/database/migrations/001-create-people-flow.ts`
- `src/output/postgres-people-flow-output-port.ts`
- `src/query/people-flow-query.ts`, `people-flow-query-port.ts`, `postgres-people-flow-query-repository.ts`
- `src/analytics/people-flow-analytics-service.ts`
- `src/api/create-api-server.ts`
- `src/dashboard/dashboard-assets.ts`, `create-dashboard-server.ts`
- `src/application.ts`
- six matching Phase 3 test files under `test/`
- `src/providers/adapter-provider-plugin.ts`, `discover-adapter-providers.ts`
- `src/providers/hikvision-isapi/plugin.ts`
- `src/startup/create-adapter-registry-from-plugins.ts`
- `src/providers/plugin-discovery-smoke-check.ts`
- `test/discover-adapter-providers.test.ts`, `hikvision-isapi-plugin.test.ts`, `installed-provider-discovery.test.ts`

## Critical Phase 3 decisions

- TimescaleDB table: `people_flow_measurements`.
- Hypertable time column: `observed_at`.
- Primary key: `(id, observed_at)`; retry upserts use the same conflict target.
- Query index: `(camera_id, observed_at DESC)`.
- Latest/history/overview and selected health paths require one logical camera.
- Database/API errors do not expose underlying secret/provider details.
- Dashboard uses `textContent`, not `innerHTML`, for runtime values.
- Server binds to `127.0.0.1` while authentication is absent.

## Verification

- Phase 3 targeted tests: 6 files, 22 tests passed.
- Step 3H focused regression: 4 files, 22 tests passed.
- Compiled discovery smoke: passed; `hikvision-isapi` discovered with zero camera connections attempted.
- Full suite: 31 files, 156 tests passed.
- `pnpm build`: passed.
- Local TimescaleDB: version 2.29.1 reachable; migration record, hypertable, required non-null `camera_id`, and camera/time index confirmed read-only. The table has zero rows while the camera is down, so real camera-to-database publication remains pending.
- `.env` and `config/cameras.local.json` confirmed ignored.
- Live camera validation remains pending because the camera is down.

## Git state

- Branch: `main`, tracking `origin/main`.
- HEAD: `ea51558` (`Phase 2 done without real camera test`).
- Phase 3 source/tests plus `.env.example`, `package.json`, and `pnpm-lock.yaml` are modified/untracked and not committed by the agent.

## Known limitations / next phases

- The application now composes `AdapterRegistry` from trusted-folder plugin discovery; it no longer imports the Hikvision provider/resolver directly.
- Installed plugin code is trusted executable startup code, not a sandboxed third-party extension mechanism.
- The ISAPI plugin currently requires its credential-reference environment binding during composition even when no ISAPI registration is present; revisit optional activation/configuration before multiple plugins are installed.
- Phase 4 HikCentral must start with deployed-version and official-API discovery; `cameraIndexCode` must come from real resource data and is not a VizAI camera ID.
- Phase 5 ONVIF must start with capability discovery; people flow may truthfully be unsupported.
- API authentication, remote exposure, CORS, TLS, rate limiting, backups, observability, and production operations are deferred to Phase 6.
- Test sources are not included in production `tsc` type-checking.
- Repeat safe ISAPI live validation when the device returns online.
