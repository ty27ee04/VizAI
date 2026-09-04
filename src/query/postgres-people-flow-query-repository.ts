import type {
  Pool,
  QueryResultRow
} from "pg";

import type {
  PeopleFlowMeasurement
} from "../contracts/people-flow-measurement.js";
import {
  parsePeopleFlowMeasurement
} from "../contracts/people-flow-measurement-validator.js";
import type {
  PeopleFlowHistoryQuery
} from "./people-flow-query.js";
import type {
  PeopleFlowQueryPort
} from "./people-flow-query-port.js";

interface PeopleFlowRow extends QueryResultRow {
  readonly id: string;
  readonly measurement_type: string;
  readonly contract_version: string;
  readonly camera_id: string;
  readonly channel_id: string;
  readonly observed_at: Date;
  readonly received_at: Date;
  readonly mode: string;
  readonly period_start: Date;
  readonly period_end: Date;
  readonly period_interval: string;
  readonly entered_count: string;
  readonly exited_count: string;
  readonly count_basis: string;
  readonly source_vendor: string;
  readonly source_protocol: string;
  readonly source_native_type: string;
  readonly source_measurement_id: string | null;
}

const SELECT_COLUMNS = `
  id,
  measurement_type,
  contract_version,
  camera_id,
  channel_id,
  observed_at,
  received_at,
  mode,
  period_start,
  period_end,
  period_interval,
  entered_count,
  exited_count,
  count_basis,
  source_vendor,
  source_protocol,
  source_native_type,
  source_measurement_id
`;

export class PostgresPeopleFlowQueryRepository
  implements PeopleFlowQueryPort {
  constructor(
    private readonly pool: Pool
  ) {}

  async history(
    query: PeopleFlowHistoryQuery
  ): Promise<readonly PeopleFlowMeasurement[]> {
    const result =
      await this.pool.query<PeopleFlowRow>(
        `
          SELECT ${SELECT_COLUMNS}
          FROM people_flow_measurements
          WHERE camera_id = $1
            AND observed_at >= $2
            AND observed_at < $3
          ORDER BY observed_at DESC
          LIMIT $4
        `,
        [
          query.cameraId,
          query.from,
          query.to,
          query.limit
        ]
      );

    return result.rows.map(mapRow);
  }

  async latest(
    cameraId: string
  ): Promise<PeopleFlowMeasurement | undefined> {
    const result =
      await this.pool.query<PeopleFlowRow>(
        `
          SELECT ${SELECT_COLUMNS}
          FROM people_flow_measurements
          WHERE camera_id = $1
          ORDER BY observed_at DESC
          LIMIT 1
        `,
        [cameraId]
      );

    const row = result.rows[0];

    return row === undefined
      ? undefined
      : mapRow(row);
  }
}

function mapRow(
  row: PeopleFlowRow
): PeopleFlowMeasurement {
  const entered = Number(row.entered_count);
  const exited = Number(row.exited_count);

  const sourceMeasurementId =
    row.source_measurement_id;

  return parsePeopleFlowMeasurement({
    id: row.id,
    type: row.measurement_type,
    contractVersion: row.contract_version,
    cameraId: row.camera_id,
    channelId: row.channel_id,
    observedAt: row.observed_at.toISOString(),
    receivedAt: row.received_at.toISOString(),
    mode: row.mode,
    period: {
      start: row.period_start.toISOString(),
      end: row.period_end.toISOString(),
      interval: row.period_interval
    },
    counts: {
      entered,
      exited
    },
    countBasis: row.count_basis,
    source: {
      vendor: row.source_vendor,
      protocol: row.source_protocol,
      nativeType: row.source_native_type,
      ...(sourceMeasurementId === null
        ? {}
        : {
            sourceMeasurementId
          })
    }
  });
}