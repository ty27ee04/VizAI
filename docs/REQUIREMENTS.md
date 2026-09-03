# Requirements

## Purpose

Build a multi-camera integration gateway from zero as a guided learning implementation. The implementation order is shared foundation, Hikvision direct ISAPI, HikCentral, then ONVIF. The system must support many camera registrations, not just the one physical camera available for development.

This project is independent from the adjacent completed/reference `camera-integration-gateway`. Preserve this implementation and use the reference only to verify concepts or vendor behaviour when useful.

## Functional requirements

### Logical camera identity

1. Every registration has a unique `cameraId`.
2. `cameraId` is the identity used by gateway routing, normalized measurements, database rows, API requests/responses, health results, and dashboard selection.
3. The same physical camera may have these independent registrations:
   - `entrance-isapi-01` with adapter `hikvision-isapi`.
   - `entrance-hikcentral-01` with adapter `hikcentral`.
   - `entrance-onvif-01` with adapter `onvif`.
4. The application must treat those registrations as unrelated logical cameras even when they ultimately observe the same doorway/device.
5. Multiple logical cameras may use the same adapter type.
6. Duplicate `cameraId` values are invalid, even if their adapter types differ.
7. No `physicalCameraId`, authoritative/shadow role, source policy, or source arbitration is part of this implementation.

### Registration and inventory

Each registration contains:

- `cameraId`: safe identifier, 1-128 characters.
- `displayName`: non-empty user-facing name, at most 200 characters.
- `adapter`: safe provider-registry key.
- `credentialRef`: reference to credentials stored elsewhere; never raw credentials.
- `providerConfig`: non-secret provider-owned settings.

Runtime validation must reject malformed input and unexpected top-level fields. Inventory input is an array, allows zero registrations, is limited to 1,000 registrations, validates every entry, reports the failing entry position, and rejects duplicate IDs before adapters connect.

### Adapter/provider lifecycle

1. Every adapter exposes `adapterId`, `cameraId`, `connect`, `disconnect`, `discoverCapabilities`, and `checkHealth`.
2. `adapterId` identifies the runtime connector, for example `hikvision-isapi:entrance-isapi-01`; it is not a replacement for `cameraId`.
3. One provider recipe is registered for each adapter type and may create adapters for many camera registrations.
4. Provider configuration is validated before adapter construction.
5. `provider.create()` creates one disconnected adapter. It must not perform network activity.
6. The registry rejects malformed provider keys, duplicate providers, unknown adapters, and adapters that return a different `cameraId`.
7. The registry is extensible and must not contain vendor-specific conditional branches.

### Gateway lifecycle

1. Registration order is: validate input, reserve ID, select provider, validate provider config, create adapter, connect, discover capabilities, store camera.
2. Concurrent registration of the same ID is rejected.
3. Construction, connection, or discovery failure triggers best-effort disconnect and stores no camera.
4. Duplicate capabilities from one adapter are returned once.
5. Camera summaries expose no credentials or provider configuration.
6. Health checks run independently. One thrown provider health error becomes a safe `offline` result and makes aggregate status `degraded` without hiding other cameras.
7. Unregister disconnects before removal, affects only the selected logical camera, and retains the registration when disconnection fails.
8. Concurrent unregister of the same ID is rejected.
9. Shutdown attempts all registered cameras independently, removes successful ones, retains failed ones for retry, and reports only safe failed camera IDs.
10. Application composition must eventually stop new registration work before calling gateway shutdown; concurrent startup/shutdown coordination is intentionally deferred until that composition root exists.

### People-flow pipeline

The intended flow is:

```text
camera/platform response
  -> provider client/parser
  -> vendor-neutral observation
  -> normalizer attaches logical cameraId
  -> canonical people.flow validation
  -> output/storage
  -> database query/analytics
  -> API
  -> dashboard
```

Initial scope is periodic hourly people flow with `entered` and `exited` counts. The provider-neutral observation includes `channelId`, hourly start/end, counts, and diagnostic source metadata (`vendor`, `protocol`, `nativeType`, optional `sourceMeasurementId`). It deliberately does not include `cameraId`; the normalizer attaches the registration's logical ID.

Canonical measurement IDs must include or otherwise be scoped by `cameraId`, so equal source periods from the three logical registrations do not collide.

### Database and query requirements (planned, not implemented)

