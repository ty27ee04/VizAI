import {
  access,
  mkdir,
  mkdtemp,
  rm,
  writeFile
} from "node:fs/promises";
import {
  tmpdir
} from "node:os";
import {
  basename,
  dirname,
  join
} from "node:path";
import {
  fileURLToPath
} from "node:url";

import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  AdapterProvider
} from "../src/adapters/adapter-provider.js";
import type {
  CameraRegistration
} from "../src/contracts/camera-registration.js";
import {
  AdapterProviderDiscoveryError,
  discoverAdapterProviders
} from "../src/providers/discover-adapter-providers.js";
import type {
  AdapterProviderPluginContext
} from "../src/providers/adapter-provider-plugin.js";

const temporaryDirectories: string[] = [];

const context: AdapterProviderPluginContext = {
  output: {
    publish: vi.fn(async () => undefined)
  },
  environment: {}
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(
        async (directory) =>
          rm(directory, {
            recursive: true,
            force: true
          })
      )
  );
});

describe("discoverAdapterProviders", () => {
  it(
    "discovers plugin folders in deterministic order",
    async () => {
      const root = await createProviderRoot([
        {
          name: "zulu-camera",
          entryFileName: "plugin.ts"
        },
        {
          name: "ignored-support",
          entryFileName: undefined
        },
        {
          name: "alpha-camera",
          entryFileName: "plugin.ts"
        }
      ]);

      const createCalls: string[] = [];
      const adapterCreate = vi.fn();

      const providers =
        await discoverAdapterProviders(
          context,
          {
            providersDirectory: root,
            entryFileName: "plugin.ts",
            importModule: async (entryUrl) => {
              const pluginId =
                folderName(entryUrl);

              return {
                adapterProviderPlugin: {
                  pluginId,
                  createProviders: () => {
                    createCalls.push(pluginId);

                    return [
                      fakeProvider(
                        pluginId,
                        adapterCreate
                      )
                    ];
                  }
                }
              };
            }
          }
        );

      expect(createCalls).toEqual([
        "alpha-camera",
        "zulu-camera"
      ]);

      expect(
        providers.map(
          (provider) =>
            provider.adapterType
        )
      ).toEqual([
        "alpha-camera",
        "zulu-camera"
      ]);

      expect(adapterCreate)
        .not.toHaveBeenCalled();
    }
  );

  it(
    "supports an explicit compiled plugin.js entry",
    async () => {
      const root = await createProviderRoot([
        {
          name: "compiled-camera",
          entryFileName: "plugin.js"
        }
      ]);

      const providers =
        await discoverAdapterProviders(
          context,
          {
            providersDirectory: root,
            entryFileName: "plugin.js",
            importModule: async () => ({
              adapterProviderPlugin: {
                pluginId:
                  "compiled-camera",
                createProviders: () => [
                  fakeProvider(
                    "compiled-camera"
                  )
                ]
              }
            })
          }
        );

      expect(providers[0]?.adapterType)
        .toBe("compiled-camera");
    }
  );

  it(
    "rejects a folder and plugin ID mismatch",
    async () => {
      const root = await createProviderRoot([
        {
          name: "folder-name",
          entryFileName: "plugin.ts"
        }
      ]);

      await expect(
        discoverAdapterProviders(
          context,
          {
            providersDirectory: root,
            entryFileName: "plugin.ts",
            importModule: async () => ({
              adapterProviderPlugin: {
                pluginId: "different-name",
                createProviders: () => [
                  fakeProvider(
                    "different-name"
                  )
                ]
              }
            })
          }
        )
      ).rejects.toMatchObject({
        code: "plugin-id-mismatch",
        subject: "folder-name"
      });
    }
  );

  it(
    "rejects an invalid plugin export",
    async () => {
      const root = await createProviderRoot([
        {
          name: "broken-camera",
          entryFileName: "plugin.ts"
        }
      ]);

      await expect(
        discoverAdapterProviders(
          context,
          {
            providersDirectory: root,
            entryFileName: "plugin.ts",
            importModule:
              async () => ({})
          }
        )
      ).rejects.toMatchObject({
        code: "invalid-plugin-export"
      });
    }
  );

  it(
    "rejects an empty provider list",
    async () => {
      const root = await createProviderRoot([
        {
          name: "empty-camera",
          entryFileName: "plugin.ts"
        }
      ]);

      await expect(
        discoverAdapterProviders(
          context,
          {
            providersDirectory: root,
            entryFileName: "plugin.ts",
            importModule: async () => ({
              adapterProviderPlugin: {
                pluginId: "empty-camera",
                createProviders: () => []
              }
            })
          }
        )
      ).rejects.toMatchObject({
        code: "empty-provider-list"
      });
    }
  );

  it(
    "rejects an invalid provider recipe",
    async () => {
      const root = await createProviderRoot([
        {
          name: "invalid-camera",
          entryFileName: "plugin.ts"
        }
      ]);

      await expect(
        discoverAdapterProviders(
          context,
          {
            providersDirectory: root,
            entryFileName: "plugin.ts",
            importModule: async () => ({
              adapterProviderPlugin: {
                pluginId: "invalid-camera",
                createProviders: () => [
                  {
                    adapterType:
                      "invalid-camera"
                  }
                ]
              }
            })
          }
        )
      ).rejects.toMatchObject({
        code: "invalid-provider"
      });
    }
  );

  it(
    "rejects duplicate adapter types",
    async () => {
      const root = await createProviderRoot([
        {
          name: "brand-a",
          entryFileName: "plugin.ts"
        },
        {
          name: "brand-b",
          entryFileName: "plugin.ts"
        }
      ]);

      await expect(
        discoverAdapterProviders(
          context,
          {
            providersDirectory: root,
            entryFileName: "plugin.ts",
            importModule: async (
              entryUrl
            ) => ({
              adapterProviderPlugin: {
                pluginId:
                  folderName(entryUrl),
                createProviders: () => [
                  fakeProvider(
                    "shared-adapter"
                  )
                ]
              }
            })
          }
        )
      ).rejects.toMatchObject({
        code: "duplicate-adapter-type",
        subject: "shared-adapter"
      });
    }
  );

  it(
    "does not expose plugin load failures",
    async () => {
      const root = await createProviderRoot([
        {
          name: "secret-camera",
          entryFileName: "plugin.ts"
        }
      ]);

      const secret =
        "password=never-print-this";

      let caught: unknown;

      try {
        await discoverAdapterProviders(
          context,
          {
            providersDirectory: root,
            entryFileName: "plugin.ts",
            importModule: async () => {
              throw new Error(secret);
            }
          }
        );
      } catch (error) {
        caught = error;
      }

      expect(caught)
        .toBeInstanceOf(
          AdapterProviderDiscoveryError
        );

      expect(caught).toMatchObject({
        code: "plugin-load-failed",
        subject: "secret-camera"
      });

      expect(String(caught))
        .not.toContain(secret);
    }
  );
});

