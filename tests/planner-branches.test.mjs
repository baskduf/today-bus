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

const fixedNow = new Date("2026-06-02T06:20:00.000Z");
const demoInput = {
  arrival: "오늘 16:00",
  buffer: "10",
  destination: "구미역",
  origin: "진평동",
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
  getTimetable = async () => ({ rows: timetableRows }),
}) {
  const calls = {
    getDemoSnapshot: 0,
    getTimetable: 0,
  };

  return {
    calls,
    dependencies: {
      getDemoSnapshot: async () => {
        calls.getDemoSnapshot += 1;
        return createSnapshot(arrivals);
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
    { ...demoInput, arrival: "오늘 18:00" },
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
    { ...demoInput, arrival: "오늘 18:00" },
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
    { ...demoInput, arrival: "오늘 18:00" },
    dependencies,
  );

  assert.equal(response.source, "mock");
  assert.equal(response.fallback?.reason, "no_arrival");
});
