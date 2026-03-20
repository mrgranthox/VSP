export type AdminRoleKey = "SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "SUPPORT";

export interface DecodedAccessToken {
  sub: string;
  roles: AdminRoleKey[];
  status: string;
  mfa_verified: boolean;
  jti: string;
  exp: number;
  iat: number;
  iss?: string;
  aud?: string;
}

export interface StoredSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  decoded: DecodedAccessToken;
}

export interface AuthLoginResponse {
  tokenPair: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
  userId: string;
}

export interface AuthRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthMeResponse {
  user: {
    id: string;
    email?: string | null;
    phone?: string | null;
    status: string;
    lastLoginAt?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  roles: AdminRoleKey[];
}
