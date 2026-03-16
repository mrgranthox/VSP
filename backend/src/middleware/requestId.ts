import { type NextFunction, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";

const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const existingRequestId = req.headers["x-request-id"];
  const requestIdValue = typeof existingRequestId === "string" ? existingRequestId : uuidv4();

  req.headers["x-request-id"] = requestIdValue;
  res.setHeader("X-Request-ID", requestIdValue);
  next();
};

export { requestId };
