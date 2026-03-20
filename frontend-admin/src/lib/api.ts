import type { ApiErrorEnvelope, ApiPaginatedEnvelope, ApiSuccessEnvelope } from "@/types/api";
import type { AuthRefreshResponse } from "@/types/auth";
import { clearStoredSession, getStoredSession, setStoredSession } from "@/lib/auth-storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const getApiErrorMessage = (error: unknown, fallback = "Request failed") => {
  if (error instanceof ApiClientError) {
    return error.code.replaceAll("_", " ");
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const isMfaRequiredError = (error: unknown) => error instanceof ApiClientError && error.code === "MFA_REQUIRED";

let refreshPromise: Promise<void> | null = null;

const readJson = async (response: Response) => {
  const text = await response.text();
  return text ? (JSON.parse(text) as ApiSuccessEnvelope<unknown> | ApiPaginatedEnvelope<unknown> | ApiErrorEnvelope) : null;
};

const refreshAccessToken = async () => {
  const session = getStoredSession();
  if (!session?.refreshToken) {
    clearStoredSession();
    throw new ApiClientError(401, "AUTH_SESSION_EXPIRED", "No refresh token available");
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      refreshToken: session.refreshToken
    })
  });

  const body = (await readJson(response)) as ApiSuccessEnvelope<AuthRefreshResponse> | ApiErrorEnvelope | null;

  if (!response.ok || !body || !body.success) {
    clearStoredSession();
    throw new ApiClientError(response.status, body && !body.success ? body.error.code : "AUTH_SESSION_EXPIRED", "Session expired");
  }

  setStoredSession({
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    expiresAt: body.data.expiresAt
  });
};

const ensureFreshToken = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  body?: unknown;
  retryOnAuthFailure?: boolean;
}

const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const { auth = true, body, retryOnAuthFailure = true, headers, ...rest } = options;
  const session = getStoredSession();
  const finalHeaders = new Headers(headers ?? {});

  if (body !== undefined && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (auth && session?.accessToken) {
    finalHeaders.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const parsed = await readJson(response);

  if (response.status === 401 && auth && retryOnAuthFailure && session?.refreshToken && path !== "/auth/refresh") {
    await ensureFreshToken();
    return apiRequest<T>(path, { ...options, retryOnAuthFailure: false });
  }

  if (!response.ok || !parsed || !("success" in parsed) || !parsed.success) {
    const errorBody = parsed && "success" in parsed && !parsed.success ? parsed : null;
    throw new ApiClientError(
      response.status,
      errorBody?.error.code ?? "REQUEST_FAILED",
      errorBody?.error.message ?? response.statusText,
      errorBody?.error.details
    );
  }

  return parsed.data as T;
};

const apiPaginatedRequest = async <T>(path: string, options: ApiRequestOptions = {}) => {
  const { auth = true, body, retryOnAuthFailure = true, headers, ...rest } = options;
  const session = getStoredSession();
  const finalHeaders = new Headers(headers ?? {});

  if (body !== undefined && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (auth && session?.accessToken) {
    finalHeaders.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const parsed = await readJson(response);

  if (response.status === 401 && auth && retryOnAuthFailure && session?.refreshToken && path !== "/auth/refresh") {
    await ensureFreshToken();
    return apiPaginatedRequest<T>(path, { ...options, retryOnAuthFailure: false });
  }

  if (!response.ok || !parsed || !("success" in parsed) || !parsed.success || !("pagination" in parsed)) {
    const errorBody = parsed && "success" in parsed && !parsed.success ? parsed : null;
    throw new ApiClientError(
      response.status,
      errorBody?.error.code ?? "REQUEST_FAILED",
      errorBody?.error.message ?? response.statusText,
      errorBody?.error.details
    );
  }

  return parsed as ApiPaginatedEnvelope<T>;
};

export { API_BASE_URL, ApiClientError, apiPaginatedRequest, apiRequest, getApiErrorMessage, isMfaRequiredError };
