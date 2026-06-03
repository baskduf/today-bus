import {
  busPlans,
  recommendedPlan,
  recoveryPlan,
  resolveTripInput,
  tripDefaults,
  type BusPlan,
  type TripInput,
  type TripSearchParams,
} from "@/lib/today-bus/mock-plans";
import {
  getTagoDemoSnapshot,
  tagoDemoIdentifiers,
  todayBusDemoItinerary,
  type TagoDemoSnapshot,
} from "@/lib/transit/tago-provider";
import {
  getDirectRouteCandidates,
  type DirectRouteCandidate,
  type DirectRoutePlanningResult,
} from "@/lib/transit/direct-route-planner";
import type {
  TodayBusItinerary,
  TodayBusOriginPlaceSource,
} from "@/lib/transit/demo-route";
import { getSafeTagoErrorMessage, type TagoArrival } from "@/lib/tago/client";
import {
  getGumiBisScheduleTypeForDate,
  getGumiBisTimetable,
  type GumiBisScheduleType,
  type GumiBisTimetableEntry,
} from "@/lib/gumi-bis/client";

export type TodayBusPlanSource = "gumi_bis_timetable" | "mock" | "tago";

export type TodayBusFallbackReason =
  | "future_planning_not_supported"
  | "no_arrival"
  | "tago_error"
  | "timetable_error"
  | "unsupported_route";

export type TodayBusFallback = {
  message: string;
  reason: TodayBusFallbackReason;
};

export type TodayBusPlanResponse = {
  effectiveInput: TripInput;
  fallback?: TodayBusFallback;
  itinerary: TodayBusItinerary;
  plans: BusPlan[];
  recoveryPlan: BusPlan;
  recommendedPlan: BusPlan;
  requestedInput: TripInput;
  source: TodayBusPlanSource;
  direct?: {
    candidateCount: number;
    checkedAt: string;
    nearbyStopCount: number;
    routeCandidateCount: number;
    selectedOriginNodeId: string;
    selectedRouteId: string;
    selectedRouteNo: string;
  };
  tago?: {
    arrivalCount: number;
    checkedAt: string;
    cityCode: string;
    destinationNodeId: string;
    originNodeId: string;
    routeId: string;
    routeNo: string;
  };
  timetable?: {
    checkedAt: string;
    departureCount: number;
    originOffsetMinutes: number;
    provider: "gumi_bis";
    routeId: string;
    routeNo: string;
    scheduleType: GumiBisScheduleType;
  };
  train: {
    departureTime: string;
    destinationStation: "구미역";
    stationArrivalDeadline: string;
    stationBufferMinutes: number;
  };
  warnings: string[];
};

const stopWaitMinutes = 5;
const busRideMinutes = 28;
const kstOffsetHours = 9;
const seoulTimeZone = "Asia/Seoul";

type PlanRouteContext = {
  busRideMinutes: number;
  itinerary: TodayBusItinerary;
  originOffsetMinutes: number;
};

function parseCoordinate(value: string | undefined) {
  if (!value) return undefined;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : undefined;
}

function getOriginPlaceSource(
  value: TripInput["originSource"],
): TodayBusOriginPlaceSource {
  return value === "kakao_keyword" ? value : "manual";
}

function createItinerary(input: TripInput): TodayBusItinerary {
  const label =
    input.originPlaceName?.trim() ||
    input.origin.trim() ||
    todayBusDemoItinerary.originPlace.label;
  const lat = parseCoordinate(input.originLat);
  const lng = parseCoordinate(input.originLng);
  const hasSelectedOrigin = Boolean(
    input.originPlaceName || input.originAddress || lat || lng,
  );

  return {
    ...todayBusDemoItinerary,
    originPlace: {
      address: input.originAddress,
      label,
      lat,
      lng,
      source: hasSelectedOrigin
        ? getOriginPlaceSource(input.originSource)
        : todayBusDemoItinerary.originPlace.source,
    },
  };
}

function createDemoRouteContext(): PlanRouteContext {
  return {
    busRideMinutes,
    itinerary: createItinerary({
      ...tripDefaults,
      trainDeparture: tripDefaults.trainDeparture,
    }),
    originOffsetMinutes: getEstimatedOriginOffsetMinutes(),
  };
}

function createDirectRouteContext(
  candidate: DirectRouteCandidate,
): PlanRouteContext {
  return {
    busRideMinutes: candidate.busRideMinutes,
    itinerary: candidate.itinerary,
    originOffsetMinutes: candidate.originOffsetMinutes,
  };
}

