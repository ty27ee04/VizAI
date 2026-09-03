import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  HikvisionIsapiHttpClient,
  HikvisionIsapiHttpError,
  type HikvisionIsapiFetcher
} from "../src/providers/hikvision-isapi/hikvision-isapi-http-client.js";

function client(
  fetcher: HikvisionIsapiFetcher,
  baseUrl = "http://camera.local"
) {
  return new HikvisionIsapiHttpClient(
    {
      baseUrl,
      channelId: "1",
      requestTimeoutMs: 100
    },
    {
      username: "test-user",
      password: "test-password"
    },
    fetcher
  );
}

function response(
  status: number,
  body: string,
  contentLength: string | null = null
) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-length"
          ? contentLength
          : null
    },
    text: async () => body
  };
}

const REQUEST = {
  method: "GET" as const,
  path: "/ISAPI/System/deviceInfo",
  maximumResponseBytes: 100
};

afterEach(() => {
  vi.useRealTimers();
});

describe("HikvisionIsapiHttpClient", () => {
  it("returns bounded successful XML", async () => {
    const http = client(async () =>
      response(200, "<DeviceInfo />")
    );

    await expect(
      http.requestXml(REQUEST)
    ).resolves.toBe("<DeviceInfo />");
  });

  it("classifies authentication failure", async () => {
    const http = client(async () =>
      response(401, "")
    );

    await expect(
      http.requestXml(REQUEST)
    ).rejects.toMatchObject({
      code: "authentication-failed"
    });
  });

  it("classifies other HTTP failures", async () => {
    const http = client(async () =>
      response(500, "private-response-body")
    );

    await expect(
      http.requestXml(REQUEST)
    ).rejects.toMatchObject({
      code: "http-error"
    });
  });

  it("rejects oversized declared responses", async () => {
    const http = client(async () =>
      response(200, "", "101")
    );

    await expect(
      http.requestXml(REQUEST)
    ).rejects.toMatchObject({
      code: "response-too-large"
    });
  });

  it("rejects oversized actual responses", async () => {
    const http = client(async () =>
      response(200, "x".repeat(101))
    );

    await expect(
      http.requestXml(REQUEST)
    ).rejects.toMatchObject({
      code: "response-too-large"
    });
  });

  it("classifies timeouts", async () => {
    vi.useFakeTimers();

    const http = client(
        async (_url, options) =>
        new Promise((_resolve, reject) => {
            options.signal.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true }
            );
        })
    );

    const assertion = expect(
        http.requestXml(REQUEST)
    ).rejects.toMatchObject({
        code: "request-timeout"
    });

    await vi.advanceTimersByTimeAsync(100);

    await assertion;
    });

  it("does not expose private values", async () => {
    const privateMarker =
      "must-not-appear-in-error";

    const http = client(async () => {
      throw new Error(privateMarker);
    });

    const error = await captureError(
      http.requestXml(REQUEST)
    );

    expect(error).toBeInstanceOf(
      HikvisionIsapiHttpError
    );

    expect((error as Error).message)
      .not.toContain(privateMarker);
  });

  it("accepts an equivalent normalized origin", async () => {
    const fetcher = vi.fn(async () =>
        response(200, "<DeviceInfo />")
    );

    const http = client(
        fetcher,
        "http://camera.local:80/"
    );

    await expect(
        http.requestXml(REQUEST)
    ).resolves.toBe("<DeviceInfo />");

    expect(fetcher).toHaveBeenCalledWith(
        "http://camera.local/ISAPI/System/deviceInfo",
        expect.any(Object)
    );
    });
});

async function captureError(
  operation: Promise<unknown>
): Promise<unknown> {
  try {
    await operation;
  } catch (error) {
    return error;
  }

  throw new Error("Expected operation to fail");
}