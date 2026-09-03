import { describe, expect, it } from "vitest";

import {
  InvalidCameraInventoryError,
  parseCameraInventory
} from "../src/contracts/camera-inventory-validator.js";

function registration(cameraId: string, adapter: string) {
  return {
    cameraId,
    displayName: cameraId,
    adapter,
    credentialRef: `${adapter}-env`,
    providerConfig: {}
  };
}

describe("parseCameraInventory", () => {
  it("accepts an empty camera inventory", () => {
    expect(parseCameraInventory([])).toEqual([]);
  });

  it("accepts three independent logical cameras", () => {
    const input = [
      registration("entrance-isapi-01", "hikvision-isapi"),
      registration("entrance-hikcentral-01", "hikcentral"),
      registration("entrance-onvif-01", "onvif")
    ];

    const result = parseCameraInventory(input);

    expect(result).toHaveLength(3);
    expect(result.map((camera) => camera.cameraId)).toEqual([
      "entrance-isapi-01",
      "entrance-hikcentral-01",
      "entrance-onvif-01"
    ]);
  });

  it("allows multiple logical cameras to use the same adapter", () => {
    const input = [
      registration("entrance-isapi-01", "hikvision-isapi"),
      registration("rear-door-isapi-01", "hikvision-isapi")
    ];

    expect(parseCameraInventory(input)).toHaveLength(2);
  });

  it("rejects duplicate camera IDs", () => {
    const input = [
      registration("entrance-isapi-01", "hikvision-isapi"),
      registration("entrance-isapi-01", "hikcentral")
    ];

    expect(() => parseCameraInventory(input))
      .toThrow(/Duplicate cameraId 'entrance-isapi-01'/);
  });

  it("rejects a non-array inventory root", () => {
    expect(() => parseCameraInventory({ cameras: [] }))
      .toThrow(InvalidCameraInventoryError);
  });

  it("reports which inventory entry is malformed", () => {
    const input = [
      registration("entrance-isapi-01", "hikvision-isapi"),
      registration("invalid camera id", "hikcentral")
    ];

    expect(() => parseCameraInventory(input))
      .toThrow(/Entry 2/);
  });

  it("rejects more than 1,000 registrations", () => {
    const input = Array.from(
      { length: 1_001 },
      (_, index) => registration(`camera-${index}`, "hikvision-isapi")
    );

    expect(() => parseCameraInventory(input))
      .toThrow(/more than 1000 registrations/);
  });
});