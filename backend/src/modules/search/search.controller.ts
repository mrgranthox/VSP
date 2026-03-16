import { type Request, type Response } from "express";

import { paginated, success } from "../../lib/response";
import type { PaginationInput } from "../../lib/pagination";
import { SearchService } from "./search.service";

class SearchController {
  constructor(private readonly searchService: SearchService = new SearchService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  getTradeCategories = async (req: Request, res: Response): Promise<void> => {
    const result = await this.searchService.getTradeCategories();
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getCities = async (req: Request, res: Response): Promise<void> => {
    const result = await this.searchService.getCities();
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  searchWorkers = async (req: Request, res: Response): Promise<void> => {
    const result = await this.searchService.searchWorkers(req.query as any);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  searchWorkersMap = async (req: Request, res: Response): Promise<void> => {
    const result = await this.searchService.searchWorkersMap(req.query as any);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  searchWorkersNearby = async (req: Request, res: Response): Promise<void> => {
    const result = await this.searchService.searchWorkersNearby(req.query as any);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  getSuggestions = async (req: Request, res: Response): Promise<void> => {
    const parsedQuery = req.query as unknown as { q: string; limit: number };
    const result = await this.searchService.getSuggestions(parsedQuery.q, parsedQuery.limit);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  logImpression = async (req: Request, res: Response): Promise<void> => {
    const result = await this.searchService.logImpression(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getFeaturedWorkers = async (req: Request, res: Response): Promise<void> => {
    const result = await this.searchService.getFeaturedWorkers(req.query as unknown as PaginationInput);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  getRecommendedWorkers = async (req: Request, res: Response): Promise<void> => {
    const result = await this.searchService.getRecommendedWorkers(req.actor, req.query as unknown as PaginationInput);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  getRecentPosts = async (req: Request, res: Response): Promise<void> => {
    const result = await this.searchService.getRecentPosts(req.query as unknown as PaginationInput);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };
}

const searchController = new SearchController();

export { SearchController, searchController };
