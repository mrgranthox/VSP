class Conversation {
  final String id;
  final String participantId;
  final String participantName;
  final String? participantAvatarUrl;
  final String lastMessage;
  final DateTime lastMessageTime;
  final int unreadCount;
  final bool isOnline;
  final bool isTyping;

  Conversation({
    required this.id,
    required this.participantId,
    required this.participantName,
    this.participantAvatarUrl,
    required this.lastMessage,
    required this.lastMessageTime,
    this.unreadCount = 0,
    this.isOnline = false,
    this.isTyping = false,
  });

  Conversation copyWith({
    String? lastMessage,
    DateTime? lastMessageTime,
    int? unreadCount,
    bool? isOnline,
    bool? isTyping,
  }) {
    return Conversation(
      id: id,
      participantId: participantId,
      participantName: participantName,
      participantAvatarUrl: participantAvatarUrl,
      lastMessage: lastMessage ?? this.lastMessage,
      lastMessageTime: lastMessageTime ?? this.lastMessageTime,
      unreadCount: unreadCount ?? this.unreadCount,
      isOnline: isOnline ?? this.isOnline,
      isTyping: isTyping ?? this.isTyping,
    );
  }

  factory Conversation.fromJson(Map<String, dynamic> json, String currentUserId) {
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
      isTyping: json['isTyping'] as bool? ?? false,
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
  final String? replyToMessageId;
  final String? replyToSenderName;
  final String? replyToContent;
  final Map<String, int> reactions; // emoji -> count
  final String? myReaction;
  final String messageType; // 'TEXT' | 'IMAGE' | 'VOICE'
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
    this.replyToMessageId,
    this.replyToSenderName,
    this.replyToContent,
    this.reactions = const {},
    this.myReaction,
    this.messageType = 'TEXT',
    required this.createdAt,
  });

  ChatMessage copyWith({
    String? status,
    Map<String, int>? reactions,
    String? myReaction,
    bool clearReaction = false,
  }) {
    return ChatMessage(
      id: id,
      conversationId: conversationId,
      senderId: senderId,
      senderName: senderName,
      content: content,
      mediaUrl: mediaUrl,
      isMine: isMine,
      status: status ?? this.status,
      replyToMessageId: replyToMessageId,
      replyToSenderName: replyToSenderName,
      replyToContent: replyToContent,
      reactions: reactions ?? this.reactions,
      myReaction: clearReaction ? null : (myReaction ?? this.myReaction),
      messageType: messageType,
      createdAt: createdAt,
    );
  }

  factory ChatMessage.fromJson(Map<String, dynamic> json, String currentUserId) {
    final senderId = json['senderUserId'] as String? ?? json['senderId'] as String? ?? '';
    final isMine = senderId == currentUserId;

    // Reactions map parsing
    final Map<String, int> reactionMap = {};
    String? myReact;

    final rawReactions = (json['reactions'] as List<dynamic>?) ?? [];
    for (final r in rawReactions) {
      final emoji = r['emoji'] as String? ?? '👍';
      reactionMap[emoji] = (reactionMap[emoji] ?? 0) + 1;
      if (r['userId'] == currentUserId) {
        myReact = emoji;
      }
    }

    // Replying context
    final replyObj = json['replyTo'];

    return ChatMessage(
      id: json['id'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      senderId: senderId,
      senderName: json['sender']?['profile']?['fullName'] as String? ??
          (isMine ? 'You' : 'User'),
      content: json['content'] as String? ?? '',
      mediaUrl: json['mediaUrl'] as String?,
      isMine: isMine,
      status: json['status'] as String? ?? (isMine ? 'READ' : 'DELIVERED'),
      replyToMessageId: replyObj?['id'] as String? ?? json['replyToMessageId'] as String?,
      replyToSenderName: replyObj?['sender']?['profile']?['fullName'] as String? ??
          json['replyToSenderName'] as String?,
      replyToContent: replyObj?['content'] as String? ?? json['replyToContent'] as String?,
      reactions: reactionMap,
      myReaction: myReact,
      messageType: json['messageType'] as String? ?? 'TEXT',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class MessageReaction {
  final String messageId;
  final String userId;
  final String userName;
  final String emoji;

  const MessageReaction({
    required this.messageId,
    required this.userId,
    required this.userName,
    required this.emoji,
  });
}

class TypingStatus {
  final String conversationId;
  final String userId;
  final bool isTyping;

  const TypingStatus({
    required this.conversationId,
    required this.userId,
    required this.isTyping,
  });
}