function createDirectMeta(
  result: DirectRoutePlanningResult,
  candidate: DirectRouteCandidate,
): TodayBusPlanResponse["direct"] {
  return {
    candidateCount: result.candidateCount,
    checkedAt: result.checkedAt,
    nearbyStopCount: result.nearbyStopCount,
    routeCandidateCount: result.routeCandidateCount,
    selectedOriginNodeId: candidate.itinerary.boardingStop.nodeId,
    selectedRouteId: candidate.itinerary.route.tagoRouteId,
    selectedRouteNo: candidate.itinerary.route.routeNo,
  };
}

function createDirectTagoMeta(
  candidate: DirectRouteCandidate,
): TodayBusPlanResponse["tago"] {
  return {
    arrivalCount: candidate.arrivals.length,
    checkedAt: candidate.checkedAt,
    cityCode: tagoDemoIdentifiers.cityCode,
    destinationNodeId: candidate.itinerary.alightingStop.nodeId,
    originNodeId: candidate.itinerary.boardingStop.nodeId,
    routeId: candidate.itinerary.route.tagoRouteId,
    routeNo: candidate.itinerary.route.routeNo,
  };
}

function createDirectOriginPlace(input: TripInput) {
  const lat = parseCoordinate(input.originLat);
  const lng = parseCoordinate(input.originLng);

  if (lat === undefined || lng === undefined) return undefined;
  const source: "kakao_keyword" | "manual" =
    getOriginPlaceSource(input.originSource) === "kakao_keyword"
      ? "kakao_keyword"
      : "manual";

  return {
    address: input.originAddress,
    label:
      input.originPlaceName?.trim() ||
      input.origin.trim() ||
      todayBusDemoItinerary.originPlace.label,
    lat,
    lng,
    source,
  };
}

function hasCustomOriginPlace(input: TripInput) {
  const itinerary = createItinerary(input);

  return (
    itinerary.originPlace.label !== todayBusDemoItinerary.originPlace.label ||
    Boolean(itinerary.originPlace.address) ||
    itinerary.originPlace.lat !== undefined ||
    itinerary.originPlace.lng !== undefined
  );
}

function createCustomOriginWarning(input: TripInput) {
  const itinerary = createItinerary(input);
  const hasCoordinates =
    parseCoordinate(input.originLat) !== undefined &&
    parseCoordinate(input.originLng) !== undefined;

  if (hasCoordinates) {
    return `출발 위치는 ${itinerary.originPlace.label}입니다. 좌표 기준 구미역 직행 버스 후보를 찾지 못해 ${todayBusDemoItinerary.boardingStop.name} 정류장 기준으로 계산합니다.`;
  }

  return `출발 위치는 ${itinerary.originPlace.label}입니다. 지도에서 출발 좌표를 선택하지 않아 ${todayBusDemoItinerary.boardingStop.name} 정류장 기준으로 계산합니다.`;
}

function getKstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: seoulTimeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    day: Number(values.day),
    month: Number(values.month),
    year: Number(values.year),
  };
}

function createKstDate({
  day,
  hour,
  minute,
  month,
  year,
}: {
  day: number;
  hour: number;
  minute: number;
  month: number;
  year: number;
}) {
  return new Date(
    Date.UTC(year, month - 1, day, hour - kstOffsetHours, minute, 0, 0),
  );
}

function isValidDateParts({
  day,
  month,
  year,
}: {
  day: number;
  month: number;
  year: number;
}) {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseStationArrival(input: TripInput, now = new Date()) {
  const absoluteMatch = input.arrival.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/,
  );
  if (absoluteMatch) {
    const year = Number(absoluteMatch[1]);
    const month = Number(absoluteMatch[2]);
    const day = Number(absoluteMatch[3]);
    const hour = Number(absoluteMatch[4]);
    const minute = Number(absoluteMatch[5]);

    if (
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59 ||
      !isValidDateParts({ day, month, year })
    ) {
      return undefined;
    }

    return createKstDate({
      day,
      hour,
      minute,
      month,
      year,
    });
  }

  const relativeMatch = input.arrival.match(/^(오늘|내일)\s+(\d{1,2}):(\d{2})$/);
  if (!relativeMatch) return undefined;

  const dayOffset = relativeMatch[1] === "내일" ? 1 : 0;
  const hour = Number(relativeMatch[2]);
  const minute = Number(relativeMatch[3]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;

  const dateParts = getKstDateParts(now);

  return createKstDate({
    ...dateParts,
    day: dateParts.day + dayOffset,
    hour,
    minute,
  });
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: seoulTimeZone,
  }).format(date);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function parseClockTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;

  return { hour, minute };
}

function getArrivalSeconds(arrival: TagoArrival) {
  return typeof arrival.arrtime === "number" && arrival.arrtime > 0
    ? arrival.arrtime
    : undefined;
}