interface ProviderFolder {
  readonly name: string;
  readonly entryFileName:
    | string
    | undefined;
}

async function createProviderRoot(
  folders: readonly ProviderFolder[]
): Promise<string> {
  const root = await mkdtemp(
    join(
      tmpdir(),
      "vizai-provider-discovery-"
    )
  );

  temporaryDirectories.push(root);

  for (const folder of folders) {
    const folderPath = join(
      root,
      folder.name
    );

    await mkdir(folderPath);

    if (
      folder.entryFileName !== undefined
    ) {
      const entryPath = join(
        folderPath,
        folder.entryFileName
      );

      await writeFile(
        entryPath,
        "export {};\n",
        "utf8"
      );

      await access(entryPath);
    }
  }

  return root;
}

function folderName(
  entryUrl: string
): string {
  return basename(
    dirname(
      fileURLToPath(entryUrl)
    )
  );
}

function fakeProvider(
  adapterType: string,
  createSpy:
    ReturnType<typeof vi.fn> = vi.fn()
): AdapterProvider {
  return {
    adapterType,

    validateConfig:
      (_config) => undefined,

    create:
      (
        registration:
          CameraRegistration
      ) => {
        createSpy(registration);

        throw new Error(
          "Adapter creation is not used in discovery tests."
        );
      }
  };
}