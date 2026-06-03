export type OpenRouteServiceWalkingRouteRequest = {
  endLat: number;
  endLng: number;
  startLat: number;
  startLng: number;
};

export type OpenRouteServiceWalkingRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
};

export type OpenRouteServiceWalkingErrorDetails = {
  contentType?: string;
  resultCode?: string;
  resultMsg?: string;
  status?: number;
};

type OpenRouteServiceFetcher = typeof fetch;

type OpenRouteServiceRouteSummary = {
  distance?: unknown;
  duration?: unknown;
};

type OpenRouteServiceRoute = {
  summary?: OpenRouteServiceRouteSummary;
};

type OpenRouteServiceFeature = {
  properties?: {
    summary?: OpenRouteServiceRouteSummary;
  };
};

export class OpenRouteServiceWalkingRouteError extends Error {
  public readonly details?: OpenRouteServiceWalkingErrorDetails;

  constructor(message: string, details?: OpenRouteServiceWalkingErrorDetails) {
    super(sanitizeOpenRouteServiceMessage(message));
    this.name = "OpenRouteServiceWalkingRouteError";
    this.details = details
      ? {
          ...details,
          resultMsg: details.resultMsg
            ? sanitizeOpenRouteServiceMessage(details.resultMsg)
            : undefined,
        }
      : undefined;
  }
}

const defaultBaseUrl =
  "https://api.openrouteservice.org/v2/directions/foot-walking";
const defaultTimeoutMs = 3_000;

function getMode() {
  const mode = process.env.ORS_WALKING_MODE?.trim().toLowerCase();

  if (mode === "live" || mode === "estimate") return mode;

  return getConfiguredApiKey() ? "live" : "estimate";
}

function getConfiguredApiKey() {
  return (
    process.env.ORS_API_KEY?.trim() ||
    process.env.OPENROUTESERVICE_API_KEY?.trim()
  );
}

function getApiKey() {
  const apiKey = getConfiguredApiKey();

  if (!apiKey) {
    throw new OpenRouteServiceWalkingRouteError(
      "ORS_API_KEY is not configured",
    );
  }

  return apiKey;
}

function getBaseUrl() {
  return process.env.ORS_WALKING_BASE_URL?.trim() || defaultBaseUrl;
}

function getTimeoutMs() {
  const raw = process.env.ORS_WALKING_TIMEOUT_MS?.trim();
  if (!raw) return defaultTimeoutMs;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.round(parsed)
    : defaultTimeoutMs;
}