function getSlackMinutes(arrivalTime: Date, desiredArrivalTime: Date) {
  return Math.floor(
    (desiredArrivalTime.getTime() - arrivalTime.getTime()) / 60_000,
  );
}

function parseStationBufferMinutes(input: TripInput) {
  const buffer = Number(input.buffer);
  return Number.isFinite(buffer) && buffer > 0
    ? buffer
    : Number(tripDefaults.buffer);
}

function createTrainMeta(input: TripInput): TodayBusPlanResponse["train"] {
  return {
    departureTime: input.trainDeparture,
    destinationStation: "구미역",
    stationArrivalDeadline: input.arrival,
    stationBufferMinutes: parseStationBufferMinutes(input),
  };
}

function classifyPlan(slackMinutes: number, stationBufferMinutes: number) {
  if (slackMinutes < 0) return "late" as const;
  if (slackMinutes > 30) return "too_early" as const;
  if (slackMinutes >= stationBufferMinutes) return "safe" as const;
  return "caution" as const;
}

function formatSlackSummary(slackMinutes: number) {
  if (slackMinutes < 0) return `${Math.abs(slackMinutes)}분 늦음`;
  if (slackMinutes > 30) return `${slackMinutes}분 일찍 도착`;
  return `역 도착 기준 추가 여유 ${slackMinutes}분`;
}

function createLiveStatusLine(
  status: BusPlan["status"],
  slackMinutes: number,
  stationBufferMinutes: number,
) {
  if (status === "late") {
    return `기차 준비 기준보다 ${Math.abs(slackMinutes)}분 늦어요`;
  }

  if (status === "too_early") {
    return `구미역에 너무 일찍 도착: 추가 여유 ${slackMinutes}분`;
  }

  if (status === "safe") {
    return `역 도착 기준에 추가 여유 ${stationBufferMinutes}분 이상 확보`;
  }

  return `역 도착 기준까지 추가 여유가 ${stationBufferMinutes}분보다 적어요`;
}

function createArrivalDetail(
  input: TripInput,
  slackMinutes: number,
  stationBufferMinutes: number,
) {
  if (slackMinutes < 0) {
    return `${input.trainDeparture} 기차 준비 기준보다 ${Math.abs(
      slackMinutes,
    )}분 늦어요`;
  }

  return `${input.trainDeparture} 기차 · 출발 ${stationBufferMinutes}분 전 구미역 도착 기준 · 추가 여유 ${slackMinutes}분`;
}

export function getEstimatedOriginOffsetMinutes() {
  const originFromRouteStartStops = tagoDemoIdentifiers.originStopOrder - 1;
  const originToDestinationStops =
    tagoDemoIdentifiers.destinationStopOrder -
    tagoDemoIdentifiers.originStopOrder;

  if (originFromRouteStartStops <= 0 || originToDestinationStops <= 0) {
    return 0;
  }

  return Math.round(
    (busRideMinutes / originToDestinationStops) * originFromRouteStartStops,
  );
}

function createStatusNote(
  status: BusPlan["status"],
  slackMinutes: number,
  stationBufferMinutes: number,
) {
  if (status === "late") {
    return `기차 준비 기준보다 ${Math.abs(slackMinutes)}분 늦어요`;
  }

  if (status === "too_early") {
    return `구미역에서 ${slackMinutes}분 정도 기다려야 해요`;
  }

  if (status === "safe") {
    return `기차까지 추가 여유 ${slackMinutes}분이에요`;
  }

  return `역 도착 기준 추가 여유가 ${stationBufferMinutes - slackMinutes}분 부족해요`;
}