1. Persist canonical people-flow measurements with `camera_id` and a camera/time index.
2. Every query and analytic calculation must filter by one requested `cameraId` unless an explicit aggregate feature is later approved.
3. Do not implicitly sum ISAPI, HikCentral, and ONVIF registrations; doing so would count one physical scene multiple times.
4. Database choice is planned as PostgreSQL/TimescaleDB to match the surrounding VizAI work, but no schema, migration, repository, or live database exists in this project yet.

### API and dashboard requirements (planned, not implemented)

1. Provide a camera-list endpoint returning safe camera summaries.
2. Analytics endpoints require a `cameraId`, for example `GET /v1/analytics/overview?cameraId=...&from=...&to=...`.
3. API responses retain the selected logical `cameraId`.
4. The dashboard uses a logical camera selector (ISAPI/HikCentral/ONVIF registrations), not a source/shadow selector.
5. Changing the selected camera must update all widgets using that camera ID.
6. No global all-camera total should be added until duplicate-scene semantics are explicitly decided.

### ISAPI requirements (next provider phase; not implemented)

1. Start read-only.
2. Use HTTP Digest authentication for the actual Hikvision camera.
3. First prove safe device-information connectivity.
4. Then implement the periodic people-counting report path and XML parsing for hourly entered/exited values.
5. Normalize only facts returned by the camera; preserve provider source metadata.
6. Prefer the periodic report as the initial dashboard source because its hourly entered/exited semantics are established more clearly than live event semantics.
7. Live alert/event collection is deferred until the periodic vertical slice works and live semantics are verified.
8. Unsupported endpoints or fields must be reported truthfully, not converted to zeros.

### HikCentral requirements (planned after ISAPI)

1. Verify the locally deployed HikCentral product/version and its matching OpenAPI documentation.
2. Use a least-privilege read-only OpenAPI partner/application.
3. Keep partner key/secret and base URL local.
4. Obtain the real HikCentral `cameraIndexCode` from resource data; it is not the VizAI `cameraId`, IP address, or assumed channel.
5. Confirm the actual people-counting API/event supported by that deployment before designing the parser.
6. Register results under `entrance-hikcentral-01` (or another unique logical ID), never under the ISAPI ID.
7. Never copy ISAPI values into HikCentral output.

### ONVIF requirements (planned after HikCentral)

1. Begin with `GetServices`/`GetCapabilities`, media profiles, analytics capabilities, metadata, and event-topic discovery.
2. Implement only capabilities actually advertised and proven by the device.
3. Basic ONVIF connectivity or PTZ does not prove ONVIF people-flow support.
4. If directional people counting is absent, report `people flow unsupported`; do not infer counts from generic motion events.
5. Register ONVIF under its own logical `cameraId`.

## Non-functional requirements

- Node.js 22+, pnpm, strict TypeScript ESM (`NodeNext`), AJV runtime validation, and Vitest.
- Preserve working behaviour and add regression tests for each checkpoint.
- Keep provider/client/parser concerns out of the shared gateway core.
- Keep errors returned from shared status/shutdown boundaries free of URLs, credentials, tokens, and provider exception text.
- Bound inventory/config input sizes and reject unsafe IDs.
- Isolate per-camera failures; one camera must not prevent unrelated cameras from being represented or checked.
- Use deterministic clocks and controllable test doubles where timing matters.
- Label deterministic fake/software tests separately from live network/device checks.
- Saved real responses may become fixtures only after sanitization.
- Do not log `.env` values or include secrets in configuration inventory, tests, documentation, or chat.

## Testing and acceptance requirements

Each checkpoint requires a TypeScript build and relevant Vitest regression tests. Provider completion additionally requires configuration validation, client/parser edge cases, lifecycle/retry behaviour, canonical schema validation, storage/API regressions, and a separately labelled live smoke test against the actual deployment.

Passing software tests does not prove credentials, network reachability, firmware compatibility, physical-camera identity, HikCentral API availability, ONVIF analytics support, database deployment, or production hosting.

## Assumptions and unresolved questions

- The development device is Hikvision and may be reachable through direct ISAPI, HikCentral, and ONVIF, but only ISAPI behaviour has historical evidence in the adjacent reference project; none is live-verified in this new project.
- Database, server framework, API authentication, CORS, HTTPS/reverse proxy, deployment host, and dashboard framework are not yet implemented. PostgreSQL/TimescaleDB and Fastify are likely choices but must be introduced only at their planned checkpoints.
- The product behaviour for an intentional aggregate across logical registrations observing the same physical scene is unresolved. Default behaviour is per-camera selection with no implicit aggregate.
- Test TypeScript under `test/` is transformed by Vitest but excluded from the current production `tsc` build; adding a dedicated test type-check configuration is technical debt.
