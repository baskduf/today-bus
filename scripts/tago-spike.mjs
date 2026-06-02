#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const envText = await readFile(".env.local", "utf8").catch(() => "");
const serviceKey = envText.match(/^TAGO_SERVICE_KEY=(.+)$/m)?.[1]?.trim();

if (!serviceKey) {
  console.error("Missing TAGO_SERVICE_KEY in .env.local");
  process.exit(1);
}

async function callTago(baseUrl, path, params = {}) {
  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("_type", "json");
  url.searchParams.set("pageNo", String(params.pageNo ?? 1));
  url.searchParams.set("numOfRows", String(params.numOfRows ?? 100));

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && key !== "pageNo" && key !== "numOfRows") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);
  const payload = await response.json();
  const header = payload.response?.header;
  const body = payload.response?.body;
  const item = body?.items?.item;

  if (header?.resultCode && header.resultCode !== "00") {
    throw new Error(`${header.resultCode}: ${header.resultMsg}`);
  }

  return {
    items: !item ? [] : Array.isArray(item) ? item : [item],
    totalCount: body?.totalCount ?? 0,
  };
}

const stationBase =
  "https://apis.data.go.kr/1613000/BusSttnInfoInqireService";
const routeBase =
  "https://apis.data.go.kr/1613000/BusRouteInfoInqireService";
const arrivalBase = "https://apis.data.go.kr/1613000/ArvlInfoInqireService";

const cities = await callTago(stationBase, "/getCtyCodeList", {
  numOfRows: 300,
});
const gumi = cities.items.find((city) => String(city.cityname).includes("구미"));
const cityCode = String(gumi?.citycode ?? "");

if (!cityCode) {
  console.error("Gumi city code was not found.");
  process.exit(1);
}

const routes = await callTago(routeBase, "/getRouteNoList", {
  cityCode,
  routeNo: "180",
});
const routeStops = await callTago(routeBase, "/getRouteAcctoThrghSttnList", {
  cityCode,
  numOfRows: 300,
  routeId: "GMB18020",
});
const arrivals = await callTago(
  arrivalBase,
  "/getSttnAcctoSpcifyRouteBusArvlPrearngeInfoList",
  {
    cityCode,
    nodeId: "GMB780",
    routeId: "GMB18020",
  },
);

console.log(
  JSON.stringify(
    {
      arrivals: arrivals.items,
      city: gumi,
      destinationStop: routeStops.items.find((stop) => stop.nodeid === "GMB79"),
      originStop: routeStops.items.find((stop) => stop.nodeid === "GMB780"),
      route: routes.items.find((route) => route.routeid === "GMB18020"),
      routeCandidates: routes.items,
    },
    null,
    2,
  ),
);