function createLivePlan(
  input: TripInput,
  snapshot: TagoDemoSnapshot,
  desiredArrivalTime: Date,
  now = new Date(),
  context: PlanRouteContext = createDemoRouteContext(),
): BusPlan | undefined {
  const itinerary = context.itinerary;
  const routeHomeWalkMinutes = itinerary.boardingStop.walkMinutesFromOrigin;
  const routeBusRideMinutes = context.busRideMinutes;
  const routeDestinationWalkMinutes =
    itinerary.destinationPlace.walkMinutesFromAlightingStop;
  const arrivalCandidates = snapshot.arrivals
    .map((arrival) => ({ arrival, seconds: getArrivalSeconds(arrival) }))
    .filter(
      (candidate): candidate is { arrival: TagoArrival; seconds: number } =>
        typeof candidate.seconds === "number",
    )
    .sort((left, right) => left.seconds - right.seconds);

  const firstArrival = arrivalCandidates[0];
  if (!firstArrival) return undefined;

  const boarding = new Date(now.getTime() + firstArrival.seconds * 1000);
  const busStopArrival = addMinutes(boarding, -stopWaitMinutes);
  const departure = addMinutes(
    boarding,
    -(routeHomeWalkMinutes + stopWaitMinutes),
  );
  const dropOff = addMinutes(boarding, routeBusRideMinutes);
  const destinationArrival = addMinutes(dropOff, routeDestinationWalkMinutes);
  const stationBufferMinutes = parseStationBufferMinutes(input);
  const slackMinutes = getSlackMinutes(destinationArrival, desiredArrivalTime);
  const status = classifyPlan(slackMinutes, stationBufferMinutes);
  const missedDelayMinutes = arrivalCandidates[1]
    ? Math.ceil((arrivalCandidates[1].seconds - firstArrival.seconds) / 60)
    : undefined;

  return {
    ...recommendedPlan,
    arrivalTime: formatTime(destinationArrival),
    boardingTime: formatTime(boarding),
    busNumber: `${itinerary.route.routeNo}번`,
    busRideMinutes: routeBusRideMinutes,
    busStopName: itinerary.boardingStop.name,
    busStopArrivalTime: formatTime(busStopArrival),
    departureTime: formatTime(departure),
    dropOffTime: formatTime(dropOff),
    missedDelayMinutes,
    status,
    statusLine: createLiveStatusLine(
      status,
      slackMinutes,
      stationBufferMinutes,
    ),
    statusNote: missedDelayMinutes
      ? `놓치면 ${missedDelayMinutes}분 늦어요`
      : "다음 버스 지연 시간은 아직 확인되지 않았어요",
    summaryLine: `대기 ${stopWaitMinutes}분 · ${formatSlackSummary(slackMinutes)}`,
    timeline: [
      {
        detail: `${itinerary.boardingStop.name} 정류장까지 도보 ${routeHomeWalkMinutes}분`,
        kind: "home",
        label: "집에서 출발",
        time: formatTime(departure),
      },
      {
        detail: `정류장번호 ${itinerary.boardingStop.stopNo} · ${stopWaitMinutes}분 대기`,
        kind: "stop",
        label: `${itinerary.boardingStop.name} 도착`,
        time: formatTime(busStopArrival),
      },
      {
        detail: `약 ${routeBusRideMinutes}분 이동 · ${itinerary.alightingStop.name} 하차`,
        kind: "bus",
        label: `${itinerary.route.routeNo}번 ${itinerary.route.directionLabel} 탑승`,
        time: formatTime(boarding),
      },
      {
        detail: `${itinerary.destinationPlace.label}까지 도보 ${routeDestinationWalkMinutes}분`,
        kind: "walk",
        label: `${itinerary.alightingStop.name} 하차`,
        time: formatTime(dropOff),
      },
      {
        detail: createArrivalDetail(
          input,
          slackMinutes,
          stationBufferMinutes,
        ),
        kind: "arrival",
        label: `${itinerary.destinationPlace.label} 도착`,
        time: formatTime(destinationArrival),
      },
    ],
  };
}

type TimetableCandidate = {
  arrivalTime: Date;
  boardingTime: Date;
  busStopArrivalTime: Date;
  departureTime: Date;
  dropOffTime: Date;
  entry: GumiBisTimetableEntry;
  routeStartTime: Date;
  slackMinutes: number;
  status: ReturnType<typeof classifyPlan>;
};

function createTimetableCandidates({
  context,
  desiredArrivalTime,
  entries,
  input,
}: {
  context: PlanRouteContext;
  desiredArrivalTime: Date;
  entries: GumiBisTimetableEntry[];
  input: TripInput;
}) {
  const stationBufferMinutes = parseStationBufferMinutes(input);
  const kstDateParts = getKstDateParts(desiredArrivalTime);
  const routeHomeWalkMinutes =
    context.itinerary.boardingStop.walkMinutesFromOrigin;
  const routeDestinationWalkMinutes =
    context.itinerary.destinationPlace.walkMinutesFromAlightingStop;

  return entries
    .reduce<TimetableCandidate[]>((candidates, entry) => {
      const clockTime = parseClockTime(entry.starttime);
      if (!clockTime) return candidates;

      const routeStartTime = createKstDate({
        ...kstDateParts,
        ...clockTime,
      });
      const boardingTime = addMinutes(routeStartTime, context.originOffsetMinutes);
      const busStopArrivalTime = addMinutes(boardingTime, -stopWaitMinutes);
      const departureTime = addMinutes(
        boardingTime,
        -(routeHomeWalkMinutes + stopWaitMinutes),
      );
      const dropOffTime = addMinutes(boardingTime, context.busRideMinutes);
      const arrivalTime = addMinutes(dropOffTime, routeDestinationWalkMinutes);
      const slackMinutes = getSlackMinutes(arrivalTime, desiredArrivalTime);

      candidates.push({
        arrivalTime,
        boardingTime,
        busStopArrivalTime,
        departureTime,
        dropOffTime,
        entry,
        routeStartTime,
        slackMinutes,
        status: classifyPlan(slackMinutes, stationBufferMinutes),
      });

      return candidates;
    }, [])
    .sort(
      (left, right) =>
        left.routeStartTime.getTime() - right.routeStartTime.getTime(),
    );
}

