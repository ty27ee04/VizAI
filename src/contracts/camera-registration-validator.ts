import { Ajv, type ErrorObject } from "ajv";

import type { CameraRegistration } from "./camera-registration.js";
import { cameraRegistrationSchema } from "./camera-registration-schema.js";

const ajv = new Ajv({
  allErrors: true,
  strict: true
});

const validateCameraRegistration =
  ajv.compile<CameraRegistration>(cameraRegistrationSchema);

/**
 * Raised when outside data does not satisfy the camera registration contract.
 */
export class InvalidCameraRegistrationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Camera registration is invalid: ${issues.join("; ")}`);
    this.name = "InvalidCameraRegistrationError";
  }
}

/**
 * Validates untrusted input before allowing it into the gateway.
 */
export function parseCameraRegistration(input: unknown): CameraRegistration {
  if (!validateCameraRegistration(input)) {
    const issues = validateCameraRegistration.errors?.map(describeError)
      ?? ["Unknown validation error"];

    throw new InvalidCameraRegistrationError(issues);
  }

  return input;
}

function describeError(error: ErrorObject): string {
  const location = error.instancePath || "/";
  return `${location} ${error.message ?? "is invalid"}`;
}