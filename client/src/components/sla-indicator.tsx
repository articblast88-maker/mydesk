import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SlaIndicatorProps {
  deadline: Date | null;
  className?: string;
  compact?: boolean;
}

function getTimeRemaining(deadline: Date): { text: string; percentage: number; status: "ok" | "warning" | "danger" } {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { text: "Overdue", percentage: 100, status: "danger" };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  let text = "";
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    text = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m`;
  } else {
    text = `${minutes}m`;
  }
  
  // Assume 24h SLA for percentage calculation
  const totalTime = 24 * 60 * 60 * 1000;
  const elapsed = totalTime - diff;
  const percentage = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
  
  let status: "ok" | "warning" | "danger" = "ok";
  if (hours < 1) {
    status = "danger";
  } else if (hours < 4) {
    status = "warning";
  }
  
  return { text, percentage, status };
}

const statusColors = {
  ok: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
};

export function SlaIndicator({ deadline, className, compact = false }: SlaIndicatorProps) {
  if (!deadline) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        No SLA
      </span>
    );
  }
  
  const { text, percentage, status } = getTimeRemaining(deadline);
  
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5", className)} data-testid="sla-indicator">
            <Clock className={cn("h-3 w-3", {
              "text-green-500": status === "ok",
              "text-yellow-500": status === "warning",
              "text-red-500": status === "danger",
            })} />
            <span className={cn("text-xs font-mono", {
              "text-green-600 dark:text-green-400": status === "ok",
              "text-yellow-600 dark:text-yellow-400": status === "warning",
              "text-red-600 dark:text-red-400": status === "danger",
            })}>
              {text}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>SLA Response Time: {text} remaining</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <div className={cn("space-y-1.5", className)} data-testid="sla-indicator-full">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">SLA Deadline</span>
        <span className={cn("text-xs font-mono font-medium", {
          "text-green-600 dark:text-green-400": status === "ok",
          "text-yellow-600 dark:text-yellow-400": status === "warning",
          "text-red-600 dark:text-red-400": status === "danger",
        })}>
          {text}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn("h-1.5", statusColors[status])}
      />
    </div>
  );
}
