import { Ajv, type ErrorObject } from "ajv";

import type {
  PeopleFlowMeasurement
} from "./people-flow-measurement.js";
import {
  peopleFlowMeasurementSchema
} from "./people-flow-measurement-schema.js";

const ISO_DATE_TIME_PATTERN =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:0\d|1[0-3]):[0-5]\d|[+-]14:00)$/;

const ajv = new Ajv({
  allErrors: true,
  strict: true
});

ajv.addFormat("date-time", {
  type: "string",
  validate: isIsoDateTime
});

const validatePeopleFlowMeasurement =
  ajv.compile<PeopleFlowMeasurement>(
    peopleFlowMeasurementSchema
  );

/**
 * Raised when data does not satisfy the canonical people-flow contract.
 */
export class InvalidPeopleFlowMeasurementError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(
      `People-flow measurement is invalid: ${issues.join("; ")}`
    );
    this.name = "InvalidPeopleFlowMeasurementError";
  }
}

/**
 * Converts untrusted data into a trusted canonical measurement.
 */
export function parsePeopleFlowMeasurement(
  input: unknown
): PeopleFlowMeasurement {
  if (!validatePeopleFlowMeasurement(input)) {
    const issues = validatePeopleFlowMeasurement.errors
      ?.map(describeError)
      ?? ["Unknown validation error"];

    throw new InvalidPeopleFlowMeasurementError(issues);
  }

  return input;
}

function describeError(error: ErrorObject): string {
  const location = error.instancePath || "/";
  return `${location} ${error.message ?? "is invalid"}`;
}

/**
 * Checks ISO/RFC3339 shape and rejects impossible calendar dates.
 */
function isIsoDateTime(value: string): boolean {
  const match = ISO_DATE_TIME_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  calendarDate.setUTCHours(0, 0, 0, 0);

  return (
    calendarDate.getUTCFullYear() === year
    && calendarDate.getUTCMonth() === month - 1
    && calendarDate.getUTCDate() === day
  );
}