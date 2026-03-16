import { BookingStatus, Prisma, RequestStatus, RescheduleStatus } from "@prisma/client";

import { EventBus } from "../../lib/eventBus";
import { Errors } from "../../lib/errors";
import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import { prisma } from "../../lib/prisma";
import type { ActorContext } from "../../types/actor";
import { WorkerProfilesService } from "../worker-profiles/worker-profiles.service";
import { BookingsRepository, type BookingRecord } from "./bookings.repository";

const BOOKING_CONFLICT_BUFFER_MINUTES_KEY = "BOOKING_CONFLICT_BUFFER_MINUTES";
const DEFAULT_BOOKING_CONFLICT_BUFFER_MINUTES = 30;
const reschedulableStatuses: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED];
const cancellableStatuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED];
const startableStatuses: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED];

const getDisplayName = (profile: { firstName?: string | null; lastName?: string | null; displayName?: string | null } | null | undefined): string | null =>
  profile?.displayName ?? ([profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || null);

const addMinutes = (value: Date, minutes: number): Date => new Date(value.getTime() + minutes * 60_000);
const subtractMinutes = (value: Date, minutes: number): Date => new Date(value.getTime() - minutes * 60_000);

type BookingAccessContext = {
  booking: BookingRecord;
  workerProfileId?: string;
  isCustomer: boolean;
  isWorker: boolean;
};

class BookingsService {
  constructor(
    private readonly repository: BookingsRepository = new BookingsRepository(),
    private readonly workerProfilesService: WorkerProfilesService = new WorkerProfilesService()
  ) {}

  private async getNumericConfig(configKey: string, fallback: number): Promise<number> {
    const config = await this.repository.getSystemConfig(configKey);
    const value = config?.valueJson;

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const key of ["value", "minutes", "limit"]) {
        const candidate = (value as Record<string, unknown>)[key];

        if (typeof candidate === "number" && Number.isFinite(candidate)) {
          return candidate;
        }

        if (typeof candidate === "string") {
          const parsed = Number(candidate);

          if (Number.isFinite(parsed)) {
            return parsed;
          }
        }
      }
    }

    return fallback;
  }

  private async assertNoConflict(workerProfileId: string, start: Date, end: Date, excludeBookingId?: string): Promise<void> {
    const bufferMinutes = await this.getNumericConfig(
      BOOKING_CONFLICT_BUFFER_MINUTES_KEY,
      DEFAULT_BOOKING_CONFLICT_BUFFER_MINUTES
    );
    const conflictingBooking = await this.repository.findConflictingBooking(
      workerProfileId,
      subtractMinutes(start, bufferMinutes),
      addMinutes(end, bufferMinutes),
      excludeBookingId
    );

    if (conflictingBooking) {
      throw Errors.BOOKING_TIME_CONFLICT();
    }
  }

  private mapUserSummary(user: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      displayName: string | null;
      avatarUrl: string | null;
      cityId: string | null;
    } | null;
  }) {
    return {
      userId: user.id,
      displayName: getDisplayName(user.profile),
      avatarUrl: user.profile?.avatarUrl ?? null,
      cityId: user.profile?.cityId ?? null
    };
  }

  private mapWorkerSummary(workerProfile: BookingRecord["workerProfile"]) {
    return {
      id: workerProfile.id,
      userId: workerProfile.userId,
      headline: workerProfile.headline ?? null,
      verificationStatus: workerProfile.verificationStatus,
      displayName: getDisplayName(workerProfile.user.profile),
      avatarUrl: workerProfile.user.profile?.avatarUrl ?? null
    };
  }

  private mapBooking(booking: BookingRecord) {
    return {
      id: booking.id,
      serviceRequestId: booking.serviceRequestId,
      workerProfileId: booking.workerProfileId,
      customerUserId: booking.customerUserId,
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
      status: booking.status,
      completedAt: booking.completedAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      customer: this.mapUserSummary(booking.customerUser),
      workerProfile: this.mapWorkerSummary(booking.workerProfile),
      serviceRequest: booking.serviceRequest,
      reschedules: booking.reschedules.map((reschedule) => ({
        id: reschedule.id,
        bookingId: reschedule.bookingId,
        requestedByUserId: reschedule.requestedByUserId,
        oldStart: reschedule.oldStart,
        oldEnd: reschedule.oldEnd,
        newStart: reschedule.newStart,
        newEnd: reschedule.newEnd,
        status: reschedule.status,
        createdAt: reschedule.createdAt,
        requestedBy: this.mapUserSummary(reschedule.requestedByUser)
      })),
      cancellations: booking.cancellations.map((cancellation) => ({
        id: cancellation.id,
        bookingId: cancellation.bookingId,
        cancelledByUserId: cancellation.cancelledByUserId,
        reason: cancellation.reason ?? null,
        createdAt: cancellation.createdAt,
        cancelledBy: this.mapUserSummary(cancellation.cancelledByUser)
      }))
    };
  }

  private async getBookingAccessContext(actor: ActorContext, bookingId: string): Promise<BookingAccessContext> {
    const [booking, workerProfile] = await Promise.all([
      this.repository.getBookingById(bookingId),
      this.repository.getWorkerProfileByUserId(actor.userId)
    ]);

    if (!booking) {
      throw Errors.BOOKING_NOT_FOUND();
    }

    const isCustomer = booking.customerUserId === actor.userId;
    const isWorker = workerProfile?.id === booking.workerProfileId || booking.workerProfile.userId === actor.userId;

    if (!isCustomer && !isWorker) {
      throw Errors.PERMISSION_DENIED();
    }

    return {
      booking,
      workerProfileId: workerProfile?.id,
      isCustomer,
      isWorker
    };
  }

  private async transitionRequestStatus(
    client: Prisma.TransactionClient,
    request: { id: string; status: RequestStatus },
    toStatus: RequestStatus,
    changedByUserId: string
  ): Promise<void> {
    if (request.status === toStatus) {
      return;
    }

    await this.repository.updateServiceRequestStatus(client, request.id, toStatus);
    await this.repository.createServiceRequestStatusHistory(client, {
      serviceRequestId: request.id,
      fromStatus: request.status,
      toStatus,
      changedByUserId
    });
  }

  async createBooking(
    actor: ActorContext,
    data: {
      serviceRequestId: string;
      scheduledStart: string;
      scheduledEnd: string;
    }
  ) {
    const [workerProfile, serviceRequest] = await Promise.all([
      this.repository.getWorkerProfileByUserId(actor.userId),
      this.repository.getServiceRequestBookingContext(data.serviceRequestId)
    ]);

    if (!serviceRequest) {
      throw Errors.REQUEST_NOT_FOUND();
    }

    if (serviceRequest.status !== RequestStatus.ACCEPTED) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    if (serviceRequest.booking) {
      throw Errors.VALIDATION_FAILED({
        serviceRequestId: ["Booking already exists for this service request"]
      });
    }

    const acceptedAssignment = serviceRequest.assignments[0];

    if (!acceptedAssignment) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    const isCustomer = serviceRequest.customerUserId === actor.userId;
    const isAcceptedWorker = workerProfile?.id === acceptedAssignment.workerProfileId;

    if (!isCustomer && !isAcceptedWorker) {
      throw Errors.PERMISSION_DENIED();
    }

    const scheduledStart = new Date(data.scheduledStart);
    const scheduledEnd = new Date(data.scheduledEnd);
    await this.assertNoConflict(acceptedAssignment.workerProfileId, scheduledStart, scheduledEnd);

    const booking = await this.repository.createBooking(prisma, {
      serviceRequestId: serviceRequest.id,
      workerProfileId: acceptedAssignment.workerProfileId,
      customerUserId: serviceRequest.customerUserId,
      scheduledStart,
      scheduledEnd
    });

    return this.mapBooking(booking);
  }

  async getBookings(
    actor: ActorContext,
    filters: {
      status?: BookingStatus;
      from?: string;
      to?: string;
    },
    pagination: PaginationInput
  ) {
    const workerProfile = await this.repository.getWorkerProfileByUserId(actor.userId);
    const args = getPaginationArgs(pagination);
    const normalizedFilters = {
      status: filters.status,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined
    };
    const [bookings, total] = await Promise.all([
      this.repository.listBookings(actor.userId, workerProfile?.id, normalizedFilters, args.skip, args.take),
      this.repository.countBookings(actor.userId, workerProfile?.id, normalizedFilters)
    ]);

    return {
      data: bookings.map((booking) => this.mapBooking(booking)),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getBooking(actor: ActorContext, bookingId: string) {
    const { booking } = await this.getBookingAccessContext(actor, bookingId);
    return this.mapBooking(booking);
  }

  async confirmBooking(actor: ActorContext, bookingId: string) {
    const { booking } = await this.getBookingAccessContext(actor, bookingId);

    if (booking.status === BookingStatus.COMPLETED) {
      throw Errors.BOOKING_ALREADY_COMPLETED();
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw Errors.BOOKING_INVALID_STATUS_TRANSITION();
    }

    const updatedBooking = await this.repository.updateBooking(prisma, bookingId, {
      status: BookingStatus.CONFIRMED
    });

    await EventBus.emit("BOOKING_CONFIRMED", {
      bookingId: updatedBooking.id,
      workerProfileId: updatedBooking.workerProfileId,
      customerUserId: updatedBooking.customerUserId,
      scheduledStart: updatedBooking.scheduledStart.toISOString()
    });

    return this.mapBooking(updatedBooking);
  }

  async startBooking(actor: ActorContext, bookingId: string) {
    const { booking, isWorker } = await this.getBookingAccessContext(actor, bookingId);

    if (!isWorker) {
      throw Errors.PERMISSION_DENIED();
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw Errors.BOOKING_ALREADY_COMPLETED();
    }

    if (!startableStatuses.includes(booking.status)) {
      throw Errors.BOOKING_INVALID_STATUS_TRANSITION();
    }

    const updatedBooking = await prisma.$transaction(async (client) => {
      const nextBooking = await this.repository.updateBooking(client, bookingId, {
        status: BookingStatus.IN_PROGRESS
      });

      if (booking.serviceRequest.status === RequestStatus.ACCEPTED) {
        await this.transitionRequestStatus(
          client,
          { id: booking.serviceRequest.id, status: booking.serviceRequest.status },
          RequestStatus.IN_PROGRESS,
          actor.userId
        );
      }

      return nextBooking;
    });

    return this.mapBooking(updatedBooking);
  }

  async completeBooking(actor: ActorContext, bookingId: string) {
    const { booking, isWorker } = await this.getBookingAccessContext(actor, bookingId);

    if (!isWorker) {
      throw Errors.PERMISSION_DENIED();
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw Errors.BOOKING_ALREADY_COMPLETED();
    }

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw Errors.BOOKING_INVALID_STATUS_TRANSITION();
    }

    const updatedBooking = await prisma.$transaction(async (client) => {
      const nextBooking = await this.repository.updateBooking(client, bookingId, {
        status: BookingStatus.COMPLETED,
        completedAt: new Date()
      });

      if (booking.serviceRequest.status === RequestStatus.IN_PROGRESS) {
        await this.transitionRequestStatus(
          client,
          { id: booking.serviceRequest.id, status: booking.serviceRequest.status },
          RequestStatus.COMPLETED,
          actor.userId
        );
      }

      return nextBooking;
    });

    await EventBus.emit("BOOKING_COMPLETED", {
      bookingId: updatedBooking.id,
      workerProfileId: updatedBooking.workerProfileId,
      customerUserId: updatedBooking.customerUserId
    });
    await this.workerProfilesService.recalculateAggregates(updatedBooking.workerProfileId);

    return this.mapBooking(updatedBooking);
  }

  async createReschedule(
    actor: ActorContext,
    bookingId: string,
    data: {
      newStart: string;
      newEnd: string;
    }
  ) {
    const { booking } = await this.getBookingAccessContext(actor, bookingId);

    if (booking.status === BookingStatus.COMPLETED) {
      throw Errors.BOOKING_ALREADY_COMPLETED();
    }

    if (!reschedulableStatuses.includes(booking.status)) {
      throw Errors.BOOKING_INVALID_STATUS_TRANSITION();
    }

    const existingPendingReschedule = await this.repository.getPendingReschedule(bookingId);

    if (existingPendingReschedule) {
      throw Errors.VALIDATION_FAILED({
        bookingId: ["A pending reschedule request already exists for this booking"]
      });
    }

    const reschedule = await this.repository.createReschedule(prisma, {
      bookingId,
      requestedByUserId: actor.userId,
      oldStart: booking.scheduledStart,
      oldEnd: booking.scheduledEnd,
      newStart: new Date(data.newStart),
      newEnd: new Date(data.newEnd)
    });

    await EventBus.emit("BOOKING_RESCHEDULE_REQUESTED", {
      bookingId,
      rescheduleId: reschedule.id,
      requestedByUserId: actor.userId,
      newStart: reschedule.newStart.toISOString(),
      newEnd: reschedule.newEnd.toISOString()
    });

    const freshBooking = await this.repository.getBookingById(bookingId);

    if (!freshBooking) {
      throw Errors.BOOKING_NOT_FOUND();
    }

    return {
      booking: this.mapBooking(freshBooking),
      reschedule: {
        id: reschedule.id,
        bookingId: reschedule.bookingId,
        requestedByUserId: reschedule.requestedByUserId,
        oldStart: reschedule.oldStart,
        oldEnd: reschedule.oldEnd,
        newStart: reschedule.newStart,
        newEnd: reschedule.newEnd,
        status: reschedule.status,
        createdAt: reschedule.createdAt,
        requestedBy: this.mapUserSummary(reschedule.requestedByUser)
      }
    };
  }

  async respondToReschedule(
    actor: ActorContext,
    bookingId: string,
    rescheduleId: string,
    data: {
      action: "ACCEPT" | "DECLINE";
    }
  ) {
    const { booking } = await this.getBookingAccessContext(actor, bookingId);
    const reschedule = await this.repository.getReschedule(bookingId, rescheduleId);

    if (!reschedule) {
      throw Errors.RESCHEDULE_NOT_FOUND();
    }

    if (reschedule.requestedByUserId === actor.userId) {
      throw Errors.PERMISSION_DENIED();
    }

    if (reschedule.status !== RescheduleStatus.PENDING) {
      throw Errors.BOOKING_INVALID_STATUS_TRANSITION();
    }

    if (data.action === "ACCEPT") {
      await this.assertNoConflict(booking.workerProfileId, reschedule.newStart, reschedule.newEnd, booking.id);

      const updatedBooking = await prisma.$transaction(async (client) => {
        await this.repository.updateReschedule(client, reschedule.id, {
          status: RescheduleStatus.ACCEPTED
        });
        await this.repository.cancelPendingReschedules(client, bookingId, reschedule.id);

        return this.repository.updateBooking(client, bookingId, {
          scheduledStart: reschedule.newStart,
          scheduledEnd: reschedule.newEnd,
          status: BookingStatus.RESCHEDULED
        });
      });

      await EventBus.emit("BOOKING_RESCHEDULE_RESPONDED", {
        bookingId,
        rescheduleId: reschedule.id,
        action: "ACCEPTED",
        respondedByUserId: actor.userId
      });

      return {
        booking: this.mapBooking(updatedBooking),
        reschedule: {
          id: reschedule.id,
          status: RescheduleStatus.ACCEPTED
        }
      };
    }

    const declinedReschedule = await this.repository.updateReschedule(prisma, reschedule.id, {
      status: RescheduleStatus.DECLINED
    });
    await EventBus.emit("BOOKING_RESCHEDULE_RESPONDED", {
      bookingId,
      rescheduleId: declinedReschedule.id,
      action: "DECLINED",
      respondedByUserId: actor.userId
    });

    const freshBooking = await this.repository.getBookingById(bookingId);

    if (!freshBooking) {
      throw Errors.BOOKING_NOT_FOUND();
    }

    return {
      booking: this.mapBooking(freshBooking),
      reschedule: {
        id: declinedReschedule.id,
        status: declinedReschedule.status
      }
    };
  }

  async cancelBooking(actor: ActorContext, bookingId: string, reason?: string) {
    const { booking } = await this.getBookingAccessContext(actor, bookingId);

    if (booking.status === BookingStatus.COMPLETED) {
      throw Errors.BOOKING_ALREADY_COMPLETED();
    }

    if (!cancellableStatuses.includes(booking.status)) {
      throw Errors.BOOKING_INVALID_STATUS_TRANSITION();
    }

    const updatedBooking = await prisma.$transaction(async (client) => {
      await this.repository.createCancellation(client, {
        bookingId,
        cancelledByUserId: actor.userId,
        reason
      });
      await this.repository.cancelPendingReschedules(client, bookingId);

      const nextBooking = await this.repository.updateBooking(client, bookingId, {
        status: BookingStatus.CANCELLED
      });

      if (
        booking.serviceRequest.status === RequestStatus.ACCEPTED ||
        booking.serviceRequest.status === RequestStatus.IN_PROGRESS
      ) {
        await this.transitionRequestStatus(
          client,
          { id: booking.serviceRequest.id, status: booking.serviceRequest.status },
          RequestStatus.CANCELLED,
          actor.userId
        );
      }

      return nextBooking;
    });

    await EventBus.emit("BOOKING_CANCELLED", {
      bookingId,
      customerUserId: updatedBooking.customerUserId,
      workerProfileId: updatedBooking.workerProfileId,
      cancelledByUserId: actor.userId,
      reason: reason ?? null,
      scheduledStart: updatedBooking.scheduledStart.toISOString()
    });

    return this.mapBooking(updatedBooking);
  }
}

export { BookingsService };
