import { type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import { paginated, success } from "../../lib/response";
import { AdminService } from "./admin.service";

class AdminController {
  constructor(private readonly adminService: AdminService = new AdminService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  private requireActor(req: Request) {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    return req.actor;
  }

  private sendPaginated(req: Request, res: Response, result: { data: unknown[]; pagination: { page: number; limit: number; total: number; hasNext: boolean } }) {
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  }

  private sendCsv(req: Request, res: Response, result: { filename: string; csv: string }) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);

    const requestId = this.getRequestId(req);

    if (requestId) {
      res.setHeader("X-Request-ID", requestId);
    }

    res.status(200).send(result.csv);
  }

  listUsers = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listUsers(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  getUser = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getUserDetail(req.params.userId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  suspendUser = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.suspendUser(this.requireActor(req), req.params.userId, req.body);
    res.status(200).json(success({ suspended: true }, { requestId: this.getRequestId(req) }));
  };

  reactivateUser = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.reactivateUser(this.requireActor(req), req.params.userId, req.body);
    res.status(200).json(success({ reactivated: true }, { requestId: this.getRequestId(req) }));
  };

  revokeUserSession = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.revokeUserSession(this.requireActor(req), req.params.userId, req.params.sessionId);
    res.status(200).json(success({ revoked: true }, { requestId: this.getRequestId(req) }));
  };

  revokeAllUserSessions = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.revokeAllUserSessions(this.requireActor(req), req.params.userId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listWorkers = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listWorkers(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  getWorker = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getWorkerDetail(req.params.workerId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  verifyWorker = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.verifyWorker(this.requireActor(req), req.params.workerId, req.body);
    res.status(200).json(success({ verified: true }, { requestId: this.getRequestId(req) }));
  };

  rejectWorker = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.rejectWorker(this.requireActor(req), req.params.workerId, req.body);
    res.status(200).json(success({ rejected: true }, { requestId: this.getRequestId(req) }));
  };

  listPosts = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listPosts(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  deletePost = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.deletePost(this.requireActor(req), req.params.postId);
    res.status(200).json(success({ deleted: true }, { requestId: this.getRequestId(req) }));
  };

  deleteComment = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.deleteComment(this.requireActor(req), req.params.commentId);
    res.status(200).json(success({ deleted: true }, { requestId: this.getRequestId(req) }));
  };

  deleteReview = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.deleteReview(this.requireActor(req), req.params.reviewId);
    res.status(200).json(success({ deleted: true }, { requestId: this.getRequestId(req) }));
  };

  listReports = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listReports(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  exportReports = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.exportReports(req.query as never);
    this.sendCsv(req, res, result);
  };

  bulkUpdateReports = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.bulkUpdateReports(this.requireActor(req), req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getReport = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getReportDetail(req.params.reportId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listModerationCases = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listModerationCases(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  exportModerationCases = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.exportModerationCases(req.query as never);
    this.sendCsv(req, res, result);
  };

  getModerationCase = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getModerationCase(req.params.caseId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  addModerationAction = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.addModerationAction(this.requireActor(req), req.params.caseId, req.body);
    res.status(201).json(success({ created: true }, { requestId: this.getRequestId(req) }));
  };

  bulkAddModerationActions = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.bulkAddModerationActions(this.requireActor(req), req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listSupportTickets = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listSupportTickets(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  exportSupportTickets = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.exportSupportTickets(req.query as never);
    this.sendCsv(req, res, result);
  };

  assignSupportTicket = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.assignSupportTicket(this.requireActor(req), req.params.ticketId, req.body.assignedSupportUserId);
    res.status(200).json(success({ assigned: true }, { requestId: this.getRequestId(req) }));
  };

  updateSupportTicketStatus = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.updateSupportTicketStatus(this.requireActor(req), req.params.ticketId, req.body.status);
    res.status(200).json(success({ updated: true }, { requestId: this.getRequestId(req) }));
  };

  bulkUpdateSupportTickets = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.bulkUpdateSupportTickets(this.requireActor(req), req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listAuditLogs(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  exportAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.exportAuditLogs(req.query as never);
    this.sendCsv(req, res, result);
  };

  getAnalyticsOverview = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getAnalyticsOverview(req.query as never);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getAnalyticsSearch = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getAnalyticsSearch(req.query as never);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getAnalyticsEngagement = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getAnalyticsEngagement(req.query as never);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getMarketplaceAnalytics = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getMarketplaceAnalytics(req.query as never);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listConfigs = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listConfigs();
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateConfig = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.updateConfig(this.requireActor(req), req.params.configKey, req.body.value);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listFeatureFlags = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listFeatureFlags();
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateFeatureFlag = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.updateFeatureFlag(this.requireActor(req), req.params.flagKey, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listCities = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listCities(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  createCity = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.createCity(this.requireActor(req), req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateCity = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.updateCity(this.requireActor(req), req.params.cityId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listRoles = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listRoles();
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listPermissions = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listPermissions();
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateRolePermissions = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.updateRolePermissions(this.requireActor(req), req.params.roleId, req.body.permissionKeys);
    res.status(200).json(success({ updated: true }, { requestId: this.getRequestId(req) }));
  };

  assignAdminRole = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.assignAdminRole(this.requireActor(req), req.params.userId, req.body.roleKey);
    res.status(200).json(success({ assigned: true }, { requestId: this.getRequestId(req) }));
  };

  removeAdminRole = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.removeAdminRole(this.requireActor(req), req.params.userId, req.params.roleId);
    res.status(200).json(success({ removed: true }, { requestId: this.getRequestId(req) }));
  };

  listServiceRequests = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listServiceRequestsAdmin(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  getServiceRequest = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getServiceRequestAdmin(req.params.requestId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listBookings = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listBookingsAdmin(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  getBooking = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getBookingAdmin(req.params.bookingId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  listFeaturedWorkers = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listFeaturedWorkers(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  actionFeaturedWorker = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.actionFeaturedWorker(this.requireActor(req), req.params.workerId, req.body);
    res.status(200).json(success({ updated: true }, { requestId: this.getRequestId(req) }));
  };

  getWorkerVerificationDocuments = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getWorkerVerificationDocuments(this.requireActor(req), req.params.workerId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getWorkerSubscription = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getWorkerSubscription(req.params.workerId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateWorkerSubscription = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.actionFeaturedWorker(this.requireActor(req), req.params.workerId, req.body);
    res.status(200).json(success({ updated: true }, { requestId: this.getRequestId(req) }));
  };

  listFraudSignals = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.listFraudSignals(req.query as never, req.query as never);
    this.sendPaginated(req, res, result);
  };

  exportFraudSignals = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.exportFraudSignals(req.query as never);
    this.sendCsv(req, res, result);
  };

  actionFraudSignal = async (req: Request, res: Response): Promise<void> => {
    await this.adminService.actionFraudSignal(this.requireActor(req), req.params.signalId, req.body);
    res.status(200).json(success({ updated: true }, { requestId: this.getRequestId(req) }));
  };

  bulkActionFraudSignals = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.bulkActionFraudSignals(this.requireActor(req), req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getContent = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getContent(req.params.entityType as never, req.params.entityId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getSystemHealth = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getSystemHealthAdmin();
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getSystemMetrics = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.getSystemMetrics();
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  broadcastNotification = async (req: Request, res: Response): Promise<void> => {
    const result = await this.adminService.broadcastNotification(this.requireActor(req), req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };
}

const adminController = new AdminController();

export { AdminController, adminController };
