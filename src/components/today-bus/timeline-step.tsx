import {
  IconBus,
  IconCheck,
  IconHome,
  IconStation,
  IconWalk,
} from "@/components/icons/doodle-icons";
import { SketchCard } from "@/components/ui/sketch-card";
import { obColors } from "@/lib/design/tokens";
import type { TimelineStep as TimelineStepType } from "@/lib/today-bus/mock-plans";

type TimelineStepProps = {
  isLast: boolean;
  step: TimelineStepType;
};

function StepIcon({ kind }: { kind: TimelineStepType["kind"] }) {
  const props = { size: 25, stroke: obColors.text };

  if (kind === "home") return <IconHome {...props} />;
  if (kind === "stop") return <IconStation {...props} />;
  if (kind === "bus") return <IconBus {...props} />;
  if (kind === "walk") return <IconWalk {...props} />;
  return <IconCheck {...props} />;
}

export function TimelineStep({ isLast, step }: TimelineStepProps) {
  return (
    <div className="relative grid grid-cols-[46px_1fr] gap-3">
      {!isLast ? (
        <div className="absolute left-[22px] top-12 h-[calc(100%-10px)] border-l-[3px] border-dashed border-[var(--ob-ink-soft)]" />
      ) : null}
      <div
        className="relative z-10 flex h-[46px] w-[46px] items-center justify-center rounded-full border-[2.4px] bg-[var(--ob-yellow)]"
        style={{ borderColor: obColors.inkSoft }}
      >
        <StepIcon kind={step.kind} />
      </div>
      <SketchCard accent={obColors.inkSoft} bg="#FFFFFF" pad={16} radius="card">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="text-[27px] font-black leading-tight text-[var(--ob-text)]">
            {step.time} {step.label}
          </p>
          <p className="text-[17px] font-bold text-[var(--ob-text2)]">
            {step.detail}
          </p>
        </div>
      </SketchCard>
    </div>
  );
}
