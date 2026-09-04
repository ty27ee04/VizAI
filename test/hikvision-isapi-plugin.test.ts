import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  CameraRegistration
} from "../src/contracts/camera-registration.js";
import {
  adapterProviderPlugin,
  HikvisionIsapiPluginConfigurationError
} from "../src/providers/hikvision-isapi/plugin.js";
import type {
  AdapterProviderPluginContext
} from "../src/providers/adapter-provider-plugin.js";

function validContext():
  AdapterProviderPluginContext {
  return {
    output: {
      publish: vi.fn(async () => undefined)
    },
    environment: {
      VIZAI_ISAPI_CREDENTIAL_REF:
        "plugin-test-credentials",
      VIZAI_ISAPI_USERNAME:
        "test-username",
      VIZAI_ISAPI_PASSWORD:
        "test-password"
    }
  };
}

function registration():
  CameraRegistration {
  return {
    cameraId: "entrance-isapi-01",
    displayName: "Entrance through ISAPI",
    adapter: "hikvision-isapi",
    credentialRef:
      "plugin-test-credentials",
    providerConfig: {
      baseUrl: "http://127.0.0.1",
      channelId: "1",
      requestTimeoutMs: 5000
    }
  };
}

describe("Hikvision ISAPI plugin", () => {
  it(
    "uses the provider folder identity",
    () => {
      expect(
        adapterProviderPlugin.pluginId
      ).toBe("hikvision-isapi");
    }
  );

  it(
    "creates one disconnected ISAPI provider recipe",
    async () => {
      const context = validContext();

      const providers =
        await adapterProviderPlugin
          .createProviders(context);

      expect(providers).toHaveLength(1);
      expect(providers[0]?.adapterType)
        .toBe("hikvision-isapi");

      expect(context.output.publish)
        .not.toHaveBeenCalled();
    }
  );

  it(
    "assembles an adapter without connecting it",
    async () => {
      const context = validContext();

      const providers =
        await adapterProviderPlugin
          .createProviders(context);

      const provider = providers[0];

      if (provider === undefined) {
        throw new Error(
          "Expected the ISAPI provider."
        );
      }

      const input = registration();

      provider.validateConfig(
        input.providerConfig
      );

      const adapter =
        provider.create(input);

      expect(adapter.cameraId)
        .toBe("entrance-isapi-01");

      expect(adapter.adapterId)
        .toBe(
          "hikvision-isapi:entrance-isapi-01"
        );

      expect(context.output.publish)
        .not.toHaveBeenCalled();
    }
  );

  it(
    "rejects invalid installation settings without exposing values",
    async () => {
      const secret =
        " secret-reference-value";

      const context:
        AdapterProviderPluginContext = {
        output: {
          publish:
            vi.fn(async () => undefined)
        },
        environment: {
          VIZAI_ISAPI_CREDENTIAL_REF:
            secret,
          VIZAI_ISAPI_USERNAME:
            "test-username",
          VIZAI_ISAPI_PASSWORD:
            "test-password"
        }
      };

      let caught: unknown;

      try {
        await adapterProviderPlugin
          .createProviders(context);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(
        HikvisionIsapiPluginConfigurationError
      );

      expect(String(caught))
        .not.toContain(secret);
    }
  );
});