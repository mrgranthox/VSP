class SkillTaxonomyItem {
  final String id;
  final String name;
  final String category;
  final bool isVerified;
  final int count;

  SkillTaxonomyItem({
    required this.id,
    required this.name,
    required this.category,
    this.isVerified = true,
    this.count = 0,
  });

  factory SkillTaxonomyItem.fromJson(Map<String, dynamic> json) {
    return SkillTaxonomyItem(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      category: json['category'] as String? ?? 'Vocational',
      isVerified: json['isVerified'] as bool? ?? true,
      count: json['_count']?['userSkills'] as int? ?? 0,
    );
  }
}

class UserSkillItem {
  final String id;
  final String skillId;
  final String name;
  final String category;
  final int? yearsOfExperience;
  final int endorsementsCount;
  final bool isEndorsedByMe;

  UserSkillItem({
    required this.id,
    required this.skillId,
    required this.name,
    required this.category,
    this.yearsOfExperience,
    this.endorsementsCount = 0,
    this.isEndorsedByMe = false,
  });

  factory UserSkillItem.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    final skill = json['skill'] as Map<String, dynamic>?;
    final endorsements = (json['endorsements'] as List<dynamic>?) ?? [];
    final bool endorsed = currentUserId != null &&
        endorsements.any((e) => e['endorserUserId'] == currentUserId);

    return UserSkillItem(
      id: json['id'] as String? ?? '',
      skillId: json['skillId'] as String? ?? (skill?['id'] as String? ?? ''),
      name: skill?['name'] as String? ?? json['name'] as String? ?? 'Trade Skill',
      category: skill?['category'] as String? ?? 'General',
      yearsOfExperience: json['yearsOfExperience'] as int?,
      endorsementsCount: json['_count']?['endorsements'] as int? ?? endorsements.length,
      isEndorsedByMe: endorsed,
    );
  }

  UserSkillItem copyWith({
    int? endorsementsCount,
    bool? isEndorsedByMe,
  }) {
    return UserSkillItem(
      id: id,
      skillId: skillId,
      name: name,
      category: category,
      yearsOfExperience: yearsOfExperience,
      endorsementsCount: endorsementsCount ?? this.endorsementsCount,
      isEndorsedByMe: isEndorsedByMe ?? this.isEndorsedByMe,
    );
  }
}

class SkillEndorsementItem {
  final String id;
  final String userSkillId;
  final String endorserId;
  final String endorserName;
  final String? endorserHeadline;
  final String? endorserAvatarUrl;
  final String? relationship;
  final DateTime createdAt;

  SkillEndorsementItem({
    required this.id,
    required this.userSkillId,
    required this.endorserId,
    required this.endorserName,
    this.endorserHeadline,
    this.endorserAvatarUrl,
    this.relationship,
    required this.createdAt,
  });

  factory SkillEndorsementItem.fromJson(Map<String, dynamic> json) {
    final endorser = json['endorserUser'] as Map<String, dynamic>?;
    final profile = endorser?['profile'] as Map<String, dynamic>?;
    final worker = endorser?['workerProfile'] as Map<String, dynamic>?;

    return SkillEndorsementItem(
      id: json['id'] as String? ?? '',
      userSkillId: json['userSkillId'] as String? ?? '',
      endorserId: json['endorserUserId'] as String? ?? '',
      endorserName: profile?['displayName'] as String? ?? 'Peer Professional',
      endorserHeadline: worker?['headline'] as String? ?? profile?['bio'] as String?,
      endorserAvatarUrl: profile?['avatarUrl'] as String?,
      relationship: json['relationship'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
