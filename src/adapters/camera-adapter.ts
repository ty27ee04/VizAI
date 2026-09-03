/**
 * A capability name reported by an adapter.
 *
 * It remains a string so future adapter plugins can add capabilities without
 * editing this shared interface.
 */
export type CameraCapability = string;

/**
 * Small, non-secret health report returned by an adapter.
 */
export interface CameraAdapterHealth {
  readonly status: "healthy" | "degraded" | "offline";
  readonly checkedAt: string;
}

/**
 * Common lifecycle that every camera integration must implement.
 */
export interface CameraAdapter {
  /**
   * Identifies this runtime connector.
   *
   * Example: "hikvision-isapi:entrance-isapi-01"
   */
  readonly adapterId: string;

  /**
   * Identifies the independent logical camera throughout the system.
   */
  readonly cameraId: string;

  /**
   * Opens or prepares the provider connection.
   *
   * A failure must reject the promise instead of pretending to be connected.
   */
  connect(): Promise<void>;

  /**
   * Releases streams, timers, subscriptions, and network resources.
   */
  disconnect(): Promise<void>;

  /**
   * Asks the provider what this logical camera actually supports.
   */
  discoverCapabilities(): Promise<readonly CameraCapability[]>;

  /**
   * Checks the current adapter connection without exposing credentials.
   */
  checkHealth(): Promise<CameraAdapterHealth>;
}