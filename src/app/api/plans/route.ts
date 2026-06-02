import { NextResponse } from "next/server";
import {
  createTodayBusPlanResponse,
  type TodayBusPlanResponse,
} from "@/lib/today-bus/planner";
import { getSafeTagoErrorMessage } from "@/lib/tago/client";
import { tripDefaults, type TripInput } from "@/lib/today-bus/mock-plans";

type PlanRequestBody = {
  arrival?: string;
  desiredArrivalTime?: string;
  destination?: string;
  origin?: string;
  safetyBufferMinutes?: number;
};

function normalizeBody(body: PlanRequestBody): TripInput {
  return {
    arrival: body.arrival ?? body.desiredArrivalTime ?? tripDefaults.arrival,
    buffer:
      typeof body.safetyBufferMinutes === "number"
        ? String(body.safetyBufferMinutes)
        : tripDefaults.buffer,
    destination: body.destination ?? tripDefaults.destination,
    origin: body.origin ?? tripDefaults.origin,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PlanRequestBody;
    const response: TodayBusPlanResponse = await createTodayBusPlanResponse(
      normalizeBody(body),
    );

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: getSafeTagoErrorMessage(error, "Unable to create bus plans"),
      },
      { status: 400 },
    );
  }
}
