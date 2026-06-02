import type { HTMLAttributes, ReactNode } from "react";
import { obColors } from "@/lib/design/tokens";

type BadgeTone = "coral" | "mint" | "yellow";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const tones = {
  coral: {
    bg: "#FFEDE7",
    border: obColors.coral,
    color: obColors.coralDeep,
  },
  mint: {
    bg: "#E7F6EC",
    border: obColors.mint,
    color: obColors.greenDeep,
  },
  yellow: {
    bg: "#FFF6DB",
    border: obColors.yellow,
    color: "#B8860B",
  },
} as const;

export function Badge({
  children,
  style,
  tone = "coral",
  ...props
}: BadgeProps) {
  const color = tones[tone];

  return (
    <span
      style={{
        alignItems: "center",
        background: color.bg,
        border: `2px solid ${color.border}`,
        borderRadius: "16px 12px 18px 11px / 11px 18px 12px 16px",
        color: color.color,
        display: "inline-flex",
        fontSize: 15,
        fontWeight: 700,
        gap: 5,
        lineHeight: 1,
        padding: "6px 12px",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
