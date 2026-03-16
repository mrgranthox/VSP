import { createHash } from "node:crypto";

import { AssignmentStatus, Prisma, RequestStatus, VerificationStatus } from "@prisma/client";

import { EventBus } from "../../lib/eventBus";
import { Errors } from "../../lib/errors";
import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import { prisma } from "../../lib/prisma";
import type { ActorContext } from "../../types/actor";
import {
  RequestsRepository,
  type ServiceRequestRecord,
  type ServiceRequestStatusHistoryRecord
} from "./requests.repository";

const SERVICE_REQUEST_EXPIRY_HOURS_KEY = "service_request_expiry_hours";
const SERVICE_REQUEST_MAX_ASSIGNMENTS_KEY = "SERVICE_REQUEST_MAX_ASSIGNMENTS";
const DEFAULT_SERVICE_REQUEST_EXPIRY_HOURS = 48;
const DEFAULT_SERVICE_REQUEST_MAX_ASSIGNMENTS = 10;
const IDEMPOTENCY_TTL_HOURS = 24;
const customerEditableStatuses: RequestStatus[] = [RequestStatus.OPEN, RequestStatus.MATCHED];
const customerCancelableStatuses: RequestStatus[] = [
  RequestStatus.OPEN,
  RequestStatus.MATCHED,
  RequestStatus.ACCEPTED,
  RequestStatus.IN_PROGRESS
];
const workerCancelableStatuses: RequestStatus[] = [RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS];
const expirableStatuses: RequestStatus[] = [RequestStatus.OPEN, RequestStatus.MATCHED];

