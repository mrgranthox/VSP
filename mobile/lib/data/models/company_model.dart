class CompanyPageItem {
  final String id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String? coverImageUrl;
  final String? tagline;
  final String? description;
  final String industry;
  final String? companySize;
  final String? website;
  final String? email;
  final String? phone;
  final String? location;
  final int? foundedYear;
  final String verificationStatus; // PENDING, APPROVED, REJECTED
  final int followerCount;
  final int employeeCount;
  final bool isFollowed;
  final DateTime createdAt;

  CompanyPageItem({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    this.coverImageUrl,
    this.tagline,
    this.description,
    required this.industry,
    this.companySize,
    this.website,
    this.email,
    this.phone,
    this.location,
    this.foundedYear,
    this.verificationStatus = 'PENDING',
    this.followerCount = 0,
    this.employeeCount = 0,
    this.isFollowed = false,
    required this.createdAt,
  });

  factory CompanyPageItem.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    final followers = (json['followers'] as List<dynamic>?) ?? [];
    final bool followed = currentUserId != null &&
        followers.any((f) => f['userId'] == currentUserId);

    return CompanyPageItem(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      logoUrl: json['logoUrl'] as String?,
      coverImageUrl: json['coverImageUrl'] as String?,
      tagline: json['tagline'] as String?,
      description: json['description'] as String?,
      industry: json['industry'] as String? ?? 'Vocational Trades',
      companySize: json['companySize'] as String?,
      website: json['website'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      location: json['location'] as String?,
      foundedYear: json['foundedYear'] as int?,
      verificationStatus: json['verificationStatus'] as String? ?? 'PENDING',
      followerCount: json['followerCount'] as int? ?? json['_count']?['followers'] as int? ?? followers.length,
      employeeCount: json['_count']?['employees'] as int? ?? 0,
      isFollowed: followed,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  CompanyPageItem copyWith({
    bool? isFollowed,
    int? followerCount,
  }) {
    return CompanyPageItem(
      id: id,
      name: name,
      slug: slug,
      logoUrl: logoUrl,
      coverImageUrl: coverImageUrl,
      tagline: tagline,
      description: description,
      industry: industry,
      companySize: companySize,
      website: website,
      email: email,
      phone: phone,
      location: location,
      foundedYear: foundedYear,
      verificationStatus: verificationStatus,
      followerCount: followerCount ?? this.followerCount,
      employeeCount: employeeCount,
      isFollowed: isFollowed ?? this.isFollowed,
      createdAt: createdAt,
    );
  }
}
