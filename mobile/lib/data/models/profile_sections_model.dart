class ProfileExperience {
  final String id;
  final String title;
  final String company;
  final String? location;
  final String? employmentType;
  final DateTime startDate;
  final DateTime? endDate;
  final bool isCurrent;
  final String? description;

  ProfileExperience({
    required this.id,
    required this.title,
    required this.company,
    this.location,
    this.employmentType,
    required this.startDate,
    this.endDate,
    this.isCurrent = false,
    this.description,
  });

  factory ProfileExperience.fromJson(Map<String, dynamic> json) {
    return ProfileExperience(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      company: json['company'] as String? ?? '',
      location: json['location'] as String?,
      employmentType: json['employmentType'] as String?,
      startDate: json['startDate'] != null
          ? DateTime.tryParse(json['startDate'] as String) ?? DateTime.now()
          : DateTime.now(),
      endDate: json['endDate'] != null
          ? DateTime.tryParse(json['endDate'] as String)
          : null,
      isCurrent: json['isCurrent'] as bool? ?? false,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'title': title,
    'company': company,
    'location': location,
    'employmentType': employmentType,
    'startDate': startDate.toIso8601String(),
    'endDate': endDate?.toIso8601String(),
    'isCurrent': isCurrent,
    'description': description,
  };
}

class ProfileEducation {
  final String id;
  final String school;
  final String? degree;
  final String? fieldOfStudy;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? grade;
  final String? description;

  ProfileEducation({
    required this.id,
    required this.school,
    this.degree,
    this.fieldOfStudy,
    this.startDate,
    this.endDate,
    this.grade,
    this.description,
  });

  factory ProfileEducation.fromJson(Map<String, dynamic> json) {
    return ProfileEducation(
      id: json['id'] as String? ?? '',
      school: json['school'] as String? ?? '',
      degree: json['degree'] as String?,
      fieldOfStudy: json['fieldOfStudy'] as String?,
      startDate: json['startDate'] != null
          ? DateTime.tryParse(json['startDate'] as String)
          : null,
      endDate: json['endDate'] != null
          ? DateTime.tryParse(json['endDate'] as String)
          : null,
      grade: json['grade'] as String?,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'school': school,
    'degree': degree,
    'fieldOfStudy': fieldOfStudy,
    'startDate': startDate?.toIso8601String(),
    'endDate': endDate?.toIso8601String(),
    'grade': grade,
    'description': description,
  };
}

class ProfileAccomplishment {
  final String id;
  final String type; // CERTIFICATION, LICENSE, AWARD, PATENT, PUBLICATION
  final String title;
  final String? issuer;
  final DateTime? issueDate;
  final DateTime? expiryDate;
  final String? credentialId;
  final String? url;

  ProfileAccomplishment({
    required this.id,
    required this.type,
    required this.title,
    this.issuer,
    this.issueDate,
    this.expiryDate,
    this.credentialId,
    this.url,
  });

  factory ProfileAccomplishment.fromJson(Map<String, dynamic> json) {
    return ProfileAccomplishment(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'CERTIFICATION',
      title: json['title'] as String? ?? '',
      issuer: json['issuer'] as String?,
      issueDate: json['issueDate'] != null
          ? DateTime.tryParse(json['issueDate'] as String)
          : null,
      expiryDate: json['expiryDate'] != null
          ? DateTime.tryParse(json['expiryDate'] as String)
          : null,
      credentialId: json['credentialId'] as String?,
      url: json['url'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type,
    'title': title,
    'issuer': issuer,
    'issueDate': issueDate?.toIso8601String(),
    'expiryDate': expiryDate?.toIso8601String(),
    'credentialId': credentialId,
    'url': url,
  };
}

class ProfileVolunteer {
  final String id;
  final String organization;
  final String role;
  final String? cause;
  final DateTime? startDate;
  final DateTime? endDate;
  final bool isCurrent;
  final String? description;

  ProfileVolunteer({
    required this.id,
    required this.organization,
    required this.role,
    this.cause,
    this.startDate,
    this.endDate,
    this.isCurrent = false,
    this.description,
  });

  factory ProfileVolunteer.fromJson(Map<String, dynamic> json) {
    return ProfileVolunteer(
      id: json['id'] as String? ?? '',
      organization: json['organization'] as String? ?? '',
      role: json['role'] as String? ?? '',
      cause: json['cause'] as String?,
      startDate: json['startDate'] != null
          ? DateTime.tryParse(json['startDate'] as String)
          : null,
      endDate: json['endDate'] != null
          ? DateTime.tryParse(json['endDate'] as String)
          : null,
      isCurrent: json['isCurrent'] as bool? ?? false,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'organization': organization,
    'role': role,
    'cause': cause,
    'startDate': startDate?.toIso8601String(),
    'endDate': endDate?.toIso8601String(),
    'isCurrent': isCurrent,
    'description': description,
  };
}

class ProfileFeaturedItem {
  final String id;
  final String type; // POST, ARTICLE, LINK, MEDIA, PROJECT
  final String title;
  final String? description;
  final String? url;
  final String? thumbnailUrl;

  ProfileFeaturedItem({
    required this.id,
    required this.type,
    required this.title,
    this.description,
    this.url,
    this.thumbnailUrl,
  });

  factory ProfileFeaturedItem.fromJson(Map<String, dynamic> json) {
    return ProfileFeaturedItem(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'LINK',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      url: json['url'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type,
    'title': title,
    'description': description,
    'url': url,
    'thumbnailUrl': thumbnailUrl,
  };
}

class ProfileViewEntry {
  final String id;
  final String viewerId;
  final String viewerName;
  final String? viewerHeadline;
  final String? viewerAvatarUrl;
  final DateTime viewedAt;

  ProfileViewEntry({
    required this.id,
    required this.viewerId,
    required this.viewerName,
    this.viewerHeadline,
    this.viewerAvatarUrl,
    required this.viewedAt,
  });

  factory ProfileViewEntry.fromJson(Map<String, dynamic> json) {
    final viewer = json['viewerUser'];
    final profile = viewer?['profile'];
    final worker = viewer?['workerProfile'];
    return ProfileViewEntry(
      id: json['id'] as String? ?? '',
      viewerId: json['viewerUserId'] as String? ?? '',
      viewerName: profile?['displayName'] as String? ?? 'Trade Professional',
      viewerHeadline: worker?['headline'] as String? ?? profile?['bio'] as String? ?? 'Skilled Craftsman',
      viewerAvatarUrl: profile?['avatarUrl'] as String?,
      viewedAt: json['viewedAt'] != null
          ? DateTime.tryParse(json['viewedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
