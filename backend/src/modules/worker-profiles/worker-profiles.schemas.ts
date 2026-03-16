import { z } from "zod";

const WorkerIdParam = z.object({
  workerId: z.string().uuid()
});

const TradeIdParam = z.object({
  tradeId: z.string().uuid()
});

const ServiceIdParam = z.object({
  serviceId: z.string().uuid()
});

const AreaIdParam = z.object({
  areaId: z.string().uuid()
});

const RuleIdParam = z.object({
  ruleId: z.string().uuid()
});

const ExceptionIdParam = z.object({
  exceptionId: z.string().uuid()
});

const PortfolioItemIdParam = z.object({
  itemId: z.string().uuid()
});

const CertificationIdParam = z.object({
  certId: z.string().uuid()
});

const CreateWorkerProfileBody = z
  .object({
    headline: z.string().max(120).trim().optional(),
    bio: z.string().max(3000).optional(),
    experienceYears: z.number().int().min(0).max(60).default(0)
  })
  .strict();

const UpdateWorkerProfileBody = z
  .object({
    headline: z.string().max(120).trim().optional(),
    bio: z.string().max(3000).optional().nullable(),
    experienceYears: z.number().int().min(0).max(60).optional(),
    serviceRadiusKm: z.number().int().min(1).max(100).optional()
  })
  .strict();

const CreateWorkerServiceBody = z
  .object({
    title: z.string().min(1).max(150).trim(),
    description: z.string().max(2000).optional().nullable(),
    basePriceMinor: z.number().int().min(0).optional().nullable(),
    currencyCode: z.string().trim().length(3).optional().nullable(),
    isEnabled: z.boolean().optional()
  })
  .strict();

const UpdateWorkerServiceBody = z
  .object({
    title: z.string().min(1).max(150).trim().optional(),
    description: z.string().max(2000).optional().nullable(),
    basePriceMinor: z.number().int().min(0).optional().nullable(),
    currencyCode: z.string().trim().length(3).optional().nullable(),
    isEnabled: z.boolean().optional()
  })
  .strict();

const CreateServiceAreaBody = z
  .object({
    cityId: z.string().uuid().optional(),
    centerLat: z.coerce.number().min(-90).max(90).optional(),
    centerLng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.number().int().min(1).max(100).default(10),
    coverageMode: z.string().trim().min(1).max(32).optional()
  })
  .strict()
  .refine((data) => data.cityId || (data.centerLat !== undefined && data.centerLng !== undefined), {
    message: "cityId or centerLat+centerLng required"
  });

const UpdateServiceAreaBody = z
  .object({
    cityId: z.string().uuid().optional().nullable(),
    centerLat: z.coerce.number().min(-90).max(90).optional().nullable(),
    centerLng: z.coerce.number().min(-180).max(180).optional().nullable(),
    radiusKm: z.number().int().min(1).max(100).optional(),
    coverageMode: z.string().trim().min(1).max(32).optional()
  })
  .strict();

const CreateAvailabilityRuleBody = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    timezone: z.string().min(1).max(64)
  })
  .strict()
  .refine((data) => data.startMinute < data.endMinute, { message: "startMinute must be before endMinute" });

const UpdateAvailabilityRuleBody = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startMinute: z.number().int().min(0).max(1439).optional(),
    endMinute: z.number().int().min(1).max(1440).optional(),
    timezone: z.string().min(1).max(64).optional()
  })
  .strict();

const CreateAvailabilityExceptionBody = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    reason: z.string().max(255).optional().nullable()
  })
  .strict()
  .refine((data) => data.startsAt < data.endsAt, { message: "startsAt must be before endsAt" });

const UpdateAvailabilityExceptionBody = z
  .object({
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    reason: z.string().max(255).optional().nullable()
  })
  .strict();

const CreatePortfolioItemBody = z
  .object({
    title: z.string().max(150).trim().optional().nullable(),
    caption: z.string().max(2000).optional().nullable(),
    mediaRef: z.string().min(1),
    sortOrder: z.number().int().min(0).default(0)
  })
  .strict();

const UpdatePortfolioItemBody = z
  .object({
    title: z.string().max(150).trim().optional().nullable(),
    caption: z.string().max(2000).optional().nullable(),
    mediaRef: z.string().min(1).optional(),
    sortOrder: z.number().int().min(0).optional()
  })
  .strict();

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const CreateCertificationBody = z
  .object({
    title: z.string().min(1).max(200).trim(),
    issuer: z.string().max(200).optional().nullable(),
    mediaRef: z.string().min(1),
    issuedOn: dateOnlySchema.optional(),
    expiresOn: dateOnlySchema.optional().nullable()
  })
  .strict();

const UpdateCertificationBody = z
  .object({
    title: z.string().min(1).max(200).trim().optional(),
    issuer: z.string().max(200).optional().nullable(),
    mediaRef: z.string().min(1).optional(),
    issuedOn: dateOnlySchema.optional().nullable(),
    expiresOn: dateOnlySchema.optional().nullable()
  })
  .strict();

const SubmitVerificationBody = z
  .object({
    documentRefs: z.array(z.string().min(1)).min(1).max(5),
    notes: z.string().max(1000).optional()
  })
  .strict();

export {
  AreaIdParam,
  CertificationIdParam,
  CreateAvailabilityExceptionBody,
  CreateAvailabilityRuleBody,
  CreateCertificationBody,
  CreatePortfolioItemBody,
  CreateServiceAreaBody,
  CreateWorkerProfileBody,
  CreateWorkerServiceBody,
  ExceptionIdParam,
  PortfolioItemIdParam,
  RuleIdParam,
  ServiceIdParam,
  SubmitVerificationBody,
  TradeIdParam,
  UpdateAvailabilityExceptionBody,
  UpdateAvailabilityRuleBody,
  UpdateCertificationBody,
  UpdatePortfolioItemBody,
  UpdateServiceAreaBody,
  UpdateWorkerProfileBody,
  UpdateWorkerServiceBody,
  WorkerIdParam
};
