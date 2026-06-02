import {
  callTago,
  getSafeTagoErrorMessage,
  isTagoServiceKeyConfigured,
  type TagoArrival,
  type TagoCity,
  type TagoRoute,
  type TagoRouteStop,
  type TagoStop,
} from "@/lib/tago/client";
import { tagoDemoIdentifiers } from "@/lib/transit/demo-route";

export { tagoDemoIdentifiers } from "@/lib/transit/demo-route";

export type TagoDemoSnapshot = {
  arrivals: TagoArrival[];
  checkedAt: string;
  city?: TagoCity;
  destinationStop?: TagoRouteStop;
  originStop?: TagoRouteStop;
  route?: TagoRoute;
  routeStops: TagoRouteStop[];
};

type TagoHealthCheck = {
  error?: string;
  message: string;
  ok: boolean;
};

export type TagoDemoHealth = {
  arrivalCount: number;
  arrivalLookup: TagoHealthCheck & {
    arrivalCount: number;
  };
  checkedAt: string;
  cityLookup: TagoHealthCheck & {
    city?: TagoCity;
    cityCount?: number;
  };
  fallbackRequired: boolean;
  identifiers: typeof tagoDemoIdentifiers;
  keyConfigured: boolean;
  ok: boolean;
  routeLookup: TagoHealthCheck & {
    route?: TagoRoute;
    routeCandidateCount?: number;
  };
  routeStopOrder: TagoHealthCheck & {
    destinationOrder?: number;
    destinationStop?: TagoRouteStop;
    originOrder?: number;
    originStop?: TagoRouteStop;
    routeStopCount?: number;
  };
};

export async function getTagoDemoSnapshot(): Promise<TagoDemoSnapshot> {
  const [cities, routes, routeStops, arrivals] = await Promise.all([
    callTago<TagoCity>({
      path: "/getCtyCodeList",
      params: { numOfRows: 300 },
      service: "station",
    }),
    callTago<TagoRoute>({
      path: "/getRouteNoList",
      params: {
        cityCode: tagoDemoIdentifiers.cityCode,
        routeNo: tagoDemoIdentifiers.routeNo,
      },
      service: "route",
    }),
    callTago<TagoRouteStop>({
      path: "/getRouteAcctoThrghSttnList",
      params: {
        cityCode: tagoDemoIdentifiers.cityCode,
        numOfRows: 300,
        routeId: tagoDemoIdentifiers.routeId,
      },
      service: "route",
    }),
    callTago<TagoArrival>({
      path: "/getSttnAcctoSpcifyRouteBusArvlPrearngeInfoList",
      params: {
        cityCode: tagoDemoIdentifiers.cityCode,
        nodeId: tagoDemoIdentifiers.originNodeId,
        routeId: tagoDemoIdentifiers.routeId,
      },
      service: "arrival",
    }),
  ]);

  return {
    arrivals: arrivals.items,
    checkedAt: new Date().toISOString(),
    city: cities.items.find(
      (city) => String(city.citycode) === tagoDemoIdentifiers.cityCode,
    ),
    destinationStop: routeStops.items.find(
      (stop) => stop.nodeid === tagoDemoIdentifiers.destinationNodeId,
    ),
    originStop: routeStops.items.find(
      (stop) => stop.nodeid === tagoDemoIdentifiers.originNodeId,
    ),
    route: routes.items.find(
      (route) => route.routeid === tagoDemoIdentifiers.routeId,
    ),
    routeStops: routeStops.items,
  };
}

function getStopOrder(stop: TagoRouteStop | undefined) {
  if (!stop) return undefined;

  const order = Number(stop.nodeord);
  return Number.isFinite(order) ? order : undefined;
}

function createSkippedCheck(message: string): TagoHealthCheck {
  return {
    message,
    ok: false,
  };
}

