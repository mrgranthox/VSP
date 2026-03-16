import { logger } from "../../lib/logger";
import { EventBus } from "../../lib/eventBus";
import { ModerationService } from "./moderation.service";

let moderationEventHandlersRegistered = false;

const registerModerationEventHandlers = (): void => {
  if (moderationEventHandlersRegistered) {
    return;
  }

  moderationEventHandlersRegistered = true;
  const moderationService = new ModerationService();

  EventBus.on("FRAUD_SIGNAL_CREATED", async (payload) => {
    const signalKey = typeof payload.signalKey === "string" ? payload.signalKey : null;
    const score = typeof payload.score === "number" ? payload.score : null;

    if (!signalKey || score === null) {
      logger.warn({ payload }, "Skipping FRAUD_SIGNAL_CREATED handler because signal payload is incomplete");
      return;
    }

    await moderationService.recordFraudSignal({
      userId: typeof payload.userId === "string" ? payload.userId : null,
      entityType: typeof payload.entityType === "string" ? payload.entityType : null,
      entityId: typeof payload.entityId === "string" ? payload.entityId : null,
      signalKey,
      score
    });
  });
};

registerModerationEventHandlers();

export { registerModerationEventHandlers };
