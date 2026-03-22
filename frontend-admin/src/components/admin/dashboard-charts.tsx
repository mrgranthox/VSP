import { type ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

const palette = ["#419646", "#F6B313", "#E9779B", "#FF4B19", "#D9D4CA", "#173328"];

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
      "overflow-hidden border-[rgba(112,104,84,0.12)] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(250,245,236,0.96))] shadow-[0_20px_45px_rgba(71,61,45,0.08)] backdrop-blur",
      tone === "info" && "bg-[radial-gradient(circle_at_top_left,_rgba(65,150,70,0.12),_rgba(255,255,255,0.94)_45%)]"
    )}
  >
    <CardHeader className="pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        {value ? <span className="rounded-full bg-[color:var(--jo-ink)] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">{value}</span> : null}
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:rgba(107,114,102,0.82)]">{centerLabel}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-[color:var(--jo-ink)]">{centerValue}</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((entry, index) => (
          <div className="flex items-center justify-between rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3" key={entry.name}>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
              <span className="text-sm font-semibold text-[color:var(--jo-ink)]">{entry.name}</span>
            </div>
            <span className="text-sm font-bold text-[color:var(--jo-ink)]">{formatNumber(entry.value)}</span>
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

const AreaTrendCard = ({ title, description, value, data, color = "#419646" }: AreaTrendCardProps) => (
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
          <CartesianGrid stroke="#D9D4CA" strokeDasharray="4 4" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tickLine={false} tick={{ fill: "#6B7266", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7266", fontSize: 12 }} />
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
          <CartesianGrid stroke="#D9D4CA" strokeDasharray="4 4" vertical={false} />
          <XAxis axisLine={false} dataKey="name" tickLine={false} tick={{ fill: "#6B7266", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7266", fontSize: 12 }} />
          <Tooltip formatter={(value) => formatNumber(typeof value === "number" ? value : Number(value ?? 0))} />
          <Bar dataKey="value" fill="#419646" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </ChartCardShell>
);
export { AreaTrendCard, BarMetricCard, DonutChartCard };
