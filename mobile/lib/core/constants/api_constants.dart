import 'package:flutter/foundation.dart';

class ApiConstants {
  ApiConstants._();

  // Environment hosts
  static String get defaultBaseUrl {
    if (kIsWeb) return 'http://localhost:3000/api/v1';
    // 127.0.0.1 routes through adb reverse on physical devices and emulators
    return 'http://127.0.0.1:3000/api/v1';
  }

  static String get defaultWsUrl {
    if (kIsWeb) return 'ws://localhost:3002/ws';
    return 'ws://127.0.0.1:3002/ws';
  }

  // Auth endpoints
  static const String authRegister = '/auth/register';
  static const String authLogin = '/auth/login';
  static const String authRefresh = '/auth/refresh';
  static const String authLogout = '/auth/logout';
  static const String authMe = '/auth/me';
  static const String authPasswordResetRequest = '/auth/request-password-reset';
  static const String authPasswordReset = '/auth/reset-password';
  static const String authMfaTotpSetup = '/auth/mfa/totp/setup';
  static const String authMfaTotpVerify = '/auth/mfa/totp/verify';
  static const String authMfaSmsRequest = '/auth/mfa/sms/request';
  static const String authMfaSmsVerify = '/auth/mfa/sms/verify';
  static const String authMfaChallenge = '/auth/mfa/challenge';

  // Users endpoints
  static const String usersMe = '/users/me';
  static const String usersSavedWorkers = '/users/me/saved-workers';
  static const String usersNotificationsPrefs = '/users/me/preferences/notifications';
  static const String usersFollows = '/users/me/follows';

  // Worker Profiles endpoints
  static const String workerProfiles = '/worker-profiles';
  static const String workerProfileMe = '/worker-profiles/me';
  static const String workerTrades = '/worker-profiles/me/trades';
  static const String workerServices = '/worker-profiles/me/services';
  static const String workerServiceAreas = '/worker-profiles/me/areas';
  static const String workerAvailability = '/worker-profiles/me/availability/rules';
  static const String workerCertifications = '/worker-profiles/me/certifications';
  static const String workerVerification = '/worker-profiles/me/verification';
  static const String workerPortfolio = '/worker-profiles/me/portfolio';
  static const String workerAnalytics = '/worker-profiles/me/analytics';

  // Search & Discovery
  static const String searchWorkers = '/search/workers';
  static const String searchWorkersMap = '/search/workers/map';
  static const String discoveryFeatured = '/discovery/featured-workers';
  static const String tradeCategories = '/trade-categories';
  static const String cities = '/cities';

  // Service Requests
  static const String serviceRequests = '/service-requests';
  static String serviceRequestDetail(String id) => '/service-requests/$id';
  static String serviceRequestCancel(String id) => '/service-requests/$id/cancel';
  static String serviceRequestAccept(String reqId, String assignmentId) =>
      '/service-requests/$reqId/assignments/$assignmentId/accept';
  static String serviceRequestDecline(String reqId, String assignmentId) =>
      '/service-requests/$reqId/assignments/$assignmentId/decline';

  // Bookings
  static const String bookings = '/bookings';
  static String bookingDetail(String id) => '/bookings/$id';
  static String bookingReschedule(String id) => '/bookings/$id/reschedule';
  static String bookingCancel(String id) => '/bookings/$id/cancel';
  static String bookingStart(String id) => '/bookings/$id/start';
  static String bookingComplete(String id) => '/bookings/$id/complete';

  // Reviews
  static const String reviews = '/reviews';
  static String workerReviews(String workerId) => '/workers/$workerId/reviews';

  // Chat
  static const String conversations = '/conversations';
  static String conversationMessages(String convId) => '/conversations/$convId/messages';

  // Social Feed
  static const String socialFeed = '/posts/feed';
  static const String createPost = '/posts';
  static String postDetail(String id) => '/posts/$id';
  static String postLikes(String id) => '/posts/$id/likes';
  static String postComments(String id) => '/posts/$id/comments';

  // Notifications
  static const String notifications = '/notifications';
  static const String notificationsReadAll = '/notifications/read-all';
  static String notificationRead(String id) => '/notifications/$id/read';

  // Media
  static const String mediaUploadUrl = '/media/upload-url';
  static const String mediaConfirm = '/media/confirm';
}
