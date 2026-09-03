import type {
  RegisteredCameraSummary
} from "../core/camera-gateway.js";

export interface RegisteredCameraStartupResult
  extends RegisteredCameraSummary {
  readonly status: "registered";
}

export interface FailedCameraStartupResult {
  readonly cameraId: string;
  readonly status: "failed";
}

export type CameraStartupResult =
  | RegisteredCameraStartupResult
  | FailedCameraStartupResult;

export interface CameraStartupReport {
  readonly status: "ready" | "degraded";
  readonly results: readonly CameraStartupResult[];
}