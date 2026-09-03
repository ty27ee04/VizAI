import {
  PEOPLE_FLOW_CONTRACT_VERSION
} from "./people-flow-measurement.js";

const safeId = {
  type: "string",
  minLength: 1,
  maxLength: 128,
  pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$"
} as const;

const timestamp = {
  type: "string",
  format: "date-time"
} as const;

const nonNegativeCount = {
  type: "integer",
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER
} as const;

/**
 * Runtime rules for canonical periodic people-flow measurements.
 */
export const peopleFlowMeasurementSchema = {
  $id: "https://vizai.local/schemas/people-flow-measurement.json",
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "type",
    "contractVersion",
    "cameraId",
    "channelId",
    "observedAt",
    "receivedAt",
    "mode",
    "period",
    "counts",
    "countBasis",
    "source"
  ],
  properties: {
    id: safeId,

    type: {
      const: "people.flow"
    },

    contractVersion: {
      const: PEOPLE_FLOW_CONTRACT_VERSION
    },

    cameraId: safeId,
    channelId: safeId,

    observedAt: timestamp,
    receivedAt: timestamp,

    mode: {
      const: "periodic"
    },

    period: {
      type: "object",
      additionalProperties: false,
      required: [
        "start",
        "end",
        "interval"
      ],
      properties: {
        start: timestamp,
        end: timestamp,
        interval: {
          const: "hour"
        }
      }
    },

    counts: {
      type: "object",
      additionalProperties: false,
      required: [
        "entered",
        "exited"
      ],
      properties: {
        entered: nonNegativeCount,
        exited: nonNegativeCount
      }
    },

    countBasis: {
      const: "vendor-reported-period"
    },

    source: {
      type: "object",
      additionalProperties: false,
      required: [
        "vendor",
        "protocol",
        "nativeType"
      ],
      properties: {
        vendor: safeId,
        protocol: safeId,

        nativeType: {
          type: "string",
          minLength: 1,
          maxLength: 128
        },

        sourceMeasurementId: {
          type: "string",
          minLength: 1,
          maxLength: 256
        }
      }
    }
  }
} as const;