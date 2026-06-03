import { IconBus, IconClock, IconPin } from "@/components/icons/doodle-icons";
import { Badge } from "@/components/ui/badge";
import { SketchCard } from "@/components/ui/sketch-card";
import { obColors } from "@/lib/design/tokens";
import {
  formatTripDateTime,
  planStatusMeta,
  type BusPlan,
  type TripInput,
} from "@/lib/today-bus/mock-plans";
import type { TodayBusItinerary } from "@/lib/transit/demo-route";

type PlanCardProps = {
  anchorId?: string;
  emphasis?: "recovery";
  itinerary: TodayBusItinerary;
  plan: BusPlan;
  tripInput: TripInput;
};

const statusAccents = {
  caution: obColors.yellow,
  danger: obColors.text,
  late: obColors.text,
  safe: obColors.text,
  too_early: obColors.yellow,
} as const;

export function PlanCard({
  anchorId,
  emphasis,
  itinerary,
  plan,
  tripInput,
}: PlanCardProps) {
  const status = planStatusMeta[plan.status];
  const isRecovery = emphasis === "recovery";
  const trainDepartureClock = formatTripDateTime(tripInput.trainDeparture);
  const stationArrivalClock = formatTripDateTime(tripInput.arrival);

  return (
    <SketchCard
      accent={isRecovery ? obColors.coral : statusAccents[plan.status]}
      bg={isRecovery ? obColors.card : plan.primary ? obColors.card : "#FFFFFF"}
      borderWidth={plan.primary || isRecovery ? 3 : 2.2}
      id={anchorId ?? plan.id}
      pad={plan.primary ? 22 : 18}
      radius={plan.primary ? "r3" : "card"}
      shadow={plan.primary || isRecovery}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[16px] font-bold text-[var(--ob-text2)]">
              {plan.primary ? "추천 플랜" : plan.label}
            </p>
            {isRecovery ? (
              <p className="mt-1 text-[15px] font-bold text-[var(--ob-coral-deep)]">
                놓친 뒤 다음 행동
              </p>
            ) : null}
          </div>
          <Badge tone={status.tone}>{status.badge}</Badge>
        </div>

        <div>
          <p
            className={
              plan.primary
                ? "text-[44px] font-black leading-[1.03] tracking-normal text-[var(--ob-text)] sm:text-[56px]"
                : "text-[28px] font-black leading-tight text-[var(--ob-text)]"
            }
          >
            {plan.departureTime} 출발
          </p>
          <p className="mt-2 text-[17px] font-bold text-[var(--ob-text2)]">
            {trainDepartureClock} 기차 · {stationArrivalClock}까지 구미역
          </p>
        </div>

        <div className="grid gap-3 text-[18px] font-bold text-[var(--ob-text)] sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <IconClock size={24} stroke={obColors.ink} />
            <span>{plan.boardingTime} 탑승</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ob-text2)]">
            <IconBus size={24} stroke={obColors.ink} />
            <span>
              {itinerary.boardingStop.name} · {plan.busNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <IconPin size={24} stroke={obColors.ink} />
            <span>
              {plan.arrivalTime} 도착
            </span>
          </div>
        </div>
      </div>
    </SketchCard>
  );
}
