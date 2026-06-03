import type {
  TagoArrival,
  TagoRouteStop,
  TagoStop,
  TagoStopRoute,
} from "@/lib/tago/client";
import type { TodayBusItinerary } from "@/lib/transit/demo-route";
import { tagoDemoIdentifiers } from "@/lib/transit/demo-route";
import {
  gumiStationDestinationStops,
  type GumiStationDestinationStop,
} from "@/lib/transit/gumi-station-destinations";
import {
  tagoNearbyStopsProvider,
  type NearbyStopsProvider,
} from "@/lib/transit/nearby-stops-provider";

export type DirectRouteOriginPlace = {
  address?: string;
  label: string;
  lat: number;
  lng: number;
  source: "kakao_keyword" | "manual";
};

export type DirectRouteCandidate = {
  arrivals: TagoArrival[];
  busRideMinutes: number;
  checkedAt: string;
  destinationStop: GumiStationDestinationStop;
  itinerary: TodayBusItinerary;
  originOffsetMinutes: number;
  routeStartToDestinationMinutes: number;
  routeStops: TagoRouteStop[];
  scoreMinutes: number;
};

export type DirectRoutePlanningResult = {
  candidateCount: number;
  candidates: DirectRouteCandidate[];
  checkedAt: string;
  nearbyStopCount: number;
  routeCandidateCount: number;
};

export type DirectRoutePlanningInput = {
  cityCode?: string;
  maxNearbyStops?: number;
  originPlace: DirectRouteOriginPlace;
};

const defaultMaxNearbyStops = 5;
const routeLookupConcurrency = 4;
const fallbackWalkMinutes = 10;
const metersPerWalkingMinute = 67;
const demoRideMinutes = 28;
const demoRouteStopSpan =
  tagoDemoIdentifiers.destinationStopOrder - tagoDemoIdentifiers.originStopOrder;
const minutesPerStop =
  demoRouteStopSpan > 0 ? demoRideMinutes / demoRouteStopSpan : 1.2;

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getStopOrder(stop: TagoRouteStop | undefined) {
  const order = readNumber(stop?.nodeord);
  return order === undefined ? undefined : Math.round(order);
}

function getStopDistanceMeters(stop: TagoStop, origin: DirectRouteOriginPlace) {
  const providerDistance = readNumber(stop.dist) ?? readNumber(stop.distance);
  if (providerDistance !== undefined) return Math.max(0, providerDistance);

  if (stop.gpslati === undefined || stop.gpslong === undefined) {
    return undefined;
  }

  return haversineMeters(origin.lat, origin.lng, stop.gpslati, stop.gpslong);
}

function haversineMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getWalkMinutes(distanceMeters: number | undefined) {
  if (distanceMeters === undefined) return fallbackWalkMinutes;
  return Math.max(1, Math.ceil(distanceMeters / metersPerWalkingMinute));
}

function normalizeStopNo(value: TagoRouteStop | TagoStop) {
  return value.nodeno === undefined ? "" : String(value.nodeno);
}

function normalizeRouteNo(route: TagoStopRoute) {
  return String(route.routeno);
}

function dedupeRoutes(routes: TagoStopRoute[]) {
  const seenRouteIds = new Set<string>();

  return routes.filter((route) => {
    if (!route.routeid || seenRouteIds.has(route.routeid)) return false;

    seenRouteIds.add(route.routeid);
    return true;
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker(),
    ),
  );

  return results;
}

function getTimetableRouteId(routeId: string) {
  const normalized = routeId.replace(/^GMB/i, "");
  return normalized.length > 0 ? normalized : routeId;
}

function sortStopsByDistance(
  stops: TagoStop[],
  originPlace: DirectRouteOriginPlace,
) {
  return [...stops].sort((left, right) => {
    const leftDistance =
      getStopDistanceMeters(left, originPlace) ?? Number.POSITIVE_INFINITY;
    const rightDistance =
      getStopDistanceMeters(right, originPlace) ?? Number.POSITIVE_INFINITY;

    return leftDistance - rightDistance;
  });
}

