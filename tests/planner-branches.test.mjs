import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import { createJiti } from "jiti";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const jiti = createJiti(import.meta.url, {
  alias: {
    "@/": `${path.join(projectRoot, "src")}/`,
  },
  fsCache: false,
  moduleCache: false,
});
const {
  createTodayBusPlanResponseWithDependencies,
  getEstimatedOriginOffsetMinutes,
} = jiti(path.join(projectRoot, "src/lib/today-bus/planner.ts"));
const {
  createStationArrivalTime,
  normalizeTrainDepartureTime,
  resolveTripInput,
} = jiti(path.join(projectRoot, "src/lib/today-bus/mock-plans.ts"));

const fixedNow = new Date("2026-06-02T06:20:00.000Z");
const demoInput = {
  arrival: "오늘 16:00",
  buffer: "10",
  origin: "진평동",
  trainDeparture: "오늘 16:10",
};
const timetableRows = [
  { bttSeqno: 1, starttime: "15:05" },
  { bttSeqno: 2, starttime: "15:40" },
  { bttSeqno: 3, starttime: "17:15" },
  { bttSeqno: 4, starttime: "17:50" },
];

function createArrival(arrtime) {
  return {
    arrtime,
    nodeid: "GMB780",
    routeid: "GMB18020",
    routeno: 180,
  };
}

function createSnapshot(arrivals) {
  return {
    arrivals,
    checkedAt: fixedNow.toISOString(),
    routeStops: [],
  };
}

function createDependencies({
  arrivals,
  getDirectRouteCandidates = async () => ({
    candidateCount: 0,
    candidates: [],
    checkedAt: fixedNow.toISOString(),
    nearbyStopCount: 0,
    routeCandidateCount: 0,
  }),
  getTimetable = async () => ({ rows: timetableRows }),
}) {
  const calls = {
    getDemoSnapshot: 0,
    getDirectRouteCandidates: 0,
    getTimetable: 0,
  };

  return {
    calls,
    dependencies: {
      getDemoSnapshot: async () => {
        calls.getDemoSnapshot += 1;
        return createSnapshot(arrivals);
      },
      getDirectRouteCandidates: async (...args) => {
        calls.getDirectRouteCandidates += 1;
        return getDirectRouteCandidates(...args);
      },
      getTimetable: async (...args) => {
        calls.getTimetable += 1;
        return getTimetable(...args);
      },
      now: () => fixedNow,
    },
  };
}

test("planner offset remains five minutes for the demo route", () => {
  assert.equal(getEstimatedOriginOffsetMinutes(), 5);
});

test("normalizes clock-only train departure input to today's train time", () => {
  const input = resolveTripInput(
    {
      buffer: "10",
      origin: "진평동",
      trainDeparture: "18:10",
    },
    fixedNow,
  );

  assert.equal(normalizeTrainDepartureTime("18:10", fixedNow), "오늘 18:10");
  assert.equal(createStationArrivalTime("18:10", "10"), "오늘 18:00");
  assert.equal(input.trainDeparture, "오늘 18:10");
  assert.equal(input.arrival, "오늘 18:00");
});

test("rolls past train departure input to tomorrow", () => {
  const input = resolveTripInput(
    {
      buffer: "10",
      origin: "진평동",
      trainDeparture: "14:10",
    },
    fixedNow,
  );

  assert.equal(normalizeTrainDepartureTime("14:10", fixedNow), "내일 14:10");
  assert.equal(createStationArrivalTime(input.trainDeparture, "10"), "내일 14:00");
  assert.equal(input.trainDeparture, "내일 14:10");
  assert.equal(input.arrival, "내일 14:00");
});

test("recomputes stale arrival query when train departure is present", () => {
  const input = resolveTripInput(
    {
      arrival: "오늘 14:00",
      buffer: "10",
      origin: "진평동",
      trainDeparture: "14:10",
    },
    fixedNow,
  );

  assert.equal(input.trainDeparture, "내일 14:10");
  assert.equal(input.arrival, "내일 14:00");
});

test("returns a place-to-stop itinerary for the demo route", async () => {
  const { dependencies } = createDependencies({
    arrivals: [createArrival(120)],
  });

  const response = await createTodayBusPlanResponseWithDependencies(
    demoInput,
    dependencies,
  );

  assert.equal(response.itinerary.originPlace.label, "진평동");
  assert.equal(response.itinerary.boardingStop.nodeId, "GMB780");
  assert.equal(response.itinerary.boardingStop.name, "진평중학교입구건너");
  assert.equal(response.itinerary.route.directionLabel, "구미역 방향");
  assert.equal(response.itinerary.alightingStop.nodeId, "GMB79");
  assert.equal(response.itinerary.alightingStop.name, "구미역(중앙시장)");
  assert.equal(response.itinerary.destinationPlace.label, "구미역");
  assert.equal(response.train.departureTime, "오늘 16:10");
  assert.equal(response.train.stationArrivalDeadline, "오늘 16:00");
  assert.equal(response.train.stationBufferMinutes, 10);
});