export function isOpenRouteServiceWalkingConfigured() {
  return getMode() === "live" && Boolean(getConfiguredApiKey());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getApiKeyRedactionVariants() {
  const apiKey = getConfiguredApiKey();
  if (!apiKey) return [];

  const variants = new Set([apiKey, encodeURIComponent(apiKey)]);

  try {
    variants.add(decodeURIComponent(apiKey));
  } catch {
    // Keep the raw and encoded forms when the env value is not URI encoded.
  }

  return [...variants].filter((variant) => variant.length > 0);
}

export function sanitizeOpenRouteServiceMessage(message: string) {
  let redacted = message
    .replace(/api_key=([^&\s]+)/gi, "api_key=[REDACTED_ORS_API_KEY]")
    .replace(
      /ORS_API_KEY=([^&\s]+)/gi,
      "ORS_API_KEY=[REDACTED_ORS_API_KEY]",
    )
    .replace(
      /OPENROUTESERVICE_API_KEY=([^&\s]+)/gi,
      "OPENROUTESERVICE_API_KEY=[REDACTED_ORS_API_KEY]",
    );

  for (const variant of getApiKeyRedactionVariants()) {
    redacted = redacted.replace(
      new RegExp(escapeRegExp(variant), "g"),
      "[REDACTED_ORS_API_KEY]",
    );
  }

  return redacted;
}

export function getSafeOpenRouteServiceErrorMessage(
  error: unknown,
  fallback = "Unknown OpenRouteService walking route error",
) {
  return sanitizeOpenRouteServiceMessage(
    error instanceof Error ? error.message : fallback,
  );
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

  const error = asRecord(root.error);
  if (error) {
    return {
      resultCode: readString(error.code),
      resultMsg: readString(error.message),
    };
  }

  return {
    resultCode: readString(root.code),
    resultMsg: readString(root.message),
  };
}

function getSummary(payload: unknown) {
  const root = asRecord(payload);
  const routes = Array.isArray(root?.routes)
    ? (root.routes as OpenRouteServiceRoute[])
    : [];
  const routeSummary = routes[0]?.summary;

  if (routeSummary) return routeSummary;

  const features = Array.isArray(root?.features)
    ? (root.features as OpenRouteServiceFeature[])
    : [];

  return features[0]?.properties?.summary;
}

function normalizeWalkingRoute(
  payload: unknown,
): OpenRouteServiceWalkingRouteResult {
  const providerError = getProviderError(payload);

  if (providerError?.resultCode || providerError?.resultMsg) {
    throw new OpenRouteServiceWalkingRouteError(
      "OpenRouteService walking route returned an error",
      {
        resultCode: providerError.resultCode,
        resultMsg: providerError.resultMsg,
      },
    );
  }

  const summary = getSummary(payload);
  const distance = readNumber(summary?.distance);
  const duration = readNumber(summary?.duration);

  if (distance === undefined || duration === undefined) {
    throw new OpenRouteServiceWalkingRouteError(
      "OpenRouteService walking route response was missing summary distance or duration",
    );
  }

  return {
    distanceMeters: Math.max(0, Math.round(distance)),
    durationSeconds: Math.max(0, Math.round(duration)),
  };
}

export async function getOpenRouteServiceWalkingRoute(
  request: OpenRouteServiceWalkingRouteRequest,
  fetcher: OpenRouteServiceFetcher = fetch,
): Promise<OpenRouteServiceWalkingRouteResult> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
  let response: Response;

  try {
    response = await fetcher(getBaseUrl(), {
      body: JSON.stringify({
        coordinates: [
          [request.startLng, request.startLat],
          [request.endLng, request.endLat],
        ],
        instructions: false,
        preference: "recommended",
        units: "m",
      }),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
  } catch (error) {
    throw new OpenRouteServiceWalkingRouteError(
      "OpenRouteService walking route transport failed",
      {
        resultMsg: getSafeOpenRouteServiceErrorMessage(
          error,
          "Transport failed",
        ),
      },
    );
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();
  let payload: unknown;

  if (contentType.toLowerCase().includes("json") || /^[{[]/.test(responseText.trim())) {
    try {
      payload = responseText.trim() ? JSON.parse(responseText) : {};
    } catch (error) {
      throw new OpenRouteServiceWalkingRouteError(
        "OpenRouteService walking route returned invalid JSON",
        {
          contentType,
          resultMsg: getSafeOpenRouteServiceErrorMessage(
            error,
            "JSON parse failed",
          ),
          status: response.status,
        },
      );
    }
  } else {
    throw new OpenRouteServiceWalkingRouteError(
      "OpenRouteService walking route returned text response",
      {
        contentType,
        resultMsg: sanitizeOpenRouteServiceMessage(responseText.trim()),
        status: response.status,
      },
    );
  }

  let result: OpenRouteServiceWalkingRouteResult;

  try {
    result = normalizeWalkingRoute(payload);
  } catch (error) {
    if (
      error instanceof OpenRouteServiceWalkingRouteError &&
      error.details
    ) {
      throw error;
    }

    throw new OpenRouteServiceWalkingRouteError(
      "OpenRouteService walking route response was invalid",
      {
        contentType,
        resultMsg: getSafeOpenRouteServiceErrorMessage(
          error,
          "Invalid route response",
        ),
        status: response.status,
      },
    );
  }

  if (!response.ok) {
    throw new OpenRouteServiceWalkingRouteError(
      "OpenRouteService walking route request failed",
      {
        contentType,
        status: response.status,
      },
    );
  }

  return result;
}
