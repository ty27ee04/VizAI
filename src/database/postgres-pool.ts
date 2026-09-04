import { Pool } from "pg";

import type {
  PostgresConfig,
  PostgresCredentials
} from "./postgres-config.js";

export function createPostgresPool(
  config: PostgresConfig,
  credentials: PostgresCredentials
): Pool {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: credentials.username,
    password: credentials.password,
    max: config.maxConnections,
    connectionTimeoutMillis:
      config.connectionTimeoutMs,
    statement_timeout:
      config.statementTimeoutMs,
    ssl:
      config.sslMode === "require"
        ? {
            rejectUnauthorized: true
          }
        : false
  });
}