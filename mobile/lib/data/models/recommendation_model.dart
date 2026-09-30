class RecommendationItem {
  final String id;
  final String authorId;
  final String recipientId;
  final String? relationship;
  final String text;
  final String status; // PENDING, ACCEPTED, REJECTED, HIDDEN
  final String authorName;
  final String? authorHeadline;
  final String? authorAvatarUrl;
  final String recipientName;
  final DateTime createdAt;

  RecommendationItem({
    required this.id,
    required this.authorId,
    required this.recipientId,
    this.relationship,
    required this.text,
    this.status = 'PENDING',
    required this.authorName,
    this.authorHeadline,
    this.authorAvatarUrl,
    required this.recipientName,
    required this.createdAt,
  });

  factory RecommendationItem.fromJson(Map<String, dynamic> json) {
    final author = json['authorUser'] as Map<String, dynamic>?;
    final authorProfile = author?['profile'] as Map<String, dynamic>?;
    final authorWorker = author?['workerProfile'] as Map<String, dynamic>?;

    final recipient = json['recipientUser'] as Map<String, dynamic>?;
    final recipientProfile = recipient?['profile'] as Map<String, dynamic>?;

    return RecommendationItem(
      id: json['id'] as String? ?? '',
      authorId: json['authorUserId'] as String? ?? '',
      recipientId: json['recipientUserId'] as String? ?? '',
      relationship: json['relationship'] as String?,
      text: json['text'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING',
      authorName: authorProfile?['displayName'] as String? ?? author?['email'] as String? ?? 'Professional',
      authorHeadline: authorWorker?['headline'] as String? ?? authorProfile?['bio'] as String?,
      authorAvatarUrl: authorProfile?['avatarUrl'] as String?,
      recipientName: recipientProfile?['displayName'] as String? ?? recipient?['email'] as String? ?? 'Client / Colleague',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  RecommendationItem copyWith({
    String? status,
  }) {
    return RecommendationItem(
      id: id,
      authorId: authorId,
      recipientId: recipientId,
      relationship: relationship,
      text: text,
      status: status ?? this.status,
      authorName: authorName,
      authorHeadline: authorHeadline,
      authorAvatarUrl: authorAvatarUrl,
      recipientName: recipientName,
      createdAt: createdAt,
    );
  }
}
