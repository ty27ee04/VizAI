import {
  access,
  readdir
} from "node:fs/promises";
import {
  dirname,
  join
} from "node:path";
import {
  fileURLToPath,
  pathToFileURL
} from "node:url";

import type {
  AdapterProvider
} from "../adapters/adapter-provider.js";
import type {
  AdapterProviderPlugin,
  AdapterProviderPluginContext
} from "./adapter-provider-plugin.js";

const SAFE_PLUGIN_ID =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export type AdapterProviderDiscoveryErrorCode =
  | "providers-directory-unavailable"
  | "plugin-entry-unavailable"
  | "plugin-load-failed"
  | "invalid-plugin-export"
  | "invalid-plugin-id"
  | "plugin-id-mismatch"
  | "duplicate-plugin-id"
  | "provider-creation-failed"
  | "empty-provider-list"
  | "invalid-provider"
  | "duplicate-adapter-type";

export class AdapterProviderDiscoveryError
  extends Error {
  constructor(
    readonly code:
      AdapterProviderDiscoveryErrorCode,
    readonly subject: string
  ) {
    super(
      `Adapter provider discovery failed for "${
        subject
      }": ${code}.`
    );

    this.name =
      "AdapterProviderDiscoveryError";
  }
}

/**
 * Testable boundaries around folder discovery and dynamic importing.
 */
export interface AdapterProviderDiscoveryOptions {
  /**
   * Defaults to the folder containing this loader.
   */
  readonly providersDirectory?: string;

  /**
   * Normally inferred as plugin.ts or plugin.js.
   */
  readonly entryFileName?: string;

  /**
   * Tests replace dynamic import through this boundary.
   */
  readonly importModule?: (
    entryUrl: string
  ) => Promise<unknown>;
}

interface AdapterProviderPluginModule {
  readonly adapterProviderPlugin?: unknown;
}

/**
 * Discovers trusted brand plugins from immediate provider subfolders.
 *
 * The returned values are disconnected provider recipes. No camera
 * registration or network connection happens during discovery.
 */
export async function discoverAdapterProviders(
  context: AdapterProviderPluginContext,
  options:
    Readonly<AdapterProviderDiscoveryOptions> = {}
): Promise<readonly AdapterProvider[]> {
  const providersDirectory =
    options.providersDirectory
    ?? dirname(fileURLToPath(import.meta.url));

  const entryFileName =
    options.entryFileName
    ?? defaultPluginEntryFileName();

  const importModule =
    options.importModule
    ?? (
      async (entryUrl: string): Promise<unknown> =>
        import(entryUrl)
    );

  const directoryNames =
    await readProviderDirectoryNames(
      providersDirectory
    );

  const providers: AdapterProvider[] = [];
  const pluginIds = new Set<string>();
  const adapterTypes = new Set<string>();

  for (const directoryName of directoryNames) {
    const entryPath = join(
      providersDirectory,
      directoryName,
      entryFileName
    );

    const hasEntry = await pluginEntryExists(
      entryPath,
      directoryName
    );

    if (!hasEntry) {
      continue;
    }

    const loaded = await loadPluginModule(
      directoryName,
      entryPath,
      importModule
    );

    const plugin = parsePlugin(
      directoryName,
      loaded
    );

    if (pluginIds.has(plugin.pluginId)) {
      throw new AdapterProviderDiscoveryError(
        "duplicate-plugin-id",
        plugin.pluginId
      );
    }

    pluginIds.add(plugin.pluginId);

    const createdProviders =
      await createPluginProviders(
        plugin,
        context
      );

    if (
      !Array.isArray(createdProviders)
      || createdProviders.length === 0
    ) {
      throw new AdapterProviderDiscoveryError(
        "empty-provider-list",
        plugin.pluginId
      );
    }

    for (const provider of createdProviders) {
      assertProvider(
        plugin.pluginId,
        provider
      );

      if (
        adapterTypes.has(provider.adapterType)
      ) {
        throw new AdapterProviderDiscoveryError(
          "duplicate-adapter-type",
          provider.adapterType
        );
      }

      adapterTypes.add(provider.adapterType);
      providers.push(provider);
    }
  }

  return providers;
}

async function readProviderDirectoryNames(
  providersDirectory: string
): Promise<readonly string[]> {
  try {
    const entries = await readdir(
      providersDirectory,
      {
        withFileTypes: true
      }
    );

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) =>
        left.localeCompare(right)
      );
  } catch {
    throw new AdapterProviderDiscoveryError(
      "providers-directory-unavailable",
      "providers"
    );
  }
}

async function pluginEntryExists(
  entryPath: string,
  directoryName: string
): Promise<boolean> {
  try {
    await access(entryPath);
    return true;
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }

    throw new AdapterProviderDiscoveryError(
      "plugin-entry-unavailable",
      directoryName
    );
  }
}

async function loadPluginModule(
  directoryName: string,
  entryPath: string,
  importModule: (
    entryUrl: string
  ) => Promise<unknown>
): Promise<unknown> {
  try {
    return await importModule(
      pathToFileURL(entryPath).href
    );
  } catch {
    throw new AdapterProviderDiscoveryError(
      "plugin-load-failed",
      directoryName
    );
  }
}

function parsePlugin(
  directoryName: string,
  loaded: unknown
): AdapterProviderPlugin {
  if (!isRecord(loaded)) {
    throw new AdapterProviderDiscoveryError(
      "invalid-plugin-export",
      directoryName
    );
  }

  const pluginModule =
    loaded as AdapterProviderPluginModule;

  const plugin =
    pluginModule.adapterProviderPlugin;

  if (
    !isRecord(plugin)
    || typeof plugin["pluginId"] !== "string"
    || typeof plugin["createProviders"]
      !== "function"
  ) {
    throw new AdapterProviderDiscoveryError(
      "invalid-plugin-export",
      directoryName
    );
  }

  const pluginId = plugin["pluginId"];

  if (!SAFE_PLUGIN_ID.test(pluginId)) {
    throw new AdapterProviderDiscoveryError(
      "invalid-plugin-id",
      directoryName
    );
  }

  if (pluginId !== directoryName) {
    throw new AdapterProviderDiscoveryError(
      "plugin-id-mismatch",
      directoryName
    );
  }

  return plugin as unknown as AdapterProviderPlugin;
}

async function createPluginProviders(
  plugin: AdapterProviderPlugin,
  context: AdapterProviderPluginContext
): Promise<readonly AdapterProvider[]> {
  try {
    return await plugin.createProviders(
      context
    );
  } catch {
    throw new AdapterProviderDiscoveryError(
      "provider-creation-failed",
      plugin.pluginId
    );
  }
}

function assertProvider(
  pluginId: string,
  value: unknown
): asserts value is AdapterProvider {
  if (
    !isRecord(value)
    || typeof value["adapterType"] !== "string"
    || !SAFE_PLUGIN_ID.test(
      value["adapterType"]
    )
    || typeof value["validateConfig"]
      !== "function"
    || typeof value["create"] !== "function"
  ) {
    throw new AdapterProviderDiscoveryError(
      "invalid-provider",
      pluginId
    );
  }
}

function defaultPluginEntryFileName():
  "plugin.ts" | "plugin.js" {
  return fileURLToPath(import.meta.url)
    .endsWith(".ts")
    ? "plugin.ts"
    : "plugin.js";
}

function isMissingFileError(
  error: unknown
): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "ENOENT"
  );
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
  );
}