const allowedTransitions: Record<RequestStatus, RequestStatus[]> = {
  OPEN: [RequestStatus.MATCHED, RequestStatus.CANCELLED, RequestStatus.EXPIRED],
  MATCHED: [RequestStatus.ACCEPTED, RequestStatus.CANCELLED, RequestStatus.EXPIRED],
  ACCEPTED: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
  IN_PROGRESS: [RequestStatus.COMPLETED, RequestStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: []
};

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const getDisplayName = (profile: { firstName?: string | null; lastName?: string | null; displayName?: string | null } | null | undefined): string | null =>
  profile?.displayName ?? ([profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || null);

const toPlainJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const toNumber = (value: Prisma.Decimal | null | undefined): number | null => (value === null || value === undefined ? null : Number(value));

const addHours = (value: Date, hours: number): Date => {
  const result = new Date(value);
  result.setHours(result.getHours() + hours);
  return result;
};

type RequestAccessContext = {
  request: ServiceRequestRecord;
  workerProfileId?: string;
  isCustomer: boolean;
  isPreferredWorker: boolean;
  isAssignedWorker: boolean;
  isBookingWorker: boolean;
};

class RequestsService {
  constructor(private readonly repository: RequestsRepository = new RequestsRepository()) {}

  private canonicalize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.canonicalize(item)).join(",")}]`;
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
      return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${this.canonicalize(entryValue)}`).join(",")}}`;
    }

    return JSON.stringify(value);
  }

  private hashRequestPayload(value: unknown): string {
    return createHash("sha256").update(this.canonicalize(value)).digest("hex");
  }

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
      const candidates = ["value", "hours", "count", "limit"];

      for (const key of candidates) {
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

  private mapWorkerSummary(workerProfile: {
    id: string;
    userId: string;
    headline: string | null;
    verificationStatus: VerificationStatus;
    user: {
      profile: {
        firstName: string;
        lastName: string;
        displayName: string | null;
        avatarUrl: string | null;
        cityId: string | null;
      } | null;
    };
  }) {
    return {
      id: workerProfile.id,
      userId: workerProfile.userId,
      headline: workerProfile.headline ?? null,
      verificationStatus: workerProfile.verificationStatus,
      displayName: getDisplayName(workerProfile.user.profile),
      avatarUrl: workerProfile.user.profile?.avatarUrl ?? null
    };
  }

  private mapRequest(request: ServiceRequestRecord) {
    return {
      id: request.id,
      customerUserId: request.customerUserId,
      tradeCategoryId: request.tradeCategoryId,
      preferredWorkerProfileId: request.preferredWorkerProfileId,
      title: request.title,
      description: request.description,
      locationText: request.locationText,
      lat: toNumber(request.lat),
      lng: toNumber(request.lng),
      status: request.status,
      requestedAt: request.requestedAt,
      scheduledAt: request.scheduledAt,
      expiresAt: request.expiresAt,
      customer: {
        userId: request.customerUser.id,
        displayName: getDisplayName(request.customerUser.profile),
        avatarUrl: request.customerUser.profile?.avatarUrl ?? null,
        cityId: request.customerUser.profile?.cityId ?? null
      },
      tradeCategory: request.tradeCategory,
      preferredWorkerProfile: request.preferredWorkerProfile ? this.mapWorkerSummary(request.preferredWorkerProfile) : null,
      items: request.items.map((item) => ({
        id: item.id,
        label: item.label,
        quantity: item.quantity,
        note: item.note ?? null
      })),
      assignments: request.assignments.map((assignment) => ({
        id: assignment.id,
        workerProfileId: assignment.workerProfileId,
        assignmentStatus: assignment.assignmentStatus,
        assignedAt: assignment.assignedAt,
        respondedAt: assignment.respondedAt,
        workerProfile: this.mapWorkerSummary(assignment.workerProfile)
      })),
      booking: request.booking
        ? {
            id: request.booking.id,
            serviceRequestId: request.booking.serviceRequestId,
            workerProfileId: request.booking.workerProfileId,
            customerUserId: request.booking.customerUserId,
            status: request.booking.status,
            scheduledStart: request.booking.scheduledStart,
            scheduledEnd: request.booking.scheduledEnd,
            completedAt: request.booking.completedAt
          }
        : null
    };
  }

  private mapStatusHistoryEntry(entry: ServiceRequestStatusHistoryRecord) {
    return {
      id: entry.id,
      serviceRequestId: entry.serviceRequestId,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      changedByUserId: entry.changedByUserId,
      changedAt: entry.changedAt,
      changedBy: entry.changedByUser
        ? {
            userId: entry.changedByUser.id,
            displayName: getDisplayName(entry.changedByUser.profile),
            avatarUrl: entry.changedByUser.profile?.avatarUrl ?? null
          }
        : null
    };
  }

  private ensureStatusTransitionAllowed(fromStatus: RequestStatus, toStatus: RequestStatus): void {
    if (!allowedTransitions[fromStatus].includes(toStatus)) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }
  }

  private async getAccessContext(actor: ActorContext, requestId: string): Promise<RequestAccessContext> {
    const [request, workerProfile] = await Promise.all([
      this.repository.getRequestById(requestId),
      this.repository.getWorkerProfileByUserId(actor.userId)
    ]);

    if (!request) {
      throw Errors.REQUEST_NOT_FOUND();
    }

    const isCustomer = request.customerUserId === actor.userId;
    const isPreferredWorker = request.preferredWorkerProfile?.userId === actor.userId;
    const isAssignedWorker = Boolean(workerProfile && request.assignments.some((assignment) => assignment.workerProfileId === workerProfile.id));
    const isBookingWorker = Boolean(workerProfile && request.booking?.workerProfileId === workerProfile.id);

    if (!isCustomer && !isPreferredWorker && !isAssignedWorker && !isBookingWorker) {
      throw Errors.PERMISSION_DENIED();
    }

    return {
      request,
      workerProfileId: workerProfile?.id,
      isCustomer,
      isPreferredWorker,
      isAssignedWorker,
      isBookingWorker
    };
  }

  private async transitionStatusInTransaction(
    client: Prisma.TransactionClient,
    request: ServiceRequestRecord,
    toStatus: RequestStatus,
    changedByUserId?: string
  ) {
    if (request.status === toStatus) {
      return request;
    }

    this.ensureStatusTransitionAllowed(request.status, toStatus);

    const updatedRequest = await this.repository.updateRequest(client, request.id, {
      status: toStatus
    });

    await this.repository.createStatusHistory(client, {
      serviceRequestId: request.id,
      fromStatus: request.status,
      toStatus,
      changedByUserId
    });

    return updatedRequest;
  }

  private async getExpiryHours(): Promise<number> {
    return this.getNumericConfig(SERVICE_REQUEST_EXPIRY_HOURS_KEY, DEFAULT_SERVICE_REQUEST_EXPIRY_HOURS);
  }

  private async getMaxAssignments(): Promise<number> {
    return this.getNumericConfig(SERVICE_REQUEST_MAX_ASSIGNMENTS_KEY, DEFAULT_SERVICE_REQUEST_MAX_ASSIGNMENTS);
  }

  async createRequest(
    actor: ActorContext,
    data: {
      tradeCategoryId?: string;
      preferredWorkerProfileId?: string;
      title: string;
      description: string;
      locationText?: string;
      lat?: number;
      lng?: number;
      scheduledAt?: string;
      items?: Array<{ label: string; quantity?: number; note?: string }>;
    },
    idempotencyKey?: string
  ) {
    const requestHash = this.hashRequestPayload(data);

    if (idempotencyKey) {
      const existing = await this.repository.findIdempotencyKey(idempotencyKey);

      if (existing) {
        if (existing.expiresAt > new Date()) {
          if (existing.requestHash !== requestHash) {
            throw Errors.IDEMPOTENCY_CONFLICT();
          }

          return existing.responseSnapshotJson;
        }

        await this.repository.deleteIdempotencyKey(idempotencyKey);
      }
    }

    if (data.tradeCategoryId && !(await this.repository.tradeCategoryExists(data.tradeCategoryId))) {
      throw Errors.VALIDATION_FAILED({
        tradeCategoryId: ["Trade category is not supported"]
      });
    }

    if (data.preferredWorkerProfileId) {
      const preferredWorkerProfile = await this.repository.getApprovedWorkerProfile(data.preferredWorkerProfileId);

      if (!preferredWorkerProfile || preferredWorkerProfile.verificationStatus !== VerificationStatus.APPROVED) {
        throw Errors.WORKER_NOT_VERIFIED();
      }
    }

    const expiryHours = await this.getExpiryHours();
    const requestedAt = new Date();
    const expiresAt = addHours(requestedAt, expiryHours);

    try {
      const createdRequest = await prisma.$transaction(async (client) => {
        const request = await this.repository.createRequest(
          client,
          {
            customerUserId: actor.userId,
            tradeCategoryId: data.tradeCategoryId,
            preferredWorkerProfileId: data.preferredWorkerProfileId,
            title: stripHtml(data.title),
            description: stripHtml(data.description),
            locationText: data.locationText ? stripHtml(data.locationText) : null,
            lat: data.lat === undefined ? undefined : new Prisma.Decimal(data.lat),
            lng: data.lng === undefined ? undefined : new Prisma.Decimal(data.lng),
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
            requestedAt,
            expiresAt
          },
          (data.items ?? []).map((item) => ({
            label: stripHtml(item.label),
            quantity: item.quantity ?? 1,
            note: item.note ? stripHtml(item.note) : undefined
          }))
        );

        await this.repository.createStatusHistory(client, {
          serviceRequestId: request.id,
          fromStatus: null,
          toStatus: RequestStatus.OPEN,
          changedByUserId: actor.userId
        });

        const mappedRequest = this.mapRequest(request);

        if (idempotencyKey) {
          await this.repository.createIdempotencyRecord(client, {
            idempotencyKey,
            userId: actor.userId,
            requestHash,
            responseSnapshotJson: toPlainJson(mappedRequest),
            expiresAt: addHours(new Date(), IDEMPOTENCY_TTL_HOURS)
          });
        }

        return mappedRequest;
      });

      await EventBus.emit("REQUEST_CREATED", {
        requestId: createdRequest.id,
        customerUserId: createdRequest.customerUserId,
        tradeCategoryId: createdRequest.tradeCategoryId,
        lat: createdRequest.lat,
        lng: createdRequest.lng
      });

      return createdRequest;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && idempotencyKey) {
        const existing = await this.repository.findIdempotencyKey(idempotencyKey);

        if (existing?.requestHash === requestHash && existing.expiresAt > new Date()) {
          return existing.responseSnapshotJson;
        }

        throw Errors.IDEMPOTENCY_CONFLICT();
      }

      throw error;
    }
  }

  async getRequests(actor: ActorContext, params: { status?: RequestStatus }, pagination: PaginationInput) {
    const workerProfile = await this.repository.getWorkerProfileByUserId(actor.userId);
    const args = getPaginationArgs(pagination);
    const [requests, total] = await Promise.all([
      this.repository.listRequests(actor.userId, workerProfile?.id, params.status, args.skip, args.take),
      this.repository.countRequests(actor.userId, workerProfile?.id, params.status)
    ]);

    return {
      data: requests.map((request) => this.mapRequest(request)),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getRequest(actor: ActorContext, requestId: string) {
    const { request } = await this.getAccessContext(actor, requestId);
    return this.mapRequest(request);
  }

  async updateRequest(
    actor: ActorContext,
    requestId: string,
    data: {
      title?: string;
      description?: string;
      locationText?: string | null;
      lat?: number | null;
      lng?: number | null;
      scheduledAt?: string | null;
    }
  ) {
    const { request, isCustomer } = await this.getAccessContext(actor, requestId);

    if (!isCustomer) {
      throw Errors.PERMISSION_DENIED();
    }

    if (!customerEditableStatuses.includes(request.status)) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    const updateData: Prisma.ServiceRequestUncheckedUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = stripHtml(data.title);
    }

    if (data.description !== undefined) {
      updateData.description = stripHtml(data.description);
    }

    if (data.locationText !== undefined) {
      updateData.locationText = typeof data.locationText === "string" ? stripHtml(data.locationText) : null;
    }

    if (data.lat !== undefined) {
      updateData.lat = data.lat === null ? null : new Prisma.Decimal(data.lat);
    }

    if (data.lng !== undefined) {
      updateData.lng = data.lng === null ? null : new Prisma.Decimal(data.lng);
    }

    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    }

    const updatedRequest = await this.repository.updateRequest(prisma, requestId, updateData);
    return this.mapRequest(updatedRequest);
  }

  async addItem(
    actor: ActorContext,
    requestId: string,
    data: { label: string; quantity?: number; note?: string }
  ) {
    const { request, isCustomer } = await this.getAccessContext(actor, requestId);

    if (!isCustomer) {
      throw Errors.PERMISSION_DENIED();
    }

    if (!customerEditableStatuses.includes(request.status)) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    await this.repository.addRequestItem(prisma, requestId, {
      label: stripHtml(data.label),
      quantity: data.quantity ?? 1,
      note: data.note ? stripHtml(data.note) : undefined
    });

    const updatedRequest = await this.repository.getRequestById(requestId);

    if (!updatedRequest) {
      throw Errors.REQUEST_NOT_FOUND();
    }

    return this.mapRequest(updatedRequest);
  }

  async updateItem(
    actor: ActorContext,
    requestId: string,
    itemId: string,
    data: { label?: string; quantity?: number; note?: string | null }
  ) {
    const { request, isCustomer } = await this.getAccessContext(actor, requestId);

    if (!isCustomer) {
      throw Errors.PERMISSION_DENIED();
    }

    if (!customerEditableStatuses.includes(request.status)) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    const item = await this.repository.getRequestItem(requestId, itemId);

    if (!item) {
      throw Errors.REQUEST_NOT_FOUND();
    }

    const updateData: Prisma.ServiceRequestItemUncheckedUpdateInput = {};

    if (data.label !== undefined) {
      updateData.label = stripHtml(data.label);
    }

    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
    }

    if (data.note !== undefined) {
      updateData.note = typeof data.note === "string" ? stripHtml(data.note) : null;
    }

    await this.repository.updateRequestItem(prisma, itemId, updateData);

    const updatedRequest = await this.repository.getRequestById(requestId);

    if (!updatedRequest) {
      throw Errors.REQUEST_NOT_FOUND();
    }

    return this.mapRequest(updatedRequest);
  }

  async removeItem(actor: ActorContext, requestId: string, itemId: string) {
    const { request, isCustomer } = await this.getAccessContext(actor, requestId);

    if (!isCustomer) {
      throw Errors.PERMISSION_DENIED();
    }

    if (!customerEditableStatuses.includes(request.status)) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    const item = await this.repository.getRequestItem(requestId, itemId);

    if (!item) {
      throw Errors.REQUEST_NOT_FOUND();
    }

    await this.repository.removeRequestItem(prisma, itemId);
  }

  async createAssignment(actor: ActorContext, requestId: string, data: { workerProfileId: string }) {
    const { request, isCustomer } = await this.getAccessContext(actor, requestId);

    if (!isCustomer) {
      throw Errors.PERMISSION_DENIED();
    }

    if (!customerEditableStatuses.includes(request.status)) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    const [workerProfile, existingAssignment, assignmentCount, maxAssignments] = await Promise.all([
      this.repository.getApprovedWorkerProfile(data.workerProfileId),
      this.repository.getAssignmentByWorkerProfile(requestId, data.workerProfileId),
      this.repository.countAssignments(requestId),
      this.getMaxAssignments()
    ]);

    if (!workerProfile || workerProfile.verificationStatus !== VerificationStatus.APPROVED) {
      throw Errors.WORKER_NOT_VERIFIED();
    }

    if (existingAssignment) {
      throw Errors.VALIDATION_FAILED({
        workerProfileId: ["Worker is already assigned to this request"]
      });
    }

    if (assignmentCount >= maxAssignments) {
      throw Errors.VALIDATION_FAILED({
        workerProfileId: ["Request has reached the assignment limit"]
      });
    }

    const result = await prisma.$transaction(async (client) => {
      const assignment = await this.repository.createAssignment(client, {
        serviceRequestId: requestId,
        workerProfileId: data.workerProfileId
      });

      if (request.status === RequestStatus.OPEN) {
        await this.transitionStatusInTransaction(client, request, RequestStatus.MATCHED, actor.userId);
      }

      const updatedRequest = await this.repository.getRequestById(requestId, client);

      if (!updatedRequest) {
        throw Errors.REQUEST_NOT_FOUND();
      }

      return {
        assignment,
        request: updatedRequest
      };
    });

    await EventBus.emit("REQUEST_ASSIGNED", {
      assignmentId: result.assignment.id,
      requestId,
      workerProfileId: result.assignment.workerProfileId,
      customerUserId: result.request.customerUserId
    });

    return {
      assignment: {
        id: result.assignment.id,
        workerProfileId: result.assignment.workerProfileId,
        assignmentStatus: result.assignment.assignmentStatus,
        assignedAt: result.assignment.assignedAt,
        respondedAt: result.assignment.respondedAt,
        workerProfile: this.mapWorkerSummary(result.assignment.workerProfile)
      },
      request: this.mapRequest(result.request)
    };
  }

  async acceptAssignment(actor: ActorContext, requestId: string, assignmentId: string) {
    const accessContext = await this.getAccessContext(actor, requestId);

    if (!accessContext.workerProfileId) {
      throw Errors.PERMISSION_DENIED();
    }

    const assignment = await this.repository.getAssignment(requestId, assignmentId);

    if (!assignment) {
      throw Errors.REQUEST_NOT_FOUND();
    }

    if (assignment.workerProfileId !== accessContext.workerProfileId) {
      throw Errors.PERMISSION_DENIED();
    }

    if (assignment.assignmentStatus === AssignmentStatus.ACCEPTED || assignment.serviceRequest.status === RequestStatus.ACCEPTED) {
      throw Errors.REQUEST_ALREADY_ACCEPTED();
    }

    if (assignment.assignmentStatus !== AssignmentStatus.PENDING || assignment.serviceRequest.status !== RequestStatus.MATCHED) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    const result = await prisma.$transaction(async (client) => {
      const acceptedAssignment = await this.repository.updateAssignment(client, assignmentId, {
        assignmentStatus: AssignmentStatus.ACCEPTED,
        respondedAt: new Date()
      });

      await this.repository.declinePendingAssignments(client, requestId, assignmentId);
      await this.transitionStatusInTransaction(client, assignment.serviceRequest, RequestStatus.ACCEPTED, actor.userId);

      const updatedRequest = await this.repository.getRequestById(requestId, client);

      if (!updatedRequest) {
        throw Errors.REQUEST_NOT_FOUND();
      }

      return {
        assignment: acceptedAssignment,
        request: updatedRequest
      };
    });

    await EventBus.emit("REQUEST_ACCEPTED", {
      requestId,
      workerProfileId: result.assignment.workerProfileId,
      customerUserId: result.request.customerUserId
    });

    return {
      assignment: {
        id: result.assignment.id,
        workerProfileId: result.assignment.workerProfileId,
        assignmentStatus: result.assignment.assignmentStatus,
        assignedAt: result.assignment.assignedAt,
        respondedAt: result.assignment.respondedAt,
        workerProfile: this.mapWorkerSummary(result.assignment.workerProfile)
      },
      request: this.mapRequest(result.request)
    };
  }

  async declineAssignment(actor: ActorContext, requestId: string, assignmentId: string) {
    const accessContext = await this.getAccessContext(actor, requestId);

    if (!accessContext.workerProfileId) {
      throw Errors.PERMISSION_DENIED();
    }

    const assignment = await this.repository.getAssignment(requestId, assignmentId);

    if (!assignment) {
      throw Errors.REQUEST_NOT_FOUND();
    }

    if (assignment.workerProfileId !== accessContext.workerProfileId) {
      throw Errors.PERMISSION_DENIED();
    }

    if (assignment.assignmentStatus !== AssignmentStatus.PENDING || assignment.serviceRequest.status !== RequestStatus.MATCHED) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    const declinedAssignment = await this.repository.updateAssignment(prisma, assignmentId, {
      assignmentStatus: AssignmentStatus.DECLINED,
      respondedAt: new Date()
    });

    return {
      id: declinedAssignment.id,
      workerProfileId: declinedAssignment.workerProfileId,
      assignmentStatus: declinedAssignment.assignmentStatus,
      assignedAt: declinedAssignment.assignedAt,
      respondedAt: declinedAssignment.respondedAt,
      workerProfile: this.mapWorkerSummary(declinedAssignment.workerProfile)
    };
  }

  async cancelRequest(actor: ActorContext, requestId: string, _reason?: string) {
    const accessContext = await this.getAccessContext(actor, requestId);
    const { request, isCustomer, workerProfileId } = accessContext;

    const isAcceptedWorker = Boolean(
      workerProfileId &&
        request.assignments.some(
          (assignment) => assignment.workerProfileId === workerProfileId && assignment.assignmentStatus === AssignmentStatus.ACCEPTED
        )
    );

    const allowedByCustomer = isCustomer && customerCancelableStatuses.includes(request.status);
    const allowedByWorker = isAcceptedWorker && workerCancelableStatuses.includes(request.status);

    if (!allowedByCustomer && !allowedByWorker) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    const updatedRequest = await prisma.$transaction(async (client) => {
      if (expirableStatuses.includes(request.status)) {
        await this.repository.declinePendingAssignments(client, requestId);
      }

      if (request.status === RequestStatus.ACCEPTED) {
        await this.repository.declinePendingAssignments(client, requestId);
      }

      return this.transitionStatusInTransaction(client, request, RequestStatus.CANCELLED, actor.userId);
    });

    return this.mapRequest(updatedRequest);
  }

  async expireRequest(actor: ActorContext, requestId: string) {
    const { request, isCustomer } = await this.getAccessContext(actor, requestId);
    const isAdmin = Boolean(actor.roles?.includes("ADMIN"));

    if (!isCustomer && !isAdmin) {
      throw Errors.PERMISSION_DENIED();
    }

    if (!expirableStatuses.includes(request.status)) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    if (request.expiresAt && request.expiresAt > new Date()) {
      throw Errors.REQUEST_INVALID_STATUS_TRANSITION();
    }

    const updatedRequest = await prisma.$transaction(async (client) => {
      await this.repository.declinePendingAssignments(client, requestId);
      return this.transitionStatusInTransaction(client, request, RequestStatus.EXPIRED, actor.userId);
    });

    return this.mapRequest(updatedRequest);
  }

  async getStatusHistory(actor: ActorContext, requestId: string) {
    await this.getAccessContext(actor, requestId);
    const history = await this.repository.listStatusHistory(requestId);
    return history.map((entry) => this.mapStatusHistoryEntry(entry));
  }
}

export { RequestsService };
