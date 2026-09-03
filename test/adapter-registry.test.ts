import { describe, expect, it } from "vitest";

import {
  AdapterIdentityMismatchError,
  AdapterRegistry,
  DuplicateAdapterProviderError,
  InvalidAdapterTypeError,
  UnknownAdapterProviderError
} from "../src/adapters/adapter-registry.js";
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
    providerConfig: {
      testSetting: cameraId
    }
  };
}

describe("AdapterRegistry", () => {
  it("selects the provider matching registration.adapter", () => {
    const isapiProvider = new FakeAdapterProvider("hikvision-isapi");
    const hikcentralProvider = new FakeAdapterProvider("hikcentral");
    const registry = new AdapterRegistry([
      isapiProvider,
      hikcentralProvider
    ]);
    const input = registration(
      "entrance-hikcentral-01",
      "hikcentral"
    );

    const adapter = registry.create(input);

    expect(adapter.cameraId).toBe("entrance-hikcentral-01");
    expect(adapter.adapterId)
      .toBe("hikcentral:entrance-hikcentral-01");

    expect(hikcentralProvider.validatedConfigs)
      .toEqual([input.providerConfig]);
    expect(hikcentralProvider.createdRegistrations)
      .toEqual([input]);

    expect(isapiProvider.validatedConfigs).toEqual([]);
    expect(isapiProvider.createdRegistrations).toEqual([]);
  });

  it("creates three independent adapters for three logical cameras", () => {
    const registry = new AdapterRegistry([
      new FakeAdapterProvider("hikvision-isapi"),
      new FakeAdapterProvider("hikcentral"),
      new FakeAdapterProvider("onvif")
    ]);

    const adapters = [
      registry.create(
        registration("entrance-isapi-01", "hikvision-isapi")
      ),
      registry.create(
        registration("entrance-hikcentral-01", "hikcentral")
      ),
      registry.create(
        registration("entrance-onvif-01", "onvif")
      )
    ];

    expect(adapters.map((adapter) => adapter.cameraId)).toEqual([
      "entrance-isapi-01",
      "entrance-hikcentral-01",
      "entrance-onvif-01"
    ]);

    expect(adapters.map((adapter) => adapter.adapterId)).toEqual([
      "hikvision-isapi:entrance-isapi-01",
      "hikcentral:entrance-hikcentral-01",
      "onvif:entrance-onvif-01"
    ]);
  });

  it("rejects an unknown adapter type", () => {
    const registry = new AdapterRegistry();

    expect(() => registry.create(
      registration("entrance-onvif-01", "onvif")
    )).toThrow(UnknownAdapterProviderError);
  });

  it("rejects duplicate provider recipes", () => {
    const first = new FakeAdapterProvider("hikvision-isapi");
    const second = new FakeAdapterProvider("hikvision-isapi");

    expect(() => new AdapterRegistry([first, second]))
      .toThrow(DuplicateAdapterProviderError);
  });

  it("lists registered adapter types in stable order", () => {
    const registry = new AdapterRegistry([
      new FakeAdapterProvider("onvif"),
      new FakeAdapterProvider("hikvision-isapi"),
      new FakeAdapterProvider("hikcentral")
    ]);

    expect(registry.listAdapterTypes()).toEqual([
      "hikcentral",
      "hikvision-isapi",
      "onvif"
    ]);
  });
  
    it("rejects an invalid provider type", () => {
    const invalidProvider = new FakeAdapterProvider("invalid adapter");

    expect(() => new AdapterRegistry([invalidProvider]))
      .toThrow(InvalidAdapterTypeError);
  });

  it("stops before adapter creation when provider config is invalid", () => {
    const provider = new FakeAdapterProvider(
      "hikvision-isapi",
      { rejectConfig: true }
    );
    const registry = new AdapterRegistry([provider]);

    expect(() => registry.create(
      registration("entrance-isapi-01", "hikvision-isapi")
    )).toThrow("Invalid hikvision-isapi provider configuration");

    expect(provider.validatedConfigs).toHaveLength(1);
    expect(provider.createdRegistrations).toHaveLength(0);
  });

  it("rejects an adapter that returns the wrong camera ID", () => {
    const provider = new FakeAdapterProvider(
      "hikvision-isapi",
      { returnedCameraId: "wrong-camera-01" }
    );
    const registry = new AdapterRegistry([provider]);

    expect(() => registry.create(
      registration("entrance-isapi-01", "hikvision-isapi")
    )).toThrow(AdapterIdentityMismatchError);
  });
});