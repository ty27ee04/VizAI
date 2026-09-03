# Recovery Handoff

Last audited: 2026-09-03 (Asia/Singapore)

## Purpose and critical rule

This is a from-zero, guided TypeScript implementation of a VizAI multi-camera gateway. The same physical Hikvision device will be registered as three independent logical cameras (`hikvision-isapi`, `hikcentral`, `onvif`) with three unique `cameraId` values. Database/API/dashboard must distinguish them by `cameraId`. There is no `physicalCameraId`, shadow mode, authority selection, or source arbitration.

The user writes implementation themselves with guided steps or coherent small batches. Inspect and verify their work before advancing and apply the efficient checkpoint policy in `AGENTS.md`: small steps receive targeted validation and minimum state updates, while meaningful checkpoints and stage boundaries receive broader validation and synchronized recovery state. At a parent-step boundary, summarize and wait for an explicit `Start Step ...`. Do not restart, redesign, copy the adjacent reference project wholesale, or silently replace working code.

## Current status

- Phase: Phase 2 direct Hikvision ISAPI vertical slice is in progress.
- Current implementation phase: Phase 2 direct ISAPI slice is complete for deterministic software scope.
- Last user-confirmed and repository-verified task: Phase 2 boundary corrections; targeted 2 files/14 tests, full 22 files/120 tests, and `pnpm build` pass.
- Live status: the Step 2J read-only path safely returned `request-timeout` while the camera was down. No live Digest/device/report compatibility claim is established.
- Exact next task: **Step 3A — define non-secret PostgreSQL/TimescaleDB configuration and its local credential boundary.** Wait for explicit `Start Step 3A`.

## Implemented architecture

`unknown registration -> AJV parser -> CameraGateway -> AdapterRegistry -> AdapterProvider.validateConfig/create -> CameraAdapter.connect/discover -> registered map keyed by cameraId`.

Gateway also implements independent health, unregister, failure rollback, duplicate/concurrency guards, and multi-camera shutdown with safe failed-ID reporting.

Relevant production files:

- `src/contracts/camera-registration.ts`
- `src/contracts/camera-registration-schema.ts`
- `src/contracts/camera-registration-validator.ts`
- `src/contracts/camera-inventory-validator.ts`
- `src/adapters/camera-adapter.ts`
- `src/adapters/adapter-provider.ts`
- `src/adapters/adapter-registry.ts`
- `src/core/camera-gateway.ts`
- `src/observations/periodic-people-flow-observation.ts`
- `src/contracts/people-flow-measurement.ts`
- `src/contracts/people-flow-measurement-schema.ts`
- `src/contracts/people-flow-measurement-validator.ts`
- `src/core/periodic-people-flow-normalizer.ts`
- `test/periodic-people-flow-normalizer.test.ts`
- `src/output/people-flow-output-port.ts`
- `src/output/in-memory-people-flow-output-port.ts`
- `test/in-memory-people-flow-output-port.test.ts`
- `.gitignore`
- `src/config/camera-inventory-file-loader.ts`
- `test/camera-inventory-file-loader.test.ts`
- `src/startup/camera-startup-report.ts`
- `src/startup/register-camera-inventory.ts`
- `test/register-camera-inventory.test.ts`
- `src/startup/start-camera-gateway-from-file.ts`
- `test/start-camera-gateway-from-file.test.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-config.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-config-schema.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-config-validator.ts`
- `test/hikvision-isapi-config-validator.test.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-credentials.ts`
- `src/providers/hikvision-isapi/environment-hikvision-isapi-credential-resolver.ts`
- `test/environment-hikvision-isapi-credential-resolver.test.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-http-client.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-device-info-client.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-counting-report-client.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-counting-report-parser.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-people-flow-collector.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-adapter.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-provider.ts`
- `src/providers/hikvision-isapi/hikvision-isapi-smoke-check.ts`
- `test/hikvision-isapi-*.test.ts`
- `test/support/hikvision-counting-report-fixtures.ts`
- `pnpm-workspace.yaml`

Test doubles: `test/support/fake-camera-adapter.ts`, `test/support/fake-adapter-provider.ts`.

## Verification

- `pnpm test`: 15 files, 88 tests passed on 2026-09-03.
- `pnpm build`: passed on 2026-09-03.
- Targeted Step 2B checkpoint: both related ISAPI test files passed, 2 files/17 tests, on 2026-09-03.
- Phase 2 boundary deterministic verification: targeted 2 files/14 tests, full 22 files/120 tests, and production build passed on 2026-09-03.
- Step 2J smoke path executed but returned safe `request-timeout` while the camera was down; no live-device claim is established.
- Targeted Step 1G checkpoint: loader and inventory tests, 2 files/13 tests passed on 2026-09-03.
- Targeted Step 1G coordinator checkpoint: coordinator and gateway-registration tests, 2 files/11 tests passed on 2026-09-03.
- No TODO/FIXME/HACK/XXX markers found.
- All evidence is deterministic software evidence; no live provider/device/database/API proof exists.

## Git state

Git is available on branch `main`, tracking `origin/main`, at commit `c8501a8` (`chore: initialize VizAI camera integration project`). Phase 2 source/tests and dependency/configuration files are untracked or modified locally. Nothing has been staged or committed by the agent.

## Remaining phases

1. Start Step 3A only after explicit user instruction, then build persistence/API/dashboard in the saved roadmap order.
2. Repeat the read-only ISAPI smoke check when the camera is online; live validation may remain pending while later software phases continue.
3. Add TimescaleDB persistence, per-camera API, and dashboard camera selector.
4. Add HikCentral only after confirming deployed version/API/camera index code.
5. Add ONVIF only after capability/event discovery; unsupported people flow is a valid outcome.
6. Production hardening and live validation.

## Do not forget

- Never put raw secrets in registration JSON, fixtures, docs, logs, or chat.
- One provider recipe creates one disconnected adapter per registration; connection happens later.
- Normalizer, not parser, attaches logical `cameraId`.
- Never copy observations between integrations or manufacture unsupported analytics.
- Never implicitly sum the three logical camera IDs.
- Tests do not prove real-device compatibility.

## Known issues / assumptions to verify

- Current HEAD `c8501a8` does not include the untracked Step 2A files or current checkpoint documentation changes.
- Tests are not included in production `tsc` type-checking.
- Minor indentation inconsistencies exist in hand-edited files.
- Database/server/deployment choices are not implemented; TimescaleDB/Fastify are planned candidates only.
- Application-level exclusion of new registrations during shutdown remains to be designed with the composition root.
- Actual HikCentral and ONVIF capabilities must be verified against local deployments/devices.
