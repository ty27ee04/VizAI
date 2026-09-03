export const HIKVISION_ISAPI_ADAPTER_TYPE =
  "hikvision-isapi" as const;

/**
 * Trusted, non-secret settings for one direct Hikvision ISAPI
 * logical-camera registration.
 */
export interface HikvisionIsapiProviderConfig {
  /**
   * HTTP or HTTPS origin of the camera.
   *
   * Provider validation will reject embedded credentials, paths,
   * queries and fragments.
   */
  readonly baseUrl: string;

  /**
   * Provider-native channel identifier.
   *
   * This is not the VizAI logical cameraId.
   */
  readonly channelId: string;

  /**
   * Maximum duration allowed for one provider request.
   */
  readonly requestTimeoutMs: number;
}