import { z } from "zod";

const SearchWorkersQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().int().min(1).max(100).optional(),
  tradeCategoryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  isFeatured: z.coerce.boolean().optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const MapSearchQuery = z.object({
  neLat: z.coerce.number().min(-90).max(90),
  neLng: z.coerce.number().min(-180).max(180),
  swLat: z.coerce.number().min(-90).max(90),
  swLng: z.coerce.number().min(-180).max(180),
  tradeCategoryId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const LogImpressionBody = z
  .object({
    workerProfileId: z.string().uuid(),
    rankPosition: z.number().int().min(1),
    queryText: z.string().max(255).optional(),
    cityId: z.string().uuid().optional()
  })
  .strict();

const SuggestionsQuery = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).default(10)
});

const DiscoveryQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export { DiscoveryQuery, LogImpressionBody, MapSearchQuery, SearchWorkersQuery, SuggestionsQuery };
