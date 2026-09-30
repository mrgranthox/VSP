import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/storage_service.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient _apiClient;
  final StorageService _storage;

  AuthRepository({
    required this._apiClient,
    required this._storage,
  });

  Future<User> login({
    String? email,
    String? phone,
    required String password,
  }) async {
    final payload = <String, dynamic>{
      'password': password,
    };
    if (email != null && email.isNotEmpty) payload['email'] = email;
    if (phone != null && phone.isNotEmpty) payload['phone'] = phone;

    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.authLogin,
      body: payload,
      requiresAuth: false,
    );

    final data = response.data;
    if (data != null) {
      final tokenPair = data['tokenPair'] as Map<String, dynamic>?;
      if (tokenPair != null) {
        final accessToken = tokenPair['accessToken'] as String? ?? '';
        final refreshToken = tokenPair['refreshToken'] as String? ?? '';
        await _storage.saveTokens(
          accessToken: accessToken,
          refreshToken: refreshToken,
        );
      }

      // Fetch user profile
      return getMe();
    }

    throw Exception('Login failed: empty response');
  }

  Future<void> register({
    required String firstName,
    required String lastName,
    String? email,
    String? phone,
    required String password,
  }) async {
    final payload = <String, dynamic>{
      'firstName': firstName,
      'lastName': lastName,
      'password': password,
    };
    if (email != null && email.isNotEmpty) payload['email'] = email;
    if (phone != null && phone.isNotEmpty) payload['phone'] = phone;

    await _apiClient.post(
      ApiConstants.authRegister,
      body: payload,
      requiresAuth: false,
    );
  }

  Future<User> getMe() async {
    final response = await _apiClient.get<Map<String, dynamic>>(
      ApiConstants.authMe,
    );

    final data = response.data;
    if (data == null) throw Exception('Failed to fetch user');

    final user = User.fromJson(data);
    await _storage.setUser(user.toJson());
    return user;
  }

  Future<void> logout() async {
    try {
      await _apiClient.post(ApiConstants.authLogout);
    } catch (_) {
      // Best-effort logout
    } finally {
      await _storage.clearTokens();
    }
  }

  Future<void> requestPasswordReset(String emailOrPhone) async {
    final isEmail = emailOrPhone.contains('@');
    final payload = isEmail
        ? {'email': emailOrPhone}
        : {'phone': emailOrPhone};

    await _apiClient.post(
      ApiConstants.authPasswordResetRequest,
      body: payload,
      requiresAuth: false,
    );
  }

  Future<void> resetPassword({
    required String code,
    required String newPassword,
  }) async {
    await _apiClient.post(
      ApiConstants.authPasswordReset,
      body: {
        'token': code,
        'newPassword': newPassword,
      },
      requiresAuth: false,
    );
  }
}
