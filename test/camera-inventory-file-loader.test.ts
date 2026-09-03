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
  InvalidCameraInventoryError
} from "../src/contracts/camera-inventory-validator.js";
import {
  CameraInventoryFileError,
  loadCameraInventoryFile,
  MAX_CAMERA_INVENTORY_FILE_BYTES
} from "../src/config/camera-inventory-file-loader.js";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(
    join(tmpdir(), "vizai-camera-inventory-")
  );

  temporaryDirectories.push(directory);
  return directory;
}

async function createInventoryFile(
  contents: string
): Promise<string> {
  const directory = await createTemporaryDirectory();
  const filePath = join(directory, "cameras.json");

  await writeFile(filePath, contents, "utf8");

  return filePath;
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
  const directories = temporaryDirectories.splice(0);

  await Promise.all(
    directories.map((directory) =>
      rm(directory, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("loadCameraInventoryFile", () => {
  it("loads three independent logical camera registrations", async () => {
    const filePath = await createInventoryFile(
      JSON.stringify([
        {
          cameraId: "entrance-isapi-01",
          displayName: "Entrance ISAPI",
          adapter: "hikvision-isapi",
          credentialRef: "isapi-credentials",
          providerConfig: {
            channelId: "1"
          }
        },
        {
          cameraId: "entrance-hikcentral-01",
          displayName: "Entrance HikCentral",
          adapter: "hikcentral",
          credentialRef: "hikcentral-credentials",
          providerConfig: {
            channelId: "1"
          }
        },
        {
          cameraId: "entrance-onvif-01",
          displayName: "Entrance ONVIF",
          adapter: "onvif",
          credentialRef: "onvif-credentials",
          providerConfig: {
            channelId: "1"
          }
        }
      ])
    );

    const registrations =
      await loadCameraInventoryFile(filePath);

    expect(
      registrations.map((registration) =>
        registration.cameraId
      )
    ).toEqual([
      "entrance-isapi-01",
      "entrance-hikcentral-01",
      "entrance-onvif-01"
    ]);
  });

  it("allows an empty inventory", async () => {
    const filePath =
      await createInventoryFile("[]");

    await expect(
      loadCameraInventoryFile(filePath)
    ).resolves.toEqual([]);
  });

  it("reports a missing file without exposing its path", async () => {
    const directory = await createTemporaryDirectory();
    const missingPath =
      join(directory, "missing-secret-inventory.json");

    const error = await captureRejection(
      loadCameraInventoryFile(missingPath)
    );

    expect(error).toBeInstanceOf(
      CameraInventoryFileError
    );

    expect(error).toMatchObject({
      code: "not-found"
    });

    expect((error as Error).message)
      .not.toContain(missingPath);
  });

  it("rejects a file larger than the configured limit", async () => {
    const filePath = await createInventoryFile(
      " ".repeat(
        MAX_CAMERA_INVENTORY_FILE_BYTES + 1
      )
    );

    const error = await captureRejection(
      loadCameraInventoryFile(filePath)
    );

    expect(error).toBeInstanceOf(
      CameraInventoryFileError
    );

    expect(error).toMatchObject({
      code: "too-large"
    });
  });

  it("rejects malformed JSON without exposing its contents", async () => {
    const privateMarker = "do-not-expose-this-value";

    const filePath = await createInventoryFile(
      `[{"cameraId":"${privateMarker}"`
    );

    const error = await captureRejection(
      loadCameraInventoryFile(filePath)
    );

    expect(error).toBeInstanceOf(
      CameraInventoryFileError
    );

    expect(error).toMatchObject({
      code: "invalid-json"
    });

    expect((error as Error).message)
      .not.toContain(privateMarker);
  });

  it("delegates structural validation to the inventory validator", async () => {
    const filePath = await createInventoryFile(
      JSON.stringify([
        {
          cameraId: "incomplete-registration"
        }
      ])
    );

    const error = await captureRejection(
      loadCameraInventoryFile(filePath)
    );

    expect(error).toBeInstanceOf(
      InvalidCameraInventoryError
    );

    expect(
      (error as InvalidCameraInventoryError)
        .issues[0]
    ).toContain("Entry 1");
  });
});