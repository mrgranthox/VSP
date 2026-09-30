import { prisma } from "../../lib/prisma";
import type { EventRsvpStatus } from "@prisma/client";

export class EventsRepository {
  async listEvents(params: { eventType?: string; query?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.eventType) where.eventType = params.eventType;
    if (params.query) where.title = { contains: params.query, mode: "insensitive" };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { startAt: "asc" },
        include: {
          organizerUser: {
            select: {
              id: true,
              profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
            }
          },
          _count: {
            select: { attendees: true }
          }
        }
      }),
      prisma.event.count({ where })
    ]);

    return { events, total };
  }

  async findById(id: string) {
    return prisma.event.findUnique({
      where: { id },
      include: {
        organizerUser: {
          select: {
            id: true,
            profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
          }
        },
        attendees: {
          take: 20,
          include: {
            user: {
              select: {
                id: true,
                profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
              }
            }
          }
        },
        _count: {
          select: { attendees: true }
        }
      }
    });
  }

  async create(data: any) {
    return prisma.event.create({ data });
  }

  async update(id: string, organizerUserId: string, data: any) {
    return prisma.event.updateMany({
      where: { id, organizerUserId },
      data
    });
  }

  async delete(id: string, organizerUserId: string) {
    return prisma.event.deleteMany({
      where: { id, organizerUserId }
    });
  }

  async rsvp(eventId: string, userId: string, status: EventRsvpStatus) {
    const result = await prisma.eventAttendee.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status },
      update: { status }
    });

    const count = await prisma.eventAttendee.count({
      where: { eventId, status: "ATTENDING" }
    });

    await prisma.event.update({
      where: { id: eventId },
      data: { attendeeCount: count }
    });

    return result;
  }
}