function createCandidate({
  arrivals,
  checkedAt,
  destinationStop,
  originPlace,
  originRouteStop,
  originStop,
  route,
  routeStops,
}: {
  arrivals: TagoArrival[];
  checkedAt: string;
  destinationStop: GumiStationDestinationStop;
  originPlace: DirectRouteOriginPlace;
  originRouteStop: TagoRouteStop;
  originStop: TagoStop;
  route: TagoStopRoute;
  routeStops: TagoRouteStop[];
}) {
  const destinationRouteStop = routeStops.find(
    (stop) => stop.nodeid === destinationStop.nodeId,
  );
  const originOrder = getStopOrder(originRouteStop);
  const destinationOrder = getStopOrder(destinationRouteStop);

  if (
    !destinationRouteStop ||
    originOrder === undefined ||
    destinationOrder === undefined ||
    originOrder >= destinationOrder
  ) {
    return undefined;
  }

  const distanceMeters = getStopDistanceMeters(originStop, originPlace);
  const walkMinutesFromOrigin = getWalkMinutes(distanceMeters);
  const routeStopSpan = destinationOrder - originOrder;
  const busRideMinutes = Math.max(4, Math.round(routeStopSpan * minutesPerStop));
  const originOffsetMinutes = Math.max(
    0,
    Math.round((originOrder - 1) * minutesPerStop),
  );
  const routeStartToDestinationMinutes = originOffsetMinutes + busRideMinutes;
  const routeNo = normalizeRouteNo(route);
  const itinerary: TodayBusItinerary = {
    alightingStop: {
      name: destinationRouteStop.nodenm || destinationStop.name,
      nodeId: destinationStop.nodeId,
      stopNo: normalizeStopNo(destinationRouteStop) || destinationStop.stopNo,
      stopOrder: destinationOrder,
    },
    boardingStop: {
      distanceMeters:
        distanceMeters === undefined ? undefined : Math.round(distanceMeters),
      name: originRouteStop.nodenm || originStop.nodenm,
      nodeId: originStop.nodeid,
      stopNo: normalizeStopNo(originRouteStop) || normalizeStopNo(originStop),
      stopOrder: originOrder,
      walkMinutesFromOrigin,
    },
    destinationPlace: {
      label: destinationStop.label,
      walkMinutesFromAlightingStop: destinationStop.walkMinutesToStation,
    },
    originPlace,
    planning: {
      candidateCount: 0,
      mode: "dynamic_direct",
      selectionReason: "출발 좌표 주변 정류장에서 구미역 방향 직행 노선을 찾았습니다.",
    },
    route: {
      directionLabel: `${destinationStop.label} 방향`,
      oppositeTagoRouteId: "",
      routeNo,
      tagoRouteId: route.routeid,
      timetableRouteId: getTimetableRouteId(route.routeid),
    },
  };

  return {
    arrivals,
    busRideMinutes,
    checkedAt,
    destinationStop,
    itinerary,
    originOffsetMinutes,
    routeStartToDestinationMinutes,
    routeStops,
    scoreMinutes:
      walkMinutesFromOrigin +
      busRideMinutes +
      destinationStop.walkMinutesToStation,
  } satisfies DirectRouteCandidate;
}

export async function getDirectRouteCandidates(
  input: DirectRoutePlanningInput,
  provider: NearbyStopsProvider = tagoNearbyStopsProvider,
): Promise<DirectRoutePlanningResult> {
  const cityCode = input.cityCode ?? tagoDemoIdentifiers.cityCode;
  const checkedAt = new Date().toISOString();
  const nearbyStops = sortStopsByDistance(
    await provider.searchNearbyStops(
      cityCode,
      input.originPlace.lat,
      input.originPlace.lng,
    ),
    input.originPlace,
  ).slice(0, input.maxNearbyStops ?? defaultMaxNearbyStops);
  const routeStopsByRouteId = new Map<string, Promise<TagoRouteStop[]>>();
  const routesByStop = await Promise.all(
    nearbyStops.map(async (stop) => {
      try {
        return {
          routes: dedupeRoutes(await provider.getStopRoutes(cityCode, stop.nodeid)),
          stop,
        };
      } catch {
        return {
          routes: [],
          stop,
        };
      }
    }),
  );
  const routeCandidateCount = routesByStop.reduce(
    (count, entry) => count + entry.routes.length,
    0,
  );
  function getRouteStopsOnce(routeId: string) {
    let routeStopsPromise = routeStopsByRouteId.get(routeId);

    if (!routeStopsPromise) {
      routeStopsPromise = provider.getRouteStops(cityCode, routeId);
      routeStopsByRouteId.set(routeId, routeStopsPromise);
    }

    return routeStopsPromise;
  }

  const routeTasks = routesByStop.flatMap(({ routes, stop }) =>
    routes.map((route) => ({
      route,
      stop,
    })),
  );
  const candidates = (
    await mapWithConcurrency(
      routeTasks,
      routeLookupConcurrency,
      async ({ route, stop }) => {
        if (!route.routeid) return undefined;

        let routeStops: TagoRouteStop[];

        try {
          routeStops = await getRouteStopsOnce(route.routeid);
        } catch {
          return undefined;
        }

        const originRouteStop = routeStops.find(
          (routeStop) => routeStop.nodeid === stop.nodeid,
        );
        if (!originRouteStop) return undefined;

        const destinationStop = gumiStationDestinationStops.find((candidate) =>
          routeStops.some((routeStop) => routeStop.nodeid === candidate.nodeId),
        );
        if (!destinationStop) return undefined;

        const destinationRouteStop = routeStops.find(
          (routeStop) => routeStop.nodeid === destinationStop.nodeId,
        );
        const originOrder = getStopOrder(originRouteStop);
        const destinationOrder = getStopOrder(destinationRouteStop);

        if (
          !destinationRouteStop ||
          originOrder === undefined ||
          destinationOrder === undefined ||
          originOrder >= destinationOrder
        ) {
          return undefined;
        }

        let arrivals: TagoArrival[] = [];

        try {
          arrivals = await provider.getRouteArrivals(
            cityCode,
            stop.nodeid,
            route.routeid,
          );
        } catch {
          arrivals = [];
        }

        return createCandidate({
          arrivals,
          checkedAt,
          destinationStop,
          originPlace: input.originPlace,
          originRouteStop,
          originStop: stop,
          route,
          routeStops,
        });
      },
    )
  )
    .filter((candidate): candidate is DirectRouteCandidate => Boolean(candidate))
    .sort((left, right) => left.scoreMinutes - right.scoreMinutes)
    .map((candidate, index, sortedCandidates) => ({
      ...candidate,
      itinerary: {
        ...candidate.itinerary,
        planning: {
          candidateCount: sortedCandidates.length,
          mode: "dynamic_direct" as const,
          selectionReason:
            index === 0
              ? "출발 좌표에서 가장 가까운 구미역 직행 후보입니다."
              : "구미역 방향 직행 대안 후보입니다.",
        },
      },
    }));

  return {
    candidateCount: candidates.length,
    candidates,
    checkedAt,
    nearbyStopCount: nearbyStops.length,
    routeCandidateCount,
  };
}
