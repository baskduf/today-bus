import type { HTMLAttributes } from "react";
import { IconArrow } from "@/components/icons/doodle-icons";
import { obColors } from "@/lib/design/tokens";

type ObHeaderProps = HTMLAttributes<HTMLDivElement> & {
  onBack?: () => void;
  subtitle?: string;
  title: string;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ObHeader({
  className,
  onBack,
  subtitle,
  title,
  ...props
}: ObHeaderProps) {
  return (
    <div
      className={classNames("ob-header", className)}
      style={{
        alignItems: "center",
        display: "flex",
        gap: 12,
        padding: "56px 20px 6px",
      }}
      {...props}
    >
      {onBack ? (
        <button
          aria-label="뒤로 가기"
          className="ob-tap"
          onClick={onBack}
          type="button"
          style={{
            alignItems: "center",
            background: obColors.card,
            border: `2.4px solid ${obColors.inkSoft}`,
            boxShadow: "0 4px 10px rgba(79,120,90,0.10)",
            display: "flex",
            flexShrink: 0,
            height: 42,
            justifyContent: "center",
            width: 42,
            borderRadius: "18px 15px 19px 14px / 14px 19px 15px 18px",
          }}
        >
          <IconArrow size={22} stroke={obColors.text} />
        </button>
      ) : null}
      <div>
        <div
          style={{
            color: obColors.text,
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div style={{ color: obColors.text2, fontSize: 17, marginTop: 3 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
