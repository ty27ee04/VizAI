import type {
  AdapterProvider
} from "../adapters/adapter-provider.js";
import type {
  PeopleFlowOutputPort
} from "../output/people-flow-output-port.js";

/**
 * Shared application dependencies available to trusted brand plugins.
 *
 * Provider-specific plugins decide how to use these dependencies.
 * The discovery loader does not know any vendor details.
 */
export interface AdapterProviderPluginContext {
  /**
   * Canonical output destination shared by all providers.
   */
  readonly output: PeopleFlowOutputPort;

  /**
   * Runtime environment used by provider-specific credential resolvers.
   *
   * Plugins must never log secret values from this object.
   */
  readonly environment:
    Readonly<Record<string, string | undefined>>;
}

/**
 * Trusted entry point exported by one provider folder.
 *
 * One plugin may create one or more reusable provider recipes.
 * It must not create connected camera instances during discovery.
 */
export interface AdapterProviderPlugin {
  /**
   * Must exactly match the containing folder name.
   *
   * Examples:
   * - hikvision-isapi
   * - hikcentral
   * - onvif
   */
  readonly pluginId: string;

  /**
   * Creates disconnected provider recipes.
   *
   * Network activity must not happen here. It belongs in
   * CameraAdapter.connect().
   */
  createProviders(
    context: AdapterProviderPluginContext
  ):
    | readonly AdapterProvider[]
    | Promise<readonly AdapterProvider[]>;
}