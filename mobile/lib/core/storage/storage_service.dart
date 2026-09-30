import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static const String _keyAccessToken = 'vsp_access_token';
  static const String _keyRefreshToken = 'vsp_refresh_token';
  static const String _keyUser = 'vsp_user';
  static const String _keyUserMode = 'vsp_user_mode'; // 'customer' | 'worker'
  static const String _keyOnboardingDone = 'vsp_onboarding_done';
  static const String _keyBaseUrl = 'vsp_base_url';

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  // Tokens
  String? getAccessToken() => _prefs.getString(_keyAccessToken);
  Future<bool> setAccessToken(String token) =>
      _prefs.setString(_keyAccessToken, token);

  String? getRefreshToken() => _prefs.getString(_keyRefreshToken);
  Future<bool> setRefreshToken(String token) =>
      _prefs.setString(_keyRefreshToken, token);

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await setAccessToken(accessToken);
    await setRefreshToken(refreshToken);
  }

  Future<void> clearTokens() async {
    await _prefs.remove(_keyAccessToken);
    await _prefs.remove(_keyRefreshToken);
    await _prefs.remove(_keyUser);
  }

  // User
  Map<String, dynamic>? getUser() {
    final raw = _prefs.getString(_keyUser);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<bool> setUser(Map<String, dynamic> user) =>
      _prefs.setString(_keyUser, jsonEncode(user));

  // Role Mode
  String getUserMode() => _prefs.getString(_keyUserMode) ?? 'customer';
  Future<bool> setUserMode(String mode) => _prefs.setString(_keyUserMode, mode);

  // Onboarding
  bool isOnboardingCompleted() => _prefs.getBool(_keyOnboardingDone) ?? false;
  Future<bool> setOnboardingCompleted(bool completed) =>
      _prefs.setBool(_keyOnboardingDone, completed);

  // Custom API host override
  String? getBaseUrlOverride() => _prefs.getString(_keyBaseUrl);
  Future<bool> setBaseUrlOverride(String url) =>
      _prefs.setString(_keyBaseUrl, url);
}
