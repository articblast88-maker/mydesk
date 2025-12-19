import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowDown, ArrowUp, Flame } from "lucide-react";

interface PriorityBadgeProps {
  priority: string;
  showIcon?: boolean;
  className?: string;
}

const priorityConfig: Record<string, { label: string; className: string; Icon: typeof ArrowUp }> = {
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400",
    Icon: ArrowDown,
  },
  medium: {
    label: "Medium",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Icon: ArrowUp,
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    Icon: AlertTriangle,
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Icon: Flame,
  },
};

export function PriorityBadge({ priority, showIcon = true, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  const { Icon } = config;
  
  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium text-xs no-default-hover-elevate no-default-active-elevate",
        config.className,
        className
      )}
      data-testid={`badge-priority-${priority}`}
    >
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
