const SAFE_ID =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export interface PeopleFlowHistoryQuery {
  readonly cameraId: string;
  readonly from: string;
  readonly to: string;
  readonly limit: number;
}

export class InvalidPeopleFlowQueryError
  extends Error {
  constructor(readonly issue: string) {
    super(`People-flow query is invalid: ${issue}`);
    this.name = "InvalidPeopleFlowQueryError";
  }
}

export function parseCameraId(
  input: unknown
): string {
  if (
    typeof input !== "string"
    || !SAFE_ID.test(input)
  ) {
    throw new InvalidPeopleFlowQueryError(
      "cameraId is required and invalid"
    );
  }

  return input;
}

export function parsePeopleFlowHistoryQuery(
  input: unknown
): PeopleFlowHistoryQuery {
  if (
    typeof input !== "object"
    || input === null
    || Array.isArray(input)
  ) {
    throw new InvalidPeopleFlowQueryError(
      "query must be an object"
    );
  }

  const record =
    input as Record<string, unknown>;

  const cameraId = parseCameraId(
    record["cameraId"]
  );
  const from = parseTimestamp(
    record["from"],
    "from"
  );
  const to = parseTimestamp(
    record["to"],
    "to"
  );

  const rawLimit = record["limit"];
  const limit =
    rawLimit === undefined
      ? 168
      : typeof rawLimit === "string"
        && /^\d+$/.test(rawLimit)
        ? Number(rawLimit)
        : Number.NaN;

  if (
    !Number.isSafeInteger(limit)
    || limit < 1
    || limit > 1_000
  ) {
    throw new InvalidPeopleFlowQueryError(
      "limit must be between 1 and 1000"
    );
  }

  if (
    Date.parse(from) >= Date.parse(to)
  ) {
    throw new InvalidPeopleFlowQueryError(
      "from must be earlier than to"
    );
  }

  return {
    cameraId,
    from,
    to,
    limit
  };
}

function parseTimestamp(
  input: unknown,
  field: string
): string {
  if (
    typeof input !== "string"
    || input.length > 40
    || !input.endsWith("Z")
    || Number.isNaN(Date.parse(input))
  ) {
    throw new InvalidPeopleFlowQueryError(
      `${field} must be a UTC timestamp`
    );
  }

  return new Date(input).toISOString();
}