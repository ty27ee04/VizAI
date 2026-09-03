import type {
  AdapterProvider
} from "../../adapters/adapter-provider.js";
import type {
  CameraAdapter
} from "../../adapters/camera-adapter.js";
import type {
  CameraRegistration
} from "../../contracts/camera-registration.js";
import {
  PeriodicPeopleFlowNormalizer
} from "../../core/periodic-people-flow-normalizer.js";
import type {
  PeopleFlowOutputPort
} from "../../output/people-flow-output-port.js";
import {
  HikvisionIsapiAdapter
} from "./hikvision-isapi-adapter.js";
import {
  HikvisionIsapiCountingReportClient
} from "./hikvision-isapi-counting-report-client.js";
import {
  HIKVISION_ISAPI_ADAPTER_TYPE,
  type HikvisionIsapiProviderConfig
} from "./hikvision-isapi-config.js";
import {
  parseHikvisionIsapiProviderConfig
} from "./hikvision-isapi-config-validator.js";
import type {
  HikvisionIsapiCredentialResolver,
  HikvisionIsapiCredentials
} from "./hikvision-isapi-credentials.js";
import {
  HikvisionIsapiDeviceInfoClient
} from "./hikvision-isapi-device-info-client.js";
import {
  HikvisionIsapiHttpClient
} from "./hikvision-isapi-http-client.js";
import {
  DefaultHikvisionIsapiPeopleFlowCollector
} from "./hikvision-isapi-people-flow-collector.js";

export interface HikvisionIsapiAdapterFactoryInput {
  readonly cameraId: string;
  readonly config: HikvisionIsapiProviderConfig;
  readonly credentials:
    HikvisionIsapiCredentials;
  readonly output: PeopleFlowOutputPort;
}

export type HikvisionIsapiAdapterFactory = (
  input: HikvisionIsapiAdapterFactoryInput
) => CameraAdapter;

export class HikvisionIsapiAdapterProvider
  implements AdapterProvider {
  readonly adapterType =
    HIKVISION_ISAPI_ADAPTER_TYPE;

  constructor(
    private readonly credentialResolver:
      HikvisionIsapiCredentialResolver,
    private readonly output:
      PeopleFlowOutputPort,
    private readonly adapterFactory:
      HikvisionIsapiAdapterFactory =
        createHikvisionIsapiRuntimeAdapter
  ) {}

  validateConfig(
    config: Readonly<Record<string, unknown>>
  ): void {
    parseHikvisionIsapiProviderConfig(config);
  }

  create(
    registration: CameraRegistration
  ): CameraAdapter {
    const config =
      parseHikvisionIsapiProviderConfig(
        registration.providerConfig
      );

    const credentials =
      this.credentialResolver.resolve(
        registration.credentialRef
      );

    return this.adapterFactory({
      cameraId: registration.cameraId,
      config,
      credentials,
      output: this.output
    });
  }
}

export function createHikvisionIsapiRuntimeAdapter(
  input: HikvisionIsapiAdapterFactoryInput
): CameraAdapter {
  const httpClient =
    new HikvisionIsapiHttpClient(
      input.config,
      input.credentials
    );

  const deviceInfoClient =
    new HikvisionIsapiDeviceInfoClient(
      httpClient
    );

  const reportClient =
    new HikvisionIsapiCountingReportClient(
      input.config,
      httpClient
    );

  const collector =
    new DefaultHikvisionIsapiPeopleFlowCollector(
      input.cameraId,
      input.config.channelId,
      reportClient,
      new PeriodicPeopleFlowNormalizer(),
      input.output
    );

  return new HikvisionIsapiAdapter(
    input.cameraId,
    deviceInfoClient,
    collector
  );
}