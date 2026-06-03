export type TodayBusOriginPlaceSource =
  | "demo_default"
  | "kakao_keyword"
  | "manual";

export type TodayBusPlanningMode =
  | "demo_fixed"
  | "dynamic_direct"
  | "mock";

export type TodayBusWalkFallbackReason =
  | "missing_stop_coordinates"
  | "provider_error"
  | "provider_unavailable";

export type TodayBusWalkSource =
  | "distance_estimate"
  | "openrouteservice_foot_walking"
  | "tmap_pedestrian";

export type TodayBusItinerary = {
  alightingStop: {
    name: string;
    nodeId: string;
    stopNo: string;
    stopOrder: number;
  };
  boardingStop: {
    distanceMeters?: number;
    name: string;
    nodeId: string;
    stopNo: string;
    stopOrder: number;
    walkDurationSeconds?: number;
    walkFallbackReason?: TodayBusWalkFallbackReason;
    walkMinutesFromOrigin: number;
    walkSource?: TodayBusWalkSource;
    walkingDistanceMeters?: number;
  };
  destinationPlace: {
    label: string;
    walkMinutesFromAlightingStop: number;
  };
  originPlace: {
    address?: string;
    label: string;
    lat?: number;
    lng?: number;
    source: TodayBusOriginPlaceSource;
  };
  planning?: {
    candidateCount: number;
    mode: TodayBusPlanningMode;
    selectionReason: string;
  };
  route: {
    directionLabel: string;
    oppositeTagoRouteId: string;
    routeNo: string;
    tagoRouteId: string;
    timetableRouteId: string;
  };
};

export const tagoDemoIdentifiers = {
  cityCode: "37050",
  cityName: "구미시",
  destinationNodeId: "GMB79",
  destinationNodeName: "구미역(중앙시장)",
  destinationStopNo: "10079",
  destinationStopOrder: 29,
  oppositeRouteId: "GMB18010",
  originNodeId: "GMB780",
  originNodeName: "진평중학교입구건너",
  originStopNo: "10780",
  originStopOrder: 5,
  routeId: "GMB18020",
  timetableRouteId: "18020",
  routeNo: "180",
} as const;

export const todayBusDemoItinerary: TodayBusItinerary = {
  alightingStop: {
    name: tagoDemoIdentifiers.destinationNodeName,
    nodeId: tagoDemoIdentifiers.destinationNodeId,
    stopNo: tagoDemoIdentifiers.destinationStopNo,
    stopOrder: tagoDemoIdentifiers.destinationStopOrder,
  },
  boardingStop: {
    name: tagoDemoIdentifiers.originNodeName,
    nodeId: tagoDemoIdentifiers.originNodeId,
    stopNo: tagoDemoIdentifiers.originStopNo,
    stopOrder: tagoDemoIdentifiers.originStopOrder,
    walkMinutesFromOrigin: 10,
  },
  destinationPlace: {
    label: "구미역",
    walkMinutesFromAlightingStop: 7,
  },
  originPlace: {
    label: "진평동",
    source: "demo_default",
  },
  route: {
    directionLabel: "구미역 방향",
    oppositeTagoRouteId: tagoDemoIdentifiers.oppositeRouteId,
    routeNo: tagoDemoIdentifiers.routeNo,
    tagoRouteId: tagoDemoIdentifiers.routeId,
    timetableRouteId: tagoDemoIdentifiers.timetableRouteId,
  },
};
