#!/usr/bin/env node

import nextEnv from "@next/env";
import { createJiti } from "jiti";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const jiti = createJiti(import.meta.url, {
  alias: {
    "@/": `${process.cwd()}/src/`,
  },
  fsCache: false,
  moduleCache: false,
});
const {
  getOpenRouteServiceWalkingRoute,
  getSafeOpenRouteServiceErrorMessage,
  isOpenRouteServiceWalkingConfigured,
} = jiti(`${process.cwd()}/src/lib/openrouteservice/walking.ts`);

const sampleRoute = {
  endLat: readNumber(process.env.WALKING_ROUTE_END_LAT) ?? 36.101,
  endLng: readNumber(process.env.WALKING_ROUTE_END_LNG) ?? 128.431,
  startLat: readNumber(process.env.WALKING_ROUTE_START_LAT) ?? 36.1001,
  startLng: readNumber(process.env.WALKING_ROUTE_START_LNG) ?? 128.4301,
};

function readNumber(value) {
  if (typeof value !== "string" || value.trim() === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getConfiguredProvider() {
  return process.env.WALKING_ROUTE_PROVIDER?.trim() || "auto";
}

function getOrsApiKey() {
  return (
    process.env.ORS_API_KEY?.trim() ||
    process.env.OPENROUTESERVICE_API_KEY?.trim() ||
    ""
  );
}

function verifyRedaction() {
  const apiKey = getOrsApiKey();
  if (!apiKey) return false;

  const redacted = getSafeOpenRouteServiceErrorMessage(
    new Error(`request failed with api_key=${apiKey}`),
  );

  return !redacted.includes(apiKey) && redacted.includes("[REDACTED_ORS_API_KEY]");
}

function summarizeSuccess(result) {
  return {
    checks: {
      emptyResult: "fixture-covered-by-npm-run-test-planner",
      env: true,
      parser: true,
      providerError: "fixture-covered-by-npm-run-test-planner",
      redaction: verifyRedaction(),
      transport: true,
    },
    coordinates: {
      endLat: sampleRoute.endLat,
      endLng: sampleRoute.endLng,
      startLat: sampleRoute.startLat,
      startLng: sampleRoute.startLng,
    },
    keyConfigured: Boolean(getOrsApiKey()),
    mode: "live",
    provider: "openrouteservice",
    result: {
      distanceMeters: result.distanceMeters,
      durationSeconds: result.durationSeconds,
      walkMinutes: Math.max(1, Math.ceil(result.durationSeconds / 60)),
    },
    walkingRouteProvider: getConfiguredProvider(),
  };
}

function summarizeFailure(error) {
  return {
    checks: {
      env: Boolean(getOrsApiKey()),
      redaction: verifyRedaction(),
      transport: false,
    },
    error: getSafeOpenRouteServiceErrorMessage(error),
    keyConfigured: Boolean(getOrsApiKey()),
    mode: "live",
    provider: "openrouteservice",
    walkingRouteProvider: getConfiguredProvider(),
  };
}

if (!isOpenRouteServiceWalkingConfigured()) {
  console.error(
    JSON.stringify(
      {
        checks: {
          env: false,
        },
        keyConfigured: Boolean(getOrsApiKey()),
        message:
          "OpenRouteService walking is not configured. Set ORS_API_KEY and WALKING_ROUTE_PROVIDER=openrouteservice.",
        mode: "unconfigured",
        provider: "openrouteservice",
        walkingRouteProvider: getConfiguredProvider(),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

try {
  const result = await getOpenRouteServiceWalkingRoute(sampleRoute);
  console.log(JSON.stringify(summarizeSuccess(result), null, 2));
} catch (error) {
  console.error(JSON.stringify(summarizeFailure(error), null, 2));
  process.exit(1);
}
