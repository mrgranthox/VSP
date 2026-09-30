import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { eventsController } from "./events.controller";
import { CreateEventBody, EventIdParam, EventRsvpBody, GetEventsQuery, UpdateEventBody } from "./events.schemas";

const eventsRoutes = Router();

eventsRoutes.get("/events", optionalAuthenticate, validate(GetEventsQuery, "query"), eventsController.listEvents);
eventsRoutes.get("/events/:id", optionalAuthenticate, validate(EventIdParam, "params"), eventsController.getEvent);
eventsRoutes.post("/events", authenticate, validate(CreateEventBody), eventsController.createEvent);
eventsRoutes.patch(
  "/events/:id",
  authenticate,
  validate(EventIdParam, "params"),
  validate(UpdateEventBody),
  eventsController.updateEvent
);
eventsRoutes.delete("/events/:id", authenticate, validate(EventIdParam, "params"), eventsController.deleteEvent);
eventsRoutes.post(
  "/events/:id/rsvp",
  authenticate,
  validate(EventIdParam, "params"),
  validate(EventRsvpBody),
  eventsController.rsvp
);

export { eventsRoutes };
