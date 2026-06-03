type TagoService = "arrival" | "location" | "route" | "station";

type TagoCallOptions = {
  params?: Record<string, number | string | undefined>;
  path: string;
  service: TagoService;
};

type TagoHeader = {
  resultCode?: string;
  resultMsg?: string;
};

type TagoResponse = {
  response?: {
    body?: {
      items?: {
        item?: unknown;
      } | "";
      numOfRows?: number | string;
      pageNo?: number | string;
      totalCount?: number | string;
    };
    header?: TagoHeader;
  };
};

export type TagoCity = {
  citycode: number;
  cityname: string;
};

export type TagoRoute = {
  endnodenm?: string;
  endvehicletime?: number | string;
  routeid: string;
  routeno: number | string;
  routetp?: string;
  startnodenm?: string;
  startvehicletime?: number | string;
};

export type TagoStop = {
  dist?: number | string;
  distance?: number | string;
  gpslati?: number;
  gpslong?: number;
  nodeid: string;
  nodenm: string;
  nodeno?: number | string;
};

export type TagoRouteStop = TagoStop & {
  nodeord: number;
  routeid: string;
};

export type TagoStopRoute = {
  endnodenm?: string;
  routeid: string;
  routeno: number | string;
  routetp?: string;
  startnodenm?: string;
};

export type TagoArrival = {
  arrprevstationcnt?: number;
  arrtime?: number;
  nodeid: string;
  nodenm?: string;
  routeid: string;
  routeno: number | string;
  routetp?: string;
  vehicletp?: string;
};

export type TagoCallResult<T> = {
  header: TagoHeader;
  items: T[];
  totalCount: number;
};

export type TagoErrorDetails = {
  contentType?: string;
  resultCode?: string;
  resultMsg?: string;
  status?: number;
};

export class TagoError extends Error {
  public readonly details?: TagoErrorDetails;

  constructor(message: string, details?: TagoErrorDetails) {
    super(sanitizeTagoMessage(message));
    this.name = "TagoError";
    this.details = details
      ? {
          ...details,
          resultMsg: details.resultMsg
            ? sanitizeTagoMessage(details.resultMsg)
            : undefined,
        }
      : undefined;
  }
}

const serviceBaseUrls: Record<TagoService, string> = {
  arrival: "https://apis.data.go.kr/1613000/ArvlInfoInqireService",
  location: "https://apis.data.go.kr/1613000/BusLcInfoInqireService",
  route: "https://apis.data.go.kr/1613000/BusRouteInfoInqireService",
  station: "https://apis.data.go.kr/1613000/BusSttnInfoInqireService",
};

function getServiceKey() {
  const serviceKey = process.env.TAGO_SERVICE_KEY?.trim();

  if (!serviceKey) {
    throw new TagoError("TAGO_SERVICE_KEY is not configured");
  }

  return serviceKey;
}

