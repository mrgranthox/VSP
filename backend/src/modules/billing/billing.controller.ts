import { type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import { paginated, success } from "../../lib/response";
import { BillingService } from "./billing.service";

class BillingController {
  constructor(private readonly billingService: BillingService = new BillingService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.billingService.createPaymentIntent(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getPaymentIntent = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.billingService.getPaymentIntent(req.actor, req.params.paymentIntentId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  confirmPaymentIntent = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.billingService.confirmPaymentIntent(req.actor, req.params.paymentIntentId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  handleProviderWebhook = async (req: Request, res: Response): Promise<void> => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    const signature =
      typeof req.headers["x-provider-signature"] === "string"
        ? req.headers["x-provider-signature"]
        : typeof req.headers["stripe-signature"] === "string"
          ? req.headers["stripe-signature"]
          : typeof req.headers["x-paystack-signature"] === "string"
            ? req.headers["x-paystack-signature"]
            : undefined;
    const provider = typeof req.query.provider === "string" ? req.query.provider : "mock";

    await this.billingService.handleProviderWebhook(rawBody, signature, provider);
    res.status(200).json(success({ accepted: true }, { requestId: this.getRequestId(req) }));
  };

  getMySubscription = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.billingService.getMySubscription(req.actor);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getMyInvoices = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const query = req.query as unknown as { page: number; limit: number };
    const result = await this.billingService.getMyInvoices(req.actor, query);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };
}

const billingController = new BillingController();

export { BillingController, billingController };
