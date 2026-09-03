import type {
  HikvisionIsapiXmlClient
} from "./hikvision-isapi-http-client.js";

const DEVICE_INFO_PATH =
  "/ISAPI/System/deviceInfo";

const MAXIMUM_DEVICE_INFO_BYTES =
  64 * 1024;

export interface HikvisionIsapiDeviceInfo {
  readonly model: string;
  readonly firmwareVersion: string;
  readonly deviceType: string;
}

export interface HikvisionIsapiDeviceInfoSource {
  getDeviceInfo(): Promise<HikvisionIsapiDeviceInfo>;
}

export class InvalidHikvisionDeviceInfoError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidHikvisionDeviceInfoError";
  }
}

export class HikvisionIsapiDeviceInfoClient
  implements HikvisionIsapiDeviceInfoSource {
  constructor(
    private readonly httpClient:
      HikvisionIsapiXmlClient
  ) {}

  async getDeviceInfo():
    Promise<HikvisionIsapiDeviceInfo> {
    const xml = await this.httpClient.requestXml({
      method: "GET",
      path: DEVICE_INFO_PATH,
      maximumResponseBytes:
        MAXIMUM_DEVICE_INFO_BYTES
    });

    return parseHikvisionDeviceInfo(xml);
  }
}

export function parseHikvisionDeviceInfo(
  xml: string
): HikvisionIsapiDeviceInfo {
  if (
    !new RegExp(
      `<${qualifiedTag("DeviceInfo")}(?:\\s|>)`,
      "i"
    ).test(xml)
  ) {
    throw new InvalidHikvisionDeviceInfoError(
      "Expected a Hikvision DeviceInfo document."
    );
  }

  return {
    model: requiredText(xml, "model"),
    firmwareVersion:
      requiredText(xml, "firmwareVersion"),
    deviceType: requiredText(xml, "deviceType")
  };
}

function qualifiedTag(name: string): string {
  return `(?:[A-Za-z_][\\w.-]*:)?${name}`;
}

function requiredText(
  xml: string,
  name: string
): string {
  const tag = qualifiedTag(name);

  const value = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  ).exec(xml)?.[1]?.trim();

  if (!value) {
    throw new InvalidHikvisionDeviceInfoError(
      `The device information is missing <${name}>.`
    );
  }

  return value;
}