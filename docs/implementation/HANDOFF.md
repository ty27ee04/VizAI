# Recovery Handoff

Last audited: 2026-09-03 (Asia/Singapore)

## Purpose and critical rule

This is a from-zero, guided TypeScript implementation of a VizAI multi-camera gateway. The same physical Hikvision device will be registered as three independent logical cameras (`hikvision-isapi`, `hikcentral`, `onvif`) with three unique `cameraId` values. Database/API/dashboard must distinguish them by `cameraId`. There is no `physicalCameraId`, shadow mode, authority selection, or source arbitration.

The user writes implementation themselves with guided steps or coherent small batches. Inspect and verify their work before advancing and apply the efficient checkpoint policy in `AGENTS.md`: small steps receive targeted validation and minimum state updates, while meaningful checkpoints and stage boundaries receive broader validation and synchronized recovery state. At a parent-step boundary, summarize and wait for an explicit `Start Step ...`. Do not restart, redesign, copy the adjacent reference project wholesale, or silently replace working code.

## Current status

- Phase: Phase 1 shared foundation is complete for current scope.
- Current implementation step: Step 1G safe inventory loading and startup composition is complete.
- Last user-confirmed and repository-verified task: Step 1G.8. File-to-gateway composition and four focused tests exist; the full suite passes with 14 files/78 tests and `pnpm build` passes.
- Exact next task: **Phase 2, Step 2A — define and validate non-secret Hikvision ISAPI provider configuration.** Wait for the user to explicitly say `Start Step 2A`.

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

Test doubles: `test/support/fake-camera-adapter.ts`, `test/support/fake-adapter-provider.ts`.

## Verification

- `pnpm test`: 14 files, 78 tests passed on 2026-09-03.
- `pnpm build`: passed on 2026-09-03.
- Targeted Step 1G checkpoint: loader and inventory tests, 2 files/13 tests passed on 2026-09-03.
- Targeted Step 1G coordinator checkpoint: coordinator and gateway-registration tests, 2 files/11 tests passed on 2026-09-03.
- No TODO/FIXME/HACK/XXX markers found.
- All evidence is deterministic software evidence; no live provider/device/database/API proof exists.

## Git state

`D:\School\Degree\Y3S2 Internship\Project\VizAI\Implement` is not a Git repository. `git status`, `git diff`, branch, and recent commits are unavailable. Do not invent a commit/checkpoint hash. Ask before initializing Git because that is a separate project-management action.

## Remaining phases

1. Start Phase 2, Step 2A: non-secret ISAPI provider configuration and validation.
2. Continue the direct read-only Hikvision ISAPI vertical slice: Digest device info, then periodic people-counting XML.
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

- No Git history exists for this directory.
- Tests are not included in production `tsc` type-checking.
- Minor indentation inconsistencies exist in hand-edited files.
- Database/server/deployment choices are not implemented; TimescaleDB/Fastify are planned candidates only.
- Application-level exclusion of new registrations during shutdown remains to be designed with the composition root.
- Actual HikCentral and ONVIF capabilities must be verified against local deployments/devices.
