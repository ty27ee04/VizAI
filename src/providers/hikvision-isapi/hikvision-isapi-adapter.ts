import type {
  CameraAdapter,
  CameraAdapterHealth,
  CameraCapability
} from "../../adapters/camera-adapter.js";
import type {
  HikvisionIsapiDeviceInfoSource
} from "./hikvision-isapi-device-info-client.js";
import type {
  HikvisionIsapiPeopleFlowCollector
} from "./hikvision-isapi-people-flow-collector.js";

export const HIKVISION_ISAPI_PEOPLE_FLOW_CAPABILITY =
  "analytics.people-flow-periodic";

const DEFAULT_POLL_INTERVAL_MS =
  5 * 60 * 1000;

export class HikvisionIsapiAdapter
  implements CameraAdapter {
  readonly adapterId: string;

  private status:
    CameraAdapterHealth["status"] = "offline";

  private controller:
    AbortController | undefined;

  private pollingTask:
    Promise<void> | undefined;

  constructor(
    readonly cameraId: string,
    private readonly deviceInfoSource:
      HikvisionIsapiDeviceInfoSource,
    private readonly collector:
      HikvisionIsapiPeopleFlowCollector,
    private readonly pollIntervalMs:
      number = DEFAULT_POLL_INTERVAL_MS,
    private readonly now:
      () => Date = () => new Date()
  ) {
    this.adapterId =
      `hikvision-isapi:${cameraId}`;
  }

  async connect(): Promise<void> {
    if (this.status !== "offline") {
      return;
    }

    await this.deviceInfoSource.getDeviceInfo();
    await this.collector.collect(this.now());

    this.status = "healthy";
    this.controller = new AbortController();

    this.pollingTask =
      this.runPollingLoop(
        this.controller.signal
      );
  }

  async disconnect(): Promise<void> {
    this.controller?.abort();
    await this.pollingTask;

    this.controller = undefined;
    this.pollingTask = undefined;
    this.status = "offline";
  }

  async discoverCapabilities():
    Promise<readonly CameraCapability[]> {
    return [
      HIKVISION_ISAPI_PEOPLE_FLOW_CAPABILITY
    ];
  }

  async checkHealth():
    Promise<CameraAdapterHealth> {
    return {
      status: this.status,
      checkedAt: this.now().toISOString()
    };
  }

  private async runPollingLoop(
    signal: AbortSignal
  ): Promise<void> {
    while (!signal.aborted) {
      await delay(
        this.pollIntervalMs,
        signal
      );

      if (signal.aborted) {
        break;
      }

      try {
        await this.collector.collect(this.now());
        this.status = "healthy";
      } catch {
        this.status = "degraded";
      }
    }
  }
}

function delay(
  milliseconds: number,
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(
      finish,
      milliseconds
    );

    signal.addEventListener(
      "abort",
      finish,
      { once: true }
    );

    function finish(): void {
      clearTimeout(timeout);

      signal.removeEventListener(
        "abort",
        finish
      );

      resolve();
    }
  });
}