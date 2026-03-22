import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "blue" | "green" | "amber" | "red" | "slate" | "purple";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeClasses: Record<BadgeVariant, string> = {
  blue: "bg-[rgba(65,150,70,0.12)] text-[#285e2d]",
  green: "bg-[rgba(65,150,70,0.16)] text-[#285e2d]",
  amber: "bg-[rgba(246,179,19,0.18)] text-[#9a6a00]",
  red: "bg-[rgba(255,75,25,0.16)] text-[color:var(--jo-coral-deep)]",
  slate: "bg-[rgba(217,212,202,0.55)] text-[color:var(--jo-muted)]",
  purple: "bg-[rgba(233,119,155,0.16)] text-[color:var(--jo-rose)]"
};

const Badge = ({ className, children, variant = "slate", ...props }: BadgeProps) => {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", badgeClasses[variant], className)}
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
