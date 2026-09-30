import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/service_request_model.dart';

class RequestsRepository {
  final ApiClient apiClient;

  RequestsRepository({required this.apiClient});

  static final List<ServiceRequest> fallbackRequests = [
    ServiceRequest(
      id: 'req-1',
      customerUserId: 'usr-1',
      tradeCategoryId: 'trade-elec',
      tradeName: 'Electrical Installation',
      title: 'Commercial 3-Phase Panel Upgrade',
      description:
          'Need certified master electrician to upgrade distribution board and balance phases for a commercial bakery in Osu.',
      urgency: 'HIGH',
      status: 'SUBMITTED',
      locationAddress: 'Osu, Accra',
      budgetMinor: 120000,
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
    ),
    ServiceRequest(
      id: 'req-2',
      customerUserId: 'usr-2',
      tradeCategoryId: 'trade-plumb',
      tradeName: 'Plumbing & Drainage',
      title: 'Emergency Main Pipe Leak Repair',
      description:
          'High-pressure water main pipe ruptured behind kitchen wall. Needs immediate isolation and line replacement.',
      urgency: 'EMERGENCY',
      status: 'SUBMITTED',
      locationAddress: 'East Legon, Accra',
      budgetMinor: 65000,
      createdAt: DateTime.now().subtract(const Duration(hours: 1)),
    ),
    ServiceRequest(
      id: 'req-3',
      customerUserId: 'usr-3',
      tradeCategoryId: 'trade-solar',
      tradeName: 'Solar & Renewable Energy',
      title: '10kVA Hybrid Inverter & Lithium Battery Installation',
      description:
          'Mounting and configuring 10kVA inverter with two 5.12kWh batteries, surge protectors, and changeover switch.',
      urgency: 'MEDIUM',
      status: 'SUBMITTED',
      locationAddress: 'Cantonments, Accra',
      budgetMinor: 250000,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

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
    final response = await apiClient.post<Map<String, dynamic>>(
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
      final response = await apiClient.get<List<dynamic>>(
        ApiConstants.serviceRequests,
        queryParams: queryParams,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => ServiceRequest.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return fallbackRequests;
  }

  Future<ServiceRequest> getRequestDetail(String id) async {
    try {
      final response = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.serviceRequestDetail(id),
      );

      final data = response.data;
      if (data != null) {
        return ServiceRequest.fromJson(data);
      }
    } catch (_) {}

    return fallbackRequests.firstWhere(
      (r) => r.id == id,
      orElse: () => fallbackRequests.first,
    );
  }

  Future<void> cancelRequest(String id, String reason) async {
    await apiClient.post(
      ApiConstants.serviceRequestCancel(id),
      body: {'reason': reason},
    );
  }

  Future<void> acceptAssignment(String reqId, String assignmentId) async {
    await apiClient.post(
      ApiConstants.serviceRequestAccept(reqId, assignmentId),
    );
  }

  Future<void> declineAssignment(
    String reqId,
    String assignmentId,
    String reason,
  ) async {
    await apiClient.post(
      ApiConstants.serviceRequestDecline(reqId, assignmentId),
      body: {'reason': reason},
    );
  }
}
