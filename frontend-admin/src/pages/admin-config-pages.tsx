import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Flag, Globe2, Search, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AreaTrendCard, BarMetricCard, DonutChartCard } from "@/components/admin/lazy-dashboard-charts";
import { InsightMetricCard } from "@/components/admin/dashboard-metrics";
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

const ActionDesk = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
  <Card className="h-fit xl:sticky xl:top-28">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

const buildJsonDraft = (value: unknown) => JSON.stringify(value ?? null, null, 2);

const parseJsonDraft = (value: string, label: string) => {
  try {
    return JSON.parse(value);
  } catch {
    toast.error(`${label} must be valid JSON`);
    return null;
  }
};

const emptyCityForm = () => ({
  slug: "",
  name: "",
  countryCode: "GH",
  currencyCode: "GHS",
  timezone: "Africa/Accra",
  defaultSearchRadiusKm: "10",
  isEnabled: true
});

const mapCityToForm = (city: CityItem) => ({
  slug: city.slug,
  name: city.name,
  countryCode: city.countryCode,
  currencyCode: city.currencyCode,
  timezone: city.timezone,
  defaultSearchRadiusKm: String(city.defaultSearchRadiusKm),
  isEnabled: city.isEnabled
});

const SearchAnalyticsPage = () => {
  const location = useLocation();
  const searchQuery = useQuery({
    queryKey: ["admin", "analytics", "search", "detail"],
    queryFn: () => apiRequest<SearchAnalytics>("/admin/analytics/search")
  });

  const search = searchQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={location.pathname === "/analytics/overview" ? "Executive analytics surface for the admin command center." : "Search demand signals from recorded impressions and query logs."}
        title={location.pathname === "/analytics/overview" ? "Analytics Overview" : "Search Analytics"}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InsightMetricCard accent="linear-gradient(135deg,#419646,#8bc08d)" helper="Recorded search impressions in the analytics dataset." icon={Search} label="Impressions" value={formatNumber(search?.impressionCount ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#F6B313,#FFD25E)" helper="Top query rows currently returned from search analytics." icon={Activity} label="Top queries" value={formatNumber(search?.topQueries.length ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#E9779B,#F4ACC4)" helper="City buckets represented in search logs." icon={Globe2} label="Top cities" value={formatNumber(search?.topCities.length ?? 0)} />
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
        <InsightMetricCard accent="linear-gradient(135deg,#419646,#8bc08d)" helper="Published social posts." icon={Activity} label="Posts" value={formatNumber(engagement?.posts ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#F6B313,#FFD25E)" helper="Comments across posts and reviews." icon={Activity} label="Comments" value={formatNumber(engagement?.comments ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#E9779B,#F4ACC4)" helper="Chat and system messages." icon={Activity} label="Messages" value={formatNumber(engagement?.messages ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#FF4B19,#FF8C63)" helper="Marketplace review records." icon={Activity} label="Reviews" value={formatNumber(engagement?.reviews ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#173328,#4c6e63)" helper="Stored notification rows." icon={Activity} label="Notifications" value={formatNumber(engagement?.notifications ?? 0)} />
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
        <InsightMetricCard accent="linear-gradient(135deg,#419646,#8bc08d)" helper="Featured subscriptions currently active." icon={Flag} label="Active featured workers" value={formatNumber(analytics?.activeFeaturedWorkers ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#F6B313,#FFD25E)" helper="Succeeded payment-intent volume." icon={Settings2} label="Revenue" value={formatCurrency(analytics?.revenueMinor ?? 0, "USD")} />
        <InsightMetricCard accent="linear-gradient(135deg,#E9779B,#F4ACC4)" helper="Service-request status buckets." icon={Activity} label="Request states" value={formatNumber(analytics?.serviceRequests.length ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#FF4B19,#FF8C63)" helper="Booking status buckets." icon={Activity} label="Booking states" value={formatNumber(analytics?.bookings.length ?? 0)} />
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
  const { configKey } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedConfigKey, setSelectedConfigKey] = useState(configKey ?? "");
  const [configDraft, setConfigDraft] = useState("");

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

  const items = useMemo(() => {
    const filtered = (configsQuery.data ?? []).filter((item) => item.configKey.toLowerCase().includes(search.trim().toLowerCase()));

    if (!configKey) {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      if (left.configKey === configKey) {
        return -1;
      }

      if (right.configKey === configKey) {
        return 1;
      }

      return left.configKey.localeCompare(right.configKey);
    });
  }, [configKey, configsQuery.data, search]);

  const selectedConfig = items.find((item) => item.configKey === selectedConfigKey) ?? items[0];

  useEffect(() => {
    if (items.length === 0) {
      if (selectedConfigKey) {
        setSelectedConfigKey("");
      }
      return;
    }

    const preferredKey = configKey && items.some((item) => item.configKey === configKey) ? configKey : items[0].configKey;

    if (preferredKey !== selectedConfigKey) {
      setSelectedConfigKey(preferredKey);
    }
  }, [configKey, items, selectedConfigKey]);

  useEffect(() => {
    if (selectedConfig) {
      setConfigDraft(buildJsonDraft(selectedConfig.valueJson));
      return;
    }

    setConfigDraft("");
  }, [selectedConfig?.configKey, selectedConfig?.updatedAt]);

  return (
    <div className="space-y-6">
      <PageHeader subtitle={configKey ? `Focused config editor for ${configKey}.` : "Mutable platform configuration backed by the system-config admin endpoints."} title={configKey ? "Config Editor" : "Configurations"} />

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
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
          <div className="space-y-3">
          {items.map((item) => (
            <Card
              className={item.configKey === selectedConfig?.configKey ? "border-[rgba(65,150,70,0.26)] shadow-[0_22px_45px_rgba(65,150,70,0.14)]" : undefined}
              key={item.id}
            >
              <CardContent className="grid gap-4 pt-6 lg:grid-cols-[1fr_320px]">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.configKey}</p>
                  <p className="mt-1 text-sm text-slate-500">Updated {formatDateTime(item.updatedAt)}</p>
                </div>
                <div className="space-y-3">
                  <Textarea className="min-h-[120px] font-mono text-xs" readOnly value={formatJsonValue(item.valueJson)} />
                  <Button onClick={() => setSelectedConfigKey(item.configKey)} variant={item.configKey === selectedConfig?.configKey ? "primary" : "outline"}>
                    {item.configKey === selectedConfig?.configKey ? "Editing now" : "Open editor"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>

          <ActionDesk description="Edit structured config JSON and submit it directly to the CONFIG_UPDATE endpoint." title="Config editor">
            {selectedConfig ? (
              <>
                <div className="rounded-[1.25rem] bg-[rgba(255,251,244,0.92)] p-4">
                  <p className="text-sm font-bold text-[color:var(--jo-ink)]">{selectedConfig.configKey}</p>
                  <p className="mt-2 text-sm text-[color:var(--jo-muted)]">Last updated {formatDateTime(selectedConfig.updatedAt)}</p>
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[color:var(--jo-ink)]">JSON value</span>
                  <Textarea className="min-h-[320px] font-mono text-xs" onChange={(event) => setConfigDraft(event.target.value)} value={configDraft} />
                </label>
                <Button
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    const parsed = parseJsonDraft(configDraft, "Config value");

                    if (parsed === null) {
                      return;
                    }

                    updateMutation.mutate({
                      configKey: selectedConfig.configKey,
                      value: parsed
                    });
                  }}
                >
                  Save config JSON
                </Button>
              </>
            ) : (
              <p className="text-sm text-[color:var(--jo-muted)]">Select a config key to edit its live JSON payload.</p>
            )}
          </ActionDesk>
        </div>
      )}
    </div>
  );
};

const FeatureFlagsPage = () => {
  const { flagKey } = useParams();
  const queryClient = useQueryClient();
  const [selectedFlagKey, setSelectedFlagKey] = useState(flagKey ?? "");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [rolloutJsonDraft, setRolloutJsonDraft] = useState("");
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

  const flags = useMemo(() => {
    const items = flagsQuery.data ?? [];

    if (!flagKey) {
      return items;
    }

    return [...items].sort((left, right) => {
      if (left.flagKey === flagKey) {
        return -1;
      }

      if (right.flagKey === flagKey) {
        return 1;
      }

      return left.flagKey.localeCompare(right.flagKey);
    });
  }, [flagKey, flagsQuery.data]);

  const selectedFlag = flags.find((flag) => flag.flagKey === selectedFlagKey) ?? flags[0];

  useEffect(() => {
    if (flags.length === 0) {
      if (selectedFlagKey) {
        setSelectedFlagKey("");
      }
      return;
    }

    const preferredKey = flagKey && flags.some((flag) => flag.flagKey === flagKey) ? flagKey : flags[0].flagKey;

    if (preferredKey !== selectedFlagKey) {
      setSelectedFlagKey(preferredKey);
    }
  }, [flagKey, flags, selectedFlagKey]);

  useEffect(() => {
    if (selectedFlag) {
      setDescriptionDraft(selectedFlag.description ?? "");
      setRolloutJsonDraft(buildJsonDraft(selectedFlag.rolloutJson ?? null));
      return;
    }

    setDescriptionDraft("");
    setRolloutJsonDraft("");
  }, [selectedFlag?.flagKey, selectedFlag?.defaultEnabled]);

  return (
    <div className="space-y-6">
      <PageHeader subtitle={flagKey ? `Focused flag editor for ${flagKey}.` : "Feature rollout controls wired directly to the backend feature-flag endpoints."} title={flagKey ? "Feature Flag Editor" : "Feature Flags"} />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-1">
        {flags.map((flag) => (
          <Card
            className={flag.flagKey === selectedFlag?.flagKey ? "border-[rgba(65,150,70,0.26)] shadow-[0_22px_45px_rgba(65,150,70,0.14)]" : undefined}
            key={flag.id}
          >
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
                <Button onClick={() => setSelectedFlagKey(flag.flagKey)} variant={flag.flagKey === selectedFlag?.flagKey ? "primary" : "outline"}>
                  {flag.flagKey === selectedFlag?.flagKey ? "Editing now" : "Open editor"}
                </Button>
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
              </div>
            </CardContent>
          </Card>
        ))}
        </div>

        <ActionDesk description="Adjust rollout JSON and metadata against the FEATURE_FLAG_UPDATE endpoint." title="Feature flag editor">
          {selectedFlag ? (
            <>
              <div className="rounded-[1.25rem] bg-[rgba(255,251,244,0.92)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[color:var(--jo-ink)]">{selectedFlag.flagKey}</p>
                    <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{selectedFlag.description || "No description recorded"}</p>
                  </div>
                  <Badge variant={selectedFlag.defaultEnabled ? "green" : "slate"}>{selectedFlag.defaultEnabled ? "Enabled" : "Disabled"}</Badge>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Description</span>
                <Textarea className="min-h-[120px]" onChange={(event) => setDescriptionDraft(event.target.value)} value={descriptionDraft} />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Rollout JSON</span>
                <Textarea className="min-h-[220px] font-mono text-xs" onChange={(event) => setRolloutJsonDraft(event.target.value)} value={rolloutJsonDraft} />
              </label>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() =>
                    updateMutation.mutate({
                      flagKey: selectedFlag.flagKey,
                      payload: {
                        defaultEnabled: !selectedFlag.defaultEnabled
                      }
                    })
                  }
                  variant={selectedFlag.defaultEnabled ? "ghost" : "success"}
                >
                  {selectedFlag.defaultEnabled ? "Disable flag" : "Enable flag"}
                </Button>
                <Button
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    const rolloutJson = parseJsonDraft(rolloutJsonDraft, "Rollout JSON");

                    if (rolloutJson === null) {
                      return;
                    }

                    updateMutation.mutate({
                      flagKey: selectedFlag.flagKey,
                      payload: {
                        description: descriptionDraft.trim() || null,
                        rolloutJson
                      }
                    });
                  }}
                  variant="outline"
                >
                  Save flag details
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[color:var(--jo-muted)]">Select a feature flag to edit rollout settings.</p>
          )}
        </ActionDesk>
      </div>
    </div>
  );
};

const CitiesPage = () => {
  const { cityId } = useParams();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState("");
  const [selectedCityId, setSelectedCityId] = useState(cityId ?? "");
  const [isCreateMode, setIsCreateMode] = useState(!cityId);
  const [cityForm, setCityForm] = useState(emptyCityForm());

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
      apiRequest<CityItem>(cityId ? `/admin/cities/${cityId}` : "/admin/cities", {
        method,
        body
      }),
    onSuccess: async (result, variables) => {
      toast.success(variables.method === "POST" ? "City created" : "City updated");

      if (variables.method === "POST") {
        setIsCreateMode(false);
        setSelectedCityId(result.id);
        setCityForm(mapCityToForm(result));
      }

      await queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
    },
    onError: (error) => handleActionError(error, "Unable to update city")
  });

  const cities = useMemo(() => {
    const items = citiesQuery.data?.data ?? [];

    if (!cityId) {
      return items;
    }

    return [...items].sort((left, right) => {
      if (left.id === cityId) {
        return -1;
      }

      if (right.id === cityId) {
        return 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [citiesQuery.data?.data, cityId]);

  const selectedCity = cities.find((city) => city.id === selectedCityId) ?? cities[0];

  useEffect(() => {
    if (cityId && cities.some((city) => city.id === cityId)) {
      setSelectedCityId(cityId);
      setIsCreateMode(false);
      return;
    }

    if (cities.length === 0) {
      if (!isCreateMode) {
        setSelectedCityId("");
      }
      return;
    }

    if (!isCreateMode && !cities.some((city) => city.id === selectedCityId)) {
      setSelectedCityId(cities[0].id);
    }
  }, [cityId, cities, isCreateMode, selectedCityId]);

  useEffect(() => {
    if (!isCreateMode && selectedCity) {
      setCityForm(mapCityToForm(selectedCity));
    }
  }, [isCreateMode, selectedCity?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        actionLabel="Create city"
        onAction={() => {
          setIsCreateMode(true);
          setSelectedCityId("");
          setCityForm(emptyCityForm());
        }}
        subtitle={cityId ? "Focused city settings lane with enable/disable and metadata editing." : "City availability and search defaults controlled from the admin city-config endpoints."}
        title={cityId ? "City Settings" : "Cities"}
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
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-1">
          {cities.map((city) => (
            <Card
              className={!isCreateMode && city.id === selectedCity?.id ? "border-[rgba(65,150,70,0.26)] shadow-[0_22px_45px_rgba(65,150,70,0.14)]" : undefined}
              key={city.id}
            >
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
                    onClick={() => {
                      setIsCreateMode(false);
                      setSelectedCityId(city.id);
                      setCityForm(mapCityToForm(city));
                    }}
                    variant={!isCreateMode && city.id === selectedCity?.id ? "primary" : "outline"}
                  >
                    {!isCreateMode && city.id === selectedCity?.id ? "Editing now" : "Manage city"}
                  </Button>
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
                </div>
              </CardContent>
            </Card>
          ))}
          </div>

          <ActionDesk
            description={isCreateMode ? "Create a new marketplace city using the CITY_CREATE endpoint." : "Edit live city metadata and search defaults through the CITY_UPDATE endpoint."}
            title={isCreateMode ? "Create city" : "City editor"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Slug</span>
                <Input
                  onChange={(event) => setCityForm((current) => ({ ...current, slug: event.target.value }))}
                  value={cityForm.slug}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Name</span>
                <Input
                  onChange={(event) => setCityForm((current) => ({ ...current, name: event.target.value }))}
                  value={cityForm.name}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Country code</span>
                <Input
                  maxLength={2}
                  onChange={(event) => setCityForm((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))}
                  value={cityForm.countryCode}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Currency code</span>
                <Input
                  maxLength={3}
                  onChange={(event) => setCityForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))}
                  value={cityForm.currencyCode}
                />
              </label>
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Timezone</span>
                <Input
                  onChange={(event) => setCityForm((current) => ({ ...current, timezone: event.target.value }))}
                  value={cityForm.timezone}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Default search radius (km)</span>
                <Input
                  min="1"
                  max="100"
                  onChange={(event) => setCityForm((current) => ({ ...current, defaultSearchRadiusKm: event.target.value }))}
                  type="number"
                  value={cityForm.defaultSearchRadiusKm}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Enabled</span>
                <Select
                  onChange={(event) => setCityForm((current) => ({ ...current, isEnabled: event.target.value === "true" }))}
                  value={String(cityForm.isEnabled)}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={
                  cityMutation.isPending ||
                  cityForm.slug.trim().length === 0 ||
                  cityForm.name.trim().length === 0 ||
                  cityForm.timezone.trim().length === 0 ||
                  !Number.isInteger(Number(cityForm.defaultSearchRadiusKm)) ||
                  Number(cityForm.defaultSearchRadiusKm) < 1 ||
                  Number(cityForm.defaultSearchRadiusKm) > 100
                }
                onClick={() =>
                  cityMutation.mutate({
                    cityId: isCreateMode ? undefined : selectedCity?.id,
                    method: isCreateMode ? "POST" : "PATCH",
                    body: {
                      slug: cityForm.slug.trim(),
                      name: cityForm.name.trim(),
                      countryCode: cityForm.countryCode.trim().toUpperCase(),
                      currencyCode: cityForm.currencyCode.trim().toUpperCase(),
                      timezone: cityForm.timezone.trim(),
                      defaultSearchRadiusKm: Number(cityForm.defaultSearchRadiusKm),
                      isEnabled: cityForm.isEnabled
                    }
                  })
                }
              >
                {isCreateMode ? "Create city" : "Save city changes"}
              </Button>
              {!isCreateMode && selectedCity ? (
                <Button
                  onClick={() => {
                    setCityForm(mapCityToForm(selectedCity));
                  }}
                  variant="outline"
                >
                  Reset changes
                </Button>
              ) : null}
            </div>
          </ActionDesk>
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={citiesQuery.data?.pagination} />
    </div>
  );
};

export { CitiesPage, ConfigsPage, EngagementAnalyticsPage, FeatureFlagsPage, MarketplaceAnalyticsPage, SearchAnalyticsPage };
