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
  createApiServer
} from "../src/api/create-api-server.js";
import type {
  CameraGateway
} from "../src/core/camera-gateway.js";
import type {
  PeopleFlowQueryPort
} from "../src/query/people-flow-query-port.js";

function dependencies() {
  const peopleFlowQuery: PeopleFlowQueryPort = {
    history: vi.fn(async () => []),
    latest: vi.fn(async () => undefined)
  };

  const gateway = {
    listCameras: () => [
      {
        cameraId: "entrance-isapi-01",
        adapterId:
          "hikvision-isapi:entrance-isapi-01",
        capabilities: ["people.flow"]
      },
      {
        cameraId: "entrance-onvif-01",
        adapterId: "onvif:entrance-onvif-01",
        capabilities: []
      }
    ],
    health: async () => ({
      status: "degraded" as const,
      cameras: [
        {
          cameraId: "entrance-isapi-01",
          adapterId:
            "hikvision-isapi:entrance-isapi-01",
          status: "healthy" as const,
          checkedAt:
            "2026-09-03T10:00:00Z"
        }
      ]
    })
  } as Pick<
    CameraGateway,
    "listCameras" | "health"
  >;

  return {
    gateway,
    peopleFlowQuery,
    analytics:
      new PeopleFlowAnalyticsService(
        peopleFlowQuery
      )
  };
}

describe("API server", () => {
  const servers: ReturnType<
    typeof createApiServer
  >[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        async (server) => server.close()
      )
    );
  });

  it("lists independent logical cameras", async () => {
    const app = createApiServer(dependencies());
    servers.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/cameras"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().cameras)
      .toHaveLength(2);
  });

  it("requires cameraId for history", async () => {
    const app = createApiServer(dependencies());
    servers.push(app);

    const response = await app.inject({
      method: "GET",
      url:
        "/v1/people-flow/history"
        + "?from=2026-09-03T00:00:00.000Z"
        + "&to=2026-09-04T00:00:00.000Z"
    });

    expect(response.statusCode).toBe(400);
  });

  it("passes the selected ID to latest", async () => {
    const deps = dependencies();
    const app = createApiServer(deps);
    servers.push(app);

    await app.inject({
      method: "GET",
      url:
        "/v1/people-flow/latest"
        + "?cameraId=entrance-isapi-01"
    });

    expect(
      deps.peopleFlowQuery.latest
    ).toHaveBeenCalledWith(
      "entrance-isapi-01"
    );
  });

  it("returns one selected camera health", async () => {
    const app = createApiServer(dependencies());
    servers.push(app);

    const response = await app.inject({
      method: "GET",
      url:
        "/v1/cameras/"
        + "entrance-isapi-01/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().camera.cameraId)
      .toBe("entrance-isapi-01");
  });

  it("does not expose unexpected errors", async () => {
    const deps = dependencies();

    vi.mocked(
      deps.peopleFlowQuery.latest
    ).mockRejectedValueOnce(
      new Error(
        "password=secret database details"
      )
    );

    const app = createApiServer(deps);
    servers.push(app);

    const response = await app.inject({
      method: "GET",
      url:
        "/v1/people-flow/latest"
        + "?cameraId=entrance-isapi-01"
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain(
      "password=secret"
    );
  });
});