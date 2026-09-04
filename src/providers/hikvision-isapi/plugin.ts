import type {
  AdapterProviderPlugin
} from "../adapter-provider-plugin.js";
import {
  EnvironmentHikvisionIsapiCredentialResolver
} from "./environment-hikvision-isapi-credential-resolver.js";
import {
  HikvisionIsapiAdapterProvider
} from "./hikvision-isapi-provider.js";

const HIKVISION_ISAPI_PLUGIN_ID =
  "hikvision-isapi";

const SAFE_CREDENTIAL_REFERENCE =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/**
 * Raised when the trusted ISAPI plugin installation settings
 * are unavailable or malformed.
 *
 * It never includes environment values.
 */
export class HikvisionIsapiPluginConfigurationError
  extends Error {
  constructor() {
    super(
      "Hikvision ISAPI plugin configuration is unavailable or invalid."
    );

    this.name =
      "HikvisionIsapiPluginConfigurationError";
  }
}

/**
 * Automatically discovered installation entry point for the
 * complete Hikvision ISAPI brand integration.
 *
 * It creates a reusable provider recipe only. It does not create
 * an adapter or contact a camera during plugin discovery.
 */
export const adapterProviderPlugin = {
  pluginId: HIKVISION_ISAPI_PLUGIN_ID,

  createProviders: (context) => {
    const credentialRef =
      readCredentialReference(
        context.environment
      );

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
        context.environment
      );

    return [
      new HikvisionIsapiAdapterProvider(
        credentialResolver,
        context.output
      )
    ];
  }
} satisfies AdapterProviderPlugin;

function readCredentialReference(
  environment:
    Readonly<Record<string, string | undefined>>
): string {
  const value =
    environment[
      "VIZAI_ISAPI_CREDENTIAL_REF"
    ];

  if (
    value === undefined
    || !SAFE_CREDENTIAL_REFERENCE.test(value)
  ) {
    throw new HikvisionIsapiPluginConfigurationError();
  }

  return value;
}