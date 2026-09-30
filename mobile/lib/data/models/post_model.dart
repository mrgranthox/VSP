import 'poll_model.dart';

class Post {
  final String id;
  final String workerProfileId;
  final String authorName;
  final String? authorAvatarUrl;
  final String? authorHeadline;
  final String tradeName;
  final String content;
  final String? imageUrl;
  final int likesCount;
  final int commentsCount;
  final int repostsCount;
  final bool isLiked;
  final bool isSaved;
  final bool isReposted;
  final String? reactionType; // LIKE, CELEBRATE, LOVE, INSIGHTFUL, SUPPORT, FUNNY
  final Map<String, int> reactionCounts;
  final Poll? poll;
  final List<String> hashtags;
  final String? repostOfId;
  final Post? repostOf;
  final String? repostComment;
  final int connectionDegree; // 1, 2, 3
  final bool isOpenToWork;
  final bool isPremium;
  final DateTime createdAt;

  Post({
    required this.id,
    required this.workerProfileId,
    required this.authorName,
    this.authorAvatarUrl,
    this.authorHeadline,
    required this.tradeName,
    required this.content,
    this.imageUrl,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.repostsCount = 0,
    this.isLiked = false,
    this.isSaved = false,
    this.isReposted = false,
    this.reactionType,
    this.reactionCounts = const {},
    this.poll,
    this.hashtags = const [],
    this.repostOfId,
    this.repostOf,
    this.repostComment,
    this.connectionDegree = 1,
    this.isOpenToWork = false,
    this.isPremium = false,
    required this.createdAt,
  });

  Post copyWith({
    bool? isLiked,
    int? likesCount,
    bool? isSaved,
    bool? isReposted,
    int? repostsCount,
    String? reactionType,
    bool clearReactionType = false,
    Map<String, int>? reactionCounts,
    Poll? poll,
    int? commentsCount,
  }) {
    return Post(
      id: id,
      workerProfileId: workerProfileId,
      authorName: authorName,
      authorAvatarUrl: authorAvatarUrl,
      authorHeadline: authorHeadline,
      tradeName: tradeName,
      content: content,
      imageUrl: imageUrl,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      repostsCount: repostsCount ?? this.repostsCount,
      isLiked: isLiked ?? this.isLiked,
      isSaved: isSaved ?? this.isSaved,
      isReposted: isReposted ?? this.isReposted,
      reactionType: clearReactionType ? null : (reactionType ?? this.reactionType),
      reactionCounts: reactionCounts ?? this.reactionCounts,
      poll: poll ?? this.poll,
      hashtags: hashtags,
      repostOfId: repostOfId,
      repostOf: repostOf,
      repostComment: repostComment,
      connectionDegree: connectionDegree,
      isOpenToWork: isOpenToWork,
      isPremium: isPremium,
      createdAt: createdAt,
    );
  }

  factory Post.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    final worker = json['workerProfile'];
    final user = worker?['user'] ?? json['authorUser'];
    final userProfile = user?['profile'] ?? worker?['userProfile'];

    // Reactions parsing
    final reactions = (json['reactions'] as List<dynamic>?) ?? [];
    final Map<String, int> counts = {};
    String? myReaction;

    for (final r in reactions) {
      final type = r['reactionType'] as String? ?? 'LIKE';
      counts[type] = (counts[type] ?? 0) + 1;
      if (currentUserId != null && r['userId'] == currentUserId) {
        myReaction = type;
      }
    }

    // Hashtags
    final rawHashtags = (json['hashtags'] as List<dynamic>?) ?? [];
    final List<String> parsedTags = rawHashtags.map((h) {
      if (h is String) return h;
      return (h['hashtag']?['tag'] as String?) ?? (h['tag'] as String? ?? '');
    }).where((t) => t.isNotEmpty).toList();

    // Poll
    final rawPoll = json['poll'] as Map<String, dynamic>?;

