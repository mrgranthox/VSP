import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/service_request_model.dart';

class RequestsRepository {
  final ApiClient _apiClient;

  RequestsRepository({required this._apiClient});

  Future<ServiceRequest> createRequest({
    required String tradeCategoryId,
    required String title,
    required String description,
    required String urgency,
    required String locationAddress,
    double? lat,
    double? lng,
    int? budgetMinor,
    List<String> mediaUrls = const [],
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.serviceRequests,
      body: {
        'tradeCategoryId': tradeCategoryId,
        'title': title,
        'description': description,
        'urgency': urgency,
        'locationAddress': locationAddress,
        'lat': lat ?? 5.6037,
        'lng': lng ?? -0.1870,
        'budgetMinor': ?budgetMinor,
        'mediaUrls': mediaUrls,
      },
    );

    final data = response.data;
    if (data != null) {
      return ServiceRequest.fromJson(data);
    }
    throw Exception('Failed to create service request');
  }

  Future<List<ServiceRequest>> getRequests({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (status != null && status.isNotEmpty) {
      queryParams['status'] = status;
    }

    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.serviceRequests,
        queryParams: queryParams,
      );

      final list = response.data;
      if (list != null) {
        return list
            .map((e) => ServiceRequest.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return [];
  }

  Future<ServiceRequest> getRequestDetail(String id) async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiConstants.serviceRequestDetail(id),
    );

    final data = response.data;
    if (data != null) {
      return ServiceRequest.fromJson(data);
    }
    throw Exception('Request not found');
  }

  Future<void> cancelRequest(String id, String reason) async {
    await _apiClient.post(
      ApiConstants.serviceRequestCancel(id),
      body: {'reason': reason},
    );
  }

  Future<void> acceptAssignment(String reqId, String assignmentId) async {
    await _apiClient.post(
      ApiConstants.serviceRequestAccept(reqId, assignmentId),
    );
  }

  Future<void> declineAssignment(
    String reqId,
    String assignmentId,
    String reason,
  ) async {
    await _apiClient.post(
      ApiConstants.serviceRequestDecline(reqId, assignmentId),
      body: {'reason': reason},
    );
  }
}
