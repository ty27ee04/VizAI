import type {
  PeopleFlowHistoryQuery
} from "../query/people-flow-query.js";
import type {
  PeopleFlowQueryPort
} from "../query/people-flow-query-port.js";

export interface PeopleFlowOverview {
  readonly cameraId: string;
  readonly from: string;
  readonly to: string;
  readonly measurements: number;
  readonly entered: number;
  readonly exited: number;
  readonly totalTraffic: number;
}

export class PeopleFlowAnalyticsService {
  constructor(
    private readonly queryPort:
      PeopleFlowQueryPort
  ) {}

  async overview(
    query: PeopleFlowHistoryQuery
  ): Promise<PeopleFlowOverview> {
    const measurements =
      await this.queryPort.history(query);

    let entered = 0;
    let exited = 0;

    for (const measurement of measurements) {
      if (
        measurement.cameraId
        !== query.cameraId
      ) {
        throw new Error(
          "Query port returned a different cameraId."
        );
      }

      entered += measurement.counts.entered;
      exited += measurement.counts.exited;

      if (
        !Number.isSafeInteger(entered)
        || !Number.isSafeInteger(exited)
      ) {
        throw new Error(
          "People-flow aggregate exceeded the safe integer range."
        );
      }
    }

    return {
      cameraId: query.cameraId,
      from: query.from,
      to: query.to,
      measurements: measurements.length,
      entered,
      exited,
      totalTraffic: entered + exited
    };
  }
}