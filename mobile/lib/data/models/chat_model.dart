class Conversation {
  final String id;
  final String participantId;
  final String participantName;
  final String? participantAvatarUrl;
  final String lastMessage;
  final DateTime lastMessageTime;
  final int unreadCount;
  final bool isOnline;

  Conversation({
    required this.id,
    required this.participantId,
    required this.participantName,
    this.participantAvatarUrl,
    required this.lastMessage,
    required this.lastMessageTime,
    this.unreadCount = 0,
    this.isOnline = false,
  });

  factory Conversation.fromJson(Map<String, dynamic> json, String currentUserId) {
    // Backend conversation has participants array
    String otherUserId = '';
    String otherUserName = 'User';
    String? otherAvatar;

    if (json['participants'] != null && json['participants'] is List) {
      final list = json['participants'] as List;
      for (final p in list) {
        final uId = p['userId'] as String? ?? p['user']?['id'] as String? ?? '';
        if (uId != currentUserId) {
          otherUserId = uId;
          final prof = p['user']?['profile'];
          if (prof != null) {
            otherUserName = prof['fullName'] ?? '${prof['firstName']} ${prof['lastName']}'.trim();
            otherAvatar = prof['avatarUrl'] as String?;
          }
          break;
        }
      }
    }

    final lastMsgObj = json['lastMessage'];
    final lastText = lastMsgObj != null
        ? (lastMsgObj['content'] as String? ?? 'Media attachment')
        : (json['lastMessageText'] as String? ?? 'Conversation started');

    final lastTime = lastMsgObj != null && lastMsgObj['createdAt'] != null
        ? DateTime.parse(lastMsgObj['createdAt'] as String)
        : (json['updatedAt'] != null
            ? DateTime.parse(json['updatedAt'] as String)
            : DateTime.now());

    return Conversation(
      id: json['id'] as String? ?? '',
      participantId: otherUserId.isNotEmpty ? otherUserId : (json['otherUserId'] as String? ?? ''),
      participantName: otherUserName.isNotEmpty ? otherUserName : (json['title'] as String? ?? 'Chat'),
      participantAvatarUrl: otherAvatar,
      lastMessage: lastText,
      lastMessageTime: lastTime,
      unreadCount: json['unreadCount'] as int? ?? 0,
      isOnline: json['isOnline'] as bool? ?? false,
    );
  }
}

class ChatMessage {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String content;
  final String? mediaUrl;
  final bool isMine;
  final String status; // 'SENT' | 'DELIVERED' | 'READ'
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    required this.content,
    this.mediaUrl,
    required this.isMine,
    this.status = 'SENT',
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json, String currentUserId) {
    final senderId = json['senderUserId'] as String? ?? json['senderId'] as String? ?? '';
    final isMine = senderId == currentUserId;

    return ChatMessage(
      id: json['id'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      senderId: senderId,
      senderName: json['sender']?['profile']?['fullName'] as String? ??
          (isMine ? 'You' : 'User'),
      content: json['content'] as String? ?? '',
      mediaUrl: json['mediaUrl'] as String?,
      isMine: isMine,
      status: json['status'] as String? ?? 'SENT',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}
