import { describe, expect, it } from "vitest";

import { AdapterRegistry } from "../src/adapters/adapter-registry.js";
import {
  CameraGateway,
  CameraNotFoundError,
  CameraOperationInProgressError
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

describe("CameraGateway unregister", () => {
  it("rejects an unknown camera ID", async () => {
    const gateway = new CameraGateway(
      new AdapterRegistry()
    );

    await expect(
      gateway.unregister("unknown-camera")
    ).rejects.toThrow(CameraNotFoundError);
  });

  it("disconnects before removing a camera", async () => {
    const provider =
      new FakeAdapterProvider("hikvision-isapi");
    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );

    await gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    );

    const adapter = provider.createdAdapters[0];

    await gateway.unregister("entrance-isapi-01");

    expect(adapter?.disconnectCalls).toBe(1);
    expect(adapter?.isConnected()).toBe(false);
    expect(gateway.listCameras()).toEqual([]);
  });

  it("removes only the selected logical camera", async () => {
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

    await gateway.unregister("entrance-hikcentral-01");

    expect(
      gateway.listCameras().map((camera) => camera.cameraId)
    ).toEqual([
      "entrance-isapi-01",
      "entrance-onvif-01"
    ]);

    expect(
      hikcentralProvider.createdAdapters[0]?.isConnected()
    ).toBe(false);
    expect(
      isapiProvider.createdAdapters[0]?.isConnected()
    ).toBe(true);
    expect(
      onvifProvider.createdAdapters[0]?.isConnected()
    ).toBe(true);
  });

  it("keeps the camera registered when disconnection fails", async () => {
    const provider = new FakeAdapterProvider(
      "hikvision-isapi",
      {
        adapterOptions: {
          disconnectError:
            new Error("Provider disconnect failed.")
        }
      }
    );
    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );

    await gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    );

    await expect(
      gateway.unregister("entrance-isapi-01")
    ).rejects.toThrow("Provider disconnect failed.");

    expect(
      gateway.listCameras().map((camera) => camera.cameraId)
    ).toEqual(["entrance-isapi-01"]);
  });

  it("rejects a second unregister while cleanup is pending", async () => {
    let releaseDisconnection: (() => void) | undefined;

    const disconnectGate = new Promise<void>((resolve) => {
      releaseDisconnection = resolve;
    });

    const provider = new FakeAdapterProvider(
      "hikvision-isapi",
      {
        adapterOptions: {
          disconnectGate
        }
      }
    );
    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );

    await gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    );

    const firstUnregister =
      gateway.unregister("entrance-isapi-01");

    await expect(
      gateway.unregister("entrance-isapi-01")
    ).rejects.toThrow(CameraOperationInProgressError);

    releaseDisconnection?.();

    await expect(firstUnregister).resolves.toBeUndefined();
    expect(gateway.listCameras()).toEqual([]);
  });
});