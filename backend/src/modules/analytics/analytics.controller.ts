import { type Request, type Response } from "express";

import { success } from "../../lib/response";
import { AnalyticsService } from "./analytics.service";

class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService = new AnalyticsService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  ingestEvents = async (req: Request, res: Response): Promise<void> => {
    const result = await this.analyticsService.ingestEvents(req.actor?.userId, req.body);
    res.status(202).json(success(result, { requestId: this.getRequestId(req) }));
  };

  runJob = async (req: Request, res: Response): Promise<void> => {
    const result = await this.analyticsService.runJob(req.body.jobName, req.body.payload);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };
}

const analyticsController = new AnalyticsController();

export { AnalyticsController, analyticsController };
