import type { ReactNode, SVGProps } from "react";
import { obColors } from "@/lib/design/tokens";

type DoodleProps = SVGProps<SVGSVGElement> & {
  children?: ReactNode;
  rough?: boolean;
  size?: number;
  stroke?: string;
  sw?: number;
  vb?: string;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Doodle({
  children,
  className,
  rough = true,
  size = 26,
  stroke = obColors.ink,
  style,
  sw = 2.2,
  vb = "0 0 32 32",
  ...props
}: DoodleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={vb}
      className={classNames(rough && "ob-rough", className)}
      style={{ display: "block", overflow: "visible", ...style }}
      fill="none"
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconBus(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M6 9c0-2 1.5-3 4-3.2C12.5 5.5 19.5 5.5 22 5.8c2.5.2 4 1.2 4 3.2v12c0 1-.6 1.6-1.6 1.6H7.6C6.6 21.6 6 21 6 20z" />
      <path d="M6.5 13.5h19" />
      <path d="M10 9.2h5M17 9.2h5" />
      <circle cx="10.5" cy="24.5" r="2" />
      <circle cx="21.5" cy="24.5" r="2" />
      <path d="M9 21.6v1.2M23 21.6v1.2" />
    </Doodle>
  );
}

export function IconBusBig(props: DoodleProps) {
  return (
    <Doodle vb="0 0 64 48" {...props}>
      <path d="M8 16c0-3 2-5 6-5.4C20 10 44 10 50 10.6c4 .4 6 2.4 6 5.4v18c0 1.6-1 2.6-2.6 2.6H10.6C9 36.6 8 35.6 8 34z" />
      <path d="M9 25h46" />
      <path d="M14 16h9M27 16h9M40 16h9" />
      <circle cx="18" cy="40" r="3.4" />
      <circle cx="46" cy="40" r="3.4" />
      <path d="M11 30.5c1.4.8 2.6.8 4 0M53 30.5c-1.4.8-2.6.8-4 0" />
    </Doodle>
  );
}

export function IconHome(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M5 15.5 16 6l11 9.5" />
      <path d="M8 14v11.5c0 .6.4 1 1 1h14c.6 0 1-.4 1-1V14" />
      <path d="M13 26.5v-6.5c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v6.5" />
    </Doodle>
  );
}

export function IconStation(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M9 13c0-3.3 3-6 7-6s7 2.7 7 6v9.5c0 1.4-1 2.5-2.4 2.5H11.4C10 24.5 9 23.4 9 22z" />
      <path d="M9.5 13.5h13" />
      <circle cx="16" cy="18" r="2.4" />
      <path d="M12 25l-2 3M20 25l2 3" />
    </Doodle>
  );
}

export function IconClock(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <circle cx="16" cy="16" r="10.5" />
      <path d="M16 9.5V16l4.5 3" />
    </Doodle>
  );
}

export function IconPin(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M16 28c5-6 8.5-10 8.5-14a8.5 8.5 0 1 0-17 0c0 4 3.5 8 8.5 14z" />
      <circle cx="16" cy="13.5" r="3.2" />
    </Doodle>
  );
}

export function IconArrow(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M20 7 11 16l9 9" />
    </Doodle>
  );
}

export function IconCheck(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M7 16.5 13 23 25 9" />
    </Doodle>
  );
}

export function IconWarn(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M16 6.5 27 25.5H5z" />
      <path d="M16 13v6" />
      <path d="M16 22.5v.5" />
    </Doodle>
  );
}

export function IconBell(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M16 6.5c-4 0-6.5 2.6-6.5 6.5 0 5-2 7-2 8.5 0 .6.4 1 1 1h15c.6 0 1-.4 1-1 0-1.5-2-3.5-2-8.5 0-3.9-2.5-6.5-6.5-6.5z" />
      <path d="M13.5 25.5c.5 1.5 1.4 2.2 2.5 2.2s2-.7 2.5-2.2" />
      <path d="M16 6.5V4.5" />
    </Doodle>
  );
}

export function IconSpark(props: DoodleProps) {
  return (
    <Doodle sw={2} {...props}>
      <path d="M16 6c.6 4.6 1.4 5.4 6 6-4.6.6-5.4 1.4-6 6-.6-4.6-1.4-5.4-6-6 4.6-.6 5.4-1.4 6-6z" />
    </Doodle>
  );
}

export function IconSwap(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M11 7v17M11 7 7.5 11M11 7l3.5 4" />
      <path d="M21 25V8M21 25l3.5-4M21 25l-3.5-4" />
    </Doodle>
  );
}

export function IconStop(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <path d="M9 5h12c1.1 0 2 .9 2 2v7c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2z" />
      <path d="M11 9.5h8M11 12h5" />
      <path d="M15 16v11" />
      <path d="M11.5 27h7" />
    </Doodle>
  );
}

export function IconWalk(props: DoodleProps) {
  return (
    <Doodle {...props}>
      <circle cx="18" cy="6.5" r="2.4" />
      <path d="M18 10.5 14.5 19l-3.5 6" />
      <path d="M18 10.5 21.5 18l3 4.5" />
      <path d="M14.7 14.5 9 13M16.8 14.2 23 16" />
      <path d="M14.5 19 19 21" />
    </Doodle>
  );
}
