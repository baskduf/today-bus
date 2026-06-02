import { todayBusDemoItinerary } from "@/lib/transit/demo-route";

export type PlanStatus = "safe" | "caution" | "danger" | "late" | "too_early";

export type TimelineStepKind = "home" | "stop" | "bus" | "walk" | "arrival";

export type TimelineStep = {
  detail: string;
  kind: TimelineStepKind;
  label: string;
  time: string;
};

export type BusPlan = {
  arrivalTime: string;
  boardingTime: string;
  busNumber: string;
  busRideMinutes: number;
  busStopArrivalTime: string;
  busStopName: string;
  departureTime: string;
  detailHrefId: string;
  dropOffTime: string;
  id: string;
  label: string;
  missedDelayMinutes?: number;
  primary: boolean;
  status: PlanStatus;
  statusLine: string;
  statusNote: string;
  summaryLine: string;
  timeline: TimelineStep[];
  waitMinutes: number;
};

export type TripInput = {
  arrival: string;
  buffer: string;
  destination: string;
  origin: string;
  originAddress?: string;
  originLat?: string;
  originLng?: string;
  originPlaceName?: string;
  originSource?: "kakao_keyword" | "manual";
};

export type TripSearchParams = {
  [key: string]: string | string[] | undefined;
};

export type PlanStatusExample = {
  detail: string;
  message: string;
  status: PlanStatus;
};

export const tripDefaults = {
  arrival: "오늘 14:00",
  buffer: "10",
  destination: "구미역",
  favoriteDestinations: ["구미역", "터미널", "금오공대"],
  origin: "진평동",
  safetyBuffers: ["5", "10", "15"],
} as const;

export const planStatusMeta: Record<
  PlanStatus,
  {
    badge: string;
    tone: "coral" | "mint" | "yellow";
  }
> = {
  caution: {
    badge: "주의",
    tone: "yellow",
  },
  danger: {
    badge: "위험",
    tone: "coral",
  },
  late: {
    badge: "늦음",
    tone: "coral",
  },
  safe: {
    badge: "안전",
    tone: "mint",
  },
  too_early: {
    badge: "너무 이른",
    tone: "yellow",
  },
};

export const busPlans: BusPlan[] = [
  {
    arrivalTime: "13:53",
    boardingTime: "13:18",
    busNumber: "180번",
    busRideMinutes: 28,
    busStopArrivalTime: "13:13",
    busStopName: todayBusDemoItinerary.boardingStop.name,
    departureTime: "13:03",
    detailHrefId: "recommended",
    dropOffTime: "13:46",
    id: "plan-a",
    label: "추천 플랜 A",
    missedDelayMinutes: 22,
    primary: true,
    status: "caution",
    statusLine: "이 버스는 타는 게 안전해요",
    statusNote: "놓치면 22분 늦어요",
    summaryLine: "대기 5분 · 여유 7분",
    timeline: [
      {
        detail: `${todayBusDemoItinerary.boardingStop.name} 정류장까지 도보 ${todayBusDemoItinerary.boardingStop.walkMinutesFromOrigin}분`,
        kind: "home",
        label: "집에서 출발",
        time: "13:03",
      },
      {
        detail: `정류장번호 ${todayBusDemoItinerary.boardingStop.stopNo} · 5분 대기`,
        kind: "stop",
        label: `${todayBusDemoItinerary.boardingStop.name} 도착`,
        time: "13:13",
      },
      {
        detail: `약 28분 이동 · ${todayBusDemoItinerary.alightingStop.name} 하차`,
        kind: "bus",
        label: `180번 ${todayBusDemoItinerary.route.directionLabel} 탑승`,
        time: "13:18",
      },
      {
        detail: `${todayBusDemoItinerary.destinationPlace.label}까지 도보 ${todayBusDemoItinerary.destinationPlace.walkMinutesFromAlightingStop}분`,
        kind: "walk",
        label: `${todayBusDemoItinerary.alightingStop.name} 하차`,
        time: "13:46",
      },
      {
        detail: "도착 희망 시간보다 7분 여유",
        kind: "arrival",
        label: "구미역 도착",
        time: "13:53",
      },
    ],
    waitMinutes: 5,
  },
  {
    arrivalTime: "13:23",
    boardingTime: "12:48",
    busNumber: "180번",
    busRideMinutes: 28,
    busStopArrivalTime: "12:43",
    busStopName: todayBusDemoItinerary.boardingStop.name,
    departureTime: "12:33",
    detailHrefId: "early",
    dropOffTime: "13:16",
    id: "plan-b",
    label: "플랜 B",
    primary: false,
    status: "too_early",
    statusLine: "너무 일찍 도착: 37분 여유",
    statusNote: "도착 후 37분 정도 기다려야 해요",
    summaryLine: "12:48 탑승 · 13:23 도착",
    timeline: [],
    waitMinutes: 5,
  },
  {
    arrivalTime: "14:22",
    boardingTime: "13:47",
    busNumber: "180번",
    busRideMinutes: 28,
    busStopArrivalTime: "13:42",
    busStopName: todayBusDemoItinerary.boardingStop.name,
    departureTime: "13:32",
    detailHrefId: "late",
    dropOffTime: "14:15",
    id: "plan-c",
    label: "플랜 C",
    primary: false,
    status: "late",
    statusLine: "도착 희망보다 22분 늦음",
    statusNote: "도착 희망보다 22분 늦어요",
    summaryLine: "13:47 탑승 · 14:22 도착",
    timeline: [],
    waitMinutes: 5,
  },
];

