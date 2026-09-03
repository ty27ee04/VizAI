export const PEOPLE_FLOW_CONTRACT_VERSION = "1.0.0" as const;

/**
 * Canonical periodic people-flow data used after normalization.
 */
export interface PeopleFlowMeasurement {
  /**
   * Stable measurement identity.
   *
   * Its future generation must include cameraId so separate logical cameras
   * cannot overwrite one another.
   */
  readonly id: string;

  readonly type: "people.flow";
  readonly contractVersion:
    typeof PEOPLE_FLOW_CONTRACT_VERSION;

  /**
   * Independent logical camera identity.
   *
   * Examples:
   * - entrance-isapi-01
   * - entrance-hikcentral-01
   * - entrance-onvif-01
   */
  readonly cameraId: string;

  readonly channelId: string;

  /**
   * When the provider says this measurement occurred.
   *
   * For periodic reports, this will initially use the period end.
   */
  readonly observedAt: string;

  /**
   * When VizAI received and normalized the observation.
   */
  readonly receivedAt: string;

  readonly mode: "periodic";

  readonly period: {
    readonly start: string;
    readonly end: string;
    readonly interval: "hour";
  };

  readonly counts: {
    readonly entered: number;
    readonly exited: number;
  };

  readonly countBasis: "vendor-reported-period";

  /**
   * Diagnostic origin copied from the provider observation.
   *
   * It does not group cameras or control publication.
   */
  readonly source: {
    readonly vendor: string;
    readonly protocol: string;
    readonly nativeType: string;
    readonly sourceMeasurementId?: string;
  };
}