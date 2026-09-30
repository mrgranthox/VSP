class Post {
  final String id;
  final String workerProfileId;
  final String authorName;
  final String? authorAvatarUrl;
  final String tradeName;
  final String content;
  final String? imageUrl;
  final int likesCount;
  final int commentsCount;
  final bool isLiked;
  final bool isSaved;
  final DateTime createdAt;

  Post({
    required this.id,
    required this.workerProfileId,
    required this.authorName,
    this.authorAvatarUrl,
    required this.tradeName,
    required this.content,
    this.imageUrl,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.isLiked = false,
    this.isSaved = false,
    required this.createdAt,
  });

  Post copyWith({
    bool? isLiked,
    int? likesCount,
    bool? isSaved,
  }) {
    return Post(
      id: id,
      workerProfileId: workerProfileId,
      authorName: authorName,
      authorAvatarUrl: authorAvatarUrl,
      tradeName: tradeName,
      content: content,
      imageUrl: imageUrl,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount,
      isLiked: isLiked ?? this.isLiked,
      isSaved: isSaved ?? this.isSaved,
      createdAt: createdAt,
    );
  }

  factory Post.fromJson(Map<String, dynamic> json) {
    return Post(
      id: json['id'] as String? ?? '',
      workerProfileId: json['workerProfileId'] as String? ?? '',
      authorName: json['workerProfile']?['userProfile']?['fullName'] as String? ??
          json['authorName'] as String? ??
          'Trades Professional',
      authorAvatarUrl: json['workerProfile']?['userProfile']?['avatarUrl'] as String? ??
          json['authorAvatarUrl'] as String?,
      tradeName: json['tradeName'] as String? ??
          (json['workerProfile']?['tradeCategories'] != null &&
                  (json['workerProfile']['tradeCategories'] as List).isNotEmpty
              ? json['workerProfile']['tradeCategories'][0]['name'] as String? ?? 'Skilled Work'
              : 'Skilled Work'),
      content: json['content'] as String? ?? '',
      imageUrl: json['imageUrl'] as String?,
      likesCount: json['likesCount'] as int? ?? (json['_count']?['likes'] as int? ?? 0),
      commentsCount: json['commentsCount'] as int? ?? (json['_count']?['comments'] as int? ?? 0),
      isLiked: json['isLiked'] as bool? ?? false,
      isSaved: json['isSaved'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}

class PostComment {
  final String id;
  final String postId;
  final String authorName;
  final String? authorAvatarUrl;
  final String content;
  final DateTime createdAt;

  PostComment({
    required this.id,
    required this.postId,
    required this.authorName,
    this.authorAvatarUrl,
    required this.content,
    required this.createdAt,
  });

  factory PostComment.fromJson(Map<String, dynamic> json) {
    return PostComment(
      id: json['id'] as String? ?? '',
      postId: json['postId'] as String? ?? '',
      authorName: json['user']?['profile']?['fullName'] as String? ??
          json['authorName'] as String? ??
          'User',
      authorAvatarUrl: json['user']?['profile']?['avatarUrl'] as String?,
      content: json['content'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}
