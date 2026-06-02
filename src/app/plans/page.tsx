import Link from "next/link";
import {
  IconArrow,
  IconBusBig,
  IconWarn,
} from "@/components/icons/doodle-icons";
import { PlanCard } from "@/components/today-bus/plan-card";
import { StatusDecisionGuide } from "@/components/today-bus/status-decision-guide";
import { Badge } from "@/components/ui/badge";
import { SketchCard } from "@/components/ui/sketch-card";
import {
  busPlans,
  recoveryPlan,
  recommendedPlan,
  resolveMissedPlanId,
  resolveTripInput,
  type TripSearchParams,
} from "@/lib/today-bus/mock-plans";
import { obColors } from "@/lib/design/tokens";

type PlansPageProps = {
  searchParams: Promise<TripSearchParams>;
};

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const params = await searchParams;
  const tripInput = resolveTripInput(params);
  const missedPlanId = resolveMissedPlanId(params);
  const isMissedFlow = missedPlanId === recommendedPlan.id;
  const alternativePlans = busPlans.filter((plan) => !plan.primary);

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
          <Badge tone="mint">mock data</Badge>
        </header>

        <section className="flex flex-col gap-3 pt-2">
          <div className="flex items-center gap-3">
            <IconBusBig size={58} stroke={obColors.ink} />
            <div>
              <p className="text-[16px] font-bold text-[var(--ob-text2)]">
                {tripInput.origin} → {tripInput.destination} · {tripInput.arrival}
              </p>
              <h1 className="text-[28px] font-black leading-tight text-[var(--ob-text)]">
                오늘 나갈 시간을 골라보세요
              </h1>
            </div>
          </div>
          <p className="text-[17px] font-bold text-[var(--ob-text2)]">
            안전 여유 {tripInput.buffer}분 기준으로 추천 플랜을 먼저 보여드립니다.
          </p>
        </section>

        {isMissedFlow ? (
          <SketchCard accent={obColors.coral} bg="#FFF7F2" pad={18} radius="r2">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
                <IconWarn size={30} stroke={obColors.coralDeep} />
              </div>
              <div>
                <p className="text-[16px] font-bold text-[var(--ob-text2)]">
                  180번을 놓쳤다면
                </p>
                <h2 className="text-[25px] font-black text-[var(--ob-coral-deep)]">
                  다음은 {recoveryPlan.boardingTime}에 타는 플랜이에요
                </h2>
                <p className="mt-1 text-[17px] font-bold text-[var(--ob-text)]">
                  {recoveryPlan.arrivalTime} 도착 · 도착 희망보다 22분 늦어요
                </p>
              </div>
            </div>
          </SketchCard>
        ) : null}

        <PlanCard plan={recommendedPlan} tripInput={tripInput} />

        <section className="flex flex-col gap-3">
          <div>
            <p className="text-[16px] font-bold text-[var(--ob-text2)]">
              대안 플랜
            </p>
            <h2 className="text-[23px] font-black text-[var(--ob-text)]">
              놓쳤거나 너무 이르면 아래 플랜을 비교하세요
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {alternativePlans.map((plan) => (
              <PlanCard
                anchorId={plan.id}
                emphasis={
                  isMissedFlow && plan.id === recoveryPlan.id
                    ? "recovery"
                    : undefined
                }
                key={plan.id}
                plan={plan}
                tripInput={tripInput}
              />
            ))}
          </div>
        </section>

        <StatusDecisionGuide />
      </div>
    </main>
  );
}
