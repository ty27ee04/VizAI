/**
 * Runtime structure for non-secret Hikvision ISAPI configuration.
 *
 * URL security rules that require URL parsing are applied by the
 * semantic validator after this structural schema succeeds.
 */
export const hikvisionIsapiProviderConfigSchema = {
  $id: "https://vizai.local/schemas/hikvision-isapi-config.json",
  type: "object",
  additionalProperties: false,
  required: [
    "baseUrl",
    "channelId",
    "requestTimeoutMs"
  ],
  properties: {
    baseUrl: {
      type: "string",
      minLength: 1,
      maxLength: 2_048
    },
    channelId: {
      type: "string",
      minLength: 1,
      maxLength: 64,
      pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$"
    },
    requestTimeoutMs: {
      type: "integer",
      minimum: 100,
      maximum: 30_000
    }
  }
} as const;