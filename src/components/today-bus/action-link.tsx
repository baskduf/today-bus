import Link, { type LinkProps } from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  obButtonKinds,
  obShadows,
  type ObButtonKind,
} from "@/lib/design/tokens";

type ActionLinkProps = {
  big?: boolean;
  children: ReactNode;
  className?: string;
  href: LinkProps["href"];
  kind?: ObButtonKind;
  style?: CSSProperties;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ActionLink({
  big = false,
  children,
  className,
  href,
  kind = "primary",
  style,
}: ActionLinkProps) {
  const color = obButtonKinds[kind];

  return (
    <Link
      className={classNames("ob-pill ob-tap", className)}
      href={href}
      style={
        {
          "--ob-button-border": color.border,
          alignItems: "center",
          appearance: "none",
          background: color.bg,
          border: `2.6px solid ${color.border}`,
          boxShadow: obShadows.button,
          color: color.color,
          display: "flex",
          fontFamily: "var(--font-ob-hand)",
          fontSize: big ? 23 : 19,
          fontWeight: 700,
          gap: 9,
          justifyContent: "center",
          padding: big ? "15px 20px" : "11px 18px",
          textDecoration: "none",
          whiteSpace: "nowrap",
          width: "100%",
          wordBreak: "keep-all",
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </Link>
  );
}
