# Implementation Progress

Last audited: 2026-09-03 (Asia/Singapore)

## Current position

- Current phase: Phase 1, shared foundation, complete for current scope.
- Current step: Step 1G, safe inventory loading and startup composition, complete.
- Last user-confirmed checkpoint: Step 1G.8, focused file-to-gateway startup tests.
- Last repository-verified checkpoint: Stage 1G and Phase 1 complete; 14 test files and 78 tests pass, the production build passes, and no unfinished-code markers were found.
- Exact next task: Phase 2, Step 2A, define and validate the non-secret Hikvision ISAPI provider configuration. Wait for the user to explicitly say `Start Step 2A`.

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

Latest verification run on 2026-09-03 at the Stage 1G and Phase 1 boundary:

- `pnpm test`: 14 test files passed, 78 tests passed.
- `pnpm build`: passed with TypeScript exit code 0.
- TODO/FIXME/HACK/XXX scan: no matches in source, tests, or primary configuration.

## In progress

No implementation task is currently in progress. Phase 1 is complete for its planned scope, and the project is waiting for explicit authorization to start Step 2A.

## Not started

- Real Hikvision ISAPI configuration/client/parser/provider/adapter.
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

- This directory is not a Git repository. There is no branch, status, diff, commit history, or verified commit hash.
- `test/` is excluded from `tsconfig.json`; Vitest transforms tests, but `pnpm build` type-checks production `src/` only. Add a dedicated test type-check later.
- Some recently hand-edited TypeScript has inconsistent indentation. Behaviour and compilation are unaffected; introduce formatting deliberately rather than mixing it into a functional step.
- Base registration schema permits arbitrary provider-owned keys inside `providerConfig`; each future provider must enforce its own strict schema and secret policy.
- Gateway shutdown assumes application composition has stopped new registrations. Full concurrent startup/shutdown coordination is deferred.
- The fake adapter's simulated cleanup failure sets its internal connection false while the gateway retains registration; this is test-double behaviour, not a real provider guarantee.

## Evidence boundary

All 78 tests use local deterministic software/test doubles. They prove contract, registry, lifecycle, isolation, rollback, canonical validation, normalization, retry-safe in-memory publication, bounded inventory loading, and isolated startup behaviour. They do not prove real camera reachability, Digest authentication, ISAPI report compatibility, HikCentral endpoints, ONVIF analytics, database persistence, API behaviour, or deployment.
