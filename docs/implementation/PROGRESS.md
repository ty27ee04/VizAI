# Implementation Progress

Last audited: 2026-09-03 (Asia/Singapore)

## Current position

- Current phase: Phase 2, direct Hikvision ISAPI vertical slice, in progress.
- Current phase: Phase 2 direct Hikvision ISAPI vertical slice is complete for deterministic software scope.
- Last user-confirmed and repository-verified checkpoint: Phase 2 boundary corrections complete; 2 targeted files/14 tests, 22 full files/120 tests, and the production build pass.
- Live status: Step 2J safely returned `request-timeout` while the camera was down. Live Digest/device/report compatibility remains pending.
- Exact next task: Step 3A, define the non-secret PostgreSQL/TimescaleDB configuration and local credential boundary. Wait for explicit `Start Step 3A`.

## Completed and verified

| Checkpoint | Repository evidence | Verification |
| --- | --- | --- |
| 1A registration boundary | `src/contracts/camera-registration*.ts` | Valid/invalid registration tests |
| 1B inventory validation | `src/contracts/camera-inventory-validator.ts` | Empty, three IDs, same adapter, duplicate, malformed, and size-limit tests |
| 1C adapter lifecycle | `src/adapters/camera-adapter.ts` | Fake offline/connect/discover/disconnect and camera isolation tests |
| 1D provider registry | `src/adapters/adapter-provider.ts`, `adapter-registry.ts` | Selection, duplicates, unknown provider, config stop, identity mismatch tests |
| 1E gateway lifecycle | `src/core/camera-gateway.ts` | Registration, rollback, concurrency, health, unregister, and shutdown tests |
| 1F.1 observation input contract | `src/observations/periodic-people-flow-observation.ts` | TypeScript build passes; no runtime tests expected for interfaces alone |
| 1F.2 canonical output contract | `src/contracts/people-flow-measurement.ts` | TypeScript build passes; all 44 regression tests pass |
| 1F.3 canonical runtime schema | `src/contracts/people-flow-measurement-schema.ts` | TypeScript build passes; all 44 regression tests pass |
| 1F.4 canonical AJV parser | `src/contracts/people-flow-measurement-validator.ts` | TypeScript build passes; all 44 regression tests pass |
| 1F.5 canonical validator tests | `test/people-flow-measurement-validator.test.ts` | 10 focused tests added; 9 files and 54 tests pass |
| 1F.6 deterministic normalizer | `src/core/periodic-people-flow-normalizer.ts` | TypeScript build passes; all 54 regression tests pass |
| 1F.7 focused normalizer tests | `test/periodic-people-flow-normalizer.test.ts` | Six focused tests added; 10 files and 60 tests pass |
| 1F.8 output publication port | `src/output/people-flow-output-port.ts` | Interface exposes only asynchronous canonical publication; build and 60 tests pass |
| 1F.9 in-memory output adapter | `src/output/in-memory-people-flow-output-port.ts` | ID-keyed replacement, camera-filtered reads, and defensive copies compile |
| 1F.10 in-memory output tests | `test/in-memory-people-flow-output-port.test.ts` | Five focused tests; full Stage 1F suite passes with 11 files and 65 tests |
| 1G.1 local-file safety | `.gitignore` | Generated output, `.env` variants, logs, and local inventory files are excluded |
| 1G.2 bounded inventory loader | `src/config/camera-inventory-file-loader.ts` | One MiB limit, safe file errors, JSON parsing, and existing inventory validation |
| 1G.3 loader tests | `test/camera-inventory-file-loader.test.ts` | Six focused tests; related loader/inventory run passes with 2 files and 13 tests |
| 1G.4 startup report contract | `src/startup/camera-startup-report.ts` | Safe registered/failed discriminated union with ready/degraded report |
| 1G.5 registration coordinator | `src/startup/register-camera-inventory.ts` | Sequentially attempts every logical camera and suppresses provider details |
| 1G.6 coordinator tests | `test/register-camera-inventory.test.ts` | Three focused tests; related coordinator/gateway run passes with 2 files and 11 tests |
| 1G.7 file-to-gateway composition | `src/startup/start-camera-gateway-from-file.ts` | Validates the full file before delegating trusted registrations |
| 1G.8 startup composition tests | `test/start-camera-gateway-from-file.test.ts` | Four focused tests; full Stage 1G suite passes with 14 files and 78 tests |
| 2A.1 ISAPI config contract | `src/providers/hikvision-isapi/hikvision-isapi-config.ts` | Non-secret base URL, channel, timeout, and stable adapter-type constant |
| 2A.2 ISAPI config schema | `src/providers/hikvision-isapi/hikvision-isapi-config-schema.ts` | Closed and bounded three-property runtime schema |
| 2A.3 ISAPI config parser | `src/providers/hikvision-isapi/hikvision-isapi-config-validator.ts` | AJV structure plus safe HTTP(S)-origin semantics |
| 2A.4 ISAPI config tests | `test/hikvision-isapi-config-validator.test.ts` | Ten focused tests; full suite passes with 15 files and 88 tests |
| 2B.1 ISAPI credential contract | `src/providers/hikvision-isapi/hikvision-isapi-credentials.ts` | Provider-specific in-memory credential value and resolver boundary |
| 2B.2 environment credential resolver | `src/providers/hikvision-isapi/environment-hikvision-isapi-credential-resolver.ts` | Explicit non-secret bindings, injected environment, and safe failure reasons |
| 2B.3 credential resolver tests | `test/environment-hikvision-isapi-credential-resolver.test.ts` | Seven focused tests; both related ISAPI files pass with 17 tests and build passes |
| 2C-2I direct ISAPI software slice | `src/providers/hikvision-isapi/`, focused tests and fixtures | Digest transport, device info, hourly request, parser, collector, adapter/provider and safe errors implemented; boundary suite passes with 22 files/120 tests and build passes |
| 2J read-only smoke-check path | `hikvision-isapi-smoke-check.ts`, `isapiSmoke` script | Command executes and safely reports `request-timeout`; camera was down, so no live compatibility proof |

