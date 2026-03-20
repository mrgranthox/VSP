import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Flag, Globe2, Search, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AreaTrendCard, BarMetricCard, DonutChartCard, InsightMetricCard } from "@/components/admin/dashboard-charts";
import { EmptyState, FilterCard, PaginationControls } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiPaginatedRequest, apiRequest, getApiErrorMessage, isMfaRequiredError } from "@/lib/api";
import { formatCurrency, formatDateTime, formatJsonValue, formatNumber } from "@/lib/utils";
import type {
  CityItem,
  EngagementAnalytics,
  FeatureFlagItem,
  MarketplaceAnalytics,
  SearchAnalytics,
  SystemConfigItem
} from "@/types/admin";

const handleActionError = (error: unknown, fallback: string) => {
  if (isMfaRequiredError(error)) {
    toast.error("Verify MFA in My Profile before running this action");
    return;
  }

  toast.error(getApiErrorMessage(error, fallback));
};

const SearchAnalyticsPage = () => {
  const searchQuery = useQuery({
    queryKey: ["admin", "analytics", "search", "detail"],
    queryFn: () => apiRequest<SearchAnalytics>("/admin/analytics/search")
  });

  const search = searchQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Search demand signals from recorded impressions and query logs." title="Search Analytics" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InsightMetricCard accent="linear-gradient(135deg,#2457F5,#8FB7FF)" helper="Recorded search impressions in the analytics dataset." icon={Search} label="Impressions" value={formatNumber(search?.impressionCount ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#F59E0B,#FCD34D)" helper="Top query rows currently returned from search analytics." icon={Activity} label="Top queries" value={formatNumber(search?.topQueries.length ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#7C3AED,#C4B5FD)" helper="City buckets represented in search logs." icon={Globe2} label="Top cities" value={formatNumber(search?.topCities.length ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AreaTrendCard
          data={(search?.topQueries ?? []).slice(0, 8).map((item, index) => ({
            label: item.queryText?.slice(0, 12) || `Q${index + 1}`,
            value: item._count._all
          }))}
          description="Demand concentration by top query phrase, useful for spotlighting the most requested marketplace searches."
          title="Top query demand"
          value={`${formatNumber(search?.impressionCount ?? 0)} total`}
        />

        <BarMetricCard
          data={(search?.topCities ?? []).slice(0, 8).map((item, index) => ({
            name: item.cityId?.slice(0, 6) || `City ${index + 1}`,
            value: item._count._all
          }))}
          description="Search impression density grouped by city bucket."
          title="City demand spread"
        />
      </div>
    </div>
  );
};

const EngagementAnalyticsPage = () => {
  const engagementQuery = useQuery({
    queryKey: ["admin", "analytics", "engagement", "detail"],
    queryFn: () => apiRequest<EngagementAnalytics>("/admin/analytics/engagement")
  });

  const engagement = engagementQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Cross-module activity totals for feed, messaging, review, and notification systems." title="Engagement Analytics" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <InsightMetricCard accent="linear-gradient(135deg,#2457F5,#8FB7FF)" helper="Published social posts." icon={Activity} label="Posts" value={formatNumber(engagement?.posts ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#16A34A,#6EE7B7)" helper="Comments across posts and reviews." icon={Activity} label="Comments" value={formatNumber(engagement?.comments ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#F59E0B,#FCD34D)" helper="Chat and system messages." icon={Activity} label="Messages" value={formatNumber(engagement?.messages ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#7C3AED,#C4B5FD)" helper="Marketplace review records." icon={Activity} label="Reviews" value={formatNumber(engagement?.reviews ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#DC2626,#FDA4AF)" helper="Stored notification rows." icon={Activity} label="Notifications" value={formatNumber(engagement?.notifications ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DonutChartCard
          centerLabel="engagement"
          centerValue={formatNumber((engagement?.posts ?? 0) + (engagement?.comments ?? 0) + (engagement?.messages ?? 0) + (engagement?.reviews ?? 0) + (engagement?.notifications ?? 0))}
          data={[
            { name: "Posts", value: engagement?.posts ?? 0 },
            { name: "Comments", value: engagement?.comments ?? 0 },
            { name: "Messages", value: engagement?.messages ?? 0 },
            { name: "Reviews", value: engagement?.reviews ?? 0 },
            { name: "Notifications", value: engagement?.notifications ?? 0 }
          ]}
          description="Relative mix of major engagement surfaces."
          title="Engagement composition"
        />
        <BarMetricCard
          data={[
            { name: "Posts", value: engagement?.posts ?? 0 },
            { name: "Comments", value: engagement?.comments ?? 0 },
            { name: "Messages", value: engagement?.messages ?? 0 },
            { name: "Reviews", value: engagement?.reviews ?? 0 },
            { name: "Notif.", value: engagement?.notifications ?? 0 }
          ]}
          description="Absolute comparison between the core activity modules."
          title="Activity comparison"
        />
      </div>
    </div>
  );
};

