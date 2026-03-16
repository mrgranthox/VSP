/**
 * prisma/seed.ts
 * Vocational Services Platform — Authoritative Seed Script
 *
 * Run:  npx ts-node prisma/seed.ts
 * Or:   npx prisma db seed   (if configured in package.json prisma.seed)
 *
 * Idempotent: safe to run multiple times — uses upsert throughout.
 */

import { PrismaClient, AdminRoleKey, VerificationStatus, BookingStatus,
         RequestStatus, AssignmentStatus, ConversationType, MessageType,
         NotificationChannel, VisibilityScope, ReportStatus,
         ModerationCaseStatus, SupportTicketStatus, SupportPriority,
         ModerationSeverity } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ─── FIXED IDs (deterministic — used in tests and fixtures) ──────────────────
const IDs = {
  // Users
  superAdmin:        'aaaaaaaa-0001-4000-a000-000000000001',
  admin:             'aaaaaaaa-0002-4000-a000-000000000002',
  moderator:         'aaaaaaaa-0003-4000-a000-000000000003',
  support:           'aaaaaaaa-0004-4000-a000-000000000004',
  customerAlice:     'aaaaaaaa-0005-4000-a000-000000000005',
  workerBob:         'aaaaaaaa-0006-4000-a000-000000000006',
  workerUnverified:  'aaaaaaaa-0007-4000-a000-000000000007',
  // Worker profiles
  wpBob:             'bbbbbbbb-0001-4000-b000-000000000001',
  wpUnverified:      'bbbbbbbb-0002-4000-b000-000000000002',
  // Roles
  roleModerator:     'cccccccc-0001-4000-c000-000000000001',
  roleSupport:       'cccccccc-0002-4000-c000-000000000002',
  roleAdmin:         'cccccccc-0003-4000-c000-000000000003',
  roleSuperAdmin:    'cccccccc-0004-4000-c000-000000000004',
  // City
  cityAccra:         'dddddddd-0001-4000-d000-000000000001',
  cityLagos:         'dddddddd-0002-4000-d000-000000000002',
  cityNairobi:       'dddddddd-0003-4000-d000-000000000003',
  // Trades
  tradeElectrician:  'eeeeeeee-0001-4000-e000-000000000001',
  tradePlumber:      'eeeeeeee-0002-4000-e000-000000000002',
  tradeCarpenter:    'eeeeeeee-0003-4000-e000-000000000003',
  tradePainter:      'eeeeeeee-0004-4000-e000-000000000004',
  tradeMechanic:     'eeeeeeee-0005-4000-e000-000000000005',
  tradeSeamstress:   'eeeeeeee-0006-4000-e000-000000000006',
  tradeSecurity:     'eeeeeeee-0007-4000-e000-000000000007',
  tradeHVAC:         'eeeeeeee-0008-4000-e000-000000000008',
  tradeWelder:       'eeeeeeee-0009-4000-e000-000000000009',
  tradeMason:        'eeeeeeee-0010-4000-e000-000000000010',
  tradeTiler:        'eeeeeeee-0011-4000-e000-000000000011',
  tradeLandscaper:   'eeeeeeee-0012-4000-e000-000000000012',
  tradeCleaner:      'eeeeeeee-0013-4000-e000-000000000013',
  tradeHandyman:     'eeeeeeee-0014-4000-e000-000000000014',
  // Fixture data
  fixtureRequest:    'ffffffff-0001-4000-f000-000000000001',
  fixtureBooking:    'ffffffff-0002-4000-f000-000000000002',
  fixtureReview:     'ffffffff-0003-4000-f000-000000000003',
  fixturePost:       'ffffffff-0004-4000-f000-000000000004',
  fixtureConv:       'ffffffff-0005-4000-f000-000000000005',
  fixtureMessage:    'ffffffff-0006-4000-f000-000000000006',
  fixtureTicket:     'ffffffff-0007-4000-f000-000000000007',
  fixtureModeCase:   'ffffffff-0008-4000-f000-000000000008',
  fixtureReport:     'ffffffff-0009-4000-f000-000000000009',
};

