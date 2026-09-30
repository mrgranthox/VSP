import 'package:flutter/material.dart';
import '../../data/models/service_request_model.dart';
import '../../data/repositories/requests_repository.dart';

class ServiceRequestProvider extends ChangeNotifier {
  final RequestsRepository requestsRepo;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<ServiceRequest> _requests = [];
  List<ServiceRequest> get requests => _requests;
  List<ServiceRequest> get myRequests => _requests;

  ServiceRequestProvider({required this.requestsRepo}) {
    loadRequests();
  }

  Future<void> loadRequests() async {
    _isLoading = true;
    notifyListeners();

    try {
      _requests = await requestsRepo.getRequests();
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> createRequest({
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
    try {
      final req = await requestsRepo.createRequest(
        tradeCategoryId: tradeCategoryId,
        title: title,
        description: description,
        urgency: urgency,
        locationAddress: locationAddress,
        lat: lat,
        lng: lng,
        budgetMinor: budgetMinor,
        mediaUrls: mediaUrls,
      );
      _requests.insert(0, req);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> acceptAssignment(String reqId, String assignmentId) async {
    try {
      await requestsRepo.acceptAssignment(reqId, assignmentId);
      await loadRequests();
    } catch (_) {}
  }

  Future<void> declineAssignment(String reqId, String assignmentId, String reason) async {
    try {
      await requestsRepo.declineAssignment(reqId, assignmentId, reason);
      await loadRequests();
    } catch (_) {}
  }
}