function chooseRecommendedTimetableIndex(candidates: TimetableCandidate[]) {
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    if (candidates[index].slackMinutes >= 0) return index;
  }

  return candidates.length > 0 ? 0 : -1;
}

function createTimetableBusPlan({
  candidate,
  context,
  input,
  isPrimary,
  label,
  missedDelayMinutes,
}: {
  candidate: TimetableCandidate;
  context: PlanRouteContext;
  input: TripInput;
  isPrimary: boolean;
  label: string;
  missedDelayMinutes?: number;
}): BusPlan {
  const itinerary = context.itinerary;
  const stationBufferMinutes = parseStationBufferMinutes(input);

  return {
    ...recommendedPlan,
    arrivalTime: formatTime(candidate.arrivalTime),
    boardingTime: formatTime(candidate.boardingTime),
    busNumber: `${itinerary.route.routeNo}번`,
    busRideMinutes: context.busRideMinutes,
    busStopName: itinerary.boardingStop.name,
    busStopArrivalTime: formatTime(candidate.busStopArrivalTime),
    departureTime: formatTime(candidate.departureTime),
    detailHrefId: isPrimary
      ? "recommended"
      : `timetable-${candidate.entry.bttSeqno}`,
    dropOffTime: formatTime(candidate.dropOffTime),
    id: isPrimary
      ? "plan-timetable-recommended"
      : `plan-timetable-${candidate.entry.bttSeqno}`,
    label,
    missedDelayMinutes,
    primary: isPrimary,
    status: candidate.status,
    statusLine: createLiveStatusLine(
      candidate.status,
      candidate.slackMinutes,
      stationBufferMinutes,
    ),
    statusNote:
      missedDelayMinutes && isPrimary
        ? `놓치면 ${missedDelayMinutes}분 늦어요`
        : createStatusNote(
            candidate.status,
            candidate.slackMinutes,
            stationBufferMinutes,
          ),
    summaryLine: isPrimary
      ? `대기 ${stopWaitMinutes}분 · ${formatSlackSummary(candidate.slackMinutes)}`
      : `${formatTime(candidate.boardingTime)} 탑승 · ${formatTime(
          candidate.arrivalTime,
        )} 도착`,
    timeline: [
      {
        detail: `${itinerary.boardingStop.name} 정류장까지 도보 ${itinerary.boardingStop.walkMinutesFromOrigin}분`,
        kind: "home",
        label: "집에서 출발",
        time: formatTime(candidate.departureTime),
      },
      {
        detail: `정류장번호 ${itinerary.boardingStop.stopNo} · ${stopWaitMinutes}분 대기`,
        kind: "stop",
        label: `${itinerary.boardingStop.name} 도착`,
        time: formatTime(candidate.busStopArrivalTime),
      },
      {
        detail: `기점 ${formatTime(
          candidate.routeStartTime,
        )} 출발표 기준 · 정류장 통과 추정`,
        kind: "bus",
        label: `${itinerary.route.routeNo}번 ${itinerary.route.directionLabel} 탑승`,
        time: formatTime(candidate.boardingTime),
      },
      {
        detail: `${itinerary.destinationPlace.label}까지 도보 ${itinerary.destinationPlace.walkMinutesFromAlightingStop}분`,
        kind: "walk",
        label: `${itinerary.alightingStop.name} 하차`,
        time: formatTime(candidate.dropOffTime),
      },
      {
        detail: createArrivalDetail(
          input,
          candidate.slackMinutes,
          stationBufferMinutes,
        ),
        kind: "arrival",
        label: `${itinerary.destinationPlace.label} 도착`,
        time: formatTime(candidate.arrivalTime),
      },
    ],
  };
}

