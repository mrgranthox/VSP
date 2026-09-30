class EventItem {
  final String id;
  final String organizerId;
  final String organizerName;
  final String? organizerAvatarUrl;
  final String title;
  final String description;
  final String eventType; // ONLINE, IN_PERSON, HYBRID
  final String? location;
  final String? meetingUrl;
  final DateTime startAt;
  final DateTime? endAt;
  final String? coverImageUrl;
  final int attendeeCount;
  final String? myRsvpStatus;
  final DateTime createdAt;

  EventItem({
    required this.id,
    required this.organizerId,
    required this.organizerName,
    this.organizerAvatarUrl,
    required this.title,
    required this.description,
    required this.eventType,
    this.location,
    this.meetingUrl,
    required this.startAt,
    this.endAt,
    this.coverImageUrl,
    this.attendeeCount = 0,
    this.myRsvpStatus,
    required this.createdAt,
  });

  factory EventItem.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    final organizer = json['organizerUser'] as Map<String, dynamic>?;
    final profile = organizer?['profile'] as Map<String, dynamic>?;

    final attendees = (json['attendees'] as List<dynamic>?) ?? [];
    String? myStatus;
    if (currentUserId != null) {
      final match = attendees.firstWhere(
        (a) => a['userId'] == currentUserId,
        orElse: () => null,
      );
      if (match != null) {
        myStatus = match['status'] as String?;
      }
    }

    return EventItem(
      id: json['id'] as String? ?? '',
      organizerId: json['organizerUserId'] as String? ?? '',
      organizerName: profile?['displayName'] as String? ?? organizer?['email'] as String? ?? 'Trade Organizer',
      organizerAvatarUrl: profile?['avatarUrl'] as String?,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      eventType: json['eventType'] as String? ?? 'ONLINE',
      location: json['location'] as String?,
      meetingUrl: json['meetingUrl'] as String?,
      startAt: json['startAt'] != null
          ? DateTime.tryParse(json['startAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      endAt: json['endAt'] != null
          ? DateTime.tryParse(json['endAt'] as String)
          : null,
      coverImageUrl: json['coverImageUrl'] as String?,
      attendeeCount: json['attendeeCount'] as int? ?? json['_count']?['attendees'] as int? ?? attendees.length,
      myRsvpStatus: myStatus,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  EventItem copyWith({
    String? myRsvpStatus,
    int? attendeeCount,
  }) {
    return EventItem(
      id: id,
      organizerId: organizerId,
      organizerName: organizerName,
      organizerAvatarUrl: organizerAvatarUrl,
      title: title,
      description: description,
      eventType: eventType,
      location: location,
      meetingUrl: meetingUrl,
      startAt: startAt,
      endAt: endAt,
      coverImageUrl: coverImageUrl,
      attendeeCount: attendeeCount ?? this.attendeeCount,
      myRsvpStatus: myRsvpStatus ?? this.myRsvpStatus,
      createdAt: createdAt,
    );
  }
}

class EventAttendeeItem {
  final String id;
  final String eventId;
  final String userId;
  final String userName;
  final String? userHeadline;
  final String? userAvatarUrl;
  final String rsvpStatus;

  EventAttendeeItem({
    required this.id,
    required this.eventId,
    required this.userId,
    required this.userName,
    this.userHeadline,
    this.userAvatarUrl,
    required this.rsvpStatus,
  });

  factory EventAttendeeItem.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    final profile = user?['profile'] as Map<String, dynamic>?;
    final worker = user?['workerProfile'] as Map<String, dynamic>?;

    return EventAttendeeItem(
      id: json['id'] as String? ?? '',
      eventId: json['eventId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      userName: profile?['displayName'] as String? ?? user?['email'] as String? ?? 'Attendee',
      userHeadline: worker?['headline'] as String? ?? profile?['bio'] as String?,
      userAvatarUrl: profile?['avatarUrl'] as String?,
      rsvpStatus: json['status'] as String? ?? 'GOING',
    );
  }
}