    // Repost
    final rawParent = json['repostOf'] as Map<String, dynamic>?;

    final int totalLikes = counts.values.fold(0, (a, b) => a + b);

    return Post(
      id: json['id'] as String? ?? '',
      workerProfileId: json['workerProfileId'] as String? ?? '',
      authorName: userProfile?['fullName'] as String? ??
          userProfile?['displayName'] as String? ??
          json['authorName'] as String? ??
          'Trades Professional',
      authorAvatarUrl: userProfile?['avatarUrl'] as String? ??
          json['authorAvatarUrl'] as String?,
      authorHeadline: worker?['headline'] as String? ??
          userProfile?['bio'] as String? ??
          json['authorHeadline'] as String?,
      tradeName: json['tradeName'] as String? ??
          (worker?['tradeCategories'] != null &&
                  (worker['tradeCategories'] as List).isNotEmpty
              ? worker['tradeCategories'][0]['name'] as String? ?? 'Skilled Work'
              : 'Skilled Work'),
      content: json['content'] as String? ?? '',
      imageUrl: json['imageUrl'] as String?,
      likesCount: totalLikes > 0 ? totalLikes : (json['likesCount'] as int? ?? json['_count']?['likes'] as int? ?? 0),
      commentsCount: json['commentsCount'] as int? ?? (json['_count']?['comments'] as int? ?? 0),
      repostsCount: json['repostsCount'] as int? ?? (json['_count']?['reposts'] as int? ?? 0),
      isLiked: myReaction != null || (json['isLiked'] as bool? ?? false),
      isSaved: json['isSaved'] as bool? ?? false,
      isReposted: json['isReposted'] as bool? ?? false,
      reactionType: myReaction,
      reactionCounts: counts.isNotEmpty ? counts : {'LIKE': json['likesCount'] as int? ?? 0},
      poll: rawPoll != null ? Poll.fromJson(rawPoll, currentUserId: currentUserId) : null,
      hashtags: parsedTags,
      repostOfId: json['repostOfId'] as String?,
      repostOf: rawParent != null ? Post.fromJson(rawParent, currentUserId: currentUserId) : null,
      repostComment: json['repostComment'] as String?,
      connectionDegree: json['connectionDegree'] as int? ?? 1,
      isOpenToWork: user?['openToWork'] as bool? ?? json['isOpenToWork'] as bool? ?? false,
      isPremium: json['isPremium'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class PostComment {
  final String id;
  final String postId;
  final String authorName;
  final String? authorAvatarUrl;
  final String? authorHeadline;
  final String content;
  final String? parentCommentId;
  final List<PostComment> replies;
  final int likesCount;
  final bool isLiked;
  final DateTime createdAt;

  PostComment({
    required this.id,
    required this.postId,
    required this.authorName,
    this.authorAvatarUrl,
    this.authorHeadline,
    required this.content,
    this.parentCommentId,
    this.replies = const [],
    this.likesCount = 0,
    this.isLiked = false,
    required this.createdAt,
  });

  factory PostComment.fromJson(Map<String, dynamic> json) {
    final rawReplies = (json['replies'] as List<dynamic>?) ?? [];

    return PostComment(
      id: json['id'] as String? ?? '',
      postId: json['postId'] as String? ?? '',
      authorName: json['user']?['profile']?['fullName'] as String? ??
          json['user']?['profile']?['displayName'] as String? ??
          json['authorName'] as String? ??
          'Community Member',
      authorAvatarUrl: json['user']?['profile']?['avatarUrl'] as String? ??
          json['authorAvatarUrl'] as String?,
      authorHeadline: json['user']?['workerProfile']?['headline'] as String?,
      content: json['content'] as String? ?? '',
      parentCommentId: json['parentCommentId'] as String?,
      replies: rawReplies.map((r) => PostComment.fromJson(r as Map<String, dynamic>)).toList(),
      likesCount: json['likesCount'] as int? ?? 0,
      isLiked: json['isLiked'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
