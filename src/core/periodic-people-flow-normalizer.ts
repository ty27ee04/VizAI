import { createHash } from "node:crypto";

import {
  PEOPLE_FLOW_CONTRACT_VERSION,
  type PeopleFlowMeasurement
} from "../contracts/people-flow-measurement.js";
import {
  parsePeopleFlowMeasurement
} from "../contracts/people-flow-measurement-validator.js";
import type {
  PeriodicPeopleFlowObservation
} from "../observations/periodic-people-flow-observation.js";

/**
 * Converts provider-neutral observations into canonical measurements.
 */
export class PeriodicPeopleFlowNormalizer {
  constructor(
    private readonly now: () => Date = () => new Date()
  ) {}

  normalize(
    cameraId: string,
    observation: PeriodicPeopleFlowObservation
  ): PeopleFlowMeasurement {
    const measurement = {
      id: createMeasurementId(cameraId, observation),
      type: "people.flow",
      contractVersion: PEOPLE_FLOW_CONTRACT_VERSION,
      cameraId,
      channelId: observation.channelId,
      observedAt: observation.period.end,
      receivedAt: this.now().toISOString(),
      mode: "periodic",
      period: {
        start: observation.period.start,
        end: observation.period.end,
        interval: observation.period.interval
      },
      counts: {
        entered: observation.counts.entered,
        exited: observation.counts.exited
      },
      countBasis: "vendor-reported-period",
      source: {
        vendor: observation.source.vendor,
        protocol: observation.source.protocol,
        nativeType: observation.source.nativeType,

        ...(observation.source.sourceMeasurementId !== undefined
          ? {
              sourceMeasurementId:
                observation.source.sourceMeasurementId
            }
          : {})
      }
    };

    return parsePeopleFlowMeasurement(measurement);
  }
}

/**
 * Creates one stable identity for one logical camera/channel/hour.
 *
 * receivedAt and counts are deliberately excluded so retrying the same
 * provider period produces the same measurement ID.
 */
function createMeasurementId(
  cameraId: string,
  observation: PeriodicPeopleFlowObservation
): string {
  const identity = [
    cameraId,
    observation.channelId,
    observation.period.start,
    observation.period.end
  ].join("\u0000");

  const digest = createHash("sha256")
    .update(identity, "utf8")
    .digest("hex");

  return `pf-${digest}`;
}