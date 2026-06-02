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
import type { TagoArrival } from "@/lib/tago/client";

export type TodayBusPlanSource = "mock" | "tago";

export type TodayBusPlanResponse = {
  effectiveInput: TripInput;
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

function isDemoInput(input: TripInput) {
  return (
    input.origin === tripDefaults.origin &&
    input.destination === tripDefaults.destination
  );
}

function parseTodayArrival(input: TripInput) {
  const match = input.arrival.match(/^오늘\s+(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "Asia/Seoul",
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

function classifyPlan(arrivalTime: Date, desiredArrivalTime?: Date) {
  if (!desiredArrivalTime) return "caution" as const;

  const slackMinutes = Math.floor(
    (desiredArrivalTime.getTime() - arrivalTime.getTime()) / 60_000,
  );

  if (slackMinutes < 0) return "late" as const;
  if (slackMinutes > 30) return "too_early" as const;
  if (slackMinutes >= 10) return "safe" as const;
  return "caution" as const;
}

function createLivePlan(
  input: TripInput,
  snapshot: TagoDemoSnapshot,
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
  const desiredArrivalTime = parseTodayArrival(input);
  const status = classifyPlan(destinationArrival, desiredArrivalTime);
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
    statusLine:
      status === "late"
        ? "도착 희망보다 늦어요"
        : "실시간 도착정보로 계산한 플랜이에요",
    statusNote: missedDelayMinutes
      ? `놓치면 ${missedDelayMinutes}분 늦어요`
      : "다음 버스 지연 시간은 아직 확인되지 않았어요",
    summaryLine: `대기 ${stopWaitMinutes}분 · 실시간`,
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
        detail: desiredArrivalTime
          ? `${input.arrival} 기준으로 판단`
          : "도착 희망 시간을 해석하지 못했어요",
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
): TodayBusPlanResponse {
  return {
    effectiveInput: {
      arrival: tripDefaults.arrival,
      buffer: requestedInput.buffer,
      destination: tripDefaults.destination,
      origin: tripDefaults.origin,
    },
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

  if (!isDemoInput(requestedInput)) {
    warnings.push(
      "현재 TAGO 연동은 진평동에서 구미역까지의 데모 구간만 지원합니다. 데모 구간 기준 플랜을 보여줍니다.",
    );
    return createMockResponse(requestedInput, warnings);
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
    const livePlan = createLivePlan(requestedInput, snapshot);

    if (!livePlan) {
      warnings.push(
        "TAGO 실시간 도착정보에 현재 180번 도착예정이 없어 mock 플랜으로 대체했습니다.",
      );
      warnings.push(
        "미래 도착 희망 시간 계획은 시간표 데이터가 확보되기 전까지 제한됩니다.",
      );
      return createMockResponse(requestedInput, warnings, tago);
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
    warnings.push(
      error instanceof Error
        ? `TAGO 호출 실패로 mock 플랜을 사용합니다: ${error.message}`
        : "TAGO 호출 실패로 mock 플랜을 사용합니다.",
    );
    return createMockResponse(requestedInput, warnings);
  }
}

export async function createTodayBusPlanResponseFromParams(
  params: TripSearchParams,
) {
  return createTodayBusPlanResponse(resolveTripInput(params));
}
