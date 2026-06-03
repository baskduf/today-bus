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
  getOpenRouteServiceWalkingRoute,
  isOpenRouteServiceWalkingConfigured,
  OpenRouteServiceWalkingRouteError,
} = jiti(path.join(projectRoot, "src/lib/openrouteservice/walking.ts"));
const {
  createConfiguredWalkingRouteProvider,
  createOpenRouteServiceWalkingRouteProvider,
} = jiti(path.join(projectRoot, "src/lib/transit/walking-route-provider.ts"));

function withOrsEnv(env, run) {
  const previous = {
    OPENROUTESERVICE_API_KEY: process.env.OPENROUTESERVICE_API_KEY,
    ORS_API_KEY: process.env.ORS_API_KEY,
    ORS_WALKING_BASE_URL: process.env.ORS_WALKING_BASE_URL,
    ORS_WALKING_MODE: process.env.ORS_WALKING_MODE,
    ORS_WALKING_TIMEOUT_MS: process.env.ORS_WALKING_TIMEOUT_MS,
    TMAP_APP_KEY: process.env.TMAP_APP_KEY,
    WALKING_ROUTE_PROVIDER: process.env.WALKING_ROUTE_PROVIDER,
  };

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

test("OpenRouteService walking client sends Authorization and parses route summary", async () => {
  await withOrsEnv(
    {
      ORS_API_KEY: "test-ors-secret",
      ORS_WALKING_BASE_URL: "https://example.test/v2/directions/foot-walking",
      ORS_WALKING_MODE: "live",
    },
    async () => {
      const calls = [];
      const fetcher = async (url, options) => {
        calls.push({ options, url: String(url) });

        return new Response(
          JSON.stringify({
            routes: [
              {
                summary: {
                  distance: 360.4,
                  duration: 410.2,
                },
              },
            ],
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        );
      };

      const result = await getOpenRouteServiceWalkingRoute(
        {
          endLat: 36.101,
          endLng: 128.431,
          startLat: 36.1001,
          startLng: 128.4301,
        },
        fetcher,
      );

      assert.equal(isOpenRouteServiceWalkingConfigured(), true);
      assert.equal(result.distanceMeters, 360);
      assert.equal(result.durationSeconds, 410);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://example.test/v2/directions/foot-walking");
      assert.equal(calls[0].options.method, "POST");
      assert.equal(calls[0].options.cache, "no-store");
      assert.equal(calls[0].options.headers.Authorization, "test-ors-secret");

      const body = JSON.parse(calls[0].options.body);
      assert.deepEqual(body.coordinates, [
        [128.4301, 36.1001],
        [128.431, 36.101],
      ]);
      assert.equal(body.instructions, false);
      assert.equal(body.preference, "recommended");
      assert.equal(body.units, "m");
    },
  );
});

test("OpenRouteService walking client accepts GeoJSON summary responses", async () => {
  await withOrsEnv(
    {
      ORS_API_KEY: "test-ors-secret",
      ORS_WALKING_MODE: "live",
    },
    async () => {
      const result = await getOpenRouteServiceWalkingRoute(
        {
          endLat: 36.101,
          endLng: 128.431,
          startLat: 36.1001,
          startLng: 128.4301,
        },
        async () =>
          new Response(
            JSON.stringify({
              features: [
                {
                  properties: {
                    summary: {
                      distance: 121,
                      duration: 90,
                    },
                  },
                },
              ],
            }),
            {
              headers: {
                "content-type": "application/json",
              },
              status: 200,
            },
          ),
      );

      assert.equal(result.distanceMeters, 121);
      assert.equal(result.durationSeconds, 90);
    },
  );
});

test("OpenRouteService walking client treats missing summaries as provider errors", async () => {
  await withOrsEnv(
    {
      ORS_API_KEY: "test-ors-secret",
      ORS_WALKING_MODE: "live",
    },
    async () => {
      await assert.rejects(
        () =>
          getOpenRouteServiceWalkingRoute(
            {
              endLat: 36.101,
              endLng: 128.431,
              startLat: 36.1001,
              startLng: 128.4301,
            },
            async () =>
              new Response(
                JSON.stringify({
                  routes: [],
                }),
                {
                  headers: {
                    "content-type": "application/json",
                  },
                  status: 200,
                },
              ),
          ),
        OpenRouteServiceWalkingRouteError,
      );
    },
  );
});

test("OpenRouteService walking client redacts API keys from text errors", async () => {
  await withOrsEnv(
    {
      ORS_API_KEY: "test-ors-secret",
      ORS_WALKING_MODE: "live",
    },
    async () => {
      await assert.rejects(
        async () =>
          getOpenRouteServiceWalkingRoute(
            {
              endLat: 36.101,
              endLng: 128.431,
              startLat: 36.1001,
              startLng: 128.4301,
            },
            async () =>
              new Response("Forbidden test-ors-secret", {
                headers: {
                  "content-type": "text/plain",
                },
                status: 403,
              }),
          ),
        (error) => {
          assert(error instanceof OpenRouteServiceWalkingRouteError);
          assert.equal(error.details?.status, 403);
          assert.match(
            error.details?.resultMsg ?? "",
            /\[REDACTED_ORS_API_KEY\]/,
          );
          assert.doesNotMatch(error.details?.resultMsg ?? "", /test-ors-secret/);
          return true;
        },
      );
    },
  );
});

test("configured walking provider can force OpenRouteService mode", async () => {
  await withOrsEnv(
    {
      ORS_API_KEY: undefined,
      ORS_WALKING_MODE: undefined,
      TMAP_APP_KEY: "present-but-not-selected",
      WALKING_ROUTE_PROVIDER: "openrouteservice",
    },
    async () => {
      const provider = createConfiguredWalkingRouteProvider();
      const result = await provider.getWalkingRoute({
        from: {
          lat: 36.1001,
          lng: 128.4301,
        },
        to: {
          lat: 36.101,
          lng: 128.431,
        },
      });

      assert.equal(result, undefined);
    },
  );
});

test("OpenRouteService walking provider maps route result to transit provider result", async () => {
  const provider = createOpenRouteServiceWalkingRouteProvider(
    async (request) => {
      assert.equal(request.startLat, 36.1001);
      assert.equal(request.startLng, 128.4301);
      assert.equal(request.endLat, 36.101);
      assert.equal(request.endLng, 128.431);

      return {
        distanceMeters: 360,
        durationSeconds: 410,
      };
    },
    () => true,
  );

  const result = await provider.getWalkingRoute({
    from: {
      lat: 36.1001,
      lng: 128.4301,
    },
    to: {
      lat: 36.101,
      lng: 128.431,
    },
  });

  assert.equal(result?.distanceMeters, 360);
  assert.equal(result?.durationSeconds, 410);
  assert.equal(result?.source, "openrouteservice_foot_walking");
});