test("carries a selected origin place while keeping the demo boarding stop", async () => {
  const { dependencies } = createDependencies({
    arrivals: [createArrival(120)],
  });

  const response = await createTodayBusPlanResponseWithDependencies(
    {
      ...demoInput,
      origin: "강동병원",
      originAddress: "경북 구미시 인동20길 46",
      originLat: "36.1001",
      originLng: "128.4301",
      originPlaceName: "강동병원",
      originSource: "kakao_keyword",
    },
    dependencies,
  );

  assert.equal(response.itinerary.originPlace.label, "강동병원");
  assert.equal(response.itinerary.originPlace.source, "kakao_keyword");
  assert.equal(response.itinerary.originPlace.address, "경북 구미시 인동20길 46");
  assert.equal(response.itinerary.originPlace.lat, 36.1001);
  assert.equal(response.itinerary.originPlace.lng, 128.4301);
  assert.equal(response.itinerary.boardingStop.nodeId, "GMB780");
  assert.match(response.warnings.join("\n"), /좌표 기준 구미역 직행 버스 후보/);
});

test("uses coordinate-based direct route planning when a direct candidate is found", async () => {
  const dynamicItinerary = {
    alightingStop: {
      name: "구미역(중앙시장)",
      nodeId: "GMB79",
      stopNo: "10079",
      stopOrder: 30,
    },
    boardingStop: {
      distanceMeters: 120,
      name: "강동병원앞",
      nodeId: "GMB900",
      stopNo: "10900",
      stopOrder: 10,
      walkMinutesFromOrigin: 2,
    },
    destinationPlace: {
      label: "구미역",
      walkMinutesFromAlightingStop: 7,
    },
    originPlace: {
      address: "경북 구미시 인동20길 46",
      label: "강동병원",
      lat: 36.1001,
      lng: 128.4301,
      source: "kakao_keyword",
    },
    planning: {
      candidateCount: 1,
      mode: "dynamic_direct",
      selectionReason: "fixture direct route",
    },
    route: {
      directionLabel: "구미역 방향",
      oppositeTagoRouteId: "",
      routeNo: "181",
      tagoRouteId: "GMB18120",
      timetableRouteId: "18120",
    },
  };
  const { calls, dependencies } = createDependencies({
    arrivals: [],
    getDirectRouteCandidates: async () => ({
      candidateCount: 1,
      candidates: [
        {
          arrivals: [createArrival(120)],
          busRideMinutes: 24,
          checkedAt: fixedNow.toISOString(),
          destinationStop: {
            label: "구미역",
            name: "구미역(중앙시장)",
            nodeId: "GMB79",
            stopNo: "10079",
            walkMinutesToStation: 7,
          },
          itinerary: dynamicItinerary,
          originOffsetMinutes: 8,
          routeStartToDestinationMinutes: 32,
          routeStops: [],
          scoreMinutes: 33,
        },
      ],
      checkedAt: fixedNow.toISOString(),
      nearbyStopCount: 3,
      routeCandidateCount: 4,
    }),
  });

  const response = await createTodayBusPlanResponseWithDependencies(
    {
      ...demoInput,
      origin: "강동병원",
      originAddress: "경북 구미시 인동20길 46",
      originLat: "36.1001",
      originLng: "128.4301",
      originPlaceName: "강동병원",
      originSource: "kakao_keyword",
    },
    dependencies,
  );

  assert.equal(response.source, "tago");
  assert.equal(response.itinerary.boardingStop.nodeId, "GMB900");
  assert.equal(response.itinerary.route.routeNo, "181");
  assert.equal(response.recommendedPlan.busNumber, "181번");
  assert.equal(response.direct?.candidateCount, 1);
  assert.equal(response.tago?.originNodeId, "GMB900");
  assert.equal(calls.getDirectRouteCandidates, 1);
  assert.equal(calls.getDemoSnapshot, 0);
  assert.equal(calls.getTimetable, 0);
  assert.doesNotMatch(response.warnings.join("\n"), /탑승 정류장 자동 선택/);
});

