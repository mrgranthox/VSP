import { z } from "zod";

const BookingIdParams = z.object({
  bookingId: z.string().uuid()
});

const RescheduleIdParams = z.object({
  bookingId: z.string().uuid(),
  rescheduleId: z.string().uuid()
});

const CreateBookingBody = z
  .object({
    serviceRequestId: z.string().uuid(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime()
  })
  .strict()
  .refine((data) => new Date(data.scheduledStart) < new Date(data.scheduledEnd), {
    message: "scheduledStart must be before scheduledEnd"
  })
  .refine((data) => new Date(data.scheduledStart) > new Date(), {
    message: "scheduledStart must be in the future"
  });

const RescheduleBookingBody = z
  .object({
    newStart: z.string().datetime(),
    newEnd: z.string().datetime(),
    reason: z.string().max(500).optional()
  })
  .strict()
  .refine((data) => new Date(data.newStart) < new Date(data.newEnd), {
    message: "newStart must be before newEnd"
  })
  .refine((data) => new Date(data.newStart) > new Date(), {
    message: "newStart must be in the future"
  });

const RescheduleResponseBody = z
  .object({
    action: z.enum(["ACCEPT", "DECLINE"]),
    reason: z.string().max(500).optional()
  })
  .strict();

const CancelBookingBody = z
  .object({
    reason: z.string().max(255).optional()
  })
  .strict();

const ConfirmBookingBody = z
  .object({
    notes: z.string().max(500).optional()
  })
  .strict();

const CompleteBookingBody = z
  .object({
    notes: z.string().max(500).optional()
  })
  .strict();

const GetBookingsQuery = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export {
  BookingIdParams,
  CancelBookingBody,
  CompleteBookingBody,
  ConfirmBookingBody,
  CreateBookingBody,
  GetBookingsQuery,
  RescheduleBookingBody,
  RescheduleIdParams,
  RescheduleResponseBody
};
