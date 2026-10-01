import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "blue" | "green" | "amber" | "red" | "slate" | "purple";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeClasses: Record<BadgeVariant, string> = {
  blue: "bg-sky-50 text-sky-700 border border-sky-200",
  green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border border-amber-200",
  red: "bg-red-50 text-red-700 border border-red-200",
  slate: "bg-slate-100 text-slate-700 border border-slate-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200"
};

const Badge = ({ className, children, variant = "slate", ...props }: BadgeProps) => {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeClasses[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};

const getStatusBadgeVariant = (status?: string | null): BadgeVariant => {
  const key = status?.toUpperCase();

  if (!key) {
    return "slate";
  }

  if (["ACTIVE", "APPROVED", "COMPLETED", "SUCCESS", "VERIFIED", "OPERATIONAL"].includes(key)) {
    return "green";
  }

  if (["PENDING", "SUBMITTED", "UNDER_REVIEW", "WAITING_USER", "WAITING_INTERNAL"].includes(key)) {
    return "amber";
  }

  if (["SUSPENDED", "REJECTED", "CANCELLED", "FAILED", "OPEN", "CRITICAL"].includes(key)) {
    return "red";
  }

  if (["MATCHED", "IN_PROGRESS", "INFO"].includes(key)) {
    return "blue";
  }

  if (["FEATURED", "ESCALATED"].includes(key)) {
    return "purple";
  }

  return "slate";
};

export { Badge, getStatusBadgeVariant };