export function isTagoServiceKeyConfigured() {
  return Boolean(process.env.TAGO_SERVICE_KEY?.trim());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getServiceKeyRedactionVariants() {
  const serviceKey = process.env.TAGO_SERVICE_KEY?.trim();
  if (!serviceKey) return [];

  const variants = new Set([serviceKey, encodeURIComponent(serviceKey)]);

  try {
    variants.add(decodeURIComponent(serviceKey));
  } catch {
    // Keep the raw and encoded forms when the env value is not URI encoded.
  }

  return [...variants].filter((variant) => variant.length > 0);
}

export function sanitizeTagoMessage(message: string) {
  let redacted = message.replace(
    /serviceKey=([^&\s]+)/gi,
    "serviceKey=[REDACTED_SERVICE_KEY]",
  );

  for (const variant of getServiceKeyRedactionVariants()) {
    redacted = redacted.replace(
      new RegExp(escapeRegExp(variant), "g"),
      "[REDACTED_SERVICE_KEY]",
    );
  }

  return redacted;
}

export function getSafeTagoErrorMessage(
  error: unknown,
  fallback = "Unknown TAGO error",
) {
  return sanitizeTagoMessage(error instanceof Error ? error.message : fallback);
}

function toArray<T>(item: unknown): T[] {
  if (item === undefined || item === null || item === "") return [];

  const values = Array.isArray(item) ? item : [item];
  return values.filter(
    (value) => value !== undefined && value !== null && value !== "",
  ) as T[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeHeader(value: unknown): TagoHeader {
  const header = asRecord(value);

  return {
    resultCode: readString(header?.resultCode),
    resultMsg: readString(header?.resultMsg),
  };
}

function normalizeItems<T>(value: unknown) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return toArray<T>(value);

  const items = asRecord(value);
  if (!items) return toArray<T>(value);

  return "item" in items ? toArray<T>(items.item) : toArray<T>(items);
}

function decodeXmlText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function coerceXmlValue(value: string) {
  const decoded = decodeXmlText(value);
  if (/^-?\d+(?:\.\d+)?$/.test(decoded)) return Number(decoded);
  return decoded;
}

function extractXmlTagText(xml: string, tag: string) {
  const match = new RegExp(
    `<${escapeRegExp(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRegExp(tag)}>`,
    "i",
  ).exec(xml);

  return match ? decodeXmlText(match[1]) : undefined;
}

function extractXmlTagBlocks(xml: string, tag: string) {
  return [
    ...xml.matchAll(
      new RegExp(
        `<${escapeRegExp(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRegExp(
          tag,
        )}>`,
        "gi",
      ),
    ),
  ].map((match) => match[1]);
}

function parseXmlItem(block: string) {
  const item: Record<string, string | number> = {};

  for (const match of block.matchAll(
    /<([A-Za-z][\w:.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g,
  )) {
    const tag = match[1].includes(":") ? match[1].split(":").pop() : match[1];
    const value = match[2];

    if (!tag || value.includes("<")) continue;
    item[tag] = coerceXmlValue(value);
  }

  return item;
}

function parseTagoXml(xml: string): TagoResponse | Record<string, unknown> {
  const returnReasonCode = extractXmlTagText(xml, "returnReasonCode");
  const returnAuthMsg = extractXmlTagText(xml, "returnAuthMsg");
  const errMsg = extractXmlTagText(xml, "errMsg");

  if (returnReasonCode || returnAuthMsg || errMsg) {
    return {
      OpenAPI_ServiceResponse: {
        cmmMsgHeader: {
          errMsg,
          returnAuthMsg,
          returnReasonCode,
        },
      },
    };
  }

  const items = extractXmlTagBlocks(xml, "item").map(parseXmlItem);

  return {
    response: {
      body: {
        items: items.length > 0 ? { item: items } : "",
        numOfRows: coerceXmlValue(extractXmlTagText(xml, "numOfRows") ?? ""),
        pageNo: coerceXmlValue(extractXmlTagText(xml, "pageNo") ?? ""),
        totalCount: coerceXmlValue(extractXmlTagText(xml, "totalCount") ?? ""),
      },
      header: {
        resultCode: extractXmlTagText(xml, "resultCode"),
        resultMsg: extractXmlTagText(xml, "resultMsg"),
      },
    },
  };
}

function parseTagoPayload(text: string, contentType: string) {
  const trimmed = text.trim();
  const normalizedContentType = contentType.toLowerCase();

  if (!trimmed) return {};

  if (normalizedContentType.includes("json") || /^[{[]/.test(trimmed)) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch (error) {
      if (!trimmed.startsWith("<")) {
        throw new TagoError("TAGO returned invalid JSON", {
          contentType,
          resultMsg: getSafeTagoErrorMessage(error, "JSON parse failed"),
        });
      }
    }
  }

  if (trimmed.startsWith("<")) {
    return parseTagoXml(trimmed);
  }

  throw new TagoError("TAGO returned an unsupported response format", {
    contentType,
  });
}

function getPublicDataPortalError(payload: unknown) {
  const root = asRecord(payload);
  const serviceResponse =
    asRecord(root?.OpenAPI_ServiceResponse) ??
    asRecord(root?.openAPI_ServiceResponse) ??
    asRecord(root?.Openapi_ServiceResponse) ??
    root;
  const messageHeader = asRecord(serviceResponse?.cmmMsgHeader);

  if (!messageHeader) return undefined;

  const errMsg = readString(messageHeader.errMsg);
  const returnAuthMsg = readString(messageHeader.returnAuthMsg);
  const returnReasonCode = readString(messageHeader.returnReasonCode);

  if (!errMsg && !returnAuthMsg && !returnReasonCode) return undefined;

  return {
    resultCode: returnReasonCode,
    resultMsg: [errMsg, returnAuthMsg].filter(Boolean).join(": "),
  };
}

function normalizeTagoResponse<T>(payload: unknown): TagoCallResult<T> {
  const publicDataError = getPublicDataPortalError(payload);

  if (publicDataError) {
    throw new TagoError("Public data portal returned an error", {
      resultCode: publicDataError.resultCode,
      resultMsg: publicDataError.resultMsg,
    });
  }

  const root = asRecord(payload);
  const response = asRecord(root?.response);

  if (!response) {
    throw new TagoError("TAGO response was missing the response wrapper");
  }

  const header = normalizeHeader(response?.header);

  if (header.resultCode && header.resultCode !== "00") {
    throw new TagoError("TAGO returned an error", {
      resultCode: header.resultCode,
      resultMsg: header.resultMsg,
    });
  }

  const body = asRecord(response?.body);
  const items = normalizeItems<T>(body?.items);

  return {
    header,
    items,
    totalCount: readNumber(body?.totalCount) ?? items.length,
  };
}

export async function callTago<T>({
  params = {},
  path,
  service,
}: TagoCallOptions): Promise<TagoCallResult<T>> {
  const serviceKey = getServiceKey();
  const url = new URL(`${serviceBaseUrls[service]}${path}`);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("_type", "json");
  url.searchParams.set("pageNo", String(params.pageNo ?? 1));
  url.searchParams.set("numOfRows", String(params.numOfRows ?? 100));

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && key !== "pageNo" && key !== "numOfRows") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, { cache: "no-store" });
  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();
  let payload: unknown;

  try {
    payload = parseTagoPayload(responseText, contentType);
  } catch (error) {
    if (response.ok) throw error;

    throw new TagoError("TAGO request failed", {
      contentType,
      resultMsg: getSafeTagoErrorMessage(error, "Unable to parse response"),
      status: response.status,
    });
  }

  const result = normalizeTagoResponse<T>(payload);

  if (!response.ok) {
    throw new TagoError("TAGO request failed", {
      contentType,
      resultMsg: result.header.resultMsg,
      status: response.status,
    });
  }

  return result;
}
