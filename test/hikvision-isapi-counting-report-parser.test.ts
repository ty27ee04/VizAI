import {
  describe,
  expect,
  it
} from "vitest";

import {
  InvalidHikvisionCountingReportError,
  parseHikvisionCountingReport
} from "../src/providers/hikvision-isapi/hikvision-isapi-counting-report-parser.js";
import {
  EMPTY_HIKVISION_COUNTING_REPORT,
  VALID_HIKVISION_COUNTING_REPORT
} from "./support/hikvision-counting-report-fixtures.js";

describe("parseHikvisionCountingReport", () => {
  it("creates one provider-neutral observation", () => {
    expect(
      parseHikvisionCountingReport(
        VALID_HIKVISION_COUNTING_REPORT,
        "1"
      )
    ).toEqual([
      {
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
          nativeType:
            "CountingStatisticsResult",
          sourceMeasurementId:
            "1:2026-09-03T03:00:00.000Z:2026-09-03T04:00:00.000Z"
        }
      }
    ]);
  });

  it("returns an empty array for no matches", () => {
    expect(
      parseHikvisionCountingReport(
        EMPTY_HIKVISION_COUNTING_REPORT,
        "1"
      )
    ).toEqual([]);
  });

  it("rejects unrelated XML", () => {
    expect(() =>
      parseHikvisionCountingReport(
        "<DeviceInfo />",
        "1"
      )
    ).toThrow(
      InvalidHikvisionCountingReportError
    );
  });

  it("rejects malformed counts", () => {
    expect(() =>
      parseHikvisionCountingReport(
        VALID_HIKVISION_COUNTING_REPORT
          .replace("<enterCount>15</enterCount>",
            "<enterCount>-1</enterCount>"),
        "1"
      )
    ).toThrow(
      InvalidHikvisionCountingReportError
    );
  });

  it("rejects a false declared match count", () => {
    expect(() =>
      parseHikvisionCountingReport(
        VALID_HIKVISION_COUNTING_REPORT
          .replace(
            "<numOfMatches>1</numOfMatches>",
            "<numOfMatches>2</numOfMatches>"
          ),
        "1"
      )
    ).toThrow(
      InvalidHikvisionCountingReportError
    );
  });

  it("does not copy native status text into errors", () => {
    const privateMarker =
        "must-not-appear-in-parser-error";

    let capturedError: unknown;

    try {
        parseHikvisionCountingReport(
        `<CountingStatisticsResult>
            <responseStatusStrg>${privateMarker}</responseStatusStrg>
        </CountingStatisticsResult>`,
        "1"
        );
    } catch (error) {
        capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(
        InvalidHikvisionCountingReportError
    );

    expect((capturedError as Error).message)
        .not.toContain(privateMarker);
    });
});