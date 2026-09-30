import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../storage/storage_service.dart';
import 'api_response.dart';

class ApiClient {
  final StorageService _storage;
  final http.Client _httpClient;
  String? _customBaseUrl;

  ApiClient({
    required this._storage,
    http.Client? httpClient,
  })  : _httpClient = httpClient ?? http.Client();

  String get baseUrl =>
      _customBaseUrl ?? _storage.getBaseUrlOverride() ?? ApiConstants.defaultBaseUrl;

  void setBaseUrl(String url) {
    _customBaseUrl = url;
    _storage.setBaseUrlOverride(url);
  }

  Map<String, String> _buildHeaders({bool requiresAuth = true}) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (requiresAuth) {
      final token = _storage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '$baseUrl$normalizedPath';

    if (queryParams == null || queryParams.isEmpty) {
      return Uri.parse(fullUrl);
    }

    final sanitizedParams = <String, String>{};
    queryParams.forEach((key, value) {
      if (value != null) {
        sanitizedParams[key] = value.toString();
      }
    });

    return Uri.parse(fullUrl).replace(queryParameters: sanitizedParams);
  }

  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParams,
    bool requiresAuth = true,
    T Function(dynamic data)? fromJson,
  }) async {
    return _sendRequest<T>(
      method: 'GET',
      path: path,
      queryParams: queryParams,
      requiresAuth: requiresAuth,
      fromJson: fromJson,
    );
  }

  Future<ApiResponse<T>> post<T>(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParams,
    bool requiresAuth = true,
    T Function(dynamic data)? fromJson,
  }) async {
    return _sendRequest<T>(
      method: 'POST',
      path: path,
      body: body,
      queryParams: queryParams,
      requiresAuth: requiresAuth,
      fromJson: fromJson,
    );
  }

  Future<ApiResponse<T>> patch<T>(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParams,
    bool requiresAuth = true,
    T Function(dynamic data)? fromJson,
  }) async {
    return _sendRequest<T>(
      method: 'PATCH',
      path: path,
      body: body,
      queryParams: queryParams,
      requiresAuth: requiresAuth,
      fromJson: fromJson,
    );
  }

  Future<ApiResponse<T>> delete<T>(
    String path, {
    Map<String, dynamic>? queryParams,
    bool requiresAuth = true,
    T Function(dynamic data)? fromJson,
  }) async {
    return _sendRequest<T>(
      method: 'DELETE',
      path: path,
      queryParams: queryParams,
      requiresAuth: requiresAuth,
      fromJson: fromJson,
    );
  }

  Future<ApiResponse<T>> _sendRequest<T>({
    required String method,
    required String path,
    dynamic body,
    Map<String, dynamic>? queryParams,
    required bool requiresAuth,
    T Function(dynamic data)? fromJson,
    bool isRetry = false,
  }) async {
    final uri = _buildUri(path, queryParams);
    final headers = _buildHeaders(requiresAuth: requiresAuth);

    http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await _httpClient.get(uri, headers: headers);
          break;
        case 'POST':
          response = await _httpClient.post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          );
          break;
        case 'PATCH':
          response = await _httpClient.patch(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          );
          break;
        case 'DELETE':
          response = await _httpClient.delete(uri, headers: headers);
          break;
        default:
          throw UnsupportedError('HTTP method $method not supported');
      }
    } on SocketException catch (e) {
      throw ApiException(
        message: 'Unable to connect to server. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        details: e.message,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        message: 'Request failed: $e',
        code: 'CONNECTION_FAILED',
        details: e.toString(),
      );
    }

    // Handle 401 Unauthorized token refresh
    if (response.statusCode == 401 && requiresAuth && !isRetry) {
      final refreshed = await _attemptTokenRefresh();
      if (refreshed) {
        return _sendRequest<T>(
          method: method,
          path: path,
          body: body,
          queryParams: queryParams,
          requiresAuth: requiresAuth,
          fromJson: fromJson,
          isRetry: true,
        );
      }
    }

    return _parseResponse<T>(response, fromJson);
  }

  Future<bool> _attemptTokenRefresh() async {
    final refreshToken = _storage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      final uri = _buildUri(ApiConstants.authRefresh);
      final res = await _httpClient.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        final data = json['data'] as Map<String, dynamic>?;
        if (data != null && data['accessToken'] != null) {
          await _storage.setAccessToken(data['accessToken'] as String);
          if (data['refreshToken'] != null) {
            await _storage.setRefreshToken(data['refreshToken'] as String);
          }
          return true;
        }
      }
    } catch (e) {
      debugPrint('Failed to refresh auth token: $e');
    }

    await _storage.clearTokens();
    return false;
  }

  ApiResponse<T> _parseResponse<T>(
    http.Response response,
    T Function(dynamic data)? fromJson,
  ) {
    Map<String, dynamic> json;
    try {
      json = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return ApiResponse<T>(success: true);
      }
      throw ApiException(
        message: 'Server error: ${response.statusCode}',
        code: 'SERVER_ERROR',
        statusCode: response.statusCode,
      );
    }

    final isSuccess = json['success'] as bool? ?? (response.statusCode >= 200 && response.statusCode < 300);

    if (!isSuccess) {
      final err = json['error'] != null
          ? ApiError.fromJson(json['error'] as Map<String, dynamic>)
          : ApiError(
              code: 'HTTP_${response.statusCode}',
              message: json['message'] as String? ?? 'Request failed',
            );
      throw ApiException(
        message: err.message,
        code: err.code,
        statusCode: response.statusCode,
        details: err.details,
      );
    }

    return ApiResponse.fromJson(json, fromJson);
  }
}
