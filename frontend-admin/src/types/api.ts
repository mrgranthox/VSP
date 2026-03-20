export interface ApiMeta {
  requestId?: string;
  timestamp: string;
  traceId?: string;
  unreadCount?: number;
}

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiPaginatedEnvelope<T> {
  success: true;
  data: T[];
  pagination: ApiPagination;
  meta: ApiMeta;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
