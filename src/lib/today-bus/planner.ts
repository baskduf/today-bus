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
  warnings: string[];
};

const homeWalkMinutes =
  todayBusDemoItinerary.boardingStop.walkMinutesFromOrigin;
const stopWaitMinutes = 5;
const busRideMinutes = 28;
const destinationWalkMinutes =
  todayBusDemoItinerary.destinationPlace.walkMinutesFromAlightingStop;
const kstOffsetHours = 9;
const seoulTimeZone = "Asia/Seoul";

function isDemoInput(input: TripInput) {
  return input.destination === tripDefaults.destination;
}

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

  return `출발 위치는 ${itinerary.originPlace.label}입니다. 현재 탑승 정류장 자동 선택은 아직 지원하지 않아 ${todayBusDemoItinerary.boardingStop.name} 정류장 기준으로 계산합니다.`;
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

function parseTodayArrival(input: TripInput, now = new Date()) {
  const match = input.arrival.match(/^오늘\s+(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;

  return createKstDate({
    ...getKstDateParts(now),
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

function parseSafetyBufferMinutes(input: TripInput) {
  const buffer = Number(input.buffer);
  return Number.isFinite(buffer) && buffer > 0
    ? buffer
    : Number(tripDefaults.buffer);
}

function classifyPlan(slackMinutes: number, safetyBufferMinutes: number) {
  if (slackMinutes < 0) return "late" as const;
  if (slackMinutes > 30) return "too_early" as const;
  if (slackMinutes >= safetyBufferMinutes) return "safe" as const;
  return "caution" as const;
}

function formatSlackSummary(slackMinutes: number) {
  if (slackMinutes < 0) return `${Math.abs(slackMinutes)}분 늦음`;
  if (slackMinutes > 30) return `${slackMinutes}분 일찍 도착`;
  return `여유 ${slackMinutes}분`;
}

function createLiveStatusLine(
  status: BusPlan["status"],
  slackMinutes: number,
  safetyBufferMinutes: number,
) {
  if (status === "late") {
    return `도착 희망보다 ${Math.abs(slackMinutes)}분 늦어요`;
  }

  if (status === "too_early") {
    return `너무 일찍 도착: ${slackMinutes}분 여유`;
  }

  if (status === "safe") {
    return `안전 여유 ${safetyBufferMinutes}분 이상 확보`;
  }

  return `여유가 안전 기준 ${safetyBufferMinutes}분보다 적어요`;
}

function createArrivalDetail(
  input: TripInput,
  slackMinutes: number,
  safetyBufferMinutes: number,
) {
  if (slackMinutes < 0) {
    return `${input.arrival}보다 ${Math.abs(slackMinutes)}분 늦어요`;
  }

  return `${input.arrival} 기준 여유 ${slackMinutes}분 · 안전 기준 ${safetyBufferMinutes}분`;
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
  safetyBufferMinutes: number,
) {
  if (status === "late") {
    return `도착 희망보다 ${Math.abs(slackMinutes)}분 늦어요`;
  }

  if (status === "too_early") {
    return `도착 후 ${slackMinutes}분 정도 기다려야 해요`;
  }

  if (status === "safe") {
    return `안전 여유 ${slackMinutes}분이에요`;
  }

  return `안전 기준보다 ${safetyBufferMinutes - slackMinutes}분 부족해요`;
}

function createLivePlan(
  input: TripInput,
  snapshot: TagoDemoSnapshot,
  desiredArrivalTime: Date,
  now = new Date(),
): BusPlan | undefined {
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
    -(homeWalkMinutes + stopWaitMinutes),
  );
  const dropOff = addMinutes(boarding, busRideMinutes);
  const destinationArrival = addMinutes(dropOff, destinationWalkMinutes);
  const safetyBufferMinutes = parseSafetyBufferMinutes(input);
  const slackMinutes = getSlackMinutes(destinationArrival, desiredArrivalTime);
  const status = classifyPlan(slackMinutes, safetyBufferMinutes);
  const missedDelayMinutes = arrivalCandidates[1]
    ? Math.ceil((arrivalCandidates[1].seconds - firstArrival.seconds) / 60)
    : undefined;

  return {
    ...recommendedPlan,
    arrivalTime: formatTime(destinationArrival),
    boardingTime: formatTime(boarding),
    busStopName: todayBusDemoItinerary.boardingStop.name,
    busStopArrivalTime: formatTime(busStopArrival),
    departureTime: formatTime(departure),
    dropOffTime: formatTime(dropOff),
    missedDelayMinutes,
    status,
    statusLine: createLiveStatusLine(
      status,
      slackMinutes,
      safetyBufferMinutes,
    ),
    statusNote: missedDelayMinutes
      ? `놓치면 ${missedDelayMinutes}분 늦어요`
      : "다음 버스 지연 시간은 아직 확인되지 않았어요",
    summaryLine: `대기 ${stopWaitMinutes}분 · ${formatSlackSummary(slackMinutes)}`,
    timeline: [
      {
        detail: `${todayBusDemoItinerary.boardingStop.name} 정류장까지 도보 ${homeWalkMinutes}분`,
        kind: "home",
        label: "집에서 출발",
        time: formatTime(departure),
      },
      {
        detail: `정류장번호 ${todayBusDemoItinerary.boardingStop.stopNo} · ${stopWaitMinutes}분 대기`,
        kind: "stop",
        label: `${todayBusDemoItinerary.boardingStop.name} 도착`,
        time: formatTime(busStopArrival),
      },
      {
        detail: `약 ${busRideMinutes}분 이동 · ${todayBusDemoItinerary.alightingStop.name} 하차`,
        kind: "bus",
        label: `${tagoDemoIdentifiers.routeNo}번 ${todayBusDemoItinerary.route.directionLabel} 탑승`,
        time: formatTime(boarding),
      },
      {
        detail: `${todayBusDemoItinerary.destinationPlace.label}까지 도보 ${destinationWalkMinutes}분`,
        kind: "walk",
        label: `${todayBusDemoItinerary.alightingStop.name} 하차`,
        time: formatTime(dropOff),
      },
      {
        detail: createArrivalDetail(
          input,
          slackMinutes,
          safetyBufferMinutes,
        ),
        kind: "arrival",
        label: `${todayBusDemoItinerary.destinationPlace.label} 도착`,
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
  desiredArrivalTime,
  entries,
  input,
  originOffsetMinutes,
}: {
  desiredArrivalTime: Date;
  entries: GumiBisTimetableEntry[];
  input: TripInput;
  originOffsetMinutes: number;
}) {
  const safetyBufferMinutes = parseSafetyBufferMinutes(input);
  const kstDateParts = getKstDateParts(desiredArrivalTime);

  return entries
    .reduce<TimetableCandidate[]>((candidates, entry) => {
      const clockTime = parseClockTime(entry.starttime);
      if (!clockTime) return candidates;

      const routeStartTime = createKstDate({
        ...kstDateParts,
        ...clockTime,
      });
      const boardingTime = addMinutes(routeStartTime, originOffsetMinutes);
      const busStopArrivalTime = addMinutes(boardingTime, -stopWaitMinutes);
      const departureTime = addMinutes(
        boardingTime,
        -(homeWalkMinutes + stopWaitMinutes),
      );
      const dropOffTime = addMinutes(boardingTime, busRideMinutes);
      const arrivalTime = addMinutes(dropOffTime, destinationWalkMinutes);
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
        status: classifyPlan(slackMinutes, safetyBufferMinutes),
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
  input,
  isPrimary,
  label,
  missedDelayMinutes,
}: {
  candidate: TimetableCandidate;
  input: TripInput;
  isPrimary: boolean;
  label: string;
  missedDelayMinutes?: number;
}): BusPlan {
  const safetyBufferMinutes = parseSafetyBufferMinutes(input);

  return {
    ...recommendedPlan,
    arrivalTime: formatTime(candidate.arrivalTime),
    boardingTime: formatTime(candidate.boardingTime),
    busStopName: todayBusDemoItinerary.boardingStop.name,
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
      safetyBufferMinutes,
    ),
    statusNote:
      missedDelayMinutes && isPrimary
        ? `놓치면 ${missedDelayMinutes}분 늦어요`
        : createStatusNote(
            candidate.status,
            candidate.slackMinutes,
            safetyBufferMinutes,
          ),
    summaryLine: isPrimary
      ? `대기 ${stopWaitMinutes}분 · ${formatSlackSummary(candidate.slackMinutes)}`
      : `${formatTime(candidate.boardingTime)} 탑승 · ${formatTime(
          candidate.arrivalTime,
        )} 도착`,
    timeline: [
      {
        detail: `${todayBusDemoItinerary.boardingStop.name} 정류장까지 도보 ${homeWalkMinutes}분`,
        kind: "home",
        label: "집에서 출발",
        time: formatTime(candidate.departureTime),
      },
      {
        detail: `정류장번호 ${todayBusDemoItinerary.boardingStop.stopNo} · ${stopWaitMinutes}분 대기`,
        kind: "stop",
        label: `${todayBusDemoItinerary.boardingStop.name} 도착`,
        time: formatTime(candidate.busStopArrivalTime),
      },
      {
        detail: `기점 ${formatTime(
          candidate.routeStartTime,
        )} 출발표 기준 · 정류장 통과 추정`,
        kind: "bus",
        label: `${tagoDemoIdentifiers.routeNo}번 ${todayBusDemoItinerary.route.directionLabel} 탑승`,
        time: formatTime(candidate.boardingTime),
      },
      {
        detail: `${todayBusDemoItinerary.destinationPlace.label}까지 도보 ${destinationWalkMinutes}분`,
        kind: "walk",
        label: `${todayBusDemoItinerary.alightingStop.name} 하차`,
        time: formatTime(candidate.dropOffTime),
      },
      {
        detail: createArrivalDetail(
          input,
          candidate.slackMinutes,
          safetyBufferMinutes,
        ),
        kind: "arrival",
        label: `${todayBusDemoItinerary.destinationPlace.label} 도착`,
        time: formatTime(candidate.arrivalTime),
      },
    ],
  };
}

function createTimetablePlans(
  input: TripInput,
  desiredArrivalTime: Date,
  entries: GumiBisTimetableEntry[],
) {
  const originOffsetMinutes = getEstimatedOriginOffsetMinutes();
  const candidates = createTimetableCandidates({
    desiredArrivalTime,
    entries,
    input,
    originOffsetMinutes,
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
    input,
    isPrimary: true,
    label: "추천 플랜 A",
    missedDelayMinutes,
  });
  const alternativePlans = [
    previousCandidate
      ? createTimetableBusPlan({
          candidate: previousCandidate,
          input,
          isPrimary: false,
          label: "더 이른 플랜",
        })
      : undefined,
    nextCandidate
      ? createTimetableBusPlan({
          candidate: nextCandidate,
          input,
          isPrimary: false,
          label: "다음 플랜",
        })
      : undefined,
  ].filter((plan): plan is BusPlan => plan !== undefined);

  return {
    originOffsetMinutes,
    plans: [recommendedTimetablePlan, ...alternativePlans],
    recoveryPlan: nextCandidate
      ? createTimetableBusPlan({
          candidate: nextCandidate,
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
    arrival: tripDefaults.arrival,
    buffer: requestedInput.buffer,
    destination: tripDefaults.destination,
    origin: requestedInput.origin || tripDefaults.origin,
    originAddress: requestedInput.originAddress,
    originLat: requestedInput.originLat,
    originLng: requestedInput.originLng,
    originPlaceName: requestedInput.originPlaceName,
    originSource: requestedInput.originSource,
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
    warnings,
  };
}

async function createTimetableResponse({
  checkedAt,
  desiredArrivalTime,
  getTimetable,
  requestedInput,
  tago,
  timetableWarning,
  warnings,
}: {
  checkedAt: Date;
  desiredArrivalTime: Date;
  getTimetable: typeof getGumiBisTimetable;
  requestedInput: TripInput;
  tago?: TodayBusPlanResponse["tago"];
  timetableWarning: string;
  warnings: string[];
}): Promise<TodayBusPlanResponse | undefined> {
  const scheduleType = getGumiBisScheduleTypeForDate(desiredArrivalTime);
  const timetable = await getTimetable(
    tagoDemoIdentifiers.timetableRouteId,
    scheduleType,
  );
  const timetablePlans = createTimetablePlans(
    requestedInput,
    desiredArrivalTime,
    timetable.rows,
  );

  if (!timetablePlans) return undefined;

  warnings.push(timetableWarning);

  return {
    effectiveInput: requestedInput,
    itinerary: createItinerary(requestedInput),
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
      routeId: tagoDemoIdentifiers.timetableRouteId,
      routeNo: tagoDemoIdentifiers.routeNo,
      scheduleType,
    },
    warnings,
  };
}

export type TodayBusPlanDependencies = {
  getDemoSnapshot: typeof getTagoDemoSnapshot;
  getTimetable: typeof getGumiBisTimetable;
  now: () => Date;
};

const defaultPlanDependencies: TodayBusPlanDependencies = {
  getDemoSnapshot: getTagoDemoSnapshot,
  getTimetable: getGumiBisTimetable,
  now: () => new Date(),
};

export async function createTodayBusPlanResponseWithDependencies(
  requestedInput: TripInput,
  dependencies: TodayBusPlanDependencies,
): Promise<TodayBusPlanResponse> {
  const warnings: string[] = [];
  const now = dependencies.now();
  const desiredArrivalTime = parseTodayArrival(requestedInput, now);

  if (hasCustomOriginPlace(requestedInput)) {
    warnings.push(createCustomOriginWarning(requestedInput));
  }

  if (!isDemoInput(requestedInput)) {
    const fallback = {
      message:
        "현재 TAGO 연동은 진평동에서 구미역까지의 데모 구간만 지원합니다. 데모 구간 기준 플랜을 보여줍니다.",
      reason: "unsupported_route",
    } satisfies TodayBusFallback;

    warnings.push(fallback.message);
    return createMockResponse(requestedInput, warnings, undefined, fallback);
  }

  if (!desiredArrivalTime) {
    const fallback = {
      message:
        "현재 TAGO 실시간 연동은 '오늘 HH:mm' 형식의 당일 도착 희망만 해석합니다. mock 플랜을 보여줍니다.",
      reason: "future_planning_not_supported",
    } satisfies TodayBusFallback;

    warnings.push(fallback.message);
    return createMockResponse(requestedInput, warnings, undefined, fallback);
  }

  let tago: TodayBusPlanResponse["tago"] | undefined;
  let mockFallbackReason: TodayBusFallbackReason = "timetable_error";
  let timetableWarning =
    "구미 BIS 공식 시간표와 정류장 통과 추정으로 계산했습니다.";

  try {
    const snapshot = await dependencies.getDemoSnapshot();
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
        "현재 TAGO 첫 도착은 희망 시각보다 너무 이른 플랜이라 구미 BIS 공식 시간표를 확인합니다.",
      );
      timetableWarning =
        "희망 도착 시각에 맞춰 구미 BIS 공식 시간표와 정류장 통과 추정으로 계산했습니다.";
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
      checkedAt: dependencies.now(),
      desiredArrivalTime,
      getTimetable: dependencies.getTimetable,
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
