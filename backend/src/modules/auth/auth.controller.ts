import { type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { AuthService } from "./auth.service";

class AuthController {
  constructor(private readonly authService: AuthService = new AuthService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.register(req.body);

    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const deviceType = req.get("x-device-type") ?? req.get("x-device") ?? undefined;
    const result = await this.authService.login(req.body, req.ip ?? "unknown", deviceType);

    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const body = (req.body ?? {}) as { sessionId?: string };
    const sessionId = body.sessionId ?? req.actor?.sessionId;

    if (!req.actor || !sessionId) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.authService.logout(req.actor, sessionId);

    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const tokenPair = await this.authService.refreshTokens(req.body.refreshToken);

    res.status(200).json(success(tokenPair, { requestId: this.getRequestId(req) }));
  };

  requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    await this.authService.requestPasswordReset(req.body);

    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    await this.authService.resetPassword(req.body.token, req.body.newPassword);

    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    await this.authService.verifyEmail(req.body.token);

    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  verifyPhone = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.authService.verifyPhone(req.actor, req.body.otp);

    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const me = await this.authService.getMe(req.actor);

    res.status(200).json(success(me, { requestId: this.getRequestId(req) }));
  };

  revokeSession = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.authService.revokeSession(req.actor, req.body.sessionId);

    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  setupMfa = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.authService.setupMFA(req.actor, req.body.method);

    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  verifyMfaSetup = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.authService.verifyMFASetup(req.actor, req.body);

    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  requestMfaChallenge = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.authService.requestMFAChallenge(req.actor, req.body.method);

    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  challengeMfa = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.authService.challengeMFA(req.actor, req.body);

    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  disableMfa = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.authService.disableMFA(req.actor, req.body);

    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  getMfaBackupCodes = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.authService.getMfaBackupCodes(req.actor);

    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };
}

const authController = new AuthController();

export { authController, AuthController };
