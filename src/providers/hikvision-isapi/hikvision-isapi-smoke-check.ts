import {
  AdapterRegistry
} from "../../adapters/adapter-registry.js";
import {
  CameraGateway
} from "../../core/camera-gateway.js";
import {
  InMemoryPeopleFlowOutputPort
} from "../../output/in-memory-people-flow-output-port.js";
import {
  EnvironmentHikvisionIsapiCredentialResolver
} from "./environment-hikvision-isapi-credential-resolver.js";
import {
  HikvisionIsapiAdapterProvider
} from "./hikvision-isapi-provider.js";

const cameraId =
  process.env["VIZAI_ISAPI_CAMERA_ID"]
  ?? "entrance-isapi-01";

const credentialRef =
  "live-isapi-credentials";

const output =
  new InMemoryPeopleFlowOutputPort();

const credentialResolver =
  new EnvironmentHikvisionIsapiCredentialResolver(
    {
      [credentialRef]: {
        usernameVariable:
          "VIZAI_ISAPI_USERNAME",
        passwordVariable:
          "VIZAI_ISAPI_PASSWORD"
      }
    },
    process.env
  );

const provider =
  new HikvisionIsapiAdapterProvider(
    credentialResolver,
    output
  );

const gateway =
  new CameraGateway(
    new AdapterRegistry([provider])
  );

try {
  const result = await gateway.register({
    cameraId,
    displayName: "Live ISAPI check",
    adapter: "hikvision-isapi",
    credentialRef,
    providerConfig: {
      baseUrl:
        requiredEnvironmentValue(
          "VIZAI_ISAPI_BASE_URL"
        ),
      channelId:
        requiredEnvironmentValue(
          "VIZAI_ISAPI_CHANNEL_ID"
        ),
      requestTimeoutMs: Number(
        process.env[
          "VIZAI_ISAPI_REQUEST_TIMEOUT_MS"
        ] ?? "5000"
      )
    }
  });

  const measurements =
    output.listByCameraId(cameraId);

  console.log(JSON.stringify({
    evidence: "live-read-only-isapi-smoke-check",
    status: "passed",
    connected: true,
    capabilities: result.capabilities,
    periodicMeasurementsReceived:
      measurements.length,
    limitation:
      "This proves only the configured direct ISAPI device and requested period."
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    evidence: "live-read-only-isapi-smoke-check",
    status: "failed",
    errorType:
      error instanceof Error
        ? error.name
        : "UnknownError",
    errorCode:
      readSafeErrorCode(error),
    limitation:
      "No credential values or response bodies are included."
  }, null, 2));

  process.exitCode = 1;
} finally {
  await gateway.shutdown().catch(() => undefined);
}

function requiredEnvironmentValue(
  name: string
): string {
  const value = process.env[name];

  if (value === undefined || value === "") {
    throw new Error(
      `Required environment variable ${name} is unavailable.`
    );
  }

  return value;
}

function readSafeErrorCode(
  error: unknown
): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "reason" in error &&
    typeof error.reason === "string"
  ) {
    return error.reason;
  }

  return undefined;
}