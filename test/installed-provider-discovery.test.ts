import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  AdapterProviderPluginContext
} from "../src/providers/adapter-provider-plugin.js";
import {
  createAdapterRegistryFromPlugins
} from "../src/startup/create-adapter-registry-from-plugins.js";

function context():
  AdapterProviderPluginContext {
  return {
    output: {
      publish: vi.fn(async () => undefined)
    },
    environment: {
      VIZAI_ISAPI_CREDENTIAL_REF:
        "installed-plugin-test",
      VIZAI_ISAPI_USERNAME:
        "test-username",
      VIZAI_ISAPI_PASSWORD:
        "test-password"
    }
  };
}

describe("installed provider discovery", () => {
  it(
    "automatically installs the ISAPI provider folder",
    async () => {
      const pluginContext = context();

      const registry =
        await createAdapterRegistryFromPlugins(
          pluginContext
        );

      expect(
        registry.listAdapterTypes()
      ).toEqual([
        "hikvision-isapi"
      ]);

      expect(pluginContext.output.publish)
        .not.toHaveBeenCalled();
    }
  );

  it(
    "creates the discovered adapter without network work",
    async () => {
      const pluginContext = context();

      const registry =
        await createAdapterRegistryFromPlugins(
          pluginContext
        );

      const adapter = registry.create({
        cameraId:
          "entrance-isapi-discovered",
        displayName:
          "Discovered ISAPI camera",
        adapter: "hikvision-isapi",
        credentialRef:
          "installed-plugin-test",
        providerConfig: {
          baseUrl: "http://127.0.0.1",
          channelId: "1",
          requestTimeoutMs: 5000
        }
      });

      expect(adapter.cameraId).toBe(
        "entrance-isapi-discovered"
      );

      expect(adapter.adapterId).toBe(
        "hikvision-isapi:"
        + "entrance-isapi-discovered"
      );

      expect(pluginContext.output.publish)
        .not.toHaveBeenCalled();
    }
  );
});