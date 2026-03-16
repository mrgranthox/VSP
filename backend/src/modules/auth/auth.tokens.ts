import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { AdminRoleKey, UserStatus } from "@prisma/client";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { Errors } from "../../lib/errors";

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  roles: AdminRoleKey[];
  status: UserStatus;
  mfa_verified: boolean;
  jti: string;
}

interface SessionTokenArtifacts {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

interface BuildSessionTokensInput {
  userId: string;
  roles: AdminRoleKey[];
  status: UserStatus;
  mfaVerified: boolean;
  sessionId?: string;
}

const parseTtl = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getJwtPrivateKey = (): string => {
  const encoded = process.env.JWT_PRIVATE_KEY_BASE64;

  if (!encoded) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }

  return Buffer.from(encoded, "base64").toString("utf8");
};

const getJwtPublicKey = (): string => {
  const encoded = process.env.JWT_PUBLIC_KEY_BASE64;

  if (!encoded) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }

  return Buffer.from(encoded, "base64").toString("utf8");
};

const getJwtPublicKeysForVerification = (): string[] => {
  const keys = [process.env.JWT_PUBLIC_KEY_BASE64, process.env.JWT_PUBLIC_KEY_BASE64_PREVIOUS]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((encoded) => Buffer.from(encoded, "base64").toString("utf8"));

  if (keys.length === 0) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }

  return [...new Set(keys)];
};

const getJwtIssuer = (): string => process.env.JWT_ISSUER ?? process.env.APP_NAME ?? "vsp-backend";

const getJwtAudience = (): string => process.env.JWT_AUDIENCE ?? "vsp-api";

const hashToken = (value: string): string => createHash("sha256").update(value).digest("hex");

const buildAccessToken = (input: BuildSessionTokensInput, sessionId: string, accessTokenTtlSeconds: number) => {
  const accessToken = jwt.sign(
    {
      sub: input.userId,
      roles: input.roles,
      status: input.status,
      mfa_verified: input.mfaVerified
    },
    getJwtPrivateKey(),
    {
      algorithm: "RS256",
      audience: getJwtAudience(),
      issuer: getJwtIssuer(),
      expiresIn: accessTokenTtlSeconds,
      jwtid: sessionId
    }
  );

  return {
    accessToken,
    accessTokenExpiresAt: new Date(Date.now() + accessTokenTtlSeconds * 1000)
  };
};

const issueAccessToken = (input: BuildSessionTokensInput, sessionId: string) => {
  const accessTokenTtlSeconds = parseTtl(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS, 900);
  return buildAccessToken(input, sessionId, accessTokenTtlSeconds);
};

const buildSessionTokens = (input: BuildSessionTokensInput): SessionTokenArtifacts => {
  const accessTokenTtlSeconds = parseTtl(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS, 900);
  const refreshTokenTtlSeconds = parseTtl(process.env.JWT_REFRESH_TOKEN_TTL_SECONDS, 2_592_000);
  const sessionId = input.sessionId ?? randomUUID();
  const refreshToken = randomBytes(48).toString("hex");
  const refreshTokenHash = hashToken(refreshToken);
  const { accessToken, accessTokenExpiresAt } = buildAccessToken(input, sessionId, accessTokenTtlSeconds);

  return {
    sessionId,
    accessToken,
    refreshToken,
    refreshTokenHash,
    accessTokenExpiresAt,
    refreshTokenExpiresAt: new Date(Date.now() + refreshTokenTtlSeconds * 1000)
  };
};

const verifyAccessToken = (token: string): AccessTokenPayload => {
  for (const publicKey of getJwtPublicKeysForVerification()) {
    try {
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
        audience: getJwtAudience(),
        issuer: getJwtIssuer()
      });

      if (
        typeof decoded === "string" ||
        typeof decoded.sub !== "string" ||
        typeof decoded.jti !== "string" ||
        !Array.isArray(decoded.roles) ||
        typeof decoded.mfa_verified !== "boolean"
      ) {
        throw Errors.AUTH_SESSION_EXPIRED();
      }

      return decoded as AccessTokenPayload;
    } catch {
      continue;
    }
  }

  throw Errors.AUTH_SESSION_EXPIRED();
};

export { buildSessionTokens, hashToken, issueAccessToken, verifyAccessToken };
export type { AccessTokenPayload, BuildSessionTokensInput, SessionTokenArtifacts };
