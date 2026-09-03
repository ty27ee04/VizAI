import { describe, expect, it } from "vitest";

import {
  PEOPLE_FLOW_CONTRACT_VERSION
} from "../src/contracts/people-flow-measurement.js";
import {
  InvalidPeopleFlowMeasurementError,
  parsePeopleFlowMeasurement
} from "../src/contracts/people-flow-measurement-validator.js";

function validMeasurement(
  cameraId = "entrance-isapi-01"
) {
  return {
    id: `pf-${cameraId}`,
    type: "people.flow",
    contractVersion: PEOPLE_FLOW_CONTRACT_VERSION,
    cameraId,
    channelId: "1",
    observedAt: "2026-09-03T04:00:00.000Z",
    receivedAt: "2026-09-03T04:00:01.000Z",
    mode: "periodic",
    period: {
      start: "2026-09-03T03:00:00.000Z",
      end: "2026-09-03T04:00:00.000Z",
      interval: "hour"
    },
    counts: {
      entered: 15,
      exited: 11
    },
    countBasis: "vendor-reported-period",
    source: {
      vendor: "hikvision",
      protocol: "isapi",
      nativeType: "peopleCounting",
      sourceMeasurementId: "native-report-001"
    }
  };
}

describe("parsePeopleFlowMeasurement", () => {
  it("accepts a valid periodic measurement", () => {
    const input = validMeasurement();

    const result = parsePeopleFlowMeasurement(input);

    expect(result).toEqual(input);
    expect(result.cameraId).toBe("entrance-isapi-01");
  });

  it("accepts three independent logical camera IDs", () => {
    const results = [
      validMeasurement("entrance-isapi-01"),
      validMeasurement("entrance-hikcentral-01"),
      validMeasurement("entrance-onvif-01")
    ].map(parsePeopleFlowMeasurement);

    expect(results.map((item) => item.cameraId)).toEqual([
      "entrance-isapi-01",
      "entrance-hikcentral-01",
      "entrance-onvif-01"
    ]);
  });

  it("rejects a missing required field", () => {
    const {
      cameraId: _removedCameraId,
      ...input
    } = validMeasurement();

    expect(() => parsePeopleFlowMeasurement(input))
      .toThrow(InvalidPeopleFlowMeasurementError);
  });

  it("rejects unexpected top-level fields without exposing values", () => {
    const input = {
      ...validMeasurement(),
      password: "actual-secret-value"
    };

    let capturedError: unknown;

    try {
      parsePeopleFlowMeasurement(input);
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError)
      .toBeInstanceOf(InvalidPeopleFlowMeasurementError);
    expect(String(capturedError))
      .not
      .toContain("actual-secret-value");
  });

  it("rejects source role and shadow metadata", () => {
    const valid = validMeasurement();
    const input = {
      ...valid,
      source: {
        ...valid.source,
        sourceRole: "shadow"
      }
    };

    expect(() => parsePeopleFlowMeasurement(input))
      .toThrow(InvalidPeopleFlowMeasurementError);
  });

  it("rejects incorrect canonical constants", () => {
    const valid = validMeasurement();
    const input = {
      ...valid,
      type: "people.count",
      contractVersion: "9.0.0",
      mode: "live",
      countBasis: "estimated",
      period: {
        ...valid.period,
        interval: "day"
      }
    };

    expect(() => parsePeopleFlowMeasurement(input))
      .toThrow(InvalidPeopleFlowMeasurementError);
  });

  it("rejects negative, fractional, and unsafe counts", () => {
    const invalidCounts = [
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1
    ];

    for (const entered of invalidCounts) {
      const valid = validMeasurement();
      const input = {
        ...valid,
        counts: {
          ...valid.counts,
          entered
        }
      };

      expect(() => parsePeopleFlowMeasurement(input))
        .toThrow(InvalidPeopleFlowMeasurementError);
    }
  });

  it("rejects unsafe identifiers", () => {
    const invalidCameraIds = [
      "entrance camera",
      "entrance/camera",
      ""
    ];

    for (const cameraId of invalidCameraIds) {
      expect(() => parsePeopleFlowMeasurement(
        validMeasurement(cameraId)
      )).toThrow(InvalidPeopleFlowMeasurementError);
    }
  });

  it("rejects timestamps without a valid timezone shape", () => {
    const invalidTimestamps = [
      "2026-09-03 04:00:00",
      "2026-09-03T04:00:00",
      "not-a-date"
    ];

    for (const observedAt of invalidTimestamps) {
      const input = {
        ...validMeasurement(),
        observedAt
      };

      expect(() => parsePeopleFlowMeasurement(input))
        .toThrow(InvalidPeopleFlowMeasurementError);
    }
  });

  it("rejects an impossible calendar date", () => {
    const input = {
      ...validMeasurement(),
      observedAt: "2026-02-30T04:00:00.000Z"
    };

    expect(() => parsePeopleFlowMeasurement(input))
      .toThrow(InvalidPeopleFlowMeasurementError);
  });
});