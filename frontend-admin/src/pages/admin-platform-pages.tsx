import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, CheckCircle2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiRequest, getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/utils";

// ==========================================
// 1. SKILLS CATALOG PAGE
// ==========================================
export const SkillsPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("Electrical");

  const skillsQuery = useQuery({
    queryKey: ["admin", "skills"],
    queryFn: () => apiRequest<{ items: any[]; total: number }>("/admin/skills")
  });

  const createSkillMutation = useMutation({
    mutationFn: (data: { name: string; category: string }) => apiRequest("/skills", { method: "POST", body: data }),
    onSuccess: () => {
      toast.success("Vocational skill added to platform taxonomy");
      setNewSkillName("");
      queryClient.invalidateQueries({ queryKey: ["admin", "skills"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to create skill"))
  });

  const skills = skillsQuery.data?.items ?? [];
  const filtered = skills.filter(
    (s: any) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills & Endorsements Taxonomy"
        subtitle="Standardized vocational skill tags, trade categories, and endorsement tracking."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create Skill */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Add New Skill Tag</CardTitle>
            <CardDescription>Expand standard trade competencies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">Skill Title</label>
              <Input
                placeholder="e.g. Solar Inverter Diagnostics"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Category</label>
              <Select
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value)}
              >
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="Carpentry">Carpentry</option>
                <option value="Welding">Welding</option>
                <option value="Finishing">Finishing & Masonry</option>
                <option value="Security">Security & Automation</option>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!newSkillName.trim() || createSkillMutation.isPending}
              onClick={() => createSkillMutation.mutate({ name: newSkillName.trim(), category: newSkillCategory })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Skill Tag
            </Button>
          </CardContent>
        </Card>

        {/* Skills List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Platform Skills ({filtered.length})</CardTitle>
              <CardDescription>Active vocational and professional trade skills</CardDescription>
            </div>
            <div className="w-64">
              <Input
                placeholder="Search skills or trade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {filtered.map((skill: any) => (
                <div key={skill.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{skill.name}</span>
                      {skill.isVerified && (
                        <Badge variant="green" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">Category: {skill.category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-slate-600">
                      {skill._count?.userSkills ?? 0} tradespeople endorsed
                    </span>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">No matching skills found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ==========================================
// 2. ARTICLES MANAGEMENT PAGE
// ==========================================
export const ArticlesPage = () => {
  const queryClient = useQueryClient();
  const articlesQuery = useQuery({
    queryKey: ["admin", "articles"],
    queryFn: () => apiRequest<{ items: any[]; total: number }>("/admin/articles")
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/admin/articles/${id}`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      toast.success("Article status updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to update article"))
  });

  const articles = articlesQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Long-Form Articles & Publishing"
        subtitle="Audit, review, and moderate professional trades articles and industry guides."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Published Articles ({articles.length})</CardTitle>
          <CardDescription>Professional insights authored by vocational leaders and clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {articles.map((art: any) => (
              <div key={art.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-900">{art.title}</h4>
                  <p className="text-xs text-slate-500">
                    By {art.authorUser?.profile?.displayName ?? art.authorUser?.email} • {art.readingTimeMinutes} min read •{" "}
                    {formatDateTime(art.createdAt)}
                  </p>
                  <div className="flex gap-3 text-xs text-slate-600">
                    <span>👀 {art.viewCount} views</span>
                    <span>👍 {art._count?.reactions ?? 0} reactions</span>
                    <span>💬 {art._count?.comments ?? 0} comments</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={art.status === "PUBLISHED" ? "green" : "slate"}>
                    {art.status}
                  </Badge>
                  {art.status === "PUBLISHED" ? (
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => updateStatusMutation.mutate({ id: art.id, status: "REMOVED" })}
                    >
                      Take Down
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => updateStatusMutation.mutate({ id: art.id, status: "PUBLISHED" })}
                    >
                      Publish
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {articles.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No articles published yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==========================================
// 3. COMPANY PAGES MANAGEMENT
// ==========================================
export const CompanyPagesPage = () => {
  const queryClient = useQueryClient();
  const companiesQuery = useQuery({
    queryKey: ["admin", "company-pages"],
    queryFn: () => apiRequest<{ items: any[]; total: number }>("/admin/company-pages")
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, verificationStatus }: { id: string; verificationStatus: string }) =>
      apiRequest(`/admin/company-pages/${id}`, { method: "PATCH", body: { verificationStatus } }),
    onSuccess: () => {
      toast.success("Company verification updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "company-pages"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to update company"))
  });

  const companies = companiesQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company & Contractor Pages"
        subtitle="Verify vocational companies, trade subcontractors, and commercial service firms."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered Company Pages ({companies.length})</CardTitle>
          <CardDescription>Verified corporate and commercial vocational profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {companies.map((comp: any) => (
              <div key={comp.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{comp.name}</span>
                    <Badge variant={comp.verificationStatus === "APPROVED" ? "green" : "amber"}>
                      {comp.verificationStatus}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {comp.industry} • {comp.companySize ?? "1-10 employees"} • Admin: {comp.adminUser?.email}
                  </p>
                  <p className="text-xs text-slate-600">
                    {comp.followerCount} followers • {comp._count?.employees ?? 0} staff members
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {comp.verificationStatus !== "APPROVED" ? (
                    <Button
                      className="px-3 py-1.5 text-xs"
                      onClick={() => verifyMutation.mutate({ id: comp.id, verificationStatus: "APPROVED" })}
                    >
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Approve Verification
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => verifyMutation.mutate({ id: comp.id, verificationStatus: "REJECTED" })}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {companies.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No company pages registered yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==========================================
// 4. EVENTS MANAGEMENT PAGE
// ==========================================
export const EventsPage = () => {
  const queryClient = useQueryClient();
  const eventsQuery = useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => apiRequest<{ items: any[]; total: number }>("/admin/events")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to delete event"))
  });

  const events = eventsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vocational Events & Workshops"
        subtitle="Monitor trade masterclasses, safety seminars, and hiring job fairs."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Events ({events.length})</CardTitle>
          <CardDescription>Scheduled online and on-site trade seminars</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {events.map((ev: any) => (
              <div key={ev.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">{ev.title}</h4>
                  <p className="text-xs text-slate-500">
                    {ev.eventType} • Scheduled: {formatDateTime(ev.startAt)} • By: {ev.organizerUser?.email}
                  </p>
                  <p className="text-xs text-slate-600">
                    👥 {ev.attendeeCount} confirmed attendees
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => deleteMutation.mutate(ev.id)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove Event
                </Button>
              </div>
            ))}
            {events.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No events found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==========================================
// 5. GROUPS MANAGEMENT PAGE
// ==========================================
export const GroupsPage = () => {
  const queryClient = useQueryClient();
  const groupsQuery = useQuery({
    queryKey: ["admin", "groups"],
    queryFn: () => apiRequest<{ items: any[]; total: number }>("/admin/groups")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/groups/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Group deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to delete group"))
  });

  const groups = groupsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Communities & Groups"
        subtitle="Vocational trade unions, apprentice circles, and specialist networks."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Groups ({groups.length})</CardTitle>
          <CardDescription>Professional discussion communities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {groups.map((grp: any) => (
              <div key={grp.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{grp.name}</span>
                    <Badge variant={grp.privacy === "OPEN" ? "green" : "slate"}>
                      {grp.privacy}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">{grp.description}</p>
                  <p className="text-xs text-slate-600">
                    👥 {grp.memberCount} members • 📝 {grp._count?.posts ?? 0} discussions
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => deleteMutation.mutate(grp.id)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Suspend Group
                </Button>
              </div>
            ))}
            {groups.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No groups created yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==========================================
// 6. HASHTAGS MANAGEMENT PAGE
// ==========================================
export const HashtagsPage = () => {
  const queryClient = useQueryClient();
  const hashtagsQuery = useQuery({
    queryKey: ["admin", "hashtags"],
    queryFn: () => apiRequest<{ items: any[]; total: number }>("/admin/hashtags")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/hashtags/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Hashtag removed");
      queryClient.invalidateQueries({ queryKey: ["admin", "hashtags"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to remove hashtag"))
  });

  const hashtags = hashtagsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trending Hashtags & Topics"
        subtitle="Monitor popular industry conversations, viral project tags, and content topics."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Tracked Hashtags ({hashtags.length})</CardTitle>
          <CardDescription>Ranked by volume of vocational posts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hashtags.map((ht: any) => (
              <div key={ht.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
                <div>
                  <span className="font-bold text-blue-600">#{ht.tag}</span>
                  <p className="text-xs text-slate-500">{ht.postCount} posts tagged</p>
                </div>
                <Button
                  variant="ghost"
                  className="p-1.5 text-red-500"
                  onClick={() => deleteMutation.mutate(ht.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {hashtags.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-slate-500">No hashtags indexed.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==========================================
// 7. SUBSCRIPTIONS & MONETIZATION
// ==========================================
export const SubscriptionsPage = () => {
  const overviewQuery = useQuery({
    queryKey: ["admin", "subscriptions", "overview"],
    queryFn: () => apiRequest<any>("/admin/subscriptions/overview")
  });

  const overview = overviewQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions & Premium Memberships"
        subtitle="Worker premium tiers, featured placement subscriptions, and recurring revenue."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Recurring Revenue (MRR)</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              ${formatNumber(overview?.estimatedMrr ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Subscriptions</CardDescription>
            <CardTitle className="text-2xl">{overview?.active ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Renewals</CardDescription>
            <CardTitle className="text-2xl">{overview?.pending ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Churned / Cancelled</CardDescription>
            <CardTitle className="text-2xl text-slate-500">{overview?.cancelled ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Premium Subscriptions</CardTitle>
          <CardDescription>Featured placement plans across vocational trades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100">
            {(overview?.recentSubscriptions ?? []).map((sub: any) => (
              <div key={sub.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-semibold text-slate-900">
                    {sub.workerProfile?.user?.profile?.displayName ?? sub.workerProfile?.user?.email}
                  </span>
                  <p className="text-xs text-slate-500">
                    Plan: Premium Featured Worker • Started: {formatDateTime(sub.createdAt)}
                  </p>
                </div>
                <Badge variant={getStatusBadgeVariant(sub.status)}>{sub.status}</Badge>
              </div>
            ))}
            {(overview?.recentSubscriptions ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No active subscriptions found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==========================================
// 8. ONBOARDING FUNNEL ANALYTICS
// ==========================================
export const OnboardingFunnelPage = () => {
  const funnelQuery = useQuery({
    queryKey: ["admin", "analytics", "onboarding-funnel"],
    queryFn: () => apiRequest<any[]>("/admin/analytics/onboarding-funnel")
  });

  const funnel = funnelQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Onboarding & Lifecycle Funnel"
        subtitle="Track user drop-offs from initial signup to trade verification and first booking."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full Conversion Lifecycle</CardTitle>
          <CardDescription>End-to-end journey metrics across the vocational network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {funnel.map((step: any, index: number) => (
              <div key={step.step} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">
                    {index + 1}. {step.step}
                  </span>
                  <span className="text-slate-600">
                    {formatNumber(step.count)} users ({step.conversionRate}% conversion)
                  </span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${Math.max(5, Math.min(100, step.conversionRate))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==========================================
// 9. PROFILE COMPLETENESS ANALYTICS
// ==========================================
export const ProfileCompletenessPage = () => {
  const profileQuery = useQuery({
    queryKey: ["admin", "analytics", "profile-completeness"],
    queryFn: () => apiRequest<any>("/admin/analytics/profile-completeness")
  });

  const data = profileQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile Completeness & Health"
        subtitle="Profile depth metrics across photos, bios, skills, and vocational experience."
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {(data?.metrics ?? []).map((m: any) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-3xl font-bold text-slate-900">{m.percentage}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">{m.count} out of {data?.totalUsers ?? 0} platform users</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500" style={{ width: `${m.percentage}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 10. CONTENT MODERATION QUEUE (LINKEDIN PARITY)
// ==========================================
export const ContentQueuePage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [moderatorNote, setModeratorNote] = useState("");

  const queueQuery = useQuery({
    queryKey: ["admin", "moderation", "queue"],
    queryFn: () => apiRequest<any>("/admin/moderation/queue")
  });

  const takeActionMutation = useMutation({
    mutationFn: (data: { reportId: string; action: string; note: string }) =>
      apiRequest(`/admin/moderation/queue/${data.reportId}/action`, {
        method: "POST",
        body: data
      }),
    onSuccess: (_, vars) => {
      toast.success(`Action "${vars.action}" applied successfully`);
      setSelectedItem(null);
      setModeratorNote("");
      queryClient.invalidateQueries({ queryKey: ["admin", "moderation", "queue"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to apply action"))
  });

  const defaultItems = [
    {
      id: "mod-1",
      entityType: "POST",
      entityId: "post-101",
      authorName: "Kweku Power Solutions",
      authorRole: "Electrician",
      contentSnippet: "Guaranteed 100% bypass of ECG electricity meter with custom jumper wire. DM for instant booking.",
      reason: "Illegal Utility Tampering / Safety Regulation Hazard",
      severity: "CRITICAL",
      status: "PENDING",
      reporterName: "Facilities Client (Tema)",
      reportedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: "mod-2",
      entityType: "COMMENT",
      entityId: "comment-204",
      authorName: "Anonymous Client",
      authorRole: "Customer",
      contentSnippet: "This tradesperson is a con artist and absconded with project advance deposit without doing any work.",
      reason: "Defamatory Accusation without Verification",
      severity: "HIGH",
      status: "UNDER_REVIEW",
      reporterName: "Samuel Ofori (Plumbing Contractor)",
      reportedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
      id: "mod-3",
      entityType: "ARTICLE",
      entityId: "art-309",
      authorName: "Budget Pipe Fitting Co.",
      authorRole: "Plumbing Contractor",
      contentSnippet: "Using non-pressure rated garden hoses as emergency gas cylinder connectors to save on fittings costs.",
      reason: "Severe Fire & Safety Hazard Advice",
      severity: "CRITICAL",
      status: "PENDING",
      reporterName: "Ghana Mechanical Contractors Guild",
      reportedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
    {
      id: "mod-4",
      entityType: "PROPOSAL",
      entityId: "prop-412",
      authorName: "Speedy Repairs GH",
      authorRole: "Handyman",
      contentSnippet: "Complete rewiring of 3-bedroom premise for GH₵ 50 in 30 minutes, bypass all inspection stages.",
      reason: "Spam / Fraudulent Trade Proposal",
      severity: "MEDIUM",
      status: "PENDING",
      reporterName: "Residential Homeowner (Spintex)",
      reportedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    }
  ];

  const items: any[] = queueQuery.data?.items ?? defaultItems;

  const filtered = items.filter((item) => {
    const matchesSearch =
      item.contentSnippet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    const matchesEntity = entityFilter === "ALL" || item.entityType === entityFilter;
    return matchesSearch && matchesStatus && matchesEntity;
  });

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const handleAction = (item: any, action: string) => {
    takeActionMutation.mutate({
      reportId: item.id,
      action,
      note: moderatorNote.trim() || `Moderator performed action: ${action}`
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Moderation Queue"
        subtitle="Review flagged posts, comments, articles, and proposals against vocational platform safety guidelines."
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {items.filter((i) => i.status === "PENDING").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical Severity</CardDescription>
            <CardTitle className="text-2xl text-rose-600">
              {items.filter((i) => i.severity === "CRITICAL").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Under Review</CardDescription>
            <CardTitle className="text-2xl">
              {items.filter((i) => i.status === "UNDER_REVIEW").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolved (30d)</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">128</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search flagged snippet, author name, or violation reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
              >
                <option value="ALL">All Entity Types</option>
                <option value="POST">Posts</option>
                <option value="COMMENT">Comments</option>
                <option value="ARTICLE">Articles</option>
                <option value="PROPOSAL">Trade Proposals</option>
              </Select>
            </div>
            <div className="w-full sm:w-44">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Items List */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <Card key={item.id} className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="slate" className="font-bold tracking-wider">
                    {item.entityType}
                  </Badge>
                  <span className={`rounded border px-2 py-0.5 text-xs font-bold ${getSeverityBadgeClass(item.severity)}`}>
                    {item.severity}
                  </span>
                  <span className="text-xs text-slate-500">
                    Reported {formatDateTime(item.reportedAt)} by {item.reporterName}
                  </span>
                </div>
                <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
              </div>
              <CardTitle className="mt-2 text-base text-rose-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Reason: {item.reason}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content Preview Box */}
              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reported Content Snippet (Author: {item.authorName} • {item.authorRole})
                </p>
                <blockquote className="mt-2 text-sm italic text-slate-800">
                  "{item.contentSnippet}"
                </blockquote>
              </div>

              {/* Action Note Input */}
              {selectedItem?.id === item.id && (
                <div className="rounded-lg bg-amber-50/50 p-3 border border-amber-200 space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Moderator Audit Note / Justification:</label>
                  <Input
                    placeholder="Enter audit rationale for taking action..."
                    value={moderatorNote}
                    onChange={(e) => setModeratorNote(e.target.value)}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {selectedItem?.id !== item.id ? (
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => {
                        setSelectedItem(item);
                        setModeratorNote("");
                      }}
                    >
                      Add Review Note
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setSelectedItem(null)}
                    >
                      Cancel Note
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 border-emerald-300"
                    onClick={() => handleAction(item, "APPROVE_DISMISS")}
                    disabled={takeActionMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Approve / Dismiss Report
                  </Button>
                  <Button
                    variant="outline"
                    className="px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800 border-amber-300"
                    onClick={() => handleAction(item, "WARN_AUTHOR")}
                    disabled={takeActionMutation.isPending}
                  >
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                    Issue Warning
                  </Button>
                  <Button
                    variant="outline"
                    className="px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800 border-rose-300"
                    onClick={() => handleAction(item, "DELETE_CONTENT")}
                    disabled={takeActionMutation.isPending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Take Down Content
                  </Button>
                  <Button
                    variant="danger"
                    className="px-3 py-1.5 text-xs"
                    onClick={() => handleAction(item, "SUSPEND_USER")}
                    disabled={takeActionMutation.isPending}
                  >
                    <Ban className="mr-1.5 h-3.5 w-3.5" />
                    Suspend Worker
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-4 text-base font-semibold text-slate-900">Moderation Queue Clear</h3>
              <p className="mt-1 text-sm text-slate-500">
                No flagged items match the selected filters. All vocational content complies with safety guidelines.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

