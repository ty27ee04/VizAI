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
  PostgresPeopleFlowOutputPort
} from "../src/output/postgres-people-flow-output-port.js";

function measurement(
  cameraId: string,
  id: string
): PeopleFlowMeasurement {
  return {
    id,
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
      entered: 7,
      exited: 4
    },
    countBasis: "vendor-reported-period",
    source: {
      vendor: "hikvision",
      protocol: "isapi",
      nativeType: "PeopleCounting"
    }
  };
}

describe("PostgresPeopleFlowOutputPort", () => {
  it("uses parameters and includes cameraId", async () => {
    const query = vi.fn(async () => ({
      rows: [],
      rowCount: 1
    }));

    const output =
      new PostgresPeopleFlowOutputPort({
        query
      } as unknown as Pool);

    await output.publish(
      measurement("entrance-isapi-01", "pf-isapi")
    );

    const [sql, values] = query.mock.calls[0] as [
      string,
      readonly unknown[]
    ];

    expect(sql).toContain(
      "ON CONFLICT (id, observed_at)"
    );
    expect(sql).toContain("$4");
    expect(values[3]).toBe("entrance-isapi-01");
  });

  it("keeps logical cameras in separate calls", async () => {
    const query = vi.fn(async () => ({
      rows: [],
      rowCount: 1
    }));

    const output =
      new PostgresPeopleFlowOutputPort({
        query
      } as unknown as Pool);

    await output.publish(
      measurement("entrance-isapi-01", "pf-isapi")
    );
    await output.publish(
      measurement(
        "entrance-hikcentral-01",
        "pf-hikcentral"
      )
    );

    expect(query.mock.calls[0]?.[1]?.[3])
      .toBe("entrance-isapi-01");
    expect(query.mock.calls[1]?.[1]?.[3])
      .toBe("entrance-hikcentral-01");
  });
});