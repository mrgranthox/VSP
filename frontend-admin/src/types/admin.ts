export interface OverviewAnalytics {
  users: number;
  workersApproved: number;
  requestsOpen: number;
  bookingsCompleted: number;
  revenueMinor: number;
}

export interface SearchAnalytics {
  impressionCount: number;
  topQueries: Array<{ queryText: string | null; _count: { _all: number } }>;
  topCities: Array<{ cityId: string | null; _count: { _all: number } }>;
}

export interface EngagementAnalytics {
  posts: number;
  comments: number;
  messages: number;
  reviews: number;
  notifications: number;
}

export interface MarketplaceAnalytics {
  serviceRequests: Array<{ status: string; _count: { _all: number } }>;
  bookings: Array<{ status: string; _count: { _all: number } }>;
  activeFeaturedWorkers: number;
  revenueMinor: number;
}

export interface SystemHealth {
  database: { ok: boolean; latencyMs: number };
  redis: { ok: boolean; latencyMs: number; memoryUsedMb: number | null };
  typesense: { enabled: boolean; docCount: number | null };
  queues: Record<string, unknown>;
  websocketConnections: number;
  recentJobRuns: Array<{
    id: string;
    jobName: string;
    queueName?: string;
    status: string;
    startedAt: string;
    finishedAt?: string | null;
    metadataJson?: Record<string, unknown> | null;
  }>;
}

export interface SystemMetrics {
  totals: {
    users: number;
    workers: number;
    requests: number;
    bookings: number;
  };
  health: SystemHealth;
}

export interface BasicCity {
  id: string;
  slug: string;
  name: string;
  countryCode?: string;
  timezone?: string;
}

