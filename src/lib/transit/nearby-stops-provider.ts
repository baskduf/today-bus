import {
  callTago,
  type TagoCallResult,
  type TagoArrival,
  type TagoRouteStop,
  type TagoStop,
  type TagoStopRoute,
} from "@/lib/tago/client";

export type NearbyStopsProvider = {
  getRouteArrivals: (
    cityCode: string,
    nodeId: string,
    routeId: string,
  ) => Promise<TagoArrival[]>;
  getRouteStops: (
    cityCode: string,
    routeId: string,
  ) => Promise<TagoRouteStop[]>;
  getStopRoutes: (
    cityCode: string,
    nodeId: string,
  ) => Promise<TagoStopRoute[]>;
  searchNearbyStops: (
    cityCode: string,
    lat: number,
    lng: number,
  ) => Promise<TagoStop[]>;
};

type TagoCaller = <T>(options: {
  params?: Record<string, number | string | undefined>;
  path: string;
  service: "arrival" | "location" | "route" | "station";
}) => Promise<TagoCallResult<T>>;

export function createTagoNearbyStopsProvider(
  tagoCaller: TagoCaller = callTago,
): NearbyStopsProvider {
  return {
    async getRouteArrivals(cityCode, nodeId, routeId) {
      const arrivals = await tagoCaller<TagoArrival>({
        path: "/getSttnAcctoSpcifyRouteBusArvlPrearngeInfoList",
        params: {
          cityCode,
          nodeId,
          routeId,
        },
        service: "arrival",
      });

      return arrivals.items;
    },

    async getRouteStops(cityCode, routeId) {
      const routeStops = await tagoCaller<TagoRouteStop>({
        path: "/getRouteAcctoThrghSttnList",
        params: {
          cityCode,
          numOfRows: 300,
          routeId,
        },
        service: "route",
      });

      return routeStops.items;
    },

    async getStopRoutes(cityCode, nodeId) {
      const routes = await tagoCaller<TagoStopRoute>({
        path: "/getSttnThrghRouteList",
        params: {
          cityCode,
          nodeid: nodeId,
          numOfRows: 300,
        },
        service: "station",
      });

      return routes.items;
    },

    async searchNearbyStops(cityCode, lat, lng) {
      const stops = await tagoCaller<TagoStop>({
        path: "/getCrdntPrxmtSttnList",
        params: {
          cityCode,
          gpsLati: lat,
          gpsLong: lng,
          numOfRows: 20,
        },
        service: "station",
      });

      return stops.items;
    },
  };
}

export const tagoNearbyStopsProvider = createTagoNearbyStopsProvider();
