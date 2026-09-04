import {
  AdapterRegistry
} from "../adapters/adapter-registry.js";
import {
  discoverAdapterProviders,
  type AdapterProviderDiscoveryOptions
} from "../providers/discover-adapter-providers.js";
import type {
  AdapterProviderPluginContext
} from "../providers/adapter-provider-plugin.js";

/**
 * Discovers installed brand plugins and installs their provider
 * recipes into one gateway registry.
 *
 * Discovery creates providers only. Camera adapters are created
 * later when CameraGateway registers inventory entries.
 */
export async function createAdapterRegistryFromPlugins(
  context: AdapterProviderPluginContext,
  discoveryOptions:
    Readonly<AdapterProviderDiscoveryOptions> = {}
): Promise<AdapterRegistry> {
  const providers =
    await discoverAdapterProviders(
      context,
      discoveryOptions
    );

  return new AdapterRegistry(providers);
}