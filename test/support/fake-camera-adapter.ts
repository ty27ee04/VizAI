import type {
    CameraAdapter,
    CameraAdapterHealth,
    CameraCapability
} from "../../src/adapters/camera-adapter.js";

export interface FakeCameraAdapterOptions {
    readonly cameraId: string;
    readonly adapterName: string;
    readonly capabilities?: readonly CameraCapability[];
    readonly now?: () => Date;

    readonly connectGate?: Promise<void>;
    readonly disconnectGate?: Promise<void>;
    readonly connectError?: Error;
    readonly capabilityDiscoveryError?: Error;
    readonly disconnectError?: Error;
    readonly healthError?: Error;
}

/**
 * Controllable test adapter with no network or physical camera dependency.
 */
export class FakeCameraAdapter implements CameraAdapter {
    readonly adapterId: string;
    readonly cameraId: string;

    connectCalls = 0;
    disconnectCalls = 0;
    discoveryCalls = 0;
    healthCalls = 0;

    private readonly capabilities: readonly CameraCapability[];
    private connectionOpen = false;

    constructor(
        private readonly options: FakeCameraAdapterOptions
    ) {
        this.cameraId = options.cameraId;
        this.adapterId =
            `${options.adapterName}:${options.cameraId}`;
        this.capabilities = [...(options.capabilities ?? [])];
    }

    async connect(): Promise<void> {
        this.connectCalls += 1;

        if (this.options.connectGate) {
            await this.options.connectGate;
        }

        /*
         * Mark it open before a controlled error to simulate a provider that
         * partially allocated resources before connection failed.
         */
        this.connectionOpen = true;

        if (this.options.connectError) {
            throw this.options.connectError;
        }
    }

    async disconnect(): Promise<void> {
        this.disconnectCalls += 1;

        if (this.options.disconnectGate) {
            await this.options.disconnectGate;
        }

        this.connectionOpen = false;

        if (this.options.disconnectError) {
            throw this.options.disconnectError;
        }
    }

    async discoverCapabilities(): Promise<readonly CameraCapability[]> {
        this.discoveryCalls += 1;

        if (!this.connectionOpen) {
            throw new Error(
                "Adapter must be connected before capability discovery."
            );
        }

        if (this.options.capabilityDiscoveryError) {
            throw this.options.capabilityDiscoveryError;
        }

        return [...this.capabilities];
    }

    async checkHealth(): Promise<CameraAdapterHealth> {
        this.healthCalls += 1;

        if (this.options.healthError) {
            throw this.options.healthError;
        }

        return {
            status: this.connectionOpen ? "healthy" : "offline",
            checkedAt: (
                this.options.now?.() ?? new Date()
            ).toISOString()
        };
    }

    isConnected(): boolean {
        return this.connectionOpen;
    }
}