/**
 * Configuration for one independent logical camera.
 *
 * Two registrations may connect to the same physical device, but they must
 * have different cameraId values.
 */
export interface CameraRegistration {
  /** Unique identity used by the gateway, database, API, and dashboard. */
  readonly cameraId: string;

  /** Human-readable name displayed to the user. */
  readonly displayName: string;

  /** Provider selected by the adapter registry. */
  readonly adapter: string;

  /** Reference to credentials stored outside the registration. */
  readonly credentialRef: string;

  /** Non-secret settings understood only by the selected adapter. */
  readonly providerConfig: Readonly<Record<string, unknown>>;
}