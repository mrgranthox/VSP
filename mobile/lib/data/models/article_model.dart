class ArticleItem {
  final String id;
  final String authorId;
  final String authorName;
  final String? authorHeadline;
  final String? authorAvatarUrl;
  final String title;
  final String slug;
  final String? subtitle;
  final String content;
  final String? coverImageUrl;
  final int readingTimeMinutes;
  final String status;
  final int viewCount;
  final int reactionsCount;
  final int commentsCount;
  final bool isReacted;
  final DateTime createdAt;

  ArticleItem({
    required this.id,
    required this.authorId,
    required this.authorName,
    this.authorHeadline,
    this.authorAvatarUrl,
    required this.title,
    required this.slug,
    this.subtitle,
    required this.content,
    this.coverImageUrl,
    this.readingTimeMinutes = 3,
    this.status = 'PUBLISHED',
    this.viewCount = 0,
    this.reactionsCount = 0,
    this.commentsCount = 0,
    this.isReacted = false,
    required this.createdAt,
  });

  factory ArticleItem.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    final author = json['authorUser'] as Map<String, dynamic>?;
    final profile = author?['profile'] as Map<String, dynamic>?;
    final worker = author?['workerProfile'] as Map<String, dynamic>?;

    final reactions = (json['reactions'] as List<dynamic>?) ?? [];
    final bool reacted = currentUserId != null &&
        reactions.any((r) => r['userId'] == currentUserId);

    return ArticleItem(
      id: json['id'] as String? ?? '',
      authorId: json['authorUserId'] as String? ?? '',
      authorName: profile?['displayName'] as String? ?? author?['email'] as String? ?? 'Vocational Author',
      authorHeadline: worker?['headline'] as String? ?? profile?['bio'] as String?,
      authorAvatarUrl: profile?['avatarUrl'] as String?,
      title: json['title'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      subtitle: json['subtitle'] as String?,
      content: json['content'] as String? ?? '',
      coverImageUrl: json['coverImageUrl'] as String?,
      readingTimeMinutes: json['readingTimeMinutes'] as int? ?? 3,
      status: json['status'] as String? ?? 'PUBLISHED',
      viewCount: json['viewCount'] as int? ?? 0,
      reactionsCount: json['_count']?['reactions'] as int? ?? reactions.length,
      commentsCount: json['_count']?['comments'] as int? ?? 0,
      isReacted: reacted,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  ArticleItem copyWith({
    int? reactionsCount,
    bool? isReacted,
    int? commentsCount,
  }) {
    return ArticleItem(
      id: id,
      authorId: authorId,
      authorName: authorName,
      authorHeadline: authorHeadline,
      authorAvatarUrl: authorAvatarUrl,
      title: title,
      slug: slug,
      subtitle: subtitle,
      content: content,
      coverImageUrl: coverImageUrl,
      readingTimeMinutes: readingTimeMinutes,
      status: status,
      viewCount: viewCount,
      reactionsCount: reactionsCount ?? this.reactionsCount,
      commentsCount: commentsCount ?? this.commentsCount,
      isReacted: isReacted ?? this.isReacted,
      createdAt: createdAt,
    );
  }
}

class ArticleCommentItem {
  final String id;
  final String articleId;
  final String authorId;
  final String authorName;
  final String? authorAvatarUrl;
  final String content;
  final DateTime createdAt;

  ArticleCommentItem({
    required this.id,
    required this.articleId,
    required this.authorId,
    required this.authorName,
    this.authorAvatarUrl,
    required this.content,
    required this.createdAt,
  });

  factory ArticleCommentItem.fromJson(Map<String, dynamic> json) {
    final author = json['authorUser'] as Map<String, dynamic>?;
    final profile = author?['profile'] as Map<String, dynamic>?;

    return ArticleCommentItem(
      id: json['id'] as String? ?? '',
      articleId: json['articleId'] as String? ?? '',
      authorId: json['authorUserId'] as String? ?? '',
      authorName: profile?['displayName'] as String? ?? 'Community Member',
      authorAvatarUrl: profile?['avatarUrl'] as String?,
      content: json['content'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
