export type PostgresSslMode =
  | "disable"
  | "require";

export interface PostgresConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly sslMode: PostgresSslMode;
  readonly maxConnections: number;
  readonly connectionTimeoutMs: number;
  readonly statementTimeoutMs: number;
}

export interface PostgresCredentials {
  readonly username: string;
  readonly password: string;
}

export type PostgresEnvironment =
  Readonly<Record<string, string | undefined>>;

export type PostgresConfigurationErrorCode =
  | "missing-value"
  | "invalid-value";

export class PostgresConfigurationError extends Error {
  constructor(
    readonly variableName: string,
    readonly code: PostgresConfigurationErrorCode
  ) {
    super(
      `Database environment variable ${variableName} is ${code}.`
    );

    this.name = "PostgresConfigurationError";
  }
}

export function readPostgresConfig(
  environment: PostgresEnvironment
): PostgresConfig {
  const sslMode = readRequiredString(
    environment,
    "VIZAI_DB_SSL_MODE"
  );

  if (
    sslMode !== "disable"
    && sslMode !== "require"
  ) {
    throw new PostgresConfigurationError(
      "VIZAI_DB_SSL_MODE",
      "invalid-value"
    );
  }

  return {
    host: readBoundedString(
      environment,
      "VIZAI_DB_HOST",
      255
    ),
    port: readInteger(
      environment,
      "VIZAI_DB_PORT",
      1,
      65_535
    ),
    database: readSafeIdentifier(
      environment,
      "VIZAI_DB_NAME"
    ),
    sslMode,
    maxConnections: readInteger(
      environment,
      "VIZAI_DB_MAX_CONNECTIONS",
      1,
      100
    ),
    connectionTimeoutMs: readInteger(
      environment,
      "VIZAI_DB_CONNECTION_TIMEOUT_MS",
      100,
      60_000
    ),
    statementTimeoutMs: readInteger(
      environment,
      "VIZAI_DB_STATEMENT_TIMEOUT_MS",
      100,
      120_000
    )
  };
}

export function readPostgresCredentials(
  environment: PostgresEnvironment
): PostgresCredentials {
  return {
    username: readBoundedString(
      environment,
      "VIZAI_DB_USERNAME",
      128
    ),
    password: readBoundedString(
      environment,
      "VIZAI_DB_PASSWORD",
      1_024
    )
  };
}

function readRequiredString(
  environment: PostgresEnvironment,
  variableName: string
): string {
  const value = environment[variableName];

  if (value === undefined || value.length === 0) {
    throw new PostgresConfigurationError(
      variableName,
      "missing-value"
    );
  }

  if (value.trim() !== value) {
    throw new PostgresConfigurationError(
      variableName,
      "invalid-value"
    );
  }

  return value;
}

function readBoundedString(
  environment: PostgresEnvironment,
  variableName: string,
  maximumLength: number
): string {
  const value = readRequiredString(
    environment,
    variableName
  );

  if (value.length > maximumLength) {
    throw new PostgresConfigurationError(
      variableName,
      "invalid-value"
    );
  }

  return value;
}

function readSafeIdentifier(
  environment: PostgresEnvironment,
  variableName: string
): string {
  const value = readRequiredString(
    environment,
    variableName
  );

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(value)) {
    throw new PostgresConfigurationError(
      variableName,
      "invalid-value"
    );
  }

  return value;
}

function readInteger(
  environment: PostgresEnvironment,
  variableName: string,
  minimum: number,
  maximum: number
): number {
  const value = readRequiredString(
    environment,
    variableName
  );

  if (!/^\d+$/.test(value)) {
    throw new PostgresConfigurationError(
      variableName,
      "invalid-value"
    );
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed)
    || parsed < minimum
    || parsed > maximum
  ) {
    throw new PostgresConfigurationError(
      variableName,
      "invalid-value"
    );
  }

  return parsed;
}