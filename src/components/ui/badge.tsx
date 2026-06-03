import type { HTMLAttributes, ReactNode } from "react";
import { obColors } from "@/lib/design/tokens";

type BadgeTone = "coral" | "mint" | "yellow";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const tones = {
  coral: {
    bg: "#FFFFFF",
    border: obColors.text,
    color: obColors.text,
  },
  mint: {
    bg: "#FFFFFF",
    border: obColors.text,
    color: obColors.text,
  },
  yellow: {
    bg: obColors.yellow,
    border: obColors.text,
    color: obColors.text,
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
        fontFamily: "var(--font-ob-hand)",
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
