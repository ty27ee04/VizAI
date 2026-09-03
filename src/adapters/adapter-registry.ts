import type { CameraRegistration } from "../contracts/camera-registration.js";
import type { AdapterProvider } from "./adapter-provider.js";
import type { CameraAdapter } from "./camera-adapter.js";

const SAFE_ADAPTER_TYPE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export class InvalidAdapterTypeError extends Error {}

export class DuplicateAdapterProviderError extends Error {}

export class UnknownAdapterProviderError extends Error {}

export class AdapterIdentityMismatchError extends Error {}

/**
 * Stores provider recipes and creates the correct adapter for a registration.
 */
export class AdapterRegistry {
  private readonly providers = new Map<string, AdapterProvider>();

  constructor(providers: readonly AdapterProvider[] = []) {
    for (const provider of providers) {
      this.register(provider);
    }
  }

  /**
   * Registers one provider recipe.
   */
  register(provider: AdapterProvider): void {
    if (!SAFE_ADAPTER_TYPE.test(provider.adapterType)) {
      throw new InvalidAdapterTypeError(
        `Adapter type '${provider.adapterType}' is invalid.`
      );
    }

    if (this.providers.has(provider.adapterType)) {
      throw new DuplicateAdapterProviderError(
        `Adapter provider '${provider.adapterType}' is already registered.`
      );
    }

    this.providers.set(provider.adapterType, provider);
  }

  /**
   * Selects a provider, validates its configuration, and creates one adapter.
   */
  create(registration: CameraRegistration): CameraAdapter {
    const provider = this.providers.get(registration.adapter);

    if (!provider) {
      throw new UnknownAdapterProviderError(
        `No adapter provider is registered for '${registration.adapter}'.`
      );
    }

    provider.validateConfig(registration.providerConfig);

    const adapter = provider.create(registration);

    if (adapter.cameraId !== registration.cameraId) {
      throw new AdapterIdentityMismatchError(
        `Adapter '${adapter.adapterId}' returned the wrong cameraId.`
      );
    }

    return adapter;
  }

  /**
   * Returns registered adapter types in a stable order.
   */
  listAdapterTypes(): readonly string[] {
    return [...this.providers.keys()].sort();
  }
}