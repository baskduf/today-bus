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
const { getDirectRouteCandidates } = jiti(
  path.join(projectRoot, "src/lib/transit/direct-route-planner.ts"),
);

const originPlace = {
  label: "강동병원",
  lat: 36.1001,
  lng: 128.4301,
  source: "kakao_keyword",
};

test("direct route planner selects a nearby Gumi Station-bound route", async () => {
  const calls = {
    getRouteArrivals: 0,
    getRouteStops: 0,
    getStopRoutes: 0,
    searchNearbyStops: 0,
  };
  const provider = {
    async getRouteArrivals(_cityCode, nodeId, routeId) {
      calls.getRouteArrivals += 1;
      return [
        {
          arrtime: routeId === "GMB18120" ? 180 : 600,
          nodeid: nodeId,
          routeid: routeId,
          routeno: routeId === "GMB18120" ? 181 : 182,
        },
      ];
    },
    async getRouteStops(_cityCode, routeId) {
      calls.getRouteStops += 1;

      if (routeId === "GMB18210") {
        return [
          {
            nodeid: "GMB79",
            nodenm: "구미역(중앙시장)",
            nodeno: "10079",
            nodeord: 10,
            routeid: routeId,
          },
          {
            nodeid: "GMB901",
            nodenm: "먼정류장",
            nodeno: "10901",
            nodeord: 30,
            routeid: routeId,
          },
        ];
      }

      return [
        {
          nodeid: "GMB900",
          nodenm: "강동병원앞",
          nodeno: "10900",
          nodeord: 8,
          routeid: routeId,
        },
        {
          nodeid: "GMB79",
          nodenm: "구미역(중앙시장)",
          nodeno: "10079",
          nodeord: 28,
          routeid: routeId,
        },
      ];
    },
    async getStopRoutes(_cityCode, nodeId) {
      calls.getStopRoutes += 1;
      return nodeId === "GMB900"
        ? [
            {
              routeid: "GMB18120",
              routeno: 181,
            },
          ]
        : [
            {
              routeid: "GMB18210",
              routeno: 182,
            },
          ];
    },
    async searchNearbyStops() {
      calls.searchNearbyStops += 1;
      return [
        {
          dist: 240,
          nodeid: "GMB901",
          nodenm: "먼정류장",
          nodeno: "10901",
        },
        {
          dist: 95,
          nodeid: "GMB900",
          nodenm: "강동병원앞",
          nodeno: "10900",
        },
      ];
    },
  };

  const result = await getDirectRouteCandidates(
    {
      originPlace,
    },
    provider,
  );

  assert.equal(result.nearbyStopCount, 2);
  assert.equal(result.routeCandidateCount, 2);
  assert.equal(result.candidateCount, 1);
  assert.equal(result.candidates[0].itinerary.boardingStop.nodeId, "GMB900");
  assert.equal(result.candidates[0].itinerary.route.routeNo, "181");
  assert.equal(result.candidates[0].itinerary.route.timetableRouteId, "18120");
  assert.equal(result.candidates[0].itinerary.planning?.mode, "dynamic_direct");
  assert.equal(calls.searchNearbyStops, 1);
  assert.equal(calls.getStopRoutes, 2);
  assert.equal(calls.getRouteStops, 2);
  assert.equal(calls.getRouteArrivals, 1);
});

test("direct route planner skips stops whose route lookup fails", async () => {
  const calls = {
    getRouteArrivals: 0,
    getRouteStops: 0,
    getStopRoutes: 0,
    searchNearbyStops: 0,
  };
  const provider = {
    async getRouteArrivals(_cityCode, nodeId, routeId) {
      calls.getRouteArrivals += 1;
      return [
        {
          arrtime: 300,
          nodeid: nodeId,
          routeid: routeId,
          routeno: 181,
        },
      ];
    },
    async getRouteStops(_cityCode, routeId) {
      calls.getRouteStops += 1;
      return [
        {
          nodeid: "GMB900",
          nodenm: "강동병원앞",
          nodeno: "10900",
          nodeord: 8,
          routeid: routeId,
        },
        {
          nodeid: "GMB79",
          nodenm: "구미역(중앙시장)",
          nodeno: "10079",
          nodeord: 28,
          routeid: routeId,
        },
      ];
    },
    async getStopRoutes(_cityCode, nodeId) {
      calls.getStopRoutes += 1;
      if (nodeId === "GMB901") throw new Error("route lookup failed");

      return [
        {
          routeid: "GMB18120",
          routeno: 181,
        },
      ];
    },
    async searchNearbyStops() {
      calls.searchNearbyStops += 1;
      return [
        {
          dist: 80,
          nodeid: "GMB901",
          nodenm: "조회실패정류장",
          nodeno: "10901",
        },
        {
          dist: 95,
          nodeid: "GMB900",
          nodenm: "강동병원앞",
          nodeno: "10900",
        },
      ];
    },
  };

  const result = await getDirectRouteCandidates(
    {
      originPlace,
    },
    provider,
  );

  assert.equal(result.nearbyStopCount, 2);
  assert.equal(result.routeCandidateCount, 1);
  assert.equal(result.candidateCount, 1);
  assert.equal(result.candidates[0].itinerary.boardingStop.nodeId, "GMB900");
  assert.equal(calls.searchNearbyStops, 1);
  assert.equal(calls.getStopRoutes, 2);
  assert.equal(calls.getRouteStops, 1);
  assert.equal(calls.getRouteArrivals, 1);
});
