import { EventBus } from "../../lib/eventBus";
import { logger } from "../../lib/logger";
import { UsersRepository } from "./users.repository";

let usersEventHandlersRegistered = false;

const registerUsersEventHandlers = (): void => {
  if (usersEventHandlersRegistered) {
    return;
  }

  usersEventHandlersRegistered = true;
  const repository = new UsersRepository();

  EventBus.on("USER_REGISTERED", async (payload) => {
    const userId = typeof payload.userId === "string" ? payload.userId : null;

    if (!userId) {
      logger.warn({ payload }, "Skipping USER_REGISTERED handler because userId is missing");
      return;
    }

    await repository.ensureNotificationPreference(userId);
  });
};

registerUsersEventHandlers();

export { registerUsersEventHandlers };
