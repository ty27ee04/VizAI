import {
  PeriodicPeopleFlowNormalizer
} from "../../core/periodic-people-flow-normalizer.js";
import type {
  PeopleFlowOutputPort
} from "../../output/people-flow-output-port.js";
import type {
  HikvisionCountingReportSource
} from "./hikvision-isapi-counting-report-client.js";
import {
  parseHikvisionCountingReport
} from "./hikvision-isapi-counting-report-parser.js";

export interface HikvisionIsapiPeopleFlowCollector {
  collect(now?: Date): Promise<number>;
}

export class DefaultHikvisionIsapiPeopleFlowCollector
  implements HikvisionIsapiPeopleFlowCollector {
  constructor(
    private readonly cameraId: string,
    private readonly channelId: string,
    private readonly reportSource:
      HikvisionCountingReportSource,
    private readonly normalizer:
      PeriodicPeopleFlowNormalizer,
    private readonly output:
      PeopleFlowOutputPort
  ) {}

  async collect(
    now: Date = new Date()
  ): Promise<number> {
    const xml =
      await this.reportSource
        .searchLastCompletedHour(now);

    const observations =
      parseHikvisionCountingReport(
        xml,
        this.channelId
      );

    for (const observation of observations) {
      const measurement =
        this.normalizer.normalize(
          this.cameraId,
          observation
        );

      await this.output.publish(measurement);
    }

    return observations.length;
  }
}