export async function getTagoDemoHealth(): Promise<TagoDemoHealth> {
  const checkedAt = new Date().toISOString();
  const keyConfigured = isTagoServiceKeyConfigured();
  const skippedMessage = "TAGO_SERVICE_KEY is not configured";

  let cityLookup: TagoDemoHealth["cityLookup"] =
    createSkippedCheck(skippedMessage);
  let routeLookup: TagoDemoHealth["routeLookup"] =
    createSkippedCheck(skippedMessage);
  let routeStopOrder: TagoDemoHealth["routeStopOrder"] =
    createSkippedCheck(skippedMessage);
  let arrivalLookup: TagoDemoHealth["arrivalLookup"] = {
    ...createSkippedCheck(skippedMessage),
    arrivalCount: 0,
  };

  if (keyConfigured) {
    try {
      const cities = await callTago<TagoCity>({
        path: "/getCtyCodeList",
        params: { numOfRows: 300 },
        service: "station",
      });
      const city = cities.items.find(
        (candidate) =>
          String(candidate.citycode) === tagoDemoIdentifiers.cityCode,
      );

      cityLookup = {
        city,
        cityCount: cities.items.length,
        message: city
          ? "Gumi city code lookup succeeded"
          : "Gumi city code was not found",
        ok: Boolean(city),
      };
    } catch (error) {
      cityLookup = {
        error: getSafeTagoErrorMessage(error),
        message: "Gumi city code lookup failed",
        ok: false,
      };
    }

    try {
      const routes = await callTago<TagoRoute>({
        path: "/getRouteNoList",
        params: {
          cityCode: tagoDemoIdentifiers.cityCode,
          routeNo: tagoDemoIdentifiers.routeNo,
        },
        service: "route",
      });
      const route = routes.items.find(
        (candidate) => candidate.routeid === tagoDemoIdentifiers.routeId,
      );

      routeLookup = {
        message: route
          ? "Demo route lookup succeeded"
          : "Demo route was not found",
        ok: Boolean(route),
        route,
        routeCandidateCount: routes.items.length,
      };
    } catch (error) {
      routeLookup = {
        error: getSafeTagoErrorMessage(error),
        message: "Demo route lookup failed",
        ok: false,
      };
    }

    try {
      const routeStops = await callTago<TagoRouteStop>({
        path: "/getRouteAcctoThrghSttnList",
        params: {
          cityCode: tagoDemoIdentifiers.cityCode,
          numOfRows: 300,
          routeId: tagoDemoIdentifiers.routeId,
        },
        service: "route",
      });
      const originStop = routeStops.items.find(
        (stop) => stop.nodeid === tagoDemoIdentifiers.originNodeId,
      );
      const destinationStop = routeStops.items.find(
        (stop) => stop.nodeid === tagoDemoIdentifiers.destinationNodeId,
      );
      const originOrder = getStopOrder(originStop);
      const destinationOrder = getStopOrder(destinationStop);
      const orderMatches =
        originOrder === tagoDemoIdentifiers.originStopOrder &&
        destinationOrder === tagoDemoIdentifiers.destinationStopOrder &&
        originOrder < destinationOrder;

      routeStopOrder = {
        destinationOrder,
        destinationStop,
        message: orderMatches
          ? "Demo route stop order matched"
          : "Demo route stop order did not match expected identifiers",
        ok: orderMatches,
        originOrder,
        originStop,
        routeStopCount: routeStops.items.length,
      };
    } catch (error) {
      routeStopOrder = {
        error: getSafeTagoErrorMessage(error),
        message: "Demo route stop order lookup failed",
        ok: false,
      };
    }

    try {
      const arrivals = await callTago<TagoArrival>({
        path: "/getSttnAcctoSpcifyRouteBusArvlPrearngeInfoList",
        params: {
          cityCode: tagoDemoIdentifiers.cityCode,
          nodeId: tagoDemoIdentifiers.originNodeId,
          routeId: tagoDemoIdentifiers.routeId,
        },
        service: "arrival",
      });

      arrivalLookup = {
        arrivalCount: arrivals.items.length,
        message:
          arrivals.items.length > 0
            ? "Arrival lookup returned live arrivals"
            : "Arrival lookup succeeded but returned no live arrivals",
        ok: true,
      };
    } catch (error) {
      arrivalLookup = {
        arrivalCount: 0,
        error: getSafeTagoErrorMessage(error),
        message: "Arrival lookup failed",
        ok: false,
      };
    }
  }

  const ok =
    keyConfigured &&
    cityLookup.ok &&
    routeLookup.ok &&
    routeStopOrder.ok &&
    arrivalLookup.ok;
  const fallbackRequired = !ok || arrivalLookup.arrivalCount === 0;

  return {
    arrivalCount: arrivalLookup.arrivalCount,
    arrivalLookup,
    checkedAt,
    cityLookup,
    fallbackRequired,
    identifiers: tagoDemoIdentifiers,
    keyConfigured,
    ok,
    routeLookup,
    routeStopOrder,
  };
}

export async function searchTagoStops(cityCode: string, nodeName: string) {
  return callTago<TagoStop>({
    path: "/getSttnNoList",
    params: { cityCode, nodeNm: nodeName },
    service: "station",
  });
}
