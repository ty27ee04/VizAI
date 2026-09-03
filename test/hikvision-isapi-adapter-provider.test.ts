import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  CameraAdapter
} from "../src/adapters/camera-adapter.js";
import {
  InMemoryPeopleFlowOutputPort
} from "../src/output/in-memory-people-flow-output-port.js";
import {
  HikvisionIsapiAdapter
} from "../src/providers/hikvision-isapi/hikvision-isapi-adapter.js";
import {
  HikvisionIsapiAdapterProvider
} from "../src/providers/hikvision-isapi/hikvision-isapi-provider.js";

describe("Hikvision ISAPI adapter", () => {
  it("connects through device proof and collection", async () => {
    const getDeviceInfo = vi.fn()
      .mockResolvedValue({
        model: "TEST-MODEL",
        firmwareVersion: "TEST-FIRMWARE",
        deviceType: "IPCamera"
      });

    const collect = vi.fn()
      .mockResolvedValue(1);

    const adapter =
      new HikvisionIsapiAdapter(
        "entrance-isapi-01",
        { getDeviceInfo },
        { collect },
        60_000,
        () =>
          new Date(
            "2026-09-03T04:10:00.000Z"
          )
      );

    await adapter.connect();

    expect(getDeviceInfo)
      .toHaveBeenCalledOnce();

    expect(collect)
      .toHaveBeenCalledOnce();

    await expect(adapter.checkHealth())
      .resolves.toMatchObject({
        status: "healthy"
      });

    await adapter.disconnect();

    await expect(adapter.checkHealth())
      .resolves.toMatchObject({
        status: "offline"
      });
  });
});

describe("Hikvision ISAPI provider", () => {
  it("creates one adapter for one logical camera", () => {
    const adapter = {
      adapterId:
        "hikvision-isapi:entrance-isapi-01",
      cameraId: "entrance-isapi-01",
      connect: async () => undefined,
      disconnect: async () => undefined,
      discoverCapabilities:
        async () => [],
      checkHealth: async () => ({
        status: "offline" as const,
        checkedAt:
          "2026-09-03T04:00:00.000Z"
      })
    } satisfies CameraAdapter;

    const factory = vi.fn()
      .mockReturnValue(adapter);

    const provider =
      new HikvisionIsapiAdapterProvider(
        {
          resolve: () => ({
            username: "test-user",
            password: "test-password"
          })
        },
        new InMemoryPeopleFlowOutputPort(),
        factory
      );

    const result = provider.create({
      cameraId: "entrance-isapi-01",
      displayName: "Entrance ISAPI",
      adapter: "hikvision-isapi",
      credentialRef:
        "entrance-isapi-credentials",
      providerConfig: {
        baseUrl: "http://camera.local",
        channelId: "1",
        requestTimeoutMs: 5_000
      }
    });

    expect(result).toBe(adapter);

    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraId: "entrance-isapi-01"
      })
    );
  });

  it("performs no network call while creating", () => {
    const factory = vi.fn()
      .mockReturnValue({
        adapterId: "test",
        cameraId: "entrance-isapi-01",
        connect: async () => undefined,
        disconnect: async () => undefined,
        discoverCapabilities:
          async () => [],
        checkHealth: async () => ({
          status: "offline" as const,
          checkedAt:
            "2026-09-03T04:00:00.000Z"
        })
      });

    const resolve = vi.fn()
      .mockReturnValue({
        username: "test-user",
        password: "test-password"
      });

    const provider =
      new HikvisionIsapiAdapterProvider(
        { resolve },
        new InMemoryPeopleFlowOutputPort(),
        factory
      );

    provider.create({
      cameraId: "entrance-isapi-01",
      displayName: "Entrance ISAPI",
      adapter: "hikvision-isapi",
      credentialRef:
        "entrance-isapi-credentials",
      providerConfig: {
        baseUrl: "http://camera.local",
        channelId: "1",
        requestTimeoutMs: 5_000
      }
    });

    expect(resolve).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledOnce();
  });
});