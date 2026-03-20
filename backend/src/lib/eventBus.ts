import { addDomainEventJobs } from "../queues";
import { logger } from "./logger";
import { getRequestContext } from "./requestContext";
import { SpanKind, buildTraceCarrier, setSpanAttributes, withActiveSpan } from "./tracing";

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
    const mode = getEventBusMode();
    const requestContext = getRequestContext();

    await withActiveSpan(
      "eventbus.emit",
      {
        kind: SpanKind.PRODUCER
      },
      async (span) => {
        setSpanAttributes(span, {
          "vsp.event.name": eventName,
          "vsp.event.mode": mode,
          "vsp.request.id": requestContext?.requestId
        });

        logger.info({ eventName, payload, mode }, "Domain event emitted");

        if (mode === "queue") {
          await addDomainEventJobs(eventName, payload, buildTraceCarrier(requestContext?.requestId));
          return;
        }

        await dispatch(eventName, payload);
      }
    );
  },

  async dispatch(eventName: string, payload: EventPayload): Promise<void> {
    await dispatch(eventName, payload);
  }
};

export { EventBus };
export type { EventHandler, EventPayload };