Latest verification run on 2026-09-03 at the completed deterministic Phase 2 boundary:

- Targeted HTTP/parser correction run: 2 files passed, 14 tests passed.
- `pnpm test`: 22 test files passed, 120 tests passed.
- `pnpm build`: passed with TypeScript exit code 0.
- TODO/FIXME/HACK/XXX scan: no matches in source, tests, or primary configuration.

## In progress

No implementation task is currently in progress. Phase 2 deterministic work is complete and the project is waiting for explicit authorization to start Step 3A.

## Not started

- Successful live Hikvision ISAPI device/report compatibility validation while the camera is online.
- HikCentral implementation.
- ONVIF implementation.
- Production/database-backed people-flow publication.
- Database/schema/migrations/repository.
- Analytics/query layer.
- HTTP API/server.
- Dashboard/UI.
- Authentication, deployment, and hosting.
- Live network/device verification.

## Known issues and technical debt

- Git is available on `main` at `c8501a8`; Phase 2 source/tests, dependencies, pnpm policy, and checkpoint documentation remain uncommitted. Nothing was staged or committed by the agent.
- `test/` is excluded from `tsconfig.json`; Vitest transforms tests, but `pnpm build` type-checks production `src/` only. Add a dedicated test type-check later.
- Some recently hand-edited TypeScript has inconsistent indentation. Behaviour and compilation are unaffected; introduce formatting deliberately rather than mixing it into a functional step.
- Base registration schema permits arbitrary provider-owned keys inside `providerConfig`; each future provider must enforce its own strict schema and secret policy.
- Gateway shutdown assumes application composition has stopped new registrations. Full concurrent startup/shutdown coordination is deferred.
- The fake adapter's simulated cleanup failure sets its internal connection false while the gateway retains registration; this is test-double behaviour, not a real provider guarantee.

## Evidence boundary

All 120 passing tests use local deterministic software/test doubles. The attempted live smoke path executed and safely classified a timeout while the camera was down; it does not prove reachability, Digest authentication, device information, counting-endpoint compatibility, UTC request acceptance, or real XML semantics. Those live claims remain pending until the camera is online.
