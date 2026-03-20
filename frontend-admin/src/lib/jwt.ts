import type { DecodedAccessToken } from "@/types/auth";

const parseJwt = (token: string): DecodedAccessToken => {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Invalid JWT payload");
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const decoded = JSON.parse(window.atob(`${normalized}${padding}`)) as DecodedAccessToken;

  return decoded;
};

export { parseJwt };
