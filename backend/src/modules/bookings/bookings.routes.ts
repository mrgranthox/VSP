import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { bookingsController } from "./bookings.controller";
import {
  BookingIdParams,
  CancelBookingBody,
  CompleteBookingBody,
  ConfirmBookingBody,
  CreateBookingBody,
  GetBookingsQuery,
  RescheduleBookingBody,
  RescheduleIdParams,
  RescheduleResponseBody
} from "./bookings.schemas";

const bookingsRoutes = Router();

bookingsRoutes.post("/bookings", authenticate, validate(CreateBookingBody), bookingsController.createBooking);
bookingsRoutes.get("/bookings", authenticate, validate(GetBookingsQuery, "query"), bookingsController.getBookings);
bookingsRoutes.get("/bookings/:bookingId", authenticate, validate(BookingIdParams, "params"), bookingsController.getBooking);
bookingsRoutes.post(
  "/bookings/:bookingId/confirm",
  authenticate,
  validate(BookingIdParams, "params"),
  validate(ConfirmBookingBody),
  bookingsController.confirmBooking
);
bookingsRoutes.post("/bookings/:bookingId/start", authenticate, validate(BookingIdParams, "params"), bookingsController.startBooking);
bookingsRoutes.post(
  "/bookings/:bookingId/complete",
  authenticate,
  validate(BookingIdParams, "params"),
  validate(CompleteBookingBody),
  bookingsController.completeBooking
);
bookingsRoutes.post(
  "/bookings/:bookingId/reschedule",
  authenticate,
  validate(BookingIdParams, "params"),
  validate(RescheduleBookingBody),
  bookingsController.createReschedule
);
bookingsRoutes.post(
  "/bookings/:bookingId/reschedule/:rescheduleId/respond",
  authenticate,
  validate(RescheduleIdParams, "params"),
  validate(RescheduleResponseBody),
  bookingsController.respondToReschedule
);
bookingsRoutes.post(
  "/bookings/:bookingId/cancel",
  authenticate,
  validate(BookingIdParams, "params"),
  validate(CancelBookingBody),
  bookingsController.cancelBooking
);

export { bookingsRoutes };
