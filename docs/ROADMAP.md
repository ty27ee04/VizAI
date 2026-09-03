# Roadmap

Status values are based on repository evidence as of 2026-09-03, not conversation discussion alone.

## Phase 1: Shared foundation — complete for current scope

### Step 1A: Project and registration contract — complete

- pnpm/Node/TypeScript/Vitest/AJV project setup.
- Strict ESM compiler configuration.
- Registration interface, JSON schema, runtime parser, and tests.

### Step 1B: Inventory validation — complete

- Array and maximum-size checks.
- Per-entry validation and duplicate `cameraId` rejection.

### Step 1C: Adapter lifecycle — complete

- Shared adapter/capability/health interfaces.
- Deterministic fake adapter and isolation tests.

### Step 1D: Provider registry — complete

- Provider recipe interface.
- Extensible registry with provider/config/identity safeguards.

### Step 1E: Gateway lifecycle — complete for current scope

- Registration, pending-ID protection, rollback, capability discovery.
- Safe listing, independent health checks, unregister, and shutdown.
- Composition-level startup/shutdown exclusion remains deferred until an application root exists.

### Step 1F: People-flow data boundary — complete

- **1F.1 complete:** vendor-neutral hourly observation/source interfaces exist and compile.
- **1F.2 complete:** canonical periodic `PeopleFlowMeasurement` TypeScript contract exists and compiles.
- **1F.3 complete:** closed canonical `PeopleFlowMeasurement` JSON schema exists and compiles.
- **1F.4 complete:** AJV parser accepts `unknown`, applies the canonical schema and strict local date-time validation, and returns trusted measurements.
- **1F.5 complete:** focused validation tests cover valid measurements, independent camera IDs, missing/extra fields, fixed constants, count bounds, safe IDs, timezone shape, and impossible dates.
- **1F.6 complete:** deterministic normalizer attaches logical identity, copies provider facts, injects receive time, generates a stable camera/channel/period SHA-256 ID, and validates its output.
- **1F.7 complete:** focused normalizer tests cover field mapping, optional source identity, stable retry IDs, different logical-camera IDs, channel/period identity changes, and invalid-output rejection.
- **1F.8 complete:** asynchronous `PeopleFlowOutputPort` publishes one trusted canonical measurement without coupling the pipeline to storage.
- **1F.9 complete:** in-memory output adapter stores defensive copies by measurement ID, replaces retries, and exposes explicit camera-filtered reads.
- **1F.10 complete:** five focused tests prove three-camera isolation, ID-based replacement, defensive input/output copies, and empty unknown-camera results.

### Step 1G: Safe inventory loading and startup composition — complete

- **1G.1 complete:** `.gitignore` protects generated output, environment files, logs, and local inventory files.
- **1G.2 complete:** bounded inventory file loading uses safe errors and delegates structural validation.
- **1G.3 complete:** focused loader tests cover valid/empty inventory and safe failure boundaries.
- **1G.4 complete:** startup results use a safe registered/failed discriminated union and ready/degraded report.
- **1G.5 complete:** the sequential coordinator attempts every logical registration and preserves successful cameras when another fails.
- **1G.6 complete:** focused tests cover three-camera success, isolated failure with safe reporting, and empty startup.
- **1G.7 complete:** file-to-gateway composition validates the complete inventory before registration begins.
- **1G.8 complete:** focused composition tests cover ready, degraded, structurally invalid, and malformed-JSON startup paths.

### Deferred shared-foundation technical debt

- Startup composition that registers entries independently.
- Dedicated test TypeScript type-check configuration.
- Formatting/linting conventions; current code has harmless indentation inconsistencies.

## Phase 2: Direct Hikvision ISAPI vertical slice — not started

Wait for the user's explicit `Start Step 2A` instruction.

1. **Step 2A:** Define and validate ISAPI provider configuration without raw credentials.
2. Resolve local environment credentials at composition time.
3. Implement bounded HTTP Digest client.
4. Perform read-only device-information connection proof.
5. Implement periodic people-counting request/client.
6. Parse sanitized XML into `PeriodicPeopleFlowObservation`.
7. Normalize with the ISAPI logical `cameraId` and validate canonical output.
8. Implement provider recipe and adapter lifecycle/health.
9. Add fixtures and parser tests for valid, empty, malformed, unsupported, timeout, and authentication cases.
10. Run a separately labelled read-only live smoke check.
11. Defer live alert/event collection until periodic flow works and semantics are confirmed.

## Phase 3: Persistence, API, and dashboard — not started

1. Add PostgreSQL/TimescaleDB configuration and migrations.
2. Persist canonical rows with `camera_id` and camera/time index.
3. Implement per-camera query and analytics services.
4. Add safe camera-list, health, latest/history, and overview APIs.
5. Build dashboard camera selector and make every widget query the selected logical ID.
6. Do not add implicit global aggregation.

## Phase 4: HikCentral — not started

1. Verify local product/version and matching official API documentation.
2. Configure least-privilege read-only partner credentials locally.
3. Discover real resource/camera index code and people-counting endpoint.
4. Implement config, signed client, parser, adapter, provider, tests, and live smoke check.
5. Persist/query only under the HikCentral logical camera ID.

## Phase 5: ONVIF — not started

1. Implement safe service/profile/capability discovery.
2. Inspect analytics, metadata, and event topics on the real device.
3. Implement only proven capabilities.
4. Return truthful unsupported status when people flow is unavailable.
5. Persist/query only under the ONVIF logical camera ID.

## Phase 6: Production hardening — not started

- Authentication/authorization, rate limiting, CORS, HTTPS/reverse proxy.
- Retry/backoff, cancellation, startup/shutdown orchestration, observability.
- Deployment and database backup/migration procedures.
- Load, soak, reconnect, and failure-recovery tests.
- Documentation and demonstration evidence that clearly separates simulated and live proof.
