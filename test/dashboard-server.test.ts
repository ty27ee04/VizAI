import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  PeopleFlowAnalyticsService
} from "../src/analytics/people-flow-analytics-service.js";
import {
  createDashboardServer
} from "../src/dashboard/create-dashboard-server.js";
import type {
  CameraGateway
} from "../src/core/camera-gateway.js";
import type {
  PeopleFlowQueryPort
} from "../src/query/people-flow-query-port.js";

describe("dashboard server", () => {
  const servers: ReturnType<
    typeof createDashboardServer
  >[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        async (server) => server.close()
      )
    );
  });

  it("serves the selector dashboard", async () => {
    const app = createServer();
    servers.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/"
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(
      'id="camera-selector"'
    );
  });

  it("camera-scopes every widget request", async () => {
    const app = createServer();
    servers.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/dashboard.js"
    });

    expect(response.body).toContain(
      "encodeURIComponent(cameraId)"
    );
    expect(response.body).toContain(
      "/v1/analytics/overview?"
    );
    expect(response.body).toContain(
      "/v1/people-flow/history?"
    );
    expect(response.body).not.toContain(
      "innerHTML"
    );
  });
});

function createServer() {
  const peopleFlowQuery: PeopleFlowQueryPort = {
    history: vi.fn(async () => []),
    latest: vi.fn(async () => undefined)
  };

  return createDashboardServer({
    gateway: {
      listCameras: () => [],
      health: async () => ({
        status: "healthy",
        cameras: []
      })
    } as Pick<
      CameraGateway,
      "listCameras" | "health"
    >,
    peopleFlowQuery,
    analytics:
      new PeopleFlowAnalyticsService(
        peopleFlowQuery
      )
  });
}