#!/usr/bin/env node

import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const seoulTimeZone = "Asia/Seoul";
const tagoDemoIdentifiers = {
  cityCode: "37050",
  destinationNodeId: "GMB79",
  destinationStopNo: "10079",
  destinationStopOrder: 29,
  gumiBisRouteId: "18020",
  originNodeId: "GMB780",
  originStopNo: "10780",
  originStopOrder: 5,
  routeNo: "180",
  tagoRouteId: "GMB18020",
};
const busRideMinutes = 28;
const tagoArrivalBaseUrl =
  "https://apis.data.go.kr/1613000/ArvlInfoInqireService";
const gumiBisBaseUrl = "http://bis.gumi.go.kr";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getServiceKeyRedactionVariants(serviceKey) {
  const variants = new Set([serviceKey, encodeURIComponent(serviceKey)]);

  try {
    variants.add(decodeURIComponent(serviceKey));
  } catch {
    // Keep the raw and encoded forms when the env value is not URI encoded.
  }

  return [...variants].filter((variant) => variant.length > 0);
}

function sanitizeMessage(message, serviceKey) {
  let redacted = message.replace(
    /serviceKey=([^&\s]+)/gi,
    "serviceKey=[REDACTED_SERVICE_KEY]",
  );

  for (const variant of getServiceKeyRedactionVariants(serviceKey)) {
    redacted = redacted.replace(
      new RegExp(escapeRegExp(variant), "g"),
      "[REDACTED_SERVICE_KEY]",
    );
  }

  return redacted;
}

function getServiceKey() {
  const serviceKey = process.env.TAGO_SERVICE_KEY?.trim();

  if (!serviceKey) {
    throw new Error("TAGO_SERVICE_KEY is not configured");
  }

  return serviceKey;
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
    `<${escapeRegExp(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRegExp(
      tag,
    )}>`,
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

async function callTagoArrival(serviceKey) {
  const url = new URL(
    `${tagoArrivalBaseUrl}/getSttnAcctoSpcifyRouteBusArvlPrearngeInfoList`,
  );
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("_type", "json");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("cityCode", tagoDemoIdentifiers.cityCode);
  url.searchParams.set("nodeId", tagoDemoIdentifiers.originNodeId);
  url.searchParams.set("routeId", tagoDemoIdentifiers.tagoRouteId);

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
    throw new Error(`TAGO request failed with HTTP ${response.status}`);
  }

  if (header?.resultCode && header.resultCode !== "00") {
    throw new Error(`${header.resultCode}: ${header.resultMsg}`);
  }

  return normalizeItems(body?.items);
}

function getGumiBisScheduleTypeForDate(date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: seoulTimeZone,
    weekday: "short",
  }).format(date);

  return weekday === "Sat" || weekday === "Sun" ? "holiday" : "weekday";
}

function getScheduleTypeCode(scheduleType) {
  return scheduleType === "weekday" ? "0" : "2";
}

async function getGumiBisTimetable(routeId, scheduleType) {
  const body = new URLSearchParams({
    bType: getScheduleTypeCode(scheduleType),
    routeId,
  });
  const response = await fetch(`${gumiBisBaseUrl}/localbus/getTimetableInfo`, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Gumi BIS request failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.rows) ? payload.rows : [];
}

function getKstDateParts(date) {
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

function createKstDate({ day, hour, minute, month, year }) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute, 0, 0));
}

function parseClockTime(value) {
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;

  return { hour, minute };
}

function formatKstClock(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: seoulTimeZone,
  }).format(date);
}

function getPlannerOffsetMinutes() {
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

function getArrivalSeconds(arrival) {
  return typeof arrival.arrtime === "number" && arrival.arrtime > 0
    ? arrival.arrtime
    : undefined;
}

function getRouteStartDate(passTime, starttime) {
  const clockTime = parseClockTime(starttime);
  if (!clockTime) return undefined;

  return createKstDate({
    ...getKstDateParts(passTime),
    ...clockTime,
  });
}

function findNearestRouteStart(passTime, timetable) {
  let nearest;

  for (const entry of timetable) {
    const routeStartTime = getRouteStartDate(passTime, entry.starttime);
    if (!routeStartTime) continue;

    const diffMinutes = Math.round(
      (passTime.getTime() - routeStartTime.getTime()) / 60_000,
    );
    const gapMinutes = Math.abs(diffMinutes);

    if (!nearest || gapMinutes < nearest.matchGapMinutes) {
      nearest = {
        entry,
        matchGapMinutes: gapMinutes,
        observedOffsetMinutes: diffMinutes,
        routeStartTime,
      };
    }
  }

  return nearest;
}

function createObservationOutput({
  arrivals,
  checkedAt,
  scheduleType,
  timetable,
}) {
  const plannerOffsetMinutes = getPlannerOffsetMinutes();
  const matches = arrivals
    .map((arrival) => ({
      arrival,
      arrivalSeconds: getArrivalSeconds(arrival),
    }))
    .filter((candidate) => typeof candidate.arrivalSeconds === "number")
    .map((candidate) => {
      const estimatedOriginPassTime = new Date(
        checkedAt.getTime() + candidate.arrivalSeconds * 1000,
      );
      const nearest = findNearestRouteStart(estimatedOriginPassTime, timetable);

      if (!nearest) return undefined;

      return {
        arrivalSeconds: candidate.arrivalSeconds,
        estimatedOriginPassTime: formatKstClock(estimatedOriginPassTime),
        matchGapMinutes: nearest.matchGapMinutes,
        nearestRouteStartTime: formatKstClock(nearest.routeStartTime),
        observedOffsetMinutes: nearest.observedOffsetMinutes,
        plannerOffsetMinutes,
      };
    })
    .filter((match) => match !== undefined);
  const status = matches.length > 0 ? "observed" : "unobservable";
  const message =
    arrivals.length === 0
      ? "현재 TAGO arrival 관측 불가"
      : matches.length === 0
        ? "TAGO arrival에 양수 arrtime이 없어 offset 관측 불가"
        : "TAGO live arrival와 Gumi BIS 기점 시간표를 매칭했습니다.";

  return {
    arrivalCount: arrivals.length,
    checkedAt: checkedAt.toISOString(),
    checkedAtKst: formatKstClock(checkedAt),
    departureCount: timetable.length,
    gumiBisRouteId: tagoDemoIdentifiers.gumiBisRouteId,
    matches,
    message,
    originNodeId: tagoDemoIdentifiers.originNodeId,
    plannerOffsetMinutes,
    routeNo: tagoDemoIdentifiers.routeNo,
    scheduleType,
    status,
    tagoRouteId: tagoDemoIdentifiers.tagoRouteId,
    usableArrivalCount: matches.length,
  };
}

try {
  const serviceKey = getServiceKey();
  const checkedAt = new Date();
  const scheduleType = getGumiBisScheduleTypeForDate(checkedAt);
  const [arrivals, timetable] = await Promise.all([
    callTagoArrival(serviceKey),
    getGumiBisTimetable(tagoDemoIdentifiers.gumiBisRouteId, scheduleType),
  ]);
  const output = createObservationOutput({
    arrivals,
    checkedAt,
    scheduleType,
    timetable,
  });

  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  const serviceKey = process.env.TAGO_SERVICE_KEY?.trim() ?? "";
  const message =
    error instanceof Error ? error.message : "Unknown offset check error";

  console.error(sanitizeMessage(message, serviceKey));
  process.exit(1);
}
