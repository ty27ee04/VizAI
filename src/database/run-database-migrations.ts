import type { Pool } from "pg";

import {
  PEOPLE_FLOW_MIGRATION_ID,
  PEOPLE_FLOW_MIGRATION_SQL
} from "./migrations/001-create-people-flow.js";

export async function runDatabaseMigrations(
  pool: Pool
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      SELECT pg_advisory_xact_lock(89430217)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vizai_schema_migrations (
        migration_id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const existing = await client.query<{
      readonly migration_id: string;
    }>(
      `
        SELECT migration_id
        FROM vizai_schema_migrations
        WHERE migration_id = $1
      `,
      [PEOPLE_FLOW_MIGRATION_ID]
    );

    if (existing.rowCount === 0) {
      await client.query(
        PEOPLE_FLOW_MIGRATION_SQL
      );

      await client.query(
        `
          INSERT INTO vizai_schema_migrations (
            migration_id
          )
          VALUES ($1)
        `,
        [PEOPLE_FLOW_MIGRATION_ID]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}