import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  HikvisionIsapiDeviceInfoClient,
  InvalidHikvisionDeviceInfoError,
  parseHikvisionDeviceInfo
} from "../src/providers/hikvision-isapi/hikvision-isapi-device-info-client.js";

const DEVICE_XML = `
<DeviceInfo xmlns="http://www.isapi.org/ver20/XMLSchema">
  <deviceType>IPCamera</deviceType>
  <model>TEST-MODEL</model>
  <firmwareVersion>TEST-FIRMWARE</firmwareVersion>
</DeviceInfo>`;

describe("Hikvision ISAPI device information", () => {
  it("parses the safe device-information subset", () => {
    expect(parseHikvisionDeviceInfo(DEVICE_XML))
      .toEqual({
        model: "TEST-MODEL",
        firmwareVersion: "TEST-FIRMWARE",
        deviceType: "IPCamera"
      });
  });

  it("rejects an unexpected XML document", () => {
    expect(() =>
      parseHikvisionDeviceInfo("<ResponseStatus />")
    ).toThrow(InvalidHikvisionDeviceInfoError);
  });

  it("requests the read-only device endpoint", async () => {
    const requestXml = vi.fn()
      .mockResolvedValue(DEVICE_XML);

    const client =
      new HikvisionIsapiDeviceInfoClient({
        requestXml
      });

    await expect(client.getDeviceInfo())
      .resolves.toMatchObject({
        deviceType: "IPCamera"
      });

    expect(requestXml).toHaveBeenCalledWith({
      method: "GET",
      path: "/ISAPI/System/deviceInfo",
      maximumResponseBytes: 64 * 1024
    });
  });
});