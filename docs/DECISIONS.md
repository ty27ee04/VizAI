# Architecture Decisions

## D-001: Independent logical cameras, even for one physical device

**Status:** Accepted.

ISAPI, HikCentral, and ONVIF registrations use different `cameraId` values and are treated as different cameras by gateway, database, API, and dashboard. The system intentionally does not know they represent the same physical device.

**Rejected:** `physicalCameraId`, authoritative/shadow roles, source arbitration, and a source selector grouped under one physical camera.

**Consequence:** Per-camera values remain isolated. A future global sum could triple-count one doorway, so no implicit all-camera aggregate is allowed.

## D-002: `cameraId` is the end-to-end identity

**Status:** Accepted.

The logical ID is used for lifecycle routing and will be attached by the normalizer to canonical measurements, persisted as `camera_id`, required by API queries, and selected in the dashboard. `adapterId` identifies the connector only.

## D-003: Open-string adapter and capability keys

**Status:** Accepted.

Adapter and capability keys remain strings validated at runtime. This lets future providers/capabilities register without editing a central TypeScript union or switch statement.

## D-004: Provider recipe separated from adapter instance

**Status:** Accepted.

One provider recipe is registered once. `provider.create(registration)` runs for each matching camera and returns one disconnected adapter. Provider construction performs no network activity; `adapter.connect()` owns it.

## D-005: Provider-owned non-secret configuration

**Status:** Accepted.

The shared registration schema validates the `providerConfig` container. The selected provider validates its own fields. Registrations contain `credentialRef`, never raw credentials. Provider-specific credential resolution will occur outside untrusted registration data.

## D-006: Strict runtime and compile-time boundaries

**Status:** Accepted.

Use strict TypeScript for development and AJV for runtime JSON validation because TypeScript interfaces disappear from generated JavaScript. Unknown top-level registration fields are rejected.

## D-007: Bounded, isolated inventory

**Status:** Accepted.

Inventory is an array of at most 1,000 registrations. Empty inventory is valid. Every item is validated, failures identify the entry position without printing its contents, and duplicate logical IDs are rejected before connection.

## D-008: Gateway owns lifecycle and rollback

**Status:** Accepted.

The gateway reserves IDs, creates/connects adapters, discovers capabilities, and stores only successful registrations. It performs best-effort cleanup after failure, checks health independently, removes only after successful disconnect, and reports safe shutdown failures.

## D-009: Periodic hourly people flow first

**Status:** Accepted.

The initial analytics fact is hourly entered/exited flow. Demographics, live events, heat maps, dwell, queues, and other analytics are deferred until their contracts and real provider semantics are proven.

## D-010: Parser output excludes `cameraId`; normalizer attaches it

**Status:** Accepted.

Provider parsers create vendor-neutral observations from native data. The normalizer receives the registered logical camera ID and creates the canonical record. This keeps parsing reusable while guaranteeing each integration's data is stored under its own registration.

## D-011: Provider source metadata is diagnostic, not arbitration metadata

**Status:** Accepted.

Observations retain vendor, protocol, native type, and optional source measurement ID. There is no role, physical grouping, comparison stream, or shadow publication path.

## D-012: ISAPI, then HikCentral, then ONVIF

**Status:** Accepted.

Build a complete direct ISAPI vertical slice first, then add HikCentral using its real deployed API, then perform ONVIF capability discovery and implement only supported features. ONVIF connectivity/PTZ does not imply people-flow analytics.

## D-013: Software proof and live proof are separate

**Status:** Accepted.

Fake adapters and fixtures prove deterministic software behaviour only. Live camera/HikCentral/ONVIF checks must be read-only initially and reported separately. No provider is complete solely because unit tests pass.

## D-014: Guided implementation workflow

**Status:** Accepted.

The user writes implementation in small named steps or coherent small batches. The agent explains, waits, inspects actual files, and verifies before advancing. Small steps use targeted validation and minimum necessary state updates; meaningful checkpoints use broader validation and synchronized recovery state; stage boundaries use the full appropriate validation and affected documentation synchronization. At parent-step boundaries such as Step 1F to Step 1G, the agent summarizes and waits for an explicit `Start Step 1G`. The agent must not restart or silently replace working code.

## D-015: Initial canonical measurement is periodic and camera-scoped

**Status:** Accepted.

The initial `PeopleFlowMeasurement` contract uses type `people.flow`, contract version `1.0.0`, logical `cameraId`, channel, observed/received timestamps, an hourly period, entered/exited counts, `mode: periodic`, `countBasis: vendor-reported-period`, and copied diagnostic source metadata. Measurement ID generation must include or be scoped by logical `cameraId` so equal periods from different registrations cannot collide.

## D-016: Canonical measurement JSON is closed and bounded

**Status:** Accepted.

The `PeopleFlowMeasurement` runtime schema rejects unknown fields at every object level, requires safe IDs and date-time strings, fixes type/version/mode/interval/count-basis constants, and restricts entered/exited values to non-negative safe integers. `sourceMeasurementId` may contain provider-native text up to 256 characters. Cross-field time ordering remains a later semantic-validation concern.