// ─── PERMISSIONS ─────────────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  { key: 'USER_VIEW',                  desc: 'View any user account in admin' },
  { key: 'USER_SUSPEND',               desc: 'Suspend a user account' },
  { key: 'USER_REACTIVATE',            desc: 'Reactivate a suspended user' },
  { key: 'WORKER_VIEW',                desc: 'View worker profiles in admin context' },
  { key: 'WORKER_VERIFY',              desc: 'Approve a worker verification request' },
  { key: 'WORKER_REJECT_VERIFICATION', desc: 'Reject a worker verification request' },
  { key: 'POST_DELETE',                desc: 'Hard-delete a post' },
  { key: 'COMMENT_DELETE',             desc: 'Hard-delete a comment' },
  { key: 'REVIEW_DELETE',              desc: 'Hard-delete a review' },
  { key: 'REPORT_VIEW',                desc: 'View abuse reports' },
  { key: 'MODERATION_CASE_ASSIGN',     desc: 'Assign moderation cases to reviewers' },
  { key: 'MODERATION_CASE_ACTION',     desc: 'Record enforcement actions on cases' },
  { key: 'SUPPORT_TICKET_VIEW',        desc: 'View support tickets' },
  { key: 'SUPPORT_TICKET_ASSIGN',      desc: 'Assign tickets to support agents' },
  { key: 'SUPPORT_TICKET_RESPOND',     desc: 'Add messages to support tickets' },
  { key: 'AUDIT_LOG_VIEW',             desc: 'View system audit logs' },
  { key: 'ANALYTICS_VIEW_OVERVIEW',    desc: 'View platform KPI dashboard' },
  { key: 'ANALYTICS_VIEW_SEARCH',      desc: 'View search analytics' },
  { key: 'ANALYTICS_VIEW_ENGAGEMENT',  desc: 'View engagement and social metrics' },
  { key: 'CONFIG_VIEW',                desc: 'View system configs' },
  { key: 'CONFIG_UPDATE',              desc: 'Modify system config values' },
  { key: 'FEATURE_FLAG_VIEW',          desc: 'View feature flags' },
  { key: 'FEATURE_FLAG_UPDATE',        desc: 'Toggle feature flags' },
  { key: 'CITY_VIEW',                  desc: 'View city configs' },
  { key: 'CITY_CREATE',                desc: 'Create new city config' },
  { key: 'CITY_UPDATE',                desc: 'Edit city config' },
  { key: 'ROLE_VIEW',                  desc: 'View admin roles' },
  { key: 'PERMISSION_VIEW',            desc: 'View permission catalog' },
  { key: 'ROLE_PERMISSION_UPDATE',     desc: 'Modify role-to-permission mappings' },
  { key: 'ADMIN_ROLE_ASSIGN',          desc: 'Grant admin roles to users' },
  { key: 'ADMIN_ROLE_REMOVE',          desc: 'Revoke admin roles from users' },
  { key: 'FULL_ACCESS',                desc: 'Super admin bypass — grants all capabilities' },
  // Admin frontend integration — added v2
  { key: 'SERVICE_REQUEST_VIEW',       desc: 'View all service requests in admin context' },
  { key: 'BOOKING_VIEW',               desc: 'View all bookings in admin context' },
  { key: 'FEATURED_WORKER_MANAGE',     desc: 'Manage worker featured subscriptions' },
  { key: 'FRAUD_SIGNAL_VIEW',          desc: 'View fraud signals list and details' },
  { key: 'FRAUD_SIGNAL_ACTION',        desc: 'Review, dismiss, or action fraud signals' },
  { key: 'SYSTEM_HEALTH_VIEW',         desc: 'View admin system health dashboard' },
  { key: 'CONTENT_VIEW',               desc: 'View full content of reported entities' },
  { key: 'NOTIFICATION_BROADCAST',     desc: 'Send broadcast notifications to user segments' },
  { key: 'ANALYTICS_VIEW_MARKETPLACE', desc: 'View marketplace analytics and booking funnel' },
];

// Role → permission key assignments
const ROLE_PERMISSIONS: Record<string, string[]> = {
  MODERATOR: [
    'USER_VIEW', 'WORKER_VIEW',
    'POST_DELETE', 'COMMENT_DELETE', 'REVIEW_DELETE',
    'REPORT_VIEW', 'MODERATION_CASE_ASSIGN', 'MODERATION_CASE_ACTION',
    'ANALYTICS_VIEW_ENGAGEMENT',
    'FRAUD_SIGNAL_VIEW',   // v2
    'CONTENT_VIEW',        // v2
  ],
  SUPPORT: [
    'USER_VIEW', 'WORKER_VIEW',
    'SUPPORT_TICKET_VIEW', 'SUPPORT_TICKET_ASSIGN', 'SUPPORT_TICKET_RESPOND',
  ],
  ADMIN: [
    'USER_VIEW', 'USER_SUSPEND', 'USER_REACTIVATE',
    'WORKER_VIEW', 'WORKER_VERIFY', 'WORKER_REJECT_VERIFICATION',
    'POST_DELETE', 'COMMENT_DELETE', 'REVIEW_DELETE',
    'REPORT_VIEW', 'MODERATION_CASE_ASSIGN', 'MODERATION_CASE_ACTION',
    'SUPPORT_TICKET_VIEW', 'SUPPORT_TICKET_ASSIGN', 'SUPPORT_TICKET_RESPOND',
    'AUDIT_LOG_VIEW',
    'ANALYTICS_VIEW_OVERVIEW', 'ANALYTICS_VIEW_SEARCH', 'ANALYTICS_VIEW_ENGAGEMENT',
    'CONFIG_VIEW', 'CONFIG_UPDATE',
    'FEATURE_FLAG_VIEW', 'FEATURE_FLAG_UPDATE',
    'CITY_VIEW', 'CITY_CREATE', 'CITY_UPDATE',
    'ROLE_VIEW', 'PERMISSION_VIEW', 'ROLE_PERMISSION_UPDATE',
    'ADMIN_ROLE_ASSIGN', 'ADMIN_ROLE_REMOVE',
    // v2 — admin frontend integration
    'SERVICE_REQUEST_VIEW', 'BOOKING_VIEW', 'FEATURED_WORKER_MANAGE',
    'FRAUD_SIGNAL_VIEW', 'FRAUD_SIGNAL_ACTION', 'SYSTEM_HEALTH_VIEW',
    'CONTENT_VIEW', 'NOTIFICATION_BROADCAST', 'ANALYTICS_VIEW_MARKETPLACE',
  ],
  SUPER_ADMIN: ['FULL_ACCESS'],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

// ─── SEED FUNCTIONS ───────────────────────────────────────────────────────────

async function seedCityConfigs() {
  log('Seeding city configs...');
  const cities = [
    { id: IDs.cityAccra,   slug: 'accra',   name: 'Accra',   countryCode: 'GH', currencyCode: 'GHS', timezone: 'Africa/Accra',   defaultSearchRadiusKm: 10, isEnabled: true },
    { id: IDs.cityLagos,   slug: 'lagos',   name: 'Lagos',   countryCode: 'NG', currencyCode: 'NGN', timezone: 'Africa/Lagos',   defaultSearchRadiusKm: 15, isEnabled: true },
    { id: IDs.cityNairobi, slug: 'nairobi', name: 'Nairobi', countryCode: 'KE', currencyCode: 'KES', timezone: 'Africa/Nairobi', defaultSearchRadiusKm: 10, isEnabled: true },
  ];
  for (const city of cities) {
    await prisma.cityConfig.upsert({ where: { slug: city.slug }, create: city, update: city });
  }
  log(`  ✓ ${cities.length} cities`);
}

async function seedTradeCategories() {
  log('Seeding trade categories...');
  const trades = [
    { id: IDs.tradeElectrician, slug: 'electrician', name: 'Electrician',      iconUrl: null, isEnabled: true },
    { id: IDs.tradePlumber,     slug: 'plumber',      name: 'Plumber',          iconUrl: null, isEnabled: true },
    { id: IDs.tradeCarpenter,   slug: 'carpenter',    name: 'Carpenter',        iconUrl: null, isEnabled: true },
    { id: IDs.tradePainter,     slug: 'painter',      name: 'Painter',          iconUrl: null, isEnabled: true },
    { id: IDs.tradeMechanic,    slug: 'mechanic',     name: 'Mechanic',         iconUrl: null, isEnabled: true },
    { id: IDs.tradeSeamstress,  slug: 'seamstress',   name: 'Seamstress / Tailor', iconUrl: null, isEnabled: true },
    { id: IDs.tradeSecurity,    slug: 'security',     name: 'Security Personnel', iconUrl: null, isEnabled: true },
    { id: IDs.tradeHVAC,        slug: 'hvac_technician', name: 'HVAC Technician', iconUrl: null, isEnabled: true },
    { id: IDs.tradeWelder,      slug: 'welder',       name: 'Welder',           iconUrl: null, isEnabled: true },
    { id: IDs.tradeMason,       slug: 'mason',        name: 'Mason / Bricklayer', iconUrl: null, isEnabled: true },
    { id: IDs.tradeTiler,       slug: 'tiler',        name: 'Tiler',            iconUrl: null, isEnabled: true },
    { id: IDs.tradeLandscaper,  slug: 'landscaper',   name: 'Landscaper',       iconUrl: null, isEnabled: true },
    { id: IDs.tradeCleaner,     slug: 'cleaner',      name: 'Cleaner',          iconUrl: null, isEnabled: true },
    { id: IDs.tradeHandyman,    slug: 'handyman',     name: 'Handyman',         iconUrl: null, isEnabled: true },
  ];
  for (const trade of trades) {
    await prisma.tradeCategory.upsert({ where: { slug: trade.slug }, create: trade, update: { name: trade.name, isEnabled: trade.isEnabled } });
  }
  log(`  ✓ ${trades.length} trade categories`);
}

async function seedAdminRolesAndPermissions() {
  log('Seeding admin roles, permissions, and mappings...');

  // 1. Upsert roles
  const roles = [
    { id: IDs.roleModerator, roleKey: AdminRoleKey.MODERATOR, label: 'Moderator', description: 'Trust and safety — content moderation' },
    { id: IDs.roleSupport,   roleKey: AdminRoleKey.SUPPORT,   label: 'Support',   description: 'Customer service and ticket management' },
    { id: IDs.roleAdmin,     roleKey: AdminRoleKey.ADMIN,     label: 'Admin',     description: 'Platform operations — worker verification, config, analytics' },
    { id: IDs.roleSuperAdmin,roleKey: AdminRoleKey.SUPER_ADMIN, label: 'Super Admin', description: 'Full platform access including role assignment' },
  ];
  for (const role of roles) {
    await prisma.adminRole.upsert({ where: { roleKey: role.roleKey }, create: role, update: { label: role.label, description: role.description } });
  }
  log(`  ✓ ${roles.length} roles`);

  // 2. Upsert permissions
  const permMap: Record<string, string> = {};
  for (const perm of ALL_PERMISSIONS) {
    const record = await prisma.adminPermission.upsert({
      where: { permissionKey: perm.key },
      create: { permissionKey: perm.key, description: perm.desc },
      update: { description: perm.desc },
    });
    permMap[perm.key] = record.id;
  }
  log(`  ✓ ${ALL_PERMISSIONS.length} permission keys`);

  // 3. Wire role-permission mappings
  for (const [roleKey, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.adminRole.findUnique({ where: { roleKey: roleKey as AdminRoleKey } });
    if (!role) continue;
    for (const pk of permKeys) {
      const permId = permMap[pk];
      if (!permId) continue;
      await prisma.adminRolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
        create: { roleId: role.id, permissionId: permId },
        update: {},
      });
    }
  }
  log(`  ✓ Role-permission mappings applied`);
}

async function seedFeatureFlags() {
  log('Seeding feature flags...');
  const flags = [
    { flagKey: 'ENABLE_VIDEO_PORTFOLIO',  description: 'Allow workers to upload video portfolio items',   defaultEnabled: false },
    { flagKey: 'SEMANTIC_SEARCH_V2',      description: 'Enable vector/semantic worker recommendations',    defaultEnabled: false },
    { flagKey: 'SHOW_WORKER_EARNINGS',    description: 'Show earnings dashboard to workers',               defaultEnabled: false },
    { flagKey: 'MULTI_CURRENCY',          description: 'Enable multi-currency pricing display',            defaultEnabled: false },
    { flagKey: 'WORKER_AVAILABILITY',     description: 'Show availability calendar on worker profiles',    defaultEnabled: true  },
    { flagKey: 'SOCIAL_FEED',             description: 'Enable social activity feed',                      defaultEnabled: true  },
    { flagKey: 'FEATURED_WORKERS',        description: 'Enable featured worker placement on search',       defaultEnabled: true  },
    { flagKey: 'CHAT_ATTACHMENTS',        description: 'Allow file attachments in chat',                   defaultEnabled: true  },
    { flagKey: 'BOOKING_RESCHEDULE',      description: 'Allow booking reschedule requests',                defaultEnabled: true  },
    { flagKey: 'REVIEW_DIMENSIONS',       description: 'Show structured dimension scores on reviews',      defaultEnabled: true  },
  ];
  for (const flag of flags) {
    await prisma.featureFlag.upsert({ where: { flagKey: flag.flagKey }, create: flag, update: { description: flag.description } });
  }
  log(`  ✓ ${flags.length} feature flags`);
}

async function seedSystemConfigs() {
  log('Seeding system configs...');
  const configs = [
    { configKey: 'review_window_hours',             valueJson: 168 },
    { configKey: 'response_rate_window_hours',       valueJson: 48 },
    { configKey: 'response_rate_min_assignments',    valueJson: 3 },
    { configKey: 'service_request_expiry_hours',     valueJson: 48 },
    { configKey: 'service_request_max_assignments',  valueJson: 10 },
    { configKey: 'booking_conflict_buffer_minutes',  valueJson: 30 },
    { configKey: 'booking_auto_complete_hours',      valueJson: 24 },
    { configKey: 'featured_expiry_warning_days',     valueJson: 7 },
    { configKey: 'fraud_score_moderation_threshold', valueJson: 70 },
    { configKey: 'fraud_score_auto_suspend_threshold', valueJson: 90 },
    { configKey: 'support_ticket_auto_close_days',   valueJson: 7 },
    { configKey: 'worker_cold_start_boost_days',     valueJson: 30 },
    { configKey: 'worker_stale_profile_days',        valueJson: 180 },
    { configKey: 'max_upload_size_mb',               valueJson: { avatar: 5, portfolio_image: 50, portfolio_video: 200, certification: 20, chat_attachment: 25 } },
    { configKey: 'pagination_max_limit',             valueJson: 100 },
    { configKey: 'search_ranking_weights',           valueJson: { text_relevance: 0.40, avg_rating: 0.20, is_featured: 0.15, profile_complete: 0.10, response_rate: 0.10, distance: 0.05 } },
    { configKey: 'featured_subscription_price_minor', valueJson: 1000 },
    { configKey: 'featured_subscription_duration_days', valueJson: 30 },
    { configKey: 'default_search_radius_km',         valueJson: 10 },
    { configKey: 'max_search_radius_km',             valueJson: 100 },
  ];
  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { configKey: config.configKey },
      create: config,
      update: { valueJson: config.valueJson },
    });
  }
  log(`  ✓ ${configs.length} system configs`);
}

async function seedUsers() {
  log('Seeding fixture users...');
  const password = await hash(process.env.SEED_ADMIN_PASSWORD ?? 'Change-This-Password-123!');

  const users = [
    { id: IDs.superAdmin,       email: process.env.SEED_ADMIN_EMAIL ?? 'superadmin@vocationalplatform.com', passwordHash: password, firstName: 'Super', lastName: 'Admin',   isEmailVerified: true },
    { id: IDs.admin,            email: 'admin@vocationalplatform.com',     passwordHash: password, firstName: 'Platform', lastName: 'Admin',   isEmailVerified: true },
    { id: IDs.moderator,        email: 'moderator@vocationalplatform.com', passwordHash: password, firstName: 'Content', lastName: 'Mod',     isEmailVerified: true },
    { id: IDs.support,          email: 'support@vocationalplatform.com',   passwordHash: password, firstName: 'Support', lastName: 'Agent',   isEmailVerified: true },
    { id: IDs.customerAlice,    email: 'alice@example.com',                passwordHash: password, firstName: 'Alice',  lastName: 'Customer', isEmailVerified: true },
    { id: IDs.workerBob,        email: 'bob@example.com',                  passwordHash: password, firstName: 'Bob',    lastName: 'Worker',   isEmailVerified: true },
    { id: IDs.workerUnverified, email: 'unverified@example.com',           passwordHash: password, firstName: 'Unverified', lastName: 'Worker', isEmailVerified: true },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: { id: u.id, email: u.email, passwordHash: u.passwordHash, isEmailVerified: u.isEmailVerified },
      update: {},
    });
    await prisma.userProfile.upsert({
      where: { userId: u.id },
      create: { userId: u.id, firstName: u.firstName, lastName: u.lastName, cityId: IDs.cityAccra },
      update: {},
    });
  }
  log(`  ✓ ${users.length} users with profiles`);

  // Assign admin roles
  const roleAssignments = [
    { userId: IDs.superAdmin, roleKey: AdminRoleKey.SUPER_ADMIN },
    { userId: IDs.admin, roleKey: AdminRoleKey.ADMIN },
    { userId: IDs.moderator, roleKey: AdminRoleKey.MODERATOR },
    { userId: IDs.support, roleKey: AdminRoleKey.SUPPORT },
  ];
  for (const a of roleAssignments) {
    const role = await prisma.adminRole.findUnique({ where: { roleKey: a.roleKey } });
    if (!role) continue;
    await prisma.adminUser.upsert({
      where: { userId_roleId: { userId: a.userId, roleId: role.id } },
      create: { userId: a.userId, roleId: role.id, assignedByUserId: IDs.superAdmin },
      update: {},
    });
  }
  log(`  ✓ Admin role assignments applied`);
}

async function seedWorkerProfiles() {
  log('Seeding worker profiles...');

  // Approved worker — Bob
  await prisma.workerProfile.upsert({
    where: { userId: IDs.workerBob },
    create: {
      id: IDs.wpBob,
      userId: IDs.workerBob,
      headline: 'Licensed Electrician — 8 Years Experience',
      bio: 'Fully licensed electrician specialising in residential wiring, circuit installation, and electrical fault diagnosis. Available across Accra and surrounding areas.',
      experienceYears: 8,
      verificationStatus: VerificationStatus.APPROVED,
      avgRating: 4.75,
      totalReviews: 12,
      jobsCompleted: 15,
      responseRate: 92.5,
      serviceRadiusKm: 20,
      isFeatured: false,
    },
    update: {},
  });

  // Trade category
  await prisma.workerTradeCategory.upsert({
    where: { workerProfileId_tradeCategoryId: { workerProfileId: IDs.wpBob, tradeCategoryId: IDs.tradeElectrician } },
    create: { workerProfileId: IDs.wpBob, tradeCategoryId: IDs.tradeElectrician },
    update: {},
  });

  // Service area
  await prisma.workerServiceArea.upsert({
    where: { id: 'bbbbbbbb-0100-4000-b000-000000000100' },
    create: { id: 'bbbbbbbb-0100-4000-b000-000000000100', workerProfileId: IDs.wpBob, cityId: IDs.cityAccra, centerLat: 5.6037, centerLng: -0.1870, radiusKm: 20 },
    update: {},
  });

  // Worker service
  await prisma.workerService.upsert({
    where: { id: 'bbbbbbbb-0200-4000-b000-000000000200' },
    create: { id: 'bbbbbbbb-0200-4000-b000-000000000200', workerProfileId: IDs.wpBob, title: 'Residential Wiring & Installation', description: 'Full residential electrical installation and fault diagnosis.', basePriceMinor: 20000, currencyCode: 'GHS', isEnabled: true },
    update: {},
  });

  // Unverified worker
  await prisma.workerProfile.upsert({
    where: { userId: IDs.workerUnverified },
    create: { id: IDs.wpUnverified, userId: IDs.workerUnverified, headline: 'Plumber — 3 Years Experience', bio: 'Experienced plumber.', experienceYears: 3, verificationStatus: VerificationStatus.SUBMITTED, serviceRadiusKm: 10 },
    update: {},
  });

  log(`  ✓ Worker profiles seeded`);
}

