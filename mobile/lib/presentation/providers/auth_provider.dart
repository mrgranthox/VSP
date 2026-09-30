import 'package:flutter/material.dart';
import '../../core/storage/storage_service.dart';
import '../../data/models/user_model.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/users_repository.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthProvider extends ChangeNotifier {
  final AuthRepository _authRepository;
  final StorageService _storage;

  AuthStatus _status = AuthStatus.initial;
  AuthStatus get status => _status;

  User? _currentUser;
  User? get currentUser => _currentUser;

  String _userMode = 'customer'; // 'customer' | 'worker'
  String get userMode => _userMode;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  AuthProvider({
    required this._authRepository,
    required this._storage,
  }) {
    _init();
  }

  Future<void> _init() async {
    _userMode = _storage.getUserMode();
    final token = _storage.getAccessToken();

    if (token != null && token.isNotEmpty) {
      _status = AuthStatus.loading;
      notifyListeners();
      try {
        _currentUser = await _authRepository.getMe();
        _status = AuthStatus.authenticated;
      } catch (_) {
        // Cached user fallback or unauthenticated
        final cached = _storage.getUser();
        if (cached != null) {
          _currentUser = User.fromJson(cached);
          _status = AuthStatus.authenticated;
        } else {
          _status = AuthStatus.unauthenticated;
        }
      }
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login({
    String? email,
    String? phone,
    required String password,
  }) async {
    _status = AuthStatus.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      _currentUser = await _authRepository.login(
        email: email,
        phone: phone,
        password: password,
      );
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _status = AuthStatus.unauthenticated;
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String firstName,
    required String lastName,
    String? email,
    String? phone,
    required String password,
  }) async {
    _status = AuthStatus.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      await _authRepository.register(
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        password: password,
      );
      // Automatically attempt login upon successful registration
      return await login(
        email: email,
        phone: phone,
        password: password,
      );
    } catch (e) {
      _status = AuthStatus.unauthenticated;
      _errorMessage = e.toString().replaceFirst('ApiException: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _status = AuthStatus.loading;
    notifyListeners();
    await _authRepository.logout();
    _currentUser = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<void> toggleUserMode() async {
    _userMode = _userMode == 'customer' ? 'worker' : 'customer';
    await _storage.setUserMode(_userMode);
    notifyListeners();
  }

  Future<bool> updateUserProfile({
    required UsersRepository usersRepo,
    String? firstName,
    String? lastName,
    String? displayName,
    String? bio,
    String? avatarUrl,
  }) async {
    try {
      final updated = await usersRepo.updateProfile(
        firstName: firstName,
        lastName: lastName,
        displayName: displayName,
        bio: bio,
        avatarUrl: avatarUrl,
      );
      if (_currentUser != null) {
        _currentUser = _currentUser!.copyWith(profile: updated);
        notifyListeners();
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  void setUserMode(String mode) {
    if (_userMode != mode) {
      _userMode = mode;
      _storage.setUserMode(mode);
      notifyListeners();
    }
  }
}
