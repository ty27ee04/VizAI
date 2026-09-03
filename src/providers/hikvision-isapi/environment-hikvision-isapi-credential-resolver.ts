import type {
  HikvisionIsapiCredentialResolver,
  HikvisionIsapiCredentials
} from "./hikvision-isapi-credentials.js";

/**
 * Non-secret environment-variable names assigned to one credentialRef.
 */
export interface HikvisionIsapiEnvironmentCredentialBinding {
  readonly usernameVariable: string;
  readonly passwordVariable: string;
}

/**
 * Trusted bindings created at the application composition boundary.
 */
export type HikvisionIsapiEnvironmentCredentialBindings =
  Readonly<
    Record<
      string,
      HikvisionIsapiEnvironmentCredentialBinding
    >
  >;

/**
 * The small part of process.env needed by this resolver.
 *
 * Keeping this as an interface-compatible record makes the resolver
 * deterministic and easy to test without reading the real environment.
 */
export type HikvisionIsapiEnvironment =
  Readonly<Record<string, string | undefined>>;

export type HikvisionIsapiCredentialResolutionReason =
  | "unknown-reference"
  | "missing-username"
  | "missing-password";

/**
 * Safe credential-resolution failure.
 *
 * Messages may identify the non-secret credentialRef and missing field,
 * but must never contain resolved credential values.
 */
export class HikvisionIsapiCredentialResolutionError
  extends Error {
  constructor(
    readonly credentialRef: string,
    readonly reason:
      HikvisionIsapiCredentialResolutionReason
  ) {
    super(
      `Cannot resolve Hikvision ISAPI credentials for "${
        credentialRef
      }": ${describeReason(reason)}`
    );

    this.name =
      "HikvisionIsapiCredentialResolutionError";
  }
}

/**
 * Resolves explicitly approved credential references from an injected
 * environment source.
 */
export class EnvironmentHikvisionIsapiCredentialResolver
  implements HikvisionIsapiCredentialResolver {
  constructor(
    private readonly bindings:
      HikvisionIsapiEnvironmentCredentialBindings,
    private readonly environment:
      HikvisionIsapiEnvironment
  ) {}

  resolve(
    credentialRef: string
  ): HikvisionIsapiCredentials {
    const binding = this.readBinding(credentialRef);

    const username = readNonEmptyEnvironmentValue(
      this.environment,
      binding.usernameVariable
    );

    if (username === undefined) {
      throw new HikvisionIsapiCredentialResolutionError(
        credentialRef,
        "missing-username"
      );
    }

    const password = readNonEmptyEnvironmentValue(
      this.environment,
      binding.passwordVariable
    );

    if (password === undefined) {
      throw new HikvisionIsapiCredentialResolutionError(
        credentialRef,
        "missing-password"
      );
    }

    return {
      username,
      password
    };
  }

  private readBinding(
    credentialRef: string
  ): HikvisionIsapiEnvironmentCredentialBinding {
    if (!Object.hasOwn(this.bindings, credentialRef)) {
      throw new HikvisionIsapiCredentialResolutionError(
        credentialRef,
        "unknown-reference"
      );
    }

    const binding = this.bindings[credentialRef];

    if (binding === undefined) {
      throw new HikvisionIsapiCredentialResolutionError(
        credentialRef,
        "unknown-reference"
      );
    }

    return binding;
  }
}

function readNonEmptyEnvironmentValue(
  environment: HikvisionIsapiEnvironment,
  variableName: string
): string | undefined {
  if (!Object.hasOwn(environment, variableName)) {
    return undefined;
  }

  const value = environment[variableName];

  if (value === undefined || value.length === 0) {
    return undefined;
  }

  return value;
}

function describeReason(
  reason: HikvisionIsapiCredentialResolutionReason
): string {
  switch (reason) {
    case "unknown-reference":
      return "the credential reference is not configured";

    case "missing-username":
      return "the username is unavailable";

    case "missing-password":
      return "the password is unavailable";
  }
}