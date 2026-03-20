import { type PropsWithChildren } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EntityHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  badges?: Array<{ label: string; variant?: "blue" | "green" | "amber" | "red" | "slate" | "purple" }>;
  meta?: Array<{ label: string; value: string }>;
}

const EntityHero = ({ eyebrow, title, subtitle, badges = [], meta = [] }: EntityHeroProps) => (
  <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,rgba(10,15,30,1)_0%,rgba(22,41,109,0.96)_55%,rgba(82,122,255,0.92)_140%)] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
    <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100/70">{eyebrow}</p>
        <div>
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100/82">{subtitle}</p>
        </div>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge className="border border-white/10 bg-white/10 text-white" key={`${badge.label}-${badge.variant ?? "slate"}`} variant={badge.variant ?? "slate"}>
                {badge.label}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {meta.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {meta.map((item) => (
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3" key={item.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-100/66">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  </div>
);

const SectionCard = ({ className, ...props }: PropsWithChildren<{ title: string; description?: string; className?: string }>) => (
  <Card className={cn("overflow-hidden border-white/70 bg-white/95", className)}>
    <CardHeader>
      <CardTitle>{props.title}</CardTitle>
      {props.description ? <CardDescription>{props.description}</CardDescription> : null}
    </CardHeader>
    <CardContent>{props.children}</CardContent>
  </Card>
);

interface KeyValueGridProps {
  items: Array<{ label: string; value: string; mono?: boolean }>;
  columns?: "two" | "three" | "four";
}

const columnClassMap = {
  two: "md:grid-cols-2",
  three: "md:grid-cols-2 xl:grid-cols-3",
  four: "md:grid-cols-2 xl:grid-cols-4"
} as const;

const KeyValueGrid = ({ items, columns = "three" }: KeyValueGridProps) => (
  <div className={cn("grid gap-3", columnClassMap[columns])}>
    {items.map((item) => (
      <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/90 px-4 py-3" key={`${item.label}-${item.value}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
        <p className={cn("mt-2 text-sm font-semibold text-slate-950", item.mono && "font-mono text-xs")}>{item.value}</p>
      </div>
    ))}
  </div>
);

interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  timestamp?: string;
  badge?: { label: string; variant?: "blue" | "green" | "amber" | "red" | "slate" | "purple" };
}

const TimelineList = ({ items }: { items: TimelineItem[] }) => (
  <div className="space-y-3">
    {items.map((item, index) => (
      <div className="flex gap-4 rounded-[1.25rem] border border-slate-100 bg-slate-50/90 p-4" key={item.id}>
        <div className="flex flex-col items-center">
          <span className="h-3 w-3 rounded-full bg-blue-600" />
          {index !== items.length - 1 ? <span className="mt-2 h-full w-px bg-slate-200" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-950">{item.title}</p>
            {item.badge ? <Badge variant={item.badge.variant}>{item.badge.label}</Badge> : null}
          </div>
          {item.subtitle ? <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p> : null}
          {item.timestamp ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.timestamp}</p> : null}
        </div>
      </div>
    ))}
  </div>
);

export { EntityHero, KeyValueGrid, SectionCard, TimelineList };
