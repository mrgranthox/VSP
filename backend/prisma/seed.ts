import { randomUUID } from "node:crypto";

import {
  AdminRoleKey,
  AssignmentStatus,
  BookingStatus,
  ConversationType,
  MessageType,
  ModerationCaseStatus,
  ModerationSeverity,
  NotificationChannel,
  ReportStatus,
  RequestStatus,
  SupportPriority,
  SupportTicketStatus,
  VerificationStatus,
  VisibilityScope
} from "@prisma/client";
import bcrypt from "bcrypt";

import { prisma } from "../src/lib/prisma";
import { AdminRepository } from "../src/modules/admin/admin.repository";

const adminRepository = new AdminRepository();

const FIXED_PASSWORD = "Change-This-Password-123!";

const IDs = {
  superAdmin: "aaaaaaaa-0001-4000-a000-000000000001",
  admin: "aaaaaaaa-0002-4000-a000-000000000002",
  moderator: "aaaaaaaa-0003-4000-a000-000000000003",
  support: "aaaaaaaa-0004-4000-a000-000000000004",
  customerAlice: "aaaaaaaa-0005-4000-a000-000000000005",
  workerBob: "aaaaaaaa-0006-4000-a000-000000000006",
  workerUnverified: "aaaaaaaa-0007-4000-a000-000000000007",
  wpBob: "bbbbbbbb-0001-4000-b000-000000000001",
  wpUnverified: "bbbbbbbb-0002-4000-b000-000000000002",
  roleModerator: "cccccccc-0001-4000-c000-000000000001",
  roleSupport: "cccccccc-0002-4000-c000-000000000002",
  roleAdmin: "cccccccc-0003-4000-c000-000000000003",
  roleSuperAdmin: "cccccccc-0004-4000-c000-000000000004",
  cityAccra: "dddddddd-0001-4000-d000-000000000001",
  cityLagos: "dddddddd-0002-4000-d000-000000000002",
  cityNairobi: "dddddddd-0003-4000-d000-000000000003",
  tradeElectrician: "eeeeeeee-0001-4000-e000-000000000001",
  tradePlumber: "eeeeeeee-0002-4000-e000-000000000002",
  tradeCarpenter: "eeeeeeee-0003-4000-e000-000000000003",
  tradePainter: "eeeeeeee-0004-4000-e000-000000000004",
  tradeMechanic: "eeeeeeee-0005-4000-e000-000000000005",
  tradeSeamstress: "eeeeeeee-0006-4000-e000-000000000006",
  tradeSecurity: "eeeeeeee-0007-4000-e000-000000000007",
  tradeHVAC: "eeeeeeee-0008-4000-e000-000000000008",
  tradeWelder: "eeeeeeee-0009-4000-e000-000000000009",
  tradeMason: "eeeeeeee-0010-4000-e000-000000000010",
  tradeTiler: "eeeeeeee-0011-4000-e000-000000000011",
  tradeLandscaper: "eeeeeeee-0012-4000-e000-000000000012",
  tradeCleaner: "eeeeeeee-0013-4000-e000-000000000013",
  tradeHandyman: "eeeeeeee-0014-4000-e000-000000000014",
  fixtureRequest: "ffffffff-0001-4000-f000-000000000001",
  fixtureBooking: "ffffffff-0002-4000-f000-000000000002",
  fixtureReview: "ffffffff-0003-4000-f000-000000000003",
  fixturePost: "ffffffff-0004-4000-f000-000000000004",
  fixtureConv: "ffffffff-0005-4000-f000-000000000005",
  fixtureMessage: "ffffffff-0006-4000-f000-000000000006",
  fixtureTicket: "ffffffff-0007-4000-f000-000000000007",
  fixtureModerationCase: "ffffffff-0008-4000-f000-000000000008",
  fixtureReport: "ffffffff-0009-4000-f000-000000000009",
  fixturePaymentIntent: "ffffffff-0010-4000-f000-000000000010",
  fixtureFeaturedSubscription: "ffffffff-0011-4000-f000-000000000011",
  fixtureSubscriptionInvoice: "ffffffff-0012-4000-f000-000000000012",
  fixtureNotificationCustomer: "ffffffff-0013-4000-f000-000000000013",
  fixtureNotificationWorker: "ffffffff-0014-4000-f000-000000000014",
  fixtureFraudSignal: "ffffffff-0015-4000-f000-000000000015",
  fixtureAnalyticsEvent: "ffffffff-0016-4000-f000-000000000016",
  fixtureSearchImpression: "ffffffff-0017-4000-f000-000000000017",
  fixtureVerificationRequest: "ffffffff-0018-4000-f000-000000000018"
} as const;