## D-017: Canonical date-time validation is local and strict

**Status:** Accepted.

The AJV parser registers a local `date-time` format instead of adding another dependency. It requires a bounded ISO/RFC3339-shaped timestamp with timezone, validates hour/minute/second and offset ranges, and rejects impossible calendar dates. Validation errors expose schema paths/messages rather than input values. Cross-field ordering such as period start before end remains separate.

## D-018: Periodic measurement IDs are deterministic and camera-scoped

**Status:** Accepted.

The normalizer creates `pf-` plus a full SHA-256 digest of logical `cameraId`, channel ID, period start, and period end separated by null characters. Counts, receive time, and provider source measurement ID are excluded so retries/upserts for the same logical camera/channel/hour retain one ID. Different logical camera IDs produce different IDs even when every provider fact matches.

## D-019: Canonical publication uses a replaceable asynchronous port

**Status:** Accepted.

Core pipeline code publishes a trusted `PeopleFlowMeasurement` through `PeopleFlowOutputPort.publish()`. The interface contains no storage or query methods, so an in-memory adapter can later be replaced by database-backed publication without changing normalization.

## D-020: The in-memory proof uses ID replacement and defensive copies

**Status:** Accepted.

`InMemoryPeopleFlowOutputPort` stores measurements in a map keyed by canonical measurement ID. Republishing the same ID replaces the prior value, matching the retry/upsert semantics enabled by deterministic IDs. Published and returned measurements are cloned, and reads require an explicit `cameraId`; no all-camera aggregation is exposed.

## D-021: Inventory files are bounded and validated completely before connection

**Status:** Accepted.

Local inventory files are limited to one MiB, parsed as untrusted JSON, and passed through the existing complete-inventory validator. File-boundary errors use stable codes and omit paths, contents, and native operating-system details. No adapter is created until the whole inventory, including duplicate-ID checks, is valid.

## D-022: Initial startup registration is sequential and failure-isolated

**Status:** Accepted.

Trusted registrations are attempted in inventory order to avoid an uncontrolled startup connection burst. A provider failure produces only `{ cameraId, status: "failed" }`, does not roll back earlier successful registrations, and does not prevent later registrations. Invalid file-level input rejects before registration, while valid inventory with camera-level failures resolves as `degraded`.

## D-023: ISAPI provider configuration is non-secret and origin-only

**Status:** Accepted.

The initial direct-ISAPI configuration contains only `baseUrl`, provider-native `channelId`, and bounded `requestTimeoutMs`. The base URL must be an HTTP(S) origin without embedded credentials, endpoint path, query, fragment, or surrounding whitespace. Raw username/password remain outside inventory and are resolved later through the registration's `credentialRef`. Initial periodic collection mode and ISAPI endpoint paths are owned by code rather than configurable strings.

## D-024: ISAPI credentials use explicit environment bindings

**Status:** Accepted.

The provider-specific resolver maps each non-secret `credentialRef` through an explicit trusted binding to username/password environment-variable names. It does not derive names by transforming the reference. Credential values exist only in runtime memory, and failures report safe reason codes without values.

## D-025: Direct ISAPI XML transport is bounded and origin-confined

**Status:** Accepted.

The transport uses pinned `digest-fetch`/`node-fetch` dependencies, rejects redirects and request paths that can leave the configured normalized origin, applies request timeouts, limits declared and actual response sizes, and maps authentication, timeout, HTTP, network, size, and path failures into safe categories. pnpm permits only the required `esbuild` install script for the local TypeScript smoke runner.

## D-026: First periodic request targets the previous completed UTC hour

**Status:** Accepted provisionally pending live verification.

The initial code-owned counting request targets one completed UTC hour and labels parsed observations as hourly. The parser enforces bounded match counts, safe integers, valid timestamps, exactly one-hour periods, and secret-safe status failures. Camera-local timezone support must not be added until the online device proves it is required.

## D-027: ISAPI adapter owns initial collection and fixed polling

**Status:** Accepted for the first vertical slice.

`adapter.connect()` performs read-only device information and one report collection before becoming healthy, then starts a five-minute code-owned polling loop. Poll failures degrade health without terminating the loop. `disconnect()` aborts and awaits polling. The provider creates exactly one disconnected adapter for each matching logical registration and performs no network activity itself.

## Deferred decisions

- Cross-field period-time validation.
- Database/runtime server dependencies and migration design, though PostgreSQL/TimescaleDB and Fastify are expected candidates.
- API authentication, deployment host, TLS/reverse proxy, CORS, and production observability.
- Explicit semantics for any future aggregate across logical registrations that observe the same scene.
- Live people-counting event semantics and whether they belong in the first ISAPI provider.
- Actual HikCentral endpoint/auth details until the local product version and documentation are confirmed.
- ONVIF people-flow support until device capability/event discovery is performed.
