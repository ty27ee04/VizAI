import { describe, expect, it } from "vitest";

import { AdapterRegistry } from "../src/adapters/adapter-registry.js";
import { CameraGateway } from "../src/core/camera-gateway.js";
import type { CameraRegistration } from "../src/contracts/camera-registration.js";
import { FakeAdapterProvider } from "./support/fake-adapter-provider.js";

const FIXED_TIME = new Date("2026-09-03T04:00:00.000Z");

function registration(
  cameraId: string,
  adapter: string
): CameraRegistration {
  return {
    cameraId,
    displayName: cameraId,
    adapter,
    credentialRef: `${adapter}-env`,
    providerConfig: {}
  };
}

describe("CameraGateway health", () => {
  it("reports an empty gateway as healthy", async () => {
    const gateway = new CameraGateway(
      new AdapterRegistry(),
      () => FIXED_TIME
    );

    await expect(gateway.health()).resolves.toEqual({
      status: "healthy",
      cameras: []
    });
  });

  it("reports all independently connected cameras", async () => {
    const isapiProvider = new FakeAdapterProvider(
      "hikvision-isapi",
      {
        adapterOptions: {
          now: () => FIXED_TIME
        }
      }
    );
    const onvifProvider = new FakeAdapterProvider(
      "onvif",
      {
        adapterOptions: {
          now: () => FIXED_TIME
        }
      }
    );
    const gateway = new CameraGateway(
      new AdapterRegistry([
        isapiProvider,
        onvifProvider
      ]),
      () => FIXED_TIME
    );

    await gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    );
    await gateway.register(
      registration("entrance-onvif-01", "onvif")
    );

    await expect(gateway.health()).resolves.toEqual({
      status: "healthy",
      cameras: [
        {
          cameraId: "entrance-isapi-01",
          adapterId: "hikvision-isapi:entrance-isapi-01",
          status: "healthy",
          checkedAt: "2026-09-03T04:00:00.000Z"
        },
        {
          cameraId: "entrance-onvif-01",
          adapterId: "onvif:entrance-onvif-01",
          status: "healthy",
          checkedAt: "2026-09-03T04:00:00.000Z"
        }
      ]
    });
  });

  it("isolates one failed health check and reports degraded", async () => {
    const isapiProvider = new FakeAdapterProvider(
      "hikvision-isapi",
      {
        adapterOptions: {
          now: () => FIXED_TIME
        }
      }
    );
    const hikcentralProvider = new FakeAdapterProvider(
      "hikcentral",
      {
        adapterOptions: {
          healthError: new Error(
            "Secret-bearing provider failure"
          )
        }
      }
    );
    const gateway = new CameraGateway(
      new AdapterRegistry([
        isapiProvider,
        hikcentralProvider
      ]),
      () => FIXED_TIME
    );

    await gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    );
    await gateway.register(
      registration("entrance-hikcentral-01", "hikcentral")
    );

    const result = await gateway.health();

    expect(result.status).toBe("degraded");
    expect(result.cameras).toEqual([
      {
        cameraId: "entrance-hikcentral-01",
        adapterId: "hikcentral:entrance-hikcentral-01",
        status: "offline",
        checkedAt: "2026-09-03T04:00:00.000Z"
      },
      {
        cameraId: "entrance-isapi-01",
        adapterId: "hikvision-isapi:entrance-isapi-01",
        status: "healthy",
        checkedAt: "2026-09-03T04:00:00.000Z"
      }
    ]);

    expect(JSON.stringify(result))
      .not
      .toContain("Secret-bearing provider failure");
  });
});