#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const envText = await readFile(".env.local", "utf8").catch(() => "");
const serviceKey = envText.match(/^TAGO_SERVICE_KEY=(.+)$/m)?.[1]?.trim();

if (!serviceKey) {
  console.error("Missing TAGO_SERVICE_KEY in .env.local");
  process.exit(1);
}

function decodeXmlText(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function coerceXmlValue(value) {
  const decoded = decodeXmlText(value);
  return /^-?\d+(?:\.\d+)?$/.test(decoded) ? Number(decoded) : decoded;
}

function extractXmlTagText(xml, tag) {
  const match = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`,
    "i",
  ).exec(xml);

  return match ? decodeXmlText(match[1]) : undefined;
}

function parseXmlItem(block) {
  const item = {};

  for (const match of block.matchAll(
    /<([A-Za-z][\w:.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g,
  )) {
    const tag = match[1].includes(":") ? match[1].split(":").pop() : match[1];
    const value = match[2];

    if (!tag || value.includes("<")) continue;
    item[tag] = coerceXmlValue(value);
  }

  return item;
}

function parseXmlPayload(xml) {
  const errMsg = extractXmlTagText(xml, "errMsg");
  const returnAuthMsg = extractXmlTagText(xml, "returnAuthMsg");
  const returnReasonCode = extractXmlTagText(xml, "returnReasonCode");

  if (errMsg || returnAuthMsg || returnReasonCode) {
    return {
      OpenAPI_ServiceResponse: {
        cmmMsgHeader: { errMsg, returnAuthMsg, returnReasonCode },
      },
    };
  }

  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(
    (match) => parseXmlItem(match[1]),
  );

  return {
    response: {
      body: {
        items: items.length > 0 ? { item: items } : "",
        totalCount: coerceXmlValue(extractXmlTagText(xml, "totalCount") ?? ""),
      },
      header: {
        resultCode: extractXmlTagText(xml, "resultCode"),
        resultMsg: extractXmlTagText(xml, "resultMsg"),
      },
    },
  };
}

function parsePayload(text, contentType) {
  const trimmed = text.trim();
  const normalizedContentType = contentType.toLowerCase();

  if (!trimmed) return {};

  if (normalizedContentType.includes("json") || /^[{[]/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      if (!trimmed.startsWith("<")) {
        throw new Error("TAGO returned invalid JSON");
      }
    }
  }

  if (trimmed.startsWith("<")) return parseXmlPayload(trimmed);
  throw new Error("TAGO returned an unsupported response format");
}

function normalizeItems(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items !== "object") return [];

  const item = "item" in items ? items.item : items;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function getPortalError(payload) {
  const header = payload.OpenAPI_ServiceResponse?.cmmMsgHeader;
  if (!header) return undefined;

  return {
    code: header.returnReasonCode,
    message: [header.errMsg, header.returnAuthMsg].filter(Boolean).join(": "),
  };
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
  const payload = parsePayload(
    await response.text(),
    response.headers.get("content-type") ?? "",
  );
  const portalError = getPortalError(payload);
  const header = payload.response?.header;
  const body = payload.response?.body;

  if (portalError) {
    throw new Error(`${portalError.code ?? "portal"}: ${portalError.message}`);
  }

  if (!payload.response) {
    throw new Error("TAGO response was missing the response wrapper");
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (header?.resultCode && header.resultCode !== "00") {
    throw new Error(`${header.resultCode}: ${header.resultMsg}`);
  }

  return {
    items: normalizeItems(body?.items),
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
