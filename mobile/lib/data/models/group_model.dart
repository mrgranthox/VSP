class GroupItem {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? rules;
  final String? coverImageUrl;
  final String? avatarUrl;
  final String privacy; // OPEN, CLOSED
  final int memberCount;
  final bool isMember;
  final String? myRole; // ADMIN, MODERATOR, MEMBER
  final DateTime createdAt;

  GroupItem({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.rules,
    this.coverImageUrl,
    this.avatarUrl,
    this.privacy = 'OPEN',
    this.memberCount = 0,
    this.isMember = false,
    this.myRole,
    required this.createdAt,
  });

  factory GroupItem.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    final members = (json['members'] as List<dynamic>?) ?? [];
    String? role;
    bool member = false;

    if (currentUserId != null) {
      final match = members.firstWhere(
        (m) => m['userId'] == currentUserId,
        orElse: () => null,
      );
      if (match != null) {
        member = true;
        role = match['role'] as String?;
      }
    }

    return GroupItem(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String?,
      rules: json['rules'] as String?,
      coverImageUrl: json['coverImageUrl'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      privacy: json['privacy'] as String? ?? 'OPEN',
      memberCount: json['memberCount'] as int? ?? json['_count']?['members'] as int? ?? members.length,
      isMember: member,
      myRole: role,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  GroupItem copyWith({
    bool? isMember,
    String? myRole,
    int? memberCount,
  }) {
    return GroupItem(
      id: id,
      name: name,
      slug: slug,
      description: description,
      rules: rules,
      coverImageUrl: coverImageUrl,
      avatarUrl: avatarUrl,
      privacy: privacy,
      memberCount: memberCount ?? this.memberCount,
      isMember: isMember ?? this.isMember,
      myRole: myRole ?? this.myRole,
      createdAt: createdAt,
    );
  }
}

class GroupPostItem {
  final String id;
  final String groupId;
  final String authorId;
  final String authorName;
  final String? authorHeadline;
  final String? authorAvatarUrl;
  final String content;
  final String? imageUrl;
  final int likesCount;
  final int commentsCount;
  final DateTime createdAt;

  GroupPostItem({
    required this.id,
    required this.groupId,
    required this.authorId,
    required this.authorName,
    this.authorHeadline,
    this.authorAvatarUrl,
    required this.content,
    this.imageUrl,
    this.likesCount = 0,
    this.commentsCount = 0,
    required this.createdAt,
  });

  factory GroupPostItem.fromJson(Map<String, dynamic> json) {
    final author = json['authorUser'] as Map<String, dynamic>?;
    final profile = author?['profile'] as Map<String, dynamic>?;
    final worker = author?['workerProfile'] as Map<String, dynamic>?;

    return GroupPostItem(
      id: json['id'] as String? ?? '',
      groupId: json['groupId'] as String? ?? '',
      authorId: json['authorUserId'] as String? ?? '',
      authorName: profile?['displayName'] as String? ?? author?['email'] as String? ?? 'Group Member',
      authorHeadline: worker?['headline'] as String? ?? profile?['bio'] as String?,
      authorAvatarUrl: profile?['avatarUrl'] as String?,
      content: json['content'] as String? ?? '',
      imageUrl: json['imageUrl'] as String?,
      likesCount: json['likesCount'] as int? ?? 0,
      commentsCount: json['commentsCount'] as int? ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
