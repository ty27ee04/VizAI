import {
  loadCameraInventoryFile
} from "../config/camera-inventory-file-loader.js";
import type {
  CameraGateway
} from "../core/camera-gateway.js";
import type {
  CameraStartupReport
} from "./camera-startup-report.js";
import {
  registerCameraInventory
} from "./register-camera-inventory.js";

/**
 * Loads one complete inventory before attempting camera registration.
 *
 * Invalid files reject before any adapter is created. Runtime failures
 * for individual cameras are represented in the returned report.
 */
export async function startCameraGatewayFromFile(
  gateway: CameraGateway,
  inventoryFilePath: string
): Promise<CameraStartupReport> {
  const registrations =
    await loadCameraInventoryFile(inventoryFilePath);

  return registerCameraInventory(
    gateway,
    registrations
  );
}