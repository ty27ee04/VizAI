import {
  PeopleFlowAnalyticsService
} from "./analytics/people-flow-analytics-service.js";
import {
  CameraGateway
} from "./core/camera-gateway.js";
import {
  createDashboardServer
} from "./dashboard/create-dashboard-server.js";
import {
  readPostgresConfig,
  readPostgresCredentials
} from "./database/postgres-config.js";
import {
  createPostgresPool
} from "./database/postgres-pool.js";
import {
  runDatabaseMigrations
} from "./database/run-database-migrations.js";
import {
  PostgresPeopleFlowOutputPort
} from "./output/postgres-people-flow-output-port.js";
import {
  PostgresPeopleFlowQueryRepository
} from "./query/postgres-people-flow-query-repository.js";
import {
  createAdapterRegistryFromPlugins
} from "./startup/create-adapter-registry-from-plugins.js";
import {
  startCameraGatewayFromFile
} from "./startup/start-camera-gateway-from-file.js";

const databaseConfig =
  readPostgresConfig(process.env);

const databaseCredentials =
  readPostgresCredentials(process.env);

const pool = createPostgresPool(
  databaseConfig,
  databaseCredentials
);

await runDatabaseMigrations(pool);

const output =
  new PostgresPeopleFlowOutputPort(pool);

/**
 * No brand provider is imported here.
 *
 * Installed provider folders are discovered automatically. Each plugin
 * receives the shared output port and trusted runtime environment.
 */
const registry =
  await createAdapterRegistryFromPlugins({
    output,
    environment: process.env
  });

const gateway = new CameraGateway(registry);

const startupReport =
  await startCameraGatewayFromFile(
    gateway,
    requiredEnvironmentValue(
      "VIZAI_CAMERA_INVENTORY_FILE"
    )
  );

console.log(JSON.stringify({
  event: "camera-startup",
  status: startupReport.status,
  results: startupReport.results,
  installedAdapterTypes:
    registry.listAdapterTypes()
}, null, 2));

const queryRepository =
  new PostgresPeopleFlowQueryRepository(pool);

const server = createDashboardServer({
  gateway,
  peopleFlowQuery: queryRepository,
  analytics:
    new PeopleFlowAnalyticsService(
      queryRepository
    )
});

const port = readPort(
  process.env["VIZAI_HTTP_PORT"]
  ?? "3000"
);

const address = await server.listen({
  host: "127.0.0.1",
  port
});

console.log(JSON.stringify({
  event: "server-started",
  address
}, null, 2));

let shutdownStarted = false;

async function shutdown(): Promise<void> {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;

  await server.close();

  await gateway.shutdown().catch(
    () => undefined
  );

  await pool.end();
}

process.once("SIGINT", () => {
  void shutdown().finally(() => {
    process.exitCode = 0;
  });
});

process.once("SIGTERM", () => {
  void shutdown().finally(() => {
    process.exitCode = 0;
  });
});

function requiredEnvironmentValue(
  name: string
): string {
  const value = process.env[name];

  if (
    value === undefined
    || value === ""
  ) {
    throw new Error(
      `Required environment variable ${
        name
      } is unavailable.`
    );
  }

  return value;
}

function readPort(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(
      "VIZAI_HTTP_PORT is invalid."
    );
  }

  const port = Number(value);

  if (
    !Number.isSafeInteger(port)
    || port < 1
    || port > 65_535
  ) {
    throw new Error(
      "VIZAI_HTTP_PORT is invalid."
    );
  }

  return port;
}