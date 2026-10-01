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
  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
        <p className="mt-1.5 text-xs font-medium text-slate-600 leading-relaxed">{helper}</p>
      </div>
      <div className="rounded-xl bg-slate-100 p-2.5">
        <Icon className="h-5 w-5 text-slate-700" />
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
  <div className="rounded-2xl border border-sky-800 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white shadow-md">
    <p className="text-xs font-bold uppercase tracking-wider text-sky-300">{title}</p>
    <p className="mt-2 text-4xl font-black tracking-tight text-white">{formatCurrency(amountMinor)}</p>
    <p className="mt-2 max-w-xl text-sm font-medium text-slate-300 leading-relaxed">{subtitle}</p>
  </div>
);

export { InsightMetricCard, RevenueRibbon };
