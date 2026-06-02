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
  type TagoDemoSnapshot,
} from "@/lib/transit/tago-provider";
import { getSafeTagoErrorMessage, type TagoArrival } from "@/lib/tago/client";

export type TodayBusPlanSource = "mock" | "tago";

export type TodayBusFallbackReason =
  | "future_planning_not_supported"
  | "no_arrival"
  | "tago_error"
  | "unsupported_route";

export type TodayBusFallback = {
  message: string;
  reason: TodayBusFallbackReason;
};

export type TodayBusPlanResponse = {
  effectiveInput: TripInput;
  fallback?: TodayBusFallback;
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
  warnings: string[];
};

const homeWalkMinutes = 10;
const stopWaitMinutes = 5;
const busRideMinutes = 28;
const destinationWalkMinutes = 7;
const kstOffsetHours = 9;
const seoulTimeZone = "Asia/Seoul";

function isDemoInput(input: TripInput) {
  return (
    input.origin === tripDefaults.origin &&
    input.destination === tripDefaults.destination
  );
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

function createLivePlan(
  input: TripInput,
  snapshot: TagoDemoSnapshot,
  desiredArrivalTime: Date,
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

  const now = new Date();
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
        detail: `${tagoDemoIdentifiers.originNodeName}까지 ${homeWalkMinutes}분`,
        kind: "home",
        label: "집에서 출발",
        time: formatTime(departure),
      },
      {
        detail: `${stopWaitMinutes}분 대기`,
        kind: "stop",
        label: "정류장 도착",
        time: formatTime(busStopArrival),
      },
      {
        detail: `약 ${busRideMinutes}분 이동`,
        kind: "bus",
        label: `${tagoDemoIdentifiers.routeNo}번 버스 탑승`,
        time: formatTime(boarding),
      },
      {
        detail: `${input.destination}까지 도보 ${destinationWalkMinutes}분`,
        kind: "walk",
        label: `${tagoDemoIdentifiers.destinationNodeName} 하차`,
        time: formatTime(dropOff),
      },
      {
        detail: createArrivalDetail(
          input,
          slackMinutes,
          safetyBufferMinutes,
        ),
        kind: "arrival",
        label: `${input.destination} 도착`,
        time: formatTime(destinationArrival),
      },
    ],
  };
}

function createMockResponse(
  requestedInput: TripInput,
  warnings: string[],
  tago?: TodayBusPlanResponse["tago"],
  fallback?: TodayBusFallback,
): TodayBusPlanResponse {
  return {
    effectiveInput: {
      arrival: tripDefaults.arrival,
      buffer: requestedInput.buffer,
      destination: tripDefaults.destination,
      origin: tripDefaults.origin,
    },
    fallback,
    plans: busPlans,
    recoveryPlan,
    recommendedPlan,
    requestedInput,
    source: "mock",
    tago,
    warnings,
  };
}

export async function createTodayBusPlanResponse(
  requestedInput: TripInput,
): Promise<TodayBusPlanResponse> {
  const warnings: string[] = [];
  const desiredArrivalTime = parseTodayArrival(requestedInput);

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

  try {
    const snapshot = await getTagoDemoSnapshot();
    const tago = {
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
    );

    if (!livePlan) {
      const fallback = {
        message:
          "TAGO 실시간 도착정보에 현재 180번 도착예정이 없어 mock 플랜으로 대체했습니다.",
        reason: "no_arrival",
      } satisfies TodayBusFallback;

      warnings.push(fallback.message);
      warnings.push(
        "미래 도착 희망 시간 계획은 시간표 데이터가 확보되기 전까지 제한됩니다.",
      );
      return createMockResponse(requestedInput, warnings, tago, fallback);
    }

    const livePlans = [livePlan, ...busPlans.filter((plan) => !plan.primary)];
    return {
      effectiveInput: requestedInput,
      plans: livePlans,
      recoveryPlan,
      recommendedPlan: livePlan,
      requestedInput,
      source: "tago",
      tago,
      warnings,
    };
  } catch (error) {
    const fallback = {
      message: `TAGO 호출 실패로 mock 플랜을 사용합니다: ${getSafeTagoErrorMessage(error)}`,
      reason: "tago_error",
    } satisfies TodayBusFallback;

    warnings.push(fallback.message);
    return createMockResponse(requestedInput, warnings, undefined, fallback);
  }
}

export async function createTodayBusPlanResponseFromParams(
  params: TripSearchParams,
) {
  return createTodayBusPlanResponse(resolveTripInput(params));
}
