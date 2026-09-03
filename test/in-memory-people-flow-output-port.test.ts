import { describe, expect, it } from "vitest";

import type {
  PeopleFlowMeasurement
} from "../src/contracts/people-flow-measurement.js";
import {
  InMemoryPeopleFlowOutputPort
} from "../src/output/in-memory-people-flow-output-port.js";

const ISAPI_ID = `pf-${"a".repeat(64)}`;
const HIKCENTRAL_ID = `pf-${"b".repeat(64)}`;
const ONVIF_ID = `pf-${"c".repeat(64)}`;

interface MeasurementOptions {
  id?: string;
  cameraId?: string;
  entered?: number;
  exited?: number;
  receivedAt?: string;
}

function measurement({
  id = ISAPI_ID,
  cameraId = "entrance-isapi-01",
  entered = 15,
  exited = 11,
  receivedAt = "2026-09-03T04:00:01.000Z"
}: MeasurementOptions = {}) {
  return {
    id,
    type: "people.flow",
    contractVersion: "1.0.0",
    cameraId,
    channelId: "1",
    observedAt: "2026-09-03T04:00:00.000Z",
    receivedAt,
    mode: "periodic",
    period: {
      start: "2026-09-03T03:00:00.000Z",
      end: "2026-09-03T04:00:00.000Z",
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
      nativeType: "peopleCounting",
      sourceMeasurementId: "native-report-001"
    }
  } satisfies PeopleFlowMeasurement;
}

describe("InMemoryPeopleFlowOutputPort", () => {
  it("keeps the three logical cameras separate", async () => {
    const output = new InMemoryPeopleFlowOutputPort();

    await output.publish(measurement({
      id: ISAPI_ID,
      cameraId: "entrance-isapi-01"
    }));

    await output.publish(measurement({
      id: HIKCENTRAL_ID,
      cameraId: "entrance-hikcentral-01"
    }));

    await output.publish(measurement({
      id: ONVIF_ID,
      cameraId: "entrance-onvif-01"
    }));

    expect(
      output
        .listByCameraId("entrance-isapi-01")
        .map((item) => item.id)
    ).toEqual([ISAPI_ID]);

    expect(
      output
        .listByCameraId("entrance-hikcentral-01")
        .map((item) => item.id)
    ).toEqual([HIKCENTRAL_ID]);

    expect(
      output
        .listByCameraId("entrance-onvif-01")
        .map((item) => item.id)
    ).toEqual([ONVIF_ID]);
  });

  it("replaces a retry having the same measurement ID", async () => {
    const output = new InMemoryPeopleFlowOutputPort();

    await output.publish(measurement());

    await output.publish(measurement({
      entered: 25,
      exited: 18,
      receivedAt: "2026-09-03T04:00:05.000Z"
    }));

    const stored =
      output.listByCameraId("entrance-isapi-01");

    expect(stored).toHaveLength(1);

    expect(stored[0]).toMatchObject({
      id: ISAPI_ID,
      receivedAt: "2026-09-03T04:00:05.000Z",
      counts: {
        entered: 25,
        exited: 18
      }
    });
  });

  it("stores a defensive copy of the published value", async () => {
    const output = new InMemoryPeopleFlowOutputPort();
    const input = measurement();

    await output.publish(input);

    input.counts.entered = 999;

    expect(
      output.listByCameraId("entrance-isapi-01")[0]
        ?.counts.entered
    ).toBe(15);
  });

  it("returns defensive copies to readers", async () => {
    const output = new InMemoryPeopleFlowOutputPort();

    await output.publish(measurement());

    const firstRead =
      output.listByCameraId("entrance-isapi-01");

    const mutableCounts = firstRead[0]!.counts as {
      entered: number;
      exited: number;
    };

    mutableCounts.entered = 999;

    expect(
      output.listByCameraId("entrance-isapi-01")[0]
        ?.counts.entered
    ).toBe(15);
  });

  it("returns an empty array for an unknown camera", () => {
    const output = new InMemoryPeopleFlowOutputPort();

    expect(
      output.listByCameraId("unknown-camera")
    ).toEqual([]);
  });
});