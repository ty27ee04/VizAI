import {
  describe,
  expect,
  it
} from "vitest";

import {
  InvalidHikvisionIsapiProviderConfigError,
  parseHikvisionIsapiProviderConfig
} from "../src/providers/hikvision-isapi/hikvision-isapi-config-validator.js";

function validConfig() {
  return {
    baseUrl: "http://camera.local",
    channelId: "1",
    requestTimeoutMs: 5_000
  };
}

function captureError(
  operation: () => unknown
): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }

  throw new Error("Expected operation to throw");
}

describe("parseHikvisionIsapiProviderConfig", () => {
  it("accepts a valid HTTP camera origin", () => {
    const input = validConfig();

    expect(
      parseHikvisionIsapiProviderConfig(input)
    ).toEqual(input);
  });

  it("accepts a valid HTTPS origin with a port", () => {
    const input = {
      ...validConfig(),
      baseUrl: "https://camera.local:8443"
    };

    expect(
      parseHikvisionIsapiProviderConfig(input)
    ).toEqual(input);
  });

  it("rejects raw credential fields", () => {
    const privateValue =
      "must-not-appear-in-error";

    const error = captureError(() =>
      parseHikvisionIsapiProviderConfig({
        ...validConfig(),
        username: "camera-user",
        password: privateValue
      })
    );

    expect(error).toBeInstanceOf(
      InvalidHikvisionIsapiProviderConfigError
    );

    expect((error as Error).message)
      .not.toContain(privateValue);
  });

  it("rejects credentials embedded in the URL", () => {
    const privateValue =
      "private-camera-password";

    const error = captureError(() =>
      parseHikvisionIsapiProviderConfig({
        ...validConfig(),
        baseUrl:
          `http://camera-user:${privateValue}@camera.local`
      })
    );

    expect(error).toBeInstanceOf(
      InvalidHikvisionIsapiProviderConfigError
    );

    expect((error as Error).message)
      .not.toContain(privateValue);
  });

  it("rejects non-HTTP protocols", () => {
    expect(() =>
      parseHikvisionIsapiProviderConfig({
        ...validConfig(),
        baseUrl: "ftp://camera.local"
      })
    ).toThrow(
      InvalidHikvisionIsapiProviderConfigError
    );
  });

  it("rejects paths, queries, fragments, and whitespace", () => {
    const invalidUrls = [
      "http://camera.local/ISAPI/System/deviceInfo",
      "http://camera.local?mode=test",
      "http://camera.local#device",
      " http://camera.local",
      "http://camera.local "
    ];

    for (const baseUrl of invalidUrls) {
      expect(() =>
        parseHikvisionIsapiProviderConfig({
          ...validConfig(),
          baseUrl
        })
      ).toThrow(
        InvalidHikvisionIsapiProviderConfigError
      );
    }
  });

  it("rejects invalid timeout values", () => {
    const invalidTimeouts = [
      0,
      99,
      30_001,
      1_000.5
    ];

    for (const requestTimeoutMs of invalidTimeouts) {
      expect(() =>
        parseHikvisionIsapiProviderConfig({
          ...validConfig(),
          requestTimeoutMs
        })
      ).toThrow(
        InvalidHikvisionIsapiProviderConfigError
      );
    }
  });

  it("rejects unsafe channel identifiers", () => {
    const invalidChannelIds = [
      "",
      "channel 1",
      "../1",
      "1?query",
      "a".repeat(65)
    ];

    for (const channelId of invalidChannelIds) {
      expect(() =>
        parseHikvisionIsapiProviderConfig({
          ...validConfig(),
          channelId
        })
      ).toThrow(
        InvalidHikvisionIsapiProviderConfigError
      );
    }
  });

  it("rejects unexpected provider settings", () => {
    expect(() =>
      parseHikvisionIsapiProviderConfig({
        ...validConfig(),
        collectionMode: "periodic"
      })
    ).toThrow(
      InvalidHikvisionIsapiProviderConfigError
    );
  });

  it("rejects missing required settings", () => {
    const {
      channelId: _removedChannelId,
      ...input
    } = validConfig();

    expect(() =>
      parseHikvisionIsapiProviderConfig(input)
    ).toThrow(
      InvalidHikvisionIsapiProviderConfigError
    );
  });
});