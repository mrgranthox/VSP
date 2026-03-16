# MODULE: search
# File: src/modules/search/

## DEPENDENCIES
Typesense 26.x — npm install typesense
PostGIS on Supabase PostgreSQL for raw geo queries (fallback / admin)

## TYPESENSE COLLECTION: workers
```json
{
  "name": "workers",
  "enable_nested_fields": true,
  "fields": [
    { "name": "id",                    "type": "string" },
    { "name": "headline",              "type": "string" },
    { "name": "bio",                   "type": "string" },
    { "name": "trade_slugs",           "type": "string[]", "facet": true },
    { "name": "city_slug",             "type": "string",   "facet": true },
    { "name": "country_code",          "type": "string",   "facet": true },
    { "name": "avg_rating",            "type": "float",    "facet": true },
    { "name": "total_reviews",         "type": "int32" },
    { "name": "jobs_completed",        "type": "int32" },
    { "name": "response_rate",         "type": "float" },
    { "name": "is_featured",           "type": "bool",     "facet": true },
    { "name": "verification_status",   "type": "string",   "facet": true },
    { "name": "location",              "type": "geopoint" },
    { "name": "embedding",             "type": "float[]",  "num_dim": 1536 },
    { "name": "profile_complete_score","type": "int32" },
    { "name": "last_active_at",        "type": "int64" }
  ],
  "default_sorting_field": "avg_rating"
}
```

## ENDPOINTS (10)
GET  /api/v1/trade-categories
GET  /api/v1/cities
GET  /api/v1/search/workers
GET  /api/v1/search/workers/map
GET  /api/v1/search/workers/nearby
GET  /api/v1/search/suggestions
POST /api/v1/search/impressions
GET  /api/v1/discovery/featured-workers
GET  /api/v1/discovery/recommended-workers
GET  /api/v1/discovery/recent-posts

## ZOD SCHEMAS
```typescript
export const SearchWorkersQuery = z.object({
  lat:             z.coerce.number().min(-90).max(90),
  lng:             z.coerce.number().min(-180).max(180),
  radiusKm:        z.coerce.number().int().min(1).max(100).optional(),
  tradeCategoryId: z.string().uuid().optional(),
  cityId:          z.string().uuid().optional(),
  minRating:       z.coerce.number().min(0).max(5).optional(),
  isFeatured:      z.coerce.boolean().optional(),
  q:               z.string().max(200).optional(),
  page:            z.coerce.number().int().min(1).default(1),
  limit:           z.coerce.number().int().min(1).max(100).default(20),
});

export const MapSearchQuery = z.object({
  neLat: z.coerce.number().min(-90).max(90),
  neLng: z.coerce.number().min(-180).max(180),
  swLat: z.coerce.number().min(-90).max(90),
  swLng: z.coerce.number().min(-180).max(180),
  tradeCategoryId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const LogImpressionBody = z.object({
  workerProfileId: z.string().uuid(),
  rankPosition:    z.number().int().min(1),
  queryText:       z.string().max(255).optional(),
  cityId:          z.string().uuid().optional(),
}).strict();
```

## RANKING WEIGHTS (from system_config key: search_ranking_weights)
text_relevance: 0.40, avg_rating: 0.20, is_featured: 0.15,
profile_complete: 0.10, response_rate: 0.10, distance: 0.05

## ELIGIBILITY FILTER (applied before ranking — hard filter)
verification_status = APPROVED AND user.status = ACTIVE AND no blocking moderation action

## INDEX SYNC EVENTS (consume these, call indexWorker() or removeWorkerFromIndex())
WORKER_PROFILE_CREATED, WORKER_PROFILE_UPDATED → indexWorker(workerProfileId)
WORKER_VERIFICATION_APPROVED → indexWorker (update status field)
REVIEW_SUBMITTED → indexWorker (update avg_rating, total_reviews)
BOOKING_COMPLETED → indexWorker (increment jobs_completed)
WORKER_SUSPENDED / DELETED → removeWorkerFromIndex(workerProfileId)
FEATURE_SUBSCRIPTION_STARTED → indexWorker (set is_featured=true)

## FULL REINDEX JOB (search_reindex_full — nightly 02:00 UTC)
1. Create shadow collection: workers_YYYYMMDD
2. Batch export from PostgreSQL in pages of 500 (TYPESENSE_INDEXING_BATCH_SIZE)
3. Upsert to shadow collection via Typesense import API
4. Verify doc count within 1% of PostgreSQL count
5. Swap alias: typesenseClient.aliases().upsert('workers', { collection_name: 'workers_YYYYMMDD' })
6. Delete previous shadow collection

## VECTOR RECOMMENDATIONS
Model: text-embedding-3-small (OPENAI_EMBEDDING_MODEL), 1536 dims
Input: headline + bio + trade names + top service titles (truncated 512 tokens)
Query vector: average embedding of user's last 5 completed bookings' workers
Fallback: average of saved workers. Final fallback: city top-rated workers.

## CACHING (Redis)
Key: search:nearby:{lat_rounded_2dp}:{lng_rounded_2dp}:{trade}:{page}
TTL: 30 seconds. Bust on worker index update in that city.
Trade categories: key=trade:all, TTL=24h
City configs: key=city:all, TTL=10min
