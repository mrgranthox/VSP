import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/user_model.dart';
import '../models/worker_profile_model.dart';
import 'discovery_repository.dart';

class UsersRepository {
  final ApiClient _apiClient;

  UsersRepository({required this._apiClient});

  Future<List<WorkerProfile>> getSavedWorkers({int page = 1, int limit = 20}) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.usersSavedWorkers,
        queryParams: {'page': page, 'limit': limit},
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => WorkerProfile.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return DiscoveryRepository.fallbackFeaturedWorkers.take(2).toList();
  }

  Future<void> saveWorker(String workerProfileId) async {
    await _apiClient.post(
      '${ApiConstants.usersSavedWorkers}/$workerProfileId',
    );
  }

  Future<void> unsaveWorker(String workerProfileId) async {
    await _apiClient.delete(
      '${ApiConstants.usersSavedWorkers}/$workerProfileId',
    );
  }

  Future<UserProfile> updateProfile({
    String? firstName,
    String? lastName,
    String? displayName,
    String? bio,
    String? avatarUrl,
  }) async {
    final response = await _apiClient.patch<Map<String, dynamic>>(
      ApiConstants.usersMe,
      body: {
        'firstName': ?firstName,
        'lastName': ?lastName,
        'displayName': ?displayName,
        'bio': ?bio,
        'avatarUrl': ?avatarUrl,
      },
    );

    final data = response.data;
    if (data != null) {
      return UserProfile.fromJson(data);
    }
    throw Exception('Failed to update profile');
  }
}
