import { type LucideIcon } from "lucide-react";

import { formatCurrency } from "@/lib/utils";

interface InsightMetricCardProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  accent: string;
}

const InsightMetricCard = ({ label, value, helper, icon: Icon, accent }: InsightMetricCardProps) => (
  <div className="relative overflow-hidden rounded-[1.5rem] border border-[rgba(112,104,84,0.14)] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(250,245,236,0.96))] p-5 shadow-[0_18px_40px_rgba(71,61,45,0.08)]">
    <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: accent }} />
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:rgba(107,114,102,0.82)]">{label}</p>
        <p className="mt-3 text-3xl font-extrabold tracking-tight text-[color:var(--jo-ink)]">{value}</p>
        <p className="mt-2 text-sm text-[color:var(--jo-muted)]">{helper}</p>
      </div>
      <div className="rounded-2xl bg-[rgba(65,150,70,0.08)] p-3">
        <Icon className="h-5 w-5 text-[color:var(--jo-forest)]" />
      </div>
    </div>
  </div>
);

interface RevenueRibbonProps {
  title: string;
  amountMinor: number;
  subtitle: string;
}

const RevenueRibbon = ({ title, amountMinor, subtitle }: RevenueRibbonProps) => (
  <div className="rounded-[1.75rem] border border-[rgba(112,104,84,0.12)] bg-[linear-gradient(135deg,#173328_0%,#2f6b35_34%,#f6b313_82%,#ff4b19_125%)] p-6 text-white shadow-[0_28px_60px_rgba(23,51,40,0.28)]">
    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(255,248,235,0.82)]">{title}</p>
    <p className="mt-3 text-4xl font-black tracking-tight">{formatCurrency(amountMinor)}</p>
    <p className="mt-3 max-w-lg text-sm text-[rgba(255,248,235,0.82)]">{subtitle}</p>
  </div>
);

export { InsightMetricCard, RevenueRibbon };
