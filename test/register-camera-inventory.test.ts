import { describe, expect, it } from "vitest";

import {
  AdapterRegistry
} from "../src/adapters/adapter-registry.js";
import type {
  CameraRegistration
} from "../src/contracts/camera-registration.js";
import {
  CameraGateway
} from "../src/core/camera-gateway.js";
import {
  registerCameraInventory
} from "../src/startup/register-camera-inventory.js";
import {
  FakeAdapterProvider
} from "./support/fake-adapter-provider.js";

function registration(
  cameraId: string,
  adapter: string
): CameraRegistration {
  return {
    cameraId,
    displayName: cameraId,
    adapter,
    credentialRef: `${adapter}-credentials`,
    providerConfig: {}
  };
}

function threeCameraInventory():
  readonly CameraRegistration[] {
  return [
    registration(
      "entrance-isapi-01",
      "hikvision-isapi"
    ),
    registration(
      "entrance-hikcentral-01",
      "hikcentral"
    ),
    registration(
      "entrance-onvif-01",
      "onvif"
    )
  ];
}

describe("registerCameraInventory", () => {
  it("registers three independent logical cameras", async () => {
    const gateway = new CameraGateway(
      new AdapterRegistry([
        new FakeAdapterProvider("hikvision-isapi"),
        new FakeAdapterProvider("hikcentral"),
        new FakeAdapterProvider("onvif")
      ])
    );

    const report = await registerCameraInventory(
      gateway,
      threeCameraInventory()
    );

    expect(report).toEqual({
      status: "ready",
      results: [
        {
          cameraId: "entrance-isapi-01",
          adapterId:
            "hikvision-isapi:entrance-isapi-01",
          capabilities: [],
          status: "registered"
        },
        {
          cameraId: "entrance-hikcentral-01",
          adapterId:
            "hikcentral:entrance-hikcentral-01",
          capabilities: [],
          status: "registered"
        },
        {
          cameraId: "entrance-onvif-01",
          adapterId:
            "onvif:entrance-onvif-01",
          capabilities: [],
          status: "registered"
        }
      ]
    });
  });

  it("continues after one camera fails", async () => {
    const privateFailureDetail =
      "private-provider-detail";

    const failingProvider = new FakeAdapterProvider(
      "hikcentral",
      {
        adapterOptions: {
          connectError:
            new Error(privateFailureDetail)
        }
      }
    );

    const gateway = new CameraGateway(
      new AdapterRegistry([
        new FakeAdapterProvider("hikvision-isapi"),
        failingProvider,
        new FakeAdapterProvider("onvif")
      ])
    );

    const report = await registerCameraInventory(
      gateway,
      threeCameraInventory()
    );

    expect(report).toEqual({
      status: "degraded",
      results: [
        {
          cameraId: "entrance-isapi-01",
          adapterId:
            "hikvision-isapi:entrance-isapi-01",
          capabilities: [],
          status: "registered"
        },
        {
          cameraId: "entrance-hikcentral-01",
          status: "failed"
        },
        {
          cameraId: "entrance-onvif-01",
          adapterId:
            "onvif:entrance-onvif-01",
          capabilities: [],
          status: "registered"
        }
      ]
    });

    expect(JSON.stringify(report))
      .not.toContain(privateFailureDetail);

    expect(
      Object.keys(report.results[1]!).sort()
    ).toEqual([
      "cameraId",
      "status"
    ]);

    expect(
      gateway.listCameras().map((camera) =>
        camera.cameraId
      )
    ).toEqual([
      "entrance-isapi-01",
      "entrance-onvif-01"
    ]);

    expect(
      failingProvider
        .createdAdapters[0]
        ?.disconnectCalls
    ).toBe(1);
  });

  it("reports an empty inventory as ready", async () => {
    const gateway = new CameraGateway(
      new AdapterRegistry()
    );

    await expect(
      registerCameraInventory(gateway, [])
    ).resolves.toEqual({
      status: "ready",
      results: []
    });
  });
});