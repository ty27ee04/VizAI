import { describe, expect, it } from "vitest";

import { FakeCameraAdapter } from "./support/fake-camera-adapter.js";

const FIXED_TIME = new Date("2026-09-03T02:00:00.000Z");

function createAdapter(
  cameraId = "entrance-isapi-01",
  adapterName = "hikvision-isapi"
) {
  return new FakeCameraAdapter({
    cameraId,
    adapterName,
    capabilities: ["analytics.people-flow.periodic"],
    now: () => FIXED_TIME
  });
}

describe("CameraAdapter lifecycle", () => {
  it("keeps camera identity separate from adapter identity", () => {
    const adapter = createAdapter();

    expect(adapter.cameraId).toBe("entrance-isapi-01");
    expect(adapter.adapterId)
      .toBe("hikvision-isapi:entrance-isapi-01");
  });

  it("starts offline and reports a deterministic health time", async () => {
    const adapter = createAdapter();

    await expect(adapter.checkHealth()).resolves.toEqual({
      status: "offline",
      checkedAt: "2026-09-03T02:00:00.000Z"
    });
  });

  it("requires connection before capability discovery", async () => {
    const adapter = createAdapter();

    await expect(adapter.discoverCapabilities())
      .rejects
      .toThrow("Adapter must be connected");
  });

  it("connects, discovers capabilities, and disconnects", async () => {
    const adapter = createAdapter();

    await adapter.connect();

    expect(adapter.isConnected()).toBe(true);
    await expect(adapter.checkHealth()).resolves.toMatchObject({
      status: "healthy"
    });
    await expect(adapter.discoverCapabilities()).resolves.toEqual([
      "analytics.people-flow.periodic"
    ]);

    await adapter.disconnect();

    expect(adapter.isConnected()).toBe(false);
    await expect(adapter.checkHealth()).resolves.toMatchObject({
      status: "offline"
    });
  });

  it("keeps three logical camera connections independent", async () => {
    const isapi = createAdapter(
      "entrance-isapi-01",
      "hikvision-isapi"
    );
    const hikcentral = createAdapter(
      "entrance-hikcentral-01",
      "hikcentral"
    );
    const onvif = createAdapter(
      "entrance-onvif-01",
      "onvif"
    );

    await isapi.connect();

    expect(isapi.isConnected()).toBe(true);
    expect(hikcentral.isConnected()).toBe(false);
    expect(onvif.isConnected()).toBe(false);
  });
});