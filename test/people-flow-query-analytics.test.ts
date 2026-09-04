import {
  describe,
  expect,
  it,
  vi
} from "vitest";
import type { Pool } from "pg";

import type {
  PeopleFlowMeasurement
} from "../src/contracts/people-flow-measurement.js";
import {
  PeopleFlowAnalyticsService
} from "../src/analytics/people-flow-analytics-service.js";
import {
  parsePeopleFlowHistoryQuery
} from "../src/query/people-flow-query.js";
import {
  PostgresPeopleFlowQueryRepository
} from "../src/query/postgres-people-flow-query-repository.js";
import type {
  PeopleFlowQueryPort
} from "../src/query/people-flow-query-port.js";

const query = {
  cameraId: "entrance-isapi-01",
  from: "2026-09-03T00:00:00.000Z",
  to: "2026-09-04T00:00:00.000Z",
  limit: 24
};

function measurement(
  cameraId: string,
  entered: number,
  exited: number
): PeopleFlowMeasurement {
  return {
    id: `pf-${cameraId}`,
    type: "people.flow",
    contractVersion: "1.0.0",
    cameraId,
    channelId: "1",
    observedAt: "2026-09-03T10:00:00Z",
    receivedAt: "2026-09-03T10:00:05Z",
    mode: "periodic",
    period: {
      start: "2026-09-03T09:00:00Z",
      end: "2026-09-03T10:00:00Z",
      interval: "hour"
    },
    counts: {
      entered,
      exited
    },
    countBasis: "vendor-reported-period",
    source: {
      vendor: "hikvision",
      protocol: "isapi",
      nativeType: "PeopleCounting"
    }
  };
}

describe("people-flow queries and analytics", () => {
  it("requires cameraId", () => {
    expect(() =>
      parsePeopleFlowHistoryQuery({
        from: query.from,
        to: query.to
      })
    ).toThrow();
  });

  it("places cameraId in the SQL parameters", async () => {
    const databaseQuery = vi.fn(async () => ({
      rows: [],
      rowCount: 0
    }));

    const repository =
      new PostgresPeopleFlowQueryRepository({
        query: databaseQuery
      } as unknown as Pool);

    await repository.history(query);

    expect(databaseQuery.mock.calls[0]?.[1]?.[0])
      .toBe("entrance-isapi-01");
  });

  it("aggregates only the requested camera", async () => {
    const queryPort: PeopleFlowQueryPort = {
      history: vi.fn(async () => [
        measurement(
          "entrance-isapi-01",
          7,
          4
        ),
        measurement(
          "entrance-isapi-01",
          3,
          2
        )
      ]),
      latest: vi.fn()
    };

    const service =
      new PeopleFlowAnalyticsService(queryPort);

    await expect(
      service.overview(query)
    ).resolves.toEqual({
      cameraId: "entrance-isapi-01",
      from: query.from,
      to: query.to,
      measurements: 2,
      entered: 10,
      exited: 6,
      totalTraffic: 16
    });
  });

  it("rejects repository identity leakage", async () => {
    const queryPort: PeopleFlowQueryPort = {
      history: vi.fn(async () => [
        measurement(
          "entrance-hikcentral-01",
          100,
          100
        )
      ]),
      latest: vi.fn()
    };

    const service =
      new PeopleFlowAnalyticsService(queryPort);

    await expect(
      service.overview(query)
    ).rejects.toThrow(
      "different cameraId"
    );
  });
});