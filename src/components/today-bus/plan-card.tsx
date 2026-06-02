import { IconBus, IconClock, IconPin } from "@/components/icons/doodle-icons";
import { Badge } from "@/components/ui/badge";
import { SketchCard } from "@/components/ui/sketch-card";
import { obColors } from "@/lib/design/tokens";
import {
  planStatusMeta,
  type BusPlan,
  type TripInput,
  createTripHref,
} from "@/lib/today-bus/mock-plans";
import type { TodayBusItinerary } from "@/lib/transit/demo-route";
import { ActionLink } from "./action-link";

type PlanCardProps = {
  anchorId?: string;
  emphasis?: "recovery";
  itinerary: TodayBusItinerary;
  plan: BusPlan;
  tripInput: TripInput;
};

const statusAccents = {
  caution: obColors.yellow,
  danger: obColors.coral,
  late: obColors.coral,
  safe: obColors.green,
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
  const detailHref = createTripHref("/plans/recommended", tripInput);
  const isRecovery = emphasis === "recovery";

  return (
    <SketchCard
      accent={isRecovery ? obColors.coral : statusAccents[plan.status]}
      bg={isRecovery ? "#FFF7F2" : plan.primary ? "#FFFDF7" : "#FFFFFF"}
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
              {plan.label}
            </p>
            {plan.primary ? (
              <p className="mt-1 text-[15px] font-bold text-[var(--ob-green-deep)]">
                오늘 가장 행동하기 쉬운 선택
              </p>
            ) : null}
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
            {plan.departureTime} 집에서 출발
          </p>
          <p className="mt-2 text-[17px] font-bold text-[var(--ob-text2)]">
            {itinerary.originPlace.label}에서{" "}
            {itinerary.boardingStop.name} 정류장으로
          </p>
        </div>

        <div className="grid gap-3 text-[18px] font-bold text-[var(--ob-text)] sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <IconClock size={24} stroke={obColors.ink} />
            <span>{plan.departureTime} 출발</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ob-text2)]">
            <IconBus size={24} stroke={obColors.ink} />
            <span>
              {plan.boardingTime} {plan.busNumber} {itinerary.route.directionLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <IconPin size={24} stroke={obColors.ink} />
            <span>
              {plan.arrivalTime} {itinerary.destinationPlace.label} 도착
            </span>
          </div>
        </div>

        {plan.primary ? (
          <div className="rounded-[20px] border-2 border-dashed border-[var(--ob-ink-soft)] bg-white px-4 py-3">
            <p className="text-[19px] font-black text-[var(--ob-text)]">
              {plan.boardingTime} {itinerary.boardingStop.name}에서{" "}
              {plan.busNumber} 탑승
            </p>
            <p className="mt-1 text-[17px] font-bold text-[var(--ob-text2)]">
              {plan.dropOffTime} {itinerary.alightingStop.name} 하차 ·{" "}
              {plan.arrivalTime} {itinerary.destinationPlace.label} 도착
            </p>
            <p className="mt-2 text-[17px] font-bold text-[var(--ob-green-deep)]">
              {plan.summaryLine}
            </p>
          </div>
        ) : (
          <div className="rounded-[18px] border-2 border-dashed border-[var(--ob-ink-soft)] bg-[var(--ob-card)] px-4 py-3">
            <p className="text-[18px] font-black text-[var(--ob-text)]">
              {plan.summaryLine}
            </p>
            <p className="mt-1 text-[16px] font-bold text-[var(--ob-text2)]">
              {plan.statusLine}
            </p>
          </div>
        )}

        <div>
          <p
            className={
              plan.status === "late"
                ? "text-[19px] font-black text-[var(--ob-coral-deep)]"
                : "text-[19px] font-black text-[var(--ob-text)]"
            }
          >
            {plan.statusNote}
          </p>
          {plan.primary ? (
            <p className="mt-1 text-[16px] font-bold text-[var(--ob-text2)]">
              버스 번호는 보조 정보예요. 먼저 집에서 나갈 시간을 맞추세요.
            </p>
          ) : null}
        </div>

        {plan.primary ? (
          <ActionLink href={detailHref} kind="primary">
            타임라인 보기
          </ActionLink>
        ) : null}
      </div>
    </SketchCard>
  );
}
