import Link from "next/link";
import { IconArrow, IconBus, IconWarn } from "@/components/icons/doodle-icons";
import { PlanCard } from "@/components/today-bus/plan-card";
import { TimelineStep } from "@/components/today-bus/timeline-step";
import { Badge } from "@/components/ui/badge";
import { SketchCard } from "@/components/ui/sketch-card";
import {
  resolveMissedPlanId,
  type TripSearchParams,
} from "@/lib/today-bus/mock-plans";
import { createTodayBusPlanResponseFromParams } from "@/lib/today-bus/planner";
import { obColors } from "@/lib/design/tokens";

type PlansPageProps = {
  searchParams: Promise<TripSearchParams>;
};

const sourceBadgeMeta = {
  gumi_bis_timetable: {
    label: "공식 시간표",
    tone: "mint",
  },
  mock: {
    label: "mock fallback",
    tone: "yellow",
  },
  tago: {
    label: "TAGO 실시간",
    tone: "mint",
  },
} as const;

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const params = await searchParams;
  const planResponse = await createTodayBusPlanResponseFromParams(params);
  const tripInput = planResponse.effectiveInput;
  const { itinerary } = planResponse;
  const { recoveryPlan, recommendedPlan } = planResponse;
  const missedPlanId = resolveMissedPlanId(params);
  const isMissedFlow = missedPlanId === recommendedPlan.id;
  const sourceBadge = sourceBadgeMeta[planResponse.source];

  return (
    <main className="min-h-screen bg-[var(--ob-bg)] px-4 py-6 text-[var(--ob-text)] sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <Link
            className="ob-pill ob-tap flex items-center gap-2 border-2 bg-[var(--ob-card)] px-4 py-2 text-[16px] font-bold text-[var(--ob-text)] no-underline"
            href="/"
            style={{ borderColor: obColors.inkSoft }}
          >
            <IconArrow size={20} stroke={obColors.text} />
            다시 검색
          </Link>
          <Badge tone={sourceBadge.tone}>{sourceBadge.label}</Badge>
        </header>

        {isMissedFlow ? (
          <SketchCard accent={obColors.text} bg={obColors.card} pad={18} radius="r2">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
                <IconWarn size={30} stroke={obColors.coralDeep} />
              </div>
              <div>
                <p className="text-[16px] font-bold text-[var(--ob-text2)]">
                  {recommendedPlan.busNumber} 놓쳤다면
                </p>
                <h2 className="text-[25px] font-black text-[var(--ob-coral-deep)]">
                  {recoveryPlan.boardingTime} 탑승
                </h2>
                <p className="mt-1 text-[17px] font-bold text-[var(--ob-text)]">
                  {recoveryPlan.arrivalTime} 도착
                </p>
              </div>
            </div>
          </SketchCard>
        ) : null}

        <PlanCard
          itinerary={itinerary}
          plan={recommendedPlan}
          tripInput={tripInput}
        />

        {recommendedPlan.timeline.length > 0 ? (
          <section className="flex flex-col gap-3" aria-label="타임라인">
            <div className="flex items-center gap-2">
              <IconBus size={30} stroke={obColors.ink} />
              <h2 className="text-[25px] font-black text-[var(--ob-text)]">
                타임라인
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
        ) : null}
      </div>
    </main>
  );
}
