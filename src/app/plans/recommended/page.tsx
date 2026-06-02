import Link from "next/link";
import { ActionLink } from "@/components/today-bus/action-link";
import { NotificationButton } from "@/components/today-bus/notification-button";
import { TimelineStep } from "@/components/today-bus/timeline-step";
import { Badge } from "@/components/ui/badge";
import { SketchCard } from "@/components/ui/sketch-card";
import {
  createTripHref,
  planStatusMeta,
  type TripSearchParams,
} from "@/lib/today-bus/mock-plans";
import { createTodayBusPlanResponseFromParams } from "@/lib/today-bus/planner";
import { IconArrow, IconBus, IconWarn } from "@/components/icons/doodle-icons";
import { obColors } from "@/lib/design/tokens";

type RecommendedPageProps = {
  searchParams: Promise<TripSearchParams>;
};

export default async function RecommendedPlanPage({
  searchParams,
}: RecommendedPageProps) {
  const planResponse = await createTodayBusPlanResponseFromParams(
    await searchParams,
  );
  const tripInput = planResponse.effectiveInput;
  const { itinerary } = planResponse;
  const { recoveryPlan, recommendedPlan } = planResponse;
  const { train } = planResponse;
  const plansHref = createTripHref("/plans", tripInput);
  const missedHref = `${createTripHref("/plans", tripInput, {
    missed: recommendedPlan.id,
  })}#${recoveryPlan.id}`;
  const statusMeta = planStatusMeta[recommendedPlan.status];
  const summaryClassName =
    recommendedPlan.status === "late"
      ? "text-[25px] font-black text-[var(--ob-coral-deep)]"
      : recommendedPlan.status === "safe"
        ? "text-[25px] font-black text-[var(--ob-green-deep)]"
        : "text-[25px] font-black text-[var(--ob-text2)]";
  const riskTitle = recommendedPlan.missedDelayMinutes
    ? recommendedPlan.statusNote
    : recommendedPlan.statusLine;
  const riskBody = recommendedPlan.missedDelayMinutes
    ? recommendedPlan.statusLine
    : recommendedPlan.statusNote;

  return (
    <main className="min-h-screen bg-[var(--ob-bg)] px-4 py-6 text-[var(--ob-text)] sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <Link
            className="ob-pill ob-tap flex items-center gap-2 border-2 bg-[var(--ob-card)] px-4 py-2 text-[16px] font-bold text-[var(--ob-text)] no-underline"
            href={plansHref}
            style={{ borderColor: obColors.inkSoft }}
          >
            <IconArrow size={20} stroke={obColors.text} />
            다른 플랜
          </Link>
          <Badge tone={statusMeta.tone}>{statusMeta.badge}</Badge>
        </header>

        <section className="flex flex-col gap-2 pt-3">
          <p className="text-[17px] font-bold text-[var(--ob-text2)]">
            {itinerary.originPlace.label}에서 {itinerary.boardingStop.name}{" "}
            정류장까지 먼저 이동 · {train.departureTime} 구미역 기차
          </p>
          <h1 className="text-[43px] font-black leading-[1.04] text-[var(--ob-text)] sm:text-[58px]">
            {recommendedPlan.departureTime}에 출발하면 됩니다
          </h1>
          <p className={summaryClassName}>{recommendedPlan.summaryLine}</p>
          <p className="text-[17px] font-bold text-[var(--ob-text2)]">
            {itinerary.route.routeNo}번 {itinerary.route.directionLabel} 탑승 ·{" "}
            {itinerary.alightingStop.name} 하차 후{" "}
            {itinerary.destinationPlace.label}까지 도보{" "}
            {itinerary.destinationPlace.walkMinutesFromAlightingStop}분 ·{" "}
            {train.stationArrivalDeadline}까지 역 도착 기준
          </p>
        </section>

        <SketchCard accent={obColors.coral} bg="#FFF7F2" pad={18} radius="r2">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
              <IconWarn size={30} stroke={obColors.coralDeep} />
            </div>
            <div>
              <p className="text-[25px] font-black text-[var(--ob-coral-deep)]">
                {riskTitle}
              </p>
              <p className="mt-1 text-[19px] font-black text-[var(--ob-text)]">
                {riskBody}
              </p>
              <p className="mt-2 text-[16px] font-bold text-[var(--ob-text2)]">
                다음 대안은 {recoveryPlan.boardingTime} 탑승,{" "}
                {recoveryPlan.arrivalTime} 도착입니다.
              </p>
            </div>
          </div>
        </SketchCard>

        {planResponse.warnings.length > 0 ? (
          <SketchCard accent={obColors.yellow} bg="#FFF9E8" pad={16} radius="r2">
            <div className="flex flex-col gap-1">
              {planResponse.warnings.map((warning) => (
                <p
                  className="text-[16px] font-bold text-[var(--ob-text)]"
                  key={warning}
                >
                  {warning}
                </p>
              ))}
            </div>
          </SketchCard>
        ) : null}

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconBus size={30} stroke={obColors.ink} />
            <h2 className="text-[25px] font-black text-[var(--ob-text)]">
              따라 할 타임라인
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {recommendedPlan.timeline.map((step, index) => (
              <TimelineStep
                isLast={index === recommendedPlan.timeline.length - 1}
                key={`${step.time}-${step.label}`}
                step={step}
              />
            ))}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <NotificationButton departureTime={recommendedPlan.departureTime} />
          <ActionLink href={missedHref} kind="coral">
            버스를 놓쳤어요
          </ActionLink>
          <ActionLink href={plansHref} kind="ghost">
            다른 플랜 보기
          </ActionLink>
        </div>
      </div>
    </main>
  );
}
