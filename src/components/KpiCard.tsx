import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type KpiVariant = "neutral" | "success" | "danger" | "warning";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle: ReactNode;
  icon: LucideIcon;
  variant?: KpiVariant;
  iconVariant?: KpiVariant;
}

const variantStyles: Record<
  KpiVariant,
  { iconWrap: string; icon: string; subtitle: string }
> = {
  neutral: {
    iconWrap: "bg-slate-100",
    icon: "text-slate-600",
    subtitle: "text-gray-500 dark:text-slate-400",
  },
  success: {
    iconWrap: "bg-green-100",
    icon: "text-green-600",
    subtitle: "text-green-600",
  },
  danger: {
    iconWrap: "bg-red-100",
    icon: "text-red-600",
    subtitle: "text-red-600",
  },
  warning: {
    iconWrap: "bg-amber-100",
    icon: "text-amber-600",
    subtitle: "text-amber-600",
  },
};

export const KpiCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "neutral",
  iconVariant,
}: KpiCardProps) => {
  const styles = variantStyles[variant];
  const iconStyles = variantStyles[iconVariant || variant];

  return (
    <Card className="h-[148px] md:h-[156px] p-5">
      <div className="flex h-full items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconStyles.iconWrap}`}
        >
          <Icon className={`h-5 w-5 ${iconStyles.icon}`} />
        </div>
        <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-1">
          <p className="truncate text-sm text-gray-600 dark:text-slate-300" title={title}>
            {title}
          </p>
          <p className="truncate whitespace-nowrap text-3xl font-bold leading-tight text-gray-900 dark:text-slate-100">
            {value}
          </p>
          <p
            className={`truncate text-sm font-medium ${styles.subtitle}`}
            title={typeof subtitle === "string" ? subtitle : undefined}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </Card>
  );
};