export const recommendedPlan = busPlans[0];
export const recoveryPlan = busPlans[2];

export const statusDecisionExamples: PlanStatusExample[] = [
  {
    detail: "도착 희망 시간보다 충분히 먼저 도착해요.",
    message: "여유 있는 플랜이에요",
    status: "safe",
  },
  {
    detail: "놓치면 22분 늦어요",
    message: "이 버스는 타는 게 안전해요",
    status: "caution",
  },
  {
    detail: "정류장까지 가는 시간이 부족해요",
    message: "지금 출발해도 빠듯해요",
    status: "danger",
  },
  {
    detail: "도착 희망 시간 이후에 목적지에 도착합니다.",
    message: "도착 희망보다 22분 늦어요",
    status: "late",
  },
  {
    detail: "도착 후 37분 정도 기다려야 해요",
    message: "너무 일찍 도착하는 플랜이에요",
    status: "too_early",
  },
];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseOriginSource(value: string | undefined) {
  return value === "kakao_keyword" || value === "manual" ? value : undefined;
}

export function resolveTripInput(params: TripSearchParams = {}): TripInput {
  const originSource = parseOriginSource(firstValue(params.originSource));

  return {
    arrival: firstValue(params.arrival) ?? tripDefaults.arrival,
    buffer: firstValue(params.buffer) ?? tripDefaults.buffer,
    destination: firstValue(params.destination) ?? tripDefaults.destination,
    origin: firstValue(params.origin) ?? tripDefaults.origin,
    originAddress: firstValue(params.originAddress),
    originLat: firstValue(params.originLat),
    originLng: firstValue(params.originLng),
    originPlaceName: firstValue(params.originPlaceName),
    originSource,
  };
}

export function resolveMissedPlanId(params: TripSearchParams = {}) {
  return firstValue(params.missed);
}

export function createTripQuery(
  input: TripInput,
  extra: Record<string, string> = {},
) {
  const params = new URLSearchParams({
    arrival: input.arrival,
    buffer: input.buffer,
    destination: input.destination,
    origin: input.origin,
    ...extra,
  });

  if (input.originAddress) params.set("originAddress", input.originAddress);
  if (input.originLat) params.set("originLat", input.originLat);
  if (input.originLng) params.set("originLng", input.originLng);
  if (input.originPlaceName) {
    params.set("originPlaceName", input.originPlaceName);
  }
  if (input.originSource) params.set("originSource", input.originSource);

  return params.toString();
}

export function createTripHref(
  pathname: string,
  input: TripInput,
  extra?: Record<string, string>,
) {
  return `${pathname}?${createTripQuery(input, extra)}`;
}
