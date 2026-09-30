class ApiResponse<T> {
  final bool success;
  final T? data;
  final PaginationMeta? pagination;
  final ApiError? error;
  final Map<String, dynamic>? meta;

  ApiResponse({
    required this.success,
    this.data,
    this.pagination,
    this.error,
    this.meta,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic data)? fromJsonT,
  ) {
    return ApiResponse(
      success: json['success'] as bool? ?? false,
      data: json['data'] != null && fromJsonT != null
          ? fromJsonT(json['data'])
          : json['data'] as T?,
      pagination: json['pagination'] != null
          ? PaginationMeta.fromJson(json['pagination'] as Map<String, dynamic>)
          : null,
      error: json['error'] != null
          ? ApiError.fromJson(json['error'] as Map<String, dynamic>)
          : null,
      meta: json['meta'] as Map<String, dynamic>?,
    );
  }
}

class PaginationMeta {
  final int page;
  final int limit;
  final int total;
  final bool hasNext;

  PaginationMeta({
    required this.page,
    required this.limit,
    required this.total,
    required this.hasNext,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic> json) {
    return PaginationMeta(
      page: json['page'] as int? ?? 1,
      limit: json['limit'] as int? ?? 20,
      total: json['total'] as int? ?? 0,
      hasNext: json['hasNext'] as bool? ?? false,
    );
  }
}

class ApiError {
  final String code;
  final String message;
  final dynamic details;

  ApiError({
    required this.code,
    required this.message,
    this.details,
  });

  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      code: json['code'] as String? ?? 'INTERNAL_ERROR',
      message: json['message'] as String? ?? 'An unexpected error occurred',
      details: json['details'],
    );
  }
}

class ApiException implements Exception {
  final String message;
  final String code;
  final int? statusCode;
  final dynamic details;

  ApiException({
    required this.message,
    required this.code,
    this.statusCode,
    this.details,
  });

  @override
  String toString() => 'ApiException: [$code] $message';
}
