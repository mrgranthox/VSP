import { addDomainEventJobs } from "../queues";
import { logger } from "./logger";

type EventPayload = Record<string, unknown>;
type EventHandler = (payload: EventPayload) => Promise<void> | void;

const handlers = new Map<string, Set<EventHandler>>();

const getEventBusMode = (): "inline" | "queue" => {
  const configuredMode = process.env.EVENT_BUS_MODE?.trim().toLowerCase();

  if (configuredMode === "inline" || configuredMode === "queue") {
    return configuredMode;
  }

  return process.env.NODE_ENV === "production" ? "queue" : "inline";
};

const dispatch = async (eventName: string, payload: EventPayload): Promise<void> => {
  const eventHandlers = Array.from(handlers.get(eventName) ?? []);

  for (const handler of eventHandlers) {
    await handler(payload);
  }
};

const EventBus = {
  on(eventName: string, handler: EventHandler): () => void {
    const eventHandlers = handlers.get(eventName) ?? new Set<EventHandler>();
    eventHandlers.add(handler);
    handlers.set(eventName, eventHandlers);

    return () => {
      eventHandlers.delete(handler);

      if (eventHandlers.size === 0) {
        handlers.delete(eventName);
      }
    };
  },

  async emit(eventName: string, payload: EventPayload): Promise<void> {
    logger.info({ eventName, payload }, "Domain event emitted");

    if (getEventBusMode() === "queue") {
      await addDomainEventJobs(eventName, payload);
      return;
    }

    await dispatch(eventName, payload);
  },

  async dispatch(eventName: string, payload: EventPayload): Promise<void> {
    await dispatch(eventName, payload);
  }
};

export { EventBus };
export type { EventHandler, EventPayload };
