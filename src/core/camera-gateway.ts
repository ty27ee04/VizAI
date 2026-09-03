import type { AdapterRegistry } from "../adapters/adapter-registry.js";
import type {
  CameraAdapter,
  CameraAdapterHealth,
  CameraCapability
} from "../adapters/camera-adapter.js";
import { parseCameraRegistration } from "../contracts/camera-registration-validator.js";

export interface RegisteredCameraSummary {
  readonly cameraId: string;
  readonly adapterId: string;
  readonly capabilities: readonly CameraCapability[];
}

export interface GatewayCameraHealth
  extends CameraAdapterHealth {
  readonly cameraId: string;
  readonly adapterId: string;
}

export interface GatewayHealth {
  readonly status: "healthy" | "degraded";
  readonly cameras: readonly GatewayCameraHealth[];
}

interface RegisteredCamera {
  readonly adapter: CameraAdapter;
  readonly capabilities: readonly CameraCapability[];
}

export class CameraAlreadyRegisteredError extends Error {}

export class CameraNotFoundError extends Error {}

export class CameraOperationInProgressError extends Error {}

export class GatewayShutdownError extends Error {
  readonly failedCameraIds: readonly string[];

  constructor(failedCameraIds: readonly string[]) {
    super("Gateway could not disconnect every camera.");
    this.name = "GatewayShutdownError";
    this.failedCameraIds = [...failedCameraIds];
  }
}

/**
 * Coordinates validation, adapter creation, connection, and capability discovery.
 */
export class CameraGateway {
  private readonly cameras = new Map<string, RegisteredCamera>();

  /**
   * Prevents two concurrent requests from registering the same cameraId.
   */
  private readonly pendingCameraIds = new Set<string>();

    /**
   * Prevents simultaneous disconnection attempts for one cameraId.
   */
  private readonly disconnectingCameraIds = new Set<string>();

  constructor(
    private readonly adapterRegistry: AdapterRegistry,
    private readonly now: () => Date = () => new Date()
    ) {}

  /**
   * Registers and connects one independent logical camera.
   */
  async register(input: unknown): Promise<RegisteredCameraSummary> {
    const registration = parseCameraRegistration(input);

    if (
      this.cameras.has(registration.cameraId)
      || this.pendingCameraIds.has(registration.cameraId)
    ) {
      throw new CameraAlreadyRegisteredError(
        `Camera '${registration.cameraId}' is already registered.`
      );
    }

    this.pendingCameraIds.add(registration.cameraId);

    let adapter: CameraAdapter | undefined;

    try {
      adapter = this.adapterRegistry.create(registration);

      await adapter.connect();

      const discoveredCapabilities =
        await adapter.discoverCapabilities();

      const capabilities = [
        ...new Set(discoveredCapabilities)
      ];

      const registeredCamera: RegisteredCamera = {
        adapter,
        capabilities
      };

      this.cameras.set(
        registration.cameraId,
        registeredCamera
      );

      return cameraSummary(registeredCamera);
    } catch (error) {
      if (adapter) {
        try {
          await adapter.disconnect();
        } catch {
          // Preserve the original registration failure.
        }
      }

      throw error;
    } finally {
      this.pendingCameraIds.delete(registration.cameraId);
    }
  }

  /**
   * Returns safe summaries without credentials or provider configuration.
   */
  listCameras(): readonly RegisteredCameraSummary[] {
    return [...this.cameras.values()]
      .map(cameraSummary)
      .sort((left, right) =>
        left.cameraId.localeCompare(right.cameraId)
      );
  }

    /**
   * Checks every registered camera independently.
   *
   * One failed health request does not hide the other camera results.
   */
  async health(): Promise<GatewayHealth> {
    const cameras = await Promise.all(
      [...this.cameras.entries()].map(
        async ([cameraId, camera]): Promise<GatewayCameraHealth> => {
          try {
            const health = await camera.adapter.checkHealth();

            return {
              cameraId,
              adapterId: camera.adapter.adapterId,
              ...health
            };
          } catch {
            return {
              cameraId,
              adapterId: camera.adapter.adapterId,
              status: "offline",
              checkedAt: this.now().toISOString()
            };
          }
        }
      )
    );

    cameras.sort((left, right) =>
      left.cameraId.localeCompare(right.cameraId)
    );

    return {
      status: cameras.every(
        (camera) => camera.status === "healthy"
      )
        ? "healthy"
        : "degraded",
      cameras
    };
  }

    /**
   * Disconnects one logical camera before removing it from the gateway.
   */
  async unregister(cameraId: string): Promise<void> {
    const camera = this.cameras.get(cameraId);

    if (!camera) {
      throw new CameraNotFoundError(
        "Camera is not registered."
      );
    }

    if (this.disconnectingCameraIds.has(cameraId)) {
      throw new CameraOperationInProgressError(
        "Camera disconnection is already in progress."
      );
    }

    this.disconnectingCameraIds.add(cameraId);

    try {
      await camera.adapter.disconnect();
      this.cameras.delete(cameraId);
    } finally {
      this.disconnectingCameraIds.delete(cameraId);
    }
  }

    /**
   * Attempts to disconnect every registered logical camera independently.
   *
   * Successfully disconnected cameras are removed. Failed cameras remain
   * registered so cleanup can be retried.
   */
  async shutdown(): Promise<void> {
    const cameraIds = [...this.cameras.keys()];

    const results = await Promise.all(
      cameraIds.map(async (cameraId) => {
        try {
          await this.unregister(cameraId);
          return undefined;
        } catch {
          return cameraId;
        }
      })
    );

    const failedCameraIds = results.filter(
      (cameraId): cameraId is string =>
        cameraId !== undefined
    );

    if (failedCameraIds.length > 0) {
      throw new GatewayShutdownError(failedCameraIds);
    }
  }
}

function cameraSummary(
  camera: RegisteredCamera
): RegisteredCameraSummary {
  return {
    cameraId: camera.adapter.cameraId,
    adapterId: camera.adapter.adapterId,
    capabilities: [...camera.capabilities]
  };
}