import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { supportController } from "./support.controller";
import { AddTicketMessageBody, CreateSupportTicketBody, SupportTicketsQuery, TicketIdParams, UpdateTicketBody } from "./support.schemas";

const supportRoutes = Router();

supportRoutes.post("/support/tickets", authenticate, validate(CreateSupportTicketBody), supportController.createTicket);
supportRoutes.get("/support/tickets", authenticate, validate(SupportTicketsQuery, "query"), supportController.getTickets);
supportRoutes.get("/support/tickets/:ticketId", authenticate, validate(TicketIdParams, "params"), supportController.getTicket);
supportRoutes.post(
  "/support/tickets/:ticketId/messages",
  authenticate,
  validate(TicketIdParams, "params"),
  validate(AddTicketMessageBody),
  supportController.addMessage
);
supportRoutes.patch(
  "/support/tickets/:ticketId",
  authenticate,
  validate(TicketIdParams, "params"),
  validate(UpdateTicketBody),
  supportController.updateTicket
);

export { supportRoutes };
