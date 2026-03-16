import { Router } from "express";

import { optionalAuthenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { searchController } from "./search.controller";
import "./search.events";
import { DiscoveryQuery, LogImpressionBody, MapSearchQuery, SearchWorkersQuery, SuggestionsQuery } from "./search.schemas";

const searchRoutes = Router();

searchRoutes.get("/trade-categories", searchController.getTradeCategories);
searchRoutes.get("/cities", searchController.getCities);
searchRoutes.get("/search/workers", validate(SearchWorkersQuery, "query"), searchController.searchWorkers);
searchRoutes.get("/search/workers/map", validate(MapSearchQuery, "query"), searchController.searchWorkersMap);
searchRoutes.get("/search/workers/nearby", validate(SearchWorkersQuery, "query"), searchController.searchWorkersNearby);
searchRoutes.get("/search/suggestions", validate(SuggestionsQuery, "query"), searchController.getSuggestions);
searchRoutes.post("/search/impressions", optionalAuthenticate, validate(LogImpressionBody), searchController.logImpression);
searchRoutes.get("/discovery/featured-workers", validate(DiscoveryQuery, "query"), searchController.getFeaturedWorkers);
searchRoutes.get(
  "/discovery/recommended-workers",
  optionalAuthenticate,
  validate(DiscoveryQuery, "query"),
  searchController.getRecommendedWorkers
);
searchRoutes.get("/discovery/recent-posts", validate(DiscoveryQuery, "query"), searchController.getRecentPosts);

export { searchRoutes };
