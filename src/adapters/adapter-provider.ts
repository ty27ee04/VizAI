import type { CameraRegistration } from "../contracts/camera-registration.js";
import type { CameraAdapter } from "./camera-adapter.js";

/**
 * Reusable recipe belonging to one adapter type.
 *
 * A provider is registered once, then used to create one adapter instance for
 * each matching logical camera registration.
 */
export interface AdapterProvider {
  /**
   * Registration value handled by this provider.
   *
   * Examples: "hikvision-isapi", "hikcentral", or "onvif".
   */
  readonly adapterType: string;

  /**
   * Validates non-secret settings owned by this provider.
   *
   * Invalid configuration must throw before an adapter connects.
   */
  validateConfig(
    config: Readonly<Record<string, unknown>>
  ): void;

  /**
   * Creates one disconnected adapter for one logical camera.
   *
   * Network activity belongs in adapter.connect(), not here.
   */
  create(registration: CameraRegistration): CameraAdapter;
}