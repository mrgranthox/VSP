import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

const palette = ["#2457F5", "#16A34A", "#F59E0B", "#7C3AED", "#DC2626", "#0F172A"];

interface ChartCardShellProps {
  title: string;
  description: string;
  value?: string;
  tone?: "default" | "info";
  children: ReactNode;
}

const ChartCardShell = ({ title, description, value, tone = "default", children }: ChartCardShellProps) => (
  <Card
    className={cn(
      "overflow-hidden border-white/60 bg-white/90 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur",
      tone === "info" && "bg-[radial-gradient(circle_at_top_left,_rgba(36,87,245,0.1),_rgba(255,255,255,0.92)_45%)]"
    )}
  >
    <CardHeader className="pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        {value ? <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">{value}</span> : null}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

interface DonutChartCardProps {
  title: string;
  description: string;
  data: Array<{ name: string; value: number }>;
  centerLabel: string;
  centerValue: string;
}

const DonutChartCard = ({ title, description, data, centerLabel, centerValue }: DonutChartCardProps) => (
  <ChartCardShell description={description} title={title}>
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="relative h-[240px]">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie cx="50%" cy="50%" data={data} dataKey="value" innerRadius={68} outerRadius={96} paddingAngle={3}>
              {data.map((entry, index) => (
                <Cell fill={palette[index % palette.length]} key={entry.name} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatNumber(typeof value === "number" ? value : Number(value ?? 0))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{centerLabel}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{centerValue}</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((entry, index) => (
          <div className="flex items-center justify-between rounded-[1.25rem] border border-slate-100 bg-slate-50/80 px-4 py-3" key={entry.name}>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
              <span className="text-sm font-semibold text-slate-700">{entry.name}</span>
            </div>
            <span className="text-sm font-bold text-slate-950">{formatNumber(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  </ChartCardShell>
);

interface AreaTrendCardProps {
  title: string;
  description: string;
  value?: string;
  data: Array<{ label: string; value: number }>;
  color?: string;
}

const AreaTrendCard = ({ title, description, value, data, color = "#2457F5" }: AreaTrendCardProps) => (
  <ChartCardShell description={description} title={title} value={value}>
    <div className="h-[280px]">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={`area-${title}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.34} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
          <Tooltip formatter={(chartValue) => formatNumber(typeof chartValue === "number" ? chartValue : Number(chartValue ?? 0))} />
          <Area dataKey="value" fill={`url(#area-${title})`} stroke={color} strokeWidth={3} type="monotone" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </ChartCardShell>
);

interface BarMetricCardProps {
  title: string;
  description: string;
  data: Array<{ name: string; value: number }>;
}

const BarMetricCard = ({ title, description, data }: BarMetricCardProps) => (
  <ChartCardShell description={description} title={title}>
    <div className="h-[280px]">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
          <XAxis axisLine={false} dataKey="name" tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
          <Tooltip formatter={(value) => formatNumber(typeof value === "number" ? value : Number(value ?? 0))} />
          <Bar dataKey="value" fill="#2457F5" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </ChartCardShell>
);

interface InsightMetricCardProps {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  accent: string;
}

const InsightMetricCard = ({ label, value, helper, icon: Icon, accent }: InsightMetricCardProps) => (
  <div className="relative overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/95 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
    <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: accent }} />
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{helper}</p>
      </div>
      <div className="rounded-2xl bg-slate-950/5 p-3">
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
  <div className="rounded-[1.75rem] border border-blue-200/60 bg-[linear-gradient(135deg,#0b1324_0%,#183a99_52%,#8fb7ff_160%)] p-6 text-white shadow-[0_28px_60px_rgba(11,19,36,0.28)]">
    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100/80">{title}</p>
    <p className="mt-3 text-4xl font-black tracking-tight">{formatCurrency(amountMinor)}</p>
    <p className="mt-3 max-w-lg text-sm text-blue-100/80">{subtitle}</p>
  </div>
);

export { AreaTrendCard, BarMetricCard, DonutChartCard, InsightMetricCard, RevenueRibbon };
