import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import {
  obButtonKinds,
  obShadows,
  type ObButtonKind,
} from "@/lib/design/tokens";

type SketchButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  big?: boolean;
  children: ReactNode;
  kind?: ObButtonKind;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function SketchButton({
  big = false,
  children,
  className,
  kind = "primary",
  style,
  type = "button",
  ...props
}: SketchButtonProps) {
  const color = obButtonKinds[kind];

  return (
    <button
      className={classNames("ob-pill ob-tap", className)}
      type={type}
      style={
        {
          "--ob-button-border": color.border,
          alignItems: "center",
          appearance: "none",
          background: color.bg,
          border: `2.6px solid ${color.border}`,
          boxShadow: obShadows.button,
          color: color.color,
          cursor: "pointer",
          display: "flex",
          fontFamily: "var(--font-ob-hand)",
          fontSize: big ? 23 : 19,
          fontWeight: 700,
          gap: 9,
          justifyContent: "center",
          padding: big ? "15px 20px" : "11px 18px",
          whiteSpace: "nowrap",
          width: "100%",
          wordBreak: "keep-all",
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </button>
  );
}