const ROLE_METADATA: Record<AdminRoleKey, { id: string; label: string; description: string }> = {
  MODERATOR: {
    id: IDs.roleModerator,
    label: "Moderator",
    description: "Moderation-focused admin access"
  },
  SUPPORT: {
    id: IDs.roleSupport,
    label: "Support",
    description: "Support operations access"
  },
  ADMIN: {
    id: IDs.roleAdmin,
    label: "Admin",
    description: "Broad operational admin access"
  },
  SUPER_ADMIN: {
    id: IDs.roleSuperAdmin,
    label: "Super Admin",
    description: "Full system access"
  }
};

const log = (message: string) => {
  console.log(`[seed] ${message}`);
};

const hashPassword = async (password: string): Promise<string> => bcrypt.hash(password, 12);

const upsertSystemConfig = async (configKey: string, valueJson: unknown) => {
  await prisma.systemConfig.upsert({
    where: { configKey },
    create: { configKey, valueJson: valueJson as never },
    update: { valueJson: valueJson as never }
  });
};

const seedCityConfigs = async () => {
  log("Seeding city configs...");

  const cities = [
    {
      id: IDs.cityAccra,
      slug: "accra",
      name: "Accra",
      countryCode: "GH",
      currencyCode: "GHS",
      timezone: "Africa/Accra",
      defaultSearchRadiusKm: 10,
      isEnabled: true
    },
    {
      id: IDs.cityLagos,
      slug: "lagos",
      name: "Lagos",
      countryCode: "NG",
      currencyCode: "NGN",
      timezone: "Africa/Lagos",
      defaultSearchRadiusKm: 15,
      isEnabled: true
    },
    {
      id: IDs.cityNairobi,
      slug: "nairobi",
      name: "Nairobi",
      countryCode: "KE",
      currencyCode: "KES",
      timezone: "Africa/Nairobi",
      defaultSearchRadiusKm: 10,
      isEnabled: true
    }
  ];

  for (const city of cities) {
    await prisma.cityConfig.upsert({
      where: { id: city.id },
      create: city,
      update: {
        slug: city.slug,
        name: city.name,
        countryCode: city.countryCode,
        currencyCode: city.currencyCode,
        timezone: city.timezone,
        defaultSearchRadiusKm: city.defaultSearchRadiusKm,
        isEnabled: city.isEnabled
      }
    });
  }
};

const seedTradeCategories = async () => {
  log("Seeding trade categories...");

  const trades = [
    { id: IDs.tradeElectrician, slug: "electrician", name: "Electrician" },
    { id: IDs.tradePlumber, slug: "plumber", name: "Plumber" },
    { id: IDs.tradeCarpenter, slug: "carpenter", name: "Carpenter" },
    { id: IDs.tradePainter, slug: "painter", name: "Painter" },
    { id: IDs.tradeMechanic, slug: "mechanic", name: "Mechanic" },
    { id: IDs.tradeSeamstress, slug: "seamstress", name: "Seamstress / Tailor" },
    { id: IDs.tradeSecurity, slug: "security", name: "Security Personnel" },
    { id: IDs.tradeHVAC, slug: "hvac_technician", name: "HVAC Technician" },
    { id: IDs.tradeWelder, slug: "welder", name: "Welder" },
    { id: IDs.tradeMason, slug: "mason", name: "Mason / Bricklayer" },
    { id: IDs.tradeTiler, slug: "tiler", name: "Tiler" },
    { id: IDs.tradeLandscaper, slug: "landscaper", name: "Landscaper" },
    { id: IDs.tradeCleaner, slug: "cleaner", name: "Cleaner" },
    { id: IDs.tradeHandyman, slug: "handyman", name: "Handyman" }
  ];

  for (const trade of trades) {
    await prisma.tradeCategory.upsert({
      where: { id: trade.id },
      create: {
        ...trade,
        iconUrl: null,
        isEnabled: true
      },
      update: {
        slug: trade.slug,
        name: trade.name,
        iconUrl: null,
        isEnabled: true
      }
    });
  }
};

const seedAdminCatalog = async () => {
  log("Seeding admin roles and permissions...");

  for (const [roleKey, metadata] of Object.entries(ROLE_METADATA) as Array<
    [AdminRoleKey, { id: string; label: string; description: string }]
  >) {
    await prisma.adminRole.upsert({
      where: { roleKey },
      create: {
        id: metadata.id,
        roleKey,
        label: metadata.label,
        description: metadata.description
      },
      update: {
        label: metadata.label,
        description: metadata.description
      }
    });
  }

  await adminRepository.ensureCatalog();
};