test("uses Gumi BIS timetable for a coordinate-based direct route without live arrivals", async () => {
  const dynamicItinerary = {
    alightingStop: {
      name: "구미역(중앙시장)",
      nodeId: "GMB79",
      stopNo: "10079",
      stopOrder: 30,
    },
    boardingStop: {
      distanceMeters: 120,
      name: "강동병원앞",
      nodeId: "GMB900",
      stopNo: "10900",
      stopOrder: 10,
      walkMinutesFromOrigin: 2,
    },
    destinationPlace: {
      label: "구미역",
      walkMinutesFromAlightingStop: 7,
    },
    originPlace: {
      address: "경북 구미시 인동20길 46",
      label: "강동병원",
      lat: 36.1001,
      lng: 128.4301,
      source: "kakao_keyword",
    },
    planning: {
      candidateCount: 1,
      mode: "dynamic_direct",
      selectionReason: "fixture direct route",
    },
    route: {
      directionLabel: "구미역 방향",
      oppositeTagoRouteId: "",
      routeNo: "181",
      tagoRouteId: "GMB18120",
      timetableRouteId: "18120",
    },
  };
  const { calls, dependencies } = createDependencies({
    arrivals: [],
    getDirectRouteCandidates: async () => ({
      candidateCount: 1,
      candidates: [
        {
          arrivals: [],
          busRideMinutes: 24,
          checkedAt: fixedNow.toISOString(),
          destinationStop: {
            label: "구미역",
            name: "구미역(중앙시장)",
            nodeId: "GMB79",
            stopNo: "10079",
            walkMinutesToStation: 7,
          },
          itinerary: dynamicItinerary,
          originOffsetMinutes: 8,
          routeStartToDestinationMinutes: 32,
          routeStops: [],
          scoreMinutes: 33,
        },
      ],
      checkedAt: fixedNow.toISOString(),
      nearbyStopCount: 3,
      routeCandidateCount: 4,
    }),
  });

  const response = await createTodayBusPlanResponseWithDependencies(
    {
      ...demoInput,
      origin: "강동병원",
      originAddress: "경북 구미시 인동20길 46",
      originLat: "36.1001",
      originLng: "128.4301",
      originPlaceName: "강동병원",
      originSource: "kakao_keyword",
    },
    dependencies,
  );

  assert.equal(response.source, "gumi_bis_timetable");
  assert.equal(response.timetable?.routeId, "18120");
  assert.equal(response.timetable?.originOffsetMinutes, 8);
  assert.equal(response.itinerary.boardingStop.nodeId, "GMB900");
  assert.equal(calls.getDirectRouteCandidates, 1);
  assert.equal(calls.getDemoSnapshot, 0);
  assert.equal(calls.getTimetable, 1);
});

test("uses TAGO when live arrival is suitable for the requested arrival time", async () => {
  const { calls, dependencies } = createDependencies({
    arrivals: [createArrival(120)],
  });

  const response = await createTodayBusPlanResponseWithDependencies(
    demoInput,
    dependencies,
  );

  assert.equal(response.source, "tago");
  assert.equal(response.tago?.arrivalCount, 1);
  assert.equal(calls.getDemoSnapshot, 1);
  assert.equal(calls.getTimetable, 0);
});

test("uses Gumi BIS timetable when the live arrival is too early", async () => {
  const { calls, dependencies } = createDependencies({
    arrivals: [createArrival(120)],
  });

  const response = await createTodayBusPlanResponseWithDependencies(
    { ...demoInput, arrival: "오늘 18:00", trainDeparture: "오늘 18:10" },
    dependencies,
  );

  assert.equal(response.source, "gumi_bis_timetable");
  assert.equal(response.timetable?.originOffsetMinutes, 5);
  assert.equal(calls.getTimetable, 1);
});

test("uses Gumi BIS timetable when TAGO has no live arrivals", async () => {
  const { calls, dependencies } = createDependencies({
    arrivals: [],
  });

  const response = await createTodayBusPlanResponseWithDependencies(
    { ...demoInput, arrival: "오늘 18:00", trainDeparture: "오늘 18:10" },
    dependencies,
  );

  assert.equal(response.source, "gumi_bis_timetable");
  assert.equal(response.tago?.arrivalCount, 0);
  assert.equal(calls.getTimetable, 1);
});

test("falls back to mock when Gumi BIS timetable lookup fails", async () => {
  const { dependencies } = createDependencies({
    arrivals: [],
    getTimetable: async () => {
      throw new Error("BIS unavailable");
    },
  });

  const response = await createTodayBusPlanResponseWithDependencies(
    { ...demoInput, arrival: "오늘 18:00", trainDeparture: "오늘 18:10" },
    dependencies,
  );

  assert.equal(response.source, "mock");
  assert.equal(response.fallback?.reason, "no_arrival");
});
