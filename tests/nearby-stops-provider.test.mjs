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
const { createTagoNearbyStopsProvider } = jiti(
  path.join(projectRoot, "src/lib/transit/nearby-stops-provider.ts"),
);

test("nearby stops provider uses TAGO endpoint-specific stop route params", async () => {
  const calls = [];
  const provider = createTagoNearbyStopsProvider(async (options) => {
    calls.push(options);
    return {
      header: {},
      items: [
        {
          routeid: "GMB18730",
          routeno: 187,
        },
      ],
      totalCount: 1,
    };
  });

  await provider.getStopRoutes("37050", "GMB16");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/getSttnThrghRouteList");
  assert.equal(calls[0].service, "station");
  assert.equal(calls[0].params.cityCode, "37050");
  assert.equal(calls[0].params.nodeid, "GMB16");
  assert.equal(calls[0].params.nodeId, undefined);
});
