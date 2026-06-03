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
  getTmapWalkingRoute,
  isTmapWalkingConfigured,
  TmapWalkingRouteError,
} = jiti(path.join(projectRoot, "src/lib/tmap/walking.ts"));

function withTmapEnv(env, run) {
  const previous = {
    TMAP_APP_KEY: process.env.TMAP_APP_KEY,
    TMAP_WALKING_BASE_URL: process.env.TMAP_WALKING_BASE_URL,
    TMAP_WALKING_MODE: process.env.TMAP_WALKING_MODE,
    TMAP_WALKING_TIMEOUT_MS: process.env.TMAP_WALKING_TIMEOUT_MS,
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

test("TMAP walking route client sends server-only appKey and parses summary", async () => {
  await withTmapEnv(
    {
      TMAP_APP_KEY: "test-secret-key",
      TMAP_WALKING_BASE_URL: "https://example.test/tmap/routes/pedestrian",
      TMAP_WALKING_MODE: "live",
      TMAP_WALKING_TIMEOUT_MS: "1000",
    },
    async () => {
      const calls = [];
      const fetcher = async (url, options) => {
        calls.push({ options, url: String(url) });

        return new Response(
          JSON.stringify({
            features: [
              {
                properties: {
                  totalDistance: 360.4,
                  totalTime: 410.2,
                },
              },
            ],
            type: "FeatureCollection",
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        );
      };

      const result = await getTmapWalkingRoute(
        {
          endLat: 36.101,
          endLng: 128.431,
          endName: "강동병원앞",
          startLat: 36.1001,
          startLng: 128.4301,
          startName: "강동병원",
        },
        fetcher,
      );

      assert.equal(isTmapWalkingConfigured(), true);
      assert.equal(result.distanceMeters, 360);
      assert.equal(result.durationSeconds, 410);
      assert.equal(calls.length, 1);
      assert.equal(
        calls[0].url,
        "https://example.test/tmap/routes/pedestrian?version=1&callback=function",
      );
      assert.equal(calls[0].options.method, "POST");
      assert.equal(calls[0].options.cache, "no-store");
      assert.equal(calls[0].options.headers.appKey, "test-secret-key");

      const body = JSON.parse(calls[0].options.body);
      assert.equal(body.angle, 20);
      assert.equal(body.reqCoordType, "WGS84GEO");
      assert.equal(body.resCoordType, "WGS84GEO");
      assert.equal(body.speed, 30);
      assert.equal(body.startX, 128.4301);
      assert.equal(body.startY, 36.1001);
      assert.equal(body.endX, 128.431);
      assert.equal(body.endY, 36.101);
      assert.equal(body.startName, encodeURIComponent("강동병원"));
      assert.equal(body.endName, encodeURIComponent("강동병원앞"));
    },
  );
});

test("TMAP walking route client accepts callback-wrapped JSON payloads", async () => {
  await withTmapEnv(
    {
      TMAP_APP_KEY: "test-secret-key",
      TMAP_WALKING_BASE_URL: "https://example.test/tmap/routes/pedestrian",
      TMAP_WALKING_MODE: "live",
    },
    async () => {
      const result = await getTmapWalkingRoute(
        {
          endLat: 36.101,
          endLng: 128.431,
          startLat: 36.1001,
          startLng: 128.4301,
        },
        async () =>
          new Response(
            'function({"features":[{"properties":{"totalDistance":121,"totalTime":90}}]})',
            {
              headers: {
                "content-type": "application/javascript",
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

test("TMAP walking route client treats empty route summaries as provider errors", async () => {
  await withTmapEnv(
    {
      TMAP_APP_KEY: "test-secret-key",
      TMAP_WALKING_MODE: "live",
    },
    async () => {
      await assert.rejects(
        () =>
          getTmapWalkingRoute(
            {
              endLat: 36.101,
              endLng: 128.431,
              startLat: 36.1001,
              startLng: 128.4301,
            },
            async () =>
              new Response(
                JSON.stringify({
                  features: [],
                  type: "FeatureCollection",
                }),
                {
                  headers: {
                    "content-type": "application/json",
                  },
                  status: 200,
                },
              ),
          ),
        TmapWalkingRouteError,
      );
    },
  );
});

test("TMAP walking route client redacts appKey from provider text errors", async () => {
  await withTmapEnv(
    {
      TMAP_APP_KEY: "test-secret-key",
      TMAP_WALKING_MODE: "live",
    },
    async () => {
      await assert.rejects(
        async () =>
          getTmapWalkingRoute(
            {
              endLat: 36.101,
              endLng: 128.431,
              startLat: 36.1001,
              startLng: 128.4301,
            },
            async () =>
              new Response("Unauthorized test-secret-key", {
                headers: {
                  "content-type": "text/plain",
                },
                status: 401,
              }),
          ),
        (error) => {
          assert(error instanceof TmapWalkingRouteError);
          assert.equal(error.details?.status, 401);
          assert.match(
            error.details?.resultMsg ?? "",
            /\[REDACTED_TMAP_APP_KEY\]/,
          );
          assert.doesNotMatch(error.details?.resultMsg ?? "", /test-secret-key/);
          return true;
        },
      );
    },
  );
});

test("TMAP walking route mode can keep live calls disabled even with a key", async () => {
  await withTmapEnv(
    {
      TMAP_APP_KEY: "test-secret-key",
      TMAP_WALKING_MODE: "estimate",
    },
    async () => {
      assert.equal(isTmapWalkingConfigured(), false);
    },
  );
});
