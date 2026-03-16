import { type NextFunction, type Request, type Response } from "express";
import { type ZodSchema } from "zod";

import { Errors } from "../lib/errors";

type ValidationSource = "body" | "params" | "query";

const validate =
  <T>(schema: ZodSchema<T>, source: ValidationSource = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      throw Errors.VALIDATION_FAILED(result.error.flatten());
    }

    (req as Request & Record<ValidationSource, unknown>)[source] = result.data;
    next();
  };

export { validate };
export type { ValidationSource };
