import type {
  PeriodicPeopleFlowObservation
} from "../../observations/periodic-people-flow-observation.js";

const MAXIMUM_MATCHES = 48;

export class InvalidHikvisionCountingReportError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "InvalidHikvisionCountingReportError";
  }
}

export function parseHikvisionCountingReport(
  xml: string,
  channelId: string
): PeriodicPeopleFlowObservation[] {
  if (
    !new RegExp(
      `<${tag("CountingStatisticsResult")}(?:\\s|>)`,
      "i"
    ).test(xml)
  ) {
    throw new InvalidHikvisionCountingReportError(
      "Expected a CountingStatisticsResult document."
    );
  }

  const status =
    textOf(xml, "responseStatusStrg")
      ?.toUpperCase();

  if (
    status === "NO MATCH" ||
    status === "NO MATCHES"
  ) {
    return [];
  }

  if (
    status !== undefined &&
    status !== "OK"
  ) {
    throw new InvalidHikvisionCountingReportError(
    "The camera returned a non-success counting status."
    );
  }

  const matches = blocks(xml, "matchElement");

  if (matches.length > MAXIMUM_MATCHES) {
    throw new InvalidHikvisionCountingReportError(
      "The counting report contains too many periods."
    );
  }

  const declared =
    optionalInteger(xml, "numOfMatches")
    ?? matches.length;

  if (declared !== matches.length) {
    throw new InvalidHikvisionCountingReportError(
      "The declared match count does not match the report."
    );
  }

  return matches.map((match) => {
    const start = parseTimestamp(
      requiredText(match, "startTime")
    );

    const end = parseTimestamp(
      requiredText(match, "endTime")
    );

    if (
      new Date(end).valueOf() -
        new Date(start).valueOf()
      !== 60 * 60 * 1000
    ) {
      throw new InvalidHikvisionCountingReportError(
        "A counting period is not exactly one hour."
      );
    }

    return {
      channelId,
      period: {
        start,
        end,
        interval: "hour"
      },
      counts: {
        entered:
          requiredInteger(match, "enterCount"),
        exited:
          requiredInteger(match, "exitCount")
      },
      source: {
        vendor: "hikvision",
        protocol: "isapi",
        nativeType: "CountingStatisticsResult",
        sourceMeasurementId:
          `${channelId}:${start}:${end}`
      }
    };
  });
}

function tag(name: string): string {
  return `(?:[A-Za-z_][\\w.-]*:)?${name}`;
}

function blocks(
  xml: string,
  name: string
): string[] {
  const expression = new RegExp(
    `<${tag(name)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag(name)}>`,
    "gi"
  );

  return [...xml.matchAll(expression)]
    .map((match) => match[1] ?? "");
}

function textOf(
  xml: string,
  name: string
): string | undefined {
  const value = blocks(xml, name)[0]?.trim();
  return value || undefined;
}

function requiredText(
  xml: string,
  name: string
): string {
  const value = textOf(xml, name);

  if (value === undefined) {
    throw new InvalidHikvisionCountingReportError(
      `The counting report is missing <${name}>.`
    );
  }

  return value;
}

function optionalInteger(
  xml: string,
  name: string
): number | undefined {
  const value = textOf(xml, name);

  if (value === undefined) {
    return undefined;
  }

  if (!/^\d+$/.test(value)) {
    throw new InvalidHikvisionCountingReportError(
      `The counting report has an invalid <${name}>.`
    );
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number)) {
    throw new InvalidHikvisionCountingReportError(
      `The counting report has an unsafe <${name}>.`
    );
  }

  return number;
}

function requiredInteger(
  xml: string,
  name: string
): number {
  const value = optionalInteger(xml, name);

  if (value === undefined) {
    throw new InvalidHikvisionCountingReportError(
      `The counting report is missing <${name}>.`
    );
  }

  return value;
}

function parseTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    throw new InvalidHikvisionCountingReportError(
      "The counting report contains an invalid timestamp."
    );
  }

  return date.toISOString();
}