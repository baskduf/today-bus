"use client";

import { useState } from "react";
import { IconBell, IconCheck } from "@/components/icons/doodle-icons";
import { SketchButton } from "@/components/ui/sketch-button";
import { obColors } from "@/lib/design/tokens";

type NotificationButtonProps = {
  departureTime: string;
};

export function NotificationButton({ departureTime }: NotificationButtonProps) {
  const [requested, setRequested] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <SketchButton
        kind={requested ? "soft" : "primary"}
        onClick={() => setRequested(true)}
      >
        {requested ? (
          <IconCheck size={24} stroke={obColors.greenDeep} />
        ) : (
          <IconBell size={24} stroke="#1d3a29" />
        )}
        {requested ? `${departureTime} 출발 알림 준비됨` : "출발 알림 받기"}
      </SketchButton>
      <p
        aria-live="polite"
        className="min-h-5 text-center text-[14px] font-bold text-[var(--ob-text2)]"
      >
        {requested ? "MVP 임시 동작으로 화면 안에서만 표시됩니다." : ""}
      </p>
    </div>
  );
}
