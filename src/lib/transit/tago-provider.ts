import {
  callTago,
  type TagoArrival,
  type TagoCity,
  type TagoRoute,
  type TagoRouteStop,
  type TagoStop,
} from "@/lib/tago/client";

export const tagoDemoIdentifiers = {
  cityCode: "37050",
  cityName: "구미시",
  destinationNodeId: "GMB79",
  destinationNodeName: "구미역(중앙시장)",
  originNodeId: "GMB780",
  originNodeName: "진평중학교입구건너",
  routeId: "GMB18020",
  routeNo: "180",
} as const;

export type TagoDemoSnapshot = {
  arrivals: TagoArrival[];
  checkedAt: string;
  city?: TagoCity;
  destinationStop?: TagoRouteStop;
  originStop?: TagoRouteStop;
  route?: TagoRoute;
  routeStops: TagoRouteStop[];
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

export async function searchTagoStops(cityCode: string, nodeName: string) {
  return callTago<TagoStop>({
    path: "/getSttnNoList",
    params: { cityCode, nodeNm: nodeName },
    service: "station",
  });
}
