import { SupportTicketStatus } from "@prisma/client";

import { Errors } from "../../lib/errors";
import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import type { ActorContext } from "../../types/actor";
import { SupportRepository } from "./support.repository";

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const privilegedRoles = new Set(["SUPPORT", "ADMIN", "SUPER_ADMIN"]);

class SupportService {
  constructor(private readonly repository: SupportRepository = new SupportRepository()) {}

  private isPrivileged(actor: ActorContext): boolean {
    return (actor.roles ?? []).some((role) => privilegedRoles.has(role));
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

    return fallback;
  }

  private mapTicket(ticket: Awaited<ReturnType<SupportRepository["getTicketById"]>>) {
    if (!ticket) {
      return null;
    }

    return {
      id: ticket.id,
      openedByUserId: ticket.openedByUserId,
      relatedEntityType: ticket.relatedEntityType,
      relatedEntityId: ticket.relatedEntityId,
      status: ticket.status,
      priority: ticket.priority,
      subject: ticket.subject,
      body: ticket.body,
      assignedSupportUserId: ticket.assignedSupportUserId,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      openedByUser: ticket.openedByUser,
      assignedSupportUser: ticket.assignedSupportUser,
      messages: ticket.messages.map((message) => ({
        id: message.id,
        authorUserId: message.authorUserId,
        body: message.body,
        isInternalNote: message.isInternalNote,
        createdAt: message.createdAt,
        authorUser: {
          id: message.authorUser.id,
          displayName: message.authorUser.profile?.displayName ?? ([message.authorUser.profile?.firstName, message.authorUser.profile?.lastName].filter(Boolean).join(" ").trim() || null)
        }
      }))
    };
  }

  private async getTicketForActor(actor: ActorContext, ticketId: string) {
    const ticket = await this.repository.getTicketById(ticketId);

    if (!ticket) {
      throw Errors.SUPPORT_TICKET_NOT_FOUND();
    }

    const privileged = this.isPrivileged(actor);
    const canAccess = privileged || ticket.openedByUserId === actor.userId || ticket.assignedSupportUserId === actor.userId;

    if (!canAccess) {
      throw Errors.SUPPORT_TICKET_ACCESS_DENIED();
    }

    return {
      ticket,
      privileged
    };
  }

  async createTicket(
    actor: ActorContext,
    data: {
      subject: string;
      body: string;
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      relatedEntityType?: string;
      relatedEntityId?: string;
    }
  ) {
    const ticket = await this.repository.createTicket({
      openedByUserId: actor.userId,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      subject: stripHtml(data.subject),
      body: stripHtml(data.body),
      priority: data.priority ?? "MEDIUM"
    });

    return ticket;
  }

  async getTickets(actor: ActorContext, pagination: PaginationInput) {
    const args = getPaginationArgs(pagination);
    const [items, total] = await Promise.all([
      this.repository.listTicketsForUser(actor.userId, args.skip, args.take),
      this.repository.countTicketsForUser(actor.userId)
    ]);

    return {
      data: items,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getTicket(actor: ActorContext, ticketId: string) {
    const { ticket, privileged } = await this.getTicketForActor(actor, ticketId);
    const mapped = this.mapTicket(ticket);

    if (!mapped) {
      throw Errors.SUPPORT_TICKET_NOT_FOUND();
    }

    return {
      ...mapped,
      messages: mapped.messages.filter((message) => privileged || !message.isInternalNote)
    };
  }

  async addMessage(actor: ActorContext, ticketId: string, data: { body: string; isInternalNote?: boolean }): Promise<void> {
    const { ticket, privileged } = await this.getTicketForActor(actor, ticketId);

    if (data.isInternalNote && !privileged) {
      throw Errors.PERMISSION_DENIED();
    }

    await this.repository.addMessage(ticket.id, actor.userId, stripHtml(data.body), Boolean(data.isInternalNote && privileged));

    if (!data.isInternalNote) {
      await this.repository.updateTicket(ticket.id, {
        status: privileged ? SupportTicketStatus.WAITING_USER : SupportTicketStatus.WAITING_INTERNAL
      });
    }
  }

  async updateTicket(actor: ActorContext, ticketId: string, data: { status?: SupportTicketStatus }) {
    const { ticket, privileged } = await this.getTicketForActor(actor, ticketId);

    if (!data.status) {
      return ticket;
    }

    if (!privileged && data.status !== SupportTicketStatus.RESOLVED && data.status !== SupportTicketStatus.CLOSED) {
      throw Errors.PERMISSION_DENIED();
    }

    return this.repository.updateTicket(ticket.id, {
      status: data.status
    });
  }

  async adminListTickets(
    filters: { status?: SupportTicketStatus; priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" },
    pagination: PaginationInput
  ) {
    const args = getPaginationArgs(pagination);
    const [items, total] = await Promise.all([
      this.repository.listTicketsAdmin(filters, args.skip, args.take),
      this.repository.countTicketsAdmin(filters)
    ]);

    return {
      data: items,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async assignTicket(actor: ActorContext, ticketId: string, assignedSupportUserId: string): Promise<void> {
    await this.getTicketForActor(actor, ticketId);
    await this.repository.updateTicket(ticketId, {
      assignedSupportUserId,
      status: SupportTicketStatus.ASSIGNED
    });
  }

  async updateTicketStatus(actor: ActorContext, ticketId: string, status: SupportTicketStatus): Promise<void> {
    await this.getTicketForActor(actor, ticketId);
    await this.repository.updateTicket(ticketId, {
      status
    });
  }

  async autoCloseResolvedTickets(): Promise<number> {
    const autoCloseDays = await this.getNumericConfig("support_ticket_auto_close_days", 7);
    const cutoff = new Date(Date.now() - autoCloseDays * 24 * 60 * 60 * 1000);
    const result = await this.repository.autoCloseResolvedTickets(cutoff);
    return result.count;
  }
}

export { SupportService };
