export type TmapWalkingSearchOption = "0" | "4" | "10" | "30";

export type TmapWalkingRouteRequest = {
  angle?: number;
  endLat: number;
  endLng: number;
  endName?: string;
  endPoiId?: string;
  passList?: string;
  searchOption?: TmapWalkingSearchOption;
  speed?: number;
  startLat: number;
  startLng: number;
  startName?: string;
};

export type TmapWalkingRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
};

export type TmapWalkingErrorDetails = {
  contentType?: string;
  resultCode?: string;
  resultMsg?: string;
  status?: number;
};

type TmapFeature = {
  properties?: Record<string, unknown>;
};

type TmapFeatureCollection = {
  error?: unknown;
  features?: TmapFeature[];
  resultCode?: unknown;
  resultMsg?: unknown;
};

type TmapFetcher = typeof fetch;

export class TmapWalkingRouteError extends Error {
  public readonly details?: TmapWalkingErrorDetails;

  constructor(message: string, details?: TmapWalkingErrorDetails) {
    super(sanitizeTmapMessage(message));
    this.name = "TmapWalkingRouteError";
    this.details = details
      ? {
          ...details,
          resultMsg: details.resultMsg
            ? sanitizeTmapMessage(details.resultMsg)
            : undefined,
        }
      : undefined;
  }
}

const defaultBaseUrl = "https://apis.openapi.sk.com/tmap/routes/pedestrian";
const defaultTimeoutMs = 3_000;

function getTmapWalkingMode() {
  const mode = process.env.TMAP_WALKING_MODE?.trim().toLowerCase();

  if (mode === "live" || mode === "estimate") return mode;

  return process.env.TMAP_APP_KEY?.trim() ? "live" : "estimate";
}

function getAppKey() {
  const appKey = process.env.TMAP_APP_KEY?.trim();

  if (!appKey) {
    throw new TmapWalkingRouteError("TMAP_APP_KEY is not configured");
  }

  return appKey;
}

function getBaseUrl() {
  return process.env.TMAP_WALKING_BASE_URL?.trim() || defaultBaseUrl;
}

function getTimeoutMs() {
  const raw = process.env.TMAP_WALKING_TIMEOUT_MS?.trim();
  if (!raw) return defaultTimeoutMs;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.round(parsed)
    : defaultTimeoutMs;
}