function createTimetablePlans(
  input: TripInput,
  desiredArrivalTime: Date,
  entries: GumiBisTimetableEntry[],
  context: PlanRouteContext = createDemoRouteContext(),
) {
  const candidates = createTimetableCandidates({
    context,
    desiredArrivalTime,
    entries,
    input,
  });
  const recommendedIndex = chooseRecommendedTimetableIndex(candidates);

  if (recommendedIndex < 0) return undefined;

  const recommendedCandidate = candidates[recommendedIndex];
  const previousCandidate =
    recommendedIndex > 0 ? candidates[recommendedIndex - 1] : undefined;
  const nextCandidate = candidates[recommendedIndex + 1];
  const missedDelayMinutes = nextCandidate
    ? Math.ceil(
        (nextCandidate.arrivalTime.getTime() -
          recommendedCandidate.arrivalTime.getTime()) /
          60_000,
      )
    : undefined;
  const recommendedTimetablePlan = createTimetableBusPlan({
    candidate: recommendedCandidate,
    context,
    input,
    isPrimary: true,
    label: "추천 플랜 A",
    missedDelayMinutes,
  });
  const alternativePlans = [
    previousCandidate
      ? createTimetableBusPlan({
          candidate: previousCandidate,
          context,
          input,
          isPrimary: false,
          label: "더 이른 플랜",
        })
      : undefined,
    nextCandidate
      ? createTimetableBusPlan({
          candidate: nextCandidate,
          context,
          input,
          isPrimary: false,
          label: "다음 플랜",
        })
      : undefined,
  ].filter((plan): plan is BusPlan => plan !== undefined);

  return {
    originOffsetMinutes: context.originOffsetMinutes,
    plans: [recommendedTimetablePlan, ...alternativePlans],
    recoveryPlan: nextCandidate
      ? createTimetableBusPlan({
          candidate: nextCandidate,
          context,
          input,
          isPrimary: false,
          label: "다음 플랜",
        })
      : recommendedTimetablePlan,
    recommendedPlan: recommendedTimetablePlan,
  };
}

function createMockResponse(
  requestedInput: TripInput,
  warnings: string[],
  tago?: TodayBusPlanResponse["tago"],
  fallback?: TodayBusFallback,
): TodayBusPlanResponse {
  const effectiveInput = {
    arrival: requestedInput.arrival || tripDefaults.arrival,
    buffer: requestedInput.buffer,
    origin: requestedInput.origin || tripDefaults.origin,
    originAddress: requestedInput.originAddress,
    originLat: requestedInput.originLat,
    originLng: requestedInput.originLng,
    originPlaceName: requestedInput.originPlaceName,
    originSource: requestedInput.originSource,
    trainDeparture: requestedInput.trainDeparture || tripDefaults.trainDeparture,
  } satisfies TripInput;

  return {
    effectiveInput,
    fallback,
    itinerary: createItinerary(effectiveInput),
    plans: busPlans,
    recoveryPlan,
    recommendedPlan,
    requestedInput,
    source: "mock",
    tago,
    train: createTrainMeta(effectiveInput),
    warnings,
  };
}

async function createTimetableResponse({
  checkedAt,
  context = createDemoRouteContext(),
  desiredArrivalTime,
  direct,
  getTimetable,
  requestedInput,
  tago,
  timetableWarning,
  warnings,
}: {
  checkedAt: Date;
  context?: PlanRouteContext;
  desiredArrivalTime: Date;
  direct?: TodayBusPlanResponse["direct"];
  getTimetable: typeof getGumiBisTimetable;
  requestedInput: TripInput;
  tago?: TodayBusPlanResponse["tago"];
  timetableWarning: string;
  warnings: string[];
}): Promise<TodayBusPlanResponse | undefined> {
  const scheduleType = getGumiBisScheduleTypeForDate(desiredArrivalTime);
  const timetable = await getTimetable(
    context.itinerary.route.timetableRouteId,
    scheduleType,
  );
  const timetablePlans = createTimetablePlans(
    requestedInput,
    desiredArrivalTime,
    timetable.rows,
    context,
  );

  if (!timetablePlans) return undefined;

  warnings.push(timetableWarning);

  return {
    effectiveInput: requestedInput,
    direct,
    itinerary: context.itinerary,
    plans: timetablePlans.plans,
    recoveryPlan: timetablePlans.recoveryPlan,
    recommendedPlan: timetablePlans.recommendedPlan,
    requestedInput,
    source: "gumi_bis_timetable",
    tago,
    timetable: {
      checkedAt: checkedAt.toISOString(),
      departureCount: timetable.rows.length,
      originOffsetMinutes: timetablePlans.originOffsetMinutes,
      provider: "gumi_bis",
      routeId: context.itinerary.route.timetableRouteId,
      routeNo: context.itinerary.route.routeNo,
      scheduleType,
    },
    train: createTrainMeta(requestedInput),
    warnings,
  };
}

