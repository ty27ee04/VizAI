import { describe, expect, it } from "vitest";

import {
  InvalidCameraRegistrationError,
  parseCameraRegistration
} from "../src/contracts/camera-registration-validator.js";

function validRegistration() {
  return {
    cameraId: "entrance-isapi-01",
    displayName: "Entrance - ISAPI",
    adapter: "hikvision-isapi",
    credentialRef: "hikvision-env",
    providerConfig: {
      collectionMode: "periodic"
    }
  };
}

describe("parseCameraRegistration", () => {
  it("accepts a valid logical camera registration", () => {
    const input = validRegistration();

    const result = parseCameraRegistration(input);

    expect(result).toEqual(input);
    expect(result.cameraId).toBe("entrance-isapi-01");
  });

  it("accepts independent ISAPI, HikCentral, and ONVIF camera IDs", () => {
    const registrations = [
      validRegistration(),
      {
        ...validRegistration(),
        cameraId: "entrance-hikcentral-01",
        displayName: "Entrance - HikCentral",
        adapter: "hikcentral",
        credentialRef: "hikcentral-env"
      },
      {
        ...validRegistration(),
        cameraId: "entrance-onvif-01",
        displayName: "Entrance - ONVIF",
        adapter: "onvif",
        credentialRef: "onvif-env"
      }
    ];

    const results = registrations.map(parseCameraRegistration);

    expect(results.map((camera) => camera.cameraId)).toEqual([
      "entrance-isapi-01",
      "entrance-hikcentral-01",
      "entrance-onvif-01"
    ]);
  });

  it("rejects an unsafe camera ID", () => {
    const input = {
      ...validRegistration(),
      cameraId: "entrance isapi 01"
    };

    expect(() => parseCameraRegistration(input))
      .toThrow(InvalidCameraRegistrationError);
  });

  it("rejects unexpected top-level credential fields", () => {
    const input = {
      ...validRegistration(),
      password: "must-not-be-here"
    };

    expect(() => parseCameraRegistration(input))
      .toThrow(InvalidCameraRegistrationError);
  });

  it("rejects a registration with no camera ID", () => {
    const input = {
      displayName: "Entrance - ISAPI",
      adapter: "hikvision-isapi",
      credentialRef: "hikvision-env",
      providerConfig: {}
    };

    expect(() => parseCameraRegistration(input))
      .toThrow(InvalidCameraRegistrationError);
  });
});