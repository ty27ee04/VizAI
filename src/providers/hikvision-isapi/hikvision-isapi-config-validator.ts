import {
  Ajv,
  type ErrorObject
} from "ajv";

import type {
  HikvisionIsapiProviderConfig
} from "./hikvision-isapi-config.js";
import {
  hikvisionIsapiProviderConfigSchema
} from "./hikvision-isapi-config-schema.js";

const ajv = new Ajv({
  allErrors: true,
  strict: true
});

const validateHikvisionIsapiProviderConfig =
  ajv.compile<HikvisionIsapiProviderConfig>(
    hikvisionIsapiProviderConfigSchema
  );

/**
 * Raised when providerConfig cannot become trusted ISAPI settings.
 *
 * Issues describe schema locations and rules without copying input
 * values into the message.
 */
export class InvalidHikvisionIsapiProviderConfigError
  extends Error {
  constructor(readonly issues: readonly string[]) {
    super(
      `Hikvision ISAPI configuration is invalid: ${
        issues.join("; ")
      }`
    );

    this.name =
      "InvalidHikvisionIsapiProviderConfigError";
  }
}

/**
 * Converts an untrusted providerConfig value into trusted settings.
 */
export function parseHikvisionIsapiProviderConfig(
  input: unknown
): HikvisionIsapiProviderConfig {
  if (!validateHikvisionIsapiProviderConfig(input)) {
    const issues =
      validateHikvisionIsapiProviderConfig.errors
        ?.map(describeError)
      ?? ["Unknown validation error"];

    throw new InvalidHikvisionIsapiProviderConfigError(
      issues
    );
  }

  if (!isSafeDeviceBaseUrl(input.baseUrl)) {
    throw new InvalidHikvisionIsapiProviderConfigError([
      "/baseUrl must be an HTTP(S) origin without credentials, path, query, fragment, or surrounding whitespace"
    ]);
  }

  return input;
}

function describeError(error: ErrorObject): string {
  const location = error.instancePath || "/";

  return `${location} ${
    error.message ?? "is invalid"
  }`;
}

function isSafeDeviceBaseUrl(value: string): boolean {
  if (value.trim() !== value) {
    return false;
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  return (
    (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    ) &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.pathname === "/" &&
    parsed.search === "" &&
    parsed.hash === "" &&
    parsed.hostname !== ""
  );
}