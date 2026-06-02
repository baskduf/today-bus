import { NextResponse } from "next/server";
import {
  createTodayBusPlanResponse,
  type TodayBusPlanResponse,
} from "@/lib/today-bus/planner";
import { getSafeTagoErrorMessage } from "@/lib/tago/client";
import {
  createStationArrivalTime,
  normalizeTrainDepartureTime,
  tripDefaults,
  type TripInput,
} from "@/lib/today-bus/mock-plans";

type PlanRequestBody = {
  arrival?: string;
  desiredArrivalTime?: string;
  origin?: string;
  originAddress?: string;
  originLat?: number | string;
  originLng?: number | string;
  originPlaceName?: string;
  originSource?: TripInput["originSource"];
  safetyBufferMinutes?: number;
  stationBufferMinutes?: number;
  trainDeparture?: string;
  trainDepartureTime?: string;
};

function normalizeBody(body: PlanRequestBody): TripInput {
  const rawTrainDeparture = body.trainDeparture ?? body.trainDepartureTime;
  const trainDeparture =
    normalizeTrainDepartureTime(rawTrainDeparture) ??
    rawTrainDeparture ??
    tripDefaults.trainDeparture;
  const buffer =
    typeof body.stationBufferMinutes === "number"
      ? String(body.stationBufferMinutes)
      : typeof body.safetyBufferMinutes === "number"
        ? String(body.safetyBufferMinutes)
        : tripDefaults.buffer;

  return {
    arrival:
      (rawTrainDeparture
        ? createStationArrivalTime(trainDeparture, buffer)
        : undefined) ??
      body.arrival ??
      body.desiredArrivalTime ??
      tripDefaults.arrival,
    buffer,
    origin: body.origin ?? tripDefaults.origin,
    originAddress: body.originAddress,
    originLat:
      body.originLat === undefined ? undefined : String(body.originLat),
    originLng:
      body.originLng === undefined ? undefined : String(body.originLng),
    originPlaceName: body.originPlaceName,
    originSource: body.originSource,
    trainDeparture,
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