export function isTmapWalkingConfigured() {
  return getTmapWalkingMode() === "live" && Boolean(process.env.TMAP_APP_KEY?.trim());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAppKeyRedactionVariants() {
  const appKey = process.env.TMAP_APP_KEY?.trim();
  if (!appKey) return [];

  const variants = new Set([appKey, encodeURIComponent(appKey)]);

  try {
    variants.add(decodeURIComponent(appKey));
  } catch {
    // Keep the raw and encoded forms when the env value is not URI encoded.
  }

  return [...variants].filter((variant) => variant.length > 0);
}

export function sanitizeTmapMessage(message: string) {
  let redacted = message
    .replace(/appKey=([^&\s]+)/gi, "appKey=[REDACTED_TMAP_APP_KEY]")
    .replace(/TMAP_APP_KEY=([^&\s]+)/gi, "TMAP_APP_KEY=[REDACTED_TMAP_APP_KEY]");

  for (const variant of getAppKeyRedactionVariants()) {
    redacted = redacted.replace(
      new RegExp(escapeRegExp(variant), "g"),
      "[REDACTED_TMAP_APP_KEY]",
    );
  }

  return redacted;
}

export function getSafeTmapErrorMessage(
  error: unknown,
  fallback = "Unknown TMAP walking route error",
) {
  return sanitizeTmapMessage(error instanceof Error ? error.message : fallback);
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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getProviderError(payload: unknown) {
  const root = asRecord(payload);
  if (!root) return undefined;

  const directCode = readString(root.resultCode);
  const directMessage = readString(root.resultMsg) ?? readString(root.message);
  if (directCode || directMessage) {
    return {
      resultCode: directCode,
      resultMsg: directMessage,
    };
  }

  const error = asRecord(root.error);
  if (!error) return undefined;

  return {
    resultCode:
      readString(error.code) ??
      readString(error.errorCode) ??
      readString(error.resultCode),
    resultMsg:
      readString(error.message) ??
      readString(error.errorMessage) ??
      readString(error.resultMsg),
  };
}

function normalizeWalkingRoute(payload: unknown): TmapWalkingRouteResult {
  const providerError = getProviderError(payload);

  if (providerError) {
    throw new TmapWalkingRouteError("TMAP walking route returned an error", {
      resultCode: providerError.resultCode,
      resultMsg: providerError.resultMsg,
    });
  }

  const root = asRecord(payload) as TmapFeatureCollection | undefined;
  const features = Array.isArray(root?.features) ? root.features : [];
  const summaryFeature = features.find((feature) => {
    const properties = feature.properties;
    return (
      readNumber(properties?.totalDistance) !== undefined ||
      readNumber(properties?.totalTime) !== undefined
    );
  });
  const totalDistance = readNumber(summaryFeature?.properties?.totalDistance);
  const totalTime = readNumber(summaryFeature?.properties?.totalTime);

  if (totalDistance === undefined || totalTime === undefined) {
    throw new TmapWalkingRouteError(
      "TMAP walking route response was missing summary distance or time",
    );
  }

  return {
    distanceMeters: Math.max(0, Math.round(totalDistance)),
    durationSeconds: Math.max(0, Math.round(totalTime)),
  };
}

function encodePlaceName(value: string | undefined, fallback: string) {
  return encodeURIComponent(value?.trim() || fallback);
}

function unwrapJsonpPayload(text: string) {
  const match = /^function\(([\s\S]*)\)\s*;?$/.exec(text.trim());

  return match ? match[1] : text;
}

export async function getTmapWalkingRoute(
  request: TmapWalkingRouteRequest,
  fetcher: TmapFetcher = fetch,
): Promise<TmapWalkingRouteResult> {
  const appKey = getAppKey();
  const url = new URL(getBaseUrl());
  url.searchParams.set("version", "1");
  url.searchParams.set("callback", "function");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  let response: Response;

  try {
    const body: Record<string, number | string> = {
      angle: request.angle ?? 20,
      endName: encodePlaceName(request.endName, "destination"),
      endX: request.endLng,
      endY: request.endLat,
      reqCoordType: "WGS84GEO",
      resCoordType: "WGS84GEO",
      searchOption: request.searchOption ?? "0",
      sort: "index",
      speed: request.speed ?? 30,
      startName: encodePlaceName(request.startName, "origin"),
      startX: request.startLng,
      startY: request.startLat,
    };

    if (request.endPoiId) body.endPoiId = request.endPoiId;
    if (request.passList) body.passList = request.passList;

    response = await fetcher(url, {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        appKey,
      },
      method: "POST",
      signal: controller.signal,
    });
  } catch (error) {
    throw new TmapWalkingRouteError("TMAP walking route transport failed", {
      resultMsg: getSafeTmapErrorMessage(error, "Transport failed"),
    });
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();
  const payloadText = unwrapJsonpPayload(responseText);
  let payload: unknown;

  if (contentType.toLowerCase().includes("json") || /^[{[]/.test(payloadText.trim())) {
    try {
      payload = payloadText.trim() ? JSON.parse(payloadText) : {};
    } catch (error) {
      throw new TmapWalkingRouteError("TMAP walking route returned invalid JSON", {
        contentType,
        resultMsg: getSafeTmapErrorMessage(error, "JSON parse failed"),
        status: response.status,
      });
    }
  } else {
    throw new TmapWalkingRouteError("TMAP walking route returned text response", {
      contentType,
      resultMsg: sanitizeTmapMessage(responseText.trim()),
      status: response.status,
    });
  }

  let result: TmapWalkingRouteResult;

  try {
    result = normalizeWalkingRoute(payload);
  } catch (error) {
    if (error instanceof TmapWalkingRouteError && error.details) throw error;

    throw new TmapWalkingRouteError("TMAP walking route response was invalid", {
      contentType,
      resultMsg: getSafeTmapErrorMessage(error, "Invalid route response"),
      status: response.status,
    });
  }

  if (!response.ok) {
    throw new TmapWalkingRouteError("TMAP walking route request failed", {
      contentType,
      status: response.status,
    });
  }

  return result;
}
