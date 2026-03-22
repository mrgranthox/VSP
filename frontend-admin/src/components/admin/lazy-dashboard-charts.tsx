import { Suspense, lazy, type ComponentType } from "react";

import { Card, CardContent } from "@/components/ui/card";

const LazyAreaTrendCard = lazy(() => import("@/components/admin/dashboard-charts").then((module) => ({ default: module.AreaTrendCard })));
const LazyBarMetricCard = lazy(() => import("@/components/admin/dashboard-charts").then((module) => ({ default: module.BarMetricCard })));
const LazyDonutChartCard = lazy(() => import("@/components/admin/dashboard-charts").then((module) => ({ default: module.DonutChartCard })));

const ChartFallback = () => (
  <Card className="min-h-[320px]">
    <CardContent className="flex h-full min-h-[320px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-[1.25rem] border border-[rgba(112,104,84,0.12)] bg-[rgba(255,251,244,0.9)] px-4 py-3">
        <span className="h-3 w-3 animate-pulse rounded-full bg-[color:var(--jo-forest)]" />
        <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Loading chart</span>
      </div>
    </CardContent>
  </Card>
);

const withBoundary = <T extends object>(Component: ComponentType<T>) => (props: T) => (
  <Suspense fallback={<ChartFallback />}>
    <Component {...props} />
  </Suspense>
);

const AreaTrendCard = withBoundary(LazyAreaTrendCard);
const BarMetricCard = withBoundary(LazyBarMetricCard);
const DonutChartCard = withBoundary(LazyDonutChartCard);

export { AreaTrendCard, BarMetricCard, DonutChartCard };