const MarketplaceAnalyticsPage = () => {
  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", "marketplace", "detail"],
    queryFn: () => apiRequest<MarketplaceAnalytics>("/admin/analytics/marketplace")
  });

  const analytics = analyticsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Status mixes and revenue totals from requests, bookings, and featured subscriptions." title="Marketplace Analytics" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightMetricCard accent="linear-gradient(135deg,#2457F5,#8FB7FF)" helper="Featured subscriptions currently active." icon={Flag} label="Active featured workers" value={formatNumber(analytics?.activeFeaturedWorkers ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#16A34A,#6EE7B7)" helper="Succeeded payment-intent volume." icon={Settings2} label="Revenue" value={formatCurrency(analytics?.revenueMinor ?? 0, "USD")} />
        <InsightMetricCard accent="linear-gradient(135deg,#F59E0B,#FCD34D)" helper="Service-request status buckets." icon={Activity} label="Request states" value={formatNumber(analytics?.serviceRequests.length ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#7C3AED,#C4B5FD)" helper="Booking status buckets." icon={Activity} label="Booking states" value={formatNumber(analytics?.bookings.length ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DonutChartCard
          centerLabel="requests"
          centerValue={formatNumber((analytics?.serviceRequests ?? []).reduce((sum, item) => sum + item._count._all, 0))}
          data={(analytics?.serviceRequests ?? []).map((entry) => ({ name: entry.status, value: entry._count._all }))}
          description="Lifecycle mix for service requests."
          title="Request status distribution"
        />

        <DonutChartCard
          centerLabel="bookings"
          centerValue={formatNumber((analytics?.bookings ?? []).reduce((sum, item) => sum + item._count._all, 0))}
          data={(analytics?.bookings ?? []).map((entry) => ({ name: entry.status, value: entry._count._all }))}
          description="Lifecycle mix for bookings."
          title="Booking status distribution"
        />
      </div>
    </div>
  );
};

const ConfigsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const configsQuery = useQuery({
    queryKey: ["admin", "configs"],
    queryFn: () => apiRequest<SystemConfigItem[]>("/admin/configs")
  });

  const updateMutation = useMutation({
    mutationFn: ({ configKey, value }: { configKey: string; value: unknown }) =>
      apiRequest(`/admin/configs/${configKey}`, {
        method: "PATCH",
        body: { value }
      }),
    onSuccess: async () => {
      toast.success("Config updated");
      await queryClient.invalidateQueries({ queryKey: ["admin", "configs"] });
    },
    onError: (error) => handleActionError(error, "Unable to update config")
  });

  const items = useMemo(
    () =>
      (configsQuery.data ?? []).filter((item) => item.configKey.toLowerCase().includes(search.trim().toLowerCase())),
    [configsQuery.data, search]
  );

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Mutable platform configuration backed by the system-config admin endpoints." title="Configurations" />

      <FilterCard>
        <label className="space-y-2 lg:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Search config keys</span>
          <Input onChange={(event) => setSearch(event.target.value)} placeholder="booking_auto_complete_hours" value={search} />
        </label>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Configs loaded</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(items.length)}</p>
          </CardContent>
        </Card>
      </FilterCard>

      {items.length === 0 ? (
        <EmptyState description="No config keys matched the current search." title="No configs found" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="grid gap-4 pt-6 lg:grid-cols-[1fr_320px]">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.configKey}</p>
                  <p className="mt-1 text-sm text-slate-500">Updated {formatDateTime(item.updatedAt)}</p>
                </div>
                <div className="space-y-3">
                  <Textarea className="min-h-[120px] font-mono text-xs" readOnly value={formatJsonValue(item.valueJson)} />
                  <Button
                    onClick={() => {
                      const nextValue = window.prompt("New config value as JSON", JSON.stringify(item.valueJson));

                      if (!nextValue) {
                        return;
                      }

                      try {
                        updateMutation.mutate({
                          configKey: item.configKey,
                          value: JSON.parse(nextValue)
                        });
                      } catch {
                        toast.error("Config value must be valid JSON");
                      }
                    }}
                    variant="outline"
                  >
                    Edit JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const FeatureFlagsPage = () => {
  const queryClient = useQueryClient();
  const flagsQuery = useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => apiRequest<FeatureFlagItem[]>("/admin/feature-flags")
  });

  const updateMutation = useMutation({
    mutationFn: ({ flagKey, payload }: { flagKey: string; payload: Partial<FeatureFlagItem> }) =>
      apiRequest(`/admin/feature-flags/${flagKey}`, {
        method: "PATCH",
        body: payload
      }),
    onSuccess: async () => {
      toast.success("Feature flag updated");
      await queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
    onError: (error) => handleActionError(error, "Unable to update feature flag")
  });

  const flags = flagsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Feature rollout controls wired directly to the backend feature-flag endpoints." title="Feature Flags" />

      <div className="grid gap-4 xl:grid-cols-2">
        {flags.map((flag) => (
          <Card key={flag.id}>
            <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{flag.flagKey}</CardTitle>
                <CardDescription>{flag.description || "No flag description"}</CardDescription>
              </div>
              <Badge variant={flag.defaultEnabled ? "green" : "slate"}>{flag.defaultEnabled ? "Enabled" : "Disabled"}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea className="min-h-[120px] font-mono text-xs" readOnly value={formatJsonValue(flag.rolloutJson ?? null)} />
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() =>
                    updateMutation.mutate({
                      flagKey: flag.flagKey,
                      payload: {
                        defaultEnabled: !flag.defaultEnabled
                      }
                    })
                  }
                  variant={flag.defaultEnabled ? "ghost" : "success"}
                >
                  {flag.defaultEnabled ? "Disable" : "Enable"}
                </Button>
                <Button
                  onClick={() => {
                    const description = window.prompt("Edit description", flag.description ?? "");
                    const rolloutJson = window.prompt("Edit rollout JSON", JSON.stringify(flag.rolloutJson ?? null));

                    if (description === null || rolloutJson === null) {
                      return;
                    }

                    try {
                      updateMutation.mutate({
                        flagKey: flag.flagKey,
                        payload: {
                          description,
                          rolloutJson: JSON.parse(rolloutJson)
                        }
                      });
                    } catch {
                      toast.error("Rollout JSON must be valid JSON");
                    }
                  }}
                  variant="outline"
                >
                  Edit details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const CitiesPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10"
    });

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (enabled) {
      params.set("isEnabled", enabled);
    }

    return params.toString();
  }, [enabled, page, query]);

  const citiesQuery = useQuery({
    queryKey: ["admin", "cities", page, query, enabled],
    queryFn: () => apiPaginatedRequest<CityItem>(`/admin/cities?${queryString}`)
  });

  const cityMutation = useMutation({
    mutationFn: ({ cityId, body, method }: { cityId?: string; body: Record<string, unknown>; method: "POST" | "PATCH" }) =>
      apiRequest(cityId ? `/admin/cities/${cityId}` : "/admin/cities", {
        method,
        body
      }),
    onSuccess: async (_, variables) => {
      toast.success(variables.method === "POST" ? "City created" : "City updated");
      await queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
    },
    onError: (error) => handleActionError(error, "Unable to update city")
  });

  const cities = citiesQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        actionLabel="Create city"
        onAction={() => {
          const slug = window.prompt("Slug", "new_city");
          const name = window.prompt("City name", "New City");

          if (!slug || !name) {
            return;
          }

          cityMutation.mutate({
            method: "POST",
            body: {
              slug,
              name,
              countryCode: window.prompt("Country code", "GH") || "GH",
              currencyCode: window.prompt("Currency code", "GHS") || "GHS",
              timezone: window.prompt("Timezone", "Africa/Accra") || "Africa/Accra",
              defaultSearchRadiusKm: Number(window.prompt("Default radius km", "10") || "10"),
              isEnabled: true
            }
          });
        }}
        subtitle="City availability and search defaults controlled from the admin city-config endpoints."
        title="Cities"
      />

      <FilterCard>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Search city</span>
          <Input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Accra"
            value={query}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Enabled</span>
          <Select
            onChange={(event) => {
              setEnabled(event.target.value);
              setPage(1);
            }}
            value={enabled}
          >
            <option value="">All cities</option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </Select>
        </label>
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Cities in view</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(citiesQuery.data?.pagination.total ?? 0)}</p>
          </CardContent>
        </Card>
      </FilterCard>

      {cities.length === 0 ? (
        <EmptyState description="No cities matched the current filters." title="No cities found" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {cities.map((city) => (
            <Card key={city.id}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{city.name}</CardTitle>
                  <CardDescription>
                    {city.countryCode} · {city.currencyCode} · {city.timezone}
                  </CardDescription>
                </div>
                <Badge variant={city.isEnabled ? "green" : "slate"}>{city.isEnabled ? "Enabled" : "Disabled"}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Default radius</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatNumber(city.defaultSearchRadiusKm)} km</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() =>
                      cityMutation.mutate({
                        cityId: city.id,
                        method: "PATCH",
                        body: {
                          isEnabled: !city.isEnabled
                        }
                      })
                    }
                    variant="outline"
                  >
                    {city.isEnabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    onClick={() => {
                      const name = window.prompt("City name", city.name);
                      const timezone = window.prompt("Timezone", city.timezone);

                      if (!name || !timezone) {
                        return;
                      }

                      cityMutation.mutate({
                        cityId: city.id,
                        method: "PATCH",
                        body: {
                          name,
                          timezone
                        }
                      });
                    }}
                    variant="ghost"
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={citiesQuery.data?.pagination} />
    </div>
  );
};

export { CitiesPage, ConfigsPage, EngagementAnalyticsPage, FeatureFlagsPage, MarketplaceAnalyticsPage, SearchAnalyticsPage };
