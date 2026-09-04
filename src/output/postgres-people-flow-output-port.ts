import type { Pool } from "pg";

import type {
  PeopleFlowMeasurement
} from "../contracts/people-flow-measurement.js";
import type {
  PeopleFlowOutputPort
} from "./people-flow-output-port.js";

export class PostgresPeopleFlowOutputPort
  implements PeopleFlowOutputPort {
  constructor(
    private readonly pool: Pool
  ) {}

  async publish(
    measurement: PeopleFlowMeasurement
  ): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO people_flow_measurements (
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
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT (id, observed_at)
        DO UPDATE SET
          received_at = EXCLUDED.received_at,
          entered_count = EXCLUDED.entered_count,
          exited_count = EXCLUDED.exited_count,
          source_measurement_id =
            EXCLUDED.source_measurement_id
      `,
      [
        measurement.id,
        measurement.type,
        measurement.contractVersion,
        measurement.cameraId,
        measurement.channelId,
        measurement.observedAt,
        measurement.receivedAt,
        measurement.mode,
        measurement.period.start,
        measurement.period.end,
        measurement.period.interval,
        measurement.counts.entered,
        measurement.counts.exited,
        measurement.countBasis,
        measurement.source.vendor,
        measurement.source.protocol,
        measurement.source.nativeType,
        measurement.source.sourceMeasurementId
          ?? null
      ]
    );
  }
}