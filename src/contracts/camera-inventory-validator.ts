import type { CameraRegistration } from "./camera-registration.js";
import {
  InvalidCameraRegistrationError,
  parseCameraRegistration
} from "./camera-registration-validator.js";

const MAXIMUM_CAMERA_REGISTRATIONS = 1_000;

/**
 * Raised when the complete camera inventory is structurally invalid.
 */
export class InvalidCameraInventoryError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Camera inventory is invalid: ${issues.join("; ")}`);
    this.name = "InvalidCameraInventoryError";
  }
}

/**
 * Validates an untrusted array of logical camera registrations.
 */
export function parseCameraInventory(
  input: unknown
): readonly CameraRegistration[] {
  if (!Array.isArray(input)) {
    throw new InvalidCameraInventoryError([
      "Inventory root must be an array"
    ]);
  }

  if (input.length > MAXIMUM_CAMERA_REGISTRATIONS) {
    throw new InvalidCameraInventoryError([
      `Inventory cannot contain more than ${MAXIMUM_CAMERA_REGISTRATIONS} registrations`
    ]);
  }

  const registrations = input.map((item, index) => {
    try {
      return parseCameraRegistration(item);
    } catch (error) {
      if (error instanceof InvalidCameraRegistrationError) {
        const entryIssues = error.issues.map(
          (issue) => `Entry ${index + 1}: ${issue}`
        );

        throw new InvalidCameraInventoryError(entryIssues);
      }

      throw error;
    }
  });

  rejectDuplicateCameraIds(registrations);

  return registrations;
}

function rejectDuplicateCameraIds(
  registrations: readonly CameraRegistration[]
): void {
  const registeredIds = new Set<string>();

  for (const registration of registrations) {
    if (registeredIds.has(registration.cameraId)) {
      throw new InvalidCameraInventoryError([
        `Duplicate cameraId '${registration.cameraId}'`
      ]);
    }

    registeredIds.add(registration.cameraId);
  }
}