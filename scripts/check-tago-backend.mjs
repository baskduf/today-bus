#!/usr/bin/env node

const baseUrl = normalizeBaseUrl(
  process.argv[2] ?? process.env.TODAY_BUS_BASE_URL ?? "http://localhost:3000",
);

function normalizeBaseUrl(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function fetchJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : undefined;
  } catch (error) {
    throw new Error(
      `${path} returned non-JSON response (${response.status}): ${
        error instanceof Error ? error.message : "parse failed"
      }`,
    );
  }

  return {
    body,
    status: response.status,
  };
}

function summarizeHealth(body) {
  return {
    arrivalCount: body?.arrivalCount ?? body?.arrivalLookup?.arrivalCount ?? 0,
    arrivalLookupOk: Boolean(body?.arrivalLookup?.ok),
    cityLookupOk: Boolean(body?.cityLookup?.ok),
    fallbackRequired: Boolean(body?.fallbackRequired),
    keyConfigured: Boolean(body?.keyConfigured),
    ok: Boolean(body?.ok),
    routeLookupOk: Boolean(body?.routeLookup?.ok),
    routeStopOrderOk: Boolean(body?.routeStopOrder?.ok),
  };
}

function summarizePlans(body) {
  return {
    fallback: body?.fallback,
    source: body?.source,
    tagoArrivalCount: body?.tago?.arrivalCount,
    warningCount: Array.isArray(body?.warnings) ? body.warnings.length : 0,
    warnings: Array.isArray(body?.warnings) ? body.warnings : [],
  };
}

const planRequest = {
  arrival: "오늘 14:00",
  destination: "구미역",
  origin: "진평동",
  safetyBufferMinutes: 10,
};

try {
  const health = await fetchJson("/api/tago/health");
  const plans = await fetchJson("/api/plans", {
    body: JSON.stringify(planRequest),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const summary = {
    baseUrl,
    health: {
      status: health.status,
      ...summarizeHealth(health.body),
    },
    plans: {
      status: plans.status,
      ...summarizePlans(plans.body),
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (health.status >= 500 || plans.status !== 200) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Unable to verify TAGO backend at ${baseUrl}.`);
  console.error("Start the app with `npm run dev` and run this script again.");
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
}
