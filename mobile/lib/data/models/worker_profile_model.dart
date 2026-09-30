import 'trade_category_model.dart';
import 'user_model.dart';

class WorkerProfile {
  final String id;
  final String userId;
  final String? headline;
  final String? bio;
  final int experienceYears;
  final double avgRating;
  final int totalReviews;
  final int jobsCompleted;
  final int hourlyRateMinor;
  final bool isVerified;
  final bool isFeatured;
  final UserProfile? userProfile;
  final List<TradeCategory> tradeCategories;
  final List<WorkerService> services;
  final List<WorkerServiceArea> serviceAreas;
  final List<WorkerPortfolioItem> portfolioItems;
  final List<WorkerCertification> certifications;

  WorkerProfile({
    required this.id,
    required this.userId,
    this.headline,
    this.bio,
    this.experienceYears = 0,
    this.avgRating = 5.0,
    this.totalReviews = 0,
    this.jobsCompleted = 0,
    this.hourlyRateMinor = 0,
    this.isVerified = false,
    this.isFeatured = false,
    this.userProfile,
    this.tradeCategories = const [],
    this.services = const [],
    this.serviceAreas = const [],
    this.portfolioItems = const [],
    this.certifications = const [],
  });

  String get displayName => userProfile?.fullName ?? headline ?? 'Skilled Tradesperson';
  String get primaryTrade => tradeCategories.isNotEmpty ? tradeCategories.first.name : 'General Trades';
  String get primaryTradeIcon => tradeCategories.isNotEmpty ? tradeCategories.first.icon : '';
  double get hourlyRate => hourlyRateMinor / 100.0;
  double get ratingAvg => avgRating;
  int get reviewCount => totalReviews;

  factory WorkerProfile.fromJson(Map<String, dynamic> json) {
    return WorkerProfile(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      headline: json['headline'] as String?,
      bio: json['bio'] as String?,
      experienceYears: json['experienceYears'] as int? ?? 0,
      avgRating: (json['avgRating'] as num?)?.toDouble() ?? 5.0,
      totalReviews: json['totalReviews'] as int? ?? 0,
      jobsCompleted: json['jobsCompleted'] as int? ?? 0,
      hourlyRateMinor: json['hourlyRateMinor'] as int? ?? 0,
      isVerified: json['isVerified'] as bool? ?? false,
      isFeatured: json['isFeatured'] as bool? ?? false,
      userProfile: json['userProfile'] != null
          ? UserProfile.fromJson(json['userProfile'] as Map<String, dynamic>)
          : (json['user'] != null && json['user']['profile'] != null
              ? UserProfile.fromJson(json['user']['profile'] as Map<String, dynamic>)
              : null),
      tradeCategories: (json['tradeCategories'] as List<dynamic>?)
              ?.map((e) => TradeCategory.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      services: (json['services'] as List<dynamic>?)
              ?.map((e) => WorkerService.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      serviceAreas: (json['serviceAreas'] as List<dynamic>?)
              ?.map((e) => WorkerServiceArea.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      portfolioItems: (json['portfolioItems'] as List<dynamic>?)
              ?.map((e) => WorkerPortfolioItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      certifications: (json['certifications'] as List<dynamic>?)
              ?.map((e) => WorkerCertification.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class WorkerService {
  final String id;
  final String title;
  final String? description;
  final int priceMinor;
  final String pricingType; // 'HOURLY' | 'FIXED'
  final int? estimatedMinutes;

  WorkerService({
    required this.id,
    required this.title,
    this.description,
    required this.priceMinor,
    this.pricingType = 'FIXED',
    this.estimatedMinutes,
  });

  double get price => priceMinor / 100.0;

  factory WorkerService.fromJson(Map<String, dynamic> json) {
    return WorkerService(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      priceMinor: json['priceMinor'] as int? ?? 0,
      pricingType: json['pricingType'] as String? ?? 'FIXED',
      estimatedMinutes: json['estimatedMinutes'] as int?,
    );
  }
}

class WorkerServiceArea {
  final String id;
  final String cityName;
  final double radiusKm;
  final double? lat;
  final double? lng;

  WorkerServiceArea({
    required this.id,
    required this.cityName,
    required this.radiusKm,
    this.lat,
    this.lng,
  });

  factory WorkerServiceArea.fromJson(Map<String, dynamic> json) {
    return WorkerServiceArea(
      id: json['id'] as String? ?? '',
      cityName: json['cityName'] as String? ?? json['city']?['name'] as String? ?? 'Service Area',
      radiusKm: (json['radiusKm'] as num?)?.toDouble() ?? 25.0,
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
    );
  }
}

class WorkerPortfolioItem {
  final String id;
  final String title;
  final String imageUrl;
  final String? description;

  WorkerPortfolioItem({
    required this.id,
    required this.title,
    required this.imageUrl,
    this.description,
  });

  factory WorkerPortfolioItem.fromJson(Map<String, dynamic> json) {
    return WorkerPortfolioItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      imageUrl: json['imageUrl'] as String? ?? '',
      description: json['description'] as String?,
    );
  }
}

class WorkerCertification {
  final String id;
  final String title;
  final String issuer;
  final String? verificationStatus;

  WorkerCertification({
    required this.id,
    required this.title,
    required this.issuer,
    this.verificationStatus,
  });

  factory WorkerCertification.fromJson(Map<String, dynamic> json) {
    return WorkerCertification(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      issuer: json['issuer'] as String? ?? '',
      verificationStatus: json['verificationStatus'] as String?,
    );
  }
}