async function createDirectRouteResponse({
  desiredArrivalTime,
  getDirectCandidates,
  getTimetable,
  now,
  requestedInput,
  warnings,
}: {
  desiredArrivalTime: Date;
  getDirectCandidates: typeof getDirectRouteCandidates;
  getTimetable: typeof getGumiBisTimetable;
  now: Date;
  requestedInput: TripInput;
  warnings: string[];
}): Promise<TodayBusPlanResponse | undefined> {
  const originPlace = createDirectOriginPlace(requestedInput);
  if (!originPlace) return undefined;

  const directResult = await getDirectCandidates({
    originPlace,
  });
  const selectedCandidate = directResult.candidates[0];

  if (!selectedCandidate) {
    warnings.push(
      `출발지 주변 ${directResult.nearbyStopCount}개 정류장에서 구미역 방향 직행 버스를 찾지 못해 기존 데모 정류장 기준으로 확인합니다.`,
    );
    return undefined;
  }

  const context = createDirectRouteContext(selectedCandidate);
  const direct = createDirectMeta(directResult, selectedCandidate);
  const tago = createDirectTagoMeta(selectedCandidate);
  const snapshot = {
    arrivals: selectedCandidate.arrivals,
    checkedAt: selectedCandidate.checkedAt,
    routeStops: selectedCandidate.routeStops,
  } satisfies TagoDemoSnapshot;
  const livePlan = createLivePlan(
    requestedInput,
    snapshot,
    desiredArrivalTime,
    now,
    context,
  );

  if (livePlan && livePlan.status !== "too_early") {
    warnings.push(
      "출발 좌표 기준으로 주변 정류장과 구미역 방향 직행 버스를 계산했습니다.",
    );

    return {
      direct,
      effectiveInput: requestedInput,
      itinerary: context.itinerary,
      plans: [livePlan],
      recoveryPlan: livePlan,
      recommendedPlan: livePlan,
      requestedInput,
      source: "tago",
      tago,
      train: createTrainMeta(requestedInput),
      warnings,
    };
  }

  warnings.push(
    livePlan
      ? "출발 좌표 기준 TAGO 첫 도착은 기차 시간보다 너무 이른 플랜이라 공식 시간표를 확인합니다."
      : "출발 좌표 기준 직행 버스의 TAGO 실시간 도착정보가 없어 공식 시간표를 확인합니다.",
  );

  const timetableResponse = await createTimetableResponse({
    checkedAt: now,
    context,
    desiredArrivalTime,
    direct,
    getTimetable,
    requestedInput,
    tago,
    timetableWarning:
      "출발 좌표 기준 직행 후보를 구미 BIS 공식 시간표와 정류장 통과 추정으로 계산했습니다.",
    warnings,
  });

  return timetableResponse;
}

export type TodayBusPlanDependencies = {
  getDemoSnapshot?: typeof getTagoDemoSnapshot;
  getDirectRouteCandidates?: typeof getDirectRouteCandidates;
  getTimetable?: typeof getGumiBisTimetable;
  now?: () => Date;
};

const defaultPlanDependencies: TodayBusPlanDependencies = {
  getDemoSnapshot: getTagoDemoSnapshot,
  getDirectRouteCandidates: getDirectRouteCandidates,
  getTimetable: getGumiBisTimetable,
  now: () => new Date(),
};

