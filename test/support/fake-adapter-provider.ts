import type { AdapterProvider } from "../../src/adapters/adapter-provider.js";
import type {
  CameraAdapter,
  CameraCapability
} from "../../src/adapters/camera-adapter.js";
import type { CameraRegistration } from "../../src/contracts/camera-registration.js";
import {
  FakeCameraAdapter,
  type FakeCameraAdapterOptions
} from "./fake-camera-adapter.js";

export interface FakeAdapterProviderOptions {
  readonly capabilities?: readonly CameraCapability[];
  readonly returnedCameraId?: string;
  readonly rejectConfig?: boolean;

  readonly adapterOptions?: Omit<
    FakeCameraAdapterOptions,
    "cameraId" | "adapterName" | "capabilities"
  >;
}

/**
 * Test provider that records what the registry passes to it.
 */
export class FakeAdapterProvider implements AdapterProvider {
  readonly validatedConfigs:
    Array<Readonly<Record<string, unknown>>> = [];

  readonly createdRegistrations: CameraRegistration[] = [];
  readonly createdAdapters: FakeCameraAdapter[] = [];

  constructor(
    readonly adapterType: string,
    private readonly options: FakeAdapterProviderOptions = {}
  ) {}

  validateConfig(
    config: Readonly<Record<string, unknown>>
  ): void {
    this.validatedConfigs.push(config);

    if (this.options.rejectConfig) {
      throw new Error(
        `Invalid ${this.adapterType} provider configuration.`
      );
    }
  }

  create(registration: CameraRegistration): CameraAdapter {
    this.createdRegistrations.push(registration);

    const adapter = new FakeCameraAdapter({
      cameraId:
        this.options.returnedCameraId ?? registration.cameraId,
      adapterName: this.adapterType,

      ...(this.options.capabilities
        ? { capabilities: this.options.capabilities }
        : {}),

      ...this.options.adapterOptions
    });

    this.createdAdapters.push(adapter);

    return adapter;
  }
}