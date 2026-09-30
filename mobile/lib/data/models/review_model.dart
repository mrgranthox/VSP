class Review {
  final String id;
  final String bookingId;
  final String customerUserId;
  final String customerName;
  final String? customerAvatarUrl;
  final String workerProfileId;
  final double rating;
  final String comment;
  final DateTime createdAt;
  final List<ReviewDimensionScore> dimensions;

  Review({
    required this.id,
    required this.bookingId,
    required this.customerUserId,
    required this.customerName,
    this.customerAvatarUrl,
    required this.workerProfileId,
    required this.rating,
    required this.comment,
    required this.createdAt,
    this.dimensions = const [],
  });

  String get authorName => customerName;

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id'] as String? ?? '',
      bookingId: json['bookingId'] as String? ?? '',
      customerUserId: json['customerUserId'] as String? ?? '',
      customerName: json['customer']?['profile']?['fullName'] as String? ??
          json['customerName'] as String? ??
          'Client',
      customerAvatarUrl: json['customer']?['profile']?['avatarUrl'] as String?,
      workerProfileId: json['workerProfileId'] as String? ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 5.0,
      comment: json['comment'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      dimensions: (json['dimensions'] as List<dynamic>?)
              ?.map((e) => ReviewDimensionScore.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class ReviewDimensionScore {
  final String name; // 'punctuality' | 'quality' | 'communication' | 'value'
  final double rating;

  ReviewDimensionScore({required this.name, required this.rating});

  factory ReviewDimensionScore.fromJson(Map<String, dynamic> json) {
    return ReviewDimensionScore(
      name: json['dimensionKey'] as String? ?? json['name'] as String? ?? '',
      rating: (json['score'] as num?)?.toDouble() ??
          (json['rating'] as num?)?.toDouble() ??
          5.0,
    );
  }
}
