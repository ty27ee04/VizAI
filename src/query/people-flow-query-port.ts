import type {
  PeopleFlowMeasurement
} from "../contracts/people-flow-measurement.js";
import type {
  PeopleFlowHistoryQuery
} from "./people-flow-query.js";

export interface PeopleFlowQueryPort {
  history(
    query: PeopleFlowHistoryQuery
  ): Promise<readonly PeopleFlowMeasurement[]>;

  latest(
    cameraId: string
  ): Promise<PeopleFlowMeasurement | undefined>;
}