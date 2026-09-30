import type { ActorContext } from "../../types/actor";
import { JobAlertsRepository } from "./job-alerts.repository";

export class JobAlertsService {
  constructor(private readonly repository: JobAlertsRepository = new JobAlertsRepository()) {}

  async listUserAlerts(actor: ActorContext) {
    return this.repository.listUserAlerts(actor.userId);
  }

  async create(actor: ActorContext, data: any) {
    return this.repository.create({
      ...data,
      userId: actor.userId
    });
  }

  async update(actor: ActorContext, id: string, data: any) {
    return this.repository.update(id, actor.userId, data);
  }

  async delete(actor: ActorContext, id: string) {
    return this.repository.delete(id, actor.userId);
  }
}
