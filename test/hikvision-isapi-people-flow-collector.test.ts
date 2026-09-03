import {
  describe,
  expect,
  it
} from "vitest";

import {
  PeriodicPeopleFlowNormalizer
} from "../src/core/periodic-people-flow-normalizer.js";
import {
  InMemoryPeopleFlowOutputPort
} from "../src/output/in-memory-people-flow-output-port.js";
import {
  DefaultHikvisionIsapiPeopleFlowCollector
} from "../src/providers/hikvision-isapi/hikvision-isapi-people-flow-collector.js";
import {
  EMPTY_HIKVISION_COUNTING_REPORT,
  VALID_HIKVISION_COUNTING_REPORT
} from "./support/hikvision-counting-report-fixtures.js";

describe("ISAPI people-flow collector", () => {
  it("publishes using the ISAPI logical cameraId", async () => {
    const output =
      new InMemoryPeopleFlowOutputPort();

    const collector =
      new DefaultHikvisionIsapiPeopleFlowCollector(
        "entrance-isapi-01",
        "1",
        {
          searchLastCompletedHour: async () =>
            VALID_HIKVISION_COUNTING_REPORT
        },
        new PeriodicPeopleFlowNormalizer(
          () =>
            new Date(
              "2026-09-03T04:00:05.000Z"
            )
        ),
        output
      );

    await expect(collector.collect())
      .resolves.toBe(1);

    const stored = output.listByCameraId(
      "entrance-isapi-01"
    );

    expect(stored).toHaveLength(1);
    expect(stored[0]?.cameraId)
      .toBe("entrance-isapi-01");

    expect(
      output.listByCameraId(
        "entrance-hikcentral-01"
      )
    ).toEqual([]);
  });

  it("publishes nothing when no periods exist", async () => {
    const output =
      new InMemoryPeopleFlowOutputPort();

    const collector =
      new DefaultHikvisionIsapiPeopleFlowCollector(
        "entrance-isapi-01",
        "1",
        {
          searchLastCompletedHour: async () =>
            EMPTY_HIKVISION_COUNTING_REPORT
        },
        new PeriodicPeopleFlowNormalizer(),
        output
      );

    await expect(collector.collect())
      .resolves.toBe(0);

    expect(
      output.listByCameraId(
        "entrance-isapi-01"
      )
    ).toEqual([]);
  });
});