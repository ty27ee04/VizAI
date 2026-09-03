import { describe, expect, it } from "vitest";

import { AdapterRegistry } from "../src/adapters/adapter-registry.js";
import {
  CameraAlreadyRegisteredError,
  CameraGateway
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

describe("CameraGateway registration", () => {
  it("creates, connects, and discovers one logical camera", async () => {
    const provider = new FakeAdapterProvider(
      "hikvision-isapi",
      {
        capabilities: [
          "analytics.people-flow.periodic",
          "control.ptz"
        ]
      }
    );
    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );

    const result = await gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    );

    expect(result).toEqual({
      cameraId: "entrance-isapi-01",
      adapterId: "hikvision-isapi:entrance-isapi-01",
      capabilities: [
        "analytics.people-flow.periodic",
        "control.ptz"
      ]
    });

    const adapter = provider.createdAdapters[0];

    expect(adapter?.connectCalls).toBe(1);
    expect(adapter?.discoveryCalls).toBe(1);
    expect(adapter?.disconnectCalls).toBe(0);
    expect(adapter?.isConnected()).toBe(true);
  });

  it("removes duplicate capabilities reported by an adapter", async () => {
    const provider = new FakeAdapterProvider(
      "hikvision-isapi",
      {
        capabilities: [
          "analytics.people-flow.periodic",
          "analytics.people-flow.periodic"
        ]
      }
    );
    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );

    const result = await gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    );

    expect(result.capabilities).toEqual([
      "analytics.people-flow.periodic"
    ]);
  });

  it("registers three independent logical cameras", async () => {
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

    await Promise.all([
      gateway.register(
        registration("entrance-isapi-01", "hikvision-isapi")
      ),
      gateway.register(
        registration("entrance-hikcentral-01", "hikcentral")
      ),
      gateway.register(
        registration("entrance-onvif-01", "onvif")
      )
    ]);

    expect(
      gateway.listCameras().map((camera) => camera.cameraId)
    ).toEqual([
      "entrance-hikcentral-01",
      "entrance-isapi-01",
      "entrance-onvif-01"
    ]);

    expect(
      isapiProvider.createdAdapters[0]?.isConnected()
    ).toBe(true);
    expect(
      hikcentralProvider.createdAdapters[0]?.isConnected()
    ).toBe(true);
    expect(
      onvifProvider.createdAdapters[0]?.isConnected()
    ).toBe(true);
  });

  it("rejects a cameraId that is already registered", async () => {
    const provider =
      new FakeAdapterProvider("hikvision-isapi");
    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );
    const input = registration(
      "entrance-isapi-01",
      "hikvision-isapi"
    );

    await gateway.register(input);

    await expect(gateway.register(input))
      .rejects
      .toThrow(CameraAlreadyRegisteredError);

    expect(provider.createdAdapters).toHaveLength(1);
  });

    it("disconnects and stores nothing when connection fails", async () => {
    const provider = new FakeAdapterProvider(
      "hikvision-isapi",
      {
        adapterOptions: {
          connectError: new Error("Camera connection failed.")
        }
      }
    );
    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );

    await expect(gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    )).rejects.toThrow("Camera connection failed.");

    const adapter = provider.createdAdapters[0];

    expect(adapter?.connectCalls).toBe(1);
    expect(adapter?.discoveryCalls).toBe(0);
    expect(adapter?.disconnectCalls).toBe(1);
    expect(adapter?.isConnected()).toBe(false);
    expect(gateway.listCameras()).toEqual([]);
  });

  it("disconnects and stores nothing when discovery fails", async () => {
    const provider = new FakeAdapterProvider(
      "hikvision-isapi",
      {
        adapterOptions: {
          capabilityDiscoveryError:
            new Error("Capability discovery failed.")
        }
      }
    );
    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );

    await expect(gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    )).rejects.toThrow("Capability discovery failed.");

    const adapter = provider.createdAdapters[0];

    expect(adapter?.connectCalls).toBe(1);
    expect(adapter?.discoveryCalls).toBe(1);
    expect(adapter?.disconnectCalls).toBe(1);
    expect(adapter?.isConnected()).toBe(false);
    expect(gateway.listCameras()).toEqual([]);
  });

  it("preserves the original error when rollback also fails", async () => {
    const provider = new FakeAdapterProvider(
      "hikvision-isapi",
      {
        adapterOptions: {
          capabilityDiscoveryError:
            new Error("Original discovery failure."),
          disconnectError:
            new Error("Rollback disconnect failure.")
        }
      }
    );
    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );

    await expect(gateway.register(
      registration("entrance-isapi-01", "hikvision-isapi")
    )).rejects.toThrow("Original discovery failure.");

    expect(gateway.listCameras()).toEqual([]);
  });

  it("rejects a duplicate while the first registration is pending", async () => {
    let releaseConnection: (() => void) | undefined;

    const connectionGate = new Promise<void>((resolve) => {
      releaseConnection = resolve;
    });

    const provider = new FakeAdapterProvider(
      "hikvision-isapi",
      {
        adapterOptions: {
          connectGate: connectionGate
        }
      }
    );
    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );
    const input = registration(
      "entrance-isapi-01",
      "hikvision-isapi"
    );

    const firstRegistration = gateway.register(input);

    await expect(gateway.register(input))
      .rejects
      .toThrow(CameraAlreadyRegisteredError);

    expect(provider.createdAdapters).toHaveLength(1);

    releaseConnection?.();

    await expect(firstRegistration).resolves.toMatchObject({
      cameraId: "entrance-isapi-01"
    });
  });
});