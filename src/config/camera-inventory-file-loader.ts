import {
  open,
  type FileHandle
} from "node:fs/promises";

import type {
  CameraRegistration
} from "../contracts/camera-registration.js";
import {
  parseCameraInventory
} from "../contracts/camera-inventory-validator.js";

export const MAX_CAMERA_INVENTORY_FILE_BYTES =
  1_048_576;

export type CameraInventoryFileErrorCode =
  | "not-found"
  | "not-file"
  | "unreadable"
  | "too-large"
  | "invalid-json";

const ERROR_MESSAGES:
  Record<CameraInventoryFileErrorCode, string> = {
    "not-found": "Camera inventory file was not found",
    "not-file": "Camera inventory path must refer to a file",
    unreadable: "Camera inventory file could not be read",
    "too-large": "Camera inventory file is too large",
    "invalid-json": "Camera inventory file is not valid JSON"
  };

/**
 * Represents a safe file-boundary failure.
 *
 * Messages deliberately exclude paths, file contents and native
 * operating-system error details.
 */
export class CameraInventoryFileError extends Error {
  constructor(
    readonly code: CameraInventoryFileErrorCode
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = "CameraInventoryFileError";
  }
}

/**
 * Loads and validates one local camera inventory file.
 */
export async function loadCameraInventoryFile(
  filePath: string
): Promise<readonly CameraRegistration[]> {
  const contents =
    await readBoundedInventoryFile(filePath);

  const jsonText = contents.charCodeAt(0) === 0xfeff
    ? contents.slice(1)
    : contents;

  let input: unknown;

  try {
    input = JSON.parse(jsonText);
  } catch {
    throw new CameraInventoryFileError("invalid-json");
  }

  return parseCameraInventory(input);
}

async function readBoundedInventoryFile(
  filePath: string
): Promise<string> {
  const handle = await openInventoryFile(filePath);

  try {
    const statistics = await handle.stat();

    if (!statistics.isFile()) {
      throw new CameraInventoryFileError("not-file");
    }

    if (
      statistics.size >
      MAX_CAMERA_INVENTORY_FILE_BYTES
    ) {
      throw new CameraInventoryFileError("too-large");
    }

    const contents = await handle.readFile({
      encoding: "utf8"
    });

    if (
      Buffer.byteLength(contents, "utf8") >
      MAX_CAMERA_INVENTORY_FILE_BYTES
    ) {
      throw new CameraInventoryFileError("too-large");
    }

    return contents;
  } catch (error) {
    if (error instanceof CameraInventoryFileError) {
      throw error;
    }

    throw new CameraInventoryFileError("unreadable");
  } finally {
    await closeQuietly(handle);
  }
}

async function openInventoryFile(
  filePath: string
): Promise<FileHandle> {
  try {
    return await open(filePath, "r");
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      throw new CameraInventoryFileError("not-found");
    }

    throw new CameraInventoryFileError("unreadable");
  }
}

async function closeQuietly(
  handle: FileHandle
): Promise<void> {
  try {
    await handle.close();
  } catch {
    // The public error boundary must not expose native file details.
  }
}

function hasErrorCode(
  error: unknown,
  expectedCode: string
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === expectedCode
  );
}