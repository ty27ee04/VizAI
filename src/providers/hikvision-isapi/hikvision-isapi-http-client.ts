import DigestClient from "digest-fetch";

import type {
  HikvisionIsapiProviderConfig
} from "./hikvision-isapi-config.js";
import type {
  HikvisionIsapiCredentials
} from "./hikvision-isapi-credentials.js";

export type HikvisionIsapiHttpErrorCode =
  | "authentication-failed"
  | "request-timeout"
  | "http-error"
  | "network-error"
  | "response-too-large"
  | "invalid-request-path";

export class HikvisionIsapiHttpError extends Error {
  constructor(
    readonly code: HikvisionIsapiHttpErrorCode,
    message: string
  ) {
    super(message);
    this.name = "HikvisionIsapiHttpError";
  }
}

export interface HikvisionIsapiXmlRequest {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly maximumResponseBytes: number;
  readonly body?: string;
}

export interface HikvisionIsapiHttpResponse {
  readonly status: number;
  readonly ok: boolean;
  readonly headers: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
}

export interface HikvisionIsapiFetchOptions {
  readonly method: "GET" | "POST";
  readonly headers: Readonly<Record<string, string>>;
  readonly redirect: "error";
  readonly signal: AbortSignal;
  readonly body?: string;
}

export type HikvisionIsapiFetcher = (
  url: string,
  options: HikvisionIsapiFetchOptions
) => Promise<HikvisionIsapiHttpResponse>;

export interface HikvisionIsapiXmlClient {
  requestXml(
    request: HikvisionIsapiXmlRequest
  ): Promise<string>;
}

export class HikvisionIsapiHttpClient
  implements HikvisionIsapiXmlClient {
  private readonly fetcher: HikvisionIsapiFetcher;

  constructor(
    private readonly config:
      HikvisionIsapiProviderConfig,
    credentials: HikvisionIsapiCredentials,
    fetcher?: HikvisionIsapiFetcher
  ) {
    this.fetcher =
      fetcher ?? createDigestFetcher(credentials);
  }

  async requestXml(
    request: HikvisionIsapiXmlRequest
  ): Promise<string> {
    if (
      !request.path.startsWith("/") ||
      request.path.startsWith("//") ||
      request.path.includes("\\")
    ) {
      throw new HikvisionIsapiHttpError(
        "invalid-request-path",
        "The ISAPI request path is invalid."
      );
    }

    const url = new URL(
      request.path,
      `${this.config.baseUrl}/`
    );

    const configuredOrigin =
        new URL(this.config.baseUrl).origin;

    if (url.origin !== configuredOrigin) {
      throw new HikvisionIsapiHttpError(
        "invalid-request-path",
        "The ISAPI request path left the configured origin."
      );
    }

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs
    );

    try {
      const headers: Record<string, string> = {
        Accept: "application/xml"
      };

      if (request.body !== undefined) {
        headers["Content-Type"] = "application/xml";
      }

      const response = await this.fetcher(
        url.toString(),
        {
          method: request.method,
          headers,
          redirect: "error",
          signal: controller.signal,

          ...(request.body !== undefined
            ? { body: request.body }
            : {})
        }
      );

      if (response.status === 401) {
        throw new HikvisionIsapiHttpError(
          "authentication-failed",
          "The camera rejected the configured credentials."
        );
      }

      if (!response.ok) {
        throw new HikvisionIsapiHttpError(
          "http-error",
          `The camera returned HTTP ${response.status}.`
        );
      }

      const contentLength =
        response.headers.get("content-length");

      if (contentLength !== null) {
        const declaredBytes = Number(contentLength);

        if (
          Number.isFinite(declaredBytes) &&
          declaredBytes >
            request.maximumResponseBytes
        ) {
          throw new HikvisionIsapiHttpError(
            "response-too-large",
            "The camera response exceeded the allowed size."
          );
        }
      }

      const xml = await response.text();

      if (
        Buffer.byteLength(xml, "utf8") >
        request.maximumResponseBytes
      ) {
        throw new HikvisionIsapiHttpError(
          "response-too-large",
          "The camera response exceeded the allowed size."
        );
      }

      return xml;
    } catch (error) {
      if (error instanceof HikvisionIsapiHttpError) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new HikvisionIsapiHttpError(
          "request-timeout",
          "The camera request timed out."
        );
      }

      throw new HikvisionIsapiHttpError(
        "network-error",
        "The gateway could not reach the camera."
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function createDigestFetcher(
  credentials: HikvisionIsapiCredentials
): HikvisionIsapiFetcher {
  const client = new DigestClient(
    credentials.username,
    credentials.password
  );

  return async (url, options) => {
    const response = await client.fetch(url, options);

    return {
      status: response.status,
      ok: response.ok,
      headers: {
        get: (name) => response.headers.get(name)
      },
      text: () => response.text()
    };
  };
}