const seedFeatureFlags = async () => {
  log("Seeding feature flags...");

  const flags = [
    { flagKey: "ENABLE_VIDEO_PORTFOLIO", description: "Allow workers to upload video portfolio items", defaultEnabled: false },
    { flagKey: "SEMANTIC_SEARCH_V2", description: "Enable vector and semantic worker recommendations", defaultEnabled: false },
    { flagKey: "SHOW_WORKER_EARNINGS", description: "Show worker earnings dashboard", defaultEnabled: false },
    { flagKey: "MULTI_CURRENCY", description: "Enable multi-currency pricing display", defaultEnabled: false },
    { flagKey: "WORKER_AVAILABILITY", description: "Show worker availability calendar", defaultEnabled: true },
    { flagKey: "SOCIAL_FEED", description: "Enable social activity feed", defaultEnabled: true },
    { flagKey: "FEATURED_WORKERS", description: "Enable featured worker placement", defaultEnabled: true },
    { flagKey: "CHAT_ATTACHMENTS", description: "Allow chat attachments", defaultEnabled: true },
    { flagKey: "BOOKING_RESCHEDULE", description: "Allow booking reschedule requests", defaultEnabled: true },
    { flagKey: "REVIEW_DIMENSIONS", description: "Show structured review dimensions", defaultEnabled: true }
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { flagKey: flag.flagKey },
      create: flag,
      update: {
        description: flag.description,
        defaultEnabled: flag.defaultEnabled
      }
    });
  }
};

const seedSystemConfigs = async () => {
  log("Seeding system configs...");

  const configs: Array<[string, unknown]> = [
    ["review_window_hours", 168],
    ["response_rate_window_hours", 48],
    ["response_rate_min_assignments", 3],
    ["service_request_expiry_hours", 48],
    ["service_request_max_assignments", 10],
    ["booking_conflict_buffer_minutes", 30],
    ["booking_auto_complete_hours", 24],
    ["featured_expiry_warning_days", 7],
    ["featured_subscription_daily_price_minor", 350],
    ["boost_price_minor", 2500],
    ["fraud_score_moderation_threshold", 70],
    ["fraud_score_auto_suspend_threshold", 90],
    ["support_ticket_auto_close_days", 7],
    ["worker_cold_start_boost_days", 30],
    ["worker_stale_profile_days", 180],
    [
      "max_upload_size_mb",
      {
        avatar: 5,
        portfolio_image: 50,
        portfolio_video: 200,
        certification: 20,
        post_image: 20,
        post_video: 150,
        verification_doc: 20,
        chat_attachment: 25
      }
    ],
    ["pagination_max_limit", 100],
    [
      "search_ranking_weights",
      {
        text_relevance: 0.4,
        avg_rating: 0.2,
        is_featured: 0.15,
        profile_complete: 0.1,
        response_rate: 0.1,
        distance: 0.05
      }
    ],
    [
      "feed_ranking_weights",
      {
        recency: 0.5,
        connection: 0.2,
        engagement: 0.15,
        city_match: 0.1,
        second_degree: 0.05
      }
    ],
    ["default_search_radius_km", 10],
    ["max_search_radius_km", 100]
  ];

  for (const [configKey, valueJson] of configs) {
    await upsertSystemConfig(configKey, valueJson);
  }
};

const seedUsers = async () => {
  log("Seeding users and profiles...");

  const passwordHash = await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? FIXED_PASSWORD);
  const users = [
    {
      id: IDs.superAdmin,
      email: process.env.SEED_ADMIN_EMAIL ?? "superadmin@vocationalplatform.com",
      firstName: "Super",
      lastName: "Admin"
    },
    {
      id: IDs.admin,
      email: "admin@vocationalplatform.com",
      firstName: "Platform",
      lastName: "Admin"
    },
    {
      id: IDs.moderator,
      email: "moderator@vocationalplatform.com",
      firstName: "Content",
      lastName: "Moderator"
    },
    {
      id: IDs.support,
      email: "support@vocationalplatform.com",
      firstName: "Support",
      lastName: "Agent"
    },
    {
      id: IDs.customerAlice,
      email: "alice@example.com",
      firstName: "Alice",
      lastName: "Customer"
    },
    {
      id: IDs.workerBob,
      email: "bob@example.com",
      firstName: "Bob",
      lastName: "Worker"
    },
    {
      id: IDs.workerUnverified,
      email: "unverified@example.com",
      firstName: "Unverified",
      lastName: "Worker"
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        passwordHash,
        isEmailVerified: true,
        status: "ACTIVE"
      },
      update: {
        email: user.email,
        passwordHash,
        isEmailVerified: true,
        status: "ACTIVE"
      }
    });

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        cityId: IDs.cityAccra
      },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        cityId: IDs.cityAccra
      }
    });

    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        chatPushEnabled: true,
        requestPushEnabled: true,
        marketingEmailEnabled: false
      },
      update: {
        chatPushEnabled: true,
        requestPushEnabled: true,
        marketingEmailEnabled: false
      }
    });
  }

  const roleAssignments: Array<{ userId: string; roleKey: AdminRoleKey }> = [
    { userId: IDs.superAdmin, roleKey: AdminRoleKey.SUPER_ADMIN },
    { userId: IDs.admin, roleKey: AdminRoleKey.ADMIN },
    { userId: IDs.moderator, roleKey: AdminRoleKey.MODERATOR },
    { userId: IDs.support, roleKey: AdminRoleKey.SUPPORT }
  ];

  for (const assignment of roleAssignments) {
    const role = await prisma.adminRole.findUnique({
      where: { roleKey: assignment.roleKey }
    });

    if (!role) {
      continue;
    }

    await prisma.adminUser.upsert({
      where: {
        userId_roleId: {
          userId: assignment.userId,
          roleId: role.id
        }
      },
      create: {
        userId: assignment.userId,
        roleId: role.id,
        assignedByUserId: IDs.superAdmin
      },
      update: {
        assignedByUserId: IDs.superAdmin
      }
    });
  }
};

const seedWorkerProfiles = async () => {
  log("Seeding worker profiles...");

  await prisma.workerProfile.upsert({
    where: { id: IDs.wpBob },
    create: {
      id: IDs.wpBob,
      userId: IDs.workerBob,
      headline: "Licensed Electrician - 8 Years Experience",
      bio: "Licensed electrician focused on residential wiring, circuit installation, and electrical fault diagnosis across Accra.",
      experienceYears: 8,
      verificationStatus: VerificationStatus.APPROVED,
      avgRating: 4.75,
      totalReviews: 12,
      jobsCompleted: 15,
      responseRate: 92.5,
      serviceRadiusKm: 20,
      isFeatured: true
    },
    update: {
      headline: "Licensed Electrician - 8 Years Experience",
      bio: "Licensed electrician focused on residential wiring, circuit installation, and electrical fault diagnosis across Accra.",
      experienceYears: 8,
      verificationStatus: VerificationStatus.APPROVED,
      avgRating: 4.75,
      totalReviews: 12,
      jobsCompleted: 15,
      responseRate: 92.5,
      serviceRadiusKm: 20,
      isFeatured: true
    }
  });

  await prisma.workerTradeCategory.upsert({
    where: {
      workerProfileId_tradeCategoryId: {
        workerProfileId: IDs.wpBob,
        tradeCategoryId: IDs.tradeElectrician
      }
    },
    create: {
      workerProfileId: IDs.wpBob,
      tradeCategoryId: IDs.tradeElectrician
    },
    update: {}
  });

  await prisma.workerServiceArea.upsert({
    where: { id: "bbbbbbbb-0100-4000-b000-000000000100" },
    create: {
      id: "bbbbbbbb-0100-4000-b000-000000000100",
      workerProfileId: IDs.wpBob,
      cityId: IDs.cityAccra,
      centerLat: 5.6037,
      centerLng: -0.187,
      radiusKm: 20,
      coverageMode: "CIRCLE"
    },
    update: {
      cityId: IDs.cityAccra,
      centerLat: 5.6037,
      centerLng: -0.187,
      radiusKm: 20,
      coverageMode: "CIRCLE"
    }
  });

  await prisma.workerService.upsert({
    where: { id: "bbbbbbbb-0200-4000-b000-000000000200" },
    create: {
      id: "bbbbbbbb-0200-4000-b000-000000000200",
      workerProfileId: IDs.wpBob,
      title: "Residential Wiring and Installation",
      description: "Full residential electrical installation and fault diagnosis.",
      basePriceMinor: 20000,
      currencyCode: "GHS",
      isEnabled: true
    },
    update: {
      title: "Residential Wiring and Installation",
      description: "Full residential electrical installation and fault diagnosis.",
      basePriceMinor: 20000,
      currencyCode: "GHS",
      isEnabled: true
    }
  });

  await prisma.workerPortfolioItem.upsert({
    where: { id: "bbbbbbbb-0300-4000-b000-000000000300" },
    create: {
      id: "bbbbbbbb-0300-4000-b000-000000000300",
      workerProfileId: IDs.wpBob,
      title: "Switchboard upgrade",
      caption: "Three-phase switchboard replacement in East Legon.",
      mediaUrl: "https://cdn.example.com/portfolio/bob-switchboard.jpg",
      sortOrder: 0
    },
    update: {
      title: "Switchboard upgrade",
      caption: "Three-phase switchboard replacement in East Legon.",
      mediaUrl: "https://cdn.example.com/portfolio/bob-switchboard.jpg",
      sortOrder: 0
    }
  });

  await prisma.workerCertification.upsert({
    where: { id: "bbbbbbbb-0400-4000-b000-000000000400" },
    create: {
      id: "bbbbbbbb-0400-4000-b000-000000000400",
      workerProfileId: IDs.wpBob,
      title: "Electrical License",
      issuer: "Ghana Energy Commission",
      certificateUrl: "private/certifications/bob-electrical-license.pdf",
      issuedOn: new Date("2024-01-01"),
      expiresOn: new Date("2027-01-01"),
      verificationStatus: VerificationStatus.APPROVED
    },
    update: {
      title: "Electrical License",
      issuer: "Ghana Energy Commission",
      certificateUrl: "private/certifications/bob-electrical-license.pdf",
      issuedOn: new Date("2024-01-01"),
      expiresOn: new Date("2027-01-01"),
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  await prisma.workerProfile.upsert({
    where: { id: IDs.wpUnverified },
    create: {
      id: IDs.wpUnverified,
      userId: IDs.workerUnverified,
      headline: "Plumber - 3 Years Experience",
      bio: "General plumbing, leak repair, and home maintenance support.",
      experienceYears: 3,
      verificationStatus: VerificationStatus.SUBMITTED,
      serviceRadiusKm: 10
    },
    update: {
      headline: "Plumber - 3 Years Experience",
      bio: "General plumbing, leak repair, and home maintenance support.",
      experienceYears: 3,
      verificationStatus: VerificationStatus.SUBMITTED,
      serviceRadiusKm: 10
    }
  });

  await prisma.workerVerificationRequest.upsert({
    where: { id: IDs.fixtureVerificationRequest },
    create: {
      id: IDs.fixtureVerificationRequest,
      workerProfileId: IDs.wpUnverified,
      status: VerificationStatus.SUBMITTED,
      submittedAt: new Date("2026-01-08T10:00:00Z")
    },
    update: {
      status: VerificationStatus.SUBMITTED,
      submittedAt: new Date("2026-01-08T10:00:00Z"),
      reviewedAt: null,
      reviewNotes: null
    }
  });
};

const seedFixtureData = async () => {
  log("Seeding core fixture data...");

  await prisma.serviceRequest.upsert({
    where: { id: IDs.fixtureRequest },
    create: {
      id: IDs.fixtureRequest,
      customerUserId: IDs.customerAlice,
      tradeCategoryId: IDs.tradeElectrician,
      title: "Replace faulty light switches in a 3-bedroom house",
      description: "Three light switches need replacing. One in the living room has been sparking.",
      locationText: "East Legon, Accra",
      lat: 5.6351,
      lng: -0.1658,
      status: RequestStatus.COMPLETED,
      requestedAt: new Date("2026-01-10T09:00:00Z"),
      scheduledAt: new Date("2026-01-12T10:00:00Z"),
      expiresAt: new Date("2026-01-14T09:00:00Z")
    },
    update: {
      customerUserId: IDs.customerAlice,
      tradeCategoryId: IDs.tradeElectrician,
      title: "Replace faulty light switches in a 3-bedroom house",
      description: "Three light switches need replacing. One in the living room has been sparking.",
      locationText: "East Legon, Accra",
      lat: 5.6351,
      lng: -0.1658,
      status: RequestStatus.COMPLETED,
      requestedAt: new Date("2026-01-10T09:00:00Z"),
      scheduledAt: new Date("2026-01-12T10:00:00Z"),
      expiresAt: new Date("2026-01-14T09:00:00Z")
    }
  });

  await prisma.serviceRequestItem.upsert({
    where: { id: "ffffffff-1001-4000-f000-000000000001" },
    create: {
      id: "ffffffff-1001-4000-f000-000000000001",
      serviceRequestId: IDs.fixtureRequest,
      label: "Switch inspection",
      quantity: 3,
      note: "Three separate light switches"
    },
    update: {
      label: "Switch inspection",
      quantity: 3,
      note: "Three separate light switches"
    }
  });

  await prisma.serviceRequestAssignment.upsert({
    where: { id: "ffffffff-1002-4000-f000-000000000002" },
    create: {
      id: "ffffffff-1002-4000-f000-000000000002",
      serviceRequestId: IDs.fixtureRequest,
      workerProfileId: IDs.wpBob,
      assignmentStatus: AssignmentStatus.ACCEPTED,
      assignedAt: new Date("2026-01-10T09:05:00Z"),
      respondedAt: new Date("2026-01-10T09:20:00Z")
    },
    update: {
      assignmentStatus: AssignmentStatus.ACCEPTED,
      assignedAt: new Date("2026-01-10T09:05:00Z"),
      respondedAt: new Date("2026-01-10T09:20:00Z")
    }
  });

  const statusHistory = [
    { id: "ffffffff-1003-4000-f000-000000000003", fromStatus: null, toStatus: RequestStatus.OPEN, changedAt: new Date("2026-01-10T09:00:00Z"), changedByUserId: IDs.customerAlice },
    { id: "ffffffff-1004-4000-f000-000000000004", fromStatus: RequestStatus.OPEN, toStatus: RequestStatus.MATCHED, changedAt: new Date("2026-01-10T09:05:00Z"), changedByUserId: null },
    { id: "ffffffff-1005-4000-f000-000000000005", fromStatus: RequestStatus.MATCHED, toStatus: RequestStatus.ACCEPTED, changedAt: new Date("2026-01-10T09:20:00Z"), changedByUserId: IDs.workerBob },
    { id: "ffffffff-1006-4000-f000-000000000006", fromStatus: RequestStatus.ACCEPTED, toStatus: RequestStatus.IN_PROGRESS, changedAt: new Date("2026-01-12T10:05:00Z"), changedByUserId: IDs.workerBob },
    { id: "ffffffff-1007-4000-f000-000000000007", fromStatus: RequestStatus.IN_PROGRESS, toStatus: RequestStatus.COMPLETED, changedAt: new Date("2026-01-12T13:00:00Z"), changedByUserId: IDs.workerBob }
  ];

  for (const item of statusHistory) {
    await prisma.serviceRequestStatusHistory.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        serviceRequestId: IDs.fixtureRequest,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        changedAt: item.changedAt,
        changedByUserId: item.changedByUserId
      },
      update: {
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        changedAt: item.changedAt,
        changedByUserId: item.changedByUserId
      }
    });
  }

  await prisma.booking.upsert({
    where: { id: IDs.fixtureBooking },
    create: {
      id: IDs.fixtureBooking,
      serviceRequestId: IDs.fixtureRequest,
      workerProfileId: IDs.wpBob,
      customerUserId: IDs.customerAlice,
      scheduledStart: new Date("2026-01-12T10:00:00Z"),
      scheduledEnd: new Date("2026-01-12T13:00:00Z"),
      status: BookingStatus.COMPLETED,
      completedAt: new Date("2026-01-12T13:00:00Z")
    },
    update: {
      workerProfileId: IDs.wpBob,
      customerUserId: IDs.customerAlice,
      scheduledStart: new Date("2026-01-12T10:00:00Z"),
      scheduledEnd: new Date("2026-01-12T13:00:00Z"),
      status: BookingStatus.COMPLETED,
      completedAt: new Date("2026-01-12T13:00:00Z")
    }
  });

  await prisma.review.upsert({
    where: { id: IDs.fixtureReview },
    create: {
      id: IDs.fixtureReview,
      bookingId: IDs.fixtureBooking,
      reviewerUserId: IDs.customerAlice,
      revieweeUserId: IDs.workerBob,
      rating: 5,
      body: "Bob was professional, arrived on time, and the work quality was excellent."
    },
    update: {
      reviewerUserId: IDs.customerAlice,
      revieweeUserId: IDs.workerBob,
      rating: 5,
      body: "Bob was professional, arrived on time, and the work quality was excellent."
    }
  });

  const dimensions = [
    { key: "quality", score: 5 },
    { key: "communication", score: 5 },
    { key: "punctuality", score: 4 },
    { key: "value", score: 5 }
  ];

  for (const dimension of dimensions) {
    await prisma.reviewDimensionScore.upsert({
      where: {
        reviewId_dimensionKey: {
          reviewId: IDs.fixtureReview,
          dimensionKey: dimension.key
        }
      },
      create: {
        reviewId: IDs.fixtureReview,
        dimensionKey: dimension.key,
        score: dimension.score
      },
      update: {
        score: dimension.score
      }
    });
  }

  await prisma.reviewReply.upsert({
    where: { id: "ffffffff-1008-4000-f000-000000000008" },
    create: {
      id: "ffffffff-1008-4000-f000-000000000008",
      reviewId: IDs.fixtureReview,
      authorUserId: IDs.workerBob,
      body: "Thanks, Alice. Glad the work met your expectations."
    },
    update: {
      authorUserId: IDs.workerBob,
      body: "Thanks, Alice. Glad the work met your expectations."
    }
  });

  await prisma.post.upsert({
    where: { id: IDs.fixturePost },
    create: {
      id: IDs.fixturePost,
      authorUserId: IDs.workerBob,
      body: "Just completed a full residential rewiring job in East Legon. The client was very happy with the result.",
      visibility: VisibilityScope.PUBLIC,
      isDeleted: false
    },
    update: {
      authorUserId: IDs.workerBob,
      body: "Just completed a full residential rewiring job in East Legon. The client was very happy with the result.",
      visibility: VisibilityScope.PUBLIC,
      isDeleted: false
    }
  });

  await prisma.postMedia.upsert({
    where: { id: "ffffffff-1009-4000-f000-000000000009" },
    create: {
      id: "ffffffff-1009-4000-f000-000000000009",
      postId: IDs.fixturePost,
      mediaUrl: "https://cdn.example.com/posts/rewiring-east-legon.jpg",
      mediaType: "image/jpeg",
      sortOrder: 0
    },
    update: {
      mediaUrl: "https://cdn.example.com/posts/rewiring-east-legon.jpg",
      mediaType: "image/jpeg",
      sortOrder: 0
    }
  });

  await prisma.conversation.upsert({
    where: { id: IDs.fixtureConv },
    create: {
      id: IDs.fixtureConv,
      conversationType: ConversationType.DIRECT
    },
    update: {
      conversationType: ConversationType.DIRECT
    }
  });

  for (const userId of [IDs.customerAlice, IDs.workerBob]) {
    await prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: IDs.fixtureConv,
          userId
        }
      },
      create: {
        conversationId: IDs.fixtureConv,
        userId
      },
      update: {}
    });
  }

  await prisma.message.upsert({
    where: { id: IDs.fixtureMessage },
    create: {
      id: IDs.fixtureMessage,
      conversationId: IDs.fixtureConv,
      senderId: IDs.customerAlice,
      messageType: MessageType.TEXT,
      body: "Hi Bob, are you available next week for some electrical work?"
    },
    update: {
      senderId: IDs.customerAlice,
      messageType: MessageType.TEXT,
      body: "Hi Bob, are you available next week for some electrical work?"
    }
  });

  await prisma.supportTicket.upsert({
    where: { id: IDs.fixtureTicket },
    create: {
      id: IDs.fixtureTicket,
      openedByUserId: IDs.customerAlice,
      subject: "Question about booking cancellation policy",
      body: "I may need to cancel a booking. What is the cancellation policy?",
      status: SupportTicketStatus.OPEN,
      priority: SupportPriority.MEDIUM,
      assignedSupportUserId: IDs.support
    },
    update: {
      subject: "Question about booking cancellation policy",
      body: "I may need to cancel a booking. What is the cancellation policy?",
      status: SupportTicketStatus.OPEN,
      priority: SupportPriority.MEDIUM,
      assignedSupportUserId: IDs.support
    }
  });

  await prisma.supportTicketMessage.upsert({
    where: { id: "ffffffff-1010-4000-f000-000000000010" },
    create: {
      id: "ffffffff-1010-4000-f000-000000000010",
      supportTicketId: IDs.fixtureTicket,
      authorUserId: IDs.support,
      body: "We can help. A support agent will review your booking details.",
      isInternalNote: false
    },
    update: {
      authorUserId: IDs.support,
      body: "We can help. A support agent will review your booking details.",
      isInternalNote: false
    }
  });

  await prisma.report.upsert({
    where: { id: IDs.fixtureReport },
    create: {
      id: IDs.fixtureReport,
      reporterUserId: IDs.customerAlice,
      entityType: "post",
      entityId: IDs.fixturePost,
      reason: "Suspected spam content",
      severity: ModerationSeverity.LOW,
      status: ReportStatus.OPEN
    },
    update: {
      reporterUserId: IDs.customerAlice,
      entityType: "post",
      entityId: IDs.fixturePost,
      reason: "Suspected spam content",
      severity: ModerationSeverity.LOW,
      status: ReportStatus.OPEN
    }
  });

  await prisma.moderationCase.upsert({
    where: { id: IDs.fixtureModerationCase },
    create: {
      id: IDs.fixtureModerationCase,
      reportId: IDs.fixtureReport,
      assignedAdminUserId: IDs.moderator,
      status: ModerationCaseStatus.OPEN
    },
    update: {
      reportId: IDs.fixtureReport,
      assignedAdminUserId: IDs.moderator,
      status: ModerationCaseStatus.OPEN
    }
  });

  await prisma.fraudSignal.upsert({
    where: { id: IDs.fixtureFraudSignal },
    create: {
      id: IDs.fixtureFraudSignal,
      userId: IDs.customerAlice,
      entityType: "service_request",
      entityId: IDs.fixtureRequest,
      signalKey: "FIXTURE_DUPLICATE_SIGNAL",
      score: 35
    },
    update: {
      userId: IDs.customerAlice,
      entityType: "service_request",
      entityId: IDs.fixtureRequest,
      signalKey: "FIXTURE_DUPLICATE_SIGNAL",
      score: 35,
      status: "OPEN"
    }
  });

  await prisma.notification.upsert({
    where: { id: IDs.fixtureNotificationCustomer },
    create: {
      id: IDs.fixtureNotificationCustomer,
      userId: IDs.customerAlice,
      channel: NotificationChannel.IN_APP,
      notificationType: "BOOKING_COMPLETED",
      payloadJson: {
        bookingId: IDs.fixtureBooking,
        serviceRequestId: IDs.fixtureRequest
      },
      isRead: false
    },
    update: {
      channel: NotificationChannel.IN_APP,
      notificationType: "BOOKING_COMPLETED",
      payloadJson: {
        bookingId: IDs.fixtureBooking,
        serviceRequestId: IDs.fixtureRequest
      },
      isRead: false,
      readAt: null
    }
  });

  await prisma.notification.upsert({
    where: { id: IDs.fixtureNotificationWorker },
    create: {
      id: IDs.fixtureNotificationWorker,
      userId: IDs.workerBob,
      channel: NotificationChannel.PUSH,
      notificationType: "REVIEW_RECEIVED",
      payloadJson: {
        reviewId: IDs.fixtureReview,
        rating: 5
      },
      isRead: false
    },
    update: {
      channel: NotificationChannel.PUSH,
      notificationType: "REVIEW_RECEIVED",
      payloadJson: {
        reviewId: IDs.fixtureReview,
        rating: 5
      },
      isRead: false,
      readAt: null
    }
  });

  await prisma.paymentIntent.upsert({
    where: { id: IDs.fixturePaymentIntent },
    create: {
      id: IDs.fixturePaymentIntent,
      userId: IDs.workerBob,
      amountMinor: 10500,
      currencyCode: "GHS",
      status: "SUCCEEDED",
      providerRef: "pi_fixture_featured_bob"
    },
    update: {
      userId: IDs.workerBob,
      amountMinor: 10500,
      currencyCode: "GHS",
      status: "SUCCEEDED",
      providerRef: "pi_fixture_featured_bob"
    }
  });

  await prisma.platformFee.upsert({
    where: { id: "ffffffff-1011-4000-f000-000000000011" },
    create: {
      id: "ffffffff-1011-4000-f000-000000000011",
      paymentIntentId: IDs.fixturePaymentIntent,
      feeMinor: 10500,
      feeType: "FEATURED_SUBSCRIPTION"
    },
    update: {
      paymentIntentId: IDs.fixturePaymentIntent,
      feeMinor: 10500,
      feeType: "FEATURED_SUBSCRIPTION"
    }
  });

  await prisma.workerFeaturedSubscription.upsert({
    where: { id: IDs.fixtureFeaturedSubscription },
    create: {
      id: IDs.fixtureFeaturedSubscription,
      workerProfileId: IDs.wpBob,
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2026-01-31T00:00:00Z"),
      status: "ACTIVE",
      sourcePaymentIntentId: IDs.fixturePaymentIntent
    },
    update: {
      workerProfileId: IDs.wpBob,
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2026-01-31T00:00:00Z"),
      status: "ACTIVE",
      sourcePaymentIntentId: IDs.fixturePaymentIntent
    }
  });

  await prisma.workerSubscriptionInvoice.upsert({
    where: { id: IDs.fixtureSubscriptionInvoice },
    create: {
      id: IDs.fixtureSubscriptionInvoice,
      workerProfileId: IDs.wpBob,
      amountMinor: 10500,
      currencyCode: "GHS",
      status: "PAID",
      providerRef: "inv_fixture_featured_bob"
    },
    update: {
      workerProfileId: IDs.wpBob,
      amountMinor: 10500,
      currencyCode: "GHS",
      status: "PAID",
      providerRef: "inv_fixture_featured_bob"
    }
  });

  await prisma.analyticsEvent.upsert({
    where: { id: IDs.fixtureAnalyticsEvent },
    create: {
      id: IDs.fixtureAnalyticsEvent,
      userId: IDs.customerAlice,
      sessionId: randomUUID(),
      eventName: "search_performed",
      entityType: "trade_category",
      entityId: IDs.tradeElectrician,
      propsJson: {
        query: "electrician",
        cityId: IDs.cityAccra
      }
    },
    update: {
      userId: IDs.customerAlice,
      eventName: "search_performed",
      entityType: "trade_category",
      entityId: IDs.tradeElectrician,
      propsJson: {
        query: "electrician",
        cityId: IDs.cityAccra
      }
    }
  });

  await prisma.searchImpression.upsert({
    where: { id: IDs.fixtureSearchImpression },
    create: {
      id: IDs.fixtureSearchImpression,
      userId: IDs.customerAlice,
      queryText: "electrician accra",
      workerProfileId: IDs.wpBob,
      rankPosition: 1,
      cityId: IDs.cityAccra
    },
    update: {
      userId: IDs.customerAlice,
      queryText: "electrician accra",
      workerProfileId: IDs.wpBob,
      rankPosition: 1,
      cityId: IDs.cityAccra
    }
  });
};

const main = async () => {
  console.log("\n=== Vocational Services Platform Seed ===\n");
  await seedCityConfigs();
  await seedTradeCategories();
  await seedAdminCatalog();
  await seedFeatureFlags();
  await seedSystemConfigs();
  await seedUsers();
  await seedWorkerProfiles();
  await seedFixtureData();
  console.log("\n=== Seed complete ===\n");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
