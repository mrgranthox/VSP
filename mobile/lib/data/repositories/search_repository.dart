import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/worker_profile_model.dart';
import 'discovery_repository.dart';

class SearchRepository {
  final ApiClient _apiClient;

  SearchRepository({required this._apiClient});

  Future<List<WorkerProfile>> searchWorkers({
    String? tradeCategoryId,
    String? query,
    double? lat,
    double? lng,
    double? radiusKm,
    double? minRating,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (tradeCategoryId != null && tradeCategoryId.isNotEmpty) {
      queryParams['tradeCategoryId'] = tradeCategoryId;
    }
    if (query != null && query.isNotEmpty) {
      queryParams['q'] = query;
    }
    if (lat != null && lng != null) {
      queryParams['lat'] = lat;
      queryParams['lng'] = lng;
      queryParams['radiusKm'] = radiusKm ?? 25.0;
    }
    if (minRating != null) {
      queryParams['minRating'] = minRating;
    }

    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.searchWorkers,
        queryParams: queryParams,
        requiresAuth: false,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => WorkerProfile.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {
      // Fallback filter
    }

    return DiscoveryRepository.fallbackFeaturedWorkers;
  }

  Future<List<WorkerProfile>> getNearbyWorkersMap({
    double lat = 5.6037,
    double lng = -0.1870,
    double radiusKm = 25.0,
  }) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.searchWorkersMap,
        queryParams: {'lat': lat, 'lng': lng, 'radiusKm': radiusKm},
        requiresAuth: false,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => WorkerProfile.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {
      // Fallback
    }

    return DiscoveryRepository.fallbackFeaturedWorkers;
  }
}
