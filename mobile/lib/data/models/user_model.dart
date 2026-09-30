class User {
  final String id;
  final String? email;
  final String? phone;
  final String status;
  final bool emailVerified;
  final bool phoneVerified;
  final List<String> roles;
  final DateTime? createdAt;
  final UserProfile? profile;

  User({
    required this.id,
    this.email,
    this.phone,
    required this.status,
    required this.emailVerified,
    required this.phoneVerified,
    required this.roles,
    this.createdAt,
    this.profile,
  });

  bool get isWorker => roles.contains('WORKER') || roles.contains('worker');
  bool get isAdmin => roles.any((r) => r.contains('ADMIN') || r.contains('admin'));
  String? get workerProfileId => null;

  User copyWith({
    String? id,
    String? email,
    String? phone,
    String? status,
    bool? emailVerified,
    bool? phoneVerified,
    List<String>? roles,
    DateTime? createdAt,
    UserProfile? profile,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      status: status ?? this.status,
      emailVerified: emailVerified ?? this.emailVerified,
      phoneVerified: phoneVerified ?? this.phoneVerified,
      roles: roles ?? this.roles,
      createdAt: createdAt ?? this.createdAt,
      profile: profile ?? this.profile,
    );
  }

  factory User.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> root;
    Map<String, dynamic>? profileMap;
    List<dynamic>? rolesList;

    if (json.containsKey('user') && json['user'] is Map<String, dynamic>) {
      root = json['user'] as Map<String, dynamic>;
      rolesList = json['roles'] as List<dynamic>?;
      if (root['profile'] is Map<String, dynamic>) {
        profileMap = root['profile'] as Map<String, dynamic>;
      } else if (json['profile'] is Map<String, dynamic>) {
        profileMap = json['profile'] as Map<String, dynamic>;
      }
    } else {
      root = json;
      rolesList = json['roles'] as List<dynamic>?;
      if (json['profile'] is Map<String, dynamic>) {
        profileMap = json['profile'] as Map<String, dynamic>;
      }
    }

    final parsedRoles = (rolesList ?? (root['roles'] as List<dynamic>?))
            ?.map((e) => e.toString())
            .toList() ??
        ['CUSTOMER'];

    return User(
      id: root['id'] as String? ?? root['userId'] as String? ?? '',
      email: root['email'] as String?,
      phone: root['phone'] as String?,
      status: root['status'] as String? ?? 'ACTIVE',
      emailVerified: (root['isEmailVerified'] ?? root['emailVerified']) as bool? ?? false,
      phoneVerified: (root['isPhoneVerified'] ?? root['phoneVerified']) as bool? ?? false,
      roles: parsedRoles.isEmpty ? ['CUSTOMER'] : parsedRoles,
      createdAt: root['createdAt'] != null
          ? DateTime.tryParse(root['createdAt'] as String)
          : null,
      profile: profileMap != null ? UserProfile.fromJson(profileMap) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'phone': phone,
      'status': status,
      'emailVerified': emailVerified,
      'phoneVerified': phoneVerified,
      'roles': roles,
      'createdAt': createdAt?.toIso8601String(),
      'profile': profile?.toJson(),
    };
  }
}

class UserProfile {
  final String id;
  final String userId;
  final String firstName;
  final String lastName;
  final String? displayName;
  final String? bio;
  final String? avatarUrl;
  final String? cityId;
  final double? lat;
  final double? lng;
  final bool isOnline;

  UserProfile({
    required this.id,
    required this.userId,
    required this.firstName,
    required this.lastName,
    this.displayName,
    this.bio,
    this.avatarUrl,
    this.cityId,
    this.lat,
    this.lng,
    this.isOnline = false,
  });

  String get fullName => displayName ?? '$firstName $lastName'.trim();
  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    return '$f$l'.toUpperCase();
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      displayName: json['displayName'] as String?,
      bio: json['bio'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      cityId: json['cityId'] as String?,
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      isOnline: json['isOnline'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'firstName': firstName,
      'lastName': lastName,
      'displayName': displayName,
      'bio': bio,
      'avatarUrl': avatarUrl,
      'cityId': cityId,
      'lat': lat,
      'lng': lng,
      'isOnline': isOnline,
    };
  }
}
