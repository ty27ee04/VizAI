import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import {
  mkdtemp,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  AdapterRegistry
} from "../src/adapters/adapter-registry.js";
import {
  CameraInventoryFileError
} from "../src/config/camera-inventory-file-loader.js";
import {
  InvalidCameraInventoryError
} from "../src/contracts/camera-inventory-validator.js";
import {
  CameraGateway
} from "../src/core/camera-gateway.js";
import {
  startCameraGatewayFromFile
} from "../src/startup/start-camera-gateway-from-file.js";
import {
  FakeAdapterProvider
} from "./support/fake-adapter-provider.js";

const temporaryDirectories: string[] = [];

async function createInventoryFile(
  contents: string
): Promise<string> {
  const directory = await mkdtemp(
    join(tmpdir(), "vizai-startup-")
  );

  temporaryDirectories.push(directory);

  const filePath = join(
    directory,
    "cameras.json"
  );

  await writeFile(filePath, contents, "utf8");

  return filePath;
}

function threeCameraInventory(): unknown[] {
  return [
    {
      cameraId: "entrance-isapi-01",
      displayName: "Entrance ISAPI",
      adapter: "hikvision-isapi",
      credentialRef: "isapi-credentials",
      providerConfig: {}
    },
    {
      cameraId: "entrance-hikcentral-01",
      displayName: "Entrance HikCentral",
      adapter: "hikcentral",
      credentialRef: "hikcentral-credentials",
      providerConfig: {}
    },
    {
      cameraId: "entrance-onvif-01",
      displayName: "Entrance ONVIF",
      adapter: "onvif",
      credentialRef: "onvif-credentials",
      providerConfig: {}
    }
  ];
}

async function captureRejection(
  promise: Promise<unknown>
): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error("Expected promise to reject");
}

afterEach(async () => {
  const directories =
    temporaryDirectories.splice(0);

  await Promise.all(
    directories.map((directory) =>
      rm(directory, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("startCameraGatewayFromFile", () => {
  it("loads and registers three independent logical cameras", async () => {
    const filePath = await createInventoryFile(
      JSON.stringify(threeCameraInventory())
    );

    const gateway = new CameraGateway(
      new AdapterRegistry([
        new FakeAdapterProvider("hikvision-isapi"),
        new FakeAdapterProvider("hikcentral"),
        new FakeAdapterProvider("onvif")
      ])
    );

    const report =
      await startCameraGatewayFromFile(
        gateway,
        filePath
      );

    expect(report.status).toBe("ready");

    expect(
      report.results.map((result) =>
        result.cameraId
      )
    ).toEqual([
      "entrance-isapi-01",
      "entrance-hikcentral-01",
      "entrance-onvif-01"
    ]);

    expect(
      gateway.listCameras().map((camera) =>
        camera.cameraId
      )
    ).toEqual([
      "entrance-hikcentral-01",
      "entrance-isapi-01",
      "entrance-onvif-01"
    ]);
  });

  it("returns degraded while preserving successful cameras", async () => {
    const filePath = await createInventoryFile(
      JSON.stringify(threeCameraInventory())
    );

    const failingProvider = new FakeAdapterProvider(
      "hikcentral",
      {
        adapterOptions: {
          connectError:
            new Error("private-provider-detail")
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

    const report =
      await startCameraGatewayFromFile(
        gateway,
        filePath
      );

    expect(
      report.results.map((result) => ({
        cameraId: result.cameraId,
        status: result.status
      }))
    ).toEqual([
      {
        cameraId: "entrance-isapi-01",
        status: "registered"
      },
      {
        cameraId: "entrance-hikcentral-01",
        status: "failed"
      },
      {
        cameraId: "entrance-onvif-01",
        status: "registered"
      }
    ]);

    expect(report.status).toBe("degraded");

    expect(JSON.stringify(report))
      .not.toContain("private-provider-detail");

    expect(
      gateway.listCameras().map((camera) =>
        camera.cameraId
      )
    ).toEqual([
      "entrance-isapi-01",
      "entrance-onvif-01"
    ]);
  });

  it("rejects the whole inventory before connecting any camera", async () => {
    const invalidInventory = [
      threeCameraInventory()[0],
      {
        cameraId: "incomplete-registration"
      }
    ];

    const filePath = await createInventoryFile(
      JSON.stringify(invalidInventory)
    );

    const provider =
      new FakeAdapterProvider("hikvision-isapi");

    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );

    await expect(
      startCameraGatewayFromFile(
        gateway,
        filePath
      )
    ).rejects.toBeInstanceOf(
      InvalidCameraInventoryError
    );

    expect(provider.createdAdapters).toEqual([]);
    expect(gateway.listCameras()).toEqual([]);
  });

  it("preserves safe malformed-JSON errors", async () => {
    const privateMarker =
      "do-not-expose-startup-value";

    const filePath = await createInventoryFile(
      `[{"cameraId":"${privateMarker}"`
    );

    const provider =
      new FakeAdapterProvider("hikvision-isapi");

    const gateway = new CameraGateway(
      new AdapterRegistry([provider])
    );

    const error = await captureRejection(
      startCameraGatewayFromFile(
        gateway,
        filePath
      )
    );

    expect(error).toBeInstanceOf(
      CameraInventoryFileError
    );

    expect(error).toMatchObject({
      code: "invalid-json"
    });

    expect((error as Error).message)
      .not.toContain(privateMarker);

    expect(provider.createdAdapters).toEqual([]);
    expect(gateway.listCameras()).toEqual([]);
  });
});