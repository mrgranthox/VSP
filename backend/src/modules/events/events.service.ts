import type { EventRsvpStatus } from "@prisma/client";
import { ApiError } from "../../lib/errors";
import type { ActorContext } from "../../types/actor";
import { EventsRepository } from "./events.repository";

export class EventsService {
  constructor(private readonly repository: EventsRepository = new EventsRepository()) {}

  async listEvents(params: { eventType?: string; query?: string; page: number; limit: number }) {
    return this.repository.listEvents(params);
  }

  async getEvent(id: string) {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new ApiError("NOT_FOUND", 404, "Event not found");
    }
    return event;
  }

  async createEvent(actor: ActorContext, data: any) {
    return this.repository.create({
      ...data,
      organizerUserId: actor.userId,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null
    });
  }

  async updateEvent(actor: ActorContext, id: string, data: any) {
    const updateData = { ...data };
    if (data.startAt) updateData.startAt = new Date(data.startAt);
    if (data.endAt !== undefined) updateData.endAt = data.endAt ? new Date(data.endAt) : null;
    return this.repository.update(id, actor.userId, updateData);
  }

  async deleteEvent(actor: ActorContext, id: string) {
    return this.repository.delete(id, actor.userId);
  }

  async rsvp(actor: ActorContext, eventId: string, status: EventRsvpStatus) {
    return this.repository.rsvp(eventId, actor.userId, status);
  }
}
