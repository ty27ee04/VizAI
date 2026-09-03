import { describe, expect, it } from "vitest";

import {
  InvalidPeopleFlowMeasurementError
} from "../src/contracts/people-flow-measurement-validator.js";
import {
  PeriodicPeopleFlowNormalizer
} from "../src/core/periodic-people-flow-normalizer.js";
import type {
  PeriodicPeopleFlowObservation
} from "../src/observations/periodic-people-flow-observation.js";

const FIRST_RECEIVED_TIME =
  new Date("2026-09-03T04:00:01.000Z");

const SECOND_RECEIVED_TIME =
  new Date("2026-09-03T04:00:05.000Z");

function observation(): PeriodicPeopleFlowObservation {
  return {
    channelId: "1",
    period: {
      start: "2026-09-03T03:00:00.000Z",
      end: "2026-09-03T04:00:00.000Z",
      interval: "hour"
    },
    counts: {
      entered: 15,
      exited: 11
    },
    source: {
      vendor: "hikvision",
      protocol: "isapi",
      nativeType: "peopleCounting",
      sourceMeasurementId: "native-report-001"
    }
  };
}

describe("PeriodicPeopleFlowNormalizer", () => {
  it("maps a provider observation into the canonical contract", () => {
    const normalizer = new PeriodicPeopleFlowNormalizer(
      () => FIRST_RECEIVED_TIME
    );

    const result = normalizer.normalize(
      "entrance-isapi-01",
      observation()
    );

    expect(result).toMatchObject({
      type: "people.flow",
      contractVersion: "1.0.0",
      cameraId: "entrance-isapi-01",
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
    });

    expect(result.id).toMatch(/^pf-[a-f0-9]{64}$/);
    expect(result).not.toHaveProperty("physicalCameraId");
    expect(result).not.toHaveProperty("sourceRole");
  });

  it("omits sourceMeasurementId when the provider has none", () => {
    const original = observation();
    const {
      sourceMeasurementId: _removedSourceId,
      ...source
    } = original.source;

    const input: PeriodicPeopleFlowObservation = {
      ...original,
      source
    };

    const result = new PeriodicPeopleFlowNormalizer(
      () => FIRST_RECEIVED_TIME
    ).normalize("entrance-isapi-01", input);

    expect(result.source)
      .not
      .toHaveProperty("sourceMeasurementId");
  });

  it("keeps the same ID when the same period is retried", () => {
    const firstInput = observation();
    const secondInput: PeriodicPeopleFlowObservation = {
      ...firstInput,
      counts: {
        entered: 16,
        exited: 12
      },
      source: {
        ...firstInput.source,
        sourceMeasurementId: "native-report-retry"
      }
    };

    const first = new PeriodicPeopleFlowNormalizer(
      () => FIRST_RECEIVED_TIME
    ).normalize("entrance-isapi-01", firstInput);

    const second = new PeriodicPeopleFlowNormalizer(
      () => SECOND_RECEIVED_TIME
    ).normalize("entrance-isapi-01", secondInput);

    expect(second.id).toBe(first.id);
    expect(second.receivedAt).not.toBe(first.receivedAt);
    expect(second.counts).not.toEqual(first.counts);
  });

  it("creates different IDs for three logical cameras", () => {
    const normalizer = new PeriodicPeopleFlowNormalizer(
      () => FIRST_RECEIVED_TIME
    );

    const results = [
      "entrance-isapi-01",
      "entrance-hikcentral-01",
      "entrance-onvif-01"
    ].map((cameraId) =>
      normalizer.normalize(cameraId, observation())
    );

    expect(new Set(
      results.map((result) => result.id)
    ).size).toBe(3);

    expect(results.map((result) => result.cameraId)).toEqual([
      "entrance-isapi-01",
      "entrance-hikcentral-01",
      "entrance-onvif-01"
    ]);
  });

  it("changes the ID when channel or period changes", () => {
    const normalizer = new PeriodicPeopleFlowNormalizer(
      () => FIRST_RECEIVED_TIME
    );
    const original = observation();

    const base = normalizer.normalize(
      "entrance-isapi-01",
      original
    );

    const anotherChannel = normalizer.normalize(
      "entrance-isapi-01",
      {
        ...original,
        channelId: "2"
      }
    );

    const anotherPeriod = normalizer.normalize(
      "entrance-isapi-01",
      {
        ...original,
        period: {
          ...original.period,
          start: "2026-09-03T04:00:00.000Z",
          end: "2026-09-03T05:00:00.000Z"
        }
      }
    );

    expect(anotherChannel.id).not.toBe(base.id);
    expect(anotherPeriod.id).not.toBe(base.id);
  });

  it("rejects output containing invalid provider facts", () => {
    const original = observation();
    const invalid: PeriodicPeopleFlowObservation = {
      ...original,
      counts: {
        ...original.counts,
        entered: -1
      }
    };

    const normalizer = new PeriodicPeopleFlowNormalizer(
      () => FIRST_RECEIVED_TIME
    );

    expect(() => normalizer.normalize(
      "entrance-isapi-01",
      invalid
    )).toThrow(InvalidPeopleFlowMeasurementError);
  });
});