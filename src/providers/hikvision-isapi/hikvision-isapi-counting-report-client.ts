import type {
  HikvisionIsapiProviderConfig
} from "./hikvision-isapi-config.js";
import type {
  HikvisionIsapiXmlClient
} from "./hikvision-isapi-http-client.js";

const MAXIMUM_COUNTING_REPORT_BYTES =
  2 * 1024 * 1024;

export interface HikvisionCountingSearchRequest {
  readonly path: string;
  readonly body: string;
  readonly periodStart: string;
  readonly periodEnd: string;
}

export interface HikvisionCountingReportSource {
  searchLastCompletedHour(
    now?: Date
  ): Promise<string>;
}

export class HikvisionIsapiCountingReportClient
  implements HikvisionCountingReportSource {
  constructor(
    private readonly config:
      HikvisionIsapiProviderConfig,
    private readonly httpClient:
      HikvisionIsapiXmlClient
  ) {}

  async searchLastCompletedHour(
    now: Date = new Date()
  ): Promise<string> {
    const request =
      buildLastCompletedHourCountingRequest(
        this.config.channelId,
        now
      );

    return this.httpClient.requestXml({
      method: "POST",
      path: request.path,
      body: request.body,
      maximumResponseBytes:
        MAXIMUM_COUNTING_REPORT_BYTES
    });
  }
}

export function buildLastCompletedHourCountingRequest(
  channelId: string,
  now: Date
): HikvisionCountingSearchRequest {
  if (Number.isNaN(now.valueOf())) {
    throw new Error("The report clock is invalid.");
  }

  const hourMilliseconds = 60 * 60 * 1000;

  const endMilliseconds =
    Math.floor(
      now.valueOf() / hourMilliseconds
    ) * hourMilliseconds;

  const start = new Date(
    endMilliseconds - hourMilliseconds
  );

  const end = new Date(endMilliseconds);

  const periodStart = toIsapiTime(start);
  const periodEnd = toIsapiTime(end);

  const safeChannelId =
    encodeURIComponent(channelId);

  return {
    path:
      `/ISAPI/System/Video/inputs/channels/${
        safeChannelId
      }/counting/search`,
    periodStart,
    periodEnd,
    body: `<?xml version="1.0" encoding="UTF-8"?>
<CountingStatisticsDescription version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">
  <statisticType>enterExitDuplicate</statisticType>
  <reportType>daily</reportType>
  <timeSpanList>
    <timeSpan>
      <startTime>${periodStart}</startTime>
      <endTime>${periodEnd}</endTime>
    </timeSpan>
  </timeSpanList>
  <MinTimeInterval>hour</MinTimeInterval>
</CountingStatisticsDescription>`
  };
}

function toIsapiTime(date: Date): string {
  return date.toISOString()
    .replace(".000Z", "Z");
}