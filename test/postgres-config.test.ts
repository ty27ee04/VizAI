import {
  describe,
  expect,
  it
} from "vitest";

import {
  PostgresConfigurationError,
  readPostgresConfig,
  readPostgresCredentials,
  type PostgresEnvironment
} from "../src/database/postgres-config.js";

function validEnvironment():
  Record<string, string> {
  return {
    VIZAI_DB_HOST: "127.0.0.1",
    VIZAI_DB_PORT: "5432",
    VIZAI_DB_NAME: "vizai",
    VIZAI_DB_SSL_MODE: "disable",
    VIZAI_DB_MAX_CONNECTIONS: "10",
    VIZAI_DB_CONNECTION_TIMEOUT_MS: "5000",
    VIZAI_DB_STATEMENT_TIMEOUT_MS: "10000",
    VIZAI_DB_USERNAME: "vizai_app",
    VIZAI_DB_PASSWORD: "local-test-password"
  };
}

describe("PostgreSQL configuration", () => {
  it("parses bounded non-secret settings", () => {
    expect(
      readPostgresConfig(validEnvironment())
    ).toEqual({
      host: "127.0.0.1",
      port: 5432,
      database: "vizai",
      sslMode: "disable",
      maxConnections: 10,
      connectionTimeoutMs: 5000,
      statementTimeoutMs: 10000
    });
  });

  it("resolves credentials separately", () => {
    expect(
      readPostgresCredentials(validEnvironment())
    ).toEqual({
      username: "vizai_app",
      password: "local-test-password"
    });
  });

  it("rejects a missing setting", () => {
    const environment: PostgresEnvironment = {
      ...validEnvironment(),
      VIZAI_DB_HOST: undefined
    };

    expect(() =>
      readPostgresConfig(environment)
    ).toThrow(PostgresConfigurationError);
  });

  it("rejects invalid ports", () => {
    expect(() =>
      readPostgresConfig({
        ...validEnvironment(),
        VIZAI_DB_PORT: "70000"
      })
    ).toThrow(PostgresConfigurationError);
  });

  it("rejects unsupported SSL modes", () => {
    expect(() =>
      readPostgresConfig({
        ...validEnvironment(),
        VIZAI_DB_SSL_MODE: "sometimes"
      })
    ).toThrow(PostgresConfigurationError);
  });

  it("does not expose password values", () => {
    const secret = "do-not-print-this-secret";

    try {
      readPostgresCredentials({
        ...validEnvironment(),
        VIZAI_DB_PASSWORD: ` ${secret}`
      });

      throw new Error("Expected rejection.");
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});