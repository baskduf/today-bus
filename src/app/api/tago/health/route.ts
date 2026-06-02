import { NextResponse } from "next/server";
import {
  getTagoDemoSnapshot,
  tagoDemoIdentifiers,
} from "@/lib/transit/tago-provider";

export async function GET() {
  try {
    const snapshot = await getTagoDemoSnapshot();

    return NextResponse.json({
      checkedAt: snapshot.checkedAt,
      configured: true,
      demo: {
        arrivalCount: snapshot.arrivals.length,
        city: snapshot.city,
        destinationStop: snapshot.destinationStop,
        originStop: snapshot.originStop,
        route: snapshot.route,
        routeStopCount: snapshot.routeStops.length,
        identifiers: tagoDemoIdentifiers,
      },
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: Boolean(process.env.TAGO_SERVICE_KEY),
        error: error instanceof Error ? error.message : "Unknown TAGO error",
        ok: false,
      },
      { status: 502 },
    );
  }
}
