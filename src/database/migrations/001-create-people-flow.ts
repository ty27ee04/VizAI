export const PEOPLE_FLOW_MIGRATION_ID =
  "001-create-people-flow";

export const PEOPLE_FLOW_MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS people_flow_measurements (
  id TEXT NOT NULL,
  measurement_type TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  camera_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_interval TEXT NOT NULL,
  entered_count BIGINT NOT NULL,
  exited_count BIGINT NOT NULL,
  count_basis TEXT NOT NULL,
  source_vendor TEXT NOT NULL,
  source_protocol TEXT NOT NULL,
  source_native_type TEXT NOT NULL,
  source_measurement_id TEXT,
  PRIMARY KEY (id, observed_at),

  CONSTRAINT people_flow_type_check
    CHECK (measurement_type = 'people.flow'),

  CONSTRAINT people_flow_mode_check
    CHECK (mode = 'periodic'),

  CONSTRAINT people_flow_interval_check
    CHECK (period_interval = 'hour'),

  CONSTRAINT people_flow_basis_check
    CHECK (count_basis = 'vendor-reported-period'),

  CONSTRAINT people_flow_entered_check
    CHECK (entered_count >= 0),

  CONSTRAINT people_flow_exited_check
    CHECK (exited_count >= 0),

  CONSTRAINT people_flow_period_order_check
    CHECK (period_end > period_start),

  CONSTRAINT people_flow_hour_check
    CHECK (
      period_end - period_start = INTERVAL '1 hour'
    )
);

SELECT create_hypertable(
  'people_flow_measurements',
  'observed_at',
  if_not_exists => TRUE
);

CREATE INDEX IF NOT EXISTS
  people_flow_camera_observed_idx
ON people_flow_measurements (
  camera_id,
  observed_at DESC
);
`;