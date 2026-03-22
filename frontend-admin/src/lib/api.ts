import type { ApiErrorEnvelope, ApiPaginatedEnvelope, ApiSuccessEnvelope } from "@/types/api";
import type { AuthRefreshResponse } from "@/types/auth";
import { clearStoredSession, getStoredSession, setStoredSession } from "@/lib/auth-storage";
import { reportAdminError } from "@/lib/error-reporting";

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

const parseDownloadFilename = (contentDisposition: string | null, fallback: string): string => {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] ?? fallback;
};

const fetchWithTelemetry = async (path: string, init: RequestInit, context: { auth: boolean }) => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, init);

    if (response.status >= 500) {
      reportAdminError(new Error(`Admin API request failed with ${response.status}`), {
        source: "api.server",
        path,
        method: init.method ?? "GET",
        status: response.status,
        details: {
          auth: context.auth
        }
      });
    }

    return response;
  } catch (error) {
    reportAdminError(error, {
      source: "api.network",
      path,
      method: init.method ?? "GET",
      details: {
        auth: context.auth
      }
    });
    throw error;
  }
};

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

  const response = await fetchWithTelemetry(path, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  }, { auth });

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

  const response = await fetchWithTelemetry(path, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  }, { auth });

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

const apiDownload = async (path: string, fallbackFileName: string, options: ApiRequestOptions = {}): Promise<string> => {
  const { auth = true, retryOnAuthFailure = true, headers, body: _body, ...rest } = options;
  const session = getStoredSession();
  const finalHeaders = new Headers(headers ?? {});

  if (auth && session?.accessToken) {
    finalHeaders.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetchWithTelemetry(path, {
    ...rest,
    headers: finalHeaders
  }, { auth });

  if (response.status === 401 && auth && retryOnAuthFailure && session?.refreshToken && path !== "/auth/refresh") {
    await ensureFreshToken();
    return apiDownload(path, fallbackFileName, { ...options, retryOnAuthFailure: false });
  }

  if (!response.ok) {
    const parsed = await readJson(response);
    const errorBody = parsed && "success" in parsed && !parsed.success ? parsed : null;
    throw new ApiClientError(
      response.status,
      errorBody?.error.code ?? "REQUEST_FAILED",
      errorBody?.error.message ?? response.statusText,
      errorBody?.error.details
    );
  }

  const blob = await response.blob();
  const fileName = parseDownloadFilename(response.headers.get("content-disposition"), fallbackFileName);
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);

  return fileName;
};

export { API_BASE_URL, ApiClientError, apiDownload, apiPaginatedRequest, apiRequest, getApiErrorMessage, isMfaRequiredError };
