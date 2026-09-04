import {
  describe,
  expect,
  it,
  vi
} from "vitest";
import type {
  Pool,
  PoolClient
} from "pg";

import {
  runDatabaseMigrations
} from "../src/database/run-database-migrations.js";

function fakePool(
  migrationExists: boolean
): {
  readonly pool: Pool;
  readonly query: ReturnType<typeof vi.fn>;
  readonly release: ReturnType<typeof vi.fn>;
} {
  const query = vi.fn(
    async (sql: string) => {
      if (sql.includes("SELECT migration_id")) {
        return {
          rowCount: migrationExists ? 1 : 0,
          rows: migrationExists
            ? [{
                migration_id:
                  "001-create-people-flow"
              }]
            : []
        };
      }

      return {
        rowCount: 0,
        rows: []
      };
    }
  );

  const release = vi.fn();

  const client = {
    query,
    release
  } as unknown as PoolClient;

  return {
    pool: {
      connect: vi.fn(async () => client)
    } as unknown as Pool,
    query,
    release
  };
}

describe("runDatabaseMigrations", () => {
  it("applies an unapplied migration", async () => {
    const fake = fakePool(false);

    await runDatabaseMigrations(fake.pool);

    const sql = fake.query.mock.calls
      .map((call) => String(call[0]))
      .join("\n");

    expect(sql).toContain(
      "CREATE TABLE IF NOT EXISTS people_flow_measurements"
    );
    expect(sql).toContain(
      "people_flow_camera_observed_idx"
    );
    expect(sql).toContain("COMMIT");
    expect(fake.release).toHaveBeenCalledOnce();
  });

  it("does not reapply an existing migration", async () => {
    const fake = fakePool(true);

    await runDatabaseMigrations(fake.pool);

    const sql = fake.query.mock.calls
      .map((call) => String(call[0]))
      .join("\n");

    expect(sql).not.toContain(
      "CREATE TABLE IF NOT EXISTS people_flow_measurements"
    );
    expect(sql).toContain("COMMIT");
  });

  it("rolls back and releases after failure", async () => {
    const fake = fakePool(false);

    fake.query.mockImplementationOnce(
      async () => {
        throw new Error("simulated database failure");
      }
    );

    await expect(
      runDatabaseMigrations(fake.pool)
    ).rejects.toThrow("simulated database failure");

    expect(fake.query).toHaveBeenCalledWith(
      "ROLLBACK"
    );
    expect(fake.release).toHaveBeenCalledOnce();
  });
});