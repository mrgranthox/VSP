import { type Request, type Response } from "express";
import { type BookingStatus } from "@prisma/client";

import { Errors } from "../../lib/errors";
import type { PaginationInput } from "../../lib/pagination";
import { paginated, success } from "../../lib/response";
import { BookingsService } from "./bookings.service";

class BookingsController {
  constructor(private readonly bookingsService: BookingsService = new BookingsService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  createBooking = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.bookingsService.createBooking(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getBookings = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const query = req.query as unknown as PaginationInput & { status?: BookingStatus; from?: string; to?: string };
    const result = await this.bookingsService.getBookings(req.actor, query, query);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  getBooking = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.bookingsService.getBooking(req.actor, req.params.bookingId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  confirmBooking = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.bookingsService.confirmBooking(req.actor, req.params.bookingId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  startBooking = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.bookingsService.startBooking(req.actor, req.params.bookingId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  completeBooking = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.bookingsService.completeBooking(req.actor, req.params.bookingId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  createReschedule = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.bookingsService.createReschedule(req.actor, req.params.bookingId, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  respondToReschedule = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.bookingsService.respondToReschedule(
      req.actor,
      req.params.bookingId,
      req.params.rescheduleId,
      req.body
    );
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  cancelBooking = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.bookingsService.cancelBooking(req.actor, req.params.bookingId, req.body.reason);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };
}

const bookingsController = new BookingsController();

export { BookingsController, bookingsController };
