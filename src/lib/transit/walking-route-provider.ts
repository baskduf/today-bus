import {
  getOpenRouteServiceWalkingRoute,
  isOpenRouteServiceWalkingConfigured,
  type OpenRouteServiceWalkingRouteRequest,
  type OpenRouteServiceWalkingRouteResult,
} from "@/lib/openrouteservice/walking";
import {
  getTmapWalkingRoute,
  isTmapWalkingConfigured,
  type TmapWalkingRouteRequest,
  type TmapWalkingRouteResult,
} from "@/lib/tmap/walking";

export type WalkingRoutePoint = {
  label?: string;
  lat: number;
  lng: number;
};

export type WalkingRouteRequest = {
  from: WalkingRoutePoint;
  to: WalkingRoutePoint;
};

export type WalkingRouteResult = {
  checkedAt: string;
  distanceMeters: number;
  durationSeconds: number;
  source: "openrouteservice_foot_walking" | "tmap_pedestrian";
};

export type WalkingRouteProvider = {
  getWalkingRoute: (
    request: WalkingRouteRequest,
  ) => Promise<WalkingRouteResult | undefined>;
};

type TmapWalkingCaller = (
  request: TmapWalkingRouteRequest,
) => Promise<TmapWalkingRouteResult>;

type OpenRouteServiceWalkingCaller = (
  request: OpenRouteServiceWalkingRouteRequest,
) => Promise<OpenRouteServiceWalkingRouteResult>;

type WalkingRouteProviderName = "estimate" | "openrouteservice" | "tmap";

function getConfiguredProviderName(): WalkingRouteProviderName {
  const value = process.env.WALKING_ROUTE_PROVIDER?.trim().toLowerCase();

  if (
    value === "estimate" ||
    value === "openrouteservice" ||
    value === "tmap"
  ) {
    return value;
  }

  if (isOpenRouteServiceWalkingConfigured()) return "openrouteservice";
  if (isTmapWalkingConfigured()) return "tmap";

  return "estimate";
}

export function createOpenRouteServiceWalkingRouteProvider(
  walkingCaller: OpenRouteServiceWalkingCaller = getOpenRouteServiceWalkingRoute,
  isConfigured: () => boolean = isOpenRouteServiceWalkingConfigured,
): WalkingRouteProvider {
  return {
    async getWalkingRoute(request) {
      if (!isConfigured()) return undefined;

      const result = await walkingCaller({
        endLat: request.to.lat,
        endLng: request.to.lng,
        startLat: request.from.lat,
        startLng: request.from.lng,
      });

      return {
        checkedAt: new Date().toISOString(),
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
        source: "openrouteservice_foot_walking",
      };
    },
  };
}

export function createTmapWalkingRouteProvider(
  tmapWalkingCaller: TmapWalkingCaller = getTmapWalkingRoute,
  isConfigured: () => boolean = isTmapWalkingConfigured,
): WalkingRouteProvider {
  return {
    async getWalkingRoute(request) {
      if (!isConfigured()) return undefined;

      const result = await tmapWalkingCaller({
        endLat: request.to.lat,
        endLng: request.to.lng,
        endName: request.to.label,
        searchOption: "0",
        startLat: request.from.lat,
        startLng: request.from.lng,
        startName: request.from.label,
      });

      return {
        checkedAt: new Date().toISOString(),
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
        source: "tmap_pedestrian",
      };
    },
  };
}

export function createConfiguredWalkingRouteProvider(): WalkingRouteProvider {
  const providerName = getConfiguredProviderName();

  if (providerName === "openrouteservice") {
    return createOpenRouteServiceWalkingRouteProvider();
  }

  if (providerName === "tmap") {
    return createTmapWalkingRouteProvider();
  }

  return {
    async getWalkingRoute() {
      return undefined;
    },
  };
}

export const tmapWalkingRouteProvider = createTmapWalkingRouteProvider();
export const openRouteServiceWalkingRouteProvider =
  createOpenRouteServiceWalkingRouteProvider();
export const walkingRouteProvider = createConfiguredWalkingRouteProvider();
