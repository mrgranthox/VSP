import { type ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

const palette = ["#0284C7", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#0F172A"];

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
      "overflow-hidden border border-slate-200 bg-white shadow-sm",
      tone === "info" && "bg-gradient-to-b from-sky-50/50 to-white"
    )}
  >
    <CardHeader className="pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        {value ? <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">{value}</span> : null}
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{centerLabel}</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{centerValue}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {data.map((entry, index) => (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5" key={entry.name}>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
              <span className="text-sm font-semibold text-slate-800">{entry.name}</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{formatNumber(entry.value)}</span>
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

const AreaTrendCard = ({ title, description, value, data, color = "#0284C7" }: AreaTrendCardProps) => (
  <ChartCardShell description={description} title={title} value={value}>
    <div className="h-[280px]">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={`area-${title}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tickLine={false} tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }} />
          <Tooltip formatter={(chartValue) => formatNumber(typeof chartValue === "number" ? chartValue : Number(chartValue ?? 0))} />
          <Area dataKey="value" fill={`url(#area-${title})`} stroke={color} strokeWidth={2.5} type="monotone" />
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
          <XAxis axisLine={false} dataKey="name" tickLine={false} tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }} />
          <Tooltip formatter={(value) => formatNumber(typeof value === "number" ? value : Number(value ?? 0))} />
          <Bar dataKey="value" fill="#0284C7" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </ChartCardShell>
);

export { AreaTrendCard, BarMetricCard, DonutChartCard };
