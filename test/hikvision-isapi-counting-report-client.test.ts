import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  HikvisionIsapiCountingReportClient,
  buildLastCompletedHourCountingRequest
} from "../src/providers/hikvision-isapi/hikvision-isapi-counting-report-client.js";

const NOW =
  new Date("2026-09-03T04:37:20.000Z");

describe("Hikvision counting report client", () => {
  it("builds the previous completed UTC hour", () => {
    const request =
      buildLastCompletedHourCountingRequest(
        "1",
        NOW
      );

    expect(request.periodStart)
      .toBe("2026-09-03T03:00:00Z");

    expect(request.periodEnd)
      .toBe("2026-09-03T04:00:00Z");

    expect(request.path).toBe(
      "/ISAPI/System/Video/inputs/channels/1/counting/search"
    );

    expect(request.body)
      .toContain("<MinTimeInterval>hour</MinTimeInterval>");
  });

  it("rejects an invalid clock", () => {
    expect(() =>
      buildLastCompletedHourCountingRequest(
        "1",
        new Date("invalid")
      )
    ).toThrow("report clock is invalid");
  });

  it("posts a bounded XML request", async () => {
    const requestXml = vi.fn()
      .mockResolvedValue("<CountingStatisticsResult />");

    const client =
      new HikvisionIsapiCountingReportClient(
        {
          baseUrl: "http://camera.local",
          channelId: "1",
          requestTimeoutMs: 5_000
        },
        { requestXml }
      );

    await client.searchLastCompletedHour(NOW);

    expect(requestXml).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path:
          "/ISAPI/System/Video/inputs/channels/1/counting/search",
        maximumResponseBytes: 2 * 1024 * 1024
      })
    );
  });
});