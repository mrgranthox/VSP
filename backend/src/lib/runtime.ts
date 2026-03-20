import { logger } from "./logger";
import { sendOperationalAlert } from "./alerts";
import { captureException, flushErrorReporting } from "./errorReporting";

type FatalErrorKind = "uncaughtException" | "unhandledRejection";

const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }

  return new Error(typeof value === "string" ? value : JSON.stringify(value));
};

const registerFatalErrorHandlers = (component: string): void => {
  let exiting = false;

  const handleFatalError = async (kind: FatalErrorKind, value: unknown) => {
    if (exiting) {
      return;
    }

    exiting = true;
    const error = toError(value);

    logger.fatal({ component, kind, error }, "Fatal runtime error");
    captureException(error, {
      component,
      tags: {
        fatal_error_kind: kind
      },
      extra: {
        kind
      }
    });
    await sendOperationalAlert({
      severity: "critical",
      component,
      summary: `${component} fatal runtime error`,
      details: {
        kind,
        message: error.message,
        stack: error.stack ?? null
      }
    });
    await flushErrorReporting();

    process.exit(1);
  };

  process.on("uncaughtException", (error) => {
    void handleFatalError("uncaughtException", error);
  });

  process.on("unhandledRejection", (reason) => {
    void handleFatalError("unhandledRejection", reason);
  });
};

export { registerFatalErrorHandlers };
