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
  <div className="overflow-hidden rounded-[1.75rem] border border-[rgba(112,104,84,0.12)] bg-[linear-gradient(135deg,#173328_0%,#2f6b35_36%,#f6b313_82%,#ff4b19_120%)] p-6 text-white shadow-[0_24px_60px_rgba(23,51,40,0.24)]">
    <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgba(255,248,235,0.76)]">{eyebrow}</p>
        <div>
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[rgba(255,248,235,0.86)]">{subtitle}</p>
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(255,248,235,0.68)]">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  </div>
);

const SectionCard = ({ className, ...props }: PropsWithChildren<{ title: string; description?: string; className?: string }>) => (
  <Card className={cn("overflow-hidden", className)}>
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
      <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.9)] px-4 py-3" key={`${item.label}-${item.value}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:rgba(107,114,102,0.82)]">{item.label}</p>
        <p className={cn("mt-2 text-sm font-semibold text-[color:var(--jo-ink)]", item.mono && "font-mono text-xs")}>{item.value}</p>
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
      <div className="flex gap-4 rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4" key={item.id}>
        <div className="flex flex-col items-center">
          <span className="h-3 w-3 rounded-full bg-[color:var(--jo-forest)]" />
          {index !== items.length - 1 ? <span className="mt-2 h-full w-px bg-[rgba(112,104,84,0.16)]" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[color:var(--jo-ink)]">{item.title}</p>
            {item.badge ? <Badge variant={item.badge.variant}>{item.badge.label}</Badge> : null}
          </div>
          {item.subtitle ? <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{item.subtitle}</p> : null}
          {item.timestamp ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">{item.timestamp}</p> : null}
        </div>
      </div>
    ))}
  </div>
);

export { EntityHero, KeyValueGrid, SectionCard, TimelineList };
