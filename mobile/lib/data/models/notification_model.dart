class VspNotification {
  final String id;
  final String title;
  final String body;
  final String notificationType;
  final String channel;
  final bool isRead;
  final DateTime createdAt;
  final Map<String, dynamic>? payloadJson;

  VspNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.notificationType,
    this.channel = 'IN_APP',
    this.isRead = false,
    required this.createdAt,
    this.payloadJson,
  });

  VspNotification copyWith({
    String? id,
    String? title,
    String? body,
    String? notificationType,
    String? channel,
    bool? isRead,
    DateTime? createdAt,
    Map<String, dynamic>? payloadJson,
  }) {
    return VspNotification(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      notificationType: notificationType ?? this.notificationType,
      channel: channel ?? this.channel,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
      payloadJson: payloadJson ?? this.payloadJson,
    );
  }

  factory VspNotification.fromJson(Map<String, dynamic> json) {
    final payload = json['payloadJson'] as Map<String, dynamic>?;
    final title = payload?['title'] as String? ??
        json['title'] as String? ??
        _formatTypeToTitle(json['notificationType'] as String? ?? 'Notification');
    final body = payload?['body'] as String? ??
        json['body'] as String? ??
        'You have a new update in your account.';

    return VspNotification(
      id: json['id'] as String? ?? '',
      title: title,
      body: body,
      notificationType: json['notificationType'] as String? ?? 'SYSTEM',
      channel: json['channel'] as String? ?? 'IN_APP',
      isRead: json['isRead'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      payloadJson: payload,
    );
  }

  static String _formatTypeToTitle(String type) {
    return type
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}' : '')
        .join(' ');
  }
}
