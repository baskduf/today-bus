import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { obColors, obRadii, type ObRadius } from "@/lib/design/tokens";

type SketchCardProps = HTMLAttributes<HTMLDivElement> & {
  accent?: string;
  bg?: string;
  borderWidth?: number;
  children: ReactNode;
  pad?: CSSProperties["padding"];
  radius?: ObRadius;
  shadow?: boolean;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function SketchCard({
  accent = obColors.inkSoft,
  bg = obColors.card,
  borderWidth = 2.4,
  children,
  className,
  onClick,
  pad = 18,
  radius = "card",
  role,
  shadow = true,
  style,
  tabIndex,
  ...props
}: SketchCardProps) {
  const interactive = typeof onClick === "function";

  return (
    <div
      className={classNames(obRadii[radius], interactive && "ob-tap", className)}
      role={role ?? (interactive ? "button" : undefined)}
      tabIndex={tabIndex ?? (interactive ? 0 : undefined)}
      onClick={onClick}
      style={{
        background: bg,
        border: `${borderWidth}px solid ${accent}`,
        boxShadow: shadow ? "0 8px 18px rgba(79,120,90,0.10)" : "none",
        padding: pad,
        position: "relative",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
