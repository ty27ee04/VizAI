import { describe, expect, it } from "vitest";

import { AdapterRegistry } from "../src/adapters/adapter-registry.js";
import {
  CameraGateway,
  GatewayShutdownError
} from "../src/core/camera-gateway.js";
import type { CameraRegistration } from "../src/contracts/camera-registration.js";
import { FakeAdapterProvider } from "./support/fake-adapter-provider.js";

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

describe("CameraGateway shutdown", () => {
  it("allows shutdown when no cameras are registered", async () => {
    const gateway = new CameraGateway(
      new AdapterRegistry()
    );

    await expect(gateway.shutdown())
      .resolves
      .toBeUndefined();
  });

  it("disconnects and removes every logical camera", async () => {
    const isapiProvider =
      new FakeAdapterProvider("hikvision-isapi");
    const hikcentralProvider =
      new FakeAdapterProvider("hikcentral");
    const onvifProvider =
      new FakeAdapterProvider("onvif");

    const gateway = new CameraGateway(
      new AdapterRegistry([
        isapiProvider,
        hikcentralProvider,
        onvifProvider
      ])
    );

    await gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    );
    await gateway.register(
      registration("entrance-hikcentral-01", "hikcentral")
    );
    await gateway.register(
      registration("entrance-onvif-01", "onvif")
    );

    await gateway.shutdown();

    expect(gateway.listCameras()).toEqual([]);

    expect(
      isapiProvider.createdAdapters[0]?.disconnectCalls
    ).toBe(1);
    expect(
      hikcentralProvider.createdAdapters[0]?.disconnectCalls
    ).toBe(1);
    expect(
      onvifProvider.createdAdapters[0]?.disconnectCalls
    ).toBe(1);
  });

  it("removes successful cameras and safely reports failures", async () => {
    const isapiProvider =
      new FakeAdapterProvider("hikvision-isapi");

    const hikcentralProvider = new FakeAdapterProvider(
      "hikcentral",
      {
        adapterOptions: {
          disconnectError: new Error(
            "Sensitive provider URL and token"
          )
        }
      }
    );

    const onvifProvider =
      new FakeAdapterProvider("onvif");

    const gateway = new CameraGateway(
      new AdapterRegistry([
        isapiProvider,
        hikcentralProvider,
        onvifProvider
      ])
    );

    await gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    );
    await gateway.register(
      registration("entrance-hikcentral-01", "hikcentral")
    );
    await gateway.register(
      registration("entrance-onvif-01", "onvif")
    );

    let capturedError: unknown;

    try {
      await gateway.shutdown();
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError)
      .toBeInstanceOf(GatewayShutdownError);

    if (!(capturedError instanceof GatewayShutdownError)) {
      throw new Error("Expected GatewayShutdownError.");
    }

    expect(capturedError.failedCameraIds).toEqual([
      "entrance-hikcentral-01"
    ]);
    expect(capturedError.message)
      .not
      .toContain("Sensitive provider URL and token");

    expect(
      gateway.listCameras().map((camera) => camera.cameraId)
    ).toEqual(["entrance-hikcentral-01"]);
  });
});