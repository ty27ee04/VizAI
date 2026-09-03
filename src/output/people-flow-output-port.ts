import type {
  PeopleFlowMeasurement
} from "../contracts/people-flow-measurement.js";

/**
 * Publishes one trusted canonical people-flow measurement.
 */
export interface PeopleFlowOutputPort {
  publish(measurement: PeopleFlowMeasurement): Promise<void>;
}