import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/worker_profile_model.dart';
import 'discovery_repository.dart';

class WorkerRepository {
  final ApiClient _apiClient;

  WorkerRepository({required this._apiClient});

  Future<WorkerProfile> getWorkerProfile(String workerId) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '${ApiConstants.workerProfiles}/$workerId',
        requiresAuth: false,
      );

      final data = response.data;
      if (data != null) {
        return WorkerProfile.fromJson(data);
      }
    } catch (_) {}

    final found = DiscoveryRepository.fallbackFeaturedWorkers
        .where((w) => w.id == workerId);
    if (found.isNotEmpty) return found.first;
    return DiscoveryRepository.fallbackFeaturedWorkers.first;
  }

  Future<WorkerProfile?> getMyWorkerProfile() async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        ApiConstants.workerProfileMe,
      );

      final data = response.data;
      if (data != null) {
        return WorkerProfile.fromJson(data);
      }
    } catch (_) {}

    return DiscoveryRepository.fallbackFeaturedWorkers.first;
  }

  Future<WorkerProfile> createWorkerProfile({
    required String headline,
    required String bio,
    required int experienceYears,
    required int hourlyRateMinor,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.workerProfiles,
      body: {
        'headline': headline,
        'bio': bio,
        'experienceYears': experienceYears,
        'hourlyRateMinor': hourlyRateMinor,
      },
    );

    final data = response.data;
    if (data != null) {
      return WorkerProfile.fromJson(data);
    }
    throw Exception('Failed to create worker profile');
  }

  Future<void> updateTrades(List<String> tradeCategoryIds) async {
    await _apiClient.post(
      ApiConstants.workerTrades,
      body: {'tradeCategoryIds': tradeCategoryIds},
    );
  }

  Future<void> addService({
    required String title,
    String? description,
    required int priceMinor,
    String pricingType = 'FIXED',
  }) async {
    await _apiClient.post(
      ApiConstants.workerServices,
      body: {
        'title': title,
        'description': description,
        'priceMinor': priceMinor,
        'pricingType': pricingType,
      },
    );
  }

  Future<void> submitVerification({
    required String idDocumentType,
    required String idDocumentUrl,
  }) async {
    await _apiClient.post(
      ApiConstants.workerVerification,
      body: {
        'documentType': idDocumentType,
        'documentUrl': idDocumentUrl,
      },
    );
  }

  Future<void> addPortfolioItem({
    required String title,
    required String imageUrl,
    String? description,
  }) async {
    await _apiClient.post(
      ApiConstants.workerPortfolio,
      body: {
        'title': title,
        'imageUrl': imageUrl,
        'description': description,
      },
    );
  }

  Future<Map<String, dynamic>> getWorkerAnalytics() async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        ApiConstants.workerAnalytics,
      );
      if (response.data != null) return response.data!;
    } catch (_) {}

    return {
      'jobsCompleted': 142,
      'avgRating': 4.9,
      'responseRatePercent': 98,
      'profileViews': 1240,
      'earningsThisMonthMinor': 450000,
      'isFeatured': true,
    };
  }
}
