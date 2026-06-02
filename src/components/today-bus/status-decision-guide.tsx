import { Badge } from "@/components/ui/badge";
import { SketchCard } from "@/components/ui/sketch-card";
import { obColors } from "@/lib/design/tokens";
import {
  planStatusMeta,
  statusDecisionExamples,
  type PlanStatus,
} from "@/lib/today-bus/mock-plans";

const statusAccents: Record<PlanStatus, string> = {
  caution: obColors.yellow,
  danger: obColors.coral,
  late: obColors.coral,
  safe: obColors.green,
  too_early: obColors.yellow,
};

export function StatusDecisionGuide() {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="text-[16px] font-bold text-[var(--ob-text2)]">
          상태별 판단 기준
        </p>
        <h2 className="text-[23px] font-black text-[var(--ob-text)]">
          안전 · 주의 · 위험 · 늦음 · 너무 이른
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {statusDecisionExamples.map((example) => {
          const meta = planStatusMeta[example.status];

          return (
            <SketchCard
              accent={statusAccents[example.status]}
              bg="#FFFFFF"
              key={example.status}
              pad={15}
              radius="card"
              shadow={false}
            >
              <div className="flex flex-col gap-2">
                <Badge tone={meta.tone}>{meta.badge}</Badge>
                <p className="text-[19px] font-black leading-tight text-[var(--ob-text)]">
                  {example.message}
                </p>
                <p className="text-[15px] font-bold leading-snug text-[var(--ob-text2)]">
                  {example.detail}
                </p>
              </div>
            </SketchCard>
          );
        })}
      </div>
    </section>
  );
}