export async function createTodayBusPlanResponseWithDependencies(
  requestedInput: TripInput,
  dependencies: TodayBusPlanDependencies,
): Promise<TodayBusPlanResponse> {
  const planDependencies = {
    getDemoSnapshot:
      dependencies.getDemoSnapshot ?? defaultPlanDependencies.getDemoSnapshot!,
    getDirectRouteCandidates:
      dependencies.getDirectRouteCandidates ??
      defaultPlanDependencies.getDirectRouteCandidates!,
    getTimetable:
      dependencies.getTimetable ?? defaultPlanDependencies.getTimetable!,
    now: dependencies.now ?? defaultPlanDependencies.now!,
  };
  const warnings: string[] = [];
  const now = planDependencies.now();
  const desiredArrivalTime = parseStationArrival(requestedInput, now);

  if (!desiredArrivalTime) {
    const fallback = {
      message:
        "현재는 'YYYY-MM-DD HH:mm' 또는 '오늘/내일 HH:mm' 형식의 기차 출발 시간만 해석합니다. mock 플랜을 보여줍니다.",
      reason: "future_planning_not_supported",
    } satisfies TodayBusFallback;

    warnings.push(fallback.message);
    return createMockResponse(requestedInput, warnings, undefined, fallback);
  }

  try {
    const directResponse = await createDirectRouteResponse({
      desiredArrivalTime,
      getDirectCandidates: planDependencies.getDirectRouteCandidates,
      getTimetable: planDependencies.getTimetable,
      now,
      requestedInput,
      warnings,
    });

    if (directResponse) return directResponse;
  } catch (error) {
    warnings.push(
      `출발 좌표 기반 직행 버스 계산 실패로 기존 데모 정류장 기준을 확인합니다: ${getSafeTagoErrorMessage(error)}`,
    );
  }

  if (hasCustomOriginPlace(requestedInput)) {
    warnings.push(createCustomOriginWarning(requestedInput));
  }

  let tago: TodayBusPlanResponse["tago"] | undefined;
  let mockFallbackReason: TodayBusFallbackReason = "timetable_error";
  let timetableWarning =
    "구미 BIS 공식 시간표와 정류장 통과 추정으로 계산했습니다.";

  try {
    const snapshot = await planDependencies.getDemoSnapshot();
    tago = {
      arrivalCount: snapshot.arrivals.length,
      checkedAt: snapshot.checkedAt,
      cityCode: tagoDemoIdentifiers.cityCode,
      destinationNodeId: tagoDemoIdentifiers.destinationNodeId,
      originNodeId: tagoDemoIdentifiers.originNodeId,
      routeId: tagoDemoIdentifiers.routeId,
      routeNo: tagoDemoIdentifiers.routeNo,
    };
    const livePlan = createLivePlan(
      requestedInput,
      snapshot,
      desiredArrivalTime,
      now,
    );

    if (!livePlan) {
      const fallback = {
        message:
          "TAGO 실시간 도착정보에 현재 180번 도착예정이 없어 구미 BIS 공식 시간표를 확인합니다.",
        reason: "no_arrival",
      } satisfies TodayBusFallback;

      warnings.push(fallback.message);
      mockFallbackReason = "no_arrival";
      timetableWarning =
        "TAGO 실시간 도착정보가 없어 구미 BIS 공식 시간표와 정류장 통과 추정으로 계산했습니다.";
    } else if (livePlan.status === "too_early") {
      warnings.push(
        "현재 TAGO 첫 도착은 기차 시간보다 너무 이른 플랜이라 구미 BIS 공식 시간표를 확인합니다.",
      );
      timetableWarning =
        "기차 출발 시간에 맞춰 구미 BIS 공식 시간표와 정류장 통과 추정으로 계산했습니다.";
    } else {
      const livePlans = [livePlan, ...busPlans.filter((plan) => !plan.primary)];
      return {
        effectiveInput: requestedInput,
        itinerary: createItinerary(requestedInput),
        plans: livePlans,
        recoveryPlan,
        recommendedPlan: livePlan,
        requestedInput,
        source: "tago",
        tago,
        train: createTrainMeta(requestedInput),
        warnings,
      };
    }
  } catch (error) {
    mockFallbackReason = "tago_error";
    warnings.push(
      `TAGO 호출 실패로 공식 시간표를 먼저 시도합니다: ${getSafeTagoErrorMessage(error)}`,
    );
    timetableWarning =
      "TAGO 실시간 대신 구미 BIS 공식 시간표와 정류장 통과 추정으로 계산했습니다.";
  }

  try {
    const timetableResponse = await createTimetableResponse({
      checkedAt: planDependencies.now(),
      desiredArrivalTime,
      getTimetable: planDependencies.getTimetable,
      requestedInput,
      tago,
      timetableWarning,
      warnings,
    });

    if (timetableResponse) return timetableResponse;
  } catch (error) {
    warnings.push(
      `구미 BIS 공식 시간표 조회 실패로 mock 플랜을 사용합니다: ${getSafeTagoErrorMessage(error)}`,
    );
  }

  const fallback = {
    message: tago
      ? "TAGO 실시간 도착정보와 구미 BIS 공식 시간표에서 사용할 수 있는 미래 계획을 찾지 못해 mock 플랜으로 대체했습니다."
      : "TAGO 호출과 구미 BIS 공식 시간표 조회 실패로 mock 플랜을 사용합니다.",
    reason: mockFallbackReason,
  } satisfies TodayBusFallback;

  warnings.push(fallback.message);
  return createMockResponse(requestedInput, warnings, tago, fallback);
}

export async function createTodayBusPlanResponse(
  requestedInput: TripInput,
): Promise<TodayBusPlanResponse> {
  return createTodayBusPlanResponseWithDependencies(
    requestedInput,
    defaultPlanDependencies,
  );
}

export async function createTodayBusPlanResponseFromParams(
  params: TripSearchParams,
) {
  return createTodayBusPlanResponse(resolveTripInput(params));
}