async function seedNotificationPreferences() {
  log('Seeding notification preferences...');
  const userIds = [IDs.customerAlice, IDs.workerBob, IDs.workerUnverified, IDs.superAdmin, IDs.admin, IDs.moderator, IDs.support];
  for (const userId of userIds) {
    await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, chatPushEnabled: true, requestPushEnabled: true, marketingEmailEnabled: false },
      update: {},
    });
  }
  log(`  ✓ Notification preferences`);
}

async function seedFixtureData() {
  log('Seeding fixture data for integration tests...');

  // --- Service Request ---
  await prisma.serviceRequest.upsert({
    where: { id: IDs.fixtureRequest },
    create: {
      id: IDs.fixtureRequest,
      customerUserId: IDs.customerAlice,
      tradeCategoryId: IDs.tradeElectrician,
      preferredWorkerProfileId: null,
      title: 'Replace faulty light switches in 3-bedroom house',
      description: 'Three light switches need replacing. One in the living room has been sparking.',
      locationText: 'East Legon, Accra',
      lat: 5.6351,
      lng: -0.1658,
      status: RequestStatus.COMPLETED,
      requestedAt: new Date('2026-01-10T09:00:00Z'),
      scheduledAt: new Date('2026-01-12T10:00:00Z'),
      expiresAt: new Date('2026-01-14T09:00:00Z'),
    },
    update: {},
  });

  // --- Assignment ---
  await prisma.serviceRequestAssignment.upsert({
    where: { id: 'ffffffff-0001-4001-f000-000000000001' },
    create: {
      id: 'ffffffff-0001-4001-f000-000000000001',
      serviceRequestId: IDs.fixtureRequest,
      workerProfileId: IDs.wpBob,
      assignmentStatus: AssignmentStatus.ACCEPTED,
      assignedAt: new Date('2026-01-10T09:05:00Z'),
      respondedAt: new Date('2026-01-10T09:20:00Z'),
    },
    update: {},
  });

  // --- Status History ---
  const statusHistory = [
    { fromStatus: null, toStatus: RequestStatus.OPEN, changedAt: new Date('2026-01-10T09:00:00Z') },
    { fromStatus: RequestStatus.OPEN, toStatus: RequestStatus.MATCHED, changedAt: new Date('2026-01-10T09:05:00Z') },
    { fromStatus: RequestStatus.MATCHED, toStatus: RequestStatus.ACCEPTED, changedAt: new Date('2026-01-10T09:20:00Z') },
    { fromStatus: RequestStatus.ACCEPTED, toStatus: RequestStatus.IN_PROGRESS, changedAt: new Date('2026-01-12T10:05:00Z') },
    { fromStatus: RequestStatus.IN_PROGRESS, toStatus: RequestStatus.COMPLETED, changedAt: new Date('2026-01-12T13:00:00Z') },
  ];
  for (let i = 0; i < statusHistory.length; i++) {
    const sid = `ffffffff-00${String(i+1).padStart(2,'0')}-4002-f000-000000000001`;
    await prisma.serviceRequestStatusHistory.upsert({
      where: { id: sid },
      create: { id: sid, serviceRequestId: IDs.fixtureRequest, ...statusHistory[i], changedByUserId: i === 0 ? IDs.customerAlice : (i >= 3 ? IDs.workerBob : null) },
      update: {},
    });
  }

  // --- Booking ---
  await prisma.booking.upsert({
    where: { id: IDs.fixtureBooking },
    create: {
      id: IDs.fixtureBooking,
      serviceRequestId: IDs.fixtureRequest,
      workerProfileId: IDs.wpBob,
      customerUserId: IDs.customerAlice,
      scheduledStart: new Date('2026-01-12T10:00:00Z'),
      scheduledEnd: new Date('2026-01-12T13:00:00Z'),
      status: BookingStatus.COMPLETED,
      completedAt: new Date('2026-01-12T13:00:00Z'),
    },
    update: {},
  });

  // --- Review ---
  await prisma.review.upsert({
    where: { id: IDs.fixtureReview },
    create: {
      id: IDs.fixtureReview,
      bookingId: IDs.fixtureBooking,
      reviewerUserId: IDs.customerAlice,
      revieweeUserId: IDs.workerBob,
      rating: 5,
      body: 'Bob was professional, arrived on time, and the work was excellent. Highly recommend.',
    },
    update: {},
  });

  // Review dimensions
  const dimensions = [
    { key: 'quality', score: 5 }, { key: 'communication', score: 5 },
    { key: 'punctuality', score: 4 }, { key: 'value', score: 5 },
  ];
  for (const dim of dimensions) {
    await prisma.reviewDimensionScore.upsert({
      where: { reviewId_dimensionKey: { reviewId: IDs.fixtureReview, dimensionKey: dim.key } },
      create: { reviewId: IDs.fixtureReview, dimensionKey: dim.key, score: dim.score },
      update: {},
    });
  }

  // --- Post ---
  await prisma.post.upsert({
    where: { id: IDs.fixturePost },
    create: {
      id: IDs.fixturePost,
      authorUserId: IDs.workerBob,
      body: 'Just completed a full residential rewiring job in East Legon. The client was very happy with the results! #electrician #accra #vocationalplatform',
      visibility: VisibilityScope.PUBLIC,
      isDeleted: false,
    },
    update: {},
  });

  // --- Conversation ---
  await prisma.conversation.upsert({
    where: { id: IDs.fixtureConv },
    create: { id: IDs.fixtureConv, conversationType: ConversationType.DIRECT, serviceRequestId: null },
    update: {},
  });
  for (const userId of [IDs.customerAlice, IDs.workerBob]) {
    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: IDs.fixtureConv, userId } },
      create: { conversationId: IDs.fixtureConv, userId },
      update: {},
    });
  }
  await prisma.message.upsert({
    where: { id: IDs.fixtureMessage },
    create: { id: IDs.fixtureMessage, conversationId: IDs.fixtureConv, senderId: IDs.customerAlice, messageType: MessageType.TEXT, body: 'Hi Bob, I saw your profile — are you available next week for some electrical work?' },
    update: {},
  });

  // --- Support Ticket ---
  await prisma.supportTicket.upsert({
    where: { id: IDs.fixtureTicket },
    create: {
      id: IDs.fixtureTicket,
      openedByUserId: IDs.customerAlice,
      subject: 'Question about booking cancellation policy',
      body: 'Hi, I need to cancel a booking — what is the cancellation policy and will I be charged?',
      status: SupportTicketStatus.OPEN,
      priority: SupportPriority.MEDIUM,
    },
    update: {},
  });

  // --- Report and Moderation Case ---
  await prisma.report.upsert({
    where: { id: IDs.fixtureReport },
    create: {
      id: IDs.fixtureReport,
      reporterUserId: IDs.customerAlice,
      entityType: 'post',
      entityId: IDs.fixturePost,
      reason: 'Suspected spam content',
      severity: ModerationSeverity.LOW,
      status: ReportStatus.OPEN,
    },
    update: {},
  });
  await prisma.moderationCase.upsert({
    where: { id: IDs.fixtureModeCase },
    create: {
      id: IDs.fixtureModeCase,
      reportId: IDs.fixtureReport,
      assignedAdminUserId: IDs.moderator,
      status: ModerationCaseStatus.OPEN,
    },
    update: {},
  });

  log(`  ✓ Fixture data seeded (request, booking, review, post, conversation, ticket, moderation case)`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== Vocational Services Platform — Seed Script ===\n');
  await seedCityConfigs();
  await seedTradeCategories();
  await seedAdminRolesAndPermissions();
  await seedFeatureFlags();
  await seedSystemConfigs();
  await seedUsers();
  await seedWorkerProfiles();
  await seedNotificationPreferences();
  await seedFixtureData();
  console.log('\n=== Seed complete ✓ ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
