import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { requestsController } from "./requests.controller";
import {
  AssignmentIdParams,
  CancelRequestBody,
  CreateAssignmentBody,
  CreateRequestItemBody,
  CreateServiceRequestBody,
  GetServiceRequestsQuery,
  RequestIdParams,
  RequestItemParams,
  UpdateRequestItemBody,
  UpdateServiceRequestBody
} from "./requests.schemas";

const serviceRequestsRoutes = Router();

serviceRequestsRoutes.post("/service-requests", authenticate, validate(CreateServiceRequestBody), requestsController.createRequest);
serviceRequestsRoutes.get("/service-requests", authenticate, validate(GetServiceRequestsQuery, "query"), requestsController.getRequests);
serviceRequestsRoutes.get("/service-requests/:requestId", authenticate, validate(RequestIdParams, "params"), requestsController.getRequest);
serviceRequestsRoutes.patch(
  "/service-requests/:requestId",
  authenticate,
  validate(RequestIdParams, "params"),
  validate(UpdateServiceRequestBody),
  requestsController.updateRequest
);
serviceRequestsRoutes.post(
  "/service-requests/:requestId/items",
  authenticate,
  validate(RequestIdParams, "params"),
  validate(CreateRequestItemBody),
  requestsController.addItem
);
serviceRequestsRoutes.patch(
  "/service-requests/:requestId/items/:itemId",
  authenticate,
  validate(RequestItemParams, "params"),
  validate(UpdateRequestItemBody),
  requestsController.updateItem
);
serviceRequestsRoutes.delete(
  "/service-requests/:requestId/items/:itemId",
  authenticate,
  validate(RequestItemParams, "params"),
  requestsController.removeItem
);
serviceRequestsRoutes.post(
  "/service-requests/:requestId/assignments",
  authenticate,
  validate(RequestIdParams, "params"),
  validate(CreateAssignmentBody),
  requestsController.createAssignment
);
serviceRequestsRoutes.post(
  "/service-requests/:requestId/assignments/:assignmentId/accept",
  authenticate,
  validate(AssignmentIdParams, "params"),
  requestsController.acceptAssignment
);
serviceRequestsRoutes.post(
  "/service-requests/:requestId/assignments/:assignmentId/decline",
  authenticate,
  validate(AssignmentIdParams, "params"),
  requestsController.declineAssignment
);
serviceRequestsRoutes.post(
  "/service-requests/:requestId/cancel",
  authenticate,
  validate(RequestIdParams, "params"),
  validate(CancelRequestBody),
  requestsController.cancelRequest
);
serviceRequestsRoutes.post(
  "/service-requests/:requestId/expire",
  authenticate,
  validate(RequestIdParams, "params"),
  requestsController.expireRequest
);
serviceRequestsRoutes.get(
  "/service-requests/:requestId/status-history",
  authenticate,
  validate(RequestIdParams, "params"),
  requestsController.getStatusHistory
);

export { serviceRequestsRoutes };
