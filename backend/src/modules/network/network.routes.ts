import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { networkController } from "./network.controller";
import {
  ConnectBody,
  GetNetworkQuery,
  InvitationIdParams,
  TargetUserIdParams
} from "./network.schemas";

const networkRoutes = Router();

networkRoutes.get("/network/stats", authenticate, networkController.getNetworkStats);
networkRoutes.get("/network/pymk", authenticate, validate(GetNetworkQuery, "query"), networkController.getPeopleYouMayKnow);
networkRoutes.get("/network/connections/degree/:userId", authenticate, validate(TargetUserIdParams, "params"), networkController.getConnectionDegree);
networkRoutes.post("/network/connect/:userId", authenticate, validate(TargetUserIdParams, "params"), validate(ConnectBody), networkController.connect);
networkRoutes.post("/network/invitations/:invitationId/accept", authenticate, validate(InvitationIdParams, "params"), networkController.acceptInvitation);
networkRoutes.post("/network/invitations/:invitationId/ignore", authenticate, validate(InvitationIdParams, "params"), networkController.ignoreInvitation);

export { networkRoutes };
