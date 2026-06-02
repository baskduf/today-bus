import { NextResponse } from "next/server";
import { getSafeTagoErrorMessage } from "@/lib/tago/client";
import { getTagoDemoHealth } from "@/lib/transit/tago-provider";

export async function GET() {
  try {
    const health = await getTagoDemoHealth();
    const status = !health.keyConfigured ? 503 : health.ok ? 200 : 502;

    return NextResponse.json(
      {
        arrivalCount: health.arrivalCount,
        arrivalLookup: health.arrivalLookup,
        checkedAt: health.checkedAt,
        cityLookup: health.cityLookup,
        demo: {
          identifiers: health.identifiers,
        },
        fallbackRequired: health.fallbackRequired,
        keyConfigured: health.keyConfigured,
        mockFallbackRequired: health.mockFallbackRequired,
        ok: health.ok,
        routeLookup: health.routeLookup,
        routeStopOrder: health.routeStopOrder,
        timetableLookup: health.timetableLookup,
      },
      { status },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: getSafeTagoErrorMessage(error),
        keyConfigured: Boolean(process.env.TAGO_SERVICE_KEY?.trim()),
        ok: false,
      },
      { status: 502 },
    );
  }
}