export interface BasicProfile {
  id?: string;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  cityId?: string | null;
  city?: BasicCity | null;
  lat?: string | number | null;
  lng?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSummary {
  id: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  profile?: BasicProfile | null;
}

export interface UserProfile {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  cityId?: string | null;
  city?: BasicCity | null;
  lat?: string | number | null;
  lng?: string | number | null;
  user: {
    id: string;
    email?: string | null;
    phone?: string | null;
    status: string;
  };
}

export interface NotificationItem {
  id: string;
  channel: string | null;
  notificationType: string;
  payloadJson: Record<string, unknown>;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface AdminMediaAssetItem {
  id: string;
  category: string;
  visibility: string;
  mimeType: string;
  status: string;
  originalFilename?: string | null;
  finalCdnUrl?: string | null;
  storageKey: string;
  createdAt: string;
  confirmedAt?: string | null;
}

export interface AdminActivityItem {
  id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  createdAt: string;
  linkPath?: string | null;
  meta?: Array<{
    label: string;
    value: string;
  }>;
}

export interface AdminActivityCollections {
  posts: AdminActivityItem[];
  comments: AdminActivityItem[];
  postLikes: AdminActivityItem[];
  commentLikes: AdminActivityItem[];
  postSaves: AdminActivityItem[];
  follows: AdminActivityItem[];
  followers: AdminActivityItem[];
  savedWorkers: AdminActivityItem[];
  reports: AdminActivityItem[];
  messages: AdminActivityItem[];
  conversations: AdminActivityItem[];
  notifications: AdminActivityItem[];
  serviceRequests: AdminActivityItem[];
  bookings: AdminActivityItem[];
  reviewsWritten: AdminActivityItem[];
  reviewsReceived: AdminActivityItem[];
  supportTickets: AdminActivityItem[];
  fraudSignals: AdminActivityItem[];
  mediaAssets: AdminActivityItem[];
}

export interface WorkerActivityCollections extends AdminActivityCollections {
  assignments: AdminActivityItem[];
  bookingsAsWorker: AdminActivityItem[];
  savedByUsers: AdminActivityItem[];
  searchImpressions: AdminActivityItem[];
}

export interface AdminUserSessionItem {
  id: string;
  deviceType?: string | null;
  ipAddress?: string | null;
  mfaVerified: boolean;
  mfaVerifiedAt?: string | null;
  mfaMethod?: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface NotificationPreferences {
  userId: string;
  chatPushEnabled: boolean;
  requestPushEnabled: boolean;
  marketingEmailEnabled: boolean;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
}

export interface AdminUserListItem extends UserSummary {
  profile?: BasicProfile | null;
  workerProfile?: {
    id: string;
    verificationStatus: string;
    isFeatured: boolean;
  } | null;
  roles: string[];
}

export interface AdminWorkerListItem {
  id: string;
  userId: string;
  displayName: string | null;
  headline: string | null;
  verificationStatus: string;
  isFeatured: boolean;
  avgRating: string;
  totalReviews: number;
  trades: string[];
  latestSubscription?: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    createdAt: string;
  } | null;
}

export interface AdminReportListItem {
  id: string;
  reporterUserId: string;
  entityType: string;
  entityId: string;
  reason: string;
  severity: string;
  status: string;
  createdAt: string;
  reporterUser?: UserSummary | null;
  moderationCases: Array<{
    id: string;
    status: string;
    assignedAdminUserId?: string | null;
    createdAt: string;
    updatedAt: string;
    actions: Array<{
      id: string;
      actionType?: string;
      createdAt?: string;
    }>;
  }>;
}

export interface AdminModerationCaseItem {
  id: string;
  reportId: string | null;
  assignedAdminUserId?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  report?: {
    id: string;
    entityType: string;
    entityId: string;
    reason: string;
    severity: string;
    status: string;
    createdAt: string;
  } | null;
  assignedAdminUser?: UserSummary | null;
  actions: Array<{
    id: string;
    actionType: string;
    entityType: string;
    entityId: string;
    notes?: string | null;
    createdAt: string;
    performedByAdminUser?: UserSummary | null;
  }>;
}

export interface AdminSupportTicketItem {
  id: string;
  openedByUserId: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  status: string;
  priority: string;
  subject: string;
  body: string;
  assignedSupportUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  openedByUser?: UserSummary | null;
  assignedSupportUser?: UserSummary | null;
}

export interface SupportTicketMessageItem {
  id: string;
  authorUserId: string;
  body: string;
  isInternalNote: boolean;
  createdAt: string;
  authorUser?: {
    id: string;
    displayName?: string | null;
  } | null;
}

export interface SupportTicketDetail extends AdminSupportTicketItem {
  messages: SupportTicketMessageItem[];
}

export interface AdminAuditLogItem {
  id: string;
  adminUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadataJson?: Record<string, unknown> | null;
  createdAt: string;
  adminUser?: UserSummary | null;
}

export interface TradeSummary {
  id: string;
  slug: string;
  name: string;
  iconUrl?: string | null;
  isEnabled?: boolean;
}

export interface WorkerAssignmentSummary {
  id: string;
  assignmentStatus: string;
  assignedAt?: string | null;
  respondedAt?: string | null;
  workerProfile: {
    id: string;
    headline?: string | null;
    verificationStatus?: string;
    avgRating?: string;
    totalReviews?: number;
    user?: UserSummary | null;
  };
}

export interface ServiceRequestItemSummary {
  id: string;
  customerUserId: string;
  tradeCategoryId: string;
  preferredWorkerProfileId?: string | null;
  title: string;
  description: string;
  locationText?: string | null;
  lat?: string | null;
  lng?: string | null;
  status: string;
  requestedAt: string;
  scheduledAt?: string | null;
  expiresAt?: string | null;
  customerUser?: UserSummary | null;
  tradeCategory?: TradeSummary | null;
  preferredWorkerProfile?: {
    id: string;
    user?: UserSummary | null;
  } | null;
  assignments: WorkerAssignmentSummary[];
  booking?: {
    id: string;
    status: string;
    scheduledStart?: string;
    scheduledEnd?: string;
  } | null;
  items?: Array<{
    id: string;
    label: string;
    quantity: number;
  }>;
}

export interface BookingItemSummary {
  id: string;
  serviceRequestId: string;
  workerProfileId: string;
  customerUserId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customerUser?: UserSummary | null;
  workerProfile?: {
    id: string;
    headline?: string | null;
    verificationStatus?: string;
    user?: UserSummary | null;
  } | null;
  serviceRequest?: {
    id: string;
    title: string;
    status: string;
    locationText?: string | null;
    tradeCategory?: TradeSummary | null;
  } | null;
  reschedules?: Array<{
    id: string;
    status?: string;
    requestedByUser?: UserSummary | null;
    createdAt?: string;
  }>;
  cancellations?: Array<{
    id: string;
    reason?: string | null;
    createdAt?: string;
  }>;
}

export interface FeaturedWorkerItem {
  id: string;
  userId: string;
  displayName: string | null;
  headline: string | null;
  isFeatured: boolean;
  verificationStatus: string;
  subscriptions: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    createdAt: string;
  }>;
}

export interface FraudSignalItem {
  id: string;
  userId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  signalKey: string;
  score: string;
  status: string;
  createdAt: string;
  user?: UserSummary | null;
}

export interface SystemConfigItem {
  id: string;
  configKey: string;
  valueJson: unknown;
  updatedAt: string;
}

export interface FeatureFlagItem {
  id: string;
  flagKey: string;
  description?: string | null;
  defaultEnabled: boolean;
  rolloutJson?: Record<string, unknown> | null;
}

export interface CityItem {
  id: string;
  slug: string;
  name: string;
  countryCode: string;
  currencyCode: string;
  timezone: string;
  defaultSearchRadiusKm: number;
  isEnabled: boolean;
}

export interface AdminRoleItem {
  id: string;
  roleKey: string;
  label: string;
  description: string;
  permissionKeys: string[];
}

export interface AdminPermissionItem {
  id: string;
  permissionKey: string;
  description: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  sessionCount: number;
  openTicketCount: number;
  updatedAt: string;
  activeSessions: AdminUserSessionItem[];
  recentMediaAssets: AdminMediaAssetItem[];
  activityCollections: AdminActivityCollections;
  activitySummary: {
    posts: number;
    comments: number;
    postLikes: number;
    commentLikes: number;
    postSaves: number;
    follows: number;
    followers: number;
    savedWorkers: number;
    reports: number;
    messages: number;
    conversations: number;
    notifications: number;
    serviceRequests: number;
    bookings: number;
    reviewsWritten: number;
    reviewsReceived: number;
    supportTickets: number;
    fraudSignals: number;
    mediaAssets: number;
  };
  activityTimeline: AdminActivityItem[];
}

export interface VerificationDocumentItem {
  id: string;
  title: string;
  issuer?: string | null;
  documentUrl?: string | null;
  verificationStatus: string;
}

export interface WorkerVerificationDocuments {
  workerProfileId: string;
  verificationStatus: string;
  latestVerificationRequest?: Record<string, unknown> | null;
  documents: VerificationDocumentItem[];
}

export interface WorkerSubscriptionSnapshot {
  workerProfileId: string;
  isFeatured: boolean;
  subscriptions: Array<{
    id: string;
    workerProfileId: string;
    startsAt: string;
    endsAt: string;
    status: string;
    sourcePaymentIntentId?: string | null;
    createdAt: string;
  }>;
  invoices: Array<{
    id: string;
    workerProfileId: string;
    amountMinor: number;
    currencyCode: string;
    status: string;
    providerRef?: string | null;
    createdAt: string;
  }>;
}

export interface WorkerDetail extends AdminWorkerListItem {
  bio?: string | null;
  experienceYears?: number | null;
  jobsCompleted?: number | null;
  responseRate?: string | null;
  serviceRadiusKm?: number | null;
  createdAt: string;
  updatedAt: string;
  user: UserSummary;
  tradeCategories: Array<{
    id: string;
    workerProfileId: string;
    tradeCategoryId: string;
    tradeCategory?: TradeSummary | null;
  }>;
  services: Array<{
    id: string;
    workerProfileId: string;
    title: string;
    description?: string | null;
    basePriceMinor?: number | null;
    currencyCode?: string | null;
    isEnabled: boolean;
    createdAt: string;
  }>;
  serviceAreas: Array<{
    id: string;
    workerProfileId: string;
    cityId: string;
    centerLat?: string | null;
    centerLng?: string | null;
    radiusKm?: number | null;
    coverageMode?: string | null;
    createdAt: string;
    city?: CityItem | null;
  }>;
  certifications: Array<{
    id: string;
    workerProfileId: string;
    mediaAssetId?: string | null;
    title: string;
    issuer?: string | null;
    certificateUrl?: string | null;
    issuedOn?: string | null;
    expiresOn?: string | null;
    verificationStatus: string;
    createdAt: string;
  }>;
  verificationRequests: Array<Record<string, unknown>>;
  featuredSubscriptions: WorkerSubscriptionSnapshot["subscriptions"];
  subscriptionInvoices: WorkerSubscriptionSnapshot["invoices"];
  portfolioItems: Array<{
    id: string;
    workerProfileId: string;
    mediaAssetId?: string | null;
    title?: string | null;
    caption?: string | null;
    mediaUrl: string;
    sortOrder: number;
    createdAt: string;
    mediaAsset?: AdminMediaAssetItem | null;
  }>;
  availabilityRules: Array<{
    id: string;
    workerProfileId: string;
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    timezone: string;
    createdAt: string;
  }>;
  availabilityExceptions: Array<{
    id: string;
    workerProfileId: string;
    startsAt: string;
    endsAt: string;
    reason?: string | null;
    createdAt: string;
  }>;
  recentMediaAssets: AdminMediaAssetItem[];
  activityCollections: WorkerActivityCollections;
  activitySummary: {
    posts: number;
    comments: number;
    postLikes: number;
    commentLikes: number;
    postSaves: number;
    follows: number;
    followers: number;
    savedWorkers: number;
    reports: number;
    messages: number;
    conversations: number;
    notifications: number;
    serviceRequests: number;
    bookings: number;
    reviewsWritten: number;
    reviewsReceived: number;
    supportTickets: number;
    fraudSignals: number;
    mediaAssets: number;
    assignments: number;
    bookingsAsWorker: number;
    savedByUsers: number;
    searchImpressions: number;
    services: number;
    serviceAreas: number;
    certifications: number;
    verificationRequests: number;
    portfolioItems: number;
    availabilityRules: number;
    availabilityExceptions: number;
    featuredSubscriptions: number;
    subscriptionInvoices: number;
  };
  activityTimeline: AdminActivityItem[];
}

export interface AdminContentHistoryReport {
  id: string;
  reporterUserId: string;
  entityType: string;
  entityId: string;
  reason: string;
  severity: string;
  status: string;
  createdAt: string;
  moderationCases: AdminModerationCaseItem[];
}

export interface AdminContentView {
  entityType: string;
  entityId: string;
  content: Record<string, unknown>;
  moderationHistory: AdminContentHistoryReport[];
}

export interface AdminReportDetail extends Omit<AdminReportListItem, "moderationCases"> {
  moderationCases: Array<{
    id: string;
    reportId: string;
    assignedAdminUserId?: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    assignedAdminUser?: UserSummary | null;
    actions: Array<{
      id: string;
      moderationCaseId: string;
      performedByAdminUserId?: string | null;
      actionType: string;
      entityType: string;
      entityId: string;
      notes?: string | null;
      createdAt: string;
      performedByAdminUser?: UserSummary | null;
    }>;
  }>;
}

export interface AdminModerationCaseDetail extends Omit<AdminModerationCaseItem, "actions"> {
  actions: Array<{
    id: string;
    moderationCaseId: string;
    performedByAdminUserId?: string | null;
    actionType: string;
    entityType: string;
    entityId: string;
    notes?: string | null;
    createdAt: string;
    performedByAdminUser?: UserSummary | null;
  }>;
}

export interface ServiceRequestDetail extends ServiceRequestItemSummary {
  customerUser?: UserSummary | null;
  tradeCategory?: TradeSummary | null;
  assignments: WorkerAssignmentSummary[];
  booking?: BookingItemSummary | null;
  items?: Array<{
    id: string;
    serviceRequestId: string;
    label: string;
    quantity: number;
    note?: string | null;
  }>;
}

export interface BookingDetail extends BookingItemSummary {
  review?: {
    id: string;
    bookingId: string;
    reviewerUserId: string;
    revieweeUserId: string;
    rating: number;
    body: string;
    createdAt: string;
    dimensionScores: Array<{
      id: string;
      reviewId: string;
      dimensionKey: string;
      score: number;
    }>;
  } | null;
  serviceRequest?: ServiceRequestDetail | null;
}
