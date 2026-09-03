import type {
  PeopleFlowMeasurement
} from "../contracts/people-flow-measurement.js";
import type {
  PeopleFlowOutputPort
} from "./people-flow-output-port.js";

export class InMemoryPeopleFlowOutputPort
  implements PeopleFlowOutputPort {
  private readonly measurementsById =
    new Map<string, PeopleFlowMeasurement>();

  async publish(
    measurement: PeopleFlowMeasurement
  ): Promise<void> {
    this.measurementsById.set(
      measurement.id,
      structuredClone(measurement)
    );
  }

  listByCameraId(
    cameraId: string
  ): PeopleFlowMeasurement[] {
    return [...this.measurementsById.values()]
      .filter((measurement) =>
        measurement.cameraId === cameraId
      )
      .map((measurement) =>
        structuredClone(measurement)
      );
  }
}