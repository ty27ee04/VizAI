const safeId = {
  type: "string",
  minLength: 1,
  maxLength: 128,
  pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$"
} as const;

/**
 * Runtime rules for data that wants to become a CameraRegistration.
 */
export const cameraRegistrationSchema = {
  $id: "https://vizai.local/schemas/camera-registration.json",
  type: "object",
  additionalProperties: false,
  required: [
    "cameraId",
    "displayName",
    "adapter",
    "credentialRef",
    "providerConfig"
  ],
  properties: {
    cameraId: safeId,

    displayName: {
      type: "string",
      minLength: 1,
      maxLength: 200
    },

    adapter: safeId,

    credentialRef: safeId,

    providerConfig: {
      type: "object",
      maxProperties: 50,
      additionalProperties: true
    }
  }
} as const;