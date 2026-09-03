import type {
  CameraRegistration
} from "../contracts/camera-registration.js";
import type {
  CameraGateway
} from "../core/camera-gateway.js";
import type {
  CameraStartupReport,
  CameraStartupResult
} from "./camera-startup-report.js";

/**
 * Attempts every trusted inventory registration independently.
 *
 * A failed camera produces a safe result and does not prevent later
 * logical cameras from being registered.
 */
export async function registerCameraInventory(
  gateway: CameraGateway,
  registrations: readonly CameraRegistration[]
): Promise<CameraStartupReport> {
  const results: CameraStartupResult[] = [];

  for (const registration of registrations) {
    try {
      const camera =
        await gateway.register(registration);

      results.push({
        ...camera,
        status: "registered"
      });
    } catch {
      results.push({
        cameraId: registration.cameraId,
        status: "failed"
      });
    }
  }

  return {
    status: results.some(
      (result) => result.status === "failed"
    )
      ? "degraded"
      : "ready",
    results
  };
}