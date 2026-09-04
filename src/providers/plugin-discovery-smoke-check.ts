import {
  InMemoryPeopleFlowOutputPort
} from "../output/in-memory-people-flow-output-port.js";
import {
  createAdapterRegistryFromPlugins
} from "../startup/create-adapter-registry-from-plugins.js";

const registry =
  await createAdapterRegistryFromPlugins({
    output:
      new InMemoryPeopleFlowOutputPort(),

    environment: {
      VIZAI_ISAPI_CREDENTIAL_REF:
        "compiled-discovery-proof",
      VIZAI_ISAPI_USERNAME:
        "unused-test-value",
      VIZAI_ISAPI_PASSWORD:
        "unused-test-value"
    }
  });

console.log(JSON.stringify({
  evidence:
    "compiled-provider-plugin-discovery",
  status: "passed",
  installedAdapterTypes:
    registry.listAdapterTypes(),
  cameraConnectionsAttempted: 0,
  limitation:
    "This proves compiled local plugin discovery only, not live camera compatibility."
}, null, 2));