/**
 * Describes where a provider observation originated.
 *
 * This is diagnostic metadata only. It does not group camera registrations
 * and does not create authoritative or shadow relationships.
 */
export interface PeopleFlowObservationSource {
  /** Device or platform vendor, such as "hikvision". */
  readonly vendor: string;

  /** Integration protocol, such as "isapi" or "onvif". */
  readonly protocol: string;

  /** Original response or statistic type used by the provider. */
  readonly nativeType: string;

  /** Optional stable identifier supplied or derived by the provider. */
  readonly sourceMeasurementId?: string;
}

/**
 * One provider-neutral hourly entered/exited observation.
 *
 * The provider parser creates this object from its native response.
 * cameraId is deliberately added later by the normalizer.
 */
export interface PeriodicPeopleFlowObservation {
  readonly channelId: string;

  readonly period: {
    readonly start: string;
    readonly end: string;
    readonly interval: "hour";
  };

  readonly counts: {
    readonly entered: number;
    readonly exited: number;
  };

  readonly source: PeopleFlowObservationSource